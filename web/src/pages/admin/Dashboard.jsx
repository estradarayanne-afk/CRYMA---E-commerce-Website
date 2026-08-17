import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

function AdminDashboard() {
    const navigate = useNavigate();

    const [loggingOut, setLoggingOut] = useState(false);

    const storedUser = localStorage.getItem("user");

    let user = null;

    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Invalid user data:", error);
    }

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

    return (
        <div className="dashboard-page">

            {/* =========================
                PAGE INTRO
            ========================== */}

            <section className="dashboard-intro">

                <div>
                    <h2>Overview</h2>

                    <p>
                        Welcome back,{" "}
                        <strong>
                            {user?.first_name || "Administrator"}
                        </strong>
                        . Here's what's happening in CRYMA today.
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

                        <span className="stat-card-label">
                            Total Users
                        </span>

                        <h3>
                            1,248
                        </h3>

                        <p className="stat-card-change">
                            +12.5% this month
                        </p>

                    </div>

                    <div className="stat-card-icon">
                        U
                    </div>

                </div>


                {/* SELLERS */}

                <div className="dashboard-stat-card">

                    <div className="stat-card-content">

                        <span className="stat-card-label">
                            Total Sellers
                        </span>

                        <h3>
                            86
                        </h3>

                        <p className="stat-card-change">
                            +8 new this month
                        </p>

                    </div>

                    <div className="stat-card-icon">
                        S
                    </div>

                </div>


                {/* ORDERS */}

                <div className="dashboard-stat-card">

                    <div className="stat-card-content">

                        <span className="stat-card-label">
                            Total Orders
                        </span>

                        <h3>
                            2,481
                        </h3>

                        <p className="stat-card-change">
                            +18.2% this month
                        </p>

                    </div>

                    <div className="stat-card-icon">
                        O
                    </div>

                </div>


                {/* REVENUE */}

                <div className="dashboard-stat-card">

                    <div className="stat-card-content">

                        <span className="stat-card-label">
                            Total Revenue
                        </span>

                        <h3>
                            ₱245,820
                        </h3>

                        <p className="stat-card-change">
                            +15.8% this month
                        </p>

                    </div>

                    <div className="stat-card-icon">
                        ₱
                    </div>

                </div>

            </section>


            {/* =========================
                MAIN DASHBOARD GRID
            ========================== */}

            <section className="dashboard-grid">

                {/* =====================
                    RECENT REGISTRATIONS
                ====================== */}

                <div className="dashboard-panel">

                    <div className="dashboard-panel-header">

                        <div>
                            <h3>
                                Recent Registrations
                            </h3>

                            <p>
                                Latest accounts registered on CRYMA
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/admin/registrations")
                            }
                        >
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

                                <tr>
                                    <td>
                                        Maria Santos
                                    </td>

                                    <td>
                                        Seller
                                    </td>

                                    <td>
                                        <span className="status pending">
                                            Pending
                                        </span>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        John Reyes
                                    </td>

                                    <td>
                                        Customer
                                    </td>

                                    <td>
                                        <span className="status active">
                                            Active
                                        </span>
                                    </td>
                                </tr>

                                <tr>
                                    <td>
                                        Angela Cruz
                                    </td>

                                    <td>
                                        Seller
                                    </td>

                                    <td>
                                        <span className="status pending">
                                            Pending
                                        </span>
                                    </td>
                                </tr>

                            </tbody>

                        </table>

                    </div>

                </div>


                {/* =====================
                    QUICK ACTIONS
                ====================== */}

                <div className="dashboard-panel">

                    <div className="dashboard-panel-header">

                        <div>
                            <h3>
                                Quick Actions
                            </h3>

                            <p>
                                Common administrative tasks
                            </p>
                        </div>

                    </div>


                    <div className="quick-actions">

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/admin/registrations")
                            }
                        >
                            <strong>
                                Review Registrations
                            </strong>

                            <span>
                                Check pending account applications
                            </span>
                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                navigate("/admin/seller-compliance")
                            }
                        >
                            <strong>
                                Seller Compliance
                            </strong>

                            <span>
                                Review seller verification documents
                            </span>
                        </button>


                        <button
                            type="button"
                            onClick={() =>
                                navigate("/admin/complaints")
                            }
                        >
                            <strong>
                                View Complaints
                            </strong>

                            <span>
                                Manage complaints and disputes
                            </span>
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
                        <h3>
                            Recent Activity
                        </h3>

                        <p>
                            Latest activities across the platform
                        </p>
                    </div>

                </div>


                <div className="activity-list">

                    <div className="activity-item">

                        <div className="activity-dot" />

                        <div>
                            <strong>
                                New seller registration
                            </strong>

                            <p>
                                A new seller account is waiting for review.
                            </p>

                            <span>
                                10 minutes ago
                            </span>
                        </div>

                    </div>


                    <div className="activity-item">

                        <div className="activity-dot" />

                        <div>
                            <strong>
                                New order received
                            </strong>

                            <p>
                                A customer placed a new order.
                            </p>

                            <span>
                                32 minutes ago
                            </span>
                        </div>

                    </div>


                    <div className="activity-item">

                        <div className="activity-dot" />

                        <div>
                            <strong>
                                Complaint submitted
                            </strong>

                            <p>
                                A customer submitted a complaint requiring attention.
                            </p>

                            <span>
                                1 hour ago
                            </span>
                        </div>

                    </div>

                </div>

            </section>

        </div>
    );
}

export default AdminDashboard;