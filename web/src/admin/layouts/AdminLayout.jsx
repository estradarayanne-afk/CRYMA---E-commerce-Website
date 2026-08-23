import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../shared/services/api";

const NAV = [
    { to: "/admin/dashboard",         label: "Dashboard" },
    { to: "/admin/registrations",     label: "Registrations" },
    { to: "/admin/users",             label: "User Accounts" },
    { to: "/admin/seller-compliance", label: "Seller Compliance" },
    { to: "/admin/complaints",        label: "Complaints" },
    { to: "/admin/commission",        label: "Commission" },
    { to: "/admin/reports",           label: "Reports" },
    { to: "/admin/settings",          label: "Settings" },
    { to: "/admin/chat",              label: "Chat" },
];

function AdminLayout() {
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
        navigate("/login", { replace: true, state: { message: "You've been signed out successfully.", type: "success" } });
    };

    const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "A";

    return (
        <div className="al-root">
            {/* SIDEBAR */}
            <aside className="al-sidebar">
                <div className="al-brand">
                    <span className="al-brand-name">CRYMA<sup>®</sup></span>
                    <span className="al-brand-sub">Admin Panel</span>
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
                            <strong>{user ? `${user.first_name} ${user.last_name}` : "Administrator"}</strong>
                            <span>Admin</span>
                        </div>
                    </div>
                    <button type="button" className="al-logout" onClick={handleLogout} disabled={loggingOut}>
                        {loggingOut ? "Signing out…" : "Sign out"}
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <div className="al-main">
                <header className="al-header">
                    <div className="al-header-title">
                        <h1>Admin Dashboard</h1>
                        <p>Manage and monitor CRYMA</p>
                    </div>
                    <div className="al-header-user">
                        <div className="al-avatar al-avatar--sm">{initials}</div>
                        <div className="al-user-info">
                            <strong>{user ? `${user.first_name} ${user.last_name}` : "Administrator"}</strong>
                            <span>Administrator</span>
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

export default AdminLayout;
