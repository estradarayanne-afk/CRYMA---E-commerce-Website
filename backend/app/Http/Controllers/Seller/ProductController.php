<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    private const CATEGORIES = ['Pet Supplies', 'Electronics & Gadgets', "Women's Apparel", "Men's Apparel", 'Kids & Baby', 'Home & Garden', 'Sports & Outdoors', 'Health & Beauty', 'Books & Media', 'Food & Gourmet', 'Automotive & Motorcycle', 'Furniture & Office Equipment', 'Jewelry & Watches', 'Office & School Supplies'];

    /**
     * Public listing — active products visible to all buyers.
     */
    public function publicIndex(Request $request)
    {
        $request->merge(['search' => is_string($request->input('search')) ? trim($request->input('search')) : $request->input('search')]);
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:255', Rule::in(array_merge(['All'], self::CATEGORIES))],
        ]);

        $query = Product::with(['seller:id,first_name,last_name', 'media'])
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'));

        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $products = $query->latest()->paginate(20);
        $products->getCollection()->transform(fn (Product $product) => $this->publicProductData($product));

        return response()->json(['success' => true, 'data' => $products]);
    }

    /**
     * Public single product detail.
     */
    public function publicShow(int $id)
    {
        $product = Product::with(['seller:id,first_name,last_name', 'media'])
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'))
            ->find($id);

        if (!$product) {
            return response()->json(['success' => false, 'message' => 'Product not found.'], 404);
        }

        return response()->json(['success' => true, 'data' => $this->publicProductData($product)]);
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

        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $products = Product::with('media')
            ->where('seller_id', $user->id)
            ->latest()
            ->paginate($validated['per_page'] ?? 10);

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

        $this->normalizeVariantsInput($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'sku' => [
                'nullable',
                'string',
                'max:64',
                Rule::unique('products', 'sku')->where(fn ($query) => $query->where('seller_id', $user->id)),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'stock' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'status' => ['sometimes', 'required', 'in:active,inactive,out_of_stock'],
            'variants' => ['sometimes', 'array', 'max:100'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0', 'max:4294967295'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        $validated['variants'] = $this->normalizeVariantRows($validated['variants'] ?? []);
        if ($validated['variants']) {
            $validated['price'] = $this->lowestVariantPrice($validated['variants']);
            $validated['discounted_price'] = null;
            $validated['stock'] = array_sum(array_column($validated['variants'], 'stock'));
        }
        $this->validateMediaTotal($validated);

        $this->validateDiscountedPrice($validated['discounted_price'] ?? null, $validated['price']);
        $storedPaths = [];
        try {
            $product = DB::transaction(function () use ($user, $validated, &$storedPaths) {
                $product = Product::create([
                    'seller_id' => $user->id,
                    'name' => $validated['name'],
                    'sku' => $validated['sku'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
                    'discounted_price' => $validated['discounted_price'] ?? null,
                    'variants' => $validated['variants'] ?: null,
                    'stock' => $validated['stock'],
                    'category' => $validated['category'],
                    'status' => $validated['status'] ?? 'active',
                    'review_status' => 'pending',
                    'review_reason' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                ]);
                $this->storeMedia($product, $validated, $storedPaths);

                return $product->load('media');
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($storedPaths);
            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Product submitted for admin review. It will appear in your storefront after approval.',
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

        $product = Product::with('media')->where('seller_id', $user->id)
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

        $this->normalizeVariantsInput($request);
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'sku' => [
                'sometimes',
                'nullable',
                'string',
                'max:64',
                Rule::unique('products', 'sku')
                    ->where(fn ($query) => $query->where('seller_id', $user->id))
                    ->ignore($product->id),
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'price' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'discounted_price' => ['sometimes', 'nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0', 'max:4294967295'],
            'category' => ['sometimes', 'required', Rule::in(self::CATEGORIES)],
            'status' => [
                'sometimes',
                'required',
                'in:active,inactive,out_of_stock',
            ],
            'variants' => ['sometimes', 'array', 'max:100'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0', 'max:4294967295'],
            'replace_media' => ['sometimes', 'boolean'],
            'keep_media_ids' => ['sometimes', 'array', 'max:10'],
            'keep_media_ids.*' => ['integer', 'distinct'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        if (array_key_exists('variants', $validated)) {
            $validated['variants'] = $this->normalizeVariantRows($validated['variants']);
            if ($validated['variants']) {
                $validated['price'] = $this->lowestVariantPrice($validated['variants']);
                $validated['discounted_price'] = null;
                $validated['stock'] = array_sum(array_column($validated['variants'], 'stock'));
            } else {
                $validated['variants'] = null;
            }
        }
        $this->validateMediaTotal($validated);

        $discountedPrice = array_key_exists('discounted_price', $validated)
            ? $validated['discounted_price']
            : $product->discounted_price;
        $price = $validated['price'] ?? $product->price;
        if (empty($validated['variants'])) {
            $this->validateDiscountedPrice($discountedPrice, $price);
        }
        $mediaPathsToDelete = [];
        $storedPaths = [];
        try {
            DB::transaction(function () use ($request, $product, $validated, &$mediaPathsToDelete, &$storedPaths) {
                $product->update(collect($validated)->except([
                    'images',
                    'videos',
                    'replace_media',
                    'keep_media_ids',
                ])->all());

                if ($request->boolean('replace_media')) {
                    $keepIds = array_map('intval', $validated['keep_media_ids'] ?? []);
                    $existing = $product->media()->get();
                    if (collect($keepIds)->diff($existing->pluck('id'))->isNotEmpty()) {
                        throw ValidationException::withMessages([
                            'keep_media_ids' => ['One or more selected media files do not belong to this product.'],
                        ]);
                    }
                    $retained = $existing->filter(fn (ProductMedia $media) => in_array((int) $media->id, $keepIds, true));
                    $this->validateMediaCounts($retained, $validated);
                    $removed = $existing->reject(fn (ProductMedia $media) => in_array((int) $media->id, $keepIds, true));
                    $mediaPathsToDelete = $removed->pluck('path')->all();
                    ProductMedia::whereIn('id', $removed->pluck('id'))->delete();
                } else {
                    $this->validateMediaCounts($product->media()->get(), $validated);
                }

                $this->storeMedia($product, $validated, $storedPaths);

                $listingChanged = collect(['name', 'description', 'category', 'variants'])->contains(fn (string $field): bool => array_key_exists($field, $validated))
                    || $request->boolean('replace_media')
                    || !empty($validated['images'])
                    || !empty($validated['videos']);
                if ($listingChanged) {
                    $product->forceFill([
                        'review_status' => 'pending',
                        'review_reason' => null,
                        'reviewed_by' => null,
                        'reviewed_at' => null,
                    ])->save();
                }
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($storedPaths);
            throw $exception;
        }
        if ($mediaPathsToDelete) {
            Storage::disk('public')->delete($mediaPathsToDelete);
        }

        return response()->json([
            'success' => true,
            'message' => $product->fresh()->review_status === 'pending'
                ? 'Product changes submitted for admin review. It will be visible to buyers after approval.'
                : 'Product updated successfully.',
            'data' => $product->fresh()->load('media'),
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

        $mediaPaths = $product->media()->pluck('path')->all();
        $product->delete();
        Storage::disk('public')->delete($mediaPaths);

        return response()->json([
            'success' => true,
            'message' => 'Product deleted successfully.',
        ]);
    }

    private function publicProductData(Product $product): array
    {
        $data = $product->toArray();
        $images = $product->media->where('type', 'image')->values();
        $videos = $product->media->where('type', 'video')->values();
        $data['images'] = $images->map(fn (ProductMedia $media) => $media->url)->all();
        $data['videos'] = $videos->map(fn (ProductMedia $media) => [
            'id' => $media->id,
            'url' => $media->url,
        ])->all();
        $data['image'] = $images->first()?->url;
        if (!empty($product->variants)) {
            $variants = collect($product->variants);
            $lowest = $variants->sortBy(fn (array $variant) => $this->moneyToCents($variant['discounted_price'] ?? $variant['price']))->first();
            $data['price'] = $lowest['discounted_price'] ?? $lowest['price'];
            $data['original_price'] = null;
            $data['price_from_variants'] = true;
        } elseif ($product->discounted_price !== null) {
            $data['original_price'] = $product->price;
            $data['price'] = $product->discounted_price;
        }

        return $data;
    }

    private function normalizeVariantsInput(Request $request): void
    {
        if (is_string($request->input('variants'))) {
            $request->merge(['variants' => json_decode($request->input('variants'), true)]);
        }
    }

    /**
     * @param array<int, array<string, mixed>> $variants
     * @return array<int, array{id: string, color: ?string, size: ?string, price: string, discounted_price: ?string, stock: int}>
     */
    private function normalizeVariantRows(array $variants): array
    {
        $seenOptions = [];
        $normalized = [];
        foreach ($variants as $index => $variant) {
            $color = trim((string) ($variant['color'] ?? ''));
            $size = trim((string) ($variant['size'] ?? ''));
            if ($color === '' && $size === '') {
                throw ValidationException::withMessages([
                    "variants.{$index}.color" => ['Enter a color or size for each variant.'],
                ]);
            }

            $optionKey = mb_strtolower($color).'|'.mb_strtolower($size);
            if (isset($seenOptions[$optionKey])) {
                throw ValidationException::withMessages([
                    "variants.{$index}.color" => ['Each color and size combination must be unique.'],
                ]);
            }
            $seenOptions[$optionKey] = true;

            $price = (string) $variant['price'];
            $discountedPrice = filled($variant['discounted_price'] ?? null)
                ? (string) $variant['discounted_price']
                : null;
            $this->validateDiscountedPrice($discountedPrice, $price);
            $normalized[] = [
                'id' => $variant['id'] ?? (string) Str::uuid(),
                'color' => $color !== '' ? $color : null,
                'size' => $size !== '' ? $size : null,
                'price' => $price,
                'discounted_price' => $discountedPrice,
                'stock' => (int) $variant['stock'],
            ];
        }

        return $normalized;
    }

    /**
     * @param array<int, array<string, mixed>> $variants
     */
    private function lowestVariantPrice(array $variants): string
    {
        return collect($variants)
            ->sortBy(fn (array $variant) => $this->moneyToCents($variant['price']))
            ->first()['price'];
    }

    private function validateDiscountedPrice(?string $discountedPrice, string $price): void
    {
        if ($discountedPrice !== null && $this->moneyToCents($discountedPrice) >= $this->moneyToCents($price)) {
            throw ValidationException::withMessages([
                'discounted_price' => ['The discounted price must be lower than the regular price.'],
            ]);
        }
    }

    /**
     * Keep multipart submissions within the default PHP post_max_size of 8 MB.
     *
     * @param array<string, mixed> $validated
     */
    private function validateMediaTotal(array $validated): void
    {
        $totalBytes = collect($validated['images'] ?? [])
            ->merge($validated['videos'] ?? [])
            ->sum(fn (UploadedFile $file) => $file->getSize() ?? 0);

        if ($totalBytes > 6 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'images' => ['The combined size of uploaded photos and videos must not exceed 6 MB per save.'],
            ]);
        }
    }

    /**
     * @param \Illuminate\Support\Collection<int, ProductMedia> $retained
     * @param array<string, mixed> $validated
     */
    private function validateMediaCounts(Collection $retained, array $validated): void
    {
        foreach (['image' => 'images', 'video' => 'videos'] as $type => $field) {
            $count = $retained->where('type', $type)->count() + count($validated[$field] ?? []);
            $limit = $type === 'image' ? 8 : 2;
            if ($count > $limit) {
                throw ValidationException::withMessages([
                    $field => ["A product can have up to {$limit} " . ($type === 'image' ? 'photos' : 'videos') . '.'],
                ]);
            }
        }
    }

    private function moneyToCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '0');

        return ((int) $whole * 100) + (int) str_pad($fraction, 2, '0');
    }

    /**
     * @param array<string, mixed> $validated
     * @param array<int, string> $storedPaths
     */
    private function storeMedia(Product $product, array $validated, array &$storedPaths): void
    {
        $files = [
            'image' => $validated['images'] ?? [],
            'video' => $validated['videos'] ?? [],
        ];
        $position = (int) $product->media()->max('position');

        foreach ($files as $type => $uploads) {
            foreach ($uploads as $upload) {
                if (!$upload instanceof UploadedFile) {
                    continue;
                }
                $path = $upload->storePublicly("products/{$product->id}", 'public');
                if ($path === false) {
                    throw new \RuntimeException('Unable to store product media.');
                }
                $storedPaths[] = $path;
                $product->media()->create([
                    'type' => $type,
                    'path' => $path,
                    'position' => ++$position,
                ]);
            }
        }
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
