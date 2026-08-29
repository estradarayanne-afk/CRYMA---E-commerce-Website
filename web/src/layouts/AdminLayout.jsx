import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    ClipboardList,
    Users,
    ShieldCheck,
    MessageSquareWarning,
    Percent,
    Settings,
    MessageCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    User,
    ChevronDown,
} from "lucide-react";

import api from "../services/api";

function AdminLayout() {
    const navigate = useNavigate();

    const [user] = useState(() => {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
            return null;
        }

        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error("Invalid stored user:", error);
            return null;
        }
    });

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);

        try {
            await api.post("/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            navigate("/login", { replace: true });
        }
    };

    const navigationItems = [
        {
            label: "Dashboard",
            path: "/admin/dashboard",
            icon: LayoutDashboard,
        },
        {
            label: "Account Registrations",
            path: "/admin/registrations",
            icon: ClipboardList,
        },
        {
            label: "User Accounts",
            path: "/admin/users",
            icon: Users,
        },
        {
            label: "Seller Compliance",
            path: "/admin/seller-compliance",
            icon: ShieldCheck,
        },
        {
            label: "Complaints & Disputes",
            path: "/admin/complaints",
            icon: MessageSquareWarning,
        },
        {
            label: "Commission",
            path: "/admin/commission",
            icon: Percent,
        },
        {
            label: "Reports",
            path: "/admin/reports",
            icon: ClipboardList,
        },
        {
            label: "Platform Settings",
            path: "/admin/settings",
            icon: Settings,
        },
        {
            label: "Chat / Messaging",
            path: "/admin/chat",
            icon: MessageCircle,
        },
    ];

    return (
        <div className={`admin-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
            {/* =================================================
                SIDEBAR
            ================================================= */}

            <aside className="admin-sidebar">
                {/* BRAND */}

                <div className="admin-logo">
                    <div className="admin-logo-main">
                        <h2>CRYMA</h2>
                        <span>Admin Panel</span>
                    </div>
                </div>

                {/* COLLAPSE BUTTON */}

                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setSidebarCollapsed((current) => !current)}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
                </button>

                {/* NAVIGATION */}

                <nav className="admin-navigation">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `admin-nav-link ${isActive ? "active" : ""}`
                                }
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <span className="admin-nav-icon">
                                    <Icon size={16} strokeWidth={1.9} />
                                </span>

                                <span className="admin-nav-label">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* SIDEBAR FOOTER */}

                <div className="admin-sidebar-footer">
                    <button
                        type="button"
                        className="admin-logout-button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        <span className="logout-icon">
                            <LogOut size={16} strokeWidth={1.9} />
                        </span>

                        <span className="admin-nav-label">
                            {loggingOut ? "Logging out..." : "Logout"}
                        </span>
                    </button>
                </div>
            </aside>

            {/* =================================================
                MAIN
            ================================================= */}

            <div className="admin-main">
                {/* =================================================
                    TOPBAR
                ================================================= */}

                <header className="admin-header">
                    <div className="admin-header-title">
                        <h1>Admin Dashboard</h1>

                        <p>Manage and monitor CRYMA</p>
                    </div>

                    <div className="admin-header-right">
                        {/* NOTIFICATION */}

                        <button
                            type="button"
                            className="admin-notification-button"
                            aria-label="Notifications"
                        >
                            <Bell size={17} strokeWidth={1.8} />

                            <i />
                        </button>

                        {/* PROFILE */}

                        <div className="admin-profile-wrapper">
                            <button
                                type="button"
                                className="admin-profile"
                                onClick={() => setProfileOpen((current) => !current)}
                            >
                                <div className="admin-avatar">
                                    {user?.first_name?.charAt(0)?.toUpperCase() || "A"}
                                </div>

                                <div className="admin-profile-info">
                                    <strong>
                                        {user
                                            ? `${user.first_name} ${user.last_name}`
                                            : "Administrator"}
                                    </strong>

                                    <span>Administrator</span>
                                </div>

                                <ChevronDown className="profile-chevron" size={14} />
                            </button>

                            {/* PROFILE DROPDOWN */}

                            {profileOpen && (
                                <div className="admin-profile-dropdown">
                                    <div className="profile-dropdown-header">
                                        <strong>
                                            {user
                                                ? `${user.first_name} ${user.last_name}`
                                                : "Administrator"}
                                        </strong>

                                        <span>Administrator Account</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate("/admin/settings");
                                        }}
                                    >
                                        <User size={14} />
                                        &nbsp;&nbsp;Account Settings
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        disabled={loggingOut}
                                    >
                                        <LogOut size={14} />
                                        &nbsp;&nbsp;
                                        {loggingOut ? "Logging out..." : "Logout"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* =================================================
                    PAGE CONTENT
                ================================================= */}

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
