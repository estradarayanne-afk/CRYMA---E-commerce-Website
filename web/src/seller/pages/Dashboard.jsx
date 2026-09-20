
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../shared/services/api";

function Dashboard() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        api.get("/seller/products", { params: { per_page: 100 } })
            .then(({ data }) => setProducts(data.data?.data ?? data.data ?? []));
    }, []);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const activeProducts = products.filter((product) => product.status === "active");
    const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 3);
    const outOfStockProducts = products.filter((product) => product.stock === 0);
    const inventoryStats = [
        { label: "Products Listed", value: products.length, change: `${activeProducts.length} active`, color: "#093f43" },
        { label: "Active Products", value: activeProducts.length, change: "Visible to buyers", color: "#176b68" },
        { label: "Low Stock", value: lowStockProducts.length, change: "Needs restock", color: "#2f7d68" },
        { label: "Out of Stock", value: outOfStockProducts.length, change: "Unavailable", color: "#638177" },
    ];

    return (
        <div className="sl-page">
            <section className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">CRYMA PLATFORM</div>
                    <h1 className="sl-h1">Seller Dashboard</h1>
                    <p>Welcome back, <strong>{user?.first_name || "Seller"}</strong>. Here's how your store is doing.</p>
                </div>
                <button className="sl-btn-primary" onClick={() => navigate("/seller/inventory")}>+ Add Product</button>
            </section>

            {/* STATS */}
            <div className="sl-stats">
                {inventoryStats.map((s) => (
                    <div className="sl-stat-card" key={s.label}>
                        <span className="sl-stat-label">{s.label}</span>
                        <strong className="sl-stat-value" style={{ color: s.color }}>{s.value}</strong>
                        <span className="sl-stat-change">{s.change}</span>
                    </div>
                ))}
            </div>

            <div className="sl-grid-2">
                {/* INVENTORY OVERVIEW */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div>
                            <h3>Inventory Overview</h3>
                            <p>Current product status</p>
                        </div>
                    </div>
                    <div className="sl-chart">
                        {[
                            { label: "Active", value: activeProducts.length },
                            { label: "Low stock", value: lowStockProducts.length },
                            { label: "Out", value: outOfStockProducts.length },
                        ].map((d) => (
                            <div className="sl-bar-col" key={d.label}>
                                <span className="sl-bar-val">{d.value}</span>
                                <div className="sl-bar-track">
                                    <div className="sl-bar-fill" style={{ height: `${products.length ? (d.value / products.length) * 100 : 0}%` }} />
                                </div>
                                <span className="sl-bar-label">{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CURRENT PRODUCTS */}
                <div className="sl-panel">
                    <div className="sl-panel-head">
                        <div><h3>Current Products</h3><p>Latest inventory records</p></div>
                        <button className="sl-panel-link" onClick={() => navigate("/seller/inventory")}>View all</button>
                    </div>
                    <div className="sl-list">
                        {products.slice(0, 4).map((product) => (
                            <div className="sl-list-row" key={product.id}>
                                <div className="sl-list-main">
                                    <strong>{product.name}</strong>
                                    <span>{product.category} · {product.stock} units</span>
                                </div>
                                <div className="sl-list-right">
                                    <span className={`sl-badge ${product.status === "active" ? "sl-badge--green" : "sl-badge--muted"}`}>{product.status}</span>
                                </div>
                            </div>
                        ))}
                        {products.length === 0 && <p className="sl-empty">No products listed yet.</p>}
                    </div>
                </div>
            </div>

            {/* LOW STOCK ALERT */}
            <div className="sl-panel sl-panel--alert">
                <div className="sl-panel-head">
                    <div><h3>Low Stock Alert</h3><p>Items needing restock</p></div>
                    <button className="sl-panel-link" onClick={() => navigate("/seller/inventory")}>Manage inventory</button>
                </div>
                <div className="sl-list">
                    {lowStockProducts.map((product) => (
                        <div className="sl-list-row" key={product.id}>
                            <span>{product.name}</span>
                            <span className="sl-badge sl-badge--red">{product.stock} left</span>
                        </div>
                    ))}
                    {lowStockProducts.length === 0 && <p className="sl-empty">No low-stock products.</p>}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
