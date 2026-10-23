import { useEffect, useMemo, useState } from "react";
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
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState("");
    const [analyticsPeriod, setAnalyticsPeriod] = useState("month");
    const [visibleSeries, setVisibleSeries] = useState({ gmv: true, commission: true });
    const [activePoint, setActivePoint] = useState(null);
    const [activeRole, setActiveRole] = useState(null);
    const [drilldown, setDrilldown] = useState({ date: "", orders: [], loading: false, error: "" });
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setAnalyticsLoading(true);
        setAnalyticsError("");
        api.get("/admin/reports", { params: { period: analyticsPeriod } })
            .then(({ data }) => { if (!cancelled) setAnalytics(data.data); })
            .catch((error) => {
                if (cancelled) return;
                console.error("Failed to load dashboard analytics:", error);
                setAnalyticsError("Sales data could not be loaded. Try refreshing the dashboard.");
            })
            .finally(() => { if (!cancelled) setAnalyticsLoading(false); });
        return () => { cancelled = true; };
    }, [analyticsPeriod, refreshKey]);

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
    }, [refreshKey]);

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
        if (role === "logistics") return "Logistics / Sorting Center";

        if (!role) return "Unknown";

        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const getStatusLabel = (status) => {
        if (!status) return "Unknown";

        if (status.toLowerCase() === "pending") return "Pending Approval";

        return (
            status.charAt(0).toUpperCase() +
            status.slice(1)
        );
    };

    const roleDistribution = useMemo(() => [
        { key: "buyer", label: "Buyers", value: Number(dashboardData?.customers) || 0, color: "#B21F3A" },
        { key: "seller", label: "Sellers", value: Number(dashboardData?.sellers) || 0, color: "#7E1830" },
        { key: "logistics", label: "Logistics", value: Number(dashboardData?.logistics) || 0, color: "#D98A9D" },
        { key: "rider", label: "Couriers", value: Number(dashboardData?.riders) || 0, color: "#EBC3CD" },
    ], [dashboardData]);
    const roleTotal = roleDistribution.reduce((sum, role) => sum + role.value, 0);
    const salesTrend = analytics?.sales_trend || [];
    const commissionTrend = analytics?.commission_trend || [];
    const chartMax = Math.max(1, ...salesTrend.map((point) => Number(point.total) || 0));
    const commissionMax = Math.max(1, ...commissionTrend.map((point) => Number(point.commission) || 0));
    const chartPoints = salesTrend.map((point, index) => {
        const x = salesTrend.length < 2 ? 50 : (index / (salesTrend.length - 1)) * 100;
        const y = 100 - ((Number(point.total) || 0) / chartMax) * 88;
        return `${x},${y}`;
    }).join(" ");
    const commissionPoints = commissionTrend.map((point, index) => {
        const x = commissionTrend.length < 2 ? 50 : (index / (commissionTrend.length - 1)) * 100;
        const y = 100 - ((Number(point.commission) || 0) / commissionMax) * 88;
        return `${x},${y}`;
    }).join(" ");
    const commissionTotal = commissionTrend.reduce((sum, point) => sum + (Number(point.commission) || 0), 0);
    const openOrderDrilldown = async (date) => {
        setDrilldown({ date, orders: [], loading: true, error: "" });
        try {
            const { data } = await api.get("/admin/orders", { params: { date } });
            setDrilldown({ date, orders: data.data || [], loading: false, error: "" });
        } catch (error) {
            setDrilldown({ date, orders: [], loading: false, error: error.response?.data?.message || "Could not load orders for this date." });
        }
    };
    const showChartPoint = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        const index = Math.round(ratio * Math.max(0, salesTrend.length - 1));
        const point = salesTrend[index];
        if (point) setActivePoint({ ...point, commission: commissionTrend[index]?.commission || 0, index, ratio });
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

    const getMonthlyTrend = (key) => {
        const trend = dashboardData?.monthly_activity?.[key];
        if (!trend) return null;
        const current = Number(trend.current) || 0;
        const previous = Number(trend.previous) || 0;
        if (!previous) return { rate: current ? "New" : "0.0%", direction: current ? "up" : "neutral", current, previous };
        const change = ((current - previous) / previous) * 100;
        return { rate: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`, direction: change > 0 ? "up" : change < 0 ? "down" : "neutral", current, previous };
    };

    const stats = [
        {
            label: "Total Users",
            value: dashboardData?.total_users,
            icon: "users",
            description: "Registered platform users",
            trendKey: "users",
            className: "users",
        },
        {
            label: "Total Sellers",
            value: dashboardData?.sellers,
            icon: "seller",
            description: "Registered sellers",
            trendKey: "sellers",
            className: "sellers",
        },
        {
            label: "Total Orders",
            value: dashboardData?.total_orders,
            icon: "orders",
            description: "Orders recorded",
            trendKey: "orders",
            className: "orders",
        },
        {
            label: "Total Revenue",
            value: dashboardData?.total_revenue,
            icon: "revenue",
            description: "Platform transaction value",
            trendKey: "revenue",
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

            </section>

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
                {stats.map((stat) => {
                    const trend = dashboardLoading ? null : getMonthlyTrend(stat.trendKey);
                    const activityValue = (value) => stat.currency ? formatCurrency(value) : formatNumber(value);
                    return (
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

                        <div className={`stat-card-trend ${trend?.direction || "neutral"}`} title="Compares month-to-date activity with the same dates last month">
                            <strong>{trend?.direction === "up" ? "↑ " : trend?.direction === "down" ? "↓ " : ""}{trend?.rate || "—"}</strong>
                            <span>vs prior period</span>
                        </div>

                        <div className="stat-card-description">
                            {dashboardLoading ? stat.description : `${activityValue(trend?.current)} this month · ${activityValue(trend?.previous)} same dates last month`}
                        </div>
                    </article>
                    );
                })}
            </section>

            <section className="dashboard-analytics-grid" aria-label="Platform analytics">
                <article className="dashboard-panel analytics-panel">
                    <div className="dashboard-panel-header analytics-header">
                        <div>
                            <span className="panel-eyebrow">SALES PERFORMANCE</span>
                            <h2>GMV &amp; commission trend</h2>
                            <p>GMV is product subtotal before shipping. Hover for daily values; select a point to inspect that day’s orders.</p>
                            {analytics?.date_range && !analyticsLoading && <span className="analytics-date-range">{new Date(`${analytics.date_range.from}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – {new Date(`${analytics.date_range.to}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>}
                        </div>
                        <div className="analytics-controls">
                            <label className="analytics-period-label">
                                <span className="sr-only">Analytics timeframe</span>
                                <select value={analyticsPeriod} onChange={(event) => { setActivePoint(null); setAnalyticsPeriod(event.target.value); }}>
                                    <option value="today">Today</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option>
                                </select>
                            </label>
                            <button className={`analytics-icon-button${dashboardLoading || analyticsLoading ? " is-loading" : ""}`} type="button" onClick={() => setRefreshKey((key) => key + 1)} aria-label="Refresh dashboard data" title="Refresh"><span aria-hidden="true">↻</span></button>
                        </div>
                    </div>
                    <div className="analytics-chart-wrap">
                        <div className="analytics-legend">
                            <button type="button" className={visibleSeries.gmv ? "selected" : "muted"} onClick={() => setVisibleSeries((value) => ({ ...value, gmv: !value.gmv }))} aria-pressed={visibleSeries.gmv}><i className="legend-gmv" />GMV</button>
                            <button type="button" className={visibleSeries.commission ? "selected" : "muted"} onClick={() => setVisibleSeries((value) => ({ ...value, commission: !value.commission }))} aria-pressed={visibleSeries.commission}><i className="legend-commission" />Commission</button>
                        </div>
                        {analyticsError ? <div className="chart-empty chart-error">{analyticsError}</div> : analyticsLoading ? <div className="chart-empty">Loading {analyticsPeriod} sales data…</div> : salesTrend.length ? <>
                            <div key={`${analyticsPeriod}-${refreshKey}`} className="analytics-chart" aria-label={`Daily GMV and commission trend across ${salesTrend.length} days`} onMouseMove={showChartPoint} onMouseLeave={() => setActivePoint(null)}>
                                <div className="chart-y-labels"><span>₱{chartMax.toLocaleString()}</span><span>₱{Math.round(chartMax / 2).toLocaleString()}</span><span>₱0</span></div>
                                {visibleSeries.commission && <div className="chart-y-labels chart-y-labels-right"><span>₱{commissionMax.toLocaleString()}</span><span>₱{Math.round(commissionMax / 2).toLocaleString()}</span><span>₱0</span></div>}
                                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                                    <defs><linearGradient id="gmv-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8A1C30" stopOpacity=".35"/><stop offset="100%" stopColor="#8A1C30" stopOpacity="0"/></linearGradient></defs>
                                    {visibleSeries.gmv && <><path d={`M ${chartPoints} L 100 100 L 0 100 Z`} fill="url(#gmv-area)" /><polyline points={chartPoints} fill="none" stroke="#7E1830" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></>}
                                    {visibleSeries.commission && commissionPoints && <polyline points={commissionPoints} fill="none" stroke="#D98A9D" strokeWidth="1.8" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
                                    {salesTrend.map((point, index) => <circle key={point.date} cx={salesTrend.length < 2 ? 50 : (index / (salesTrend.length - 1)) * 100} cy={100 - ((Number(point.total) || 0) / chartMax) * 88} r="2.1" className="chart-hit-target" onMouseEnter={() => setActivePoint({ ...point, commission: commissionTrend[index]?.commission || 0, index, ratio: salesTrend.length < 2 ? .5 : index / (salesTrend.length - 1) })} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint({ ...point, commission: commissionTrend[index]?.commission || 0, index, ratio: salesTrend.length < 2 ? .5 : index / (salesTrend.length - 1) })} onBlur={() => setActivePoint(null)} onClick={() => openOrderDrilldown(point.date)} tabIndex="0" role="button" aria-label={`Open orders for ${point.date}; GMV ${formatCurrency(point.total)}`} />)}
                                </svg>
                                {activePoint && <><div className="chart-crosshair" style={{ left: `${activePoint.ratio * 100}%` }} /><div className="chart-tooltip" style={{ left: `${Math.min(86, Math.max(6, activePoint.ratio * 100))}%` }}><strong>{new Date(`${activePoint.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong><span>GMV: {formatCurrency(activePoint.total)}</span><span>Commission: {formatCurrency(activePoint.commission)} ({Number(activePoint.total) ? ((Number(activePoint.commission) / Number(activePoint.total)) * 100).toFixed(1) : "0.0"}%)</span><small>Click point to view orders</small></div></>}
                            </div>
                            <div className="chart-x-labels"><span>{new Date(`${salesTrend[0]?.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span><span>{new Date(`${salesTrend[Math.floor(salesTrend.length / 2)]?.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span><span>{new Date(`${salesTrend[salesTrend.length - 1]?.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span></div>
                        </> : <div className="chart-empty">No sales history for this period yet.</div>}
                        {!analyticsLoading && !analyticsError && analytics && <div className="analytics-summary"><span>Total GMV <strong>{formatCurrency(analytics.sales_summary?.total_sales ?? 0)}</strong></span><span>Commission <strong>{formatCurrency(commissionTotal)}</strong></span><span>Orders <strong>{formatNumber(analytics.sales_summary?.total_orders ?? 0)}</strong></span></div>}
                    </div>
                </article>

                <article className="dashboard-panel analytics-panel role-panel">
                    <div className="dashboard-panel-header"><div><span className="panel-eyebrow">COMMUNITY</span><h2>Users by role</h2><p>Registered platform accounts by role.</p></div></div>
                    <div className="role-chart-content">
                        <div className="role-donut-wrap">
                            <svg className="role-donut" viewBox="0 0 100 100" role="img" aria-label={`${roleTotal} registered users across roles`}>
                                <circle cx="50" cy="50" r="40" fill="none" stroke="#F6E9EC" strokeWidth="17" />
                                {roleTotal > 0 && roleDistribution.map((role, index) => {
                                    const percentage = role.value / roleTotal * 100;
                                    const offset = roleDistribution.slice(0, index).reduce((sum, item) => sum + item.value / roleTotal * 100, 0);
                                    return <circle key={role.label} cx="50" cy="50" r="40" fill="none" stroke={role.color} strokeWidth={activeRole === role.label ? "22" : "17"} strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-offset} pathLength="100" transform="rotate(-90 50 50)" className="role-slice" style={{ opacity: activeRole && activeRole !== role.label ? .45 : 1, cursor: "pointer" }} onMouseEnter={() => setActiveRole(role.label)} onMouseLeave={() => setActiveRole(null)} onClick={() => navigate(`/admin/users?role=${role.key}`)} tabIndex="0" role="button" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/admin/users?role=${role.key}`); }} aria-label={`Filter user accounts by ${role.label}`} />;
                                })}
                            </svg>
                            <div className="role-donut-center"><strong>{formatNumber(roleTotal)}</strong><span>Total users</span></div>
                        </div>
                        <ul className="role-legend">{roleDistribution.map((role) => <li key={role.label} className={activeRole === role.label ? "active" : ""} onMouseEnter={() => setActiveRole(role.label)} onMouseLeave={() => setActiveRole(null)}><button type="button" onClick={() => navigate(`/admin/users?role=${role.key}`)}><span><i style={{ backgroundColor: role.color }} />{role.label}</span><strong>{formatNumber(role.value)} <small>({roleTotal ? (role.value / roleTotal * 100).toFixed(1) : "0.0"}%)</small></strong></button></li>)}</ul>
                    </div>
                </article>
            </section>

            {drilldown.date && <div className="drilldown-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDrilldown({ date: "", orders: [], loading: false, error: "" }); }}>
                <section className="drilldown-modal" role="dialog" aria-modal="true" aria-labelledby="drilldown-title">
                    <header><div><span className="panel-eyebrow">DAILY ORDERS</span><h2 id="drilldown-title">Orders on {new Date(`${drilldown.date}T12:00:00`).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</h2></div><button type="button" aria-label="Close orders" onClick={() => setDrilldown({ date: "", orders: [], loading: false, error: "" })}>×</button></header>
                    {drilldown.loading ? <p className="drilldown-message">Loading orders…</p> : drilldown.error ? <p className="drilldown-message">{drilldown.error}</p> : drilldown.orders.length ? <div className="drilldown-orders">{drilldown.orders.map((order) => <article key={order.id}><div><strong>Order #{order.id}</strong><span>{order.buyer ? `${order.buyer.first_name || ""} ${order.buyer.last_name || ""}`.trim() : "Buyer"}</span></div><div><strong>{formatCurrency(order.total_amount)}</strong><span>{order.status}</span></div></article>)}</div> : <p className="drilldown-message">No orders were recorded on this date.</p>}
                </section>
            </div>}

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
                                                            <div className="applicant-avatar" style={{ "--avatar-hue": `${[...String(registration.email || registration.id)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360}deg` }}>
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
                                                        <span className={`role-badge role-${registration.role || "unknown"}`}>
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
