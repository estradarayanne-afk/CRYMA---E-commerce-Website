import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../services/api";

function AdminLayout() {
    console.log("🔥 CRYMA ADMIN LAYOUT IS RENDERING");

    const navigate = useNavigate();
    

    // =========================
    // ADMIN USER
    // =========================

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

    // =========================
    // LOGOUT STATE
    // =========================

    const [loggingOut, setLoggingOut] = useState(false);

    // =========================
    // LOGOUT
    // =========================

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

    // =========================
    // NAVIGATION
    // =========================

    return (
        <div
            style={{
                display: "flex",
                minHeight: "100vh",
                background: "#f5f8f8",
            }}
        >

            {/* =====================================
                SIDEBAR
            ====================================== */}

            <aside
                style={{
                    width: "260px",
                    minHeight: "100vh",
                    background: "#0f4c4c",
                    color: "white",
                    padding: "24px 16px",
                    position: "fixed",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 1000,
                }}
            >

                {/* BRAND */}

                <div className="admin-logo">
                    <h2>CRYMA</h2>
                    <span>Admin Panel</span>
                </div>


                {/* NAVIGATION */}

                <nav className="admin-navigation">

                    {/* Dashboard */}

                    <NavLink
                        to="/admin/dashboard"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Dashboard</span>
                    </NavLink>


                    {/* Account Registrations */}

                    <NavLink
                        to="/admin/registrations"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Account Registrations</span>
                    </NavLink>


                    {/* User Accounts */}

                    <NavLink
                        to="/admin/users"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>User Accounts</span>
                    </NavLink>


                    {/* Seller Compliance */}

                    <NavLink
                        to="/admin/seller-compliance"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Seller Compliance</span>
                    </NavLink>


                    {/* Complaints */}

                    <NavLink
                        to="/admin/complaints"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Complaints & Disputes</span>
                    </NavLink>


                    {/* Commission */}

                    <NavLink
                        to="/admin/commission"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Commission</span>
                    </NavLink>


                    {/* Reports */}

                    <NavLink
                        to="/admin/reports"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Reports</span>
                    </NavLink>


                    {/* Platform Settings */}

                    <NavLink
                        to="/admin/settings"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Platform Settings</span>
                    </NavLink>


                    {/* Chat */}

                    <NavLink
                        to="/admin/chat"
                        className={({ isActive }) =>
                            isActive ? "active" : ""
                        }
                    >
                        <span>Chat / Messaging</span>
                    </NavLink>

                </nav>


                {/* =====================================
                    SIDEBAR FOOTER
                ====================================== */}

                <div className="admin-sidebar-footer">

                    <button
                        type="button"
                        className="admin-logout-button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                    >
                        {loggingOut
                            ? "Logging out..."
                            : "Logout"}
                    </button>

                </div>

            </aside>


            {/* =====================================
                MAIN AREA
            ====================================== */}

            <div
                style={{
                    flex: 1,
                    marginLeft: "260px",
                    minHeight: "100vh",
                }}
            >


                {/* =================================
                    HEADER
                ================================== */}

                <header className="admin-header">

                    {/* HEADER TITLE */}

                    <div className="admin-header-title">

                        <h1>
                            Admin Dashboard
                        </h1>

                        <p>
                            Manage and monitor CRYMA
                        </p>

                    </div>


                    {/* ADMIN PROFILE */}

                    <div className="admin-profile">

                        {/* Avatar */}

                        <div className="admin-avatar">

                            {user?.first_name
                                ?.charAt(0)
                                ?.toUpperCase() || "A"}

                        </div>


                        {/* Information */}

                        <div className="admin-profile-info">

                            <strong>

                                {user
                                    ? `${user.first_name} ${user.last_name}`
                                    : "Administrator"}

                            </strong>

                            <span>
                                Administrator
                            </span>

                        </div>

                    </div>

                </header>


                {/* =================================
                    PAGE CONTENT
                ================================== */}

                <main className="admin-content">

                    <Outlet />

                </main>

            </div>

        </div>
    );
}

export default AdminLayout;