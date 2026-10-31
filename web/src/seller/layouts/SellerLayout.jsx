import { Outlet, NavLink, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
    Wallet,
    Bell,
    ChevronDown,
    ChevronUp,
    Clock3,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    Package,
    RotateCcw,
    Settings,
    ShoppingBag,
    Store,
    Star,
    Truck,
    Ticket,
} from "lucide-react";
import api from "../../shared/services/api";
import "../../admin/layouts/AdminLayout.css";
import "../../admin/layouts/AdminWorkspace.css";
import "../../shared/styles/feedback.css";
import "../styles/SellerWorkspace.css";

const NAV_GROUPS = [
    { label: "Overview", items: [
        { to: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ] },
    { label: "Products & storefront", items: [
        { to: "/seller/inventory", label: "Manage Inventory", icon: Package },
        { to: "/seller/storefront", label: "Storefront", icon: Store },
        { to: "/seller/vouchers", label: "Vouchers", icon: Ticket },
    ] },
    { label: "Orders & delivery", items: [
        { to: "/seller/orders", label: "Orders", icon: ShoppingBag },
        { to: "/seller/returns", label: "Returns", icon: RotateCcw },
        { to: "/seller/logistics", label: "Logistics", icon: Truck },
    ] },
    { label: "Performance", items: [
        { to: "/seller/reports", label: "Earnings & Reports", icon: Wallet },
        { to: "/seller/feedback", label: "Feedback", icon: Star },
    ] },
    { label: "Communication & account", items: [
        { to: "/seller/chat", label: "Chat", icon: MessageCircle },
        { to: "/seller/account-settings", label: "Account Settings", icon: Settings },
    ] },
];

function SellerLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [headerDate, setHeaderDate] = useState(() => new Date());
    const [notifications, setNotifications] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileAvatarUrl, setProfileAvatarUrl] = useState("");

    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    });

    const token = localStorage.getItem("token");
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

    useEffect(() => {
        const syncUser = () => {
            try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setUser(null); }
        };
        window.addEventListener("cryma-user-updated", syncUser);
        window.addEventListener("storage", syncUser);
        return () => {
            window.removeEventListener("cryma-user-updated", syncUser);
            window.removeEventListener("storage", syncUser);
        };
    }, []);

    useEffect(() => {
        if (!token || user?.role !== "seller" || !user?.profile_image_path) {
            const timer = window.setTimeout(() => setProfileAvatarUrl(""), 0);
            return () => window.clearTimeout(timer);
        }
        let active = true;
        let objectUrl = "";
        api.get("/account/profile-image", { responseType: "blob" }).then(({ data }) => {
            if (!data?.size) return;
            objectUrl = URL.createObjectURL(data);
            if (!active) { URL.revokeObjectURL(objectUrl); return; }
            setProfileAvatarUrl(objectUrl);
        }).catch(() => { if (active) setProfileAvatarUrl(""); });
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [token, user?.role, user?.profile_image_path]);

    useEffect(() => {
        if (!token || user?.role !== "seller") return undefined;
        let active = true;
        const refreshNotifications = () => api.get("/seller/notifications").then(({ data }) => {
            if (!active) return;
            setNotifications(data.data.notifications || []);
            setUnreadNotifications(Number(data.data.unread_count || 0));
        }).catch(() => {});
        void refreshNotifications();
        const timer = window.setInterval(refreshNotifications, 30_000);
        return () => { active = false; window.clearInterval(timer); };
    }, [token, user?.role]);

    if (!token || !user || user.role !== "seller") {
        return <Navigate to="/login" replace />;
    }

    const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "S";
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Seller";
    const currentPage = NAV_GROUPS.flatMap((group) => group.items).find((item) => location.pathname.startsWith(item.to))?.label ?? "Seller Portal";

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        try { await api.post("/logout"); } catch { /* ignore */ }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true, state: { message: "You've been signed out successfully.", type: "success" } });
    };

    const openNotification = async (notification) => {
        if (!notification.read_at) {
            try {
                await api.patch(`/seller/notifications/${notification.id}/read`);
                setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
                setUnreadNotifications((current) => Math.max(0, current - 1));
            } catch { /* Keep the item available if marking it read fails. */ }
        }
        setNotificationsOpen(false);
        if (notification.data?.link?.startsWith("/seller/")) navigate(notification.data.link, { state: { sellerNotification: notification.data } });
    };

    const markAllNotificationsRead = async () => {
        try {
            await api.patch("/seller/notifications/read-all");
            const readAt = new Date().toISOString();
            setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
            setUnreadNotifications(0);
        } catch { /* The next refresh will restore the server state. */ }
    };

    return (
        <div className={`al-root${sidebarCollapsed ? " al-root--collapsed" : ""}${mobileNavOpen ? " al-root--mobile-open" : ""}${location.pathname.startsWith("/seller/chat") ? " al-root--seller-chat" : ""}`}>

            {/* â”€â”€ SIDEBAR â”€â”€ */}
            <aside className="al-sidebar">
                <div className="al-sidebar-top">
                    <div className="al-brand">
                        <img className="al-brand-mark" src="/cryma-favicon.png" alt="" />
                        <div className="al-brand-copy">
                            <span className="al-brand-name">CRYMA<sup>Â®</sup></span>
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

                <nav className="al-nav" id="seller-workspace-navigation" aria-label="Seller workspace">
                    {NAV_GROUPS.map((group) => (
                        <div className="al-nav-group" key={group.label}>
                            <div className="al-section-label"><span>{group.label}</span></div>
                            <div className="al-nav-group-items">
                                {group.items.map(({ to, label, icon: Icon }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setMobileNavOpen(false)}
                                        title={sidebarCollapsed ? label : undefined}
                                        className={({ isActive }) => isActive ? "active" : ""}
                                    >
                                        <span className="al-nav-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
                                        <span className="al-nav-label">{label}</span>
                                        <span className="al-nav-active-dot" />
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="al-sidebar-bottom">
                    <div className="al-profile-wrapper">
                        {profileOpen && (
                            <div className="al-profile-menu">
                                <div className="al-profile-menu-head">
                                    <div className="al-avatar al-avatar--menu">{profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : initials}</div>
                                    <div>
                                        <strong>{fullName}</strong>
                                        <span>Seller Account</span>
                                    </div>
                                </div>
                                <div className="al-profile-divider" />
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
                            <div className="al-avatar">{profileAvatarUrl ? <img src={profileAvatarUrl} alt="" /> : initials}</div>
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

            {/* â”€â”€ MAIN â”€â”€ */}
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
                        <div className="al-notification-wrap">
                            <button type="button" className={`al-notification-trigger${notificationsOpen ? " is-open" : ""}`} onClick={() => setNotificationsOpen((current) => !current)} aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} aria-expanded={notificationsOpen} aria-haspopup="true">
                                <Bell size={17} strokeWidth={1.9} />
                                {unreadNotifications > 0 && <span className="al-notification-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
                            </button>
                            {notificationsOpen && <div className="al-notification-menu" role="dialog" aria-label="Seller notifications">
                                <div className="al-notification-menu-head"><div><strong>Notifications</strong><span>{unreadNotifications ? `${unreadNotifications} unread` : "You're all caught up"}</span></div>{unreadNotifications > 0 && <button type="button" onClick={() => void markAllNotificationsRead()}>Mark all read</button>}</div>
                                <div className="al-notification-list">
                                    {notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} className={`al-notification-item${notification.read_at ? " is-read" : " is-unread"}`} onClick={() => void openNotification(notification)}>
                                        <span className="al-notification-indicator" />
                                        <span className="al-notification-copy"><strong>{notification.data?.title || "Notification"}</strong><span>{notification.data?.message || "You have an update."}</span><small>{new Date(notification.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small></span>
                                    </button>) : <p className="al-notification-empty">New updates will appear here.</p>}
                                </div>
                            </div>}
                        </div>
                        <div className="al-header-status">
                            <span className="al-status-dot" />
                            Store online
                        </div>
                        <div className="al-header-date">
                            <span className="al-header-date-icon"><Clock3 aria-hidden="true" /></span>
                            <div><span>Today</span><strong>{headerDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
                        </div>
                    </div>
                </header>

                <main className="al-content">
                    <Outlet />
                </main>
            </div>

            {/* â”€â”€ LOGOUT MODAL â”€â”€ */}
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
