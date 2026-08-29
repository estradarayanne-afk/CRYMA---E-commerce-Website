<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\BuyerProfile;
use App\Models\CourierProfile;
use App\Models\SellerProfile;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Throwable;

class RegistrationController extends Controller
{
    /**
     * Register a new buyer, seller, or courier.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],

            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],

            'password' => ['required', 'string', 'min:8', 'confirmed'],

            'role' => [
                'required',
                Rule::in(['buyer', 'seller', 'rider']),
            ],

            'sex' => [
                'required',
                Rule::in(['male', 'female', 'prefer_not_to_say']),
            ],

            'birthday' => ['required', 'date', 'before:today'],

            /*
             * Address
             */
            'province' => ['required', 'string', 'max:150'],
            'municipality' => ['required', 'string', 'max:150'],
            'barangay' => ['required', 'string', 'max:150'],

            'street' => ['nullable', 'string', 'max:255'],
            'house_number' => ['nullable', 'string', 'max:100'],
            'building_name' => ['nullable', 'string', 'max:255'],
            'unit_number' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],

            /*
             * Seller
             */
            'business_name' => [
                'required_if:role,seller',
                'nullable',
                'string',
                'max:255',
            ],

            'line_of_business' => [
                'required_if:role,seller',
                'nullable',
                'string',
                'max:255',
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
                'max:50',
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
                'required_if:role,seller',
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

        try {
            $user = DB::transaction(function () use ($request, $validated) {
                /*
                 * Create base user account.
                 */
                $user = User::create([
                    'first_name' => $validated['first_name'],
                    'middle_name' => $validated['middle_name'] ?? null,
                    'last_name' => $validated['last_name'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'],
                    'password' => Hash::make($validated['password']),
                    'role' => $validated['role'],
                    'status' => 'pending',
                ]);

                /*
                 * Create address.
                 */
                Address::create([
                    'user_id' => $user->id,
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

                /*
                 * Store required valid ID.
                 */
                $this->storeDocument(
                    $user,
                    $request->file('valid_id'),
                    'valid_id'
                );

                /*
                 * Seller documents.
                 */
                if ($validated['role'] === 'seller') {
                    $this->storeDocument(
                        $user,
                        $request->file('business_permit'),
                        'business_permit'
                    );
                }

                /*
                 * Courier documents.
                 */
                if ($validated['role'] === 'rider') {
                    $this->storeDocument(
                        $user,
                        $request->file('or_cr'),
                        'or_cr'
                    );

                    $this->storeDocument(
                        $user,
                        $request->file('drivers_license'),
                        'drivers_license'
                    );
                }

                return $user;
            });

            return response()->json([
                'success' => true,
                'message' => 'Registration submitted successfully. Please wait for administrator approval.',
                'data' => [
                    'id' => $user->id,
                    'status' => $user->status,
                    'role' => $user->role,
                ],
            ], 201);
        } catch (Throwable $exception) {
            report($exception);

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
        string $documentType
    ): UserDocument {
        $path = $file->store(
            "registration-documents/{$user->id}",
            'public'
        );

        return UserDocument::create([
            'user_id' => $user->id,
            'document_type' => $documentType,
            'file_path' => $path,
            'original_file_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'status' => 'pending',
        ]);
    }
}