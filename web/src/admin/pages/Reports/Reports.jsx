import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Reports.css";

const Icon = ({ name }) => {
    const icons = {
        sales: (
            <>
                <path d="M12 2v20" />
                <path d="M17 5.5C16.2 4.5 14.7 4 13 4h-2c-2.2 0-4 1.3-4 3s1.8 3 4 3h2c2.2 0 4 .7 4 3s-1.2 3-4 3h-2c-1.7 0-3.2-.5-4-1.5" />
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

        shipping: (
            <>
                <path d="M3 7h11v10H3z" />
                <path d="M14 10h4l3 3v4h-7z" />
                <circle cx="7" cy="19" r="2" />
                <circle cx="18" cy="19" r="2" />
            </>
        ),

        commission: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10" />
                <path d="M15 9c-.5-1-1.5-1.5-3-1.5S9 8.2 9 9.5 10.2 11 12 11s3 .7 3 2.5-1.2 2.5-3 2.5-2.5-.5-3-1.5" />
            </>
        ),

        earnings: (
            <>
                <path d="M4 19V5" />
                <path d="M4 19h16" />
                <path d="M7 15l3-4 3 2 5-6" />
            </>
        ),

        clock: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
            </>
        ),

        alert: (
            <>
                <path d="M10.3 2.9L1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
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

function Reports() {
    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [period, setPeriod] = useState("month");

    const [customFrom, setCustomFrom] = useState("");
    const [customTo, setCustomTo] = useState("");

    const fetchReports = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const params = {
                period,
            };

            if (period === "custom") {
                if (customFrom) {
                    params.from = customFrom;
                }

                if (customTo) {
                    params.to = customTo;
                }
            }

            const response = await api.get("/admin/reports", {
                params,
            });

            setReports(response.data.data);
        } catch (error) {
            console.error("Failed to load reports:", error);
            setError("Unable to load report data.");
        } finally {
            setLoading(false);
        }
    }, [period, customFrom, customTo]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchReports();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchReports]);

    const handleGenerateReport = () => {
        fetchReports();
    };

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

        return `₱${Number(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatDate = (value) => {
        if (!value) {
            return "—";
        }

        return new Date(value).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getPeriodLabel = () => {
        const labels = {
            today: "Today",
            week: "This Week",
            month: "This Month",
            year: "This Year",
            custom: "Custom Range",
        };

        return labels[reports?.period] || labels[period] || "This Month";
    };

    return (
        <div className="reports-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <section className="reports-page-header">
                <div>
                    <div className="reports-eyebrow">
                        CRYMA REPORTING
                    </div>

                    <h1>Reports</h1>

                    <p>
                        Generate and review sales and commission
                        reports for the CRYMA platform.
                    </p>
                </div>

                <div className="reports-header-date">
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
                ERROR
            ================================================= */}

            {error && (
                <div className="reports-error">

                    <div className="reports-error-icon">
                        <Icon name="alert" />
                    </div>

                    <div>
                        <strong>
                            Report data unavailable
                        </strong>

                        <p>
                            The reports could not retrieve the
                            latest platform information.
                        </p>
                    </div>

                </div>
            )}

            {/* =================================================
                REPORT FILTER
            ================================================= */}

            <section className="reports-filter-panel">

                <div className="reports-filter-heading">
                    <div>
                        <span className="reports-panel-eyebrow">
                            REPORT FILTER
                        </span>

                        <h2>
                            Reporting Period
                        </h2>

                        <p>
                            Select the period you want to analyze.
                        </p>
                    </div>
                </div>

                <div className="reports-filter-controls">

                    <div className="reports-filter-field">
                        <label htmlFor="report-period">
                            Period
                        </label>

                        <select
                            id="report-period"
                            value={period}
                            onChange={(event) =>
                                setPeriod(event.target.value)
                            }
                        >
                            <option value="today">
                                Today
                            </option>

                            <option value="week">
                                This Week
                            </option>

                            <option value="month">
                                This Month
                            </option>

                            <option value="year">
                                This Year
                            </option>

                            <option value="custom">
                                Custom Range
                            </option>
                        </select>
                    </div>

                    {period === "custom" && (
                        <>
                            <div className="reports-filter-field">
                                <label htmlFor="report-from">
                                    From
                                </label>

                                <input
                                    id="report-from"
                                    type="date"
                                    value={customFrom}
                                    onChange={(event) =>
                                        setCustomFrom(event.target.value)
                                    }
                                />
                            </div>

                            <div className="reports-filter-field">
                                <label htmlFor="report-to">
                                    To
                                </label>

                                <input
                                    id="report-to"
                                    type="date"
                                    value={customTo}
                                    onChange={(event) =>
                                        setCustomTo(event.target.value)
                                    }
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        className="reports-generate-button"
                        onClick={handleGenerateReport}
                        disabled={loading}
                    >
                        {loading
                            ? "Generating..."
                            : "Generate Report"}
                    </button>

                </div>

                {reports?.date_range && (
                    <div className="reports-date-range">
                        Showing data from{" "}
                        <strong>
                            {formatDate(reports.date_range.from)}
                        </strong>{" "}
                        to{" "}
                        <strong>
                            {formatDate(reports.date_range.to)}
                        </strong>
                    </div>
                )}

            </section>

            {/* =================================================
                SALES SUMMARY
            ================================================= */}

            <section className="reports-panel">

                <div className="reports-panel-header">
                    <div>
                        <span className="reports-panel-eyebrow">
                            SALES MANAGEMENT
                        </span>

                        <h2>
                            Sales Summary Report
                        </h2>

                        <p>
                            {getPeriodLabel()} overview of orders,
                            sales, shipping, and transaction value.
                        </p>
                    </div>
                </div>

                <div className="reports-stat-grid">

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="orders" />
                            </div>

                            <span>Total Orders</span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatNumber(
                                    reports?.sales_summary?.total_orders
                                )}
                        </strong>

                        <small>
                            Orders recorded
                        </small>
                    </article>

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="sales" />
                            </div>

                            <span>Total Sales</span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatCurrency(
                                    reports?.sales_summary?.total_sales
                                )}
                        </strong>

                        <small>
                            Product sales value
                        </small>
                    </article>

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="shipping" />
                            </div>

                            <span>Shipping Fees</span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatCurrency(
                                    reports?.sales_summary?.total_shipping
                                )}
                        </strong>

                        <small>
                            Recorded shipping fees
                        </small>
                    </article>

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="earnings" />
                            </div>

                            <span>Total Revenue</span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatCurrency(
                                    reports?.sales_summary?.total_revenue
                                )}
                        </strong>

                        <small>
                            Total transaction value
                        </small>
                    </article>

                </div>

            </section>

            {/* =================================================
                SALES TREND
            ================================================= */}

            <section className="reports-panel">

                <div className="reports-panel-header">
                    <div>
                        <span className="reports-panel-eyebrow">
                            PERFORMANCE ANALYTICS
                        </span>

                        <h2>
                            Sales Trend
                        </h2>

                        <p>
                            Daily sales and order activity for the
                            selected reporting period.
                        </p>
                    </div>
                </div>

                <div className="reports-trend-container">

                    {loading ? (
                        <div className="reports-chart-message">
                            Loading sales trend...
                        </div>
                    ) : reports?.sales_trend?.length ? (
                        <div className="reports-trend-list">

                            {reports.sales_trend.map((item) => (
                                <div
                                    className="reports-trend-row"
                                    key={item.date}
                                >
                                    <div className="reports-trend-date">
                                        {formatDate(item.date)}
                                    </div>

                                    <div className="reports-trend-bar-area">
                                        <div
                                            className="reports-trend-bar"
                                            style={{
                                                width: `${Math.min(
                                                    Number(item.total) > 0
                                                        ? Math.max(
                                                            5,
                                                            (
                                                                Number(item.total) /
                                                                Math.max(
                                                                    ...reports.sales_trend.map(
                                                                        (trend) =>
                                                                            Number(
                                                                                trend.total
                                                                            )
                                                                    )
                                                                )
                                                            ) *
                                                            100
                                                        )
                                                        : 0,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="reports-trend-value">
                                        {formatCurrency(item.total)}
                                    </div>

                                    <div className="reports-trend-orders">
                                        {formatNumber(item.orders)} orders
                                    </div>
                                </div>
                            ))}

                        </div>
                    ) : (
                        <div className="reports-chart-message">
                            No sales activity found for this period.
                        </div>
                    )}

                </div>

            </section>

            {/* =================================================
                COMMISSION REPORT
            ================================================= */}

            <section className="reports-panel">

                <div className="reports-panel-header">
                    <div>
                        <span className="reports-panel-eyebrow">
                            FINANCIAL MANAGEMENT
                        </span>

                        <h2>
                            Commission Report
                        </h2>

                        <p>
                            {getPeriodLabel()} overview of seller
                            commissions and seller earnings.
                        </p>
                    </div>
                </div>

                <div className="reports-stat-grid commission-grid">

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="commission" />
                            </div>

                            <span>
                                Commission Records
                            </span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatNumber(
                                    reports?.commission_report?.total_records
                                )}
                        </strong>

                        <small>
                            Commission records generated
                        </small>
                    </article>

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="commission" />
                            </div>

                            <span>
                                Total Commission
                            </span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatCurrency(
                                    reports?.commission_report?.total_commission
                                )}
                        </strong>

                        <small>
                            Platform commission earned
                        </small>
                    </article>

                    <article className="reports-stat-card">
                        <div className="reports-stat-top">
                            <div className="reports-stat-icon">
                                <Icon name="earnings" />
                            </div>

                            <span>
                                Seller Earnings
                            </span>
                        </div>

                        <strong>
                            {loading
                                ? "..."
                                : formatCurrency(
                                    reports?.commission_report?.total_seller_earnings
                                )}
                        </strong>

                        <small>
                            Total seller earnings
                        </small>
                    </article>

                </div>

            </section>

            {/* =================================================
                COMMISSION TREND
            ================================================= */}

            <section className="reports-panel">

                <div className="reports-panel-header">
                    <div>
                        <span className="reports-panel-eyebrow">
                            COMMISSION ANALYTICS
                        </span>

                        <h2>
                            Commission Trend
                        </h2>

                        <p>
                            Commission earned and seller earnings
                            during the selected period.
                        </p>
                    </div>
                </div>

                <div className="reports-trend-container">

                    {loading ? (
                        <div className="reports-chart-message">
                            Loading commission trend...
                        </div>
                    ) : reports?.commission_trend?.length ? (
                        <div className="reports-trend-list">

                            {reports.commission_trend.map((item) => (
                                <div
                                    className="reports-trend-row commission-trend-row"
                                    key={item.date}
                                >
                                    <div className="reports-trend-date">
                                        {formatDate(item.date)}
                                    </div>

                                    <div className="reports-trend-bar-area">
                                        <div
                                            className="reports-trend-bar"
                                            style={{
                                                width: `${Math.min(
                                                    Number(item.commission) > 0
                                                        ? Math.max(
                                                            5,
                                                            (
                                                                Number(
                                                                    item.commission
                                                                ) /
                                                                Math.max(
                                                                    ...reports.commission_trend.map(
                                                                        (trend) =>
                                                                            Number(
                                                                                trend.commission
                                                                            )
                                                                    )
                                                                )
                                                            ) *
                                                            100
                                                        )
                                                        : 0,
                                                    100
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <div className="reports-trend-value">
                                        {formatCurrency(item.commission)}
                                    </div>

                                    <div className="reports-trend-orders">
                                        Earnings:{" "}
                                        {formatCurrency(item.earnings)}
                                    </div>
                                </div>
                            ))}

                        </div>
                    ) : (
                        <div className="reports-chart-message">
                            No commission activity found for this period.
                        </div>
                    )}

                </div>

            </section>

        </div>
    );
}

export default Reports;
