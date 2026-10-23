import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Commission.css";

function Commission() {
    const [commissions, setCommissions] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [overviewPeriod, setOverviewPeriod] = useState("month");
    const [overview, setOverview] = useState({ total_commission: 0, record_count: 0, points: [] });
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewError, setOverviewError] = useState("");

    const [selectedCommission, setSelectedCommission] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchCommissions = useCallback(async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const params = {};

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            params.page = page;

            const response = await api.get(
                "/admin/commissions",
                { params }
            );

            const data = response.data.data;

            setCommissions(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 10,
                total: data?.total || 0,
            });
        } catch (err) {
            console.error(
                "Commission API error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load commission records."
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCommissions();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchCommissions]);

    useEffect(() => {
        let active = true;
        setOverviewLoading(true);
        setOverviewError("");

        api.get("/admin/commissions/overview", { params: { period: overviewPeriod } })
            .then((response) => {
                if (active) setOverview(response.data?.data || { total_commission: 0, record_count: 0, points: [] });
            })
            .catch((err) => {
                if (active) setOverviewError(err.response?.data?.message || "Unable to load commission overview.");
            })
            .finally(() => {
                if (active) setOverviewLoading(false);
            });

        return () => { active = false; };
    }, [overviewPeriod]);

    const getSellerName = (commission) => {
        const seller = commission.seller;

        if (!seller) {
            return "Unknown Seller";
        }

        return [
            seller.first_name,
            seller.middle_name,
            seller.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unknown Seller";
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case "paid":
                return "paid";

            case "completed":
                return "completed";

            case "cancelled":
            case "rejected":
                return "cancelled";

            default:
                return "pending";
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));
    const handleViewCommission = async (commission) => {
        setSelectedCommission(commission);
        setDetailsLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/commissions/${commission.id}`
            );

            setSelectedCommission(
                response.data.data
            );
        } catch (err) {
            console.error(
                "Commission details error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load commission details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setSelectedCommission(null);
        setError("");
    };

    return (
        <div className="commission-page">

            {/* HEADER */}

            <div className="commission-header">

                <div>
                    <span className="commission-eyebrow">
                        FINANCIAL MANAGEMENT
                    </span>

                    <h1>
                        Commissions
                    </h1>

                    <p>
                        Monitor seller commissions and seller earnings.
                    </p>
                    <div className="commission-rate-note">
                        <strong>10% standard platform rate</strong>
                        <span>Commission is calculated from the order amount; each record shows the rate applied.</span>
                    </div>
                </div>

                <div className="commission-count">

                    <strong>
                        {pagination.total}
                    </strong>

                    <span>
                        Records
                    </span>

                </div>

            </div>

            <CommissionTrend
                data={overview}
                loading={overviewLoading}
                error={overviewError}
                period={overviewPeriod}
                onPeriodChange={setOverviewPeriod}
                formatCurrency={formatCurrency}
            />


            {/* ERROR */}

            {error && (
                <div className="commission-error">
                    {error}
                </div>
            )}


            {/* MAIN CARD */}

            <div className="commission-card">

                {/* TOOLBAR */}

                <div className="commission-toolbar">

                    <div className="commission-status-pills" role="group" aria-label="Filter commissions by status">
                        {[
                            ["all", "All records"],
                            ["pending", "Pending"],
                            ["paid", "Paid"],
                            ["completed", "Completed"],
                            ["cancelled", "Cancelled"],
                        ].map(([status, label]) => (
                            <button
                                key={status}
                                type="button"
                                className={statusFilter === status ? "active" : ""}
                                aria-pressed={statusFilter === status}
                                onClick={() => setStatusFilter(status)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="commission-search">

                        <span>
                            ⌕
                        </span>

                        <input
                            type="text"
                            placeholder="Search seller..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                        />

                    </div>


                    <div className="commission-filter">

                        <label htmlFor="commission-status">
                            Status
                        </label>

                        <select
                            id="commission-status"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Status
                            </option>

                            <option value="pending">
                                Pending
                            </option>

                            <option value="paid">
                                Paid
                            </option>

                            <option value="completed">
                                Completed
                            </option>

                            <option value="cancelled">
                                Cancelled
                            </option>
                        </select>

                    </div>

                </div>


                {/* TABLE */}

                {loading ? (

                    <div className="commission-loading">
                        Loading commission records...
                    </div>

                ) : (
                    <>
                    <div className="commission-table-wrapper">

                        <table className="commission-table">

                            <thead>

                                <tr>

                                    <th>
                                        Seller
                                    </th>

                                    <th>
                                        Order
                                    </th>

                                    <th>
                                        Order Amount
                                    </th>

                                    <th>
                                        Commission
                                    </th>

                                    <th>
                                        Seller Earnings
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {commissions.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="commission-empty"
                                        >
                                            No commission records found.
                                        </td>

                                    </tr>

                                ) : (

                                    commissions.map(
                                        (commission) => (

                                            <tr
                                                className="commission-row"
                                                key={
                                                    commission.id
                                                }
                                            >

                                                {/* SELLER */}

                                                <td>

                                                    <strong>
                                                        {getSellerName(
                                                            commission
                                                        )}
                                                    </strong>

                                                </td>


                                                {/* ORDER */}

                                                <td>

                                                    #{commission.order_id}

                                                </td>


                                                {/* ORDER AMOUNT */}

                                                <td>

                                                    {formatCurrency(
                                                        commission.order_amount
                                                    )}

                                                </td>


                                                {/* COMMISSION */}

                                                <td>

                                                    <div className="commission-amount">

                                                        <strong>
                                                            {formatCurrency(
                                                                commission.commission_amount
                                                            )}
                                                        </strong>

                                                        <span>
                                                            {Number(commission.commission_rate ?? 10)}% platform fee
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* SELLER EARNINGS */}

                                                <td>

                                                    <strong>
                                                        {formatCurrency(
                                                            commission.seller_earnings
                                                        )}
                                                    </strong>

                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <span
                                                        className={`commission-status ${getStatusClass(
                                                            commission.status
                                                        )}`}
                                                    >

                                                        <span />

                                                        {commission.status ||
                                                            "Pending"}

                                                    </span>

                                                </td>


                                                {/* ACTION */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="commission-view-button"
                                                        onClick={() =>
                                                            handleViewCommission(
                                                                commission
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                    {pagination.total > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={fetchCommissions}
                        />
                    )}
                    </>
                )}

            </div>


            {/* DETAILS MODAL */}

            {selectedCommission && (

                <div
                    className="commission-modal-overlay"
                    onClick={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDetailsModal();
                        }

                    }}
                >

                    <div
                        className="commission-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="commission-modal-header">

                            <div>

                                <span>
                                    COMMISSION DETAILS
                                </span>

                                <h2>
                                    Commission #{selectedCommission.id}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeDetailsModal
                                }
                            >
                                ×
                            </button>

                        </div>


                        {detailsLoading ? (

                            <div className="commission-loading">
                                Loading commission details...
                            </div>

                        ) : (

                            <>

                                {/* SELLER */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Seller Information
                                    </h4>

                                    <div className="commission-detail-grid">

                                        <div>
                                            <span>
                                                Seller
                                            </span>

                                            <strong>
                                                {getSellerName(
                                                    selectedCommission
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Seller ID
                                            </span>

                                            <strong>
                                                #{selectedCommission.seller_id}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Email
                                            </span>

                                            <strong>
                                                {selectedCommission
                                                    .seller
                                                    ?.email ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Status
                                            </span>

                                            <strong>
                                                {selectedCommission.status ||
                                                    "Pending"}
                                            </strong>
                                        </div>

                                    </div>

                                </section>


                                {/* ORDER */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Order Information
                                    </h4>

                                    <div className="commission-detail-grid">

                                        <div>
                                            <span>
                                                Order ID
                                            </span>

                                            <strong>
                                                #{selectedCommission.order_id}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Order Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.order_amount
                                                )}
                                            </strong>
                                        </div>

                                    </div>

                                </section>


                                {/* COMMISSION BREAKDOWN */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Commission Breakdown
                                    </h4>

                                    <div className="commission-breakdown">

                                        <div>
                                            <span>
                                                Order Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.order_amount
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Commission Rate
                                            </span>

                                            <strong>
                                                {selectedCommission.commission_rate}%
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Commission Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.commission_amount
                                                )}
                                            </strong>
                                        </div>

                                        <div className="commission-total">

                                            <span>
                                                Seller Earnings
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.seller_earnings
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                    <p className="commission-formula">
                                        {formatCurrency(selectedCommission.order_amount)} × {Number(selectedCommission.commission_rate ?? 10)}% = {formatCurrency(selectedCommission.commission_amount)} platform commission
                                    </p>

                                </section>


                                <div className="commission-modal-footer">

                                    <button
                                        type="button"
                                        className="commission-done-button"
                                        onClick={
                                            closeDetailsModal
                                        }
                                    >
                                        Done
                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </div>

            )}

        </div>
    );
}

function CommissionTrend({ data, loading, error, period, onPeriodChange, formatCurrency }) {
    const [activePoint, setActivePoint] = useState(null);
    useEffect(() => setActivePoint(null), [period, data]);
    const points = Array.isArray(data?.points) ? data.points : [];
    const width = 900;
    const height = 190;
    const plot = { left: 74, right: 20, top: 12, bottom: 34 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const maxValue = Math.max(...points.map((point) => Number(point.amount) || 0), 0);
    const magnitude = maxValue > 0 ? (10 ** Math.floor(Math.log10(maxValue))) / 4 : 1;
    const axisMaximum = maxValue > 0 ? Math.ceil(maxValue / magnitude) * magnitude : 1;
    const formatAxisCurrency = (amount) => {
        const value = Number(amount) || 0;
        const compact = value >= 1000000
            ? `${(value / 1000000).toLocaleString("en-PH", { maximumFractionDigits: 1 })}M`
            : value >= 1000
                ? `${(value / 1000).toLocaleString("en-PH", { maximumFractionDigits: 1 })}K`
                : value.toLocaleString("en-PH", { maximumFractionDigits: 0 });
        return `PHP ${compact}`;
    };
    const coordinates = points.map((point, index) => ({
        ...point,
        x: points.length < 2 ? plot.left + plotWidth / 2 : plot.left + (index / (points.length - 1)) * plotWidth,
        y: plot.top + plotHeight - ((Number(point.amount) || 0) / axisMaximum) * plotHeight,
    }));
    const linePath = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const areaPath = coordinates.length
        ? `${linePath} L${coordinates[coordinates.length - 1].x},${plot.top + plotHeight} L${coordinates[0].x},${plot.top + plotHeight} Z`
        : "";
    const labelIndexes = [...new Set([0, Math.round((points.length - 1) / 4), Math.round((points.length - 1) / 2), Math.round(((points.length - 1) * 3) / 4), points.length - 1])]
        .filter((index) => index >= 0);
    const updateActivePoint = (event) => {
        if (!coordinates.length) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const chartX = ((event.clientX - bounds.left) / bounds.width) * width;
        const nearest = coordinates.reduce((best, point) => Math.abs(point.x - chartX) < Math.abs(best.x - chartX) ? point : best);
        setActivePoint(nearest);
    };

    return (
        <section className="commission-overview" aria-labelledby="commission-overview-title">
            <div className="commission-overview-heading">
                <div>
                    <span className="commission-overview-eyebrow">COMMISSION OVERVIEW</span>
                    <h2 id="commission-overview-title">Platform commission generated</h2>
                    <p>Daily totals for the last 30 days or monthly totals for the last 12 months.</p>
                </div>
                <div className="commission-overview-period" role="group" aria-label="Choose commission graph timeframe">
                    <button type="button" className={period === "month" ? "active" : ""} aria-pressed={period === "month"} onClick={() => onPeriodChange("month")}>30 days</button>
                    <button type="button" className={period === "year" ? "active" : ""} aria-pressed={period === "year"} onClick={() => onPeriodChange("year")}>12 months</button>
                </div>
            </div>

            <div className="commission-overview-total-row">
                <div>
                    <span>Total commission in period</span>
                    <strong>{formatCurrency(data?.total_commission)}</strong>
                </div>
                <span className="commission-overview-records">{Number(data?.record_count || 0).toLocaleString()} commission records</span>
            </div>

            {error ? (
                <div className="commission-overview-message error">{error}</div>
            ) : (
                <div className={`commission-chart-wrap ${loading ? "is-loading" : ""}`}>
                    <svg className="commission-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Platform commission totals ${period === "month" ? "by day over the last 30 days" : "by month over the last 12 months"}`} onMouseMove={updateActivePoint} onMouseLeave={() => setActivePoint(null)}>
                        <defs>
                            <linearGradient id="commission-area-gradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#8A1C30" stopOpacity=".2" />
                                <stop offset="100%" stopColor="#8A1C30" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {[0, 1, 2, 3, 4].map((step) => {
                            const y = plot.top + (step / 4) * plotHeight;
                            const value = axisMaximum * (1 - step / 4);
                            return (
                                <g key={step}>
                                    <line x1={plot.left} x2={width - plot.right} y1={y} y2={y} className="commission-chart-gridline" />
                                    <text x={plot.left - 12} y={y + 4} textAnchor="end" className="commission-chart-y-label">{formatAxisCurrency(value)}</text>
                                </g>
                            );
                        })}
                        {areaPath && <path d={areaPath} fill="url(#commission-area-gradient)" />}
                        {activePoint && <line x1={activePoint.x} x2={activePoint.x} y1={plot.top} y2={plot.top + plotHeight} className="commission-chart-crosshair" />}
                        {linePath && <path d={linePath} className="commission-chart-line" />}
                        {coordinates.map((point) => (
                            <circle key={point.date} cx={point.x} cy={point.y} r={activePoint?.date === point.date ? "5" : "3.2"} className="commission-chart-point" tabIndex="0" role="img" aria-label={`${point.label}: ${formatCurrency(point.amount)}`} onMouseEnter={() => setActivePoint(point)} onMouseLeave={() => setActivePoint(null)} onFocus={() => setActivePoint(point)} onBlur={() => setActivePoint(null)}>
                                <title>{point.label}: {formatCurrency(point.amount)}</title>
                            </circle>
                        ))}
                        {labelIndexes.map((index) => {
                            const point = coordinates[index];
                            return point ? <text key={`${point.date}-label`} x={point.x} y={height - 12} textAnchor="middle" className="commission-chart-x-label">{point.label}</text> : null;
                        })}
                    </svg>
                    {activePoint && <div className="commission-chart-tooltip" style={{ left: `${(activePoint.x / width) * 100}%`, top: `${(activePoint.y / height) * 100}%` }} role="status"><span>{activePoint.label}</span><strong>{formatCurrency(activePoint.amount)}</strong></div>}
                    {loading && <span className="commission-chart-loading">Updating graph…</span>}
                    {!loading && !error && Number(data?.record_count || 0) === 0 && <span className="commission-chart-empty">No commission records in this period yet.</span>}
                </div>
            )}
            <div className="commission-chart-legend"><i /> Commission amount</div>
        </section>
    );
}

function Pagination({ pagination, onPageChange }) {
    return (
        <div className="commission-pagination">
            <div className="commission-pagination-info">
                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total}</strong>
            </div>
            <div className="commission-pagination-controls">
                <button type="button" className="commission-pagination-button" disabled={pagination.current_page === 1} onClick={() => onPageChange(pagination.current_page - 1)}>← Previous</button>
                <div className="commission-pagination-pages">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button type="button" key={page} className={`commission-pagination-page ${page === pagination.current_page ? "active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
                    ))}
                </div>
                <button type="button" className="commission-pagination-button" disabled={pagination.current_page === pagination.last_page} onClick={() => onPageChange(pagination.current_page + 1)}>Next →</button>
            </div>
        </div>
    );
}

export default Commission;
