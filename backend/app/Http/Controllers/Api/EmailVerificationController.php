<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmailVerificationController extends Controller
{
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || $user->email_verified_at !== null) {
            return response()->json([
                'success' => false,
                'message' => 'The verification request is invalid or the email is already verified.',
            ], 422);
        }

        if (
            !$user->email_otp_hash ||
            !$user->email_otp_expires_at ||
            now()->greaterThanOrEqualTo($user->email_otp_expires_at)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'The verification code has expired. Please request a new code.',
            ], 422);
        }

        if ($user->email_otp_attempts >= 5) {
            return response()->json([
                'success' => false,
                'message' => 'Too many incorrect attempts. Please request a new code.',
            ], 429);
        }

        if (!Hash::check($validated['otp'], $user->email_otp_hash)) {
            $user->email_otp_attempts++;
            $user->save();

            return response()->json([
                'success' => false,
                'message' => 'Incorrect verification code.',
            ], 422);
        }

        $user->email_verified_at = now();
        $user->email_otp_hash = null;
        $user->email_otp_expires_at = null;
        $user->email_otp_attempts = 0;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully. Your account is awaiting administrator approval.',
            'data' => [
                'id' => $user->id,
                'email_verified' => true,
                'status' => $user->status,
                'role' => $user->role,
            ],
        ]);
    }
}