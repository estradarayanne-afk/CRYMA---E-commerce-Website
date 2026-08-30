
import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Registrations.css";

function Registrations() {
    const [registrations, setRegistrations] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    const [rejectionReason, setRejectionReason] = useState("");
    const [rejectingDocument, setRejectingDocument] = useState(false);

    const [confirmationModal, setConfirmationModal] = useState({
        open: false,
        action: null,
        registration: null,
    });

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =========================================================
    // HELPERS
    // =========================================================

    const getProfile = (registration) => ({
        seller: registration.seller_profile,
        buyer: registration.buyer_profile,
        rider: registration.courier_profile,
    }[registration.role]);

    const getAge = (birthday) => {
        if (!birthday) return null;

        const birth = new Date(birthday);
        const today = new Date();

        let age = today.getFullYear() - birth.getFullYear();

        if (
            today.getMonth() < birth.getMonth() ||
            (today.getMonth() === birth.getMonth() &&
                today.getDate() < birth.getDate())
        ) {
            age--;
        }

        return age;
    };

    const formatDate = (date) =>
        date ? new Date(date).toLocaleDateString() : "—";

    const showError = (error, fallback) =>
        setError(error.response?.data?.message || fallback);

    // =========================================================
    // FETCH REGISTRATIONS
    // =========================================================

    const fetchRegistrations = useCallback(async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const { data } = await api.get(
                `/admin/registrations?page=${page}`
            );

            const p = data.data;

            setRegistrations(p.data || []);

            setPagination({
                current_page: p.current_page || 1,
                last_page: p.last_page || 1,
                per_page: p.per_page || 10,
                total: p.total || 0,
            });
        } catch (error) {
            console.error(error);
            showError(
                error,
                "Unable to load account registrations."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchRegistrations();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchRegistrations]);

    // =========================================================
    // REGISTRATION ACTIONS
    // =========================================================

    const updateRegistration = async (id, action) => {
        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const { data } = await api.patch(
                `/admin/registrations/${id}/${action}`
            );

            setSuccess(
                data.message ||
                    `Registration ${action}d successfully.`
            );

            setRegistrations((items) =>
                items.filter((item) => item.id !== id)
            );

            setSelectedRegistration(null);
        } catch (error) {
            console.error(error);

            showError(
                error,
                `Unable to ${action} registration.`
            );
        } finally {
            setProcessingId(null);
        }
    };

    // =========================================================
    // CONFIRMATION MODAL
    // =========================================================

    const openConfirmationModal = (registration, action) => {
        setConfirmationModal({
            open: true,
            action,
            registration,
        });
    };

    const closeConfirmationModal = () => {
        if (processingId) return;

        setConfirmationModal({
            open: false,
            action: null,
            registration: null,
        });
    };

    const confirmRegistrationAction = async () => {
        const { registration, action } = confirmationModal;

        if (!registration || !action) return;

        await updateRegistration(
            registration.id,
            action
        );

        setConfirmationModal({
            open: false,
            action: null,
            registration: null,
        });
    };

    // =========================================================
    // DOCUMENT ACTIONS
    // =========================================================

    const updateDocument = async (
        id,
        action,
        body = {}
    ) => {
        try {
            const { data } = await api.patch(
                `/admin/documents/${id}/${action}`,
                body
            );

            setSuccess(
                data.message ||
                    `Document ${action}d successfully.`
            );

            setSelectedRegistration((current) =>
                current
                    ? {
                          ...current,
                          documents:
                              current.documents.map(
                                  (doc) =>
                                      doc.id === id
                                          ? {
                                                ...doc,
                                                status:
                                                    action ===
                                                    "approve"
                                                        ? "approved"
                                                        : "rejected",
                                                rejection_reason:
                                                    body.rejection_reason ||
                                                    null,
                                            }
                                          : doc
                              ),
                      }
                    : current
            );
        } catch (error) {
            console.error(error);

            showError(
                error,
                `Unable to ${action} the document.`
            );
        }
    };

    const handleRejectDocument = async () => {
        const reason = rejectionReason.trim();

        if (!selectedDocument) return;

        if (!reason) {
            setError(
                "Please provide a rejection reason."
            );
            return;
        }

        setRejectingDocument(true);
        setError("");
        setSuccess("");

        await updateDocument(
            selectedDocument.id,
            "reject",
            {
                rejection_reason: reason,
            }
        );

        setSelectedDocument(null);
        setRejectionReason("");
        setRejectingDocument(false);
    };

    const handleViewDocument = async (document) => {
        try {
            const { data } = await api.get(
                `/admin/documents/${document.id}`,
                {
                    responseType: "blob",
                }
            );

            const url = URL.createObjectURL(data);
            const win = window.open(
                url,
                "_blank"
            );

            if (!win) {
                setError(
                    "Please allow pop-ups for this site."
                );

                URL.revokeObjectURL(url);
            } else {
                setTimeout(
                    () => URL.revokeObjectURL(url),
                    60000
                );
            }
        } catch (error) {
            console.error(error);

            showError(
                error,
                "Unable to open the document."
            );
        }
    };

    // =========================================================
    // SEARCH / FILTER
    // =========================================================

    const filteredRegistrations =
        registrations.filter((registration) => {
            const search =
                searchTerm.toLowerCase().trim();

            const name = [
                registration.first_name,
                registration.middle_name,
                registration.last_name,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !search ||
                name.includes(search) ||
                registration.email
                    ?.toLowerCase()
                    .includes(search) ||
                registration.phone
                    ?.toLowerCase()
                    .includes(search);

            const matchesRole =
                roleFilter === "all" ||
                registration.role
                    ?.toLowerCase() === roleFilter;

            return (
                matchesSearch &&
                matchesRole
            );
        });

    return (
        <div className="registrations-page">

            {/* =====================================================
                PAGE HEADER
            ===================================================== */}

            <div className="registrations-header">
                <div>
                    <h1>
                        Account Registrations
                    </h1>

                    <p>
                        Review and manage pending CRYMA
                        account registrations.
                    </p>
                </div>

                <div className="registration-count">
                    <strong>
                        {registrations.length}
                    </strong>

                    <span>
                        Pending
                    </span>
                </div>
            </div>

            {/* =====================================================
                MESSAGES
            ===================================================== */}

            {success && (
                <div className="registration-success">
                    {success}
                </div>
            )}

            {error && (
                <div className="registration-error">
                    {error}
                </div>
            )}

            {/* =====================================================
                LOADING / TABLE
            ===================================================== */}

            {loading ? (
                <div className="registration-loading">
                    Loading registrations...
                </div>
            ) : (
                <div className="registrations-card">

                    {/* TOOLBAR */}

                    <div className="registrations-toolbar">

                        <div className="registration-search">
                            <span className="search-icon">
                                ⌕
                            </span>

                            <input
                                placeholder="Search applicant, email or phone..."
                                value={searchTerm}
                                onChange={(e) =>
                                    setSearchTerm(
                                        e.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="registration-filter">
                            <label>
                                Role
                            </label>

                            <select
                                value={roleFilter}
                                onChange={(e) =>
                                    setRoleFilter(
                                        e.target.value
                                    )
                                }
                            >
                                <option value="all">
                                    All Roles
                                </option>

                                <option value="seller">
                                    Seller
                                </option>

                                <option value="buyer">
                                    Buyer
                                </option>

                                <option value="rider">
                                    Rider
                                </option>
                            </select>
                        </div>
                    </div>

                    {/* TABLE */}

                    <div className="registrations-table-wrapper">
                        <table className="registrations-table">

                            <thead>
                                <tr>
                                    <th>
                                        Applicant
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Phone
                                    </th>

                                    <th>
                                        Role
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Registered
                                    </th>

                                    <th>
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {!filteredRegistrations.length ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="empty-registrations"
                                        >
                                            No pending
                                            registrations
                                            found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map(
                                        (registration) => {

                                            const processing =
                                                processingId ===
                                                registration.id;

                                            return (
                                                <tr
                                                    key={
                                                        registration.id
                                                    }
                                                >

                                                    {/* APPLICANT */}

                                                    <td>
                                                        <div className="applicant-info">

                                                            <div className="applicant-avatar">
                                                                {registration.first_name
                                                                    ?.charAt(
                                                                        0
                                                                    )
                                                                    ?.toUpperCase()}
                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {
                                                                        registration.first_name
                                                                    }{" "}
                                                                    {
                                                                        registration.middle_name
                                                                    }{" "}
                                                                    {
                                                                        registration.last_name
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    ID #
                                                                    {
                                                                        registration.id
                                                                    }
                                                                </span>
                                                            </div>

                                                        </div>
                                                    </td>

                                                    {/* EMAIL */}

                                                    <td>
                                                        {
                                                            registration.email
                                                        }
                                                    </td>

                                                    {/* PHONE */}

                                                    <td>
                                                        {
                                                            registration.phone ||
                                                            "—"
                                                        }
                                                    </td>

                                                    {/* ROLE */}

                                                    <td>
                                                        <span
                                                            className={`role-badge role-${registration.role}`}
                                                        >
                                                            {
                                                                registration.role
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* STATUS */}

                                                    <td>
                                                        <span className="status-badge">
                                                            {
                                                                registration.status
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* REGISTERED */}

                                                    <td>
                                                        {formatDate(
                                                            registration.created_at
                                                        )}
                                                    </td>

                                                    {/* ACTIONS */}

                                                    <td>
                                                        <div className="registration-actions">

                                                            <button
                                                                className="view-button"
                                                                onClick={() =>
                                                                    setSelectedRegistration(
                                                                        registration
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>

                                                            <button
                                                                className="approve-button"
                                                                disabled={
                                                                    processing
                                                                }
                                                                onClick={() =>
                                                                    openConfirmationModal(
                                                                        registration,
                                                                        "approve"
                                                                    )
                                                                }
                                                            >
                                                                {processing
                                                                    ? "Processing..."
                                                                    : "Approve"}
                                                            </button>

                                                            <button
                                                                className="reject-button"
                                                                disabled={
                                                                    processing
                                                                }
                                                                onClick={() =>
                                                                    openConfirmationModal(
                                                                        registration,
                                                                        "reject"
                                                                    )
                                                                }
                                                            >
                                                                {processing
                                                                    ? "Processing..."
                                                                    : "Reject"}
                                                            </button>

                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
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
                                    {(pagination.current_page -
                                        1) *
                                        pagination.per_page +
                                        1}
                                </strong>{" "}
                                –{" "}
                                <strong>
                                    {Math.min(
                                        pagination.current_page *
                                            pagination.per_page,
                                        pagination.total
                                    )}
                                </strong>{" "}
                                of{" "}
                                <strong>
                                    {pagination.total}
                                </strong>
                            </div>

                            <div className="pagination-controls">

                                <button
                                    className="pagination-button"
                                    disabled={
                                        pagination.current_page ===
                                        1
                                    }
                                    onClick={() =>
                                        fetchRegistrations(
                                            pagination.current_page -
                                                1
                                        )
                                    }
                                >
                                    ← Previous
                                </button>

                                <div className="pagination-pages">

                                    {Array.from(
                                        {
                                            length:
                                                pagination.last_page,
                                        },
                                        (_, i) => i + 1
                                    ).map((page) => (
                                        <button
                                            key={page}
                                            className={`pagination-page ${
                                                page ===
                                                pagination.current_page
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                fetchRegistrations(
                                                    page
                                                )
                                            }
                                        >
                                            {page}
                                        </button>
                                    ))}

                                </div>

                                <button
                                    className="pagination-button"
                                    disabled={
                                        pagination.current_page ===
                                        pagination.last_page
                                    }
                                    onClick={() =>
                                        fetchRegistrations(
                                            pagination.current_page +
                                                1
                                        )
                                    }
                                >
                                    Next →
                                </button>

                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* =====================================================
                REGISTRATION DETAILS MODAL
            ===================================================== */}

            {selectedRegistration && (
                <div
                    className="registration-modal-overlay"
                    onClick={() =>
                        setSelectedRegistration(null)
                    }
                >

                    <div
                        className="registration-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* HEADER */}

                        <div className="registration-modal-header">

                            <div>
                                <span className="modal-eyebrow">
                                    Account Registration
                                </span>

                                <h2>
                                    Applicant Details
                                </h2>
                            </div>

                            <button
                                className="modal-close-button"
                                onClick={() =>
                                    setSelectedRegistration(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>

                        {/* PROFILE */}

                        <div className="registration-profile">

                            <div className="registration-profile-avatar">
                                {selectedRegistration.first_name
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                            </div>

                            <div>

                                <h3>
                                    {
                                        selectedRegistration.first_name
                                    }{" "}
                                    {
                                        selectedRegistration.middle_name
                                    }{" "}
                                    {
                                        selectedRegistration.last_name
                                    }
                                </h3>

                                <div className="registration-profile-meta">

                                    <span>
                                        {
                                            selectedRegistration.role
                                        }
                                    </span>

                                    <span>
                                        •
                                    </span>

                                    <span>
                                        {
                                            selectedRegistration.status
                                        }
                                    </span>

                                </div>

                            </div>

                        </div>

                        {/* DETAILS */}

                        {(() => {

                            const profile =
                                getProfile(
                                    selectedRegistration
                                );

                            const address =
                                selectedRegistration
                                    .addresses?.[0];

                            return (
                                <>
                                    {/* PERSONAL */}

                                    <section className="registration-detail-section">

                                        <h4>
                                            Personal Information
                                        </h4>

                                        <div className="registration-detail-grid">

                                            {[
                                                [
                                                    "First Name",
                                                    selectedRegistration.first_name,
                                                ],
                                                [
                                                    "Middle Name",
                                                    selectedRegistration.middle_name,
                                                ],
                                                [
                                                    "Last Name",
                                                    selectedRegistration.last_name,
                                                ],
                                                [
                                                    "Sex",
                                                    profile?.sex,
                                                ],
                                                [
                                                    "Birthday",
                                                    formatDate(
                                                        profile?.birthday
                                                    ),
                                                ],
                                                [
                                                    "Age",
                                                    getAge(
                                                        profile?.birthday
                                                    ),
                                                ],
                                            ].map(
                                                ([
                                                    label,
                                                    value,
                                                ]) => (
                                                    <div
                                                        className="registration-detail-item"
                                                        key={
                                                            label
                                                        }
                                                    >
                                                        <span>
                                                            {
                                                                label
                                                            }
                                                        </span>

                                                        <strong>
                                                            {
                                                                value ||
                                                                "—"
                                                            }
                                                        </strong>
                                                    </div>
                                                )
                                            )}

                                        </div>

                                    </section>

                                    {/* CONTACT */}

                                    <section className="registration-detail-section">

                                        <h4>
                                            Contact Information
                                        </h4>

                                        <div className="registration-detail-grid">

                                            <div className="registration-detail-item">

                                                <span>
                                                    Email Address
                                                </span>

                                                <strong>
                                                    {
                                                        selectedRegistration.email
                                                    }
                                                </strong>

                                            </div>

                                            <div className="registration-detail-item">

                                                <span>
                                                    Phone Number
                                                </span>

                                                <strong>
                                                    {
                                                        selectedRegistration.phone ||
                                                        "—"
                                                    }
                                                </strong>

                                            </div>

                                        </div>

                                    </section>

                                    {/* ADDRESS */}

                                    <section className="registration-detail-section">

                                        <h4>
                                            Address
                                        </h4>

                                        {address ? (
                                            <div className="registration-detail-grid">

                                                {[
                                                    [
                                                        "Province",
                                                        address.province,
                                                    ],
                                                    [
                                                        "Municipality",
                                                        address.municipality,
                                                    ],
                                                    [
                                                        "Barangay",
                                                        address.barangay,
                                                    ],
                                                    [
                                                        "Street",
                                                        address.street,
                                                    ],
                                                    [
                                                        "House Number",
                                                        address.house_number,
                                                    ],
                                                    [
                                                        "Postal Code",
                                                        address.postal_code,
                                                    ],
                                                ].map(
                                                    ([
                                                        label,
                                                        value,
                                                    ]) => (
                                                        <div
                                                            className="registration-detail-item"
                                                            key={
                                                                label
                                                            }
                                                        >
                                                            <span>
                                                                {
                                                                    label
                                                                }
                                                            </span>

                                                            <strong>
                                                                {
                                                                    value ||
                                                                    "—"
                                                                }
                                                            </strong>
                                                        </div>
                                                    )
                                                )}

                                            </div>
                                        ) : (
                                            <p className="registration-empty-detail">
                                                No address information
                                                submitted yet.
                                            </p>
                                        )}

                                    </section>

                                    {/* SELLER */}

                                    {selectedRegistration.role ===
                                        "seller" &&
                                        profile && (
                                            <section className="registration-detail-section">

                                                <h4>
                                                    Seller Information
                                                </h4>

                                                <div className="registration-detail-grid">

                                                    <div className="registration-detail-item">

                                                        <span>
                                                            Business Name
                                                        </span>

                                                        <strong>
                                                            {
                                                                profile.business_name ||
                                                                "—"
                                                            }
                                                        </strong>

                                                    </div>

                                                    <div className="registration-detail-item">

                                                        <span>
                                                            Line of Business
                                                        </span>

                                                        <strong>
                                                            {
                                                                profile.line_of_business ||
                                                                "—"
                                                            }
                                                        </strong>

                                                    </div>

                                                </div>

                                            </section>
                                        )}

                                    {/* RIDER */}

                                    {selectedRegistration.role ===
                                        "rider" &&
                                        profile && (
                                            <section className="registration-detail-section">

                                                <h4>
                                                    Courier Information
                                                </h4>

                                                {profile.vehicles?.length ? (
                                                    <div className="registration-detail-grid">

                                                        {profile.vehicles.map(
                                                            (
                                                                vehicle
                                                            ) => (
                                                                <div
                                                                    className="registration-detail-item"
                                                                    key={
                                                                        vehicle.id
                                                                    }
                                                                >

                                                                    <span>
                                                                        {
                                                                            vehicle.vehicle_type
                                                                        }
                                                                    </span>

                                                                    <strong>
                                                                        {
                                                                            vehicle.plate_number
                                                                        }
                                                                    </strong>

                                                                </div>
                                                            )
                                                        )}

                                                    </div>
                                                ) : (
                                                    <p className="registration-empty-detail">
                                                        No vehicle information
                                                        submitted yet.
                                                    </p>
                                                )}

                                            </section>
                                        )}
                                </>
                            );

                        })()}

                        {/* ACCOUNT INFORMATION */}

                        <section className="registration-detail-section">

                            <h4>
                                Account Information
                            </h4>

                            <div className="registration-detail-grid">

                                {[
                                    [
                                        "Account ID",
                                        `#${selectedRegistration.id}`,
                                    ],
                                    [
                                        "Role",
                                        selectedRegistration.role,
                                    ],
                                    [
                                        "Status",
                                        selectedRegistration.status,
                                    ],
                                    [
                                        "Registered",
                                        formatDate(
                                            selectedRegistration.created_at
                                        ),
                                    ],
                                ].map(
                                    ([label, value]) => (
                                        <div
                                            className="registration-detail-item"
                                            key={label}
                                        >
                                            <span>
                                                {label}
                                            </span>

                                            <strong>
                                                {value}
                                            </strong>
                                        </div>
                                    )
                                )}

                            </div>

                        </section>

                        {/* DOCUMENTS */}

                        <section className="registration-detail-section">

                            <h4>
                                Submitted Documents
                            </h4>

                            {selectedRegistration.documents
                                ?.length ? (
                                <div className="registration-documents">

                                    {selectedRegistration.documents.map(
                                        (document) => (
                                            <div
                                                className="registration-document-item"
                                                key={
                                                    document.id
                                                }
                                            >

                                                <div className="registration-document-info">

                                                    <div className="registration-document-icon">
                                                        DOC
                                                    </div>

                                                    <div>

                                                        <strong>
                                                            {document.document_type
                                                                ?.replaceAll(
                                                                    "_",
                                                                    " "
                                                                )
                                                                .replace(
                                                                    /\b\w/g,
                                                                    (
                                                                        l
                                                                    ) =>
                                                                        l.toUpperCase()
                                                                )}
                                                        </strong>

                                                        <span>
                                                            {
                                                                document.original_file_name ||
                                                                "Submitted document"
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                                <button
                                                    className="view-document-button"
                                                    onClick={() =>
                                                        handleViewDocument(
                                                            document
                                                        )
                                                    }
                                                >
                                                    View Document
                                                </button>

                                                <button
                                                    className="approve-button"
                                                    disabled={
                                                        document.status !==
                                                        "pending"
                                                    }
                                                    onClick={() =>
                                                        updateDocument(
                                                            document.id,
                                                            "approve"
                                                        )
                                                    }
                                                >
                                                    {document.status ===
                                                    "approved"
                                                        ? "Approved"
                                                        : "Approve"}
                                                </button>

                                                <button
                                                    className="reject-button"
                                                    disabled={
                                                        document.status !==
                                                        "pending"
                                                    }
                                                    onClick={() => {
                                                        setSelectedDocument(
                                                            document
                                                        );

                                                        setRejectionReason(
                                                            ""
                                                        );
                                                    }}
                                                >
                                                    {document.status ===
                                                    "rejected"
                                                        ? "Rejected"
                                                        : "Reject"}
                                                </button>

                                            </div>
                                        )
                                    )}

                                </div>
                            ) : (
                                <p className="no-documents">
                                    No documents submitted.
                                </p>
                            )}

                        </section>

                        {/* MODAL ACTIONS */}

                        <div className="registration-modal-actions">

                            <button
                                className="modal-cancel-button"
                                onClick={() =>
                                    setSelectedRegistration(
                                        null
                                    )
                                }
                            >
                                Close
                            </button>

                            <button
                                className="reject-button"
                                onClick={() =>
                                    openConfirmationModal(
                                        selectedRegistration,
                                        "reject"
                                    )
                                }
                            >
                                Reject
                            </button>

                            <button
                                className="approve-button"
                                onClick={() =>
                                    openConfirmationModal(
                                        selectedRegistration,
                                        "approve"
                                    )
                                }
                            >
                                Approve
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =====================================================
                DOCUMENT REJECTION MODAL
            ===================================================== */}

            {selectedDocument && (
                <div
                    className="registration-modal-overlay"
                    onClick={() =>
                        !rejectingDocument &&
                        setSelectedDocument(null)
                    }
                >

                    <div
                        className="registration-modal document-rejection-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="registration-modal-header">

                            <div>

                                <span className="modal-eyebrow">
                                    Document Review
                                </span>

                                <h2>
                                    Reject Document
                                </h2>

                            </div>

                            <button
                                className="modal-close-button"
                                disabled={
                                    rejectingDocument
                                }
                                onClick={() =>
                                    setSelectedDocument(
                                        null
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>

                        <div className="document-rejection-content">

                            <p>
                                You are rejecting:
                            </p>

                            <strong>
                                {
                                    selectedDocument.original_file_name ||
                                    "Submitted document"
                                }
                            </strong>

                            <label>
                                Rejection Reason
                            </label>

                            <textarea
                                value={
                                    rejectionReason
                                }
                                onChange={(e) =>
                                    setRejectionReason(
                                        e.target.value
                                    )
                                }
                                placeholder="Explain why this document is being rejected..."
                                rows={5}
                                disabled={
                                    rejectingDocument
                                }
                            />

                        </div>

                        <div className="registration-modal-actions">

                            <button
                                className="modal-cancel-button"
                                disabled={
                                    rejectingDocument
                                }
                                onClick={() =>
                                    setSelectedDocument(
                                        null
                                    )
                                }
                            >
                                Cancel
                            </button>

                            <button
                                className="reject-button"
                                disabled={
                                    rejectingDocument ||
                                    !rejectionReason.trim()
                                }
                                onClick={
                                    handleRejectDocument
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

            {/* =====================================================
                REGISTRATION CONFIRMATION MODAL
            ===================================================== */}

            {confirmationModal.open &&
                confirmationModal.registration && (
                    <div
                        className="registration-modal-overlay"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                    event.currentTarget &&
                                !processingId
                            ) {
                                closeConfirmationModal();
                            }
                        }}
                    >

                        <div
                            className="registration-modal confirmation-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="confirmation-title"
                        >

                            <div className="confirmation-icon">
                                {confirmationModal.action ===
                                "approve"
                                    ? "✓"
                                    : "!"}
                            </div>

                            <div className="confirmation-content">

                                <h2 id="confirmation-title">
                                    {confirmationModal.action ===
                                    "approve"
                                        ? "Approve Registration?"
                                        : "Reject Registration?"}
                                </h2>

                                <p>
                                    Are you sure you want to{" "}
                                    <strong>
                                        {confirmationModal.action ===
                                        "approve"
                                            ? "approve"
                                            : "reject"}
                                    </strong>{" "}
                                    the registration of:
                                </p>

                                <strong className="confirmation-applicant">
                                    {
                                        confirmationModal
                                            .registration
                                            .first_name
                                    }{" "}
                                    {
                                        confirmationModal
                                            .registration
                                            .middle_name
                                    }{" "}
                                    {
                                        confirmationModal
                                            .registration
                                            .last_name
                                    }
                                </strong>

                                <span className="confirmation-warning">
                                    {confirmationModal.action ===
                                    "approve"
                                        ? "This applicant will be approved and removed from the pending registrations."
                                        : "This applicant will be rejected and removed from the pending registrations."}
                                </span>

                            </div>

                            <div className="registration-modal-actions">

                                <button
                                    type="button"
                                    className="modal-cancel-button"
                                    onClick={
                                        closeConfirmationModal
                                    }
                                    disabled={
                                        processingId
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className={
                                        confirmationModal.action ===
                                        "approve"
                                            ? "approve-button"
                                            : "reject-button"
                                    }
                                    onClick={
                                        confirmRegistrationAction
                                    }
                                    disabled={
                                        processingId
                                    }
                                >
                                    {processingId
                                        ? "Processing..."
                                        : confirmationModal.action ===
                                          "approve"
                                        ? "Approve Registration"
                                        : "Reject Registration"}
                                </button>

                            </div>

                        </div>

                    </div>
                )}

        </div>
    );
}

export default Registrations;
