<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

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
            ])
            ->where('role', 'seller');

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
            ])
            ->where('role', 'seller')
            ->find($id);

        if (!$seller) {
            return response()->json([
                'success' => false,
                'message' => 'Seller not found.',
            ], 404);
        }

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
                'max:1000',
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
}