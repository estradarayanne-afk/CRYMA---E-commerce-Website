<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'unique:users,email'],
            'phone'      => ['nullable', 'string', 'max:20'],
            'role'       => ['required', 'in:buyer,seller,rider'],
            'password'   => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'first_name'  => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name'   => $data['last_name'],
            'email'       => $data['email'],
            'phone'       => $data['phone'] ?? null,
            'role'        => $data['role'],
            'password'    => Hash::make($data['password']),
            'status'      => 'pending',
        ]);

        return response()->json([
            'message' => 'Registration submitted. Please wait for admin approval before signing in.',
            'user'    => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::whereRaw('LOWER(email) = ?', [strtolower($credentials['email'])])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is not active.'
            ], 403);
        }

        $token = $user->createToken('web-token')->plainTextToken;

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