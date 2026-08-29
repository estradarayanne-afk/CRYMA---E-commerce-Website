<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use App\Http\Controllers\Admin\DocumentController;
use App\Http\Controllers\Seller\ProductController;

Route::post('/login', [AuthController::class, 'login']);

Route::post('/register', [RegistrationController::class, 'store']);

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
        AdminRegistrationController::class,
        'index'
    ]);

    Route::patch('/admin/registrations/{id}/approve', [
        AdminRegistrationController::class,
        'approve'
    ]);

    Route::patch('/admin/registrations/{id}/reject', [
        AdminRegistrationController::class,
        'reject'
    ]);

    Route::get(
        '/admin/documents/{id}',
        [DocumentController::class, 'show']
    );

        Route::patch(
        '/admin/documents/{id}/approve',
        [DocumentController::class, 'approve']
    );

    Route::patch(
        '/admin/documents/{id}/reject',
        [DocumentController::class, 'reject']
    );

    Route::post('/seller/products', [
        ProductController::class,
        'store'
    ]);

    Route::get('/seller/products', [
        ProductController::class,
        'index'
    ]);

    Route::get('/seller/products/{id}', [
        ProductController::class,
        'show'
    ]);

    Route::patch('/seller/products/{id}', [
        ProductController::class,
        'update'
    ]);

    Route::delete('/seller/products/{id}', [
        ProductController::class,
        'destroy'
    ]);

    Route::patch('/seller/products/{id}/archive', [
        ProductController::class,
        'archive'
    ]);

    Route::patch('/seller/products/{id}/restore', [
        ProductController::class,
        'restore'
    ]);

    Route::delete('/seller/products/{id}', [
        ProductController::class,
        'destroy'
    ]);
});