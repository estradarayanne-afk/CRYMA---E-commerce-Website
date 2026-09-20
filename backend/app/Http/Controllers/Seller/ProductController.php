<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{

    /**
     * Public listing — active products visible to all buyers.
     */
    public function publicIndex(Request $request)
    {
        $query = Product::with('seller:id,first_name,last_name')
            ->where('status', 'active');

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $products = $query->latest()->paginate(20);

        return response()->json(['success' => true, 'data' => $products]);
    }

    /**
     * Public single product detail.
     */
    public function publicShow(int $id)
    {
        $product = Product::with('seller:id,first_name,last_name')
            ->where('status', 'active')
            ->find($id);

        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $product]);
    }

    /**
     * Get products owned by the authenticated seller.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can access products.',
            ], 403);
        }

        $products = Product::where('seller_id', $user->id)
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    /**
     * Create a new product for the authenticated seller.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can create products.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'category' => ['required', 'string', 'max:255'],
        ]);

        $product = Product::create([
            'seller_id' => $user->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'stock' => $validated['stock'],
            'category' => $validated['category'],
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product created successfully.',
            'data' => $product,
        ], 201);
    }

    /**
     * Get a single product owned by the authenticated seller.
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can access products.',
            ], 403);
        }

        $product = Product::where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    /**
     * Update a product owned by the authenticated seller.
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can update products.',
            ], 403);
        }

        $product = Product::where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0'],
            'category' => ['sometimes', 'required', 'string', 'max:255'],
            'status' => [
                'sometimes',
                'required',
                'in:active,inactive,out_of_stock',
            ],
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully.',
            'data' => $product->fresh(),
        ]);
    }

    /**
     * Delete a product owned by the authenticated seller.
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can delete products.',
            ], 403);
        }

        $product = Product::where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.',
        ]);
    }

    /**
     * Archive a product owned by the authenticated seller.
     */
    public function archive(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can archive products.',
            ], 403);
        }

        $product = Product::where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        if ($product->status === 'archived') {
            return response()->json([
                'success' => false,
                'message' => 'Product is already archived.',
            ], 422);
        }

        $product->update([
            'status' => 'archived',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product archived successfully.',
            'data' => $product->fresh(),
        ]);
    }

    /**
     * Restore an archived product owned by the authenticated seller.
     */
    public function restore(Request $request, int $id)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'seller') {
            return response()->json([
                'success' => false,
                'message' => 'Only sellers can restore products.',
            ], 403);
        }

        $product = Product::where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        if ($product->status !== 'archived') {
            return response()->json([
                'success' => false,
                'message' => 'Only archived products can be restored.',
            ], 422);
        }

        $product->update([
            'status' => 'inactive',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product restored successfully.',
            'data' => $product->fresh(),
        ]);
    }

    /**
     * Permanently delete a product owned by the authenticated seller.
     */
    // public function destroy(Request $request, int $id)
    // {
    //     $user = $request->user();

    //     if (!$user || $user->role !== 'seller') {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Only sellers can delete products.',
    //         ], 403);
    //     }

    //     $product = Product::where('seller_id', $user->id)
    //         ->find($id);

    //     if (!$product) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Product not found.',
    //         ], 404);
    //     }

    //     $product->delete();

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Product deleted permanently.',
    //     ]);
    // }
}