<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\ApplicantDocumentCorrectionController;
use App\Http\Controllers\Api\BuyerOrderController;
use App\Http\Controllers\Api\BuyerVoucherController;
use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\DashboardController;
// use App\Http\Controllers\Admin\RegistrationController as AdminRegistrationController;
use App\Http\Controllers\Admin\DocumentController;
use App\Http\Controllers\Admin\ChatController;
use App\Http\Controllers\Seller\ProductController;
use App\Http\Controllers\Seller\StorefrontController;
use App\Http\Controllers\Seller\NotificationController as SellerNotificationController;
use App\Http\Controllers\Seller\OrderController as SellerOrderController;
use App\Http\Controllers\Seller\ChatController as SellerChatController;
use App\Http\Controllers\Seller\ReportController as SellerReportController;
use App\Http\Controllers\Admin\SellerComplianceController;
use App\Http\Controllers\Admin\ComplaintController;
use App\Http\Controllers\Admin\CommissionController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\RefundRequestController;
use App\Http\Controllers\Admin\SettlementController;
use App\Http\Controllers\Seller\EarningsController;
use App\Http\Controllers\Seller\VoucherController as SellerVoucherController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\PlatformSettingsController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\BuyerChatController;
use App\Http\Controllers\Api\PasswordRecoveryController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Admin\DeliveryController as AdminDeliveryController;
use App\Http\Controllers\Courier\DeliveryController as CourierDeliveryController;
use App\Http\Controllers\Admin\LogisticsController;
use App\Http\Controllers\Admin\VoucherController as AdminVoucherController;
use App\Http\Controllers\Courier\PickupController;
use App\Http\Controllers\Courier\DeliveryProofController;
use App\Http\Controllers\Logistics\DashboardController as LogisticsDashboardController;
use App\Http\Controllers\Logistics\RiderManagementController;
use App\Http\Controllers\Logistics\ParcelOperationsController;
use App\Http\Controllers\Logistics\ParcelFlowController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register', [RegistrationController::class, 'store'])->middleware('throttle:5,1');
Route::post('/verify-email', [EmailVerificationController::class, 'verify'])->middleware('throttle:6,1');
Route::post('/resend-verification', [EmailVerificationController::class, 'resend'])->middleware('throttle:3,1');
Route::get('/application/document-correction', [ApplicantDocumentCorrectionController::class, 'show'])->middleware('throttle:20,1');
Route::post('/application/document-correction', [ApplicantDocumentCorrectionController::class, 'replace'])->middleware('throttle:10,1');
Route::post('/forgot-password', [PasswordRecoveryController::class, 'sendLink'])->middleware('throttle:3,1');
Route::post('/reset-password', [PasswordRecoveryController::class, 'reset'])->middleware('throttle:5,1');

// Public seller storefront.
Route::get('/stores/{slug}', [StorefrontController::class, 'publicShow']);

// Public product routes
Route::get('/products', [ProductController::class, 'publicIndex']);

Route::get(
    '/products/{productId}/reviews',
    [ReviewController::class, 'index']
);
Route::get('/products/{id}', [ProductController::class, 'publicShow']);



Route::middleware(['auth:sanctum', 'active'])->get('/user', function (Request $request) {
    return response()->json([
        'user' => $request->user(),
    ]);
});

Route::middleware(['auth:sanctum', 'active'])->post('/logout', [AuthController::class, 'logout']);

