<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        if (!Storage::disk('public')->exists($document->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Document file not found.',
            ], 404);
        }

        return Storage::disk('public')->response(
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
            'rejection_reason' => ['required', 'string', 'max:1000'],
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

        $document->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document rejected successfully.',
            'data' => $document,
        ]);
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