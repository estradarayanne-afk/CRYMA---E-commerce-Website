<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can access reports.',
            ], 403);
        }

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = Carbon::parse($validated['from'] ?? now()->subMonths(5)->startOfMonth())->startOfDay();
        $to = Carbon::parse($validated['to'] ?? now())->endOfDay();

        $items = OrderItem::with(['product', 'order'])
            ->where('seller_id', $user->id)
            ->whereBetween('created_at', [$from, $to])
            ->whereHas('order', function ($query) {
                $query->whereNotIn('status', ['cancelled', 'canceled', 'rejected']);
            })
            ->get();

        $monthly = $items
            ->groupBy(fn (OrderItem $item) => $item->created_at->format('Y-m'))
            ->map(function ($monthItems, $month) {
                return [
                    'month' => Carbon::createFromFormat('Y-m', $month)->format('M'),
                    'revenue' => (float) $monthItems->sum('subtotal'),
                    'orders' => $monthItems->pluck('order_id')->unique()->count(),
                    'units' => (int) $monthItems->sum('quantity'),
                ];
            })
            ->values();

        $topProducts = $items
            ->groupBy('product_id')
            ->map(function ($productItems) {
                return [
                    'name' => $productItems->first()->product?->name ?? 'Removed product',
                    'units' => (int) $productItems->sum('quantity'),
                    'revenue' => (float) $productItems->sum('subtotal'),
                ];
            })
            ->sortByDesc('revenue')
            ->values()
            ->take(5);

        return response()->json([
            'success' => true,
            'data' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'summary' => [
                    'revenue' => (float) $items->sum('subtotal'),
                    'orders' => $items->pluck('order_id')->unique()->count(),
                    'units' => (int) $items->sum('quantity'),
                ],
                'monthly' => $monthly,
                'top_products' => $topProducts,
            ],
        ]);
    }
}