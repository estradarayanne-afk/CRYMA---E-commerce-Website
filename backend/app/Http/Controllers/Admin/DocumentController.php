<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserDocument;
use App\Mail\RegistrationDocumentCorrectionMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class DocumentController extends Controller
{
    /**
     * View a submitted registration document.
     */
    
    /**
     * Get submitted registration documents.
     */
/**
 * Get submitted registration documents.
 */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $query = UserDocument::query()
            ->with('user')
            ->latest();

        // Search by file name
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('original_file_name', 'like', "%{$search}%")
                ->orWhere('document_type', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $documents = $query->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $documents,
        ]);
    }
    
    public function show(int $id)
    {
        $user = request()->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $document = UserDocument::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        $expectedPrefix = "registration-documents/{$document->user_id}/";
        if (
            !str_starts_with((string) $document->file_path, $expectedPrefix) ||
            !preg_match('/\Aregistration-documents\/[1-9][0-9]*\/[A-Za-z0-9._-]+\z/', (string) $document->file_path)
        ) {
            return response()->json(['success' => false, 'message' => 'Document not found.'], 404);
        }

        $disk = Storage::disk('local')->exists($document->file_path)
            ? 'local'
            : 'public'; // Compatibility for documents uploaded before private storage was enabled.

        if (!Storage::disk($disk)->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Document file not found.',
            ], 404);
        }

        return Storage::disk($disk)->response(
            $document->file_path,
            $document->original_file_name,
            [
                'Content-Type' => $document->mime_type ?? 'application/octet-stream',
                'Content-Disposition' => 'inline',
            ]
        );
    }

    /**
     * Approve a submitted registration document.
     */
    public function approve(int $id)
    {
        $user = request()->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $document = UserDocument::where('id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Pending document not found.',
            ], 404);
        }

        $document->update([
            'status' => 'approved',
            'rejection_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document approved successfully.',
            'data' => $document,
        ]);
    }

    /**
     * Reject a submitted registration document.
     */
    public function reject(Request $request, int $id)
    {
        $user = request()->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        $request->validate([
            'rejection_reason' => ['required', 'string', 'max:500', 'not_regex:/^\s*$/u'],
        ]);

        $document = UserDocument::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        if ($document->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending documents can be rejected.',
            ], 422);
        }

        $token = Str::random(64);
        $document->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'correction_token_hash' => hash('sha256', $token),
            'correction_token_expires_at' => now()->addDays(7),
        ]);

        $emailSent = $this->sendCorrectionEmail($document, $token);

        return response()->json([
            'success' => true,
            'message' => $emailSent
                ? 'Document rejected. The applicant was emailed a secure replacement link.'
                : 'Document rejected, but the replacement email could not be sent. Please contact the applicant.',
            'email_sent' => $emailSent,
            'data' => $document,
        ]);
    }

    public function resendCorrectionLink(Request $request, int $id)
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Unauthorized.');
        $document = UserDocument::with('user')->whereKey($id)->where('status', 'rejected')->firstOrFail();
        abort_unless($document->user?->status === 'pending', 409, 'The applicant is no longer awaiting registration review.');

        $token = Str::random(64);
        $document->update([
            'correction_token_hash' => hash('sha256', $token),
            'correction_token_expires_at' => now()->addDays(7),
        ]);
        $emailSent = $this->sendCorrectionEmail($document, $token);

        return response()->json([
            'success' => $emailSent,
            'message' => $emailSent ? 'A fresh replacement link was emailed to the applicant.' : 'The replacement email could not be sent. Check mail delivery settings and retry.',
        ], $emailSent ? 200 : 503);
    }

    private function sendCorrectionEmail(UserDocument $document, string $token): bool
    {
        $document->loadMissing('user');
        try {
            $frontendUrl = rtrim((string) config('app.frontend_url', config('app.url')), '/');
            $correctionUrl = $frontendUrl.'/application/document-correction?document_id='.$document->id.'&token='.$token;
            Mail::to($document->user->email)->send(new RegistrationDocumentCorrectionMail(
                $document->user->first_name ?: 'Applicant',
                str($document->document_type)->replace('_', ' ')->title()->toString(),
                $document->rejection_reason,
                $correctionUrl,
            ));
            return true;
        } catch (Throwable $exception) {
            Log::warning('Unable to send applicant document correction link.', [
                'document_id' => $document->id,
                'exception_class' => $exception::class,
            ]);
            return false;
        }
    }

    /**
     * Reject a submitted registration document.
     */
    // public function reject(Request $request, int $id)
    // {
    //     $user = $request->user();

    //     if (!$user || $user->role !== 'admin') {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Unauthorized.',
    //         ], 403);
    //     }

    //     $request->validate([
    //         'rejection_reason' => ['required', 'string', 'max:1000'],
    //     ]);

    //     $document = UserDocument::where('id', $id)
    //         ->where('status', 'pending')
    //         ->first();

    //     if (!$document) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Pending document not found.',
    //         ], 404);
    //     }

    //     $document->update([
    //         'status' => 'rejected',
    //         'rejection_reason' => $request->rejection_reason,
    //     ]);

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Document rejected successfully.',
    //         'data' => $document,
    //     ]);
    // }
}
