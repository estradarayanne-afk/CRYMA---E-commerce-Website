<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\CourierProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = $user->courierProfile()->with('vehicles')->firstOrFail();
        $address = $user->addresses()
            ->orderByDesc('is_default')
            ->latest('id')
            ->first();
        $license = $user->documents()
            ->where('document_type', 'drivers_license')
            ->latest('id')
            ->first();
        $qrPath = $this->ownedQrPath($profile, $user->id);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'first_name' => $user->first_name,
                    'middle_name' => $user->middle_name,
                    'last_name' => $user->last_name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'status' => $user->status,
                    'email_verified_at' => $user->email_verified_at?->toISOString(),
                ],
                'profile' => [
                    'sex' => $profile->sex,
                    'birthday' => $profile->birthday?->toDateString(),
                ],
                'address' => $address ? [
                    'region' => $address->region,
                    'province' => $address->province,
                    'municipality' => $address->municipality,
                    'barangay' => $address->barangay,
                    'street' => $address->street,
                    'house_number' => $address->house_number,
                    'building_name' => $address->building_name,
                    'unit_number' => $address->unit_number,
                    'postal_code' => $address->postal_code,
                ] : null,
                'vehicles' => $profile->vehicles->map(fn ($vehicle) => [
                    'vehicle_type' => $vehicle->vehicle_type,
                    'plate_number' => $vehicle->plate_number,
                ])->values(),
                'drivers_license' => $license ? [
                    'status' => $license->status,
                    'file_name' => $license->original_file_name,
                    'mime_type' => $license->mime_type,
                    'uploaded_at' => $license->created_at?->toISOString(),
                ] : null,
                'ewallet_qr_available' => $qrPath !== null
                    && Storage::disk('local')->exists($qrPath),
            ],
        ]);
    }

    public function showDriversLicense(Request $request)
    {
        $user = $request->user();
        $document = $user->documents()
            ->where('document_type', 'drivers_license')
            ->latest('id')
            ->firstOrFail();
        $expectedPrefix = "registration-documents/{$user->id}/";

        if (
            ! str_starts_with((string) $document->file_path, $expectedPrefix)
            || ! preg_match('/\Aregistration-documents\/[1-9][0-9]*\/[A-Za-z0-9._-]+\z/', (string) $document->file_path)
        ) {
            abort(404, 'Driver license document not found.');
        }

        $disk = Storage::disk('local')->exists($document->file_path) ? 'local' : 'public';
        abort_unless(Storage::disk($disk)->exists($document->file_path), 404, 'Driver license document not found.');

        return Storage::disk($disk)->response(
            $document->file_path,
            basename((string) ($document->original_file_name ?: $document->file_path)),
            [
                'Content-Type' => $document->mime_type ?: 'application/octet-stream',
                'Content-Disposition' => 'inline',
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    public function showEwalletQr(Request $request)
    {
        $profile = $request->user()->courierProfile()->firstOrFail();
        $path = $this->ownedQrPath($profile, $request->user()->id);
        abort_unless($path && Storage::disk('local')->exists($path), 404, 'E-wallet QR image not found.');

        return Storage::disk('local')->response($path, basename($path), [
            'Content-Type' => Storage::disk('local')->mimeType($path) ?: 'application/octet-stream',
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function updateEwalletQr(Request $request)
    {
        $values = $request->validate([
            'qr_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);
        $user = $request->user();
        $profile = $user->courierProfile()->firstOrFail();
        $previousPath = $this->ownedQrPath($profile, $user->id);
        $newPath = $values['qr_image']->store("courier-ewallet-qr/{$user->id}", 'local');
        abort_unless($newPath, 500, 'Unable to save the e-wallet QR image.');

        try {
            DB::transaction(function () use ($profile, $newPath): void {
                $profile->forceFill(['ewallet_qr_path' => $newPath])->save();
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($newPath);
            throw $exception;
        }

        if ($previousPath && $previousPath !== $newPath) {
            if (! Storage::disk('local')->delete($previousPath)) {
                Log::warning('Unable to remove a replaced courier e-wallet QR image.', [
                    'courier_profile_id' => $profile->id,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'E-wallet QR image saved.',
            'data' => ['ewallet_qr_available' => true],
        ]);
    }

    private function ownedQrPath(CourierProfile $profile, int $userId): ?string
    {
        $path = $profile->ewallet_qr_path;
        $expectedPrefix = "courier-ewallet-qr/{$userId}/";

        if (
            ! is_string($path)
            || ! str_starts_with($path, $expectedPrefix)
            || ! preg_match('/\Acourier-ewallet-qr\/[1-9][0-9]*\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)\z/i', $path)
        ) {
            return null;
        }

        return $path;
    }
}
