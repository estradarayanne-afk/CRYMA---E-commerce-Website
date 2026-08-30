import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Complaints.css";

function Complaints() {
    const [complaints, setComplaints] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [actionModal, setActionModal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [adminNotes, setAdminNotes] = useState("");
    const [successModal, setSuccessModal] = useState("");

    // =========================================
    // FETCH COMPLAINTS
    // =========================================

    const fetchComplaints = useCallback(async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const params = {};

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            params.page = page;

            const response = await api.get("/admin/complaints", {
                params,
            });

            const data = response.data.data;

            setComplaints(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 10,
                total: data?.total || 0,
            });
        } catch (err) {
            console.error("Complaints API error:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to load complaints."
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchComplaints();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchComplaints]);

    // =========================================
    // HELPERS
    // =========================================

    const getFullName = (user) => {
        if (!user) return "Unknown User";

        return [
            user.first_name,
            user.middle_name,
            user.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unknown User";
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case "resolved":
                return "resolved";

            case "under_review":
                return "under-review";

            case "dismissed":
                return "dismissed";

            default:
                return "pending";
        }
    };

    const formatStatus = (status) => {
        if (!status) return "Unknown";

        return status
            .replaceAll("_", " ")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    };

    const formatDate = (date) => {
        if (!date) return "—";

        return new Date(date).toLocaleDateString();
    };

    // =========================================
    // VIEW COMPLAINT
    // =========================================

    const handleViewComplaint = async (complaint) => {
        setSelectedComplaint(complaint);
        setDetailsLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/complaints/${complaint.id}`
            );

            setSelectedComplaint(response.data.data);
        } catch (err) {
            console.error("Complaint details error:", err);

            setError(
                err.response?.data?.message ||
                    "Unable to load complaint details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    // =========================================
    // CLOSE DETAILS
    // =========================================

    const closeDetails = () => {
        if (actionLoading) return;

        setSelectedComplaint(null);
        setError("");
    };

    // =========================================
    // OPEN ACTION MODAL
    // =========================================

    const openActionModal = (action) => {
        if (!selectedComplaint || actionLoading) return;

        setError("");
        setAdminNotes("");

        setActionModal(action);
    };

    // =========================================
    // CLOSE ACTION MODAL
    // =========================================

    const closeActionModal = () => {
        if (actionLoading) return;

        setActionModal(null);
        setAdminNotes("");
        setError("");
    };

    // =========================================
    // UPDATE STATUS
    // =========================================

    const confirmStatusUpdate = async () => {
        if (!selectedComplaint || actionLoading) return;

        setActionLoading(true);
        setError("");

        let newStatus = "";

        if (actionModal === "review") {
            newStatus = "under_review";
        }

        if (actionModal === "dismiss") {
            newStatus = "dismissed";
        }

        if (!newStatus) {
            setActionLoading(false);
            return;
        }

        try {
            const response = await api.patch(
                `/admin/complaints/${selectedComplaint.id}/status`,
                {
                    status: newStatus,
                }
            );

            const updatedComplaint = response.data.data;

            setComplaints((current) =>
                current.map((complaint) =>
                    complaint.id === updatedComplaint.id
                        ? {
                              ...complaint,
                              ...updatedComplaint,
                          }
                        : complaint
                )
            );

            setSelectedComplaint((current) => ({
                ...current,
                ...updatedComplaint,
            }));

            setActionModal(null);

            setSuccessModal(
                response.data.message ||
                    "Complaint status updated successfully."
            );
        } catch (err) {
            console.error(
                "Complaint status update error:",
                err
            );

            setError(
                err.response?.data?.message ||
                    "Unable to update complaint status."
            );

            setActionModal(null);
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // RESOLVE COMPLAINT
    // =========================================

    const confirmResolve = async () => {
        if (!selectedComplaint || actionLoading) return;

        if (!adminNotes.trim()) {
            setError(
                "Please provide resolution notes."
            );

            return;
        }

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/complaints/${selectedComplaint.id}/resolve`,
                {
                    admin_notes: adminNotes.trim(),
                }
            );

            const updatedComplaint = response.data.data;

            setComplaints((current) =>
                current.map((complaint) =>
                    complaint.id === updatedComplaint.id
                        ? {
                              ...complaint,
                              ...updatedComplaint,
                          }
                        : complaint
                )
            );

            setSelectedComplaint((current) => ({
                ...current,
                ...updatedComplaint,
            }));

            setActionModal(null);
            setAdminNotes("");

            setSuccessModal(
                response.data.message ||
                    "Complaint resolved successfully."
            );
        } catch (err) {
            console.error(
                "Resolve complaint error:",
                err
            );

            setError(
                err.response?.data?.message ||
                    "Unable to resolve complaint."
            );

            setActionModal(null);
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // CLOSE SUCCESS MODAL
    // =========================================

    const closeSuccessModal = () => {
        setSuccessModal("");
    };

    // =========================================
    // RETURN
    // =========================================

    return (
        <div className="complaints-page">

            {/* HEADER */}

            <div className="complaints-header">

                <div>
                    <span className="complaints-eyebrow">
                        DISPUTE MANAGEMENT
                    </span>

                    <h1>
                        Complaints & Disputes
                    </h1>

                    <p>
                        Review complaints, supporting evidence,
                        and coordinate dispute resolution.
                    </p>
                </div>

                <div className="complaints-count">
                    <strong>
                        {pagination.total}
                    </strong>

                    <span>
                        Complaints
                    </span>
                </div>

            </div>


            {/* ERROR */}

            {error && (
                <div className="complaints-error">
                    {error}
                </div>
            )}


            {/* MAIN CARD */}

            <div className="complaints-card">

                {/* TOOLBAR */}

                <div className="complaints-toolbar">

                    <div className="complaints-search">

                        <span>
                            ⌕
                        </span>

                        <input
                            type="text"
                            placeholder="Search complaint..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                        />

                    </div>


                    <div className="complaints-filter">

                        <label htmlFor="complaint-status">
                            Status
                        </label>

                        <select
                            id="complaint-status"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >

                            <option value="all">
                                All Status
                            </option>

                            <option value="pending">
                                Pending
                            </option>

                            <option value="under_review">
                                Under Review
                            </option>

                            <option value="resolved">
                                Resolved
                            </option>

                            <option value="dismissed">
                                Dismissed
                            </option>

                        </select>

                    </div>

                </div>


                {/* TABLE */}

                {loading ? (

                    <div className="complaints-loading">
                        Loading complaints...
                    </div>

                ) : (
                    <>
                    <div className="complaints-table-wrapper">

                        <table className="complaints-table">

                            <thead>

                                <tr>

                                    <th>
                                        Complaint
                                    </th>

                                    <th>
                                        Complainant
                                    </th>

                                    <th>
                                        Respondent
                                    </th>

                                    <th>
                                        Category
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Submitted
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {complaints.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="complaints-empty"
                                        >
                                            No complaints found.
                                        </td>

                                    </tr>

                                ) : (

                                    complaints.map(
                                        (complaint) => (

                                            <tr
                                                key={
                                                    complaint.id
                                                }
                                            >

                                                {/* COMPLAINT */}

                                                <td>

                                                    <div className="complaint-title">

                                                        <strong>
                                                            {complaint.subject ||
                                                                "Untitled Complaint"}
                                                        </strong>

                                                        <span>
                                                            #{complaint.id}
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* COMPLAINANT */}

                                                <td>
                                                    {getFullName(
                                                        complaint.complainant
                                                    )}
                                                </td>


                                                {/* RESPONDENT */}

                                                <td>
                                                    {getFullName(
                                                        complaint.respondent
                                                    )}
                                                </td>


                                                {/* CATEGORY */}

                                                <td>
                                                    {complaint.category ||
                                                        "—"}
                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <span
                                                        className={`complaint-status ${getStatusClass(
                                                            complaint.status
                                                        )}`}
                                                    >

                                                        <span />

                                                        {formatStatus(
                                                            complaint.status
                                                        )}

                                                    </span>

                                                </td>


                                                {/* DATE */}

                                                <td>
                                                    {formatDate(
                                                        complaint.created_at
                                                    )}
                                                </td>


                                                {/* ACTION */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="complaint-view-button"
                                                        onClick={() =>
                                                            handleViewComplaint(
                                                                complaint
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                    {pagination.total > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={fetchComplaints}
                        />
                    )}
                    </>
                )}

            </div>


            {/* =========================================
                COMPLAINT DETAILS MODAL
            ========================================= */}

            {selectedComplaint && (

                <div
                    className="complaint-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                                event.currentTarget &&
                            !actionLoading
                        ) {
                            closeDetails();
                        }

                    }}
                >

                    <div
                        className="complaint-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="complaint-modal-header">

                            <div>

                                <span>
                                    COMPLAINT CASE
                                </span>

                                <h2>
                                    Complaint Details
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeDetails
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                ×
                            </button>

                        </div>


                        {detailsLoading ? (

                            <div className="complaints-loading">
                                Loading complaint details...
                            </div>

                        ) : (

                            <>

                                {/* CASE SUMMARY */}

                                <div className="complaint-summary">

                                    <div>

                                        <span>
                                            Case ID
                                        </span>

                                        <strong>
                                            #{selectedComplaint.id}
                                        </strong>

                                    </div>

                                    <div>

                                        <span>
                                            Status
                                        </span>

                                        <strong>
                                            {formatStatus(
                                                selectedComplaint.status
                                            )}
                                        </strong>

                                    </div>

                                    <div>

                                        <span>
                                            Category
                                        </span>

                                        <strong>
                                            {selectedComplaint.category ||
                                                "—"}
                                        </strong>

                                    </div>

                                    <div>

                                        <span>
                                            Submitted
                                        </span>

                                        <strong>
                                            {formatDate(
                                                selectedComplaint.created_at
                                            )}
                                        </strong>

                                    </div>

                                </div>


                                {/* PEOPLE */}

                                <section className="complaint-detail-section">

                                    <h4>
                                        Parties Involved
                                    </h4>

                                    <div className="complaint-people-grid">

                                        <div>

                                            <span>
                                                Complainant
                                            </span>

                                            <strong>
                                                {getFullName(
                                                    selectedComplaint.complainant
                                                )}
                                            </strong>

                                            <small>
                                                {selectedComplaint
                                                    .complainant
                                                    ?.email ||
                                                    "—"}
                                            </small>

                                        </div>


                                        <div>

                                            <span>
                                                Respondent
                                            </span>

                                            <strong>
                                                {getFullName(
                                                    selectedComplaint.respondent
                                                )}
                                            </strong>

                                            <small>
                                                {selectedComplaint
                                                    .respondent
                                                    ?.email ||
                                                    "—"}
                                            </small>

                                        </div>

                                    </div>

                                </section>


                                {/* COMPLAINT INFORMATION */}

                                <section className="complaint-detail-section">

                                    <h4>
                                        Complaint Information
                                    </h4>

                                    <div className="complaint-information">

                                        <div>

                                            <span>
                                                Subject
                                            </span>

                                            <strong>
                                                {selectedComplaint.subject ||
                                                    "—"}
                                            </strong>

                                        </div>

                                        <div>

                                            <span>
                                                Description
                                            </span>

                                            <p>
                                                {selectedComplaint.description ||
                                                    "No description provided."}
                                            </p>

                                        </div>

                                    </div>

                                </section>


                                {/* SUPPORTING EVIDENCE */}

                                <section className="complaint-detail-section">

                                    <h4>
                                        Supporting Evidence
                                    </h4>

                                    {selectedComplaint.evidence_path ? (

                                        <a
                                            className="complaint-evidence-button"
                                            href={
                                                selectedComplaint.evidence_path
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View Supporting Evidence
                                        </a>

                                    ) : (

                                        <p className="complaint-no-evidence">
                                            No supporting evidence submitted.
                                        </p>

                                    )}

                                </section>


                                {/* ADMIN NOTES */}

                                {selectedComplaint.admin_notes && (

                                    <section className="complaint-detail-section">

                                        <h4>
                                            Admin Notes / Resolution
                                        </h4>

                                        <p className="complaint-admin-notes">
                                            {
                                                selectedComplaint.admin_notes
                                            }
                                        </p>

                                    </section>

                                )}


                                {/* ACTIONS */}

                                {selectedComplaint.status !==
                                    "resolved" &&
                                    selectedComplaint.status !==
                                        "dismissed" && (

                                    <div className="complaint-modal-actions">

                                        {selectedComplaint.status ===
                                            "pending" && (

                                            <button
                                                type="button"
                                                className="complaint-review-button"
                                                onClick={() =>
                                                    openActionModal(
                                                        "review"
                                                    )
                                                }
                                                disabled={
                                                    actionLoading
                                                }
                                            >
                                                Mark Under Review
                                            </button>

                                        )}


                                        <button
                                            type="button"
                                            className="complaint-dismiss-button"
                                            onClick={() =>
                                                openActionModal(
                                                    "dismiss"
                                                )
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Dismiss
                                        </button>


                                        <button
                                            type="button"
                                            className="complaint-resolve-button"
                                            onClick={() =>
                                                openActionModal(
                                                    "resolve"
                                                )
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Resolve
                                        </button>

                                    </div>

                                )}

                            </>

                        )}

                    </div>

                </div>

            )}


            {/* =========================================
                ACTION CONFIRMATION MODAL
            ========================================= */}

            {actionModal && selectedComplaint && (

                <div
                    className="complaint-action-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                                event.currentTarget &&
                            !actionLoading
                        ) {
                            closeActionModal();
                        }

                    }}
                >

                    <div
                        className="complaint-action-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div
                            className={`complaint-action-icon ${
                                actionModal === "resolve"
                                    ? "resolve"
                                    : actionModal === "review"
                                    ? "review"
                                    : "dismiss"
                            }`}
                        >
                            {actionModal ===
                            "resolve"
                                ? "✓"
                                : actionModal ===
                                  "review"
                                ? "!"
                                : "×"}
                        </div>


                        <h3>

                            {actionModal ===
                            "resolve"
                                ? "Resolve Complaint?"
                                : actionModal ===
                                  "review"
                                ? "Mark Under Review?"
                                : "Dismiss Complaint?"}

                        </h3>


                        <p>

                            {actionModal ===
                            "resolve" ? (

                                <>
                                    You are resolving complaint{" "}
                                    <strong>
                                        #{selectedComplaint.id}
                                    </strong>
                                    .
                                </>

                            ) : actionModal ===
                              "review" ? (

                                <>
                                    Complaint{" "}
                                    <strong>
                                        #{selectedComplaint.id}
                                    </strong>{" "}
                                    will be marked as under
                                    review.
                                </>

                            ) : (

                                <>
                                    Are you sure you want to
                                    dismiss complaint{" "}
                                    <strong>
                                        #{selectedComplaint.id}
                                    </strong>
                                    ?
                                </>

                            )}

                        </p>


                        {/* RESOLUTION NOTES */}

                        {actionModal ===
                            "resolve" && (

                            <div className="complaint-notes-field">

                                <label htmlFor="admin-notes">
                                    Resolution Notes
                                </label>

                                <textarea
                                    id="admin-notes"
                                    rows="5"
                                    placeholder="Enter the resolution or action taken..."
                                    value={
                                        adminNotes
                                    }
                                    onChange={(event) =>
                                        setAdminNotes(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                        )}


                        {/* ACTION BUTTONS */}

                        <div className="complaint-action-buttons">

                            <button
                                type="button"
                                className="complaint-action-cancel"
                                onClick={
                                    closeActionModal
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                Cancel
                            </button>


                            {actionModal ===
                                "resolve" ? (

                                <button
                                    type="button"
                                    className="complaint-action-confirm resolve"
                                    onClick={
                                        confirmResolve
                                    }
                                    disabled={
                                        actionLoading ||
                                        !adminNotes.trim()
                                    }
                                >
                                    {actionLoading
                                        ? "Resolving..."
                                        : "Resolve Complaint"}
                                </button>

                            ) : (

                                <button
                                    type="button"
                                    className={`complaint-action-confirm ${
                                        actionModal
                                    }`}
                                    onClick={
                                        confirmStatusUpdate
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >
                                    {actionLoading
                                        ? "Processing..."
                                        : actionModal ===
                                          "review"
                                        ? "Mark Under Review"
                                        : "Dismiss Complaint"}
                                </button>

                            )}

                        </div>

                    </div>

                </div>

            )}


            {/* =========================================
                SUCCESS MODAL
            ========================================= */}

            {successModal && (

                <div
                    className="complaint-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeSuccessModal();
                        }

                    }}
                >

                    <div
                        className="complaint-success-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="complaint-success-icon">
                            ✓
                        </div>

                        <h3>
                            Success
                        </h3>

                        <p>
                            {successModal}
                        </p>

                        <button
                            type="button"
                            onClick={
                                closeSuccessModal
                            }
                        >
                            Done
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
}

function Pagination({ pagination, onPageChange }) {
    return (
        <div className="complaints-pagination">
            <div className="complaints-pagination-info">
                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total}</strong>
            </div>
            <div className="complaints-pagination-controls">
                <button type="button" className="complaints-pagination-button" disabled={pagination.current_page === 1} onClick={() => onPageChange(pagination.current_page - 1)}>← Previous</button>
                <div className="complaints-pagination-pages">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button type="button" key={page} className={`complaints-pagination-page ${page === pagination.current_page ? "active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
                    ))}
                </div>
                <button type="button" className="complaints-pagination-button" disabled={pagination.current_page === pagination.last_page} onClick={() => onPageChange(pagination.current_page + 1)}>Next →</button>
            </div>
        </div>
    );
}

export default Complaints;
