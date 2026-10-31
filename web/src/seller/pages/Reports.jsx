import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Award, BarChart3, CalendarDays, PackageCheck, Printer, TrendingUp } from "lucide-react";
import api from "../../shared/services/api";
import SellerEarnings from "./Earnings";

const toLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const TODAY = toLocalDate(new Date());
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
const SIX_MONTHS_AGO = toLocalDate(sixMonthsAgo);

const money = (value) => `₱${Number(value || 0).toLocaleString()}`;

function Reports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = searchParams.get("view") === "earnings" ? "earnings" : "reports";
    const [from, setFrom] = useState(SIX_MONTHS_AGO);
    const [to, setTo] = useState(TODAY);
    const [appliedRange, setAppliedRange] = useState({ from: SIX_MONTHS_AGO, to: TODAY });
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [preparingPrint, setPreparingPrint] = useState(false);
    const [printReport, setPrintReport] = useState(null);
    const [error, setError] = useState("");

    const load = useCallback(async (range) => {
        setLoading(true);
        setError("");

        try {
            const { data } = await api.get("/seller/reports", { params: range });
            setReport(data.data);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Failed to load reports.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(appliedRange); }, 0);
        return () => window.clearTimeout(timer);
    }, [load, appliedRange]);

    const summary = report?.summary || { revenue: 0, orders: 0, units: 0 };
    const monthly = report?.monthly || [];
    const topProducts = report?.top_products || [];
    const maxRevenue = Math.max(...monthly.map((month) => Number(month.revenue) || 0), 1) * 1.15;

    const printLastTwelveMonths = async () => {
        if (preparingPrint) return;
        setPreparingPrint(true);
        setError("");
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        const toLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        try {
            const { data } = await api.get("/seller/reports", { params: { from: toLocalDate(start), to: toLocalDate(today) } });
            const source = data.data;
            const monthlyByName = new Map((source.monthly || []).map((month) => [month.period, month]));
            const twelveMonths = Array.from({ length: 12 }, (_, index) => {
                const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
                const label = date.toLocaleDateString("en-US", { month: "short" });
                const year = date.getFullYear();
                const record = monthlyByName.get(`${year}-${String(date.getMonth() + 1).padStart(2, "0")}`);
                return { ...record, month: `${label} ${year}`, revenue: Number(record?.revenue || 0), orders: Number(record?.orders || 0), units: Number(record?.units || 0) };
            });
            setPrintReport({ ...source, monthly: twelveMonths });
            window.setTimeout(() => window.print(), 100);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to prepare the 12-month report for printing.");
        } finally {
            setPreparingPrint(false);
        }
    };

    return (
        <div className="sl-page sl-reports-page">
            <header className="sl-page-head sl-reports-head">
                <div><span className="sl-eyebrow">SELLER WORKSPACE · FINANCE</span><h1 className="sl-h1">Earnings & Reports</h1><p>Track payouts and explore sales performance in one place.</p></div>
                {activeView === "reports" && <button className="sl-report-print" type="button" onClick={() => void printLastTwelveMonths()} disabled={preparingPrint}><Printer size={16} /> {preparingPrint ? "Preparing report…" : "Print 12-month report"}</button>}
            </header>

            <div className="sl-insights-tabs" role="tablist" aria-label="Earnings and reports">
                <button type="button" role="tab" aria-selected={activeView === "reports"} className={activeView === "reports" ? "is-active" : ""} onClick={() => setSearchParams({})}><BarChart3 size={16} /> Sales reports</button>
                <button type="button" role="tab" aria-selected={activeView === "earnings"} className={activeView === "earnings" ? "is-active" : ""} onClick={() => setSearchParams({ view: "earnings" })}><TrendingUp size={16} /> Earnings & payouts</button>
            </div>

            {activeView === "earnings" ? <SellerEarnings /> : <>
            <div className="sl-card sl-date-filter sl-report-date-filter">
                <div className="sl-report-range-heading"><span className="sl-report-icon"><CalendarDays size={17} /></span><span><strong>Reporting period</strong><small>Choose the dates included in this report.</small></span></div>
                <div className="sl-date-inputs">
                    <div className="sl-field sl-field--inline"><label>From</label><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></div>
                    <span style={{ color: "#9aa8a6", alignSelf: "flex-end", paddingBottom: 2 }}>to</span>
                    <div className="sl-field sl-field--inline"><label>To</label><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></div>
                </div>
                <button className="sl-btn-primary" onClick={() => setAppliedRange({ from, to })} disabled={loading || !from || !to || from > to}>Generate report</button>
                <span className="sl-date-applied">Showing <strong>{report?.from || from}</strong><span aria-hidden="true"> to </span><strong>{report?.to || to}</strong></span>
            </div>

            {error && <div className="auth-notice auth-notice--error">{error}</div>}
            {loading && <div className="sl-empty">Loading report...</div>}

            {!loading && (
                <>
                    <section className="sl-report-overview" aria-label="Report summary">
                    <div className="sl-stats">
                        {[
                            { label: "Gross sales", value: money(summary.gross_sales ?? summary.revenue), sub: "Product sales in this period", icon: <TrendingUp size={17} /> },
                            { label: "Seller net earnings (profit)", value: money(summary.seller_net_earnings), sub: "After recorded platform commission", icon: <PackageCheck size={17} /> },
                            { label: "Commission fees", value: money(summary.commission_fees), sub: "Platform fees recorded for this period", icon: <CalendarDays size={17} /> },
                            { label: "Orders", value: summary.orders, sub: `${summary.completed_orders || 0} completed · ${summary.completion_rate || 0}% completion`, icon: <CalendarDays size={17} /> },
                            { label: "Units sold", value: summary.units, sub: "Across your product range", icon: <PackageCheck size={17} /> },
                            { label: "Average order value", value: money(summary.average_order_value), sub: "Gross sales divided by orders", icon: <Award size={17} /> },
                        ].map((stat) => <article className="sl-stat-card sl-report-stat" key={stat.label}><div className="sl-report-stat-head"><span className="sl-report-stat-icon">{stat.icon}</span><span className="sl-stat-label">{stat.label}</span></div><strong className="sl-stat-value">{stat.value}</strong><span className="sl-stat-change">{stat.sub}</span></article>)}
                    </div>
                    </section>

                    <div className="sl-grid-2">
                        <div className="sl-panel sl-report-panel">
                            <div className="sl-panel-head sl-report-panel-head"><span className="sl-report-panel-icon"><BarChart3 size={17} /></span><div><h3>Revenue over time</h3><p>Monthly sales totals within the selected period</p></div></div>
                            <div className="sl-chart sl-report-chart">
                                {monthly.length === 0 && <p className="sl-empty">No sales in this date range.</p>}
                                {monthly.map((month) => <div className="sl-bar-col" key={month.period || month.month}><span className="sl-bar-val">{money(month.revenue)}</span><div className="sl-bar-track"><div className="sl-bar-fill" style={{ height: `${(month.revenue / maxRevenue) * 100}%` }} /></div><span className="sl-bar-label">{month.month}</span></div>)}
                            </div>
                        </div>

                        <div className="sl-panel sl-report-panel">
                            <div className="sl-panel-head sl-report-panel-head"><span className="sl-report-panel-icon"><Award size={17} /></span><div><h3>Top products</h3><p>Ranked by revenue from recorded sales</p></div></div>
                            <div className="sl-list">
                                {topProducts.map((product, index) => <div className="sl-list-row sl-report-product-row" key={product.name}><span className="sl-report-rank">{index + 1}</span><div className="sl-list-main"><strong>{product.name}</strong><span>{product.units} {Number(product.units) === 1 ? "unit" : "units"} sold</span></div><strong>{money(product.revenue)}</strong></div>)}
                                {topProducts.length === 0 && <p className="sl-empty">No sales in this date range.</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {printReport && <section className="sl-report-print-page" aria-label="Printable 12-month seller report">
                <header className="sl-report-print-header"><div><span>CRYMA SELLER REPORT</span><h1>12-Month Sales Report</h1><p>{printReport.from} to {printReport.to}</p></div><strong>CRYMA</strong></header>
                <div className="sl-report-print-summary">
                    <div><span>Gross sales</span><strong>{money(printReport.summary.gross_sales ?? printReport.summary.revenue)}</strong></div>
                    <div><span>Seller net earnings (profit)</span><strong>{money(printReport.summary.seller_net_earnings)}</strong></div>
                    <div><span>Commission fees</span><strong>{money(printReport.summary.commission_fees)}</strong></div>
                    <div><span>Orders</span><strong>{printReport.summary.orders}</strong></div>
                    <div><span>Units sold</span><strong>{printReport.summary.units}</strong></div>
                    <div><span>Average order value</span><strong>{money(printReport.summary.average_order_value)}</strong></div>
                </div>
                <section className="sl-report-print-months"><h2>Monthly breakdown</h2><table><thead><tr><th>Month</th><th>Revenue</th><th>Orders</th><th>Units sold</th></tr></thead><tbody>{printReport.monthly.map((month) => <tr key={month.month}><th scope="row">{month.month}</th><td>{money(month.revenue)}</td><td>{month.orders}</td><td>{month.units}</td></tr>)}</tbody></table></section>
                <section className="sl-report-print-top"><h2>Top products</h2>{printReport.top_products.length ? <ol>{printReport.top_products.map((product, index) => <li key={`${product.name}-${index}`}><span>{product.name} · {product.units} {Number(product.units) === 1 ? "unit" : "units"}</span><strong>{money(product.revenue)}</strong></li>)}</ol> : <p>No recorded sales in this 12-month period.</p>}</section>
                <footer>Report generated from seller order records. Cancelled and rejected orders are excluded.</footer>
            </section>}
            </>}
        </div>
    );
}

export default Reports;
