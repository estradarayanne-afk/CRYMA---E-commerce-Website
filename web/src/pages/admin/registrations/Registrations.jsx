import { useEffect, useState } from "react";
import api from "../../../services/api";

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

    const fetchRegistrations = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/registrations?page=${page}`
            );

            const paginationData = response.data.data;

            setRegistrations(
                paginationData.data || []
            );

            setPagination({
                current_page: paginationData.current_page || 1,
                last_page: paginationData.last_page || 1,
                per_page: paginationData.per_page || 10,
                total: paginationData.total || 0,
            });

        } catch (error) {
            console.error("Registration API error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to load account registrations."
            );
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        if (
            page < 1 ||
            page > pagination.last_page ||
            page === pagination.current_page
        ) {
            return;
        }

        fetchRegistrations(page);
    };

    const filteredRegistrations = registrations.filter((registration) => {
        const search = searchTerm.toLowerCase().trim();

        const fullName = [
            registration.first_name,
            registration.middle_name,
            registration.last_name,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            fullName.includes(search) ||
            registration.email?.toLowerCase().includes(search) ||
            registration.phone?.toLowerCase().includes(search);

        const matchesRole =
            roleFilter === "all" ||
            registration.role?.toLowerCase() === roleFilter;

        return matchesSearch && matchesRole;
    });

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const handleApprove = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to approve this registration?"
        );

        if (!confirmed) {
            return;
        }

        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(
                `/admin/registrations/${id}/approve`
            );

            setSuccess(
                response.data.message ||
                "Registration approved successfully."
            );

            // Remove approved account from pending list
            setRegistrations((currentRegistrations) =>
                currentRegistrations.filter(
                    (registration) => registration.id !== id
                )
            );
        } catch (error) {
            console.error("Approve registration error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to approve registration."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to reject this registration?"
        );

        if (!confirmed) {
            return;
        }

        setProcessingId(id);
        setError("");
        setSuccess("");

        try {
            const response = await api.patch(
                `/admin/registrations/${id}/reject`
            );

            setSuccess(
                response.data.message ||
                "Registration rejected successfully."
            );

            // Remove rejected account from pending list
            setRegistrations((currentRegistrations) =>
                currentRegistrations.filter(
                    (registration) => registration.id !== id
                )
            );
        } catch (error) {
            console.error("Reject registration error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to reject registration."
            );
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="registrations-page">

            {/* PAGE HEADER */}
            <div className="registrations-header">
                <div>
                    <h1>Account Registrations</h1>

                    <p>
                        Review and manage pending CRYMA account
                        registrations.
                    </p>
                </div>

                <div className="registration-count">
                    <strong>{registrations.length}</strong>
                    <span>Pending</span>
                </div>
            </div>

            {/* SUCCESS MESSAGE */}
            {success && (
                <div className="registration-success">
                    {success}
                </div>
            )}

            {/* ERROR MESSAGE */}
            {error && (
                <div className="registration-error">
                    {error}
                </div>
            )}

            {/* LOADING */}
            {loading ? (
                <div className="registration-loading">
                    Loading registrations...
                </div>
            ) : (
                <div className="registrations-card">
                    <div className="registrations-toolbar">

                        <div className="registration-search">
                            <span className="search-icon">⌕</span>

                            <input
                                type="text"
                                placeholder="Search applicant, email or phone..."
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                            />
                        </div>

                        <div className="registration-filter">
                            <label htmlFor="role-filter">
                                Role
                            </label>

                            <select
                                id="role-filter"
                                value={roleFilter}
                                onChange={(event) =>
                                    setRoleFilter(event.target.value)
                                }
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
                                        <td
                                            colSpan="7"
                                            className="empty-registrations"
                                        >
                                            No pending registrations found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegistrations.map((registration) => {

                                        const isProcessing =
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
                                                                ?.charAt(0)
                                                                ?.toUpperCase()}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {
                                                                    registration.first_name
                                                                }{" "}
                                                                {registration.middle_name
                                                                    ? `${registration.middle_name} `
                                                                    : ""}
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
                                                            onClick={() => setSelectedRegistration(registration)}
                                                            disabled={isProcessing}
                                                        >
                                                            View
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="approve-button"
                                                            onClick={() =>
                                                                handleApprove(
                                                                    registration.id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
                                                        >
                                                            {isProcessing
                                                                ? "Processing..."
                                                                : "Approve"}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="reject-button"
                                                            onClick={() =>
                                                                handleReject(
                                                                    registration.id
                                                                )
                                                            }
                                                            disabled={
                                                                isProcessing
                                                            }
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
                                    {(pagination.current_page - 1) *
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
                                <strong>{pagination.total}</strong>{" "}
                                registrations
                            </div>

                            <div className="pagination-controls">

                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={pagination.current_page === 1}
                                    onClick={() =>
                                        handlePageChange(
                                            pagination.current_page - 1
                                        )
                                    }
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
                                                page ===
                                                pagination.current_page
                                                    ? "active"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                handlePageChange(page)
                                            }
                                        >
                                            {page}
                                        </button>
                                    ))}

                                </div>

                                <button
                                    type="button"
                                    className="pagination-button"
                                    disabled={
                                        pagination.current_page ===
                                        pagination.last_page
                                    }
                                    onClick={() =>
                                        handlePageChange(
                                            pagination.current_page + 1
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
                                <span className="modal-eyebrow">
                                    Account Registration
                                </span>

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
                                {selectedRegistration.first_name
                                    ?.charAt(0)
                                    ?.toUpperCase()}
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
                                    <span>
                                        {selectedRegistration.role}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {selectedRegistration.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* PERSONAL INFORMATION */}
                        <section className="registration-detail-section">
                            <h4>Personal Information</h4>

                            <div className="registration-detail-grid">

                                <div className="registration-detail-item">
                                    <span>First Name</span>
                                    <strong>
                                        {selectedRegistration.first_name}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Middle Name</span>
                                    <strong>
                                        {selectedRegistration.middle_name || "—"}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Last Name</span>
                                    <strong>
                                        {selectedRegistration.last_name}
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
                                    <strong>
                                        {selectedRegistration.email}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Phone Number</span>
                                    <strong>
                                        {selectedRegistration.phone || "—"}
                                    </strong>
                                </div>

                            </div>
                        </section>

                        {/* ACCOUNT INFORMATION */}
                        <section className="registration-detail-section">
                            <h4>Account Information</h4>

                            <div className="registration-detail-grid">

                                <div className="registration-detail-item">
                                    <span>Account ID</span>
                                    <strong>
                                        #{selectedRegistration.id}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Role</span>
                                    <strong>
                                        {selectedRegistration.role}
                                    </strong>
                                </div>

                                <div className="registration-detail-item">
                                    <span>Status</span>
                                    <strong>
                                        {selectedRegistration.status}
                                    </strong>
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