<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'min:3', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($credentials['email'])])->first();

        if (!$user || $user->account_archived_at !== null || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }


        // Legacy approved accounts predate the OTP fields and have no OTP hash.
        // New registrations always persist an OTP hash until verification succeeds.
        if ($user->email_verified_at === null && $user->email_otp_hash !== null) {
            return response()->json([
                'message' => 'Please verify your email address before signing in.',
                'email_verified' => false,
            ], 403);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is not active. Please wait for administrator approval.'
            ], 403);
        }


        $token = $user->createToken('web-token')->plainTextToken;

        $user->load(['courierProfile.vehicles', 'addresses', 'documents']);

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
