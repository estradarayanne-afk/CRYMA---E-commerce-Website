
import { useNavigate } from "react-router-dom";

const stats = [
    { label: "Total Revenue", value: "₱48,320", change: "+12.4% this month", color: "#093f43" },
    { label: "Orders Today", value: "24", change: "+3 from yesterday", color: "#176b68" },
    { label: "Products Listed", value: "86", change: "4 low stock", color: "#2f7d68" },
    { label: "Avg. Rating", value: "4.8★", change: "From 312 reviews", color: "#638177" },
];

const recentOrders = [
    { id: "ORD-1041", customer: "Ana Reyes", product: "Ribbed Knit Co-ord", amount: "₱680", status: "new" },
    { id: "ORD-1040", customer: "Ben Cruz", product: "Contour Shoulder Bag", amount: "₱840", status: "packing" },
    { id: "ORD-1039", customer: "Carla Tan", product: "Everyday Overshirt", amount: "₱920", status: "shipped" },
    { id: "ORD-1038", customer: "Dan Lim", product: "Merino Crew Neck", amount: "₱880", status: "delivered" },
];

const statusColor = { new: "#98751d", packing: "#48647a", shipped: "#176b68", delivered: "#27724d" };
const statusBg   = { new: "#fff7df", packing: "#eef3f8", shipped: "#e9f3f2", delivered: "#e9f6ef" };

const BAR_DATA = [
    { month: "Jan", value: 32000 },
    { month: "Feb", value: 41000 },
    { month: "Mar", value: 28000 },
    { month: "Apr", value: 51000 },
    { month: "May", value: 46000 },
    { month: "Jun", value: 48320 },
];
const MAX = Math.max(...BAR_DATA.map((d) => d.value));

function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div>
                    <h2>Dashboard</h2>
                    <p>Welcome back — here's how your store is doing.</p>
                </div>
                <button className="sl-btn-primary" onClick={() => navigate("/seller/inventory")}>+ Add Product</button>
            </div>

            {/* STATS */}
            <div className="sl-stats">
                {stats.map((s) => (
                    <div className="sl-stat-card" key={s.label}>
                        <span className="sl-stat-label">{s.label}</span>
                        <strong className="sl-stat-value" style={{ color: s.color }}>{s.value}</strong>
                        <span className="sl-stat-change">{s.change}</span>
                    </div>
                ))}
            </div>

            <div className="sl-grid-2">
                {/* REVENUE CHART */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div>
                            <h3>Monthly Revenue</h3>
                            <p>Last 6 months</p>
                        </div>
                    </div>
                    <div className="sl-chart">
                        {BAR_DATA.map((d) => (
                            <div className="sl-bar-col" key={d.month}>
                                <span className="sl-bar-val">₱{(d.value / 1000).toFixed(0)}k</span>
                                <div className="sl-bar-track">
                                    <div className="sl-bar-fill" style={{ height: `${(d.value / MAX) * 100}%` }} />
                                </div>
                                <span className="sl-bar-label">{d.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RECENT ORDERS */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div><h3>Recent Orders</h3><p>Latest activity</p></div>
                        <button className="sl-panel-link" onClick={() => navigate("/seller/orders")}>View all</button>
                    </div>
                    <div className="sl-list">
                        {recentOrders.map((o) => (
                            <div className="sl-list-row" key={o.id}>
                                <div className="sl-list-main">
                                    <strong>{o.id}</strong>
                                    <span>{o.customer} · {o.product}</span>
                                </div>
                                <div className="sl-list-right">
                                    <strong>{o.amount}</strong>
                                    <span className="sl-badge" style={{ color: statusColor[o.status], background: statusBg[o.status] }}>
                                        {o.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* LOW STOCK ALERT */}
            <div className="sl-panel sl-panel--alert">
                <div className="sl-panel-head">
                    <div><h3>⚠ Low Stock Alert</h3><p>Items needing restock</p></div>
                    <button className="sl-panel-link" onClick={() => navigate("/seller/inventory")}>Manage inventory</button>
                </div>
                <div className="sl-list">
                    {[
                        { name: "Ribbed Knit Co-ord (S)", stock: 2 },
                        { name: "Contour Shoulder Bag (Black)", stock: 1 },
                        { name: "Merino Crew Neck (M)", stock: 3 },
                        { name: "Tailored Blazer (L)", stock: 2 },
                    ].map((item) => (
                        <div className="sl-list-row" key={item.name}>
                            <span>{item.name}</span>
                            <span className="sl-badge sl-badge--red">{item.stock} left</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
