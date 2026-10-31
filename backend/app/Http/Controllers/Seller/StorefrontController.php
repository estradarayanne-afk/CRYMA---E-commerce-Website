<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SellerProfile;
use App\Support\PublicStorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        return response()->json(['success' => true, 'data' => $this->storeData($profile->fresh())]);
    }

    public function update(Request $request)
    {
        $profile = $request->user()->sellerProfile;
        abort_unless($profile, 404, 'Seller profile not found.');
        $this->ensureSlug($profile);

        if (is_string($request->input('storefront_settings'))) {
            $decodedSettings = json_decode($request->input('storefront_settings'), true);
            if (is_array($decodedSettings)) {
                $request->merge(['storefront_settings' => $decodedSettings]);
            }
        }

        $validated = $request->validate([
            'store_tagline' => ['nullable', 'string', 'max:100'],
            'store_description' => ['nullable', 'string', 'max:1000'],
            'store_accent_color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'store_logo_url' => ['nullable', 'url', 'max:2048'],
            'store_banner_url' => ['nullable', 'url', 'max:2048'],
            'store_logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'store_banner' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'storefront_settings' => ['sometimes', 'array'],
            'storefront_settings.hero_title' => ['nullable', 'string', 'max:100'],
            'storefront_settings.hero_subtitle' => ['nullable', 'string', 'max:200'],
            'storefront_settings.on_vacation' => ['sometimes', 'boolean'],
            'storefront_settings.categories' => ['present', 'array', 'max:20'],
            'storefront_settings.categories.*' => ['string', 'max:100', 'distinct'],
            'storefront_settings.store_categories' => ['present', 'array', 'max:20'],
            'storefront_settings.store_categories.*' => ['string', 'min:1', 'max:100', 'distinct'],
            'storefront_settings.featured_product_ids' => ['present', 'array', 'max:12'],
            'storefront_settings.featured_product_ids.*' => ['integer', 'distinct', Rule::exists('products', 'id')->where('seller_id', $request->user()->id)],
            'storefront_settings.show_featured' => ['required_with:storefront_settings', 'boolean'],
            'storefront_settings.show_categories' => ['required_with:storefront_settings', 'boolean'],
        ]);

        foreach (['store_logo' => 'store_logo_url', 'store_banner' => 'store_banner_url'] as $fileField => $urlField) {
            if ($request->hasFile($fileField)) {
                $path = $request->file($fileField)->storePublicly('storefronts/' . $request->user()->id, 'public');
                $validated[$urlField] = PublicStorageUrl::url($path);
            }
            unset($validated[$fileField]);
        }

        $profile->fill($validated)->save();

        return response()->json([
            'success' => true,
            'message' => 'Storefront saved.',
            'data' => $this->storeData($profile->fresh()),
        ]);
    }

    public function updateVacationMode(Request $request)
    {
        $validated = $request->validate([
            'on_vacation' => ['required', 'boolean'],
        ]);

        $profile = DB::transaction(function () use ($request, $validated) {
            $profile = SellerProfile::query()
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();
            abort_unless($profile, 404, 'Seller profile not found.');

            $settings = $profile->storefront_settings ?? [];
            $settings['on_vacation'] = (bool) $validated['on_vacation'];
            $profile->forceFill(['storefront_settings' => $settings])->save();

            return $profile->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => $profile->storefront_settings['on_vacation']
                ? 'Vacation mode is on. Buyers can browse and favorite products, but cannot order.'
                : 'Vacation mode is off. Buyers can place orders again.',
            'data' => $this->storeData($profile),
        ]);
    }

    public function updateName(Request $request)
    {
        $values = $request->validate([
            'business_name' => ['required', 'string', 'min:2', 'max:100', 'not_regex:/^\s*$/'],
        ]);
        $newName = preg_replace('/\s+/u', ' ', trim($values['business_name']));
        $profile = DB::transaction(function () use ($request, $newName) {
            $profile = SellerProfile::query()->where('user_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($profile, 404, 'Seller profile not found.');
            if (mb_strtolower($newName) === mb_strtolower(trim($profile->business_name))) {
                throw ValidationException::withMessages(['business_name' => ['Enter a name different from your current store name.']]);
            }
            $taken = SellerProfile::query()
                ->where('user_id', '!=', $request->user()->id)
                ->whereRaw('LOWER(TRIM(business_name)) = ?', [mb_strtolower($newName)])
                ->exists();
            if ($taken) {
                throw ValidationException::withMessages(['business_name' => ['That store name is already taken. Choose another name.']]);
            }
            $profile->forceFill([
                'business_name' => $newName,
                'requested_business_name' => null,
                'business_name_request_status' => null,
                'business_name_requested_at' => null,
                'business_name_reviewed_at' => null,
                'business_name_reviewed_by' => null,
                'business_name_request_reason' => null,
            ])->save();
            return $profile->fresh();
        });

        return response()->json(['success' => true, 'message' => 'Store name updated.', 'data' => $this->storeData($profile)]);
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
            'seller_id' => $profile->user_id,
            'name' => $profile->business_name,
            'registered_category' => $profile->line_of_business,
            'slug' => $profile->store_slug,
            'tagline' => $profile->store_tagline,
            'description' => $profile->store_description,
            'accent_color' => $profile->store_accent_color ?: '#7E1830',
            'logo_url' => $profile->store_logo_url,
            'banner_url' => $profile->store_banner_url,
            'settings' => $profile->storefront_settings,
            'on_vacation' => (bool) data_get($profile->storefront_settings, 'on_vacation', false),
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
            'is_on_vacation' => (bool) data_get($product->seller?->sellerProfile?->storefront_settings, 'on_vacation', false),
        ];

        return $data;
    }
}
