<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AccountController extends Controller
{
    public function logisticsProfile(Request $request)
    {
        $user = $request->user()->load(['logisticsProfile', 'addresses']);
        $profile = $this->safeProfileData($user);
        $profile['business_name'] = $user->logisticsProfile?->business_name;
        $profile['birthday'] = $user->logisticsProfile?->birthday?->toDateString();
        $profile['sex'] = $user->logisticsProfile?->sex;
        $profile['addresses'] = $user->addresses->map(fn (Address $address) => [
            'region' => $address->region,
            'province' => $address->province,
            'municipality' => $address->municipality,
            'barangay' => $address->barangay,
            'street' => $address->street,
            'house_number' => $address->house_number,
            'building_name' => $address->building_name,
            'unit_number' => $address->unit_number,
            'postal_code' => $address->postal_code,
        ])->values();

        return response()->json(['success' => true, 'data' => $profile]);
    }

    public function updateProfile(Request $request)
    {
        if ($request->hasFile('profile_image') && !Schema::hasColumn('users', 'profile_image_path')) {
            return response()->json([
                'success' => false,
                'message' => 'Profile image upload is unavailable until the account image schema is migrated.',
            ], 503);
        }

        if (is_string($request->input('phone'))) {
            $phone = preg_replace('/[\s()-]/u', '', $request->input('phone'));
            if (preg_match('/^9[0-9]{9}$/', $phone)) {
                $phone = '+63'.$phone;
            } elseif (preg_match('/^09[0-9]{9}$/', $phone)) {
                $phone = '+63'.substr($phone, 1);
            }
            $request->merge(['phone' => $phone]);
        }

        $nameRule = "regex:/^[\\p{L}\\p{M}]+\\.?(?:[ \\x27\\x2D\\x{2019}\\x{2010}\\x{2011}][\\p{L}\\p{M}]+\\.?)*$/u";
        $validated = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:30', $nameRule],
            'middle_name' => ['sometimes', 'nullable', 'string', 'max:30', $nameRule],
            'last_name' => ['sometimes', 'required', 'string', 'max:30', $nameRule],
            'phone' => ['sometimes', 'nullable', 'string', 'max:13', 'regex:/^(?:09[0-9]{9}|\\+639[0-9]{9})$/'],
            'profile_image' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        unset($validated['profile_image']);
        $oldImagePath = $user->profile_image_path;
        if ($request->hasFile('profile_image')) {
            $validated['profile_image_path'] = $request->file('profile_image')->store('profile-images/'.$user->id, 'local');
        }
        $user->fill($validated)->save();
        if ($oldImagePath && isset($validated['profile_image_path']) && Str::startsWith($oldImagePath, 'profile-images/'.$user->id.'/')) {
            Storage::disk('local')->delete($oldImagePath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $this->safeProfileData($user->fresh()),
        ]);
    }

    public function profileImage(Request $request)
    {
        abort_unless(Schema::hasColumn('users', 'profile_image_path'), 404);
        $path = $request->user()->profile_image_path;
        abort_unless($path && Str::startsWith($path, 'profile-images/'.$request->user()->id.'/'), 404);
        abort_unless(Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, basename($path), [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function addresses(Request $request)
    {
        $this->ensureAddressBookSchema();

        return response()->json([
            'success' => true,
            'data' => $request->user()->addresses()
                ->orderByDesc('is_default')
                ->latest('id')
                ->get(),
        ]);
    }

    public function storeAddress(Request $request)
    {
        $this->ensureAddressBookSchema();
        $validated = $this->validateAddress($request);
        $address = DB::transaction(function () use ($request, $validated) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $hasDefaultAddress = $user->addresses()->where('is_default', true)->exists();
            $makeDefault = ($validated['is_default'] ?? false) || !$hasDefaultAddress;

            if ($makeDefault) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create([
                ...$this->addressAttributes($validated),
                'is_default' => $makeDefault,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Address saved successfully.',
            'data' => $address,
        ], 201);
    }

    public function updateAddress(Request $request, int $id)
    {
        $this->ensureAddressBookSchema();
        $request->user()->addresses()->findOrFail($id);
        $validated = $this->validateAddress($request);
        $address = DB::transaction(function () use ($request, $validated, $id) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $address = $user->addresses()->lockForUpdate()->findOrFail($id);
            $address->fill($this->addressAttributes($validated))->save();

            return $address->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Address updated successfully.',
            'data' => $address->fresh(),
        ]);
    }

    public function deleteAddress(Request $request, int $id)
    {
        $this->ensureAddressBookSchema();
        DB::transaction(function () use ($request, $id) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $address = $user->addresses()->lockForUpdate()->findOrFail($id);
            $wasDefault = $address->is_default;
            $address->delete();

            if ($wasDefault) {
                $replacement = $user->addresses()->latest('id')->lockForUpdate()->first();
                $replacement?->forceFill(['is_default' => true])->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Address deleted successfully.',
        ]);
    }

    private function validateAddress(Request $request): array
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'in:home,work,other'],
            'recipient_name' => [
                'required',
                'string',
                'max:100',
                "regex:/^[\\p{L}\\p{M}]+\\.?(?:[ \\x27\\x2D\\x{2019}\\x{2010}\\x{2011}][\\p{L}\\p{M}]+\\.?)*$/u",
            ],
            'phone' => ['required', 'string', 'max:20'],
            'is_default' => ['sometimes', 'boolean'],
            'region' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            'municipality' => ['required', 'string', 'max:100'],
            'barangay' => ['required', 'string', 'max:100'],
            'street' => ['nullable', 'string', 'max:100'],
            'house_number' => ['nullable', 'string', 'max:20'],
            'building_name' => ['nullable', 'string', 'max:80'],
            'unit_number' => ['nullable', 'string', 'max:30'],
            'postal_code' => ['nullable', 'string', 'regex:/^[0-9]{4}$/'],
        ]);

        $phone = preg_replace('/[\s()-]/u', '', $validated['phone']);
        if (preg_match('/^9[0-9]{9}$/', $phone)) {
            $phone = '+63'.$phone;
        } elseif (preg_match('/^09[0-9]{9}$/', $phone)) {
            $phone = '+63'.substr($phone, 1);
        }

        if (!preg_match('/^\+639[0-9]{9}$/', $phone)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'phone' => 'Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.',
            ]);
        }

        $validated['phone'] = $phone;
        $this->validatePhilippineAddress($validated);

        return $validated;
    }

    public function setDefaultAddress(Request $request, int $id)
    {
        $this->ensureAddressBookSchema();
        $address = DB::transaction(function () use ($request, $id) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->id);
            $address = $user->addresses()->lockForUpdate()->findOrFail($id);
            $user->addresses()->where('id', '!=', $id)->update(['is_default' => false]);
            $address->forceFill(['is_default' => true])->save();

            return $address->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => 'Default address updated.',
            'data' => $address,
        ]);
    }

    private function addressAttributes(array $validated): array
    {
        unset($validated['is_default']);

        return $validated;
    }

    private function ensureAddressBookSchema(): void
    {
        $requiredColumns = ['region', 'label', 'recipient_name', 'phone', 'is_default'];
        if (
            !Schema::hasTable('addresses') ||
            collect($requiredColumns)->contains(fn (string $column) => !Schema::hasColumn('addresses', $column))
        ) {
            abort(503, 'The buyer address book is unavailable until the required address migrations are applied.');
        }
    }

    private function validatePhilippineAddress(array $address): void
    {
        $regions = $this->psgcOptions('regions');
        $region = $this->findPsgcName($regions, $address['region']);
        if (!$region) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'region' => 'Select a region from the supported Philippine address list.',
            ]);
        }

        $provinces = $this->psgcOptions('regions/'.$region['code'].'/provinces');
        $province = $this->findPsgcName($provinces, $address['province']);
        if (!$province) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'province' => 'Select a province within the selected region.',
            ]);
        }

        $cities = $this->psgcOptions(
            'regions/'.$region['code'].'/provinces/'.$province['code'].'/cities-municipalities'
        );
        $city = $this->findPsgcName($cities, $address['municipality']);
        if (!$city) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'municipality' => 'Select a municipality or city within the selected province.',
            ]);
        }

        $barangays = $this->psgcOptions(
            'regions/'.$region['code'].'/provinces/'.$province['code'].
            '/cities-municipalities/'.$city['code'].'/barangays'
        );
        if (!$this->findPsgcName($barangays, $address['barangay'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'barangay' => 'Select a barangay within the selected municipality or city.',
            ]);
        }
    }

    private function psgcOptions(string $path): array
    {
        return Cache::remember('psgc:'.$path, now()->addDay(), function () use ($path) {
            $response = Http::timeout(5)->get('https://psgc.cloud/api/v2/'.$path);
            $options = $response->json('data');

            if (!$response->successful() || !is_array($options)) {
                abort(503, 'Philippine address options are temporarily unavailable. Please try again.');
            }

            return $options;
        });
    }

    private function findPsgcName(array $options, string $name): ?array
    {
        foreach ($options as $option) {
            if (
                is_array($option) &&
                isset($option['name'], $option['code']) &&
                mb_strtolower(trim($option['name'])) === mb_strtolower(trim($name))
            ) {
                return $option;
            }
        }

        return null;
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'max:128'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
        ]);

        $user = $request->user();
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'The current password is incorrect.',
            ], 422);
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'remember_token' => Str::random(60),
        ])->save();
        $currentToken = $user->currentAccessToken();
        if ($currentToken instanceof PersonalAccessToken) {
            $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
        } else {
            $user->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully.',
        ]);
    }

    private function safeProfileData($user): array
    {
        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'status' => $user->status,
            'email_verified_at' => $user->email_verified_at,
            'profile_image_url' => $user->profile_image_path ? route('api.account.profile-image') : null,
        ];
    }
}
