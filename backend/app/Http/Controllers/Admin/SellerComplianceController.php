<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\SellerComplianceNoticeMail;
use App\Models\User;
use App\Models\UserDocument;
use App\Models\SellerComplianceAction;
use App\Models\Product;
use App\Support\SellerProductCompliance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SellerComplianceController extends Controller
{
    /**
     * Get seller accounts for compliance review.
     */
    public function index(Request $request)
    {
        $admin = $request->user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $query = User::query()
            ->with([
                'sellerProfile',
                'documents',
                'products:id,seller_id,name,description,category,review_status',
            ])
            ->where('role', 'seller')
            ->whereHas('products', fn ($products) => $products->where('review_status', 'pending'));

        // Search
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by account status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sellers = $query
            ->latest()
            ->paginate(10);

        $sellers->getCollection()->transform(function (User $seller): User {
            $registeredCategory = $seller->sellerProfile?->line_of_business;
            $pendingProducts = $seller->products->where('review_status', 'pending');
            $flaggedCount = $pendingProducts
                ->filter(fn ($product): bool => SellerProductCompliance::inspect($product, $registeredCategory)['is_flagged'])
                ->count();
            $seller->setAttribute('pending_products_count', $pendingProducts->count());
            $seller->setAttribute('flagged_products_count', $flaggedCount);
            $seller->setAttribute('compliance_status', $seller->status === 'suspended'
                ? 'suspended'
                : ($pendingProducts->isNotEmpty() ? 'review_queue' : ($seller->status === 'active' ? 'compliant' : $seller->status)));
            $seller->unsetRelation('products');
            return $seller;
        });

        return response()->json([
            'success' => true,
            'data' => $sellers,
        ]);
    }

    /**
     * View a specific seller's compliance information.
     */
    public function show(Request $request, int $id)
    {
        $admin = $request->user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $seller = User::query()
            ->with([
                'sellerProfile',
                'documents',
                'products:id,seller_id,name,description,category,status,review_status,stock,price,discounted_price,created_at',
                'products.media',
                'sellerComplianceActions.admin:id,first_name,last_name',
            ])
            ->where('role', 'seller')
            ->find($id);

        if (!$seller) {
            return response()->json([
                'success' => false,
                'message' => 'Seller not found.',
            ], 404);
        }

        $registeredCategory = $seller->sellerProfile?->line_of_business;
        $pendingProducts = $seller->products->where('review_status', 'pending')->values();
        $pendingProducts->transform(function ($product) use ($registeredCategory): object {
            $product->setAttribute('compliance', SellerProductCompliance::inspect($product, $registeredCategory));
            return $product;
        });
        $seller->setRelation('products', $pendingProducts);

        return response()->json([
            'success' => true,
            'data' => $seller,
        ]);
    }

    /**
     * Approve seller compliance.
     */
    public function approve(Request $request, int $id)
    {
        $admin = $request->user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $seller = User::where('role', 'seller')
            ->find($id);

        if (!$seller) {
            return response()->json([
                'success' => false,
                'message' => 'Seller not found.',
            ], 404);
        }

        if (!$seller->email_verified_at) {
            return response()->json(['success' => false, 'message' => 'Email verification is required before approval.'], 422);
        }
        $approvedTypes = UserDocument::where('user_id', $seller->id)
            ->where('status', 'approved')
            ->whereIn('document_type', ['valid_id', 'business_permit'])
            ->pluck('document_type')->unique()->all();
        if (array_diff(['valid_id', 'business_permit'], $approvedTypes)) {
            return response()->json(['success' => false, 'message' => 'The valid ID and business permit must be approved first.'], 422);
        }

        $seller->update([
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Seller compliance approved successfully.',
            'data' => $seller->fresh(),
        ]);
    }

    /**
     * Reject seller compliance.
     */
    public function reject(Request $request, int $id)
    {
        $admin = $request->user();

        if (!$admin || $admin->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $request->validate([
            'rejection_reason' => [
                'required',
                'string',
                'max:500',
            ],
        ]);

        $seller = User::where('role', 'seller')
            ->find($id);

        if (!$seller) {
            return response()->json([
                'success' => false,
                'message' => 'Seller not found.',
            ], 404);
        }

        $seller->update([
            'status' => 'rejected',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Seller compliance rejected successfully.',
            'data' => [
                'seller' => $seller->fresh(),
                'rejection_reason' => $request->rejection_reason,
            ],
        ]);
    }

    /** Record a product-compliance warning or suspend the seller. */
    public function takeViolationAction(Request $request, int $id)
    {
        $validated = $request->validate([
            'action' => ['required', 'in:warning,suspension'],
            'product_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ]);

        $seller = User::query()
            ->with(['sellerProfile', 'products:id,seller_id,name,description,category,status,review_status,stock,price,discounted_price,created_at', 'products.media'])
            ->where('role', 'seller')
            ->find($id);

        if (!$seller) {
            return response()->json(['success' => false, 'message' => 'Seller not found.'], 404);
        }

        $registeredCategory = $seller->sellerProfile?->line_of_business;
        $product = $seller->products->where('review_status', 'pending')->firstWhere('id', (int) $validated['product_id']);
        if (!$product) {
            return response()->json(['success' => false, 'message' => 'This product is not awaiting compliance review for this seller.'], 404);
        }
        $result = SellerProductCompliance::inspect($product, $registeredCategory);
        $flaggedProducts = $result['is_flagged'] ? [[
            'product_id' => $product->id,
            'product_name' => $product->name,
            'category' => $product->category,
            'findings' => $result['findings'],
        ]] : [];

        if (count($flaggedProducts) === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No product compliance findings are currently flagged for this seller.',
            ], 422);
        }

        $action = DB::transaction(function () use ($seller, $request, $validated, $flaggedProducts): SellerComplianceAction {
            $action = SellerComplianceAction::create([
                'seller_id' => $seller->id,
                'admin_id' => $request->user()->id,
                'action' => $validated['action'],
                'reason' => trim($validated['reason']),
                'findings' => $flaggedProducts,
            ]);

            if ($validated['action'] === 'suspension') {
                $seller->forceFill([
                    'status' => 'suspended',
                    'suspension_reason' => trim($validated['reason']),
                ])->save();
                $seller->tokens()->delete();
            }

            return $action;
        });

        $noticeSent = true;
        try {
            Mail::to($seller->email)->send(new SellerComplianceNoticeMail(
                firstName: $seller->first_name ?: 'Seller',
                action: $validated['action'],
                reason: trim($validated['reason']),
            ));
        } catch (\Throwable $exception) {
            $noticeSent = false;
            Log::error('Unable to send seller compliance notice.', [
                'seller_id' => $seller->id,
                'action' => $validated['action'],
                'exception' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => ($validated['action'] === 'warning'
                ? 'Compliance warning recorded for the seller.'
                : 'Seller suspended and compliance action recorded.') . ($noticeSent ? ' Notice emailed to the seller.' : ' Seller notice email could not be sent.'),
            'data' => [
                'seller' => $seller->fresh(),
                'action' => $action->load('admin:id,first_name,last_name'),
            ],
        ]);
    }

    /** Approve a legitimate submission or reject an inappropriate listing. */
    public function reviewProduct(Request $request, int $id, int $productId)
    {
        $validated = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['required_if:decision,reject', 'nullable', 'string', 'min:5', 'max:1000'],
        ]);

        $product = Product::query()
            ->where('seller_id', $id)
            ->where('review_status', 'pending')
            ->find($productId);

        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Pending product submission not found for this seller.'], 404);
        }

        $approved = $validated['decision'] === 'approve';
        $product->forceFill([
            'review_status' => $approved ? 'approved' : 'rejected',
            'review_reason' => $approved ? null : trim($validated['reason']),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'status' => $approved ? $product->status : 'inactive',
        ])->save();

        return response()->json([
            'success' => true,
            'message' => $approved ? 'Product approved and published to the storefront.' : 'Product rejected and kept off the storefront.',
            'data' => $product->load('media'),
        ]);
    }
}
