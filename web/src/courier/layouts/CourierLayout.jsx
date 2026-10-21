import { Link, NavLink, Outlet } from "react-router-dom";
import { ClipboardList, History, LayoutDashboard, PackageCheck } from "lucide-react";
import "./CourierLayout.css";

const LINKS = [
    { to: "/courier/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/courier/pickups", label: "Seller pickups", icon: PackageCheck },
    { to: "/courier/deliveries", label: "Assigned deliveries", icon: ClipboardList },
    { to: "/courier/history", label: "Delivery history", icon: History },
];

export default function CourierLayout() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* use fallback */ }

    return (
        <div className="cw-root">
            <header className="cw-header">
                <Link className="cw-brand" to="/courier/dashboard"><span className="cw-brand-mark">C</span><span><strong>CRYMA</strong><small>Courier workspace</small></span></Link>
                <span className="cw-user">{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Courier"}</span>
            </header>
            <nav className="cw-nav" aria-label="Courier navigation">
                {LINKS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}><Icon size={17} /><span>{label}</span></NavLink>)}
            </nav>
            <main className="cw-content"><Outlet /></main>
        </div>
    );
}
