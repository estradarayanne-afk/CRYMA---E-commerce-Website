<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SellerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StoreNameRequestController extends Controller
{
    public function index()
    {
        $requests = SellerProfile::query()
            ->with('user:id,first_name,last_name,email')
            ->where('business_name_request_status', 'pending')
            ->latest('business_name_requested_at')
            ->get();

        return response()->json(['success' => true, 'data' => $requests]);
    }

    public function review(Request $request, int $id)
    {
        $values = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $profile = DB::transaction(function () use ($request, $id, $values): SellerProfile {
            SellerProfile::query()->orderBy('id')->lockForUpdate()->get(['id']);
            $profile = SellerProfile::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($profile->business_name_request_status === 'pending' && filled($profile->requested_business_name), 409, 'This store name request is no longer pending.');

            if ($values['decision'] === 'approve') {
                $requestedName = trim($profile->requested_business_name);
                $taken = SellerProfile::query()
                    ->where('user_id', '!=', $profile->user_id)
                    ->whereRaw('LOWER(TRIM(business_name)) = ?', [mb_strtolower($requestedName)])
                    ->exists();

                if ($taken) {
                    throw ValidationException::withMessages([
                        'requested_business_name' => ['This store name is already taken. The request cannot be approved.'],
                    ]);
                }

                $baseSlug = Str::slug($requestedName) ?: 'store';
                $slug = $baseSlug.'-'.$profile->user_id;
                $suffix = 2;
                while (SellerProfile::query()->where('store_slug', $slug)->where('id', '!=', $profile->id)->exists()) {
                    $slug = $baseSlug.'-'.$profile->user_id.'-'.$suffix++;
                }

                $profile->business_name = $requestedName;
                $profile->store_slug = $slug;
                $profile->business_name_request_status = 'approved';
                $profile->business_name_request_reason = null;
            } else {
                $profile->business_name_request_status = 'rejected';
                $profile->business_name_request_reason = trim((string) ($values['reason'] ?? '')) ?: null;
            }

            $profile->business_name_reviewed_by = $request->user()->id;
            $profile->business_name_reviewed_at = now();
            $profile->save();

            return $profile->fresh()->load('user:id,first_name,last_name,email');
        });

        return response()->json([
            'success' => true,
            'message' => $values['decision'] === 'approve' ? 'Store name updated.' : 'Store name request rejected.',
            'data' => $profile,
        ]);
    }
}