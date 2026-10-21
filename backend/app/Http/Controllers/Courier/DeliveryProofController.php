<?php

namespace App\Http\Controllers\Courier;

use App\Http\Controllers\Controller;
use App\Models\Delivery;
use App\Models\DeliveryProof;
use App\Models\Order;
use App\Models\User;
use App\Services\CourierEligibility;
use App\Support\OrderDeliveryProjection;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class DeliveryProofController extends Controller
{
    public function store(Request $request, int $id, CourierEligibility $eligibility)
    {
        $values = $request->validate([
            'expected_status' => ['required', 'in:OUT_FOR_DELIVERY'],
            'recipient_full_name' => ['required', 'string', 'max:150'],
            'photo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $recipientName = trim($values['recipient_full_name']);
        if ($recipientName === '') {
            throw ValidationException::withMessages(['recipient_full_name' => ['The recipient full name is required.']]);
        }

        $photoInfo = @getimagesize($request->file('photo')->getRealPath());
        if (
            !$photoInfo
            || $photoInfo[0] > 10000
            || $photoInfo[1] > 10000
            || $photoInfo[0] * $photoInfo[1] > 40000000
        ) {
            throw ValidationException::withMessages(['photo' => ['The delivery photo dimensions are too large.']]);
        }
        $user = $request->user();
        abort_unless($user->role === 'rider' && $user->status === 'active' && $user->email_verified_at, 403, 'Courier account is not eligible to operate.');
        $profile = $user->courierProfile;
        abort_unless($profile && $eligibility->isEligible($profile), 403, 'Courier account or required documents are not approved.');

        $storedPaths = [];
        try {
            $delivery = DB::transaction(function () use ($request, $id, $profile, $eligibility, $recipientName, &$storedPaths) {
                $initial = Delivery::where('courier_profile_id', $profile->id)->find($id);
                abort_unless($initial, 404, 'Assigned delivery not found.');

                $order = Order::whereKey($initial->order_id)->lockForUpdate()->firstOrFail();
                $delivery = Delivery::where('courier_profile_id', $profile->id)->whereKey($id)->lockForUpdate()->first();
                abort_unless($delivery, 404, 'Assigned delivery not found.');
                abort_unless($eligibility->isEligible($profile), 403, 'Courier eligibility changed. Contact an administrator.');
                abort_unless($delivery->status === Delivery::OUT_FOR_DELIVERY, 409, 'Only an active delivery can be completed with proof.');
                abort_unless($order->status === Delivery::OUT_FOR_DELIVERY, 409, 'Order and delivery status are out of sync. Contact an administrator.');
                abort_unless(!$delivery->proof()->exists(), 409, 'Proof of delivery has already been recorded.');

                $capturedAt = now();
                $directory = "delivery-proofs/{$delivery->id}";
                $photoExtension = match ($request->file('photo')->getMimeType()) {
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    default => null,
                };
                abort_unless($photoExtension, 422, 'The delivery photo must be a JPEG, PNG, or WebP image.');

                $photoPath = $request->file('photo')->storeAs($directory, Str::uuid().'.'.$photoExtension, 'local');
                if (!$photoPath) {
                    throw new \RuntimeException('Unable to store delivery photo.');
                }
                $storedPaths[] = $photoPath;


                $delivery->proof()->create([
                    'courier_profile_id' => $profile->id,
                    'recipient_full_name' => $recipientName,
                    'photo_path' => $photoPath,
                    'captured_at' => $capturedAt,
                ]);
                $delivery->update(['status' => Delivery::DELIVERED, 'delivered_at' => $capturedAt, 'failure_reason' => null]);
                $order->update(['status' => Delivery::DELIVERED]);
                OrderDeliveryProjection::event($delivery, [
                    'actor_id' => $request->user()->id,
                    'event_type' => 'delivered_with_proof',
                    'previous_status' => Delivery::OUT_FOR_DELIVERY,
                    'new_status' => Delivery::DELIVERED,
                    'previous_courier_profile_id' => $profile->id,
                    'courier_profile_id' => $profile->id,
                    'created_at' => $capturedAt,
                ]);

                return $delivery->load('proof');
            });
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                if (!Storage::disk('local')->delete($path)) {
                    logger()->error('Failed to remove an uncommitted delivery proof file.', ['delivery_id' => $id]);
                }
            }
            throw $exception;
        }

        return response()->json([
            'success' => true,
            'message' => 'Delivery completed and proof recorded.',
            'data' => [
                'status' => $delivery->status,
                'delivered_at' => $delivery->delivered_at,
                'proof' => $this->proofMetadata($delivery->proof),
            ],
        ]);
    }

    public function showForCourier(Request $request, int $id, string $kind)
    {
        abort_unless($kind === 'photo', 404);
        $user = $request->user();
        abort_unless($user->role === 'rider' && $user->status === 'active', 403);
        $profile = $user->courierProfile;
        abort_unless($profile, 403);

        $proof = DeliveryProof::where('courier_profile_id', $profile->id)
            ->whereHas('delivery', fn ($query) => $query->where('courier_profile_id', $profile->id)->whereKey($id))
            ->firstOrFail();

        return $this->fileResponse($proof, $kind);
    }

    public function showForStaff(Request $request, int $id, string $kind)
    {
        abort_unless(in_array($request->user()->role, ['admin', 'logistics'], true), 403);
        abort_unless($kind === 'photo', 404);
        $proof = DeliveryProof::where('delivery_id', $id)->firstOrFail();

        return $this->fileResponse($proof, $kind);
    }

    private function fileResponse(DeliveryProof $proof, string $kind)
    {
        $path = $proof->photo_path;
        abort_unless(Storage::disk('local')->exists($path), 404);
        $extension = pathinfo($path, PATHINFO_EXTENSION);

        return Storage::disk('local')->response($path, "delivery-proof-{$kind}.{$extension}", [
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
        ], 'inline');
    }

    private function proofMetadata(DeliveryProof $proof): array
    {
        return [
            'recipient_full_name' => $proof->recipient_full_name,
            'captured_at' => $proof->captured_at,
        ];
    }
}
