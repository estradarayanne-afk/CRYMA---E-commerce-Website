<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class PasswordRecoveryController extends Controller
{
    public function sendLink(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email', 'max:254']]);
        try {
            Password::sendResetLink(['email' => mb_strtolower(trim($validated['email']))]);
        } catch (Throwable $exception) {
            Log::warning('Password reset email delivery failed.', ['exception_class' => $exception::class]);

            return response()->json([
                'success' => false,
                'message' => 'We could not send password reset instructions right now. Please try again shortly.',
            ], 503);
        }

        return response()->json([
            'success' => true,
            'message' => 'If an account matches that email, password reset instructions will be sent.',
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email', 'max:254'],
            'password' => ['required', 'string', 'min:8', 'max:128', 'confirmed'],
        ]);
        $validated['email'] = mb_strtolower(trim($validated['email']));

        $status = Password::reset($validated, function ($user, $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['success' => false, 'message' => 'This reset link is invalid or expired. Request a new one.'], 422);
        }

        return response()->json(['success' => true, 'message' => 'Password reset successfully.']);
    }
}
