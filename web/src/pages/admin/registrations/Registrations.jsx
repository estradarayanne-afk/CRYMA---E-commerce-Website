import { useEffect, useState } from "react";
import api from "../../../services/api";
import "./Registrations.css";

function Registrations() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    const [selectedDocument, setSelectedDocument] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectingDocument, setRejectingDocument] = useState(false);

    // const getProfile = (registration) => {
    //     if (registration.role === "seller") {
    //         return registration.seller_profile;
    //     }

    //     if (registration.role === "buyer") {
    //         return registration.buyer_profile;
    //     }

    //     if (registration.role === "rider") {
    //         return registration.courier_profile;
    //     }

    //     return null;
    // };

    const getAge = (birthday) => {
        if (!birthday) {
            return null;
        }

        const birthDate = new Date(birthday);
        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();

        const monthDifference = today.getMonth() - birthDate.getMonth();

        if (
            monthDifference < 0 ||
            (monthDifference === 0 && today.getDate() < birthDate.getDate())
        ) {
            age--;
        }

        return age;
    };

    const fetchRegistrations = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get(`/admin/registrations?page=${page}`);

            const paginationData = response.data.data;

            setRegistrations(paginationData.data || []);

            setPagination({
                current_page: paginationData.current_page || 1,
                last_page: paginationData.last_page || 1,
                per_page: paginationData.per_page || 10,
                total: paginationData.total || 0,
            });
        } catch (error) {
            console.error("Registration API error:", error);

            setError(error.response?.data?.message || "Unable to load account registrations.");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        if (page < 1 || page > pagination.last_page || page === pagination.current_page) {
            return;
        }

        fetchRegistrations(page);
    };

    const filteredRegistrations = registrations.filter((registration) => {
        const search = searchTerm.toLowerCase().trim();

        const fullName = [registration.first_name, registration.middle_name, registration.last_name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            fullName.includes(search) ||
            registration.email?.toLowerCase().includes(search) ||
            registration.phone?.toLowerCase().includes(search);

        const matchesRole = roleFilter === "all" || registration.role?.toLowerCase() === roleFilter;

        return matchesSearch && matchesRole;
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRegistrations();
    }, []);

    const handleApprove = async (id) => {
        const confirmed = window.confirm("Are you sure you want to approve this registration?");

        if (!confirmed) {
            return;
        }

        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(`/admin/registrations/${id}/approve`);

            setSuccess(response.data.message || "Registration approved successfully.");

            // Remove approved account from pending list
            setRegistrations((currentRegistrations) =>
                currentRegistrations.filter((registration) => registration.id !== id)
            );
        } catch (error) {
            console.error("Approve registration error:", error);

            setError(error.response?.data?.message || "Unable to approve registration.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        const confirmed = window.confirm("Are you sure you want to reject this registration?");

        if (!confirmed) {
            return;
        }

        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(`/admin/registrations/${id}/reject`);

            setSuccess(response.data.message || "Registration rejected successfully.");

            // Remove rejected account from pending list
            setRegistrations((currentRegistrations) =>
                currentRegistrations.filter((registration) => registration.id !== id)
            );
        } catch (error) {
            console.error("Reject registration error:", error);

            setError(error.response?.data?.message || "Unable to reject registration.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleViewDocument = async (document) => {
        try {
            const response = await api.get(`/admin/documents/${document.id}`, {
                responseType: "blob",
            });

            const fileUrl = URL.createObjectURL(response.data);

            const newWindow = window.open(fileUrl, "_blank");

            if (!newWindow) {
                setError("Unable to open the document. Please allow pop-ups for this site.");
                URL.revokeObjectURL(fileUrl);
                return;
            }

            setTimeout(() => {
                URL.revokeObjectURL(fileUrl);
            }, 60000);
        } catch (error) {
            console.error("View document error:", error);

            setError(
                error.response?.data?.message ||
                    "Unable to open the document."
            );
        }
    };

    const handleRejectDocument = async () => {
    if (!selectedDocument) {
        return;
    }

    const reason = rejectionReason.trim();

        if (!reason) {
            setError("Please provide a rejection reason.");
            return;
        }

        setRejectingDocument(true);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(
                `/admin/documents/${selectedDocument.id}/reject`,
                {
                    rejection_reason: reason,
                }
            );

            setSuccess(
                response.data.message || "Document rejected successfully."
            );

            setSelectedRegistration((current) => {
                if (!current) {
                    return current;
                }

                return {
                    ...current,
                    documents: current.documents.map((document) =>
                        document.id === selectedDocument.id
                            ? {
                                ...document,
                                status: "rejected",
                                rejection_reason: reason,
                            }
                            : document
                    ),
                };
            });

            setSelectedDocument(null);
            setRejectionReason("");
        } catch (error) {
            console.error("Reject document error:", error);

            setError(
                error.response?.data?.message ||
                    "Unable to reject the document."
            );
        } finally {
            setRejectingDocument(false);
        }
    };

    const handleApproveDocument = async (documentId) => {
        const confirmed = window.confirm(
            "Are you sure you want to approve this document?"
        );

        if (!confirmed) {
            return;
        }

        setError("");
        setSuccess("");

        try {
            const response = await api.patch(
                `/admin/documents/${documentId}/approve`
            );

            setSuccess(
                response.data.message || "Document approved successfully."
            );

            setSelectedRegistration((currentRegistration) => {
                if (!currentRegistration) {
                    return currentRegistration;
                }

                return {
                    ...currentRegistration,
                    documents: currentRegistration.documents.map((document) =>
                        document.id === documentId
                            ? {
                                ...document,
                                status: "approved",
                                rejection_reason: null,
                            }
                            : document
                    ),
                };
            });
        } catch (error) {
            console.error("Approve document error:", error);

            setError(
                error.response?.data?.message ||
                    "Unable to approve the document."
            );
        }
    };

    return (
        <div className="registrations-page">
            {/* PAGE HEADER */}
            <div className="registrations-header">
                <div>
                    <h1>Account Registrations</h1>

                    <p>Review and manage pending CRYMA account registrations.</p>
                </div>

                <div className="registration-count">
                    <strong>{registrations.length}</strong>
                    <span>Pending</span>
                </div>
            </div>

            {/* SUCCESS MESSAGE */}
            {success && <div className="registration-success">{success}</div>}

            {/* ERROR MESSAGE */}
            {error && <div className="registration-error">{error}</div>}

            {/* LOADING */}
            {loading ? (
                <div className="registration-loading">Loading registrations...</div>
            ) : (
                <div className="registrations-card">
                    <div className="registrations-toolbar">
                        <div className="registration-search">
                            <span className="search-icon">⌕</span>

                            <input
                                type="text"
                                placeholder="Search applicant, email or phone..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>

                        <div className="registration-filter">
                            <label htmlFor="role-filter">Role</label>

                            <select
                                id="role-filter"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="seller">Seller</option>
                                <option value="buyer">Buyer</option>
                                <option value="rider">Rider</option>
                            </select>
                        </div>
                    </div>

                    <div className="registrations-table-wrapper">
                        <table className="registrations-table">
                            <thead>
                                <tr>
                                    <th>Applicant</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Registered</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRegistrations.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="empty-registrations">
                                            No pending registrations found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map((registration) => {
                                        const isProcessing = processingId === registration.id;

                                        return (
                                            <tr key={registration.id}>
                                                {/* APPLICANT */}
                                                <td>
                                                    <div className="applicant-info">
                                                        <div className="applicant-avatar">
                                                            {registration.first_name
                                                                ?.charAt(0)
                                                                ?.toUpperCase()}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {registration.first_name}{" "}
                                                                {registration.middle_name
                                                                    ? `${registration.middle_name} `
                                                                    : ""}
                                                                {registration.last_name}
                                                            </strong>

                                                            <span>ID #{registration.id}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* EMAIL */}
                                                <td>{registration.email}</td>

                                                {/* PHONE */}
                                                <td>{registration.phone || "—"}</td>

                                                {/* ROLE */}
                                                <td>
                                                    <span
                                                        className={`role-badge role-${registration.role}`}
                                                    >
                                                        {registration.role}
                                                    </span>
                                                </td>

                                                {/* STATUS */}
                                                <td>
                                                    <span className="status-badge">
                                                        {registration.status}
                                                    </span>
                                                </td>

                                                {/* DATE */}
                                                <td>
                                                    {new Date(
                                                        registration.created_at
                                                    ).toLocaleDateString()}
                                                </td>

                                                {/* ACTIONS */}
                                                <td>
                                                    <div className="registration-actions">
                                                        <button
                                                            type="button"
                                                            className="view-button"
                                                            onClick={() =>
                                                                setSelectedRegistration(
                                                                    registration
                                                                )
                                                            }
                                                            disabled={isProcessing}
                                                        >
                                                            View
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="approve-button"
                                                            onClick={() =>
                                                                handleApprove(registration.id)
                                                            }
                                                            disabled={isProcessing}
                                                        >
                                                            {isProcessing
                                                                ? "Processing..."
                                                                : "Approve"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="reject-button"
                                                            onClick={() =>
                                                                handleReject(registration.id)
                                                            }
                                                            disabled={isProcessing}
                                                        >
                                                            {isProcessing
                                                                ? "Processing..."
                                                                : "Reject"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION */}
                    {pagination.total > 0 && (
                        <div className="registrations-pagination">
                            <div className="pagination-info">
                                Showing{" "}
                                <strong>
                                    {(pagination.current_page - 1) * pagination.per_page + 1}
                                </strong>{" "}
                                –{" "}
                                <strong>
                                    {Math.min(
                                        pagination.current_page * pagination.per_page,
                                        pagination.total
                                    )}
                                </strong>{" "}
                                of <strong>{pagination.total}</strong> registrations
                            </div>

                            <div className="pagination-controls">
                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={pagination.current_page === 1}
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                >
                                    ← Previous
                                </button>

                                <div className="pagination-pages">
                                    {Array.from(
                                        {
                                            length: pagination.last_page,
                                        },
                                        (_, index) => index + 1
                                    ).map((page) => (
                                        <button
                                            key={page}
                                            type="button"
                                            className={`pagination-page ${
                                                page === pagination.current_page ? "active" : ""
                                            }`}
                                            onClick={() => handlePageChange(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* APPLICANT DETAILS MODAL */}
            {selectedRegistration && (
                <div
                    className="registration-modal-overlay"
                    onClick={() => setSelectedRegistration(null)}
                >
                    <div
                        className="registration-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* MODAL HEADER */}
                        <div className="registration-modal-header">
                            <div>
                                <span className="modal-eyebrow">Account Registration</span>

                                <h2>Applicant Details</h2>
                            </div>

                            <button
                                type="button"
                                className="modal-close-button"
                                onClick={() => setSelectedRegistration(null)}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        {/* PROFILE */}
                        <div className="registration-profile">
                            <div className="registration-profile-avatar">
                                {selectedRegistration.first_name?.charAt(0)?.toUpperCase()}
                            </div>

                            <div>
                                <h3>
                                    {selectedRegistration.first_name}{" "}
                                    {selectedRegistration.middle_name
                                        ? `${selectedRegistration.middle_name} `
                                        : ""}
                                    {selectedRegistration.last_name}
                                </h3>

                                <div className="registration-profile-meta">
                                    <span>{selectedRegistration.role}</span>

                                    <span>•</span>

                                    <span>{selectedRegistration.status}</span>
                                </div>
                            </div>
                        </div>

                        {selectedDocument && (
                            <div
                                className="registration-modal-overlay"
                                onClick={() => {
                                    if (!rejectingDocument) {
                                        setSelectedDocument(null);
                                        setRejectionReason("");
                                    }
                                }}
                            >
                                <div
                                    className="registration-modal document-rejection-modal"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="registration-modal-header">
                                        <div>
                                            <span className="modal-eyebrow">
                                                Document Review
                                            </span>

                                            <h2>Reject Document</h2>
                                        </div>

                                        <button
                                            type="button"
                                            className="modal-close-button"
                                            onClick={() => {
                                                if (!rejectingDocument) {
                                                    setSelectedDocument(null);
                                                    setRejectionReason("");
                                                }
                                            }}
                                            disabled={rejectingDocument}
                                            aria-label="Close"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    <div className="document-rejection-content">
                                        <p>
                                            You are rejecting:
                                        </p>

                                        <strong>
                                            {selectedDocument.original_file_name ||
                                                "Submitted document"}
                                        </strong>

                                        <label htmlFor="rejection-reason">
                                            Rejection Reason
                                        </label>

                                        <textarea
                                            id="rejection-reason"
                                            value={rejectionReason}
                                            onChange={(event) =>
                                                setRejectionReason(event.target.value)
                                            }
                                            placeholder="Explain why this document is being rejected..."
                                            rows={5}
                                            disabled={rejectingDocument}
                                        />
                                    </div>

                                    <div className="registration-modal-actions">
                                        <button
                                            type="button"
                                            className="modal-cancel-button"
                                            onClick={() => {
                                                setSelectedDocument(null);
                                                setRejectionReason("");
                                            }}
                                            disabled={rejectingDocument}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            className="reject-button"
                                            onClick={handleRejectDocument}
                                            disabled={
                                                rejectingDocument ||
                                                !rejectionReason.trim()
                                            }
                                        >
                                            {rejectingDocument
                                                ? "Rejecting..."
                                                : "Reject Document"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PERSONAL INFORMATION */}
                        <section className="registration-detail-section">
                            <h4>Personal Information</h4>

                            <div className="registration-detail-grid">
                                <div className="registration-detail-item">
                                    <span>First Name</span>
                                    <strong>{selectedRegistration.first_name}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Middle Name</span>
                                    <strong>{selectedRegistration.middle_name || "—"}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Last Name</span>
                                    <strong>{selectedRegistration.last_name}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Sex</span>

                                    <strong>
                                        {selectedRegistration.role === "seller"
                                            ? selectedRegistration.seller_profile?.sex || "—"
                                            : selectedRegistration.role === "buyer"
                                            ? selectedRegistration.buyer_profile?.sex || "—"
                                            : selectedRegistration.role === "rider"
                                                ? selectedRegistration.courier_profile?.sex || "—"
                                                : "—"}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Birthday</span>

                                    <strong>
                                        {selectedRegistration.role === "seller"
                                            ? selectedRegistration.seller_profile?.birthday
                                                ? new Date(
                                                    selectedRegistration.seller_profile.birthday
                                                ).toLocaleDateString()
                                                : "—"
                                            : selectedRegistration.role === "buyer"
                                            ? selectedRegistration.buyer_profile?.birthday
                                                ? new Date(
                                                        selectedRegistration.buyer_profile.birthday
                                                    ).toLocaleDateString()
                                                : "—"
                                            : selectedRegistration.role === "rider"
                                                ? selectedRegistration.courier_profile?.birthday
                                                    ? new Date(
                                                        selectedRegistration.courier_profile.birthday
                                                    ).toLocaleDateString()
                                                    : "—"
                                                : "—"}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Age</span>

                                    <strong>
                                        {selectedRegistration.role === "seller"
                                            ? getAge(selectedRegistration.seller_profile?.birthday) ?? "—"
                                            : selectedRegistration.role === "buyer"
                                            ? getAge(selectedRegistration.buyer_profile?.birthday) ?? "—"
                                            : selectedRegistration.role === "rider"
                                                ? getAge(selectedRegistration.courier_profile?.birthday) ?? "—"
                                                : "—"}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        {/* CONTACT INFORMATION */}
                        <section className="registration-detail-section">
                            <h4>Contact Information</h4>

                            <div className="registration-detail-grid">
                                <div className="registration-detail-item">
                                    <span>Email Address</span>
                                    <strong>{selectedRegistration.email}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Phone Number</span>
                                    <strong>{selectedRegistration.phone || "—"}</strong>
                                </div>
                            </div>
                        </section>

                        {/* ADDRESS */}
                        <section className="registration-detail-section">
                            <h4>Address</h4>

                            {selectedRegistration.addresses?.length > 0 ? (
                                <div className="registration-detail-grid">
                                    <div className="registration-detail-item">
                                        <span>Province</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].province || "—"}
                                        </strong>
                                    </div>

                                    <div className="registration-detail-item">
                                        <span>Municipality</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].municipality || "—"}
                                        </strong>
                                    </div>

                                    <div className="registration-detail-item">
                                        <span>Barangay</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].barangay || "—"}
                                        </strong>
                                    </div>

                                    <div className="registration-detail-item">
                                        <span>Street</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].street || "—"}
                                        </strong>
                                    </div>

                                    <div className="registration-detail-item">
                                        <span>House Number</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].house_number || "—"}
                                        </strong>
                                    </div>

                                    <div className="registration-detail-item">
                                        <span>Postal Code</span>

                                        <strong>
                                            {selectedRegistration.addresses[0].postal_code || "—"}
                                        </strong>
                                    </div>
                                </div>
                            ) : (
                                <p className="registration-empty-detail">
                                    No address information submitted yet.
                                </p>
                            )}
                        </section>

                        {selectedRegistration.role === "seller" &&
                            selectedRegistration.seller_profile && (
                                <section className="registration-detail-section">
                                    <h4>Seller Information</h4>

                                    <div className="registration-detail-grid">
                                        <div className="registration-detail-item">
                                            <span>Business Name</span>

                                            <strong>
                                                {selectedRegistration.seller_profile.business_name || "—"}
                                            </strong>
                                        </div>

                                        <div className="registration-detail-item">
                                            <span>Line of Business</span>

                                            <strong>
                                                {selectedRegistration.seller_profile.line_of_business || "—"}
                                            </strong>
                                        </div>
                                    </div>
                                </section>
                            )}


                            {selectedRegistration.role === "rider" &&
                                selectedRegistration.courier_profile && (
                                    <section className="registration-detail-section">
                                        <h4>Courier Information</h4>

                                        {selectedRegistration.courier_profile.vehicles?.length > 0 ? (
                                            <div className="registration-detail-grid">
                                                {selectedRegistration.courier_profile.vehicles.map(
                                                    (vehicle) => (
                                                        <div
                                                            className="registration-detail-item"
                                                            key={vehicle.id}
                                                        >
                                                            <span>
                                                                {vehicle.vehicle_type}
                                                            </span>

                                                            <strong>
                                                                {vehicle.plate_number}
                                                            </strong>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="registration-empty-detail">
                                                No vehicle information submitted yet.
                                            </p>
                                        )}
                                    </section>
                                )}

                        {/* ACCOUNT INFORMATION */}
                        <section className="registration-detail-section">
                            <h4>Account Information</h4>

                            <div className="registration-detail-grid">
                                <div className="registration-detail-item">
                                    <span>Account ID</span>
                                    <strong>#{selectedRegistration.id}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Role</span>
                                    <strong>{selectedRegistration.role}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Status</span>
                                    <strong>{selectedRegistration.status}</strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Registered</span>
                                    <strong>
                                        {new Date(
                                            selectedRegistration.created_at
                                        ).toLocaleDateString()}
                                    </strong>
                                </div>
                            </div>
                        </section>

                        {/* SUBMITTED DOCUMENTS */}
                        <section className="registration-detail-section">
                            <h4>Submitted Documents</h4>

                            {selectedRegistration.documents?.length > 0 ? (
                                <div className="registration-documents">
                                    {selectedRegistration.documents.map((document) => (
                                        <div
                                            className="registration-document-item"
                                            key={document.id}
                                        >
                                            <div className="registration-document-info">
                                                <div className="registration-document-icon">
                                                    DOC
                                                </div>

                                                <div>
                                                    <strong>
                                                        {document.document_type
                                                            ?.replaceAll("_", " ")
                                                            .replace(/\b\w/g, (letter) =>
                                                                letter.toUpperCase()
                                                            )}
                                                    </strong>

                                                    <span>
                                                        {document.original_file_name || "Submitted document"}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="view-document-button"
                                                onClick={() => handleViewDocument(document)}
                                            >
                                                View Document
                                            </button>

                                            <button
                                                type="button"
                                                className="approve-button"
                                                onClick={() => handleApproveDocument(document.id)}
                                                disabled={document.status !== "pending"}
                                            >
                                                {document.status === "approved" ? "Approved" : "Approve"}
                                            </button>

                                            <button
                                                type="button"
                                                className="reject-button"
                                                onClick={() => {
                                                    setSelectedDocument(document);
                                                    setRejectionReason("");
                                                    setError("");
                                                }}
                                                disabled={document.status !== "pending"}
                                            >
                                                {document.status === "rejected" ? "Rejected" : "Reject"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-documents">
                                    No documents submitted.
                                </p>
                            )}
                        </section>

                        {/* ACTIONS */}
                        <div className="registration-modal-actions">
                            <button
                                type="button"
                                className="modal-cancel-button"
                                onClick={() => setSelectedRegistration(null)}
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                className="reject-button"
                                onClick={() => {
                                    setSelectedRegistration(null);
                                    handleReject(selectedRegistration.id);
                                }}
                            >
                                Reject
                            </button>

                            <button
                                type="button"
                                className="approve-button"
                                onClick={() => {
                                    setSelectedRegistration(null);
                                    handleApprove(selectedRegistration.id);
                                }}
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Registrations;
