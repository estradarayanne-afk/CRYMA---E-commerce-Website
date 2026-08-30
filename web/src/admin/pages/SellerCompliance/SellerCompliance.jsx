import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./SellerCompliance.css";

function SellerCompliance() {
    const [sellers, setSellers] = useState([]);
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

    const [selectedSeller, setSelectedSeller] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    // Modal states
    const [actionModal, setActionModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [successModal, setSuccessModal] = useState("");

    // =========================================
    // FETCH SELLERS
    // =========================================

    const fetchSellers = useCallback(async (page = 1) => {
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

            const response = await api.get(
                "/admin/seller-compliance",
                {
                    params,
                }
            );

            const data = response.data.data;

            setSellers(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 10,
                total: data?.total || 0,
            });
        } catch (err) {
            console.error(
                "Seller compliance API error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load seller compliance records."
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSellers();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchSellers]);

    // =========================================
    // HELPERS
    // =========================================

    const getFullName = (seller) => {
        return [
            seller.first_name,
            seller.middle_name,
            seller.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unnamed Seller";
    };

    const getInitials = (seller) => {
        const initials =
            `${seller.first_name?.[0] || ""}${seller.last_name?.[0] || ""}`;

        return initials.toUpperCase() || "S";
    };

    const getStatusClass = (status) => {
        const normalized = status?.toLowerCase();

        if (normalized === "active") {
            return "active";
        }

        if (
            normalized === "rejected" ||
            normalized === "suspended"
        ) {
            return "inactive";
        }

        return "pending";
    };

    // =========================================
    // VIEW SELLER DETAILS
    // =========================================

    const handleViewSeller = async (seller) => {
        setSelectedSeller(seller);
        setDetailsLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/seller-compliance/${seller.id}`
            );

            setSelectedSeller(response.data.data);
        } catch (err) {
            console.error(
                "Seller details error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load seller details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    // =========================================
    // CLOSE SELLER DETAILS
    // =========================================

    const closeSellerDetails = () => {
        if (actionLoading) return;

        setSelectedSeller(null);
        setError("");
    };

    // =========================================
    // OPEN APPROVE MODAL
    // =========================================

    const openApproveModal = () => {
        if (!selectedSeller || actionLoading) return;

        setError("");
        setActionModal("approve");
    };

    // =========================================
    // OPEN REJECT MODAL
    // =========================================

    const openRejectModal = () => {
        if (!selectedSeller || actionLoading) return;

        setError("");
        setRejectionReason("");
        setActionModal("reject");
    };

    // =========================================
    // CLOSE ACTION MODAL
    // =========================================

    const closeActionModal = () => {
        if (actionLoading) return;

        setActionModal(null);
        setRejectionReason("");
        setError("");
    };

    // =========================================
    // APPROVE SELLER
    // =========================================

    const confirmApprove = async () => {
        if (!selectedSeller || actionLoading) return;

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/seller-compliance/${selectedSeller.id}/approve`
            );

            const updatedSeller = response.data.data;

            // Update seller in table
            setSellers((current) =>
                current.map((seller) =>
                    seller.id === updatedSeller.id
                        ? {
                            ...seller,
                            ...updatedSeller,
                        }
                        : seller
                )
            );

            // Update seller details
            setSelectedSeller((current) => ({
                ...current,
                ...updatedSeller,
            }));

            // Close action modal
            setActionModal(null);

            // Show success modal
            setSuccessModal(
                response.data.message ||
                "Seller compliance approved successfully."
            );
        } catch (err) {
            console.error(
                "Approve seller error:",
                err
            );

            setActionModal(null);

            setError(
                err.response?.data?.message ||
                "Unable to approve seller."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // REJECT SELLER
    // =========================================

    const confirmReject = async () => {
        if (!selectedSeller || actionLoading) return;

        if (!rejectionReason.trim()) {
            setError(
                "Please provide a rejection reason."
            );

            return;
        }

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/seller-compliance/${selectedSeller.id}/reject`,
                {
                    rejection_reason:
                        rejectionReason.trim(),
                }
            );

            const updatedSeller =
                response.data.data.seller;

            // Update seller in table
            setSellers((current) =>
                current.map((seller) =>
                    seller.id === updatedSeller.id
                        ? {
                            ...seller,
                            ...updatedSeller,
                        }
                        : seller
                )
            );

            // Update seller details
            setSelectedSeller((current) => ({
                ...current,
                ...updatedSeller,
            }));

            // Close action modal
            setActionModal(null);
            setRejectionReason("");

            // Show success modal
            setSuccessModal(
                response.data.message ||
                "Seller compliance rejected successfully."
            );
        } catch (err) {
            console.error(
                "Reject seller error:",
                err
            );

            setActionModal(null);

            setError(
                err.response?.data?.message ||
                "Unable to reject seller."
            );
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
        <div className="seller-compliance-page">

            {/* =========================================
                HEADER
            ========================================= */}

            <div className="seller-compliance-header">

                <div>

                    <span className="seller-compliance-eyebrow">
                        SELLER MANAGEMENT
                    </span>

                    <h1>
                        Seller Compliance
                    </h1>

                    <p>
                        Review and manage seller account compliance.
                    </p>

                </div>

                <div className="seller-compliance-count">

                    <strong>
                        {pagination.total}
                    </strong>

                    <span>
                        Sellers
                    </span>

                </div>

            </div>


            {/* =========================================
                ERROR MESSAGE
            ========================================= */}

            {error && (
                <div className="seller-compliance-error">
                    {error}
                </div>
            )}


            {/* =========================================
                MAIN CARD
            ========================================= */}

            <div className="seller-compliance-card">

                {/* TOOLBAR */}

                <div className="seller-compliance-toolbar">

                    <div className="seller-compliance-search">

                        <span>
                            ⌕
                        </span>

                        <input
                            type="text"
                            placeholder="Search seller name, email or phone..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                        />

                    </div>


                    <div className="seller-compliance-filter">

                        <label htmlFor="seller-status-filter">
                            Status
                        </label>

                        <select
                            id="seller-status-filter"
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

                            <option value="active">
                                Active
                            </option>

                            <option value="rejected">
                                Rejected
                            </option>

                            <option value="suspended">
                                Suspended
                            </option>

                        </select>

                    </div>

                </div>


                {/* =========================================
                    TABLE
                ========================================= */}

                {loading ? (

                    <div className="seller-compliance-loading">
                        Loading seller compliance records...
                    </div>

                ) : (
                    <>
                    <div className="seller-compliance-table-wrapper">

                        <table className="seller-compliance-table">

                            <thead>

                                <tr>

                                    <th>
                                        Seller
                                    </th>

                                    <th>
                                        Business
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Registered
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {sellers.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="seller-compliance-empty"
                                        >
                                            No seller records found.
                                        </td>

                                    </tr>

                                ) : (

                                    sellers.map((seller) => (

                                        <tr key={seller.id}>

                                            {/* SELLER */}

                                            <td>

                                                <div className="seller-info">

                                                    <div className="seller-avatar">

                                                        {getInitials(
                                                            seller
                                                        )}

                                                    </div>

                                                    <div>

                                                        <strong>
                                                            {getFullName(
                                                                seller
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ID #{seller.id}
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* BUSINESS */}

                                            <td>

                                                {seller
                                                    .seller_profile
                                                    ?.business_name ||
                                                    "—"}

                                            </td>


                                            {/* EMAIL */}

                                            <td>

                                                {seller.email ||
                                                    "—"}

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <span
                                                    className={`seller-status ${getStatusClass(
                                                        seller.status
                                                    )}`}
                                                >

                                                    <span />

                                                    {seller.status ||
                                                        "Unknown"}

                                                </span>

                                            </td>


                                            {/* REGISTERED */}

                                            <td>

                                                {seller.created_at
                                                    ? new Date(
                                                        seller.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}

                                            </td>


                                            {/* ACTION */}

                                            <td>

                                                <button
                                                    type="button"
                                                    className="seller-view-button"
                                                    onClick={() =>
                                                        handleViewSeller(
                                                            seller
                                                        )
                                                    }
                                                >
                                                    View
                                                </button>

                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                    {pagination.total > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={fetchSellers}
                        />
                    )}
                    </>
                )}

            </div>


            {/* =========================================
                SELLER DETAILS MODAL
            ========================================= */}

            {selectedSeller && (

                <div
                    className="seller-modal-overlay"
                    onClick={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeSellerDetails();
                        }

                    }}
                >

                    <div
                        className="seller-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="seller-modal-header">

                            <div>

                                <span>
                                    SELLER COMPLIANCE
                                </span>

                                <h2>
                                    Seller Details
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeSellerDetails
                                }
                                disabled={actionLoading}
                            >
                                ×
                            </button>

                        </div>


                        {detailsLoading ? (

                            <div className="seller-compliance-loading">
                                Loading seller details...
                            </div>

                        ) : (

                            <>

                                {/* PROFILE */}

                                <div className="seller-profile">

                                    <div className="seller-profile-avatar">

                                        {getInitials(
                                            selectedSeller
                                        )}

                                    </div>

                                    <div>

                                        <h3>
                                            {getFullName(
                                                selectedSeller
                                            )}
                                        </h3>

                                        <p>
                                            Seller
                                        </p>

                                    </div>

                                </div>


                                {/* =========================================
                                    ACCOUNT INFORMATION
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Account Information
                                    </h4>

                                    <div className="seller-detail-grid">

                                        <div>

                                            <span>
                                                Account ID
                                            </span>

                                            <strong>
                                                #{selectedSeller.id}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Status
                                            </span>

                                            <strong>
                                                {selectedSeller.status ||
                                                    "Unknown"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Email
                                            </span>

                                            <strong>
                                                {selectedSeller.email ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Phone
                                            </span>

                                            <strong>
                                                {selectedSeller.phone ||
                                                    "—"}
                                            </strong>

                                        </div>

                                    </div>

                                </section>


                                {/* =========================================
                                    BUSINESS INFORMATION
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Business Information
                                    </h4>

                                    <div className="seller-detail-grid">

                                        <div>

                                            <span>
                                                Business Name
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.business_name ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Line of Business
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.line_of_business ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Sex
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.sex ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Birthday
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.birthday
                                                    ? new Date(
                                                        selectedSeller
                                                            .seller_profile
                                                            .birthday
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </strong>

                                        </div>

                                    </div>

                                </section>


                                {/* =========================================
                                    SUBMITTED DOCUMENTS
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Submitted Documents
                                    </h4>


                                    {selectedSeller.documents?.length ? (

                                        <div className="seller-documents">

                                            {selectedSeller.documents.map(
                                                (document) => (

                                                    <div
                                                        className="seller-document"
                                                        key={document.id}
                                                    >

                                                        <div>

                                                            <strong>
                                                                {document.document_type ||
                                                                    document.original_file_name ||
                                                                    "Document"}
                                                            </strong>

                                                            <span>
                                                                {document.status ||
                                                                    "Unknown"}
                                                            </span>

                                                        </div>


                                                        <a
                                                            href={`http://127.0.0.1:8000/api/admin/documents/${document.id}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            View
                                                        </a>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    ) : (

                                        <p className="seller-no-documents">
                                            No documents submitted.
                                        </p>

                                    )}

                                </section>


                                {/* =========================================
                                    ACTION BUTTONS
                                ========================================= */}

                                {selectedSeller.status ===
                                    "pending" && (

                                    <div className="seller-modal-actions">

                                        <button
                                            type="button"
                                            className="seller-reject-button"
                                            onClick={
                                                openRejectModal
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Reject Seller
                                        </button>


                                        <button
                                            type="button"
                                            className="seller-approve-button"
                                            onClick={
                                                openApproveModal
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Approve Seller
                                        </button>

                                    </div>

                                )}

                            </>

                        )}

                    </div>

                </div>

            )}


            {/* =========================================
                APPROVE / REJECT ACTION MODAL
            ========================================= */}

            {actionModal && selectedSeller && (

                <div
                    className="seller-action-modal-overlay"
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
                        className="seller-action-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* ICON */}

                        <div
                            className={`seller-action-modal-icon ${
                                actionModal === "approve"
                                    ? "seller-action-modal-icon--approve"
                                    : "seller-action-modal-icon--reject"
                            }`}
                        >
                            {actionModal ===
                            "approve"
                                ? "✓"
                                : "!"}
                        </div>


                        {/* TITLE */}

                        <h3>

                            {actionModal ===
                            "approve"
                                ? "Approve Seller?"
                                : "Reject Seller?"}

                        </h3>


                        {/* MESSAGE */}

                        <p>

                            {actionModal ===
                            "approve" ? (

                                <>
                                    Are you sure you want to
                                    approve{" "}

                                    <strong>
                                        {getFullName(
                                            selectedSeller
                                        )}
                                    </strong>
                                    ?
                                </>

                            ) : (

                                <>
                                    Please provide a reason
                                    for rejecting{" "}

                                    <strong>
                                        {getFullName(
                                            selectedSeller
                                        )}
                                    </strong>
                                    .
                                </>

                            )}

                        </p>


                        {/* APPROVE NOTE */}

                        {actionModal ===
                            "approve" && (

                            <span className="seller-action-modal-note">

                                This seller will be approved
                                and allowed to operate as an
                                active seller.

                            </span>

                        )}


                        {/* REJECTION REASON */}

                        {actionModal ===
                            "reject" && (

                            <div className="seller-rejection-field">

                                <label htmlFor="rejection-reason">
                                    Rejection Reason
                                </label>

                                <textarea
                                    id="rejection-reason"
                                    rows="4"
                                    placeholder="Enter the reason for rejecting this seller..."
                                    value={
                                        rejectionReason
                                    }
                                    onChange={(event) =>
                                        setRejectionReason(
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

                        <div className="seller-action-modal-actions">

                            <button
                                type="button"
                                className="seller-action-cancel"
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
                            "approve" ? (

                                <button
                                    type="button"
                                    className="seller-action-confirm seller-action-confirm--approve"
                                    onClick={
                                        confirmApprove
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >

                                    {actionLoading
                                        ? "Approving..."
                                        : "Approve Seller"}

                                </button>

                            ) : (

                                <button
                                    type="button"
                                    className="seller-action-confirm seller-action-confirm--reject"
                                    onClick={
                                        confirmReject
                                    }
                                    disabled={
                                        actionLoading ||
                                        !rejectionReason.trim()
                                    }
                                >

                                    {actionLoading
                                        ? "Rejecting..."
                                        : "Reject Seller"}

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
                    className="seller-modal-overlay"
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
                        className="seller-success-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="seller-success-icon">
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
                            className="seller-success-button"
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
        <div className="seller-compliance-pagination">
            <div className="seller-compliance-pagination-info">
                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total}</strong>
            </div>
            <div className="seller-compliance-pagination-controls">
                <button type="button" className="seller-compliance-pagination-button" disabled={pagination.current_page === 1} onClick={() => onPageChange(pagination.current_page - 1)}>← Previous</button>
                <div className="seller-compliance-pagination-pages">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button type="button" key={page} className={`seller-compliance-pagination-page ${page === pagination.current_page ? "active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
                    ))}
                </div>
                <button type="button" className="seller-compliance-pagination-button" disabled={pagination.current_page === pagination.last_page} onClick={() => onPageChange(pagination.current_page + 1)}>Next →</button>
            </div>
        </div>
    );
}

export default SellerCompliance;
