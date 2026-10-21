import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, History, LayoutDashboard, LogOut, Menu, PackageCheck, PanelLeftClose, PanelLeftOpen, Settings, UserRound, Wallet, MessageCircle, X } from "lucide-react";
import api from "../../shared/services/api";
import CourierConfirmModal from "../components/CourierConfirmModal";
import "./CourierLayout.css";

const LINKS = [
    { to: "/courier/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/courier/pickups", label: "Seller pickups", icon: PackageCheck },
    { to: "/courier/deliveries", label: "Assigned deliveries", icon: ClipboardList },
    { to: "/courier/history", label: "Delivery history", icon: History },
    { to: "/courier/earnings", label: "Earnings", icon: Wallet },
    { to: "/courier/chat", label: "Messages", icon: MessageCircle },
    { to: "/courier/profile", label: "Profile", icon: UserRound },
    { to: "/courier/settings", label: "Settings", icon: Settings },
];

export default function CourierLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loggingOut, setLoggingOut] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("courier-sidebar-collapsed") === "true");
    const [mobileOpen, setMobileOpen] = useState(false);
    let user = null;
    try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* use fallback */ }
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Courier";

    useEffect(() => {
        document.body.classList.toggle("cw-menu-open", mobileOpen);
        return () => document.body.classList.remove("cw-menu-open");
    }, [mobileOpen]);

    const toggleCollapsed = () => setCollapsed((current) => {
        localStorage.setItem("courier-sidebar-collapsed", String(!current));
        return !current;
    });

    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        let logoutFailed = false;
        try { await api.post("/logout"); } catch { logoutFailed = true; }
        finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login", { replace: true, state: { message: logoutFailed ? "You were signed out on this device, but server sign-out could not be confirmed." : "You’ve been signed out successfully.", type: logoutFailed ? "error" : "success" } });
        }
    };

    return <div className={`cw-root${collapsed ? " cw-root--collapsed" : ""}${mobileOpen ? " cw-root--mobile-open" : ""}`}>
        <button className="cw-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} tabIndex={mobileOpen ? 0 : -1} />
        <aside className="cw-sidebar" id="courier-sidebar" aria-label="Courier workspace sidebar">
            <div className="cw-sidebar-brand-row">
                <Link className="cw-brand" to="/courier/dashboard" aria-label="CRYMA courier workspace home"><span className="cw-brand-mark">C</span><span className="cw-brand-copy"><strong>CRYMA</strong><small>Courier workspace</small></span></Link>
                <button className="cw-icon-button cw-collapse-button" type="button" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
                <button className="cw-icon-button cw-mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
            </div>
            <div className="cw-nav-caption">WORKSPACE</div>
            <nav className="cw-nav" aria-label="Courier navigation">
                {LINKS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => isActive ? "active" : ""}><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}
            </nav>
            <div className="cw-sidebar-footer">
                <Link className="cw-sidebar-user" to="/courier/profile" title={collapsed ? name : undefined}><span className="cw-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span><span className="cw-user-copy"><strong>{name}</strong><small>Courier account</small></span></Link>
                <button type="button" className="cw-logout" onClick={() => setConfirmLogout(true)} disabled={loggingOut} title={collapsed ? "Log out" : undefined}><LogOut size={17} aria-hidden="true" /><span>Log out</span></button>
            </div>
        </aside>
        <div className="cw-main">
            <header className="cw-header">
                <button type="button" className="cw-icon-button cw-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="courier-sidebar"><Menu size={21} /></button>
                <div className="cw-header-title"><span>Courier workspace</span><strong>{LINKS.find(({ to }) => location.pathname === to || location.pathname.startsWith(`${to}/`))?.label || "Overview"}</strong></div>
                <span className="cw-header-greeting">Welcome, {name.split(" ")[0]}</span>
            </header>
            <main className="cw-content"><Outlet /></main>
        </div>
        {confirmLogout && <CourierConfirmModal title="Sign out of CRYMA?" message="You’ll need to sign in again to manage courier assignments." confirmLabel="Log out" danger loading={loggingOut} onCancel={() => setConfirmLogout(false)} onConfirm={() => void logout()} />}
    </div>;
}
