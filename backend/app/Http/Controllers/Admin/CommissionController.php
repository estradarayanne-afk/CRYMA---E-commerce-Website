<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use Illuminate\Http\Request;

class CommissionController extends Controller
{
    public function index(Request $request)
    {
        $query = Commission::with([
            'seller:id,first_name,middle_name,last_name,email',
            'order:id,buyer_id,total_amount,status,created_at',
        ]);

        if ($request->filled('search')) {
            $search = $request->search;

            $query->whereHas('seller', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $commissions = $query
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $commissions,
        ]);
    }

    public function show($id)
    {
        $commission = Commission::with([
            'seller',
            'order.buyer',
            'order.items.product',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $commission,
        ]);
    }
}