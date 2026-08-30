<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    /**
     * Display complaints and disputes.
     */
    public function index(Request $request)
    {
        $query = Complaint::with([
            'complainant:id,first_name,middle_name,last_name,email,phone',
            'respondent:id,first_name,middle_name,last_name,email,phone',
        ]);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('subject', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('complainant', function ($userQuery) use ($search) {
                        $userQuery->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $complaints = $query
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $complaints,
        ]);
    }

    /**
     * Display a specific complaint.
     */
    public function show($id)
    {
        $complaint = Complaint::with([
            'complainant',
            'respondent',
        ])->find($id);

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $complaint,
        ]);
    }

    /**
     * Update complaint status.
     */
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => [
                'required',
                'in:pending,under_review,resolved,dismissed',
            ],
        ]);

        $complaint = Complaint::find($id);

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found.',
            ], 404);
        }

        $complaint->status = $request->status;

        if ($request->status === 'resolved') {
            $complaint->resolved_at = now();
        } else {
            $complaint->resolved_at = null;
        }

        $complaint->save();

        return response()->json([
            'success' => true,
            'message' => 'Complaint status updated successfully.',
            'data' => $complaint->fresh(),
        ]);
    }

    /**
     * Add admin notes and resolve a complaint.
     */
    public function resolve(Request $request, $id)
    {
        $request->validate([
            'admin_notes' => 'required|string',
        ]);

        $complaint = Complaint::find($id);

        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found.',
            ], 404);
        }

        $complaint->update([
            'status' => 'resolved',
            'admin_notes' => $request->admin_notes,
            'resolved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Complaint resolved successfully.',
            'data' => $complaint->fresh(),
        ]);
    }
}