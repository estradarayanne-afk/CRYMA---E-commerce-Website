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

        print: (
            <>
                <path d="M6 9V3h12v6" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v7H6z" />
                <path d="M18 12h.01" />
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

function MiniTrendChart({ rows, valueKey, formatCurrency, formatDate, loading, emptyLabel, label }) {
    const values = (rows || []).map((row) => Number(row[valueKey]) || 0);
    const width = 560;
    const height = 148;
    const plot = { left: 12, right: 12, top: 12, bottom: 28 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const maximum = Math.max(...values, 0) || 1;
    const coordinates = values.map((value, index) => ({
        x: values.length < 2 ? width / 2 : plot.left + index / (values.length - 1) * plotWidth,
        y: plot.top + plotHeight - value / maximum * plotHeight,
        value,
        row: rows[index],
    }));
    const path = coordinates.map(({ x, y }, index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
    const lastPoint = coordinates[coordinates.length - 1];
    const area = coordinates.length ? `${path} L${lastPoint.x},${plot.top + plotHeight} L${coordinates[0].x},${plot.top + plotHeight} Z` : "";
    const labelIndexes = [...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1])].filter((index) => index >= 0);

    if (loading || !rows?.length) {
        return <div className="reports-chart-message">{loading ? `Loading ${label.toLowerCase()}...` : emptyLabel}</div>;
    }

    return (
        <div className="reports-mini-chart">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} trend`}>
                <defs>
                    <linearGradient id={`reports-${valueKey}-area`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8A1C30" stopOpacity=".18" />
                        <stop offset="100%" stopColor="#8A1C30" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((line) => {
                    const y = plot.top + line / 3 * plotHeight;
                    return <line key={line} x1={plot.left} x2={width - plot.right} y1={y} y2={y} className="reports-mini-gridline" />;
                })}
                {area && <path d={area} fill={`url(#reports-${valueKey}-area)`} />}
                {path && <path d={path} className="reports-mini-line" />}
                {coordinates.map(({ x, y, value, row }) => (
                    <circle key={row.date} cx={x} cy={y} r="3" className="reports-mini-point">
                        <title>{formatDate(row.date)} · {formatCurrency(value)}{row.orders !== undefined ? ` · ${row.orders} orders` : ""}{row.earnings !== undefined ? ` · Seller earnings ${formatCurrency(row.earnings)}` : ""}</title>
                    </circle>
                ))}
                {labelIndexes.map((index) => {
                    const row = rows[index];
                    const point = coordinates[index];
                    return row && point ? <text key={row.date} x={point.x} y={height - 7} textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"} className="reports-mini-axis-label">{new Date(row.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</text> : null;
                })}
            </svg>
            <div className="reports-mini-chart-caption"><span><i />{label}</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + (Number(row[valueKey]) || 0), 0))} total</strong></div>
        </div>
    );
}

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
                    <h1>Reports</h1>

                    <p>
                        Generate and review sales and commission
                        reports for the CRYMA platform.
                    </p>
                    <div className="reports-print-meta">
                        <span>Period</span>
                        <strong>{getPeriodLabel()}</strong>
                        {reports?.date_range && (
                            <span>
                                {formatDate(reports.date_range.from)} – {formatDate(reports.date_range.to)}
                            </span>
                        )}
                        <span>Prepared {new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
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

                    <div className="reports-action-buttons">
                        <button
                            type="button"
                            className="reports-generate-button"
                            onClick={handleGenerateReport}
                            disabled={loading}
                        >
                            {loading ? "Generating..." : "Generate Report"}
                        </button>
                        <button
                            type="button"
                            className="reports-print-button"
                            onClick={() => window.print()}
                            disabled={loading || !reports}
                        >
                            <Icon name="print" />
                            Print
                        </button>
                    </div>

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

            <div className="reports-summary-analytics-grid">
    <div className="reports-summary-analytics-column">
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
<article className="reports-panel reports-analytics-card">
                    <div className="reports-panel-header"><div><span className="reports-panel-eyebrow">PERFORMANCE ANALYTICS</span><h2>Sales Performance</h2><p>Sales movement across {getPeriodLabel().toLowerCase()}.</p></div></div>
                    <div className="reports-trend-container"><MiniTrendChart rows={reports?.sales_trend} valueKey="total" formatCurrency={formatCurrency} formatDate={formatDate} loading={loading} emptyLabel="No sales activity for this period." label="Sales" /></div>
                </article>
    </div>
    <div className="reports-summary-analytics-column">
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
<article className="reports-panel reports-analytics-card">
                    <div className="reports-panel-header"><div><span className="reports-panel-eyebrow">COMMISSION ANALYTICS</span><h2>Commission Performance</h2><p>Platform commission earned during {getPeriodLabel().toLowerCase()}.</p></div></div>
                    <div className="reports-trend-container"><MiniTrendChart rows={reports?.commission_trend} valueKey="commission" formatCurrency={formatCurrency} formatDate={formatDate} loading={loading} emptyLabel="No commission activity for this period." label="Commission" /></div>
                </article>
    </div>
</div>

        </div>
    );
}

export default Reports;
