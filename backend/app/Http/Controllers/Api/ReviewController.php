<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Get reviews for a product.
     */
    public function index(int $productId)
    {
        $product = Product::find($productId);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $reviews = Review::with('buyer:id,first_name,last_name')
            ->where('product_id', $productId)
            ->latest()
            ->get();

        $reviewCount = $reviews->count();

        $averageRating = $reviewCount > 0
            ? round($reviews->avg('rating'), 1)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'reviews' => $reviews,
                'average_rating' => $averageRating,
                'review_count' => $reviewCount,
            ],
        ]);
    }

    /**
     * Submit a review for a purchased product.
     */
    public function store(Request $request, int $productId)
    {
        $validated = $request->validate([
            'order_id' => [
                'required',
                'integer',
                'exists:orders,id',
            ],

            'rating' => [
                'required',
                'integer',
                'min:1',
                'max:5',
            ],

            'comment' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $product = Product::find($productId);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        /*
         * Make sure the order belongs to the
         * currently authenticated buyer.
         */
        $order = Order::where('id', $validated['order_id'])
            ->where(
                'buyer_id',
                $request->user()->id
            )
            ->where(
                'status',
                'completed'
            )
            ->first();

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'You can only review products from completed orders.',
            ], 422);
        }

        /*
         * Make sure the product was actually
         * included in this order.
         */
        $purchasedProduct = $order->items()
            ->where(
                'product_id',
                $productId
            )
            ->exists();

        if (!$purchasedProduct) {
            return response()->json([
                'success' => false,
                'message' => 'You can only review products included in this order.',
            ], 422);
        }

        /*
         * One buyer can only leave one review
         * for the same product.
         */
        $alreadyReviewed = Review::where(
            'buyer_id',
            $request->user()->id
        )
            ->where(
                'product_id',
                $productId
            )
            ->exists();

        if ($alreadyReviewed) {
            return response()->json([
                'success' => false,
                'message' => 'You have already reviewed this product.',
            ], 422);
        }

        $review = Review::create([
            'buyer_id' => $request->user()->id,
            'product_id' => $productId,
            'order_id' => $order->id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        $review->load(
            'buyer:id,first_name,last_name'
        );

        return response()->json([
            'success' => true,
            'message' => 'Review submitted successfully.',
            'data' => $review,
        ], 201);
    }
}