<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccountEmailRelease;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AccountEmailReleaseController extends Controller
{
    private const AUTHORIZED_EMAILS = [
        'rayannesheesh@gmail.com',
        'estradarayanne@gmail.com',
    ];

    public function store(Request $request, int $id): JsonResponse
    {
        $values = $request->validate([
            'email_confirmation' => ['required', 'email', 'max:254'],
            'reason_code' => ['required', Rule::in([
                'incorrect_rejection',
                'applicant_requested',
                'duplicate_registration',
                'other_approved_reason',
            ])],
        ]);

        $result = DB::transaction(function () use ($request, $id, $values): array {
            $user = User::query()->lockForUpdate()->findOrFail($id);

            $oldEmail = (string) $user->email;
            $confirmedEmail = (string) $values['email_confirmation'];
            abort_unless(hash_equals($oldEmail, $confirmedEmail), 422, 'The confirmation email does not match this account.');
            $eligibility = $this->eligibility($user);
            abort_unless($eligibility['eligible'], $eligibility['status'], $eligibility['reason']);

            $archivedAt = now();
            $alias = 'released-'.$user->id.'-'.Str::uuid().'@accounts.invalid';
            $fingerprint = hash_hmac('sha256', $oldEmail, (string) config('app.key'));

            // No email is sent. Existing records and foreign-key relationships stay attached to this user ID.
            $user->forceFill([
                'email' => $alias,
                'status' => 'rejected',
                'account_archived_at' => $archivedAt,
                'email_verified_at' => null,
                'email_otp_hash' => null,
                'email_otp_expires_at' => null,
                'email_otp_attempts' => 0,
                'remember_token' => null,
            ])->save();
            $user->tokens()->delete();

            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('password_reset_tokens')) {
                DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [$oldEmail])->delete();
            }

            AccountEmailRelease::query()->create([
                'user_id' => $user->id,
                'released_by' => $request->user()->id,
                'original_email' => $oldEmail,
                'email_fingerprint' => $fingerprint,
                'reason_code' => $values['reason_code'],
                'released_at' => $archivedAt,
            ]);

            return ['user_id' => $user->id, 'archived_at' => $archivedAt->toISOString()];
        });

        return response()->json([
            'success' => true,
            'message' => 'Account archived. Its email address is available for a new registration.',
            'data' => $result,
        ]);
    }

    /** Return the same release decision to the Admin Users page and archive endpoint. */
    public function eligibility(User $user): array
    {
        if ($user->role === 'admin') {
            return ['eligible' => false, 'status' => 403, 'reason' => 'Admin accounts cannot be archived through this process.'];
        }
        if ($user->account_archived_at !== null) {
            return ['eligible' => false, 'status' => 409, 'reason' => 'This account has already been archived.'];
        }
        if (!in_array($user->email, self::AUTHORIZED_EMAILS, true)) {
            return ['eligible' => false, 'status' => 403, 'reason' => 'This email address is not authorized for release.'];
        }
        if (!in_array($user->status, ['pending', 'rejected'], true)) {
            return ['eligible' => false, 'status' => 409, 'reason' => 'Only pending or rejected accounts can be archived for email release.'];
        }

        $email = (string) $user->email;
        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->where('id', '!=', $user->id)->exists()) {
            return ['eligible' => false, 'status' => 409, 'reason' => 'More than one account matches this email. Resolve the duplicate records before releasing it.'];
        }

        $missingSchema = $this->missingEligibilitySchema($user);
        if ($missingSchema !== null) {
            return ['eligible' => false, 'status' => 409, 'reason' => 'Account activity cannot be checked because required business records are unavailable.'];
        }

        try {
            $this->assertNoOpenOperations($user);
        } catch (HttpException $exception) {
            return ['eligible' => false, 'status' => 409, 'reason' => $exception->getMessage()];
        }

        return ['eligible' => true, 'status' => 200, 'reason' => null];
    }

    private function missingEligibilitySchema(User $user): ?string
    {
        $required = [
            'orders' => ['buyer_id', 'status'],
            'order_items' => ['order_id', 'seller_id'],
            'refund_requests' => ['order_id', 'buyer_id', 'status'],
            'complaints' => ['complainant_id', 'respondent_id', 'status'],
            'cod_collections' => ['order_id', 'status'],
            'deliveries' => ['order_id', 'status'],
            'return_shipments' => ['buyer_id', 'seller_id', 'status'],
        ];

        if ($user->role === 'seller') {
            $required += [
                'commissions' => ['seller_id', 'status', 'paid_by', 'paid_at', 'payout_method', 'payout_reference', 'payout_amount'],
                'products' => ['seller_id', 'status', 'review_status'],
                'vouchers' => ['seller_id', 'is_active', 'expires_at'],
            ];
        }
        if ($user->role === 'buyer') {
            $required += [
                'voucher_claims' => ['voucher_id', 'buyer_id'],
                'vouchers' => ['is_active', 'expires_at'],
            ];
        }
        if ($user->role === 'rider') {
            $required += [
                'courier_profiles' => ['id', 'user_id'],
                'courier_delivery_areas' => ['courier_profile_id', 'delivery_area_id'],
                'delivery_areas' => ['id', 'is_active'],
                'pickup_assignments' => ['courier_profile_id', 'status'],
                'deliveries' => ['order_id', 'courier_profile_id', 'status'],
                'cod_collections' => ['order_id', 'courier_profile_id', 'status'],
                'return_shipments' => ['buyer_id', 'seller_id', 'status', 'pickup_courier_profile_id', 'delivery_courier_profile_id'],
                'hub_transfers' => ['courier_profile_id', 'status'],
            ];
        }
        if ($user->role === 'logistics') {
            $required['hub_transfers'] = ['assigned_by', 'status'];
        }

        foreach ($required as $table => $columns) {
            if (!Schema::hasTable($table)) return $table;
            foreach ($columns as $column) {
                if (!Schema::hasColumn($table, $column)) return $table.'.'.$column;
            }
        }

        return null;
    }

    private function assertNoOpenOperations(User $user): void
    {
        $sellerOrderIds = DB::table('order_items')->where('seller_id', $user->id)->select('order_id');
        $hasOpenOrders = DB::table('orders')
            ->where(function ($query) use ($user, $sellerOrderIds): void {
                $query->where('buyer_id', $user->id)
                    ->orWhereIn('id', $sellerOrderIds);
            })
            ->whereNotIn(DB::raw('UPPER(status)'), ['COMPLETED', 'CANCELLED', 'REFUNDED'])
            ->exists();
        abort_if($hasOpenOrders, 409, 'Resolve all open orders before releasing this email address.');

        if (Schema::hasTable('commissions')) {
            $hasUnsettledCommission = DB::table('commissions')
                ->where('seller_id', $user->id)
                ->where(function ($query): void {
                    // Paid is a settled workflow state. Legacy paid rows may
                    // predate payout metadata, while partially populated new
                    // payout records are treated as uncertain and blocked.
                    $query->whereNotIn(DB::raw('LOWER(status)'), ['cancelled', 'paid'])
                        ->orWhere(fn ($paid) => $paid->whereRaw('LOWER(status) = ?', ['paid'])
                            ->where(function ($metadata): void {
                                $metadata->whereNotNull('paid_by')
                                    ->orWhereNotNull('paid_at')
                                    ->orWhereNotNull('payout_method')
                                    ->orWhereNotNull('payout_reference')
                                    ->orWhereNotNull('payout_amount');
                            })
                            ->where(fn ($incomplete) => $incomplete
                                ->whereNull('paid_at')
                                ->orWhereNull('payout_method')
                                ->orWhereNull('payout_reference')
                                ->orWhereNull('payout_amount')
                                ->orWhere('payout_amount', '<=', 0)))
                        ->orWhere(fn ($cancelled) => $cancelled->whereRaw('LOWER(status) = ?', ['cancelled'])
                            ->where(fn ($metadata) => $metadata
                                ->whereNotNull('paid_by')
                                ->orWhereNotNull('paid_at')
                                ->orWhereNotNull('payout_method')
                                ->orWhereNotNull('payout_reference')
                                ->orWhereNotNull('payout_amount')));
                })
                ->exists();
            abort_if($hasUnsettledCommission, 409, 'Resolve or retain all seller balances and payout records before releasing this email address.');
        }

        if (Schema::hasTable('refund_requests')) {
            $sellerOrderIds = DB::table('order_items')->where('seller_id', $user->id)->select('order_id');
            $hasOpenRefund = DB::table('refund_requests')
                ->whereNotIn(DB::raw('LOWER(status)'), ['refunded', 'rejected', 'cancelled'])
                ->where(function ($query) use ($user, $sellerOrderIds): void {
                    $query->where('buyer_id', $user->id)->orWhereIn('order_id', $sellerOrderIds);
                })
                ->exists();
            abort_if($hasOpenRefund, 409, 'Resolve open refund requests before releasing this email address.');
        }

        if (Schema::hasTable('products')) {
            $hasAvailableProducts = DB::table('products')->where('seller_id', $user->id)
                ->where(function ($query): void {
                    $query->where('status', 'active')
                        ->orWhere('review_status', 'pending');
                })->exists();
            abort_if($hasAvailableProducts, 409, 'Archive or complete review of the seller products before releasing this email address.');
        }

        if (Schema::hasTable('vouchers') && Schema::hasColumn('vouchers', 'seller_id')) {
            $hasActiveSellerVoucher = DB::table('vouchers')
                ->where('seller_id', $user->id)
                ->where('is_active', true)
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->exists();
            abort_if($hasActiveSellerVoucher, 409, 'Disable active seller vouchers before releasing this email address.');
        }

        if ($user->role === 'buyer' && Schema::hasTable('voucher_claims') && Schema::hasTable('vouchers')) {
            $hasRedeemableClaim = DB::table('voucher_claims')
                ->join('vouchers', 'vouchers.id', '=', 'voucher_claims.voucher_id')
                ->where('voucher_claims.buyer_id', $user->id)
                ->where('vouchers.is_active', true)
                ->where(fn ($query) => $query->whereNull('vouchers.expires_at')->orWhere('vouchers.expires_at', '>', now()))
                ->exists();
            abort_if($hasRedeemableClaim, 409, 'Use or resolve active voucher claims before releasing this email address.');
        }

        if (Schema::hasTable('complaints')) {
            $hasOpenComplaint = DB::table('complaints')
                ->whereNotIn(DB::raw('LOWER(status)'), ['resolved', 'dismissed'])
                ->where(fn ($query) => $query->where('complainant_id', $user->id)->orWhere('respondent_id', $user->id))
                ->exists();
            abort_if($hasOpenComplaint, 409, 'Resolve open complaints before releasing this email address.');
        }

        $orderIds = DB::table('orders')
            ->where(fn ($query) => $query->where('buyer_id', $user->id)->orWhereIn('id', DB::table('order_items')->where('seller_id', $user->id)->select('order_id')))
            ->select('id');

        if (Schema::hasTable('cod_collections')) {
            $codQuery = DB::table('cod_collections')->where(function ($query) use ($orderIds, $user): void {
                $query->whereIn('order_id', $orderIds);
                if ($user->role === 'rider' && Schema::hasTable('courier_profiles')) {
                    $profileIds = DB::table('courier_profiles')->where('user_id', $user->id)->select('id');
                    $query->orWhereIn('courier_profile_id', $profileIds);
                }
            });
            $hasUnremittedCod = $codQuery
                ->whereNotIn(DB::raw('LOWER(status)'), ['remitted', 'cancelled'])
                ->exists();
            abort_if($hasUnremittedCod, 409, 'Reconcile outstanding COD collections before releasing this email address.');
        }

        if (Schema::hasTable('deliveries')) {
            $deliveryQuery = DB::table('deliveries')->where(function ($query) use ($orderIds, $user): void {
                $query->whereIn('order_id', $orderIds);
                if ($user->role === 'rider' && Schema::hasTable('courier_profiles')) {
                    $profileIds = DB::table('courier_profiles')->where('user_id', $user->id)->select('id');
                    $query->orWhereIn('courier_profile_id', $profileIds);
                }
            });
            $hasOpenDelivery = $deliveryQuery
                ->whereNotIn(DB::raw('UPPER(status)'), ['DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED'])
                ->exists();
            abort_if($hasOpenDelivery, 409, 'Resolve delivery activity before releasing this email address.');
        }

        if ($user->role === 'rider' && Schema::hasTable('courier_profiles')) {
            $profileIds = DB::table('courier_profiles')->where('user_id', $user->id)->select('id');

            if (Schema::hasTable('courier_delivery_areas')) {
                $hasActiveAreaAssignment = DB::table('courier_delivery_areas')
                    ->join('delivery_areas', 'delivery_areas.id', '=', 'courier_delivery_areas.delivery_area_id')
                    ->whereIn('courier_delivery_areas.courier_profile_id', $profileIds)
                    ->where('delivery_areas.is_active', true)
                    ->exists();
                abort_if($hasActiveAreaAssignment, 409, 'Remove active courier delivery-area assignments before releasing this email address.');
            }

            if (Schema::hasTable('pickup_assignments')) {
                $hasOpenPickup = DB::table('pickup_assignments')->whereIn('courier_profile_id', $profileIds)
                    ->whereNotIn(DB::raw('LOWER(status)'), ['at_sorting_center', 'received', 'completed', 'cancelled', 'returned'])
                    ->exists();
                abort_if($hasOpenPickup, 409, 'Resolve courier pickup assignments before releasing this email address.');
            }

            if (Schema::hasTable('return_shipments')) {
                $hasOpenCourierReturn = DB::table('return_shipments')
                    ->where(function ($query) use ($profileIds): void {
                        $query->whereIn('pickup_courier_profile_id', $profileIds)
                            ->orWhereIn('delivery_courier_profile_id', $profileIds);
                    })
                    ->whereNotIn(DB::raw('LOWER(status)'), ['received', 'completed', 'cancelled', 'returned', 'seller_received'])
                    ->exists();
                abort_if($hasOpenCourierReturn, 409, 'Resolve courier return-shipment assignments before releasing this email address.');
            }

            if (Schema::hasTable('hub_transfers')) {
                $hasOpenHubTransfer = DB::table('hub_transfers')->whereIn('courier_profile_id', $profileIds)
                    ->whereNotIn(DB::raw('LOWER(status)'), ['arrived', 'completed', 'cancelled'])
                    ->exists();
                abort_if($hasOpenHubTransfer, 409, 'Resolve courier hub transfers before releasing this email address.');
            }
        }

        if (Schema::hasTable('return_shipments')) {
            $hasOpenReturn = DB::table('return_shipments')
                ->where(fn ($query) => $query->where('buyer_id', $user->id)->orWhere('seller_id', $user->id))
                ->whereNotIn(DB::raw('LOWER(status)'), ['received', 'completed', 'cancelled', 'returned'])
                ->exists();
            abort_if($hasOpenReturn, 409, 'Resolve return-shipment activity before releasing this email address.');
        }

        if ($user->role === 'logistics' && Schema::hasTable('hub_transfers')) {
            $hasOpenTransferResponsibility = DB::table('hub_transfers')->where('assigned_by', $user->id)
                ->whereNotIn(DB::raw('LOWER(status)'), ['arrived', 'completed', 'cancelled'])
                ->exists();
            abort_if($hasOpenTransferResponsibility, 409, 'Resolve hub transfers assigned by this account before releasing this email address.');
        }
    }
}
