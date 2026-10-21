<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Mail\CourierApplicationDecisionMail;
use App\Models\User;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class RiderManagementController extends Controller
{
    private const REQUIRED_DOCUMENTS = ['valid_id', 'or_cr', 'drivers_license'];

    public function index()
    {
        $riders = User::query()
            ->where('role', 'rider')
            ->where('status', 'pending')
            ->with([
                'courierProfile.vehicles',
                'addresses',
                'documents' => fn ($query) => $query
                    ->whereIn('document_type', self::REQUIRED_DOCUMENTS)
                    ->orderBy('id'),
            ])
            ->latest()
            ->paginate(10);

        return response()->json(['success' => true, 'data' => $riders]);
    }

    public function showDocument(int $id, int $documentId)
    {
        $document = $this->pendingRiderDocument($id, $documentId);
        $expectedPrefix = "registration-documents/{$document->user_id}/";

        if (
            !str_starts_with((string) $document->file_path, $expectedPrefix)
            || !preg_match('/\Aregistration-documents\/[1-9][0-9]*\/[A-Za-z0-9._-]+\z/', (string) $document->file_path)
        ) {
            return response()->json(['success' => false, 'message' => 'Document not found.'], 404);
        }

        $disk = Storage::disk('local')->exists($document->file_path) ? 'local' : 'public';
        if (!Storage::disk($disk)->exists($document->file_path)) {
            return response()->json(['success' => false, 'message' => 'Document file not found.'], 404);
        }

        return Storage::disk($disk)->response(
            $document->file_path,
            $document->original_file_name,
            [
                'Content-Type' => $document->mime_type ?? 'application/octet-stream',
                'Content-Disposition' => 'inline',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

    public function approveDocument(int $id, int $documentId)
    {
        $document = $this->pendingRiderDocument($id, $documentId);
        abort_unless($document->status === 'pending', 422, 'Only pending courier documents can be approved.');

        $document->update(['status' => 'approved', 'rejection_reason' => null]);

        return response()->json(['success' => true, 'message' => 'Courier document approved.', 'data' => $document->fresh()]);
    }

    public function rejectDocument(Request $request, int $id, int $documentId)
    {
        $values = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500', 'not_regex:/^\s*$/u'],
        ]);
        $document = $this->pendingRiderDocument($id, $documentId);
        abort_unless($document->status === 'pending', 422, 'Only pending courier documents can be rejected.');

        $document->update([
            'status' => 'rejected',
            'rejection_reason' => trim($values['rejection_reason']),
        ]);

        return response()->json(['success' => true, 'message' => 'Courier document rejected.', 'data' => $document->fresh()]);
    }

    public function approve(int $id)
    {
        $rider = DB::transaction(function () use ($id) {
            $rider = User::whereKey($id)
                ->where('role', 'rider')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($rider->email_verified_at, 422, 'Email verification is required before approval.');

            $approvedTypes = $rider->documents()
                ->whereIn('document_type', self::REQUIRED_DOCUMENTS)
                ->where('status', 'approved')
                ->pluck('document_type')
                ->unique()
                ->all();
            abort_unless(
                array_diff(self::REQUIRED_DOCUMENTS, $approvedTypes) === [],
                422,
                'All required courier documents must be approved first.',
            );

            $rider->forceFill(['status' => 'active'])->save();
            return $rider->fresh();
        });

        $mailSent = $this->sendDecisionEmail($rider, true);

        return response()->json([
            'success' => true,
            'message' => $mailSent
                ? 'Courier application approved and notification sent.'
                : 'Courier application approved, but the email notification could not be sent.',
            'data' => $rider,
            'notification_sent' => $mailSent,
        ]);
    }

    public function reject(Request $request, int $id)
    {
        $values = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500', 'not_regex:/^\s*$/u'],
        ]);
        $reason = trim($values['rejection_reason']);

        $rider = DB::transaction(function () use ($id) {
            $rider = User::whereKey($id)
                ->where('role', 'rider')
                ->where('status', 'pending')
                ->lockForUpdate()
                ->firstOrFail();
            $rider->forceFill(['status' => 'rejected'])->save();
            $rider->tokens()->delete();
            return $rider->fresh();
        });

        $mailSent = $this->sendDecisionEmail($rider, false, $reason);

        return response()->json([
            'success' => true,
            'message' => $mailSent
                ? 'Courier application rejected and notification sent.'
                : 'Courier application rejected, but the email notification could not be sent.',
            'data' => $rider,
            'notification_sent' => $mailSent,
        ]);
    }

    private function pendingRiderDocument(int $riderId, int $documentId): UserDocument
    {
        return UserDocument::query()
            ->where('user_id', $riderId)
            ->whereIn('document_type', self::REQUIRED_DOCUMENTS)
            ->whereHas('user', fn ($query) => $query
                ->where('role', 'rider')
                ->where('status', 'pending'))
            ->findOrFail($documentId);
    }

    private function sendDecisionEmail(User $rider, bool $approved, ?string $reason = null): bool
    {
        try {
            Mail::to($rider->email)->send(new CourierApplicationDecisionMail(
                firstName: $rider->first_name,
                approved: $approved,
                rejectionReason: $reason,
            ));
            return true;
        } catch (\Throwable $exception) {
            Log::warning('Courier application decision email delivery failed.', [
                'rider_id' => $rider->id,
                'decision' => $approved ? 'approved' : 'rejected',
                'exception_class' => $exception::class,
            ]);
            return false;
        }
    }
}
