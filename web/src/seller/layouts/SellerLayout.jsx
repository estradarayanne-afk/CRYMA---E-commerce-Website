import { Outlet, NavLink, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    BarChart3,
    ChevronDown,
    ChevronUp,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    Package,
    Settings,
    ShoppingBag,
    Star,
    Truck,
} from "lucide-react";
import api from "../../shared/services/api";
import "../../admin/layouts/AdminLayout.css";
import "../../admin/layouts/AdminWorkspace.css";
import "../../shared/styles/feedback.css";
import "../styles/SellerWorkspace.css";

const NAV = [
    { to: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/seller/inventory", label: "Inventory", icon: Package },
    { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
    { to: "/seller/logistics", label: "Logistics", icon: Truck },
    { to: "/seller/feedback", label: "Feedback", icon: Star },
    { to: "/seller/reports", label: "Reports", icon: BarChart3 },
    { to: "/seller/chat", label: "Chat", icon: MessageCircle },
    { to: "/seller/account-settings", label: "Account Settings", icon: Settings },
];

function SellerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const token = localStorage.getItem("token");
    useEffect(() => {
        if (!mobileNavOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setMobileNavOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileNavOpen]);

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
        <div className={`al-root${sidebarCollapsed ? " al-root--collapsed" : ""}${mobileNavOpen ? " al-root--mobile-open" : ""}`}>

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

                <nav className="al-nav" id="seller-workspace-navigation" aria-label="Seller workspace">
                    {NAV.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMobileNavOpen(false)}
                            title={sidebarCollapsed ? label : undefined}
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            <span className="al-nav-icon" aria-hidden="true">
                                <Icon size={18} strokeWidth={1.8} />
                            </span>
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
                                    <Settings size={16} strokeWidth={1.8} />
                                    Account settings
                                </button>
                                <button
                                    type="button"
                                    className="al-profile-action al-profile-action--danger"
                                    onClick={() => { setProfileOpen(false); setLogoutModalOpen(true); }}
                                >
                                    <LogOut size={16} strokeWidth={1.8} />
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
                            <span className="al-profile-chevron">
                                {profileOpen
                                    ? <ChevronUp size={16} strokeWidth={1.8} />
                                    : <ChevronDown size={16} strokeWidth={1.8} />}
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ── */}
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
                            aria-controls="seller-workspace-navigation"
                        >
                            <span /><span /><span />
                        </button>
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
                        <div className="al-logout-icon"><LogOut size={22} strokeWidth={1.8} /></div>
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
