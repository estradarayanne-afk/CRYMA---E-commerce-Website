<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ApplicantDocumentCorrectionController extends Controller
{
    private function findValidDocument(int $documentId, string $token): ?UserDocument
    {
        $document = UserDocument::with('user')->find($documentId);
        if (!$document || $document->status !== 'rejected' || !$document->correction_token_hash
            || !$document->correction_token_expires_at || now()->greaterThanOrEqualTo($document->correction_token_expires_at)
            || !hash_equals($document->correction_token_hash, hash('sha256', $token))
            || $document->user?->status !== 'pending') {
            return null;
        }
        return $document;
    }

    public function show(Request $request)
    {
        $values = $request->validate(['document_id' => ['required', 'integer'], 'token' => ['required', 'string', 'size:64']]);
        $document = $this->findValidDocument((int) $values['document_id'], $values['token']);
        abort_unless($document, 404, 'This replacement link is invalid or has expired. Contact CRYMA support for help.');

        return response()->json(['success' => true, 'data' => [
            'document_type' => $document->document_type,
            'rejection_reason' => $document->rejection_reason,
            'expires_at' => $document->correction_token_expires_at,
        ]]);
    }

    public function replace(Request $request)
    {
        $values = $request->validate([
            'document_id' => ['required', 'integer'],
            'token' => ['required', 'string', 'size:64'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);
        $document = $this->findValidDocument((int) $values['document_id'], $values['token']);
        abort_unless($document, 404, 'This replacement link is invalid or has expired. Contact CRYMA support for help.');

        $path = $values['file']->store("registration-documents/{$document->user_id}", 'local');
        abort_unless($path, 500, 'The replacement document could not be saved. Please try again.');
        try {
            $replacement = DB::transaction(function () use ($document, $values, $path) {
                $original = UserDocument::whereKey($document->id)->lockForUpdate()->firstOrFail();
                abort_unless($this->findValidDocument($original->id, $values['token']), 409, 'This replacement link has already been used or has expired.');

                $original->update(['correction_token_hash' => null, 'correction_token_expires_at' => null]);
                return UserDocument::create([
                    'user_id' => $original->user_id,
                    'document_type' => $original->document_type,
                    'file_path' => $path,
                    'original_file_name' => $values['file']->getClientOriginalName(),
                    'mime_type' => $values['file']->getMimeType(),
                    'file_size' => $values['file']->getSize(),
                    'status' => 'pending',
                    'replaces_document_id' => $original->id,
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json(['success' => true, 'message' => 'Replacement submitted. Your application remains pending while CRYMA reviews it.', 'data' => [
            'id' => $replacement->id,
            'document_type' => $replacement->document_type,
            'status' => $replacement->status,
        ]], Response::HTTP_CREATED);
    }
}
