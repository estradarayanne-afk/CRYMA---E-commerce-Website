import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    BarChart3,
    Boxes,
    ClipboardList,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    MapPinned,
    PackageCheck,
    Settings,
    Truck,
    UserRound,
    UsersRound,
} from "lucide-react";
import api from "../../shared/services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import "./LogisticsLayout.css";

const LINKS = [
    { to: "/logistics/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/logistics/riders", label: "Rider Management", icon: UsersRound },
    { to: "/logistics/pickups", label: "Pickup Requests", icon: ClipboardList },
    { to: "/logistics/incoming-parcels", label: "Incoming Parcels", icon: PackageCheck },
    { to: "/logistics/sorting", label: "Sorting", icon: Boxes },
    { to: "/logistics/delivery-assignment", label: "Delivery Assignment", icon: MapPinned },
    { to: "/logistics/delivery-monitoring", label: "Courier Deliveries", icon: Truck },
    { to: "/logistics/reports", label: "Reports", icon: BarChart3 },
];

function LogisticsLayout() {
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [logoutModalOpen, setLogoutModalOpen] = useState(false);
    const profileRef = useRef(null);
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });
    const closeLogoutModal = useCallback(() => setLogoutModalOpen(false), []);
    const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Logistics staff";
    const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

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

    return (
        <div className={`lw-root${sidebarCollapsed ? " lw-root--collapsed" : ""}${mobileNavOpen ? " lw-root--mobile-open" : ""}`}>
            <aside className="lw-sidebar">
                <div className="lw-sidebar-top">
                    <div className="lw-brand">
                        <span className="lw-brand-mark">C</span>
                        <span className="lw-brand-copy"><strong>CRYMA</strong><small>Logistics Panel</small></span>
                    </div>
                    <button type="button" className="lw-sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                        <span /><span /><span />
                    </button>
                </div>
                <p className="lw-section-label">Workspace</p>
                <nav className="lw-nav" id="logistics-workspace-navigation" aria-label="Logistics workspace">
                    {LINKS.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} end={to === "/logistics/dashboard"} onClick={() => setMobileNavOpen(false)} title={sidebarCollapsed ? label : undefined} className={({ isActive }) => isActive ? "active" : ""}>
                            <Icon size={18} aria-hidden="true" />
                            <span className="lw-nav-label">{label}</span>
                        </NavLink>
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
                        <div className="lw-breadcrumb"><span>CRYMA</span><span>/</span><strong>Logistics</strong></div>
                    </div>
                    <div className="lw-header-status"><span />System online</div>
                </header>
                <main className="lw-content"><Outlet /></main>
            </div>
            {mobileNavOpen && <button type="button" className="lw-mobile-backdrop" aria-label="Close navigation menu" onClick={() => setMobileNavOpen(false)} />}
            <ConfirmationModal open={logoutModalOpen} title="Sign out?" description="Are you sure you want to sign out of your Logistics account?" confirmLabel="Sign out" busy={loggingOut} onCancel={closeLogoutModal} onConfirm={() => void logout()} />
        </div>
    );
}

export default LogisticsLayout;
