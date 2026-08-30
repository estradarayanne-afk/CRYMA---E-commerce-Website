import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import "./Dashboard.css";

const Icon = ({ name }) => {
    const icons = {
        users: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </>
        ),

        seller: (
            <>
                <path d="M3 9l2-5h14l2 5" />
                <path d="M5 9v10h14V9" />
                <path d="M9 19v-6h6v6" />
                <path d="M3 9h18" />
            </>
        ),

        orders: (
            <>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 4v4" />
                <path d="M16 4v4" />
                <path d="M3 9h18" />
                <path d="M8 13h3" />
                <path d="M8 16h5" />
            </>
        ),

        revenue: (
            <>
                <path d="M12 2v20" />
                <path d="M17 5.5C16.2 4.5 14.7 4 13 4h-2c-2.2 0-4 1.3-4 3s1.8 3 4 3h2c2.2 0 4 1.3 4 3s-1.8 3-4 3h-2c-1.7 0-3.2-.5-4-1.5" />
            </>
        ),

        arrow: (
            <>
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
            </>
        ),

        registration: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6" />
                <path d="M22 11h-6" />
            </>
        ),

        compliance: (
            <>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
            </>
        ),

        complaint: (
            <>
                <path d="M10.3 2.9L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
            </>
        ),

        activity: (
            <>
                <polyline points="3 12 7 12 10 4 14 20 17 12 21 12" />
            </>
        ),

        clock: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </>
        ),
    };

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {icons[name]}
        </svg>
    );
};

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

    const formatNumber = (value) => {
        if (value === null || value === undefined) {
            return "—";
        }

        return Number(value).toLocaleString();
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) {
            return "—";
        }

        return `₱${Number(value).toLocaleString()}`;
    };

    const getRoleLabel = (role) => {
        if (role === "customer") return "Buyer";
        if (role === "rider") return "Courier";

        if (!role) return "Unknown";

        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getStatusLabel = (status) => {
        if (!status) return "Unknown";

        return (
            status.charAt(0).toUpperCase() +
            status.slice(1)
        );
    };

    const getStatusClass = (status) => {
        const normalized = status?.toLowerCase();

        if (
            normalized === "approved" ||
            normalized === "active"
        ) {
            return "approved";
        }

        if (
            normalized === "rejected" ||
            normalized === "disapproved"
        ) {
            return "rejected";
        }

        return "pending";
    };

    const stats = [
        {
            label: "Total Users",
            value: dashboardData?.total_users,
            icon: "users",
            description: "Registered platform users",
            className: "users",
        },
        {
            label: "Total Sellers",
            value: dashboardData?.sellers,
            icon: "seller",
            description: "Registered sellers",
            className: "sellers",
        },
        {
            label: "Total Orders",
            value: dashboardData?.total_orders,
            icon: "orders",
            description: "Orders recorded",
            className: "orders",
        },
        {
            label: "Total Revenue",
            value: dashboardData?.total_revenue,
            icon: "revenue",
            description: "Platform transaction value",
            className: "revenue",
            currency: true,
        },
    ];

    return (
        <div className="dashboard-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="dashboard-page-header">
                <div>
                    <div className="dashboard-eyebrow">
                        CRYMA PLATFORM
                    </div>

                    <h1>Admin Dashboard</h1>

                    <p>
                        Welcome back,{" "}
                        <strong>
                            {user?.first_name || "Administrator"}
                        </strong>
                        . Here's an overview of your platform.
                    </p>
                </div>

                <div className="dashboard-header-date">
                    <Icon name="clock" />
                    <div>
                        <span>Today</span>
                        <strong>
                            {new Date().toLocaleDateString(
                                "en-PH",
                                {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                }
                            )}
                        </strong>
                    </div>
                </div>
            </section>

            {/* =================================================
                ERROR NOTICE
            ================================================= */}

            {dashboardError && (
                <div className="dashboard-error">
                    <div className="dashboard-error-icon">
                        <Icon name="complaint" />
                    </div>

                    <div>
                        <strong>
                            Dashboard data unavailable
                        </strong>

                        <p>
                            The dashboard could not retrieve the
                            latest platform information.
                        </p>
                    </div>
                </div>
            )}

            {/* =================================================
                STATISTICS
            ================================================= */}

            <section className="dashboard-stats">
                {stats.map((stat) => (
                    <article
                        className={`dashboard-stat-card ${stat.className}`}
                        key={stat.label}
                    >
                        <div className="stat-card-top">
                            <div className="stat-card-icon">
                                <Icon name={stat.icon} />
                            </div>

                            <span className="stat-card-label">
                                {stat.label}
                            </span>
                        </div>

                        <div className="stat-card-value">
                            {dashboardLoading
                                ? "..."
                                : stat.currency
                                ? formatCurrency(stat.value)
                                : formatNumber(stat.value)}
                        </div>

                        <div className="stat-card-description">
                            {stat.description}
                        </div>
                    </article>
                ))}
            </section>

            {/* =================================================
                MAIN DASHBOARD GRID
            ================================================= */}

            <section className="dashboard-main-grid">

                {/* RECENT REGISTRATIONS */}

                <article className="dashboard-panel registrations-panel">

                    <div className="dashboard-panel-header">
                        <div>
                            <span className="panel-eyebrow">
                                ACCOUNT MANAGEMENT
                            </span>

                            <h2>Recent Registrations</h2>

                            <p>
                                Latest applications submitted
                                to CRYMA.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="panel-link"
                            onClick={() =>
                                navigate("/admin/registrations")
                            }
                        >
                            View all
                            <Icon name="arrow" />
                        </button>
                    </div>

                    <div className="dashboard-table-container">
                        <table className="dashboard-table">

                            <thead>
                                <tr>
                                    <th>Applicant</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>

                                {dashboardLoading ? (
                                    <tr>
                                        <td
                                            colSpan="3"
                                            className="table-message"
                                        >
                                            Loading registrations...
                                        </td>
                                    </tr>
                                ) : dashboardData?.recent_registrations?.length ? (
                                    dashboardData.recent_registrations.map(
                                        (registration) => {
                                            const fullName = [
                                                registration.first_name,
                                                registration.middle_name,
                                                registration.last_name,
                                            ]
                                                .filter(Boolean)
                                                .join(" ");

                                            return (
                                                <tr
                                                    key={
                                                        registration.id
                                                    }
                                                >
                                                    <td>
                                                        <div className="applicant-cell">
                                                            <div className="applicant-avatar">
                                                                {(
                                                                    registration.first_name?.[0] ||
                                                                    "U"
                                                                ).toUpperCase()}
                                                            </div>

                                                            <div>
                                                                <strong>
                                                                    {fullName ||
                                                                        "Unnamed User"}
                                                                </strong>

                                                                <span>
                                                                    {registration.email ||
                                                                        "No email available"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="role-badge">
                                                            {getRoleLabel(
                                                                registration.role
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`status-badge ${getStatusClass(
                                                                registration.status
                                                            )}`}
                                                        >
                                                            <span />
                                                            {getStatusLabel(
                                                                registration.status
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="3"
                                            className="table-message"
                                        >
                                            No registrations found.
                                        </td>
                                    </tr>
                                )}

                            </tbody>

                        </table>
                    </div>
                </article>

                {/* QUICK ACTIONS */}

                <article className="dashboard-panel quick-actions-panel">

                    <div className="dashboard-panel-header">
                        <div>
                            <span className="panel-eyebrow">
                                ADMINISTRATION
                            </span>

                            <h2>Quick Actions</h2>

                            <p>
                                Frequently used administrative
                                tasks.
                            </p>
                        </div>
                    </div>

                    <div className="quick-actions">

                        <button
                            type="button"
                            className="quick-action"
                            onClick={() =>
                                navigate("/admin/registrations")
                            }
                        >
                            <div className="quick-action-icon registration">
                                <Icon name="registration" />
                            </div>

                            <div>
                                <strong>
                                    Review Registrations
                                </strong>

                                <span>
                                    Review buyer, seller and
                                    courier applications.
                                </span>
                            </div>

                            <Icon name="arrow" />
                        </button>

                        <button
                            type="button"
                            className="quick-action"
                            onClick={() =>
                                navigate(
                                    "/admin/seller-compliance"
                                )
                            }
                        >
                            <div className="quick-action-icon compliance">
                                <Icon name="compliance" />
                            </div>

                            <div>
                                <strong>
                                    Seller Compliance
                                </strong>

                                <span>
                                    Check seller products and
                                    policy compliance.
                                </span>
                            </div>

                            <Icon name="arrow" />
                        </button>

                        <button
                            type="button"
                            className="quick-action"
                            onClick={() =>
                                navigate("/admin/complaints")
                            }
                        >
                            <div className="quick-action-icon complaint">
                                <Icon name="complaint" />
                            </div>

                            <div>
                                <strong>
                                    Complaints & Disputes
                                </strong>

                                <span>
                                    Review issues requiring
                                    administrative attention.
                                </span>
                            </div>

                            <Icon name="arrow" />
                        </button>

                    </div>
                </article>

            </section>

            {/* =================================================
                PLATFORM ACTIVITY
            ================================================= */}

            <section className="dashboard-panel activity-panel">

                <div className="dashboard-panel-header">
                    <div>
                        <span className="panel-eyebrow">
                            PLATFORM MONITORING
                        </span>

                        <h2>Recent Activity</h2>

                        <p>
                            Important activities requiring
                            administrator awareness.
                        </p>
                    </div>
                </div>

                <div className="activity-list">

                    <div className="activity-item">
                        <div className="activity-icon">
                            <Icon name="registration" />
                        </div>

                        <div className="activity-content">
                            <strong>
                                Account registration
                            </strong>

                            <p>
                                New account applications are
                                available for administrator review.
                            </p>
                        </div>

                        <span className="activity-time">
                            Recent
                        </span>
                    </div>

                    <div className="activity-item">
                        <div className="activity-icon">
                            <Icon name="orders" />
                        </div>

                        <div className="activity-content">
                            <strong>
                                Order activity
                            </strong>

                            <p>
                                Monitor order activity across
                                buyers, sellers and couriers.
                            </p>
                        </div>

                        <span className="activity-time">
                            Platform
                        </span>
                    </div>

                    <div className="activity-item">
                        <div className="activity-icon">
                            <Icon name="complaint" />
                        </div>

                        <div className="activity-content">
                            <strong>
                                Complaints and disputes
                            </strong>

                            <p>
                                Review customer issues and
                                coordinate resolutions.
                            </p>
                        </div>

                        <span className="activity-time">
                            Monitor
                        </span>
                    </div>

                </div>
            </section>

        </div>
    );
}

export default AdminDashboard;