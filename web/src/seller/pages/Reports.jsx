import { useEffect, useState } from "react";
import api from "../../shared/services/api";

const TODAY = new Date().toISOString().split("T")[0];
const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0];

const money = (value) => `₱${Number(value || 0).toLocaleString()}`;

function Reports() {
    const [from, setFrom] = useState(SIX_MONTHS_AGO);
    const [to, setTo] = useState(TODAY);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async (range = { from, to }) => {
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
    };

    useEffect(() => { load(); }, []);

    const summary = report?.summary || { revenue: 0, orders: 0, units: 0 };
    const monthly = report?.monthly || [];
    const topProducts = report?.top_products || [];
    const maxRevenue = Math.max(...monthly.map((month) => month.revenue), 1);

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><div className="sl-eyebrow">ANALYTICS</div><h1 className="sl-h1">Reports</h1><p>Sales performance from your actual orders.</p></div>
                <button className="sl-btn-primary" onClick={() => window.print()}>Export</button>
            </div>

            <div className="sl-card sl-date-filter">
                <span className="sl-date-filter-label">Date Range</span>
                <div className="sl-date-inputs">
                    <div className="sl-field sl-field--inline"><label>From</label><input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></div>
                    <span style={{ color: "#9aa8a6", alignSelf: "flex-end", paddingBottom: 2 }}>to</span>
                    <div className="sl-field sl-field--inline"><label>To</label><input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></div>
                </div>
                <button className="sl-btn-primary" onClick={() => load({ from, to })} disabled={loading}>Apply</button>
                <span className="sl-date-applied">Showing: {report?.from || from} to {report?.to || to}</span>
            </div>

            {error && <div className="auth-notice auth-notice--error">{error}</div>}
            {loading && <div className="sl-empty">Loading report...</div>}

            {!loading && (
                <>
                    <div className="sl-stats">
                        {[
                            { label: "Revenue", value: money(summary.revenue), sub: "From recorded orders" },
                            { label: "Orders", value: summary.orders, sub: "With your products" },
                            { label: "Units Sold", value: summary.units, sub: "Across all products" },
                        ].map((stat) => <div className="sl-stat-card" key={stat.label}><span className="sl-stat-label">{stat.label}</span><strong className="sl-stat-value">{stat.value}</strong><span className="sl-stat-change">{stat.sub}</span></div>)}
                    </div>

                    <div className="sl-grid-2">
                        <div className="sl-panel">
                            <div className="sl-panel-head"><div><h3>Revenue</h3><p>Monthly order totals</p></div></div>
                            <div className="sl-chart">
                                {monthly.length === 0 && <p className="sl-empty">No sales in this date range.</p>}
                                {monthly.map((month) => <div className="sl-bar-col" key={month.month}><span className="sl-bar-val">{money(month.revenue)}</span><div className="sl-bar-track"><div className="sl-bar-fill" style={{ height: `${(month.revenue / maxRevenue) * 100}%` }} /></div><span className="sl-bar-label">{month.month}</span></div>)}
                            </div>
                        </div>

                        <div className="sl-panel">
                            <div className="sl-panel-head"><div><h3>Top Products</h3><p>Based on recorded sales</p></div></div>
                            <div className="sl-list">
                                {topProducts.map((product, index) => <div className="sl-list-row" key={product.name}><div className="sl-list-main"><strong>#{index + 1} {product.name}</strong><span>{product.units} units sold</span></div><strong>{money(product.revenue)}</strong></div>)}
                                {topProducts.length === 0 && <p className="sl-empty">No sales in this date range.</p>}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default Reports;
