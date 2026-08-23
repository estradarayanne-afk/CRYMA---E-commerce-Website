import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../shared/services/api";

const NAV = [
    { to: "/seller/dashboard",  label: "Dashboard" },
    { to: "/seller/inventory",  label: "Inventory" },
    { to: "/seller/orders",     label: "Orders" },
    { to: "/seller/logistics",  label: "Logistics" },
    { to: "/seller/feedback",   label: "Feedback" },
    { to: "/seller/reports",    label: "Reports" },
    { to: "/seller/chat",       label: "Chat" },
];

function SellerLayout() {
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const handleLogout = async () => {
        setLoggingOut(true);
        try { await api.post("/logout"); } catch { /* ignore */ }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/buyer-login", { replace: true, state: { message: "You've been signed out successfully.", type: "success" } });
    };

    const initials = user
        ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
        : "S";

    return (
        <div className="al-root">
            <aside className="al-sidebar">
                <div className="al-brand">
                    <span className="al-brand-name">CRYMA<sup>®</sup></span>
                    <span className="al-brand-sub">Seller Portal</span>
                </div>

                <nav className="al-nav">
                    {NAV.map(({ to, label }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="al-sidebar-foot">
                    <div className="al-user">
                        <div className="al-avatar">{initials}</div>
                        <div className="al-user-info">
                            <strong>{user ? `${user.first_name} ${user.last_name}` : "Seller"}</strong>
                            <span>Seller</span>
                        </div>
                    </div>
                    <button type="button" className="al-logout" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut ? "Signing out…" : "Sign out"}
                    </button>
                </div>
            </aside>

            <div className="al-main">
                <header className="al-header">
                    <div className="al-header-title">
                        <h1>Seller Portal</h1>
                        <p>Manage your store on CRYMA</p>
                    </div>
                    <div className="al-header-user">
                        <div className="al-avatar al-avatar--sm">{initials}</div>
                        <div className="al-user-info">
                            <strong>{user ? `${user.first_name} ${user.last_name}` : "Seller"}</strong>
                            <span>Seller Account</span>
                        </div>
                    </div>
                </header>
                <main className="al-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default SellerLayout;
