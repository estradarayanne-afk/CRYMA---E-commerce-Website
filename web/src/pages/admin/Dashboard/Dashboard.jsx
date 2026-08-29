import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

function AdminDashboard() {
    const navigate = useNavigate();

    const [dashboardData, setDashboardData] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState("");

    const storedUser = localStorage.getItem("user");

    let user = null;

    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Invalid user data:", error);
    }

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setDashboardLoading(true);
                setDashboardError("");

                const response = await api.get("/admin/dashboard");

                setDashboardData(response.data.data);
            } catch (error) {
                console.error("Failed to load dashboard:", error);

                setDashboardError("Unable to load dashboard data.");
            } finally {
                setDashboardLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    return (
        <div className="dashboard-page">
            {/* =========================
                PAGE INTRO
            ========================== */}

            <section className="dashboard-intro">
                <div>
                    <h2>Overview</h2>

                    <p>
                        Welcome back, <strong>{user?.first_name || "Administrator"}</strong>. Here's
                        what's happening in CRYMA today.
                    </p>
                </div>
            </section>

            {/* =========================
                STATISTICS
            ========================== */}

            <section className="dashboard-stats">
                {/* USERS */}
                <div className="dashboard-stat-card">
                    <div className="stat-card-content">
                        <span className="stat-card-label">Total Users</span>

                        <h3>
                            {dashboardLoading
                                ? "..."
                                : dashboardError
                                ? "—"
                                : dashboardData?.total_users ?? 0}
                        </h3>

                        <p className="stat-card-change">+12.5% this month</p>
                    </div>
                    <div className="stat-card-icon">U</div>
                </div>

                {/* SELLERS */}
                <div className="dashboard-stat-card">
                    <div className="stat-card-content">
                        <span className="stat-card-label">Total Sellers</span>
                        
                        <h3>
                            {dashboardLoading
                                ? "..."
                                : dashboardError
                                ? "—"
                                : dashboardData?.sellers ?? 0}
                        </h3>

                        <p className="stat-card-change">+8 new this month</p>
                    </div>
                    <div className="stat-card-icon">S</div>
                </div>

                {/* ORDERS */}
                <div className="dashboard-stat-card">
                    <div className="stat-card-content">
                        <span className="stat-card-label">Total Orders</span>
                        <h3>2,481</h3>
                        <p className="stat-card-change">+18.2% this month</p>
                    </div>
                    <div className="stat-card-icon">O</div>
                </div>

                {/* REVENUE */}
                <div className="dashboard-stat-card">
                    <div className="stat-card-content">
                        <span className="stat-card-label">Total Revenue</span>
                        <h3>₱245,820</h3>
                        <p className="stat-card-change">+15.8% this month</p>
                    </div>
                    <div className="stat-card-icon">₱</div>
                </div>
            </section>

            {/* =========================
                MAIN DASHBOARD GRID
            ========================== */}

            <section className="dashboard-grid">
                {/* RECENT REGISTRATIONS */}
                <div className="dashboard-panel">
                    <div className="dashboard-panel-header">
                        <div>
                            <h3>Recent Registrations</h3>
                            <p>Latest accounts registered on CRYMA</p>
                        </div>

                        <button type="button" onClick={() => navigate("/admin/registrations")}>
                            View All
                        </button>
                    </div>

                    <div className="dashboard-table-wrapper">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {dashboardLoading ? (
                                    <tr>
                                        <td colSpan="3">Loading registrations...</td>
                                    </tr>
                                ) : dashboardError ? (
                                    <tr>
                                        <td colSpan="3">Unable to load registrations.</td>
                                    </tr>
                                ) : dashboardData?.recent_registrations?.length ? (
                                    dashboardData.recent_registrations.map((registration) => {
                                        const fullName = [
                                            registration.first_name,
                                            registration.middle_name,
                                            registration.last_name,
                                        ]
                                            .filter(Boolean)
                                            .join(" ");

                                        const roleLabel =
                                            registration.role === "customer"
                                                ? "Buyer"
                                                : registration.role === "rider"
                                                ? "Courier"
                                                : registration.role
                                                        ? registration.role.charAt(0).toUpperCase() +
                                                        registration.role.slice(1)
                                                        : "Unknown";

                                        const statusLabel = registration.status
                                            ? registration.status.charAt(0).toUpperCase() +
                                            registration.status.slice(1)
                                            : "Unknown";

                                        return (
                                            <tr key={registration.id}>
                                                <td>{fullName || "Unnamed User"}</td>
                                                <td>{roleLabel}</td>
                                                <td>
                                                    <span
                                                        className={`status ${registration.status || "pending"}`}
                                                    >
                                                        {statusLabel}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="3">No registrations found.</td>
                                    </tr>
                                )}
                            </tbody>

                        </table>
                    </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="dashboard-panel">
                    <div className="dashboard-panel-header">
                        <div>
                            <h3>Quick Actions</h3>
                            <p>Common administrative tasks</p>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <button type="button" onClick={() => navigate("/admin/registrations")}>
                            <strong>Review Registrations</strong>
                            <span>Check pending account applications</span>
                        </button>

                        <button type="button" onClick={() => navigate("/admin/seller-compliance")}>
                            <strong>Seller Compliance</strong>
                            <span>Review seller verification documents</span>
                        </button>

                        <button type="button" onClick={() => navigate("/admin/complaints")}>
                            <strong>View Complaints</strong>
                            <span>Manage complaints and disputes</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* =========================
                ACTIVITY
            ========================== */}

            <section className="dashboard-panel activity-panel">
                <div className="dashboard-panel-header">
                    <div>
                        <h3>Recent Activity</h3>
                        <p>Latest activities across the platform</p>
                    </div>
                </div>

                <div className="activity-list">
                    <div className="activity-item">
                        <div className="activity-dot" />
                        <div>
                            <strong>New seller registration</strong>
                            <p>A new seller account is waiting for review.</p>
                            <span>10 minutes ago</span>
                        </div>
                    </div>

                    <div className="activity-item">
                        <div className="activity-dot" />
                        <div>
                            <strong>New order received</strong>
                            <p>A customer placed a new order.</p>
                            <span>32 minutes ago</span>
                        </div>
                    </div>

                    <div className="activity-item">
                        <div className="activity-dot" />
                        <div>
                            <strong>Complaint submitted</strong>
                            <p>A customer submitted a complaint requiring attention.</p>
                            <span>1 hour ago</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default AdminDashboard;