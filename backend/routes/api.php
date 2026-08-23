<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\RegistrationController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return response()->json([
        'user' => $request->user(),
    ]);
});

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class, 'logout']);

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/admin/dashboard', [
        DashboardController::class,
        'index'
    ]);

    Route::get('/admin/registrations', [
        RegistrationController::class,
        'index'
    ]);

    Route::patch('/admin/registrations/{id}/approve', [
        RegistrationController::class,
        'approve'
    ]);

    Route::patch('/admin/registrations/{id}/reject', [
        RegistrationController::class,
        'reject'
    ]);

    // User management — view & update
    Route::get('/admin/users', [RegistrationController::class, 'users']);
    Route::patch('/admin/users/{id}', [RegistrationController::class, 'updateUser']);
    Route::patch('/admin/users/{id}/status', [RegistrationController::class, 'updateStatus']);

});