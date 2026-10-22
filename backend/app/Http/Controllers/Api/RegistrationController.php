<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\BuyerProfile;
use App\Models\CourierProfile;
use App\Models\LogisticsProfile;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Mail\RegistrationOtpMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\CarbonImmutable;
use Throwable;

class RegistrationController extends Controller
{
    /**
     * Register a new buyer, seller, or courier.
     */
    public function store(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => mb_strtolower(trim($request->input('email')))]);
        }
        if (is_string($request->input('phone'))) {
            $phone = preg_replace('/[\s()-]/', '', $request->input('phone'));
            if (preg_match('/^9[0-9]{9}$/', $phone)) $phone = '+63' . $phone;
            elseif (preg_match('/^09[0-9]{9}$/', $phone)) $phone = '+63' . substr($phone, 1);
            $request->merge(['phone' => $phone]);
        }
        if (is_string($request->input('plate_number'))) {
            $request->merge(['plate_number' => mb_strtoupper(trim($request->input('plate_number')))]);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:30', "regex:/^[\\p{L}\\p{M}]+(?:[ \\x27\\x2D][\\p{L}\\p{M}]+)*$/u"],
            'middle_name' => ['nullable', 'string', 'max:2', 'regex:/^\\p{L}\\p{M}*\\.?$/u'],
            'last_name' => ['required', 'string', 'max:30', "regex:/^[\\p{L}\\p{M}]+(?:[ \\x27\\x2D][\\p{L}\\p{M}]+)*$/u"],

            'email' => ['required', 'email', 'min:3', 'max:254', 'unique:users,email'],
            'phone' => ['required', 'max:13', 'regex:/^\\+639[0-9]{9}$/'],

            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],

            'terms_accepted' => ['required', 'accepted'],
            'terms_version' => ['required', Rule::in([config('policies.terms.version')])],
            'privacy_notice_acknowledged' => ['required', 'accepted'],
            'privacy_version' => ['required', Rule::in([config('policies.privacy.version')])],

            'role' => [
                'required',
                Rule::in(['buyer', 'seller', 'rider', 'logistics']),
            ],

            'sex' => [
                'required',
                Rule::in(['male', 'female', 'prefer_not_to_say']),
            ],

            'birthday' => [
                'required', 'date_format:Y-m-d',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    try {
                        $birthday = CarbonImmutable::createFromFormat('!Y-m-d', $value, 'Asia/Manila');
                        $today = CarbonImmutable::now('Asia/Manila')->startOfDay();
                        if (!$birthday || $birthday->addYears(18)->startOfDay()->greaterThan($today)) {
                            $fail('You must be at least 18 years old to register.');
                        }
                    } catch (Throwable) {
                        $fail('Enter a valid birthday.');
                    }
                },
            ],

            /*
             * Address
             */
            'region' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:150'],
            'municipality' => ['required', 'string', 'max:150'],
            'barangay' => ['required', 'string', 'max:150'],

            'street' => ['required', 'string', 'max:100'],
            'house_number' => ['required', 'string', 'max:20'],
            'building_name' => ['nullable', 'string', 'max:80'],
            'unit_number' => ['nullable', 'string', 'max:30'],
            'postal_code' => ['required', 'regex:/^\\d{4}$/'],

            /*
             * Seller
             */
            'business_name' => [
                'required_if:role,seller,logistics',
                'nullable',
                'string',
                'max:100',
            ],
            'tin' => [
                'exclude_unless:role,seller',
                'nullable', 'string', 'max:13', 'regex:/^[0-9]{9,13}$/',
            ],

            'line_of_business' => [
                'required_if:role,seller',
                'nullable',
                Rule::in(['Pet Supplies', 'Electronics & Gadgets', "Women's Apparel", "Men's Apparel", 'Kids & Baby', 'Home & Garden', 'Sports & Outdoors', 'Health & Beauty', 'Books & Media', 'Food & Gourmet', 'Automotive & Motorcycle', 'Furniture & Office Equipment', 'Jewelry & Watches', 'Office & School Supplies']),
            ],

            /*
             * Courier
             */
            'vehicle_type' => [
                'required_if:role,rider',
                'nullable',
                Rule::in([
                    'motorcycle',
                    'tricycle',
                    'car',
                    'van',
                    'truck',
                ]),
            ],

            'plate_number' => [
                'required_if:role,rider',
                'nullable',
                'string',
                'max:15',
                'unique:vehicles,plate_number',
            ],

            /*
             * Documents
             */
            'valid_id' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120',
            ],

            'business_permit' => [
                'required_if:role,seller,logistics',
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120',
            ],

            'or_cr' => [
                'required_if:role,rider',
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120',
            ],

            'drivers_license' => [
                'required_if:role,rider',
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'max:5120',
            ],
        ]);

        $otp = (string) random_int(100000, 999999);

        $storedPaths = [];
        try {
            $user = DB::transaction(function () use ($request, $validated, $otp, &$storedPaths) {
                /*
                 * Create base user account.
                 */
                $user = User::forceCreate([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'password' => Hash::make($validated['password']),
                    'role' => $validated['role'],
                    'status' => 'pending',
                ]);
                $user->forceFill([
                    'email_otp_hash' => Hash::make($otp),
                    'email_otp_expires_at' => now()->addMinutes(10),
                    'email_otp_attempts' => 0,
                ])->save();

                foreach ([
                    ['type' => 'terms', 'version' => config('policies.terms.version')],
                    ['type' => 'privacy_notice', 'version' => config('policies.privacy.version')],
                ] as $acceptance) {
                    $user->policyAcceptances()->firstOrCreate(
                        ['policy_type' => $acceptance['type'], 'policy_version' => $acceptance['version']],
                        ['accepted_at' => now()],
                    );
                }

                /*
                 * Create address.
                 */
                Address::create([
                    'user_id' => $user->id,
                    'region' => $validated['region'],
                    'province' => $validated['province'],
                    'municipality' => $validated['municipality'],
                    'barangay' => $validated['barangay'],
                    'street' => $validated['street'] ?? null,
                    'house_number' => $validated['house_number'] ?? null,
                    'building_name' => $validated['building_name'] ?? null,
                    'unit_number' => $validated['unit_number'] ?? null,
                    'postal_code' => $validated['postal_code'] ?? null,
                ]);

                /*
                 * Create role-specific profile.
                 */
                if ($validated['role'] === 'buyer') {
                    BuyerProfile::create([
                        'user_id' => $user->id,
                        'sex' => $validated['sex'],
                        'birthday' => $validated['birthday'],
                    ]);
                }

                if ($validated['role'] === 'seller') {
                    SellerProfile::create([
                        'user_id' => $user->id,
                        'sex' => $validated['sex'],
                        'birthday' => $validated['birthday'],
                        'business_name' => $validated['business_name'],
                        'line_of_business' => $validated['line_of_business'],
                        'tin' => $validated['tin'] ?? null,
                    ]);
                }

                if ($validated['role'] === 'rider') {
                    $courierProfile = CourierProfile::create([
                        'user_id' => $user->id,
                        'sex' => $validated['sex'],
                        'birthday' => $validated['birthday'],
                    ]);

                    Vehicle::create([
                        'courier_profile_id' => $courierProfile->id,
                        'vehicle_type' => $validated['vehicle_type'],
                        'plate_number' => $validated['plate_number'],
                    ]);
                }

                if ($validated['role'] === 'logistics') {
                    LogisticsProfile::create([
                        'user_id' => $user->id,
                        'sex' => $validated['sex'],
                        'birthday' => $validated['birthday'],
                        'business_name' => $validated['business_name'],
                    ]);
                }

                /*
                 * Store required valid ID.
                 */
                $this->storeDocument(
                    $user,
                    $request->file('valid_id'),
                    'valid_id', $storedPaths
                );

                /*
                 * Seller documents.
                 */
                if ($validated['role'] === 'seller') {
                    $this->storeDocument(
                        $user,
                        $request->file('business_permit'),
                        'business_permit', $storedPaths
                    );
                }

                if ($validated['role'] === 'logistics') {
                    $this->storeDocument(
                        $user,
                        $request->file('business_permit'),
                        'business_permit', $storedPaths
                    );
                }

                /*
                 * Courier documents.
                 */
                if ($validated['role'] === 'rider') {
                    $this->storeDocument(
                        $user,
                        $request->file('or_cr'),
                        'or_cr', $storedPaths
                    );

                    $this->storeDocument(
                        $user,
                        $request->file('drivers_license'),
                        'drivers_license', $storedPaths
                    );
                }

                return $user;
            });

            try {
                Mail::to($user->email)->send(
                    new RegistrationOtpMail($otp)
                );
            } catch (Throwable $exception) {
                Log::warning('Registration email delivery failed.', [
                    'exception_class' => $exception::class,
                    'reason' => $exception->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'registration_saved' => true,
                    'message' => 'Your registration was saved, but we could not send the verification email. Please try resending the code.',
                ], 503);
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration submitted. Please check your email for the verification code.',
                'data' => [
                    'id' => $user->id,
                    'status' => $user->status,
                    'role' => $user->role,
                    'email' => $user->email,
                    'email_verified' => false,
                ],
            ], 201);

        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                Storage::disk('local')->delete($path);
            }
            Log::error('Registration request failed.', [
                'exception_class' => $exception::class,
                'reason' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to complete registration. Please try again.',
            ], 500);
        }
    }

    /**
     * Store an uploaded registration document.
     */
    private function storeDocument(
        User $user,
        $file,
        string $documentType,
        array &$storedPaths
    ): UserDocument {
        $path = $file->store(
            "registration-documents/{$user->id}",
            'local'
        );
        if (!$path) {
            throw new \RuntimeException('Registration document storage failed.');
        }
        $storedPaths[] = $path;

        return UserDocument::create([
            'user_id' => $user->id,
            'document_type' => $documentType,
            'file_path' => $path,
            'original_file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'status' => 'pending',
        ]);
    }
}
