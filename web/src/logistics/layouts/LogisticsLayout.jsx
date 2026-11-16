
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    BarChart3,
    Bell,
    Boxes,
    ClipboardList,
    Clock3,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    MapPinned,
    MessageSquareText,
    PackageCheck,
    Settings,
    Truck,
    UserRound,
    UsersRound,
} from "lucide-react";
import api from "../../shared/services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import "./LogisticsLayout.css";
import "../../admin/layouts/AdminWorkspace.css";

const NAV_GROUPS = [
    { label: "Overview", links: [
        { to: "/logistics/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ] },
    { label: "Parcel workflow", links: [
        { to: "/logistics/pickups", label: "Pickup Requests", flow: "01 · Collect", icon: ClipboardList },
        { to: "/logistics/incoming-parcels", label: "Incoming Parcels", flow: "02 · Receive", icon: PackageCheck },
        { to: "/logistics/sorting", label: "Sorting", flow: "03 · Sort", icon: Boxes },
        { to: "/logistics/parcel-flow", label: "Parcel Flow & Hubs", flow: "04 · Transfer", icon: Boxes },
        { to: "/logistics/delivery-assignment", label: "Delivery Assignment", flow: "05 · Dispatch", icon: MapPinned },
        { to: "/logistics/delivery-monitoring", label: "Courier Deliveries", flow: "06 · Track", icon: Truck },
    ] },
    { label: "People & access", links: [
        { to: "/logistics/riders", label: "Courier / Rider accounts", icon: UsersRound },
        { to: "/logistics/hub-staff", label: "Hub Staff accounts", icon: UsersRound, provisionerOnly: true },
    ] },
    { label: "Insights", links: [
        { to: "/logistics/reports", label: "Reports", icon: BarChart3 },
        { to: "/logistics/messages", label: "Messages", icon: MessageSquareText },
    ] },
];

function LogisticsLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [headerDate, setHeaderDate] = useState(() => new Date());
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [canManageHubStaff, setCanManageHubStaff] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const profileRef = useRef(null);
    const notificationsRef = useRef(null);
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const closeLogoutModal = useCallback(() => setLogoutModalOpen(false), []);
    const visibleGroups = NAV_GROUPS
        .map((group) => ({
            ...group,
            links: group.links.filter((link) => !link.provisionerOnly || canManageHubStaff),
        }))
        .filter((group) => group.links.length > 0);
    const visibleLinks = visibleGroups.flatMap((group) => group.links);
    const currentPage = visibleLinks.find(({ to }) => to === location.pathname)?.label || "Logistics";
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Logistics staff";
    const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

    useEffect(() => {
        const timer = window.setInterval(() => setHeaderDate(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let active = true;
        api.get("/logistics/profile")
            .then(({ data }) => {
                if (active) setCanManageHubStaff(data?.data?.can_manage_hub_staff === true);
            })
            .catch(() => {
                if (active) setCanManageHubStaff(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!localStorage.getItem("token") || user?.role !== "logistics") return undefined;
        let active = true;
        const refreshNotifications = () => api.get("/logistics/notifications").then(({ data }) => {
            if (!active) return;
            const items = data?.data?.notifications;
            if (!Array.isArray(items)) throw new Error("The logistics notifications response is invalid.");
            setNotifications(items);
            setUnreadNotifications(Number(data.data.unread_count || 0));
            setNotificationError("");
        }).catch((error) => {
            if (active) setNotificationError(error.response?.data?.message || error.message || "Unable to load logistics notifications.");
        });
        void refreshNotifications();
        const timer = window.setInterval(refreshNotifications, 10_000);
        return () => { active = false; window.clearInterval(timer); };
    }, [user?.id, user?.role]);

    useEffect(() => {
        if (!notificationsOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!notificationsRef.current?.contains(event.target)) setNotificationsOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setNotificationsOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [notificationsOpen]);

    useEffect(() => {
        if (!mobileNavOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setMobileNavOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mobileNavOpen]);

    useEffect(() => {
        if (!profileOpen) return undefined;
        const closeOnOutsideClick = (event) => {
            if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setProfileOpen(false);
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [profileOpen]);

    useEffect(() => {
        const refreshUser = () => {
            try { setUser(JSON.parse(localStorage.getItem("user") || "null")); }
            catch { setUser(null); }
        };
        window.addEventListener("logistics-profile-updated", refreshUser);
        return () => window.removeEventListener("logistics-profile-updated", refreshUser);
    }, []);

    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        let serverLogoutFailed = false;
        try {
            await api.post("/logout");
        } catch {
            serverLogoutFailed = true;
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login", {
                replace: true,
                state: {
                    message: serverLogoutFailed
                        ? "You were signed out on this device, but server sign-out could not be confirmed. Please retry when online."
                        : "You’ve been signed out successfully.",
                    type: serverLogoutFailed ? "error" : "success",
                },
            });
        }
    };

    const openProfilePage = () => {
        setProfileOpen(false);
        setMobileNavOpen(false);
        navigate("/logistics/profile");
    };
    const openAccountSettings = () => {
        setProfileOpen(false);
        setMobileNavOpen(false);
        navigate("/logistics/settings");
    };

    const openNotification = async (notification) => {
        if (!notification.read_at) {
            try {
                const { data } = await api.patch(`/logistics/notifications/${notification.id}/read`);
                const readAt = data?.data?.read_at || new Date().toISOString();
                setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
                setUnreadNotifications((current) => Math.max(0, current - 1));
                setNotificationError("");
            } catch (error) {
                setNotificationError(error.response?.data?.message || "Unable to mark this notification as read.");
                return;
            }
        }
        setNotificationsOpen(false);
        if (notification.data?.link?.startsWith("/logistics/")) {
            navigate(notification.data.link, { state: { logisticsNotification: notification.data } });
        }
    };

    const markAllNotificationsRead = async () => {
        try {
            await api.patch("/logistics/notifications/read-all");
            const readAt = new Date().toISOString();
            setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || readAt })));
            setUnreadNotifications(0);
            setNotificationError("");
        } catch (error) {
            setNotificationError(error.response?.data?.message || "Unable to mark logistics notifications as read.");
        }
    };

    return (
        <div className={`lw-root${sidebarCollapsed ? " lw-root--collapsed" : ""}${mobileNavOpen ? " lw-root--mobile-open" : ""}`}>
            <aside className="lw-sidebar">
                <div className="lw-sidebar-top">
                    <div className="lw-brand">
                        <img className="lw-brand-mark" src="/cryma-favicon.png" alt="" />
                        <span className="lw-brand-copy"><strong>CRYMA</strong><small>Logistics Panel</small></span>
                    </div>
                    <button type="button" className="lw-sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                        <span /><span /><span />
                    </button>
                </div>
                <nav className="lw-nav" id="logistics-workspace-navigation" aria-label="Logistics workspace">
                    {visibleGroups.map(({ label: groupLabel, links }) => (
                        <section className="lw-nav-group" key={groupLabel}>
                            <h2 className="lw-nav-group-label">{groupLabel}</h2>
                            <div className="lw-nav-group-links">
                                {links.map(({ to, label, flow, icon: Icon }) => (
                                    <NavLink key={to} to={to} end={to === "/logistics/dashboard"} onClick={() => setMobileNavOpen(false)} title={sidebarCollapsed ? label : undefined} className={({ isActive }) => isActive ? "active" : ""}>
                                        <Icon size={18} aria-hidden="true" />
                                        <span className="lw-nav-copy"><span className="lw-nav-label">{label}</span>{flow && <small className="lw-nav-flow">{flow}</small>}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </section>
                    ))}
                </nav>
                <div className="lw-sidebar-bottom" ref={profileRef}>
                    {profileOpen && <section className="lw-profile-menu" id="logistics-account-menu" aria-label="Account menu">
                        <div className="lw-profile-menu-head"><div className="lw-avatar" aria-hidden="true">{initials}</div><div><strong>{fullName}</strong><span>Logistics staff</span></div></div>
                        <div className="lw-profile-divider" />
                        <button type="button" onClick={openProfilePage}><UserRound size={16} aria-hidden="true" />Profile</button>
                        <button type="button" onClick={openAccountSettings}><Settings size={16} aria-hidden="true" />Account settings</button>
                        <button type="button" className="lw-profile-signout" onClick={() => { setProfileOpen(false); setLogoutModalOpen(true); }}><LogOut size={16} aria-hidden="true" />Sign out</button>
                    </section>}
                    <button type="button" className={`lw-profile-trigger${profileOpen ? " is-open" : ""}`} onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-controls="logistics-account-menu" title={sidebarCollapsed ? fullName : undefined}>
                        <span className="lw-avatar" aria-hidden="true">{initials}</span>
                        <span className="lw-user-copy"><strong>{fullName}</strong><small>Logistics staff</small></span>
                        <ChevronDown size={16} aria-hidden="true" />
                    </button>
                </div>
            </aside>

            <div className="lw-main">
                <header className="lw-header">
                    <div className="lw-header-left">
                        <button type="button" className="lw-mobile-menu-toggle" onClick={() => { setSidebarCollapsed(false); setMobileNavOpen((open) => !open); }} aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileNavOpen} aria-controls="logistics-workspace-navigation">
                            <span /><span /><span />
                        </button>
                        <div className="lw-breadcrumb"><span>CRYMA</span><span>/</span><strong>{currentPage}</strong></div>
                    </div>
                    <div className="lw-header-right">
                        <div className="lw-notification-wrap" ref={notificationsRef}>
                            <button type="button" className={`lw-notification-trigger${notificationsOpen ? " is-open" : ""}`} onClick={() => setNotificationsOpen((open) => !open)} aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} aria-expanded={notificationsOpen} aria-haspopup="true" aria-controls="logistics-notification-menu">
                                <Bell size={17} strokeWidth={1.9} />
                                {unreadNotifications > 0 && <span className="lw-notification-count">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
                            </button>
                            {notificationsOpen && <div className="lw-notification-menu" id="logistics-notification-menu" role="dialog" aria-label="Logistics notifications">
                                <div className="lw-notification-menu-head">
                                    <div><strong>Notifications</strong><span>{unreadNotifications ? `${unreadNotifications} unread` : "You're all caught up"}</span></div>
                                    {unreadNotifications > 0 && <button type="button" onClick={() => void markAllNotificationsRead()}>Mark all read</button>}
                                </div>
                                {notificationError && <p className="lw-notification-error" role="alert">{notificationError}</p>}
                                <div className="lw-notification-list">
                                    {notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} className={`lw-notification-item${notification.read_at ? " is-read" : " is-unread"}`} onClick={() => void openNotification(notification)}>
                                        <span className="lw-notification-indicator" />
                                        <span className="lw-notification-copy">
                                            <strong>{notification.data?.title || "Notification"}</strong>
                                            <span>{notification.data?.message || "You have an update."}</span>
                                            <small>{new Date(notification.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small>
                                        </span>
                                    </button>) : <p className="lw-notification-empty">New pickup requests will appear here.</p>}
                                </div>
                            </div>}
                        </div>
                        <div className="lw-header-status"><Boxes size={14} aria-hidden="true" />Logistics workspace</div>
                        <div className="lw-header-date"><span className="lw-header-date-icon"><Clock3 aria-hidden="true" /></span><div><span>Today</span><strong>{headerDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</strong></div></div>
                    </div>
                </header>
                <main className="lw-content al-content"><Outlet /></main>
            </div>
            {mobileNavOpen && <button type="button" className="lw-mobile-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}
            <ConfirmationModal open={logoutModalOpen} title="Sign out?" description="Are you sure you want to sign out of your Logistics account?" confirmLabel="Sign out" busy={loggingOut} onCancel={closeLogoutModal} onConfirm={() => void logout()} />
        </div>
    );
}

export default LogisticsLayout;
