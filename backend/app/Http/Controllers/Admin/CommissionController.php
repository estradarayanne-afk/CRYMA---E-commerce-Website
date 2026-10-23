<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Commission;
use Illuminate\Http\Request;

class CommissionController extends Controller
{
    public function overview(Request $request)
    {
        $period = $request->query('period', 'month');
        if (!in_array($period, ['month', 'year'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Period must be month or year.',
            ], 422);
        }

        $end = now()->endOfDay();
        $start = $period === 'month'
            ? $end->copy()->startOfDay()->subDays(29)
            : $end->copy()->startOfMonth()->subMonths(11);
        $cursor = $period === 'month' ? $start->copy() : $start->copy()->startOfMonth();

        $buckets = [];
        while ($cursor <= $end) {
            $key = $period === 'month' ? $cursor->toDateString() : $cursor->format('Y-m');
            $buckets[$key] = [
                'date' => $key,
                'label' => $period === 'month' ? $cursor->format('M j') : $cursor->format('M Y'),
                'amount' => 0.0,
            ];
            $cursor = $period === 'month' ? $cursor->addDay() : $cursor->addMonth();
        }

        $records = Commission::query()
            ->whereBetween('created_at', [$start, $end])
            ->get(['created_at', 'commission_amount']);

        foreach ($records as $record) {
            $key = $period === 'month'
                ? $record->created_at->toDateString()
                : $record->created_at->format('Y-m');

            if (isset($buckets[$key])) {
                $buckets[$key]['amount'] += (float) $record->commission_amount;
            }
        }

        $points = array_values(array_map(static function (array $bucket): array {
            $bucket['amount'] = round($bucket['amount'], 2);
            return $bucket;
        }, $buckets));

        return response()->json([
            'success' => true,
            'data' => [
                'period' => $period,
                'total_commission' => round(array_sum(array_column($points, 'amount')), 2),
                'record_count' => $records->count(),
                'points' => $points,
            ],
        ]);
    }

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
