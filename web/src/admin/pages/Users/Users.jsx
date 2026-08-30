import { useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Users.css";

function Users() {
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    const [selectedUser, setSelectedUser] = useState(null);

    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    // Confirmation modal
    const [confirmationModal, setConfirmationModal] = useState(null);

    // Success modal
    const [successModal, setSuccessModal] = useState("");

    const [editForm, setEditForm] = useState({
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "buyer",
    });

    /* =========================================
       LOAD USERS
    ========================================= */

    const loadUsers = async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get(`/admin/users?page=${page}`);
            const data = response.data.data;

            setUsers(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 15,
                total: data?.total || 0,
            });
        } catch (error) {
            console.error("Users API error:", error);
            setError(
                error.response?.data?.message ||
                "Unable to load user accounts."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        async function fetchInitialUsers() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/admin/users?page=1");

                if (cancelled) return;

                const data = response.data.data;
                setUsers(data?.data || []);
                setPagination({
                    current_page: data?.current_page || 1,
                    last_page: data?.last_page || 1,
                    per_page: data?.per_page || 15,
                    total: data?.total || 0,
                });
            } catch (error) {
                if (cancelled) return;

                console.error("Users API error:", error);

                setError(
                    error.response?.data?.message ||
                    "Unable to load user accounts."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchInitialUsers();

        return () => {
            cancelled = true;
        };
    }, []);

    /* =========================================
       FILTER USERS
    ========================================= */

    const filteredUsers = users.filter((user) => {
        const search = searchTerm.toLowerCase().trim();

        const fullName = [
            user.first_name,
            user.middle_name,
            user.last_name,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search ||
            fullName.includes(search) ||
            user.email?.toLowerCase().includes(search) ||
            user.phone?.toLowerCase().includes(search);

        const matchesRole =
            roleFilter === "all" ||
            user.role?.toLowerCase() === roleFilter;

        return matchesSearch && matchesRole;
    });

    /* =========================================
       HELPERS
    ========================================= */

    const getInitials = (user) => {
        return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`
            .toUpperCase() || "U";
    };

    const getFullName = (user) => {
        return [
            user.first_name,
            user.middle_name,
            user.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unnamed User";
    };

    const getRoleLabel = (role) => {
        if (role === "customer") return "Buyer";
        if (role === "rider") return "Courier";

        return role
            ? role.charAt(0).toUpperCase() + role.slice(1)
            : "Unknown";
    };

    const getStatusClass = (status) => {
        const normalized = status?.toLowerCase();

        if (
            normalized === "active" ||
            normalized === "approved"
        ) {
            return "active";
        }

        if (
            normalized === "blocked" ||
            normalized === "suspended" ||
            normalized === "inactive"
        ) {
            return "inactive";
        }

        return "pending";
    };

    /* =========================================
       EDIT USER
    ========================================= */

    const handleEditUser = (user) => {
        setEditForm({
            first_name: user.first_name || "",
            middle_name: user.middle_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "buyer",
        });

        setEditMode(true);
        setError("");
    };

    const handleEditChange = (event) => {
        const { name, value } = event.target;

        setEditForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    /* =========================================
       OPEN SAVE CONFIRMATION
    ========================================= */

    const handleSaveUser = () => {
        if (!selectedUser) return;

        setConfirmationModal({
            type: "save",
            title: "Save Changes?",
            message: `Are you sure you want to save the changes made to ${getFullName(
                selectedUser
            )}?`,
        });
    };

    /* =========================================
       CONFIRM SAVE USER
    ========================================= */

    const confirmSaveUser = async () => {
        if (!selectedUser) return;

        setSaving(true);
        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/users/${selectedUser.id}`,
                editForm
            );

            const updatedUser = response.data.data;

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user.id === selectedUser.id
                        ? { ...user, ...updatedUser }
                        : user
                )
            );

            setSelectedUser((current) => ({
                ...current,
                ...updatedUser,
            }));

            setEditMode(false);
            setConfirmationModal(null);

            setSuccessModal(
                response.data.message ||
                "User information updated successfully."
            );
        } catch (error) {
            console.error("Update user error:", error);

            setConfirmationModal(null);

            setError(
                error.response?.data?.message ||
                "Unable to update user."
            );
        } finally {
            setSaving(false);
            setActionLoading(false);
        }
    };

    /* =========================================
       OPEN STATUS CONFIRMATION
    ========================================= */

    const handleStatusChange = (user, newStatus) => {
        const isSuspending = newStatus === "suspended";

        setConfirmationModal({
            type: "status",
            status: newStatus,
            title: isSuspending
                ? "Suspend User?"
                : "Activate User?",
            message: isSuspending
                ? `Are you sure you want to suspend ${getFullName(user)}?`
                : `Are you sure you want to activate ${getFullName(user)}?`,
        });
    };

    /* =========================================
       CONFIRM STATUS CHANGE
    ========================================= */

    const confirmStatusChange = async () => {
        if (!selectedUser || !confirmationModal) return;

        const newStatus = confirmationModal.status;

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/users/${selectedUser.id}/status`,
                {
                    status: newStatus,
                }
            );

            const updatedUser = response.data.data;

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser.id === selectedUser.id
                        ? { ...currentUser, ...updatedUser }
                        : currentUser
                )
            );

            setSelectedUser((current) => ({
                ...current,
                ...updatedUser,
            }));

            setConfirmationModal(null);

            setSuccessModal(
                response.data.message ||
                `User ${
                    newStatus === "suspended"
                        ? "suspended"
                        : "activated"
                } successfully.`
            );
        } catch (error) {
            console.error(
                "Update user status error:",
                error
            );

            setConfirmationModal(null);

            setError(
                error.response?.data?.message ||
                "Unable to update user status."
            );
        } finally {
            setActionLoading(false);
        }
    };

    /* =========================================
       CLOSE USER DETAILS
    ========================================= */

    const handleCloseUserModal = () => {
        if (actionLoading || saving) return;

        setSelectedUser(null);
        setEditMode(false);
        setError("");
    };

    /* =========================================
       CLOSE CONFIRMATION MODAL
    ========================================= */

    const closeConfirmationModal = () => {
        if (actionLoading || saving) return;

        setConfirmationModal(null);
    };

    return (
        <div className="users-page">

            {/* =========================================
                PAGE HEADER
            ========================================= */}

            <div className="users-header">
                <div>
                    <h1>User Accounts</h1>

                    <p>
                        View and manage registered CRYMA platform users.
                    </p>
                </div>

                <div className="users-count">
                    <strong>{pagination.total}</strong>
                    <span>Users</span>
                </div>
            </div>

            {/* =========================================
                ERROR
            ========================================= */}

            {error && (
                <div className="users-error">
                    {error}
                </div>
            )}

            {/* =========================================
                MAIN CARD
            ========================================= */}

            <div className="users-card">

                {/* TOOLBAR */}

                <div className="users-toolbar">

                    <div className="users-search">
                        <span>⌕</span>

                        <input
                            type="text"
                            placeholder="Search name, email or phone..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                        />
                    </div>

                    <div className="users-filter">
                        <label htmlFor="user-role-filter">
                            Role
                        </label>

                        <select
                            id="user-role-filter"
                            value={roleFilter}
                            onChange={(event) =>
                                setRoleFilter(event.target.value)
                            }
                        >
                            <option value="all">
                                All Roles
                            </option>

                            <option value="buyer">
                                Buyer
                            </option>

                            <option value="seller">
                                Seller
                            </option>

                            <option value="rider">
                                Courier
                            </option>

                            <option value="admin">
                                Admin
                            </option>
                        </select>
                    </div>

                </div>

                {/* =========================================
                    TABLE
                ========================================= */}

                {loading ? (
                    <div className="users-loading">
                        Loading user accounts...
                    </div>
                ) : (
                    <>
                    <div className="users-table-wrapper">

                        <table className="users-table">

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

                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="users-empty"
                                        >
                                            No user accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id}>

                                            {/* USER */}

                                            <td>
                                                <div className="user-info">

                                                    <div className="user-avatar">
                                                        {getInitials(user)}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {getFullName(user)}
                                                        </strong>

                                                        <span>
                                                            ID #{user.id}
                                                        </span>
                                                    </div>

                                                </div>
                                            </td>

                                            {/* EMAIL */}

                                            <td>
                                                {user.email || "—"}
                                            </td>

                                            {/* PHONE */}

                                            <td>
                                                {user.phone || "—"}
                                            </td>

                                            {/* ROLE */}

                                            <td>
                                                <span
                                                    className={`user-role role-${user.role}`}
                                                >
                                                    {getRoleLabel(
                                                        user.role
                                                    )}
                                                </span>
                                            </td>

                                            {/* STATUS */}

                                            <td>
                                                <span className={`user-status ${getStatusClass(
                                                    user.status
                                                )}`}>
                                                    {user.status ||
                                                        "Unknown"}
                                                </span>
                                            </td>

                                            {/* REGISTERED */}

                                            <td>
                                                {user.created_at
                                                    ? new Date(
                                                        user.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            {/* ACTION */}

                                            <td>
                                                <button
                                                    type="button"
                                                    className="user-view-button"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setEditMode(false);
                                                        setError("");
                                                    }}
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
                        <div className="users-pagination">
                            <div className="users-pagination-info">
                                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> 
                                – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> 
                                of <strong>{pagination.total}</strong>
                            </div>

                            <div className="users-pagination-controls">
                                <button
                                    type="button"
                                    className="users-pagination-button"
                                    disabled={pagination.current_page === 1}
                                    onClick={() => loadUsers(pagination.current_page - 1)}
                                >
                                    ← Previous
                                </button>

                                <div className="users-pagination-pages">
                                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                                        <button
                                            type="button"
                                            key={page}
                                            className={`users-pagination-page ${page === pagination.current_page ? "active" : ""}`}
                                            onClick={() => loadUsers(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="users-pagination-button"
                                    disabled={pagination.current_page === pagination.last_page}
                                    onClick={() => loadUsers(pagination.current_page + 1)}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                )}

            </div>

            {/* =========================================
                USER DETAILS MODAL
            ========================================= */}

            {selectedUser && (
                <div
                    className="user-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actionLoading &&
                            !saving
                        ) {
                            handleCloseUserModal();
                        }
                    }}
                >

                    <div
                        className="user-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="user-modal-header">

                            <div>
                                <span>
                                    USER ACCOUNT
                                </span>

                                <h2>
                                    Account Details
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseUserModal}
                                disabled={
                                    actionLoading || saving
                                }
                            >
                                ×
                            </button>

                        </div>

                        {/* PROFILE */}

                        <div className="user-profile">

                            <div className="user-profile-avatar">
                                {getInitials(selectedUser)}
                            </div>

                            <div>
                                <h3>
                                    {getFullName(selectedUser)}
                                </h3>

                                <p>
                                    {getRoleLabel(
                                        selectedUser.role
                                    )}
                                </p>
                            </div>

                        </div>

                        {/* =========================================
                            ACCOUNT INFORMATION
                        ========================================= */}

                        <section className="user-detail-section">

                            <h4>Account Information</h4>

                            <div className="user-detail-grid">

                                <div>
                                    <span>Account ID</span>

                                    <strong>
                                        #{selectedUser.id}
                                    </strong>
                                </div>

                                <div>
                                    <span>Role</span>

                                    <strong>
                                        {getRoleLabel(
                                            selectedUser.role
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>Status</span>

                                    <strong>
                                        {selectedUser.status ||
                                            "Unknown"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Registered</span>

                                    <strong>
                                        {selectedUser.created_at
                                            ? new Date(
                                                selectedUser.created_at
                                            ).toLocaleDateString()
                                            : "—"}
                                    </strong>
                                </div>

                            </div>

                        </section>

                        {/* =========================================
                            ACCOUNT STATUS
                        ========================================= */}

                        <section className="user-detail-section">

                            <h4>Account Status</h4>

                            <div className="user-status-management">

                                <p>
                                    Current status:
                                    <strong>
                                        {" "}
                                        {selectedUser.status ||
                                            "Unknown"}
                                    </strong>
                                </p>

                                {selectedUser.status === "active" ? (
                                    <button
                                        type="button"
                                        className="user-suspend-button"
                                        onClick={() =>
                                            handleStatusChange(
                                                selectedUser,
                                                "suspended"
                                            )
                                        }
                                        disabled={
                                            actionLoading ||
                                            saving
                                        }
                                    >
                                        Suspend User
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="user-activate-button"
                                        onClick={() =>
                                            handleStatusChange(
                                                selectedUser,
                                                "active"
                                            )
                                        }
                                        disabled={
                                            actionLoading ||
                                            saving
                                        }
                                    >
                                        Activate User
                                    </button>
                                )}

                            </div>

                        </section>

                        {/* =========================================
                            CONTACT INFORMATION
                        ========================================= */}

                        <section className="user-detail-section">

                            <h4>Contact Information</h4>

                            <div className="user-detail-grid">

                                <div>
                                    <span>Email Address</span>

                                    <strong>
                                        {selectedUser.email ||
                                            "—"}
                                    </strong>
                                </div>

                                <div>
                                    <span>Phone Number</span>

                                    <strong>
                                        {selectedUser.phone ||
                                            "—"}
                                    </strong>
                                </div>

                            </div>

                        </section>

                        {/* =========================================
                            EDIT FORM
                        ========================================= */}

                        {editMode && (
                            <section className="user-detail-section">

                                <h4>
                                    Edit User Information
                                </h4>

                                <div className="user-edit-grid">

                                    <div>
                                        <label>
                                            First Name
                                        </label>

                                        <input
                                            type="text"
                                            name="first_name"
                                            value={
                                                editForm.first_name
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label>
                                            Middle Name
                                        </label>

                                        <input
                                            type="text"
                                            name="middle_name"
                                            value={
                                                editForm.middle_name
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label>
                                            Last Name
                                        </label>

                                        <input
                                            type="text"
                                            name="last_name"
                                            value={
                                                editForm.last_name
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label>
                                            Email
                                        </label>

                                        <input
                                            type="email"
                                            name="email"
                                            value={
                                                editForm.email
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label>
                                            Phone
                                        </label>

                                        <input
                                            type="text"
                                            name="phone"
                                            value={
                                                editForm.phone
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        />
                                    </div>

                                    <div>
                                        <label>
                                            Role
                                        </label>

                                        <select
                                            name="role"
                                            value={
                                                editForm.role
                                            }
                                            onChange={
                                                handleEditChange
                                            }
                                            disabled={saving}
                                        >
                                            <option value="buyer">
                                                Buyer
                                            </option>

                                            <option value="seller">
                                                Seller
                                            </option>

                                            <option value="rider">
                                                Courier
                                            </option>
                                        </select>
                                    </div>

                                </div>

                                <div className="user-modal-actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditMode(false)
                                        }
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveUser}
                                        disabled={saving}
                                    >
                                        Save Changes
                                    </button>

                                </div>

                            </section>
                        )}

                        {/* =========================================
                            BOTTOM ACTIONS
                        ========================================= */}

                        <div className="user-modal-actions">

                            {!editMode && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleEditUser(
                                            selectedUser
                                        )
                                    }
                                    disabled={
                                        actionLoading ||
                                        saving
                                    }
                                >
                                    Edit User
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleCloseUserModal}
                                disabled={
                                    actionLoading ||
                                    saving
                                }
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {/* =========================================
                CONFIRMATION MODAL
            ========================================= */}

            {confirmationModal && (
                <div
                    className="user-confirmation-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !actionLoading &&
                            !saving
                        ) {
                            closeConfirmationModal();
                        }
                    }}
                >

                    <div
                        className="user-confirmation-modal"
                        role="dialog"
                        aria-modal="true"
                    >

                        {/* ICON */}

                        <div
                            className={`user-confirmation-icon ${
                                confirmationModal.type ===
                                "status"
                                    ? confirmationModal.status ===
                                      "suspended"
                                        ? "danger"
                                        : "approve"
                                    : "approve"
                            }`}
                        >
                            {confirmationModal.type ===
                            "status"
                                ? confirmationModal.status ===
                                  "suspended"
                                    ? "!"
                                    : "✓"
                                : "✓"}
                        </div>

                        {/* TITLE */}

                        <h3>
                            {confirmationModal.title}
                        </h3>

                        {/* MESSAGE */}

                        <p>
                            {confirmationModal.message}
                        </p>

                        {/* EXTRA STATUS MESSAGE */}

                        {confirmationModal.type ===
                            "status" && (
                            <span className="user-confirmation-note">
                                {confirmationModal.status ===
                                "suspended"
                                    ? "The user will no longer be able to access their account until it is activated again."
                                    : "The user will regain access to their CRYMA account."}
                            </span>
                        )}

                        {confirmationModal.type ===
                            "save" && (
                            <span className="user-confirmation-note">
                                The updated account information will
                                be saved to the system.
                            </span>
                        )}

                        {/* ACTIONS */}

                        <div className="user-confirmation-actions">

                            <button
                                type="button"
                                className="user-confirmation-cancel"
                                onClick={
                                    closeConfirmationModal
                                }
                                disabled={
                                    actionLoading ||
                                    saving
                                }
                            >
                                Cancel
                            </button>

                            {confirmationModal.type ===
                            "status" ? (
                                <button
                                    type="button"
                                    className={`user-confirmation-confirm ${
                                        confirmationModal.status ===
                                        "suspended"
                                            ? "danger"
                                            : "approve"
                                    }`}
                                    onClick={
                                        confirmStatusChange
                                    }
                                    disabled={actionLoading}
                                >
                                    {actionLoading
                                        ? confirmationModal.status ===
                                          "suspended"
                                            ? "Suspending..."
                                            : "Activating..."
                                        : confirmationModal.status ===
                                          "suspended"
                                            ? "Yes, Suspend"
                                            : "Yes, Activate"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="user-confirmation-confirm approve"
                                    onClick={
                                        confirmSaveUser
                                    }
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Yes, Save Changes"}
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
                <div className="user-success-overlay">

                    <div
                        className="user-success-modal"
                        role="dialog"
                        aria-modal="true"
                    >

                        <div className="user-success-icon">
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
                            className="user-success-button"
                            onClick={() =>
                                setSuccessModal("")
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

export default Users;
