import { Outlet, NavLink, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import api from "../../shared/services/api";
import "../../admin/layouts/AdminLayout.css";

const NAV = [
    { to: "/seller/dashboard",         label: "Dashboard",       icon: "▦" },
    { to: "/seller/inventory",         label: "Inventory",       icon: "◫" },
    { to: "/seller/orders",            label: "Orders",          icon: "◌" },
    { to: "/seller/logistics",         label: "Logistics",       icon: "⇢" },
    { to: "/seller/feedback",          label: "Feedback",        icon: "★" },
    { to: "/seller/reports",           label: "Reports",         icon: "▤" },
    { to: "/seller/chat",              label: "Chat",            icon: "◍" },
    { to: "/seller/account-settings", label: "Account Settings", icon: "⚙" },
];

function SellerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const token = localStorage.getItem("token");
    if (!token || !user || user.role !== "seller") {
        return <Navigate to="/login" replace />;
    }

    const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "S";
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Seller";
    const currentPage = NAV.find((n) => location.pathname.startsWith(n.to))?.label ?? "Seller Portal";

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try { await api.post("/logout"); } catch { /* ignore */ }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true, state: { message: "You've been signed out successfully.", type: "success" } });
    };

    return (
        <div className={`al-root${sidebarCollapsed ? " al-root--collapsed" : ""}`}>

            {/* ── SIDEBAR ── */}
            <aside className="al-sidebar">
                <div className="al-sidebar-top">
                    <div className="al-brand">
                        <span className="al-brand-mark">C</span>
                        <div className="al-brand-copy">
                            <span className="al-brand-name">CRYMA<sup>®</sup></span>
                            <span className="al-brand-sub">Seller Portal</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="al-sidebar-toggle"
                        onClick={() => setSidebarCollapsed((v) => !v)}
                        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <span /><span /><span />
                    </button>
                </div>

                <div className="al-section-label"><span>Workspace</span></div>

                <nav className="al-nav">
                    {NAV.map(({ to, label, icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            title={sidebarCollapsed ? label : undefined}
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            <span className="al-nav-icon" aria-hidden="true">{icon}</span>
                            <span className="al-nav-label">{label}</span>
                            <span className="al-nav-active-dot" />
                        </NavLink>
                    ))}
                </nav>

                <div className="al-sidebar-bottom">
                    <div className="al-profile-wrapper">
                        {profileOpen && (
                            <div className="al-profile-menu">
                                <div className="al-profile-menu-head">
                                    <div className="al-avatar al-avatar--menu">{initials}</div>
                                    <div>
                                        <strong>{fullName}</strong>
                                        <span>Seller Account</span>
                                    </div>
                                </div>
                                <div className="al-profile-divider" />
                                <button
                                    type="button"
                                    className="al-profile-action"
                                    onClick={() => { setProfileOpen(false); navigate("/seller/account-settings"); }}
                                >
                                    <span>⚙</span>
                                    Account settings
                                </button>
                                <button
                                    type="button"
                                    className="al-profile-action al-profile-action--danger"
                                    onClick={() => { setProfileOpen(false); setLogoutModalOpen(true); }}
                                >
                                    <span>↪</span>
                                    Sign out
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            className={`al-profile-trigger${profileOpen ? " open" : ""}`}
                            onClick={() => setProfileOpen((v) => !v)}
                            title={sidebarCollapsed ? fullName : undefined}
                        >
                            <div className="al-avatar">{initials}</div>
                            <div className="al-user-info">
                                <strong>{fullName}</strong>
                                <span>Seller Account</span>
                            </div>
                            <span className="al-profile-chevron">{profileOpen ? "⌃" : "⌄"}</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <div className="al-main">
                <header className="al-header">
                    <div className="al-header-left">
                        <div className="al-breadcrumb">
                            <span>CRYMA</span>
                            <span>/</span>
                            <strong>{currentPage}</strong>
                        </div>
                    </div>
                    <div className="al-header-right">
                        <div className="al-header-status">
                            <span className="al-status-dot" />
                            Store online
                        </div>
                    </div>
                </header>

                <main className="al-content">
                    <Outlet />
                </main>
            </div>

            {/* ── LOGOUT MODAL ── */}
            {logoutModalOpen && (
                <div
                    className="al-modal-backdrop"
                    onMouseDown={(e) => { if (e.target === e.currentTarget && !loggingOut) setLogoutModalOpen(false); }}
                >
                    <div className="al-logout-modal" role="dialog" aria-modal="true" aria-labelledby="seller-logout-title">
                        <div className="al-logout-icon"><span>↪</span></div>
                        <div className="al-logout-content">
                            <h2 id="seller-logout-title">Sign out?</h2>
                            <p>Are you sure you want to sign out of your seller account?</p>
                        </div>
                        <div className="al-logout-actions">
                            <button type="button" className="al-modal-cancel" onClick={() => setLogoutModalOpen(false)} disabled={loggingOut}>Cancel</button>
                            <button type="button" className="al-modal-confirm" onClick={handleLogout} disabled={loggingOut}>
                                {loggingOut ? (<><span className="al-modal-spinner" />Signing out...</>) : "Sign out"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SellerLayout;
