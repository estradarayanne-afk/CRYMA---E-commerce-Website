<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VoucherController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:64'],
            'type' => ['sometimes', 'nullable', Rule::in(['all', 'fixed', 'percentage'])],
            'status' => ['sometimes', 'nullable', Rule::in(['all', 'active', 'inactive', 'upcoming', 'expired', 'exhausted'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Voucher::query()
            ->withCount('redemptions')
            ->withSum('redemptions', 'discount_amount');

        if (filled($validated['search'] ?? null)) {
            $search = trim($validated['search']);
            $query->where(function (Builder $query) use ($search) {
                $query->where('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (($validated['type'] ?? 'all') !== 'all') {
            $query->where('discount_type', $validated['type']);
        }

        $now = now();
        match ($validated['status'] ?? 'all') {
            'active' => $query->where('is_active', true)
                ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
                ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', $now))
                ->where(fn (Builder $query) => $query->whereNull('usage_limit')->orWhereRaw('(select count(*) from voucher_redemptions where voucher_redemptions.voucher_id = vouchers.id) < vouchers.usage_limit')),
            'inactive' => $query->where('is_active', false),
            'upcoming' => $query->where('is_active', true)
                ->where('starts_at', '>', $now)
                ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', $now)),
            'expired' => $query->where('is_active', true)
                ->whereNotNull('expires_at')
                ->where('expires_at', '<', $now),
            'exhausted' => $query->where('is_active', true)
                ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
                ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', $now))
                ->whereNotNull('usage_limit')
                ->whereRaw('(select count(*) from voucher_redemptions where voucher_redemptions.voucher_id = vouchers.id) >= vouchers.usage_limit'),
            default => null,
        };

        $vouchers = $query->orderByDesc('created_at')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $vouchers,
            'meta' => [
                'categories' => Product::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->values(),
            ],
        ]);
    }

    public function show(int $id)
    {
        $voucher = Voucher::query()
            ->withCount('redemptions')
            ->withSum('redemptions', 'discount_amount')
            ->findOrFail($id);

        $redemptions = $voucher->redemptions()
            ->select(['id', 'voucher_id', 'order_id', 'discount_amount', 'created_at'])
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => [
                'voucher' => $voucher,
                'redemptions' => $redemptions,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatedVoucher($request);
        $voucher = Voucher::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Voucher created successfully.',
            'data' => $voucher->loadCount('redemptions'),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $voucher = Voucher::findOrFail($id);
        $validated = $this->validatedVoucher($request, $voucher);

        DB::transaction(function () use ($voucher, $validated) {
            $redemptions = $voucher->redemptions()->lockForUpdate();
            $redeemedCount = (clone $redemptions)->count();
            $maxBuyerRedemptions = (clone $redemptions)
                ->select('buyer_id')
                ->selectRaw('count(*) as redemption_count')
                ->groupBy('buyer_id')
                ->orderByDesc('redemption_count')
                ->value('redemption_count') ?? 0;

            if ($validated['usage_limit'] !== null && $validated['usage_limit'] < $redeemedCount) {
                throw ValidationException::withMessages([
                    'usage_limit' => ['Usage limits cannot be lower than the number of redemptions already recorded.'],
                ]);
            }
            if ($validated['per_buyer_limit'] < $maxBuyerRedemptions) {
                throw ValidationException::withMessages([
                    'per_buyer_limit' => ['This limit cannot be lower than the redemptions already recorded by a buyer.'],
                ]);
            }

            $voucher->update($validated);
        });

        return response()->json([
            'success' => true,
            'message' => 'Voucher updated successfully.',
            'data' => $voucher->fresh()->loadCount('redemptions'),
        ]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $voucher = Voucher::findOrFail($id);
        $voucher->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $voucher->is_active ? 'Voucher enabled successfully.' : 'Voucher disabled successfully.',
            'data' => $voucher->loadCount('redemptions'),
        ]);
    }

    private function validatedVoucher(Request $request, ?Voucher $voucher = null): array
    {
        $requestData = $request->all();
        $requestData['code'] = mb_strtoupper(trim((string) ($requestData['code'] ?? '')));
        $isPercentage = ($requestData['discount_type'] ?? null) === 'percentage';
        $supportedCategories = Product::query()
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->merge($voucher?->categories ?? [])
            ->map(fn ($category) => trim((string) $category))
            ->filter()
            ->unique()
            ->values()
            ->all();
        $validator = Validator::make($requestData, [
            'code' => [
                'required',
                'string',
                'max:64',
                'regex:/\A[A-Z0-9_-]+\z/',
                function (string $attribute, mixed $value, \Closure $fail) use ($voucher) {
                    $existing = Voucher::query()
                        ->whereRaw('UPPER(code) = ?', [$value]);
                    if ($voucher) {
                        $existing->where('id', '!=', $voucher->id);
                    }
                    if ($existing->exists()) {
                        $fail('This voucher code is already in use.');
                    }
                },
            ],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'discount_type' => ['required', Rule::in(['fixed', 'percentage'])],
            'discount_value' => ['required', 'numeric', 'decimal:0,2', 'gt:0', $isPercentage ? 'max:100' : 'max:9999999999.99'],
            'minimum_spend' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
            'maximum_discount' => ['sometimes', 'nullable', 'numeric', 'decimal:0,2', 'gt:0', 'max:9999999999.99'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'usage_limit' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:2147483647'],
            'per_buyer_limit' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'product_ids' => ['sometimes', 'nullable', 'array', 'max:100'],
            'product_ids.*' => ['integer', 'distinct', 'exists:products,id'],
            'categories' => ['sometimes', 'nullable', 'array', 'max:100'],
            'categories.*' => ['string', 'max:100', 'distinct', Rule::in($supportedCategories)],
            'is_active' => ['required', 'boolean'],
        ]);

        $validator->after(function ($validator) use ($requestData) {
            if (
                ($requestData['discount_type'] ?? null) === 'fixed'
                && filled($requestData['maximum_discount'] ?? null)
            ) {
                $validator->errors()->add(
                    'maximum_discount',
                    'Maximum discount caps are only supported for percentage vouchers.'
                );
            }

            $startsAt = $requestData['starts_at'] ?? null;
            $expiresAt = $requestData['expires_at'] ?? null;
            if (
                filled($startsAt)
                && filled($expiresAt)
                && !$validator->errors()->has('starts_at')
                && !$validator->errors()->has('expires_at')
                && strtotime($expiresAt) < strtotime($startsAt)
            ) {
                $validator->errors()->add(
                    'expires_at',
                    'The expiration date must be on or after the start date.'
                );
            }
        });

        $validated = $validator->validate();

        $validated['description'] = trim((string) ($validated['description'] ?? '')) ?: null;
        $validated['maximum_discount'] = $validated['maximum_discount'] ?? null;
        $validated['starts_at'] = $validated['starts_at'] ?? null;
        $validated['expires_at'] = $validated['expires_at'] ?? null;
        $validated['usage_limit'] = $validated['usage_limit'] ?? null;
        $validated['product_ids'] = array_values(array_unique($validated['product_ids'] ?? []));
        $validated['categories'] = array_values(array_unique(array_filter(
            array_map(fn ($category) => trim($category), $validated['categories'] ?? []),
            fn ($category) => $category !== ''
        )));

        return $validated;
    }
}
