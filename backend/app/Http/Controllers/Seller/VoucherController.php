<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class VoucherController extends Controller
{
    public function index(Request $request)
    {
        $sellerId = $request->user()->id;
        $vouchers = Voucher::query()
            ->where('seller_id', $sellerId)
            ->withCount('redemptions')
            ->withSum('redemptions', 'discount_amount')
            ->latest()
            ->get();
        $eligibleProductNames = $this->eligibleProducts($sellerId)
            ->whereIn('id', $vouchers->flatMap(fn (Voucher $voucher) => $voucher->product_ids ?? [])->unique())
            ->pluck('name', 'id');
        $vouchers->each(function (Voucher $voucher) use ($eligibleProductNames) {
            $voucher->setAttribute('eligible_product_names', collect($voucher->product_ids ?? [])
                ->map(fn ($id) => $eligibleProductNames->get($id))
                ->filter()
                ->values());
        });
        $products = $this->eligibleProducts($sellerId)
            ->get(['id', 'name', 'category']);

        return response()->json([
            'success' => true,
            'data' => [
                'vouchers' => $vouchers,
                'products' => $products,
                'categories' => $products->pluck('category')->filter()->unique()->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $sellerId = $request->user()->id;
        $request->merge(['code' => mb_strtoupper(trim((string) $request->input('code', '')))]);
        $categories = $this->eligibleProducts($sellerId)
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->map(fn ($category) => trim((string) $category))
            ->filter()
            ->unique()
            ->values()
            ->all();

        $validator = Validator::make($request->all(), [
            'code' => [
                'required', 'string', 'max:64', 'regex:/\A[A-Z0-9_-]+\z/',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (Voucher::query()->whereRaw('UPPER(code) = ?', [$value])->exists()) {
                        $fail('This voucher code is already in use. Choose another code.');
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'discount_type' => ['required', Rule::in(['fixed', 'percentage'])],
            'discount_value' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
            'minimum_spend' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'maximum_discount' => ['nullable', 'numeric', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'usage_limit' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
            'per_buyer_limit' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'product_ids' => ['nullable', 'array', 'max:100'],
            'product_ids.*' => [
                'integer', 'distinct',
                Rule::exists('products', 'id')->where(fn ($query) => $query
                    ->where('seller_id', $sellerId)
                    ->where('status', 'active')
                    ->where('review_status', 'approved')
                    ->whereNull('archived_at')
                    ->where('is_draft', false)),
            ],
            'categories' => ['nullable', 'array', 'max:100'],
            'categories.*' => ['string', 'max:100', 'distinct', Rule::in($categories)],
            'is_active' => ['required', 'boolean'],
        ]);

        $validator->after(function ($validator) use ($request) {
            if (
                $request->input('discount_type') === 'percentage'
                && (float) $request->input('discount_value', 0) > 100
            ) {
                $validator->errors()->add('discount_value', 'Percentage discounts cannot exceed 100%.');
            }
            if (
                $request->input('discount_type') === 'fixed'
                && filled($request->input('maximum_discount'))
            ) {
                $validator->errors()->add('maximum_discount', 'A maximum discount cap is only available for percentage vouchers.');
            }
        });

        $validated = $validator->validate();
        $validated['seller_id'] = $sellerId;
        $validated['description'] = trim((string) ($validated['description'] ?? '')) ?: null;
        $validated['maximum_discount'] = $validated['maximum_discount'] ?? null;
        $validated['starts_at'] = $validated['starts_at'] ?? null;
        $validated['expires_at'] = $validated['expires_at'] ?? null;
        $validated['usage_limit'] = $validated['usage_limit'] ?? null;
        $validated['product_ids'] = array_values(array_unique($validated['product_ids'] ?? []));
        $validated['categories'] = array_values(array_unique(array_map('trim', $validated['categories'] ?? [])));

        $voucher = Voucher::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Your voucher has been created.',
            'data' => $voucher->loadCount('redemptions'),
        ], 201);
    }

    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $voucher = Voucher::query()
            ->where('seller_id', $request->user()->id)
            ->findOrFail($id);
        $voucher->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $voucher->is_active ? 'Voucher enabled.' : 'Voucher disabled.',
            'data' => $voucher->loadCount('redemptions'),
        ]);
    }

    private function eligibleProducts(int $sellerId)
    {
        return Product::query()
            ->where('seller_id', $sellerId)
            ->where('status', 'active')
            ->where('review_status', 'approved')
            ->where('is_draft', false)
            ->whereNull('archived_at');
    }
}
