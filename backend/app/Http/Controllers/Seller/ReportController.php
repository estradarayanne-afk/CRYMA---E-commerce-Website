<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Commission;
use App\Models\Order;
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
                    'period' => $month,
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

        $orderIds = $items->pluck('order_id')->unique();
        $orderStatuses = Order::whereIn('id', $orderIds)->pluck('status');
        $completedOrders = $orderStatuses->filter(fn ($status) => strtoupper((string) $status) === 'COMPLETED')->count();
        $commissionRows = Commission::where('seller_id', $user->id)
            ->whereHas('order', fn ($query) => $query->whereBetween('created_at', [$from, $to])->whereNotIn('status', ['cancelled', 'canceled', 'rejected']))
            ->get(['commission_amount', 'seller_earnings']);
        $totalOrders = $orderIds->count();
        $grossSales = (float) $items->sum('subtotal');

        return response()->json([
            'success' => true,
            'data' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'summary' => [
                    'revenue' => $grossSales,
                    'gross_sales' => $grossSales,
                    'commission_fees' => (float) $commissionRows->sum('commission_amount'),
                    'seller_net_earnings' => (float) $commissionRows->sum('seller_earnings'),
                    'orders' => $totalOrders,
                    'units' => (int) $items->sum('quantity'),
                    'average_order_value' => $totalOrders > 0 ? round($grossSales / $totalOrders, 2) : 0,
                    'completed_orders' => $completedOrders,
                    'completion_rate' => $totalOrders > 0 ? round($completedOrders / $totalOrders * 100, 1) : 0,
                ],
                'monthly' => $monthly,
                'top_products' => $topProducts,
            ],
        ]);
    }
}
