import { Outlet, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../shared/services/api";

import "./AdminLayout.css";

const NAV = [
    { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/admin/registrations", label: "Registrations", icon: "registrations" },
    { to: "/admin/users", label: "User Accounts", icon: "users" },
    { to: "/admin/seller-compliance", label: "Seller Compliance", icon: "compliance" },
    { to: "/admin/complaints", label: "Complaints", icon: "complaints" },
    { to: "/admin/commission", label: "Commission", icon: "commission" },
    { to: "/admin/vouchers", label: "Vouchers", icon: "vouchers" },
    { to: "/admin/reports", label: "Reports", icon: "reports" },
    { to: "/admin/settings", label: "Platform Settings", icon: "settings" },
    { to: "/admin/chat", label: "Customer Service", icon: "chat" },
];

const AdminIcon = ({ name, className }) => {
    const shapes = {
        dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="8" height="7" rx="1.5" /></>,
        registrations: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6m3-3h-6" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
        deliveries: <><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="17.5" cy="19" r="1.5" /></>,
        compliance: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
        complaints: <><path d="m10.3 3-8.5 14a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3a2 2 0 0 0-3.4 0z" /><path d="M12 9v4m0 4h.01" /></>,
        commission: <><path d="M12 2v20M17 5.5C16.2 4.5 14.7 4 13 4h-2c-2.2 0-4 1.3-4 3s1.8 3 4 3h2c2.2 0 4 1.3 4 3s-1.8 3-4 3h-2c-1.7 0-3.2-.5-4-1.5" /></>,
        vouchers: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1 0-2.8l7.2-7.2a2 2 0 0 1 2.8 0l7.2 7.2a2 2 0 0 1 0 2.8z" /><circle cx="8.5" cy="8.5" r="1" /></>,
        reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
        settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2z" /></>,
        chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
        chevron: <path d="m7 10 5 5 5-5" />,
        signout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    };

    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]}</svg>;
};

function AdminLayout() {
const navigate = useNavigate();
const location = useLocation();
const isChatPage = location.pathname.startsWith("/admin/chat");

const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [mobileNavOpen, setMobileNavOpen] = useState(false);
const [profileOpen, setProfileOpen] = useState(false);
const [logoutModalOpen, setLogoutModalOpen] = useState(false);
const [loggingOut, setLoggingOut] = useState(false);
const [headerDate, setHeaderDate] = useState(() => new Date());

useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const handleKeyDown = (event) => {
        if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
}, [mobileNavOpen]);

useEffect(() => {
    const timer = window.setInterval(() => setHeaderDate(new Date()), 60_000);
    return () => window.clearInterval(timer);
}, []);

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
    <div className={`al-root ${sidebarCollapsed ? "al-root--collapsed" : ""}${mobileNavOpen ? " al-root--mobile-open" : ""}${isChatPage ? " al-root--chat" : ""}`}>
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

            <nav className="al-nav" id="admin-workspace-navigation" aria-label="Administrator workspace">
                {NAV.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMobileNavOpen(false)}
                        title={sidebarCollapsed ? label : undefined}
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span className="al-nav-icon" aria-hidden="true">
                            <AdminIcon name={icon} />
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
                                <span><AdminIcon name="settings" /></span>
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
                                <span><AdminIcon name="signout" /></span>
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
                            <AdminIcon name="chevron" />
                        </span>
                    </button>
                </div>
            </div>
        </aside>

        {/* MAIN */}
        <div className="al-main">
            <header className="al-header">
                <div className="al-header-left">
                    <button
                        type="button"
                        className="al-mobile-menu-toggle"
                        onClick={() => {
                            setSidebarCollapsed(false);
                            setMobileNavOpen((open) => !open);
                        }}
                        aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={mobileNavOpen}
                        aria-controls="admin-workspace-navigation"
                    >
                        <span /><span /><span />
                    </button>
                    <div className="al-breadcrumb">
                        <span>CRYMA</span>
                        <span>/</span>
                        <strong>Admin</strong>
                    </div>
                </div>

                <div className="al-header-right">
                    <div className="al-header-status">
                        <span className="al-status-dot" />
                        Live system
                    </div>
                    <div className="al-header-date">
                        <span className="al-header-date-icon"><AdminIcon name="clock" /></span>
                        <div><span>Today</span><strong>{headerDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
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
                        <AdminIcon name="signout" />
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
