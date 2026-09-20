<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\BuyerOrderController;
use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DashboardController;
// use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use App\Http\Controllers\Admin\DocumentController;
use App\Http\Controllers\Admin\ChatController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Seller\ReportController as SellerReportController;
use App\Http\Controllers\Admin\SellerComplianceController;
use App\Http\Controllers\Admin\ComplaintController;
use App\Http\Controllers\Admin\CommissionController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\PlatformSettingsController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [RegistrationController::class, 'store']);

// Public product routes
Route::get('/products', [ProductController::class, 'publicIndex']);
Route::get('/products/{id}', [ProductController::class, 'publicShow']);

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

    // Buyer orders
    Route::get('/orders', [BuyerOrderController::class, 'index']);
    Route::get('/orders/{id}', [BuyerOrderController::class, 'show']);
    Route::post('/orders', [BuyerOrderController::class, 'store']);

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

    // Admin document management
    Route::get(
        '/admin/documents',
        [DocumentController::class, 'index']
    );

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

    // Admin user management
    // Route::get('/admin/users', [RegistrationController::class, 'users']);
    // Route::get('/admin/users', [AdminRegistrationController::class, 'users']);
    // Route::patch('/admin/users/{id}', [RegistrationController::class, 'updateUser']);
    // Route::patch('/admin/users/{id}/status', [RegistrationController::class, 'updateStatus']);
    Route::get('/admin/users', [AdminRegistrationController::class, 'users']);
    Route::patch('/admin/users/{id}', [AdminRegistrationController::class,'updateUser']);
    Route::patch('/admin/users/{id}/status', [AdminRegistrationController::class,'updateStatus']);

    // Seller product management
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

    Route::get('/seller/reports', [
        SellerReportController::class,
        'index'
    ]);

    // Admin seller compliance
    Route::get('/admin/seller-compliance', [
        SellerComplianceController::class,
        'index'
    ]);

    Route::get('/admin/seller-compliance/{id}', [
        SellerComplianceController::class,
        'show'
    ]);

    Route::patch('/admin/seller-compliance/{id}/approve', [
        SellerComplianceController::class,
        'approve'
    ]);

    Route::patch('/admin/seller-compliance/{id}/reject', [
        SellerComplianceController::class,
        'reject'
    ]);

    // Admin complaint management
    Route::get('/admin/complaints', [
        ComplaintController::class,
        'index'
    ]);

    Route::get('/admin/complaints/{id}', [
        ComplaintController::class,
        'show'
    ]);

    Route::patch('/admin/complaints/{id}/status', [
        ComplaintController::class,
        'updateStatus'
    ]);

    Route::patch('/admin/complaints/{id}/resolve', [
        ComplaintController::class,
        'resolve'
    ]);

    // Admin commission management
    Route::get('/admin/commissions', [
        CommissionController::class,
        'index'
    ]);

    Route::get('/admin/commissions/{id}', [
        CommissionController::class,
        'show'
    ]);

    // Admin order management
    Route::get('/admin/orders', [
        OrderController::class,
        'index'
    ]);

    Route::get('/admin/orders/{id}', [
        OrderController::class,
        'show'
    ]);

    Route::patch('/admin/orders/{id}/status', [
        OrderController::class,
        'updateStatus'
    ]);

    // Admin reports
    Route::get('/admin/reports', [
        ReportController::class,
        'index'
    ]);

    // Admin platform settings
    Route::get('/admin/settings/announcements', [
        PlatformSettingsController::class,
        'announcements'
    ]);

    Route::post('/admin/settings/announcements', [
        PlatformSettingsController::class,
        'storeAnnouncement'
    ]);

    Route::patch('/admin/settings/announcements/{id}', [
        PlatformSettingsController::class,
        'updateAnnouncement'
    ]);

    Route::delete('/admin/settings/announcements/{id}', [
        PlatformSettingsController::class,
        'deleteAnnouncement'
    ]);

    Route::get('/admin/settings/policies', [
        PlatformSettingsController::class,
        'policies'
    ]);

    Route::post('/admin/settings/policies', [
        PlatformSettingsController::class,
        'storePolicy'
    ]);

    Route::patch('/admin/settings/policies/{id}', [
        PlatformSettingsController::class,
        'updatePolicy'
    ]);

    Route::delete('/admin/settings/policies/{id}', [
        PlatformSettingsController::class,
        'deletePolicy'
    ]);

    // Admin chat
    Route::get('/admin/chat/conversations', [
        ChatController::class,
        'conversations'
    ]);

    Route::get('/admin/chat/conversations/{id}', [
        ChatController::class,
        'showConversation'
    ]);

    Route::post('/admin/chat/conversations/{id}/messages', [
        ChatController::class,
        'sendMessage'
    ]);

    Route::patch('/admin/chat/conversations/{id}/read', [
        ChatController::class,
        'markAsRead'
    ]);

});
