<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserDocument;
use App\Services\CourierEligibility;
use Illuminate\Http\Request;

/**
 * Returns the authenticated courier's profile, approval status, and which
 * required documents are still missing or under review.
 * Used by the mobile app to show the "pending approval" state screen.
 */
class CourierProfileController extends Controller
{
    private const REQUIRED_DOCS = ['valid_id', 'or_cr', 'drivers_license'];

    public function show(Request $request, CourierEligibility $eligibility)
    {
        $user = $request->user();
        abort_unless($user->role === 'rider', 403, 'This endpoint is for courier accounts only.');

        $profile = $user->load(['courierProfile.vehicles', 'documents'])->courierProfile;

        $docStatuses = $user->documents
            ->whereIn('document_type', self::REQUIRED_DOCS)
            ->mapWithKeys(fn ($doc) => [
                $doc->document_type => $doc->status,
            ])->toArray();

        $missing = [];
        foreach (self::REQUIRED_DOCS as $type) {
            if (!isset($docStatuses[$type])) {
                $missing[] = $type;
            }
        }

        $pendingDocs = array_keys(array_filter($docStatuses, fn ($s) => $s === 'pending'));
        $rejectedDocs = array_keys(array_filter($docStatuses, fn ($s) => $s === 'rejected'));

        $isEligible = $profile && $eligibility->isEligible($profile);

        return response()->json([
            'success' => true,
            'data'    => [
                'id'             => $user->id,
                'name'           => trim($user->first_name.' '.$user->last_name),
                'email'          => $user->email,
                'phone'          => $user->phone,
                'role'           => $user->role,
                'account_status' => $user->status,
                'email_verified' => $user->email_verified_at !== null,
                'is_eligible'    => $isEligible,
                'courier_profile' => $profile ? [
                    'id'           => $profile->id,
                    'sex'          => $profile->sex,
                    'birthday'     => $profile->birthday?->toDateString(),
                    'vehicles'     => $profile->vehicles->map(fn ($v) => [
                        'vehicle_type' => $v->vehicle_type,
                        'plate_number' => $v->plate_number,
                    ])->values(),
                ] : null,
                'documents' => [
                    'statuses'      => $docStatuses,
                    'missing'       => $missing,
                    'pending_review'=> $pendingDocs,
                    'rejected'      => $rejectedDocs,
                ],
            ],
        ]);
    }
}
