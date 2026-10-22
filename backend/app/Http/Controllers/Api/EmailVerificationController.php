<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\RegistrationOtpMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class EmailVerificationController extends Controller
{
    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email', 'max:254']]);
        $email = mb_strtolower(trim($validated['email']));
        $otp = (string) random_int(100000, 999999);

        $user = DB::transaction(function () use ($email, $otp) {
            $user = User::where('email', $email)->lockForUpdate()->first();
            if (!$user || $user->email_verified_at || $user->status !== 'pending') return null;
            $user->email_otp_hash = Hash::make($otp);
            $user->email_otp_expires_at = now()->addMinutes(10);
            $user->email_otp_attempts = 0;
            $user->save();
            return $user;
        });

        if ($user) {
            try {
                Mail::to($user->email)->send(new RegistrationOtpMail($otp));
            } catch (Throwable $exception) {
                Log::warning('Verification email delivery failed.', [
                    'exception_class' => $exception::class,
                    'reason' => $exception->getMessage(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'We could not send the verification email right now. Please try again shortly.',
                ], 503);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'If this address has a pending registration, a new verification code has been sent.',
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => mb_strtolower(trim($request->input('email')))]);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:254'],
            'otp' => ['required', 'digits:6'],
        ]);

        $result = DB::transaction(function () use ($validated): array {
            $user = User::where('email', $validated['email'])->lockForUpdate()->first();

            if (!$user || $user->email_verified_at !== null) {
                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => 'The verification request is invalid or the email is already verified.',
                    ],
                ];
            }

            if (
                !$user->email_otp_hash ||
                !$user->email_otp_expires_at ||
                now()->greaterThanOrEqualTo($user->email_otp_expires_at)
            ) {
                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => 'The verification code has expired. Please request a new code.',
                    ],
                ];
            }

            if ($user->email_otp_attempts >= 5) {
                return [
                    'status' => 429,
                    'body' => [
                        'success' => false,
                        'message' => 'Too many incorrect attempts. Please request a new code.',
                    ],
                ];
            }

            if (!Hash::check($validated['otp'], $user->email_otp_hash)) {
                $user->email_otp_attempts++;
                $user->save();

                return [
                    'status' => 422,
                    'body' => [
                        'success' => false,
                        'message' => 'Incorrect verification code.',
                    ],
                ];
            }

            $user->email_verified_at = now();
            $user->email_otp_hash = null;
            $user->email_otp_expires_at = null;
            $user->email_otp_attempts = 0;
            $user->save();

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => 'Email verified successfully. Your account is awaiting administrator approval.',
                    'data' => [
                        'id' => $user->id,
                        'email_verified' => true,
                        'status' => $user->status,
                        'role' => $user->role,
                    ],
                ],
            ];
        });

        return response()->json($result['body'], $result['status']);
    }
}
