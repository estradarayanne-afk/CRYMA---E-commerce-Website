<?php

namespace App\Http\Controllers\Logistics;

use App\Http\Controllers\Controller;
use App\Mail\AccountReactivationMail;
use App\Mail\AccountSuspensionMail;
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

    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'in:pending,active,suspended,rejected'],
            'search' => ['sometimes', 'string', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'pending';
        $query = User::query()
            ->where('role', 'rider')
            ->whereNull('account_archived_at')
            ->where('status', $status)
            ->with(['courierProfile.vehicles']);
        if ($status === 'pending') {
            $query->with([
                'addresses',
                'documents' => fn ($query) => $query
                    ->whereIn('document_type', self::REQUIRED_DOCUMENTS)
                    ->orderBy('id'),
            ]);
        }

        if (filled($filters['search'] ?? null)) {
            $search = trim($filters['search']);
            $query->where(function ($users) use ($search) {
                $users->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $riders = $query->latest()->paginate(15);

        return response()->json(['success' => true, 'data' => $riders]);
    }

    public function updateStatus(Request $request, int $id)
    {
        $values = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'suspension_reason' => ['required_if:status,suspended', 'nullable', 'string', 'max:500', 'not_regex:/^\s*$/u'],
        ]);

        $notification = DB::transaction(function () use ($id, $values): ?array {
            $rider = User::query()->where('role', 'rider')->whereKey($id)->lockForUpdate()->firstOrFail();
            abort_if($rider->account_archived_at !== null, 409, 'Archived courier accounts cannot change status.');
            abort_unless(in_array($rider->status, ['active', 'suspended'], true), 409, 'Only active or suspended courier accounts can be changed here.');

            if ($values['status'] === 'active') {
                abort_unless($rider->email_verified_at, 422, 'Email verification is required before reactivation.');
                $approvedTypes = $rider->documents()
                    ->whereIn('document_type', self::REQUIRED_DOCUMENTS)
                    ->where('status', 'approved')
                    ->pluck('document_type')
                    ->unique()
                    ->all();
                abort_unless(array_diff(self::REQUIRED_DOCUMENTS, $approvedTypes) === [], 422, 'All required courier documents must be approved before reactivation.');
            }

            $wasSuspended = $rider->status === 'suspended';
            $occurredAt = now();
            $rider->forceFill([
                'status' => $values['status'],
                'suspension_reason' => $values['status'] === 'suspended'
                    ? trim($values['suspension_reason'])
                    : null,
            ])->save();
            if ($values['status'] === 'suspended') {
                $rider->tokens()->delete();
            }

            $kind = match (true) {
                $values['status'] === 'suspended' && !$wasSuspended => 'suspended',
                $values['status'] === 'active' && $wasSuspended => 'reactivated',
                default => null,
            };

            return $kind === null ? null : ['kind' => $kind, 'user' => $rider->fresh(), 'occurred_at' => $occurredAt];
        });

        $notificationSent = null;
        if ($notification !== null) {
            /** @var User $rider */
            $rider = $notification['user'];
            $name = trim($rider->first_name.' '.$rider->last_name) ?: 'there';
            try {
                $mail = $notification['kind'] === 'suspended'
                    ? new AccountSuspensionMail($name, $rider->suspension_reason, $notification['occurred_at'])
                    : new AccountReactivationMail($name, $notification['occurred_at']);
                Mail::to($rider->email)->send($mail);
                $notificationSent = true;
            } catch (\Throwable $exception) {
                $notificationSent = false;
                Log::warning('Courier account status notification email delivery failed.', [
                    'rider_id' => $rider->id,
                    'status' => $rider->status,
                    'exception_class' => $exception::class,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => $notificationSent === false
                ? 'Courier account status updated, but the email notification could not be sent.'
                : 'Courier account status updated.',
            'notification_sent' => $notificationSent,
            'data' => User::whereKey($id)->firstOrFail(),
        ]);
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
