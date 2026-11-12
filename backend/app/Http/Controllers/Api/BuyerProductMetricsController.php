<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductDailyMetric;
use Illuminate\Http\Request;

class BuyerProductMetricsController extends Controller
{
    public function recordImpressions(Request $request)
    {
        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1', 'max:50'],
            'product_ids.*' => ['required', 'integer', 'min:1', 'distinct'],
        ]);
        $products = Product::with('seller.sellerProfile')
            ->whereIn('id', $validated['product_ids'])
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
            ->get();

        foreach ($products as $product) {
            ProductDailyMetric::recordImpression($product);
        }

        return response()->json(['success' => true]);
    }

    public function recordView(int $productId)
    {
        $product = Product::with('seller.sellerProfile')
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
            ->findOrFail($productId);

        ProductDailyMetric::recordView($product);

        return response()->json(['success' => true]);
    }
}
