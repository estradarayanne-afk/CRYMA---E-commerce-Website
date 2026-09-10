import { Outlet, NavLink, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import api from "../../shared/services/api";

import "./AdminLayout.css";

const NAV = [
    { to: "/admin/dashboard", label: "Dashboard", icon: "▦" },
    { to: "/admin/registrations", label: "Registrations", icon: "◌" },
    { to: "/admin/users", label: "User Accounts", icon: "♙" },
    { to: "/admin/seller-compliance", label: "Seller Compliance", icon: "✓" },
    { to: "/admin/complaints", label: "Complaints", icon: "!" },
    { to: "/admin/commission", label: "Commission", icon: "₱" },
    { to: "/admin/reports", label: "Reports", icon: "▤" },
    { to: "/admin/settings", label: "Settings", icon: "⚙" },
    { to: "/admin/chat", label: "Chat", icon: "◍" },
];

function AdminLayout() {
const navigate = useNavigate();

const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [profileOpen, setProfileOpen] = useState(false);
const [logoutModalOpen, setLogoutModalOpen] = useState(false);
const [loggingOut, setLoggingOut] = useState(false);

const user = (() => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
})();

const token = localStorage.getItem("token");
if (!token || !user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
}

const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "A";

const fullName = user
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    : "Administrator";

const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
        await api.post("/logout");
    } catch {
        // Logout locally even if the API request fails.
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", {
        replace: true,
        state: {
            message: "You've been signed out successfully.",
            type: "success",
        },
    });
};

return (
    <div className={`al-root ${sidebarCollapsed ? "al-root--collapsed" : ""}`}>
        {/* SIDEBAR */}
        <aside className="al-sidebar">
            <div className="al-sidebar-top">
                <div className="al-brand">
                    <span className="al-brand-mark">C</span>

                    <div className="al-brand-copy">
                        <span className="al-brand-name">
                            CRYMA<sup>®</sup>
                        </span>
                        <span className="al-brand-sub">Admin Panel</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="al-sidebar-toggle"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            <div className="al-section-label">
                <span>Workspace</span>
            </div>

            <nav className="al-nav">
                {NAV.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        title={sidebarCollapsed ? label : undefined}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="al-nav-icon" aria-hidden="true">
                            {icon}
                        </span>

                        <span className="al-nav-label">{label}</span>

                        <span className="al-nav-active-dot" />
                    </NavLink>
                ))}
            </nav>

            {/* SIDEBAR PROFILE */}
            <div className="al-sidebar-bottom">
                <div className="al-profile-wrapper">
                    {profileOpen && (
                        <div className="al-profile-menu">
                            <div className="al-profile-menu-head">
                                <div className="al-avatar al-avatar--menu">
                                    {initials}
                                </div>

                                <div>
                                    <strong>{fullName}</strong>
                                    <span>Administrator</span>
                                </div>
                            </div>

                            <div className="al-profile-divider" />

                            <button
                                type="button"
                                className="al-profile-action"
                                onClick={() => {
                                    setProfileOpen(false);
                                    navigate("/admin/account-settings");
                                }}
                            >
                                <span>⚙</span>
                                Account settings
                            </button>

                            <button
                                type="button"
                                className="al-profile-action al-profile-action--danger"
                                onClick={() => {
                                    setProfileOpen(false);
                                    setLogoutModalOpen(true);
                                }}
                            >
                                <span>↪</span>
                                Sign out
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className={`al-profile-trigger ${profileOpen ? "open" : ""}`}
                        onClick={() => setProfileOpen((value) => !value)}
                        title={sidebarCollapsed ? fullName : undefined}
                    >
                        <div className="al-avatar">
                            {initials}
                        </div>

                        <div className="al-user-info">
                            <strong>{fullName}</strong>
                            <span>Administrator</span>
                        </div>

                        <span className="al-profile-chevron">
                            {profileOpen ? "⌃" : "⌄"}
                        </span>
                    </button>
                </div>
            </div>
        </aside>

        {/* MAIN */}
        <div className="al-main">
            <header className="al-header">
                <div className="al-header-left">
                    <div className="al-breadcrumb">
                        <span>CRYMA</span>
                        <span>/</span>
                        <strong>Admin</strong>
                    </div>
                </div>

                <div className="al-header-right">
                    <div className="al-header-status">
                        <span className="al-status-dot" />
                        System online
                    </div>
                </div>
            </header>

            <main className="al-content">
                <Outlet />
            </main>
        </div>

        {/* LOGOUT CONFIRMATION MODAL */}
        {logoutModalOpen && (
            <div
                className="al-modal-backdrop"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !loggingOut) {
                        setLogoutModalOpen(false);
                    }
                }}
            >
                <div
                    className="al-logout-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="logout-title"
                >
                    <div className="al-logout-icon">
                        <span>↪</span>
                    </div>

                    <div className="al-logout-content">
                        <h2 id="logout-title">Sign out?</h2>
                        <p>
                            Are you sure you want to sign out of your
                            administrator account?
                        </p>
                    </div>

                    <div className="al-logout-actions">
                        <button
                            type="button"
                            className="al-modal-cancel"
                            onClick={() => setLogoutModalOpen(false)}
                            disabled={loggingOut}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="al-modal-confirm"
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? (
                                <>
                                    <span className="al-modal-spinner" />
                                    Signing out...
                                </>
                            ) : (
                                "Sign out"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);


}

export default AdminLayout;
