<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Support\PublicStorageUrl;
use App\Support\ArchivedProductPurger;
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
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:255', Rule::in(array_merge(['All'], self::CATEGORIES))],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'stock' => ['sometimes', 'boolean'],
            'sort' => ['nullable', Rule::in(['featured', 'newest', 'price-low', 'price-high'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Product::with(['seller:id,first_name,last_name', 'seller.sellerProfile:id,user_id,business_name,store_slug,store_logo_url,storefront_settings', 'media'])
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->whereHas('seller', fn ($seller) => $seller->where('role', 'seller')->where('status', 'active'));

        if (!empty($validated['category']) && $validated['category'] !== 'All') {
            $query->where('category', $validated['category']);
        }

        if (!empty($validated['search'])) {
            $term = $validated['search'];
            $query->where(function ($searchQuery) use ($term) {
                $searchQuery->where('name', 'like', '%' . $term . '%')
                    ->orWhere('category', 'like', '%' . $term . '%')
                    ->orWhereHas('seller', function ($sellerQuery) use ($term) {
                        $sellerQuery->where('first_name', 'like', '%' . $term . '%')
                            ->orWhere('last_name', 'like', '%' . $term . '%')
                            ->orWhereHas('sellerProfile', fn ($profileQuery) => $profileQuery->where('business_name', 'like', '%' . $term . '%'));
                    });
            });
        }

        if (isset($validated['min_price'])) {
            $query->whereRaw('COALESCE(discounted_price, price) >= ?', [$validated['min_price']]);
        }

        if (isset($validated['max_price'])) {
            $query->whereRaw('COALESCE(discounted_price, price) <= ?', [$validated['max_price']]);
        }

        if (!empty($validated['stock'])) {
            $query->where('stock', '>', 0);
        }

        $sort = $validated['sort'] ?? 'featured';
        if ($sort === 'price-low') {
            $query->orderByRaw('COALESCE(discounted_price, price) asc')->orderByDesc('id');
        } elseif ($sort === 'price-high') {
            $query->orderByRaw('COALESCE(discounted_price, price) desc')->orderByDesc('id');
        } else {
            $query->latest();
        }

        $products = $query->paginate($validated['per_page'] ?? 20);
        $products->getCollection()->transform(fn (Product $product) => $this->publicProductData($product));

        return response()->json(['success' => true, 'data' => $products]);
    }

    /**
     * Public single product detail.
     */
    public function publicShow(int $id)
    {
        $product = Product::with(['seller:id,first_name,last_name', 'seller.sellerProfile:id,user_id,business_name,store_slug,store_logo_url,storefront_settings', 'media'])
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
        app(ArchivedProductPurger::class)->purge((int) $user->id);
        $products = Product::with('media')->withCount(['orderItems', 'reviews'])
            ->where('seller_id', $user->id)
            ->latest()
            ->paginate($validated['per_page'] ?? 10);
        $products->getCollection()->transform(fn (Product $product) => $this->sellerProductData($product));

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function bulkStoreCategory(Request $request)
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'seller', 403, 'Only sellers can organize products.');

        $validated = $request->validate([
            'product_ids' => ['required', 'array', 'min:1', 'max:500'],
            'product_ids.*' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')->where('seller_id', $user->id)],
            'store_category' => ['required', 'string', 'max:100', Rule::in($this->storeCategoriesFor($user))],
        ]);

        $updated = Product::query()
            ->where('seller_id', $user->id)
            ->whereIn('id', $validated['product_ids'])
            ->update(['store_category' => $validated['store_category'], 'updated_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => "{$updated} products added to {$validated['store_category']}.",
            'data' => ['updated' => $updated, 'store_category' => $validated['store_category']],
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
        if ($request->boolean('is_draft')) {
            return $this->storeDraft($request, $user);
        }
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
            'weight_kg' => ['required', 'numeric', 'min:0.001', 'max:100000', 'decimal:0,3'],
            'stock' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'store_category' => ['nullable', 'string', 'max:100', Rule::in($this->storeCategoriesFor($user))],
            'status' => ['sometimes', 'required', 'in:active,inactive,out_of_stock'],
            'variants' => ['sometimes', 'array', 'max:20'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0', 'max:4294967295'],
            'variant_media' => ['sometimes', 'array', 'max:20'],
            'variant_media.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:1536'],
            'variant_media_ids' => ['sometimes', 'array', 'max:20'],
            'variant_media_ids.*' => ['required', 'uuid', 'distinct'],
            'color_photos' => ['sometimes', 'array', 'max:8'],
            'color_photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'color_photo_colors' => ['sometimes', 'array', 'max:8'],
            'color_photo_colors.*' => ['required', 'string', 'max:50'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        $validated['category'] = $this->registeredBusinessCategory($user);
        $validated['variants'] = $this->normalizeVariantRows($validated['variants'] ?? []);
        $this->validateVariantMediaInputs($validated['variants'], $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? [], [], $validated['color_photos'] ?? [], $validated['color_photo_colors'] ?? []);
        if ($validated['variants']) {
            $validated['price'] = $this->lowestVariantPrice($validated['variants']);
            $validated['discounted_price'] = null;
            $validated['stock'] = array_sum(array_column($validated['variants'], 'stock'));
        }
        $this->validateMediaTotal($validated);

        $this->validateDiscountedPrice($validated['discounted_price'] ?? null, $validated['price']);
        $storedPaths = [];
        try {
            $product = DB::transaction(function () use ($user, &$validated, &$storedPaths) {
                $this->validateColorPhotoInputs(
                    $validated['variants'],
                    $validated['color_photos'] ?? [],
                    $validated['color_photo_colors'] ?? [],
                    []
                );
                $product = Product::create([
                    'seller_id' => $user->id,
                    'name' => $validated['name'],
                    'sku' => $validated['sku'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'],
                    'discounted_price' => $validated['discounted_price'] ?? null,
                    'weight_kg' => $validated['weight_kg'],
                    'variants' => $validated['variants'] ?: null,
                    'stock' => $validated['stock'],
                    'category' => $validated['category'],
                    'store_category' => $validated['store_category'] ?? null,
                    'status' => $validated['status'] ?? 'active',
                    'review_status' => 'pending',
                    'review_reason' => null,
                    'reviewed_by' => null,
                    'reviewed_at' => null,
                ]);
                $unusedPaths = [];
                $validated['variants'] = $this->attachVariantPhotos(
                    $product,
                    $validated['variants'],
                    [],
                    $validated['color_photos'] ?? [],
                    $validated['color_photo_colors'] ?? [],
                    $storedPaths,
                    $unusedPaths
                );
                $validated['variants'] = $this->attachVariantMedia(
                    $product,
                    $validated['variants'],
                    [],
                    $validated['variant_media'] ?? [],
                    $validated['variant_media_ids'] ?? [],
                    $storedPaths,
                    $unusedPaths
                );
                $product->update(['variants' => $validated['variants'] ?: null]);
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
            'data' => $this->sellerProductData($product),
        ], 201);
    }

    private function storeDraft(Request $request, $user)
    {
        $this->normalizeDraftVariantValues($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:64', Rule::unique('products', 'sku')->where(fn ($query) => $query->where('seller_id', $user->id))],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'weight_kg' => ['nullable', 'numeric', 'min:0.001', 'max:100000', 'decimal:0,3'],
            'stock' => ['nullable', 'integer', 'min:0', 'max:4294967295'],
            'store_category' => ['nullable', 'string', 'max:100', Rule::in($this->storeCategoriesFor($user))],
            'variants' => ['sometimes', 'array', 'max:20'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['nullable', 'integer', 'min:0', 'max:4294967295'],
            'variant_media' => ['sometimes', 'array', 'max:20'],
            'variant_media.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:1536'],
            'variant_media_ids' => ['sometimes', 'array', 'max:20'],
            'variant_media_ids.*' => ['required', 'uuid', 'distinct'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        $validated['category'] = $this->registeredBusinessCategory($user);
        $variants = $this->normalizeDraftVariantRows($validated['variants'] ?? []);
        $this->validateDraftVariantMediaReferences($variants, $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? []);
        $this->validateMediaTotal($validated);
        $storedPaths = [];
        try {
            $product = DB::transaction(function () use ($user, $validated, $variants, &$storedPaths) {
                $product = Product::create([
                    'seller_id' => $user->id,
                    'name' => $validated['name'] ?? null,
                    'sku' => $validated['sku'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'price' => $validated['price'] ?? null,
                    'discounted_price' => $validated['discounted_price'] ?? null,
                    'weight_kg' => $validated['weight_kg'] ?? null,
                    'variants' => $variants ?: null,
                    'stock' => $validated['stock'] ?? 0,
                    'category' => $validated['category'],
                    'store_category' => $validated['store_category'] ?? null,
                    'status' => 'inactive',
                    'review_status' => 'approved',
                    'is_draft' => true,
                ]);
                $unusedPaths = [];
                $variants = $this->attachVariantMedia($product, $variants, [], $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? [], $storedPaths, $unusedPaths);
                $product->update(['variants' => $variants ?: null]);
                $this->storeMedia($product, $validated, $storedPaths);

                return $product->load('media');
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($storedPaths);
            throw $exception;
        }

        return response()->json(['success' => true, 'message' => 'Product draft saved. Continue editing it any time from Inventory.', 'data' => $this->sellerProductData($product)], 201);
    }

    private function updateDraft(Request $request, Product $product, $user)
    {
        $this->normalizeDraftVariantValues($request);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['sometimes', 'nullable', 'string', 'max:64', Rule::unique('products', 'sku')->where(fn ($query) => $query->where('seller_id', $user->id))->ignore($product->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'discounted_price' => ['sometimes', 'nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:0.001', 'max:100000', 'decimal:0,3'],
            'stock' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:4294967295'],
            'store_category' => ['sometimes', 'nullable', 'string', 'max:100', Rule::in($this->storeCategoriesFor($user))],
            'variants' => ['sometimes', 'array', 'max:20'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['nullable', 'integer', 'min:0', 'max:4294967295'],
            'variant_media' => ['sometimes', 'array', 'max:20'],
            'variant_media.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:1536'],
            'variant_media_ids' => ['sometimes', 'array', 'max:20'],
            'variant_media_ids.*' => ['required', 'uuid', 'distinct'],
            'replace_media' => ['sometimes', 'boolean'],
            'keep_media_ids' => ['sometimes', 'array', 'max:10'],
            'keep_media_ids.*' => ['integer', 'distinct'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        $variants = array_key_exists('variants', $validated) ? $this->normalizeDraftVariantRows($validated['variants']) : ($product->variants ?? []);
        $this->validateDraftVariantMediaReferences($variants, $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? []);
        $this->validateMediaTotal($validated);
        $storedPaths = [];
        $mediaPathsToDelete = [];
        try {
            DB::transaction(function () use ($request, $product, $user, $validated, &$variants, &$storedPaths, &$mediaPathsToDelete) {
                $fields = collect($validated)->only(['name', 'sku', 'description', 'price', 'discounted_price', 'weight_kg', 'stock', 'store_category'])->all();
                $fields['category'] = $this->registeredBusinessCategory($user);
                if (array_key_exists('variants', $validated)) {
                    $oldVariants = $product->variants ?? [];
                    $variantPathsToDelete = [];
                    $variants = $this->attachVariantMedia($product, $variants, $oldVariants, $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? [], $storedPaths, $variantPathsToDelete);
                    $mediaPathsToDelete = array_merge($mediaPathsToDelete, $variantPathsToDelete);
                    $fields['variants'] = $variants ?: null;
                }
                $fields['status'] = 'inactive';
                $fields['is_draft'] = true;
                $fields['review_status'] = 'approved';
                $fields['review_reason'] = null;
                $fields['reviewed_by'] = null;
                $fields['reviewed_at'] = null;
                $product->update($fields);

                if ($request->boolean('replace_media')) {
                    $keepIds = array_map('intval', $validated['keep_media_ids'] ?? []);
                    $existing = $product->media()->get();
                    if (collect($keepIds)->diff($existing->pluck('id'))->isNotEmpty()) {
                        throw ValidationException::withMessages(['keep_media_ids' => ['One or more selected media files do not belong to this product.']]);
                    }
                    $retained = $existing->filter(fn (ProductMedia $media) => in_array((int) $media->id, $keepIds, true));
                    $this->validateMediaCounts($retained, $validated);
                    $removed = $existing->reject(fn (ProductMedia $media) => in_array((int) $media->id, $keepIds, true));
                    $mediaPathsToDelete = array_merge($mediaPathsToDelete, $removed->pluck('path')->all());
                    ProductMedia::whereIn('id', $removed->pluck('id'))->delete();
                } else {
                    $this->validateMediaCounts($product->media()->get(), $validated);
                }
                $this->storeMedia($product, $validated, $storedPaths);
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($storedPaths);
            throw $exception;
        }
        Storage::disk('public')->delete($mediaPathsToDelete);

        return response()->json(['success' => true, 'message' => 'Product draft saved.', 'data' => $this->sellerProductData($product->fresh()->load('media'))]);
    }

    private function normalizeDraftVariantValues(Request $request): void
    {
        $this->normalizeVariantsInput($request);
        $variants = $request->input('variants');
        if (!is_array($variants)) return;
        foreach ($variants as &$variant) {
            foreach (['price', 'discounted_price', 'stock'] as $field) {
                if (($variant[$field] ?? null) === '') $variant[$field] = null;
            }
        }
        $request->merge(['variants' => $variants]);
    }

    private function normalizeDraftVariantRows(array $variants): array
    {
        return array_map(function (array $variant): array {
            $price = $variant['price'] ?? null;
            $discountedPrice = $variant['discounted_price'] ?? null;
            if ($price !== null && $discountedPrice !== null) $this->validateDiscountedPrice((string) $discountedPrice, (string) $price);
            return [
                'id' => $variant['id'] ?? (string) Str::uuid(),
                'color' => filled($variant['color'] ?? null) ? trim((string) $variant['color']) : null,
                'size' => filled($variant['size'] ?? null) ? trim((string) $variant['size']) : null,
                'price' => $price === null ? null : (string) $price,
                'discounted_price' => $discountedPrice === null ? null : (string) $discountedPrice,
                'stock' => ($variant['stock'] ?? null) === null ? null : (int) $variant['stock'],
            ];
        }, $variants);
    }

    private function validateDraftVariantMediaReferences(array $variants, array $uploads, array $uploadIds): void
    {
        $variantIds = collect($variants)->pluck('id')->map(fn ($id) => (string) $id)->all();
        if (count($uploads) !== count($uploadIds)) {
            throw ValidationException::withMessages(['variant_media' => ['Choose a variant for each uploaded variant file.']]);
        }
        foreach ($uploadIds as $index => $id) {
            if (!in_array((string) $id, $variantIds, true)) {
                throw ValidationException::withMessages(["variant_media_ids.{$index}" => ['Choose a variant included in this product.']]);
            }
        }
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

        $product = Product::with('media')->withCount(['orderItems', 'reviews'])->where('seller_id', $user->id)
            ->find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->sellerProductData($product),
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

        if ($request->boolean('is_draft')) {
            return $this->updateDraft($request, $product, $user);
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
            'weight_kg' => ['sometimes', 'required', 'numeric', 'min:0.001', 'max:100000', 'decimal:0,3'],
            'stock' => ['sometimes', 'required', 'integer', 'min:0', 'max:4294967295'],
            'store_category' => ['sometimes', 'nullable', 'string', 'max:100', Rule::in($this->storeCategoriesFor($user))],
            'is_draft' => ['sometimes', 'boolean'],
            'status' => [
                'sometimes',
                'required',
                'in:active,inactive,out_of_stock',
            ],
            'variants' => ['sometimes', 'array', 'max:20'],
            'variants.*.id' => ['nullable', 'uuid', 'distinct'],
            'variants.*.color' => ['nullable', 'string', 'max:50'],
            'variants.*.size' => ['nullable', 'string', 'max:50'],
            'variants.*.price' => ['required_with:variants', 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.discounted_price' => ['nullable', 'numeric', 'min:0.01', 'max:9999999999.99', 'decimal:0,2'],
            'variants.*.stock' => ['required_with:variants', 'integer', 'min:0', 'max:4294967295'],
            'variant_media' => ['sometimes', 'array', 'max:20'],
            'variant_media.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:1536'],
            'variant_media_ids' => ['sometimes', 'array', 'max:20'],
            'variant_media_ids.*' => ['required', 'uuid', 'distinct'],
            'color_photos' => ['sometimes', 'array', 'max:8'],
            'color_photos.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'color_photo_colors' => ['sometimes', 'array', 'max:8'],
            'color_photo_colors.*' => ['required', 'string', 'max:50'],
            'replace_media' => ['sometimes', 'boolean'],
            'keep_media_ids' => ['sometimes', 'array', 'max:10'],
            'keep_media_ids.*' => ['integer', 'distinct'],
            'images' => ['sometimes', 'array', 'max:8'],
            'images.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:1536'],
            'videos' => ['sometimes', 'array', 'max:2'],
            'videos.*' => ['file', 'mimes:mp4,webm', 'max:1536'],
        ]);
        $validated['category'] = $this->registeredBusinessCategory($user);
        if (array_key_exists('variants', $validated)) {
            $validated['variants'] = $this->normalizeVariantRows($validated['variants']);
            $this->validateVariantMediaInputs($validated['variants'], $validated['variant_media'] ?? [], $validated['variant_media_ids'] ?? [], $product->variants ?? [], $validated['color_photos'] ?? [], $validated['color_photo_colors'] ?? []);
            if ($validated['variants']) {
                $validated['price'] = $this->lowestVariantPrice($validated['variants']);
                $validated['discounted_price'] = null;
                $validated['stock'] = array_sum(array_column($validated['variants'], 'stock'));
            } else {
                $validated['variants'] = null;
            }
        }
        if (!array_key_exists('variants', $validated) && (!empty($validated['variant_media']) || !empty($validated['variant_media_ids']) || !empty($validated['color_photos']) || !empty($validated['color_photo_colors']))) {
            throw ValidationException::withMessages(['variant_media' => ['Variant media can only be uploaded with variant rows.']]);
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
            DB::transaction(function () use ($request, $product, &$validated, &$mediaPathsToDelete, &$storedPaths) {
                $oldVariants = $product->variants ?? [];
                $variantPathsToDelete = [];
                if (array_key_exists('variants', $validated)) {
                    $this->validateColorPhotoInputs(
                        $validated['variants'] ?? [],
                        $validated['color_photos'] ?? [],
                        $validated['color_photo_colors'] ?? [],
                        $oldVariants
                    );
                    $validated['variants'] = $validated['variants'] === null
                        ? null
                        : $this->attachVariantPhotos(
                            $product,
                            $validated['variants'],
                            $oldVariants,
                            $validated['color_photos'] ?? [],
                            $validated['color_photo_colors'] ?? [],
                            $storedPaths,
                            $variantPathsToDelete
                        );
                    if ($validated['variants'] === null) {
                        $variantPathsToDelete = collect($oldVariants)
                            ->flatMap(fn (array $variant) => [$variant['media_path'] ?? null, $variant['image'] ?? null])
                            ->filter()
                            ->unique()
                            ->values()
                            ->all();
                    } else {
                        $legacyVariantPaths = $variantPathsToDelete;
                        $validated['variants'] = $this->attachVariantMedia(
                            $product,
                            $validated['variants'],
                            $oldVariants,
                            $validated['variant_media'] ?? [],
                            $validated['variant_media_ids'] ?? [],
                            $storedPaths,
                            $variantPathsToDelete
                        );
                        $variantPathsToDelete = array_values(array_unique(array_merge($legacyVariantPaths, $variantPathsToDelete)));
                    }
                    $mediaPathsToDelete = array_merge($mediaPathsToDelete, $variantPathsToDelete);
                } elseif (!empty($validated['color_photos']) || !empty($validated['color_photo_colors']) || !empty($validated['variant_media']) || !empty($validated['variant_media_ids'])) {
                    throw ValidationException::withMessages([
                        'variant_media' => ['Variant media can only be uploaded with product variants.'],
                    ]);
                }
                $product->update(collect($validated)->except([
                    'images',
                    'videos',
                    'color_photos',
                    'color_photo_colors',
                    'variant_media',
                    'variant_media_ids',
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
                $listingChanged = collect(['name', 'description', 'category'])->contains(fn (string $field): bool => array_key_exists($field, $validated))
                    || (($validated['is_draft'] ?? false) === false && $product->is_draft)
                    || $request->boolean('replace_media')
                    || !empty($validated['images'])
                    || !empty($validated['videos'])
                    || !empty($validated['variant_media']);
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
            'data' => $this->sellerProductData($product->fresh()->load('media')),
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

        $mediaPaths = array_merge(
            $product->media()->pluck('path')->all(),
            collect($product->variants ?? [])->flatMap(fn (array $variant) => [$variant['media_path'] ?? null, $variant['image'] ?? null])->filter()->unique()->values()->all()
        );
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
        $data['seller'] = [...($data['seller'] ?? []), 'is_on_vacation' => (bool) data_get($product->seller?->sellerProfile?->storefront_settings, 'on_vacation', false)];
        unset($data['seller']['seller_profile']['storefront_settings']);
        $data['variants'] = $this->variantsWithImageUrls($product->variants ?? []);
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

    private function sellerProductData(Product $product): array
    {
        $data = $product->toArray();
        $data['variants'] = $this->variantsWithImageUrls($product->variants ?? []);
        $data['archive_expires_at'] = $product->status === 'archived' && $product->archived_at
            ? $product->archived_at->copy()->addDays(ArchivedProductPurger::RETENTION_DAYS)->toIso8601String()
            : null;
        $data['archive_retained_for_history'] = (int) ($data['order_items_count'] ?? 0) > 0 || (int) ($data['reviews_count'] ?? 0) > 0;

        return $data;
    }

    private function storeCategoriesFor($user): array
    {
        $categories = data_get($user->sellerProfile?->storefront_settings, 'store_categories', []);

        return is_array($categories) ? $categories : [];
    }

    private function registeredBusinessCategory($user): string
    {
        $category = $user->sellerProfile?->line_of_business;
        abort_unless(is_string($category) && in_array($category, self::CATEGORIES, true), 422, 'Your registered business line is missing or invalid. Contact support to update your seller profile.');

        return $category;
    }

    /**
     * @param array<int, array<string, mixed>> $variants
     * @return array<int, array<string, mixed>>
     */
    private function variantsWithImageUrls(array $variants): array
    {
        return array_map(function (array $variant): array {
            $imagePath = $variant['image'] ?? null;
            $mediaPath = $variant['media_path'] ?? $imagePath;
            $mediaType = $variant['media_type'] ?? ($mediaPath ? 'image' : null);
            unset($variant['image'], $variant['media_path']);
            $variant['color_image_url'] = $imagePath ? PublicStorageUrl::url($imagePath) : null;
            $variant['media_type'] = $mediaType;
            $variant['media_url'] = $mediaPath ? PublicStorageUrl::url($mediaPath) : null;

            return $variant;
        }, $variants);
    }

    /**
     * @param array<int, array<string, mixed>> $variants
     * @param array<int, UploadedFile> $uploads
     * @param array<int, string> $uploadColors
     * @param array<int, array<string, mixed>> $existingVariants
     */
    /**
     * Ensure every variant retains or receives its own image or video.
     * Legacy color-photo uploads remain accepted and cover matching color variants.
     */
    private function validateVariantMediaInputs(
        array $variants,
        array $uploads,
        array $uploadIds,
        array $existingVariants,
        array $colorPhotos,
        array $colorPhotoColors
    ): void {
        if (count($uploads) !== count($uploadIds)) {
            throw ValidationException::withMessages([
                'variant_media' => ['Choose one photo or video for each uploaded variant file.'],
            ]);
        }

        $variantIds = collect($variants)->pluck('id')->map(fn ($id) => (string) $id)->all();
        $newMediaIds = [];
        foreach ($uploadIds as $index => $id) {
            $id = (string) $id;
            if (!in_array($id, $variantIds, true) || isset($newMediaIds[$id])) {
                throw ValidationException::withMessages([
                    "variant_media_ids.{$index}" => ['Choose a unique variant included in this product.'],
                ]);
            }
            $newMediaIds[$id] = true;
        }

        $existingById = [];
        $existingColors = [];
        foreach ($existingVariants as $variant) {
            $path = $variant['media_path'] ?? $variant['image'] ?? null;
            if ($path) {
                $existingById[(string) ($variant['id'] ?? '')] = true;
                if (filled($variant['image'] ?? null)) {
                    $existingColors[$this->colorKey($variant['color'] ?? null)] = true;
                }
            }
        }
        $newColors = [];
        foreach ($colorPhotoColors as $color) {
            $newColors[$this->colorKey($color)] = true;
        }

        foreach ($variants as $index => $variant) {
            $id = (string) $variant['id'];
            $color = $this->colorKey($variant['color'] ?? null);
            if (isset($newMediaIds[$id]) || isset($existingById[$id]) || ($color !== '' && (isset($newColors[$color]) || isset($existingColors[$color])))) {
                continue;
            }
            throw ValidationException::withMessages([
                "variant_media.{$index}" => ['Upload one photo or video for every variant.'],
                'color_photos' => ['Upload a photo or video for every variant.'],
            ]);
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function attachVariantMedia(
        Product $product,
        array $variants,
        array $existingVariants,
        array $uploads,
        array $uploadIds,
        array &$storedPaths,
        array &$pathsToDelete
    ): array {
        $existingById = [];
        foreach ($existingVariants as $variant) {
            $path = $variant['media_path'] ?? $variant['image'] ?? null;
            if ($path) {
                $existingById[(string) ($variant['id'] ?? '')] = [
                    'path' => $path,
                    'type' => $variant['media_type'] ?? 'image',
                ];
            }
        }

        $uploadsById = [];
        foreach ($uploads as $index => $upload) {
            $uploadsById[(string) ($uploadIds[$index] ?? '')] = $upload;
        }

        $updated = [];
        foreach ($variants as $variant) {
            $id = (string) $variant['id'];
            $oldMedia = $existingById[$id] ?? null;
            $colorImage = $variant['image'] ?? null;
            if (isset($uploadsById[$id])) {
                $upload = $uploadsById[$id];
                $path = $upload->storePublicly("products/{$product->id}/variants", 'public');
                if ($path === false) {
                    throw new \RuntimeException('Unable to store variant media.');
                }
                $storedPaths[] = $path;
                $type = str_starts_with((string) $upload->getMimeType(), 'video/') ? 'video' : 'image';
            } elseif ($colorImage && (!$oldMedia || $colorImage !== $oldMedia['path'])) {
                $path = $colorImage;
                $type = 'image';
            } elseif ($oldMedia) {
                $path = $oldMedia['path'];
                $type = $oldMedia['type'];
            } else {
                $path = $colorImage;
                $type = $path ? 'image' : null;
            }

            $variant['media_path'] = $path;
            $variant['media_type'] = $type;
            $variant['image'] = $type === 'image' ? $path : null;
            $updated[] = $variant;
        }

        $retainedPaths = collect($updated)->pluck('media_path')->filter()->unique();
        $pathsToDelete = collect($existingById)->pluck('path')->unique()
            ->reject(fn (string $path) => $retainedPaths->contains($path))
            ->values()->all();

        return $updated;
    }
    private function validateColorPhotoInputs(
        array $variants,
        array $uploads,
        array $uploadColors,
        array $existingVariants
    ): void {
        if (count($uploads) !== count($uploadColors)) {
            throw ValidationException::withMessages([
                'color_photos' => ['Select one photo for each color image upload.'],
            ]);
        }

        $requiredColors = collect($variants)
            ->map(fn (array $variant) => $this->colorKey($variant['color'] ?? null))
            ->filter()
            ->unique()
            ->values();
        if ($requiredColors->count() > 20) {
            throw ValidationException::withMessages([
                'variants' => ['A product can have up to 20 variants.'],
            ]);
        }

        $uploadedColors = [];
        foreach ($uploadColors as $index => $color) {
            $key = $this->colorKey($color);
            if ($key === '' || !$requiredColors->contains($key) || isset($uploadedColors[$key])) {
                throw ValidationException::withMessages([
                    "color_photo_colors.{$index}" => ['Choose a unique color used by this product.'],
                ]);
            }
            $uploadedColors[$key] = true;
        }

    }

    /**
     * @param array<int, array<string, mixed>> $variants
     * @param array<int, array<string, mixed>> $existingVariants
     * @param array<int, UploadedFile> $uploads
     * @param array<int, string> $uploadColors
     * @param array<int, string> $storedPaths
     * @param array<int, string> $pathsToDelete
     * @return array<int, array<string, mixed>>
     */
    private function attachVariantPhotos(
        Product $product,
        array $variants,
        array $existingVariants,
        array $uploads,
        array $uploadColors,
        array &$storedPaths,
        array &$pathsToDelete
    ): array {
        $oldImages = [];
        foreach ($existingVariants as $variant) {
            $key = $this->colorKey($variant['color'] ?? null);
            if ($key !== '' && filled($variant['image'] ?? null)) {
                $oldImages[$key] = $variant['image'];
            }
        }

        $newImages = [];
        foreach ($uploads as $index => $upload) {
            $key = $this->colorKey($uploadColors[$index] ?? null);
            $path = $upload->storePublicly("products/{$product->id}/variants", 'public');
            if ($path === false) {
                throw new \RuntimeException('Unable to store a product color photo.');
            }
            $storedPaths[] = $path;
            $newImages[$key] = $path;
        }

        $imagesByColor = [];
        foreach ($variants as $variant) {
            $key = $this->colorKey($variant['color'] ?? null);
            if ($key === '' || isset($imagesByColor[$key])) {
                continue;
            }
            $imagesByColor[$key] = $newImages[$key] ?? $oldImages[$key] ?? null;
        }

        $updatedVariants = array_map(function (array $variant) use ($imagesByColor): array {
            $key = $this->colorKey($variant['color'] ?? null);
            $variant['image'] = $key === '' ? null : ($imagesByColor[$key] ?? null);

            return $variant;
        }, $variants);
        $retainedPaths = collect($updatedVariants)->pluck('image')->filter()->unique();
        $pathsToDelete = collect($oldImages)->unique()->reject(fn (string $path) => $retainedPaths->contains($path))->values()->all();

        return $updatedVariants;
    }

    private function colorKey(?string $color): string
    {
        return mb_strtolower(trim((string) $color));
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
            ->merge($validated['color_photos'] ?? [])
            ->merge($validated['variant_media'] ?? [])
            ->sum(fn (UploadedFile $file) => $file->getSize() ?? 0);

        if ($totalBytes > 6 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'images' => ['The combined size of uploaded product and variant photos/videos must not exceed 6 MB per save.'],
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
            'archived_at' => now(),
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
            'archived_at' => null,
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