Route::middleware(['auth:sanctum', 'active'])->group(function () {

    Route::patch('/account/profile', [AccountController::class, 'updateProfile']);
    Route::get('/account/profile-image', [AccountController::class, 'profileImage'])->name('api.account.profile-image');
    Route::patch('/account/password', [AccountController::class, 'updatePassword']);

    // Admin managed courier assignment and delivery audit.
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/parcel-flow', [ParcelFlowController::class, 'operations']);
        Route::get('/admin/hubs', [ParcelFlowController::class, 'hubs']);
        Route::post('/admin/hubs', [ParcelFlowController::class, 'createHub']);
        Route::patch('/admin/delivery-areas/{id}/hub', [ParcelFlowController::class, 'mapArea']);
        Route::post('/admin/hub-transfers', [ParcelFlowController::class, 'createTransfer']);
        Route::post('/admin/parcel-returns/{id}/assign-courier', [ParcelFlowController::class, 'assignReturnCourier']);
        Route::patch('/admin/parcel-returns/{id}/receive-at-hub', [ParcelFlowController::class, 'receiveReturnAtHub']);
        Route::get('/admin/delivery-queue', [LogisticsController::class, 'queue']);
        Route::get('/admin/logistics', [LogisticsController::class, 'queue']);
        Route::get('/admin/delivery-areas', [LogisticsController::class, 'areas']);
        Route::post('/admin/delivery-areas', [LogisticsController::class, 'storeArea']);
        Route::patch('/admin/delivery-areas/{areaId}', [LogisticsController::class, 'updateArea']);
        Route::post('/admin/delivery-areas/{areaId}/couriers', [LogisticsController::class, 'assignCourierToArea']);
        Route::delete('/admin/delivery-areas/{areaId}/couriers/{courierProfileId}', [LogisticsController::class, 'removeCourierFromArea']);
        Route::post('/admin/orders/{orderId}/pickup-assignment', [LogisticsController::class, 'assignPickup']);
        Route::patch('/admin/orders/{orderId}/scan', [LogisticsController::class, 'scanParcel']);
        Route::patch('/admin/orders/{orderId}/sort-and-assign', [LogisticsController::class, 'sortAndAssign']);
        Route::patch('/admin/orders/{orderId}/legacy-sorting-receipt', [LogisticsController::class, 'confirmLegacySortingReceipt']);
        Route::get('/admin/deliveries/{id}', [AdminDeliveryController::class, 'show']);
        Route::get('/admin/deliveries/{id}/proof/{kind}', [DeliveryProofController::class, 'showForStaff']);
        Route::post('/admin/orders/{orderId}/delivery-assignment', [LogisticsController::class, 'reassignDelivery']);
        Route::patch('/admin/orders/{orderId}/delivery-resolution', [AdminDeliveryController::class, 'resolve']);
    });

    Route::middleware('role:rider')->group(function () {
        Route::get('/courier/parcel-returns', [ParcelFlowController::class, 'courierReturns']);
        Route::patch('/courier/parcel-returns/{id}', [ParcelFlowController::class, 'updateReturn']);
        Route::get('/courier/hub-transfers', [ParcelFlowController::class, 'courierTransfers']);
        Route::patch('/courier/hub-transfers/{id}', [ParcelFlowController::class, 'updateTransfer']);
        Route::get('/courier/pickups', [PickupController::class, 'index']);
        Route::get('/courier/pickup-history', [PickupController::class, 'history']);
        Route::get('/courier/pickups/{id}', [PickupController::class, 'show']);
        Route::patch('/courier/pickups/{id}/status', [PickupController::class, 'updateStatus']);
        Route::get('/courier/deliveries', [CourierDeliveryController::class, 'index']);
        Route::get('/courier/delivery-history', [CourierDeliveryController::class, 'history']);
        Route::get('/courier/deliveries/{id}', [CourierDeliveryController::class, 'show']);
        Route::patch('/courier/deliveries/{id}/status', [CourierDeliveryController::class, 'updateStatus']);
        Route::post('/courier/deliveries/{id}/proof', [DeliveryProofController::class, 'store']);
        Route::get('/courier/deliveries/{id}/proof/{kind}', [DeliveryProofController::class, 'showForCourier']);
    });

    Route::middleware('role:logistics')->group(function () {
        Route::get('/logistics/parcel-flow', [ParcelFlowController::class, 'operations']);
        Route::get('/logistics/hubs', [ParcelFlowController::class, 'hubs']);
        Route::post('/logistics/hubs', [ParcelFlowController::class, 'createHub']);
        Route::patch('/logistics/delivery-areas/{id}/hub', [ParcelFlowController::class, 'mapArea']);
        Route::post('/logistics/hub-transfers', [ParcelFlowController::class, 'createTransfer']);
        Route::post('/logistics/parcel-returns/{id}/assign-courier', [ParcelFlowController::class, 'assignReturnCourier']);
        Route::patch('/logistics/parcel-returns/{id}/receive-at-hub', [ParcelFlowController::class, 'receiveReturnAtHub']);
        Route::get('/logistics/dashboard', [LogisticsDashboardController::class, 'index']);
        Route::get('/logistics/operations', [LogisticsController::class, 'queue']);
        Route::get('/logistics/deliveries/{id}/proof/{kind}', [DeliveryProofController::class, 'showForStaff']);
        Route::get('/logistics/delivery-areas', [LogisticsController::class, 'areas']);
        Route::post('/logistics/orders/{orderId}/pickup-assignment', [LogisticsController::class, 'assignPickup']);
        Route::patch('/logistics/orders/{orderId}/sorting-receipt', [ParcelOperationsController::class, 'confirmSortingReceipt']);
        Route::patch('/logistics/orders/{orderId}/scan', [LogisticsController::class, 'scanParcel']);
        Route::patch('/logistics/orders/{orderId}/sort-and-assign', [LogisticsController::class, 'sortAndAssign']);
        Route::post('/logistics/orders/{orderId}/delivery-assignment', [LogisticsController::class, 'reassignDelivery']);
        Route::patch('/logistics/orders/{orderId}/delivery-resolution', [AdminDeliveryController::class, 'resolve']);
        Route::patch('/logistics/orders/{orderId}/legacy-sorting-receipt', [LogisticsController::class, 'confirmLegacySortingReceipt']);
        Route::get('/logistics/profile', [AccountController::class, 'logisticsProfile']);
        Route::patch('/logistics/profile', [AccountController::class, 'updateProfile']);
        Route::patch('/logistics/account/password', [AccountController::class, 'updatePassword']);
        Route::get('/logistics/riders', [RiderManagementController::class, 'index']);
        Route::get('/logistics/riders/{id}/documents/{documentId}', [RiderManagementController::class, 'showDocument']);
        Route::patch('/logistics/riders/{id}/documents/{documentId}/approve', [RiderManagementController::class, 'approveDocument']);
        Route::patch('/logistics/riders/{id}/documents/{documentId}/reject', [RiderManagementController::class, 'rejectDocument']);
        Route::patch('/logistics/riders/{id}/approve', [RiderManagementController::class, 'approve']);
        Route::patch('/logistics/riders/{id}/reject', [RiderManagementController::class, 'reject']);
    });

    Route::get('/admin/dashboard', [
        DashboardController::class,
        'index'
    ])->middleware('role:admin');

    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/vouchers', [AdminVoucherController::class, 'index']);
        Route::post('/admin/vouchers', [AdminVoucherController::class, 'store']);
        Route::get('/admin/vouchers/{id}', [AdminVoucherController::class, 'show']);
        Route::patch('/admin/vouchers/{id}', [AdminVoucherController::class, 'update']);
        Route::patch('/admin/vouchers/{id}/status', [AdminVoucherController::class, 'updateStatus']);
    });

    // Buyer orders
    Route::middleware('role:buyer')->group(function () {
    Route::get('/buyer/vouchers', [BuyerVoucherController::class, 'index']);
    Route::post('/buyer/vouchers/{id}/claim', [BuyerVoucherController::class, 'claim']);
    Route::post('/buyer/vouchers/validate', [BuyerVoucherController::class, 'validateCode']);
    Route::get('/buyer/addresses', [AccountController::class, 'addresses']);
    Route::post('/buyer/addresses', [AccountController::class, 'storeAddress']);
    Route::patch('/buyer/addresses/{id}', [AccountController::class, 'updateAddress']);
    Route::patch('/buyer/addresses/{id}/default', [AccountController::class, 'setDefaultAddress']);
    Route::delete('/buyer/addresses/{id}', [AccountController::class, 'deleteAddress']);
    Route::get('/buyer/checkout-data', [
        BuyerOrderController::class,
        'checkoutData'
    ]);

    Route::get('/orders', [
        BuyerOrderController::class,
        'index'
    ]);

    Route::get('/orders/{id}', [BuyerOrderController::class, 'show']);
    Route::post('/orders/{id}/cancel', [BuyerOrderController::class, 'cancel']);
    Route::post('/orders/{id}/confirm-received', [BuyerOrderController::class, 'confirmReceived']);
    Route::post('/orders/{id}/refund-requests', [BuyerOrderController::class, 'requestRefund']);
    Route::post('/orders', [BuyerOrderController::class, 'store']);

    Route::post('/products/{productId}/reviews', [ReviewController::class, 'store']);

    Route::get('/buyer/chat/conversations', [BuyerChatController::class, 'conversations']);
    Route::post('/buyer/chat/seller-conversations', [BuyerChatController::class, 'startSellerConversation']);
    Route::get('/buyer/chat/conversations/{id}', [BuyerChatController::class, 'showConversation']);
    Route::post('/buyer/chat/conversations/{id}/products', [BuyerChatController::class, 'shareConversationProduct']);
    Route::post('/buyer/chat/conversations/{id}/messages', [BuyerChatController::class, 'sendMessage']);
    Route::post('/buyer/chat/conversations/{id}/attachments', [BuyerChatController::class, 'sendAttachment']);
    Route::get('/buyer/chat/conversations/{id}/messages/{message}/attachment', [BuyerChatController::class, 'downloadAttachment']);
    Route::patch('/buyer/chat/conversations/{id}/read', [BuyerChatController::class, 'markAsRead']);
    });

    Route::get('/admin/registrations', [
        AdminRegistrationController::class,
        'index'
    ])->middleware('role:admin');

    Route::patch('/admin/registrations/{id}/approve', [
        AdminRegistrationController::class,
        'approve'
    ])->middleware('role:admin');

    Route::patch('/admin/registrations/{id}/reject', [
        AdminRegistrationController::class,
        'reject'
    ])->middleware('role:admin');


    // Admin document management
    Route::get(
        '/admin/documents',
        [DocumentController::class, 'index']
    )->middleware('role:admin');

    Route::get(
        '/admin/documents/{id}',
        [DocumentController::class, 'show']
    )->middleware('role:admin');

    Route::post('/admin/documents/{id}/correction-link', [DocumentController::class, 'resendCorrectionLink'])->middleware('role:admin');

    Route::patch(
        '/admin/documents/{id}/approve',
        [DocumentController::class, 'approve']
    )->middleware('role:admin');

    Route::patch(
        '/admin/documents/{id}/reject',
        [DocumentController::class, 'reject']
    )->middleware('role:admin');

    // Admin user management
    // Route::get('/admin/users', [RegistrationController::class, 'users']);
    // Route::get('/admin/users', [AdminRegistrationController::class, 'users']);
    // Route::patch('/admin/users/{id}', [RegistrationController::class, 'updateUser']);
    // Route::patch('/admin/users/{id}/status', [RegistrationController::class, 'updateStatus']);
    Route::get('/admin/users', [AdminRegistrationController::class, 'users'])->middleware('role:admin');
    Route::patch('/admin/users/{id}', [AdminRegistrationController::class,'updateUser'])->middleware('role:admin');
    Route::patch('/admin/users/{id}/status', [AdminRegistrationController::class,'updateStatus'])->middleware('role:admin');

    Route::middleware('role:seller')->group(function () {
    Route::get('/seller/parcel-returns', [ParcelFlowController::class, 'sellerReturns']);
    Route::patch('/seller/parcel-returns/{id}/receive', [ParcelFlowController::class, 'sellerReceiveReturn']);
    Route::get('/seller/earnings', [EarningsController::class, 'index']);
    Route::get('/seller/vouchers', [SellerVoucherController::class, 'index']);
    Route::post('/seller/vouchers', [SellerVoucherController::class, 'store']);
    Route::patch('/seller/vouchers/{id}/status', [SellerVoucherController::class, 'updateStatus']);
    Route::get('/seller/storefront', [StorefrontController::class, 'show']);
    Route::patch('/seller/storefront', [StorefrontController::class, 'update']);
    Route::patch('/seller/storefront/vacation-mode', [StorefrontController::class, 'updateVacationMode']);
    Route::patch('/seller/storefront/name', [StorefrontController::class, 'updateName']);
    Route::get('/seller/notifications', [SellerNotificationController::class, 'index']);
    Route::patch('/seller/notifications/read-all', [SellerNotificationController::class, 'markAllRead']);
    Route::patch('/seller/notifications/{id}/read', [SellerNotificationController::class, 'markRead']);
    Route::post('/seller/chat/assistant', [SellerChatController::class, 'assistant']);
    Route::get('/seller/chat/conversations', [SellerChatController::class, 'conversations']);
    Route::get('/seller/chat/conversations/{id}', [SellerChatController::class, 'showConversation']);
    Route::post('/seller/chat/conversations/{id}/messages', [SellerChatController::class, 'sendMessage']);
    Route::patch('/seller/chat/conversations/{id}/read', [SellerChatController::class, 'markAsRead']);
    // Seller order management
    Route::get('/seller/orders', [
        SellerOrderController::class,
        'index'
    ]);

    Route::get('/seller/orders/{id}', [
        SellerOrderController::class,
        'show'
    ]);

    Route::patch('/seller/orders/{id}/status', [
        SellerOrderController::class,
        'updateStatus'
    ]);
    Route::post('/seller/orders/{id}/pickup-request', [SellerOrderController::class, 'requestPickup']);

    // Seller product management
    Route::post('/seller/products', [
        ProductController::class,
        'store'
    ]);

    Route::get('/seller/products', [
        ProductController::class,
        'index'
    ]);

    Route::patch('/seller/products/bulk-store-category', [
        ProductController::class,
        'bulkStoreCategory'
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

    Route::get('/seller/reviews', [ReviewController::class, 'sellerIndex']);
    });


    // Admin seller compliance
    Route::get('/admin/seller-compliance', [
        SellerComplianceController::class,
        'index'
    ])->middleware('role:admin');

    Route::get('/admin/seller-compliance/{id}', [
        SellerComplianceController::class,
        'show'
    ])->middleware('role:admin');

    Route::patch('/admin/seller-compliance/{id}/approve', [
        SellerComplianceController::class,
        'approve'
    ])->middleware('role:admin');

    Route::patch('/admin/seller-compliance/{id}/reject', [
        SellerComplianceController::class,
        'reject'
    ])->middleware('role:admin');

    Route::post('/admin/seller-compliance/{id}/violation-action', [
        SellerComplianceController::class,
        'takeViolationAction'
    ])->middleware('role:admin');

    Route::patch('/admin/seller-compliance/{id}/products/{productId}/review', [
        SellerComplianceController::class,
        'reviewProduct'
    ])->middleware('role:admin');

    // Admin complaint management
    Route::get('/admin/complaints', [
        ComplaintController::class,
        'index'
    ])->middleware('role:admin');

    Route::get('/admin/complaints/{id}', [
        ComplaintController::class,
        'show'
    ])->middleware('role:admin');

    Route::patch('/admin/complaints/{id}/status', [
        ComplaintController::class,
        'updateStatus'
    ])->middleware('role:admin');

    Route::patch('/admin/complaints/{id}/resolve', [
        ComplaintController::class,
        'resolve'
    ])->middleware('role:admin');

    // Admin commission management
    Route::get('/admin/commissions/overview', [
        CommissionController::class,
        'overview'
    ])->middleware('role:admin');

    Route::get('/admin/commissions', [
        CommissionController::class,
        'index'
    ])->middleware('role:admin');

    Route::get('/admin/commissions/{id}', [
        CommissionController::class,
        'show'
    ])->middleware('role:admin');

    // Admin order management
    Route::get('/admin/orders', [
        OrderController::class,
        'index'
    ])->middleware('role:admin');

    Route::get('/admin/orders/{id}', [
        OrderController::class,
        'show'
    ])->middleware('role:admin');

    Route::patch('/admin/orders/{id}/status', [
        OrderController::class,
        'updateStatus'
    ])->middleware('role:admin');

    Route::get('/admin/refund-requests', [RefundRequestController::class, 'index'])->middleware('role:admin');
    Route::patch('/admin/refund-requests/{id}', [RefundRequestController::class, 'update'])->middleware('role:admin');
    Route::get('/admin/settlements/cod', [SettlementController::class, 'codCollections'])->middleware('role:admin');
    Route::patch('/admin/settlements/cod/{id}/remit', [SettlementController::class, 'remit'])->middleware('role:admin');
    Route::get('/admin/settlements/payouts', [SettlementController::class, 'payouts'])->middleware('role:admin');
    Route::post('/admin/settlements/payouts/{id}/pay', [SettlementController::class, 'pay'])->middleware('role:admin');

    // Admin reports
    Route::get('/admin/reports', [
        ReportController::class,
        'index'
    ])->middleware('role:admin');

    // Admin platform settings
    Route::get('/admin/settings/announcements', [
        PlatformSettingsController::class,
        'announcements'
    ])->middleware('role:admin');

    Route::post('/admin/settings/announcements', [
        PlatformSettingsController::class,
        'storeAnnouncement'
    ])->middleware('role:admin');

    Route::patch('/admin/settings/announcements/{id}', [
        PlatformSettingsController::class,
        'updateAnnouncement'
    ])->middleware('role:admin');

    Route::delete('/admin/settings/announcements/{id}', [
        PlatformSettingsController::class,
        'deleteAnnouncement'
    ])->middleware('role:admin');

    Route::get('/admin/settings/policies', [
        PlatformSettingsController::class,
        'policies'
    ])->middleware('role:admin');

    Route::post('/admin/settings/policies', [
        PlatformSettingsController::class,
        'storePolicy'
    ])->middleware('role:admin');

    Route::patch('/admin/settings/policies/{id}', [
        PlatformSettingsController::class,
        'updatePolicy'
    ])->middleware('role:admin');

    Route::delete('/admin/settings/policies/{id}', [
        PlatformSettingsController::class,
        'deletePolicy'
    ])->middleware('role:admin');

    // Admin chat
    Route::get('/admin/chat/conversations', [
        ChatController::class,
        'conversations'
    ])->middleware('role:admin');

    Route::get('/admin/chat/conversations/{id}', [
        ChatController::class,
        'showConversation'
    ])->middleware('role:admin');

    Route::get('/admin/chat/conversations/{id}/messages/{message}/attachment', [BuyerChatController::class, 'downloadAttachment'])
        ->middleware('role:admin');

    Route::post('/admin/chat/conversations/{id}/messages', [
        ChatController::class,
        'sendMessage'
    ])->middleware('role:admin');

    Route::patch('/admin/chat/conversations/{id}/read', [
        ChatController::class,
        'markAsRead'
    ])->middleware('role:admin');

});
