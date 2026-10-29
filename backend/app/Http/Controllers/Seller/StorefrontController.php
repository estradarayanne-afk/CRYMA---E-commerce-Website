<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SellerProfile;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StorefrontController extends Controller
{
    public function show(Request $request)
    {
        $profile = $request->user()->sellerProfile;
        abort_unless($profile, 404, 'Seller profile not found.');
        $this->ensureSlug($profile);

        return response()->json(['success' => true, 'data' => [...$this->storeData($profile->fresh()), 'name_change_request' => [
            'requested_name' => $profile->requested_business_name,
            'status' => $profile->business_name_request_status,
            'requested_at' => $profile->business_name_requested_at,
            'reviewed_at' => $profile->business_name_reviewed_at,
            'reason' => $profile->business_name_request_reason,
        ]]]);
    }

    public function update(Request $request)
    {
        $profile = $request->user()->sellerProfile;
        abort_unless($profile, 404, 'Seller profile not found.');
        $this->ensureSlug($profile);

        $validated = $request->validate([
            'store_tagline' => ['nullable', 'string', 'max:100'],
            'store_description' => ['nullable', 'string', 'max:1000'],
            'store_accent_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'store_logo_url' => ['nullable', 'url', 'max:2048'],
            'store_banner_url' => ['nullable', 'url', 'max:2048'],
            'storefront_settings' => ['sometimes', 'array'],
            'storefront_settings.hero_title' => ['nullable', 'string', 'max:100'],
            'storefront_settings.hero_subtitle' => ['nullable', 'string', 'max:200'],
            'storefront_settings.categories' => ['present', 'array', 'max:20'],
            'storefront_settings.categories.*' => ['string', 'max:100', 'distinct'],
            'storefront_settings.featured_product_ids' => ['present', 'array', 'max:12'],
            'storefront_settings.featured_product_ids.*' => ['integer', 'distinct', Rule::exists('products', 'id')->where('seller_id', $request->user()->id)],
            'storefront_settings.show_featured' => ['required_with:storefront_settings', 'boolean'],
            'storefront_settings.show_categories' => ['required_with:storefront_settings', 'boolean'],
        ]);

        $profile->fill($validated)->save();

        return response()->json([
            'success' => true,
            'message' => 'Storefront saved.',
            'data' => $this->storeData($profile->fresh()),
        ]);
    }

    public function requestNameChange(Request $request)
    {
        $profile = $request->user()->sellerProfile;
        abort_unless($profile, 404, 'Seller profile not found.');

        $values = $request->validate([
            'requested_name' => ['required', 'string', 'min:2', 'max:100', 'not_regex:/^\s*$/'],
        ]);
        $requestedName = trim($values['requested_name']);

        if (mb_strtolower($requestedName) === mb_strtolower(trim($profile->business_name))) {
            throw ValidationException::withMessages(['requested_name' => ['Enter a name different from your current store name.']]);
        }
        if ($profile->business_name_request_status === 'pending') {
            throw ValidationException::withMessages(['requested_name' => ['You already have a store name request waiting for admin review.']]);
        }

        $taken = SellerProfile::query()
            ->where('user_id', '!=', $request->user()->id)
            ->whereRaw('LOWER(TRIM(business_name)) = ?', [mb_strtolower($requestedName)])
            ->exists();
        if ($taken) {
            throw ValidationException::withMessages(['requested_name' => ['That store name is already taken. Choose another name.']]);
        }

        $profile->forceFill([
            'requested_business_name' => $requestedName,
            'business_name_request_status' => 'pending',
            'business_name_requested_at' => now(),
            'business_name_reviewed_at' => null,
            'business_name_reviewed_by' => null,
            'business_name_request_reason' => null,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Store name change request sent to admin.',
            'data' => ['requested_name' => $profile->requested_business_name, 'status' => $profile->business_name_request_status],
        ], 201);
    }
    public function publicShow(string $slug)
    {
        $profile = SellerProfile::query()
            ->with('user:id,first_name,last_name,status,role')
            ->where('store_slug', $slug)
            ->whereHas('user', fn ($query) => $query->where('role', 'seller')->where('status', 'active'))
            ->firstOrFail();

        $products = Product::query()
            ->with(['media', 'seller.sellerProfile'])
            ->where('seller_id', $profile->user_id)
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->latest()
            ->get()
            ->map(fn (Product $product) => $this->publicProductData($product));

        return response()->json([
            'success' => true,
            'data' => ['store' => $this->storeData($profile), 'products' => $products],
        ]);
    }

    private function ensureSlug(SellerProfile $profile): void
    {
        if ($profile->store_slug) {
            return;
        }

        $base = Str::slug($profile->business_name) ?: 'store';
        $profile->store_slug = $base.'-'.$profile->user_id;
        $profile->save();
    }

    private function storeData(SellerProfile $profile): array
    {
        return [
            'name' => $profile->business_name,
            'slug' => $profile->store_slug,
            'tagline' => $profile->store_tagline,
            'description' => $profile->store_description,
            'accent_color' => $profile->store_accent_color ?: '#7E1830',
            'logo_url' => $profile->store_logo_url,
            'banner_url' => $profile->store_banner_url,
            'settings' => $profile->storefront_settings,
        ];
    }

    private function publicProductData(Product $product): array
    {
        $data = $product->toArray();
        $images = $product->media->where('type', 'image')->values();
        $data['images'] = $images->map(fn ($media) => $media->url)->all();
        $data['image'] = $images->first()?->url;
        if ($product->discounted_price !== null) {
            $data['original_price'] = $product->price;
            $data['price'] = $product->discounted_price;
        }
        $data['seller'] = [
            'id' => $product->seller_id,
            'seller_profile' => ['business_name' => $product->seller?->sellerProfile?->business_name],
        ];

        return $data;
    }
}
