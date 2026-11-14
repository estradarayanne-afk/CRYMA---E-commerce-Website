<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductDailyMetric;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductExposureController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
        ]);
        $to = $validated['to'] ?? now('Asia/Manila')->toDateString();
        $from = $validated['from'] ?? now('Asia/Manila')->subDays(29)->toDateString();

        $products = ProductDailyMetric::query()
            ->select([
                'product_id',
                'seller_id',
                'product_name',
                'seller_name',
            ])
            ->selectRaw('SUM(detail_views) as detail_views')
            ->selectRaw('SUM(impressions) as impressions')
            ->selectRaw('SUM(purchase_count) as purchase_count')
            ->selectRaw('SUM(units_sold) as units_sold')
            ->whereBetween('metric_date', [$from, $to])
            ->groupBy('product_id', 'seller_id', 'product_name', 'seller_name')
            ->orderByDesc(DB::raw('SUM(detail_views)'))
            ->orderByDesc(DB::raw('SUM(impressions)'))
            ->orderByDesc(DB::raw('SUM(units_sold)'))
            ->paginate(15)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => [
                'from' => $from,
                'to' => $to,
                'products' => $products,
            ],
        ]);
    }
}
