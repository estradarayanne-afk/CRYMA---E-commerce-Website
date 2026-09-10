import { useState } from "react";

const MONTHLY = [
    { month: "Jan", revenue: 32000, orders: 41, returns: 2, cost: 18000 },
    { month: "Feb", revenue: 41000, orders: 53, returns: 3, cost: 22000 },
    { month: "Mar", revenue: 28000, orders: 36, returns: 1, cost: 15000 },
    { month: "Apr", revenue: 51000, orders: 65, returns: 4, cost: 27000 },
    { month: "May", revenue: 46000, orders: 58, returns: 2, cost: 24000 },
    { month: "Jun", revenue: 48320, orders: 61, returns: 3, cost: 25000 },
];

const TOP_PRODUCTS = [
    { name: "Tailored Blazer", units: 38, revenue: 48640 },
    { name: "Merino Crew Neck", units: 31, revenue: 27280 },
    { name: "Contour Shoulder Bag", units: 27, revenue: 22680 },
    { name: "Ribbed Knit Co-ord", units: 24, revenue: 16320 },
    { name: "Everyday Overshirt", units: 19, revenue: 17480 },
];

const TODAY = new Date().toISOString().split("T")[0];
const SIX_MONTHS_AGO = new Date(
    Date.now() - 180 * 86400000
).toISOString().split("T")[0];

function Reports() {
    const [from, setFrom] = useState(SIX_MONTHS_AGO);
    const [to, setTo] = useState(TODAY);
    const [applied, setApplied] = useState({
        from: SIX_MONTHS_AGO,
        to: TODAY,
    });

    const applyFilter = () => setApplied({ from, to });

    const totalRevenue = MONTHLY.reduce((s, m) => s + m.revenue, 0);
    const totalOrders  = MONTHLY.reduce((s, m) => s + m.orders, 0);
    const totalCost    = MONTHLY.reduce((s, m) => s + m.cost, 0);
    const totalProfit  = totalRevenue - totalCost;
    const margin       = ((totalProfit / totalRevenue) * 100).toFixed(1);

    const MAX_REV = Math.max(...MONTHLY.map((m) => m.revenue));


    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><div className="sl-eyebrow">ANALYTICS</div><h1 className="sl-h1">Reports</h1><p>Financial overview and sales performance.</p></div>
                <button className="sl-btn-primary" onClick={() => window.print()}>⬇ Export</button>
            </div>

            {/* DATE PICKER */}
            <div className="sl-card sl-date-filter">
                <span className="sl-date-filter-label">Date Range</span>
                <div className="sl-date-inputs">
                    <div className="sl-field sl-field--inline">
                        <label>From</label>
                        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <span style={{ color: "#9aa8a6", alignSelf: "flex-end", paddingBottom: 2 }}>→</span>
                    <div className="sl-field sl-field--inline">
                        <label>To</label>
                        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
                    </div>
                </div>
                <button className="sl-btn-primary" onClick={applyFilter}>Apply</button>
                <span className="sl-date-applied">Showing: {applied.from} → {applied.to}</span>
            </div>

            {/* SUMMARY CARDS */}
            <div className="sl-stats">
                {[
                    { label: "Total Revenue", value: `₱${totalRevenue.toLocaleString()}`, sub: `${totalOrders} orders` },
                    { label: "Total Cost",    value: `₱${totalCost.toLocaleString()}`,    sub: "COGS + fees" },
                    { label: "Net Profit",    value: `₱${totalProfit.toLocaleString()}`,  sub: `${margin}% margin` },
                    { label: "Avg. Order",    value: `₱${Math.round(totalRevenue / totalOrders).toLocaleString()}`, sub: "per transaction" },
                ].map((s) => (
                    <div className="sl-stat-card" key={s.label}>
                        <span className="sl-stat-label">{s.label}</span>
                        <strong className="sl-stat-value">{s.value}</strong>
                        <span className="sl-stat-change">{s.sub}</span>
                    </div>
                ))}
            </div>

            <div className="sl-grid-2">
                {/* REVENUE CHART */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div><h3>Revenue vs Profit</h3><p>Monthly comparison</p></div>
                    </div>
                    <div className="sl-chart sl-chart--duo">
                        {MONTHLY.map((m) => (
                            <div className="sl-bar-col" key={m.month}>
                                <div className="sl-bar-track">
                                    <div className="sl-bar-fill" style={{ height: `${(m.revenue / MAX_REV) * 100}%` }} />
                                    <div className="sl-bar-fill sl-bar-fill--profit" style={{ height: `${((m.revenue - m.cost) / MAX_REV) * 100}%` }} />
                                </div>
                                <span className="sl-bar-label">{m.month}</span>
                            </div>
                        ))}
                    </div>
                    <div className="sl-chart-legend">
                        <span><span className="sl-legend-dot" style={{ background: "#093f43" }} />Revenue</span>
                        <span><span className="sl-legend-dot" style={{ background: "#9fc2b4" }} />Profit</span>
                    </div>
                </div>

                {/* TOP PRODUCTS */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div><h3>Top Products</h3><p>By revenue</p></div>
                    </div>
                    <div className="sl-list">
                        {TOP_PRODUCTS.map((p, i) => (
                            <div className="sl-list-row" key={p.name}>
                                <div className="sl-list-main">
                                    <strong>#{i + 1} {p.name}</strong>
                                    <span>{p.units} units sold</span>
                                </div>
                                <strong>₱{p.revenue.toLocaleString()}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* MONTHLY TABLE */}
            <div className="sl-card">
                <div className="sl-panel-head" style={{ padding: "16px 20px", borderBottom: "1px solid #e0e8e7" }}>
                    <div><h3>Monthly Breakdown</h3></div>
                </div>
                <div className="sl-table-wrap">
                    <table className="sl-table">
                        <thead>
                            <tr><th>Month</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Orders</th><th>Returns</th><th>Margin</th></tr>
                        </thead>
                        <tbody>
                            {MONTHLY.map((m) => {
                                const profit = m.revenue - m.cost;
                                const mg = ((profit / m.revenue) * 100).toFixed(1);
                                return (
                                    <tr key={m.month}>
                                        <td><strong>{m.month}</strong></td>
                                        <td>₱{m.revenue.toLocaleString()}</td>
                                        <td>₱{m.cost.toLocaleString()}</td>
                                        <td style={{ color: "#27724d", fontWeight: 600 }}>₱{profit.toLocaleString()}</td>
                                        <td>{m.orders}</td>
                                        <td>{m.returns}</td>
                                        <td>{mg}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Reports;
