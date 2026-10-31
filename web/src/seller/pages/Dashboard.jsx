
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Eye, Package, PackageX } from "lucide-react";
import api from "../../shared/services/api";
import { formatStatusLabel } from "../../shared/utils/statusLabel";

function Dashboard() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [inventoryError, setInventoryError] = useState("");
    const [selectedInventoryStatus, setSelectedInventoryStatus] = useState("all");

    const fetchProducts = useCallback(async () => {
        const { data } = await api.get("/seller/products", { params: { per_page: 100 } });
        return data.data?.data ?? data.data ?? [];
    }, []);

    const loadProducts = async () => {
        setInventoryLoading(true);
        setInventoryError("");
        try {
            setProducts(await fetchProducts());
        } catch {
            setProducts([]);
            setInventoryError("We couldn't load your inventory. Check your connection and try again.");
        } finally {
            setInventoryLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        fetchProducts()
            .then((data) => { if (!cancelled) setProducts(data); })
            .catch(() => {
                if (!cancelled) {
                    setProducts([]);
                    setInventoryError("We couldn't load your inventory. Check your connection and try again.");
                }
            })
            .finally(() => { if (!cancelled) setInventoryLoading(false); });
        return () => { cancelled = true; };
    }, [fetchProducts]);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    const activeProducts = products.filter((product) => product.status === "active" && product.review_status === "approved");
    const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 3);
    const outOfStockProducts = products.filter((product) => product.stock === 0);
    const inventoryBreakdown = [
        { key: "active", label: "Active", products: activeProducts, color: "#7E1830" },
        { key: "low", label: "Low stock", products: lowStockProducts, color: "#B21F3A" },
        { key: "out", label: "Out of stock", products: outOfStockProducts, color: "#D98A9D" },
    ];
    const selectedBreakdown = inventoryBreakdown.find((item) => item.key === selectedInventoryStatus);
    const currentProducts = selectedBreakdown ? selectedBreakdown.products : products;
    const inventoryStats = [
        { label: "Products listed", value: products.length, change: `${activeProducts.length} active and approved`, icon: Package, tone: "total" },
        { label: "Active products", value: activeProducts.length, change: "Visible to buyers", icon: Eye, tone: "active" },
        { label: "Low stock", value: lowStockProducts.length, change: "Review and restock", icon: AlertTriangle, tone: "low" },
        { label: "Out of stock", value: outOfStockProducts.length, change: "Unavailable to buyers", icon: PackageX, tone: "out" },
    ];

    return (
        <div className="sl-page seller-dashboard">
            <section className="sl-page-head seller-dashboard-head">
                <div>
                    <div className="sl-eyebrow">CRYMA PLATFORM</div>
                    <h1 className="sl-h1">Seller Dashboard</h1>
                    <p>Welcome back, <strong>{user?.first_name || "Seller"}</strong>. Here's how your store is doing.</p>
                </div>
                <button className="sl-btn-primary" onClick={() => navigate("/seller/inventory")}>+ Add Product</button>
            </section>

            {inventoryError && (
                <div className="sl-dashboard-error" role="alert">
                    <span>{inventoryError}</span>
                    <button type="button" onClick={() => void loadProducts()} disabled={inventoryLoading}>
                        {inventoryLoading ? "Retryingâ€¦" : "Retry"}
                    </button>
                </div>
            )}

            {/* STATS */}
            <div className="sl-stats seller-dashboard-stats">
                {inventoryStats.map((s) => {
                    const StatIcon = s.icon;
                    return (
                    <div className={`sl-stat-card seller-dashboard-stat seller-dashboard-stat--${s.tone}`} key={s.label}>
                        <div className="seller-dashboard-stat-top"><span className="sl-stat-label">{s.label}</span><span className="seller-dashboard-stat-icon"><StatIcon size={18} aria-hidden="true" /></span></div>
                        <strong className="sl-stat-value">{inventoryLoading || inventoryError ? "—" : s.value}</strong>
                        <span className="sl-stat-change">{inventoryLoading ? "Loading inventory" : inventoryError ? "Unavailable" : s.change}</span>
                    </div>
                    );
                })}
            </div>

            <div className="sl-grid-2 seller-dashboard-grid">
                {/* INVENTORY OVERVIEW */}
                <div className="sl-panel seller-dashboard-panel">
                    <div className="sl-panel-head">
                        <div>
                            <h3>Inventory Overview</h3>
                            <p>{inventoryLoading ? "Loading your stock summary" : "Select a status to filter the product list"}</p>
                        </div>
                    </div>
                    <div className="seller-inventory-stats" aria-label="Inventory status statistics">
                        {inventoryBreakdown.map((item) => {
                            const selected = selectedInventoryStatus === item.key;
                            const percentage = products.length ? Math.round((item.products.length / products.length) * 100) : 0;
                            return (
                                <button
                                    className={`seller-inventory-stat${selected ? " is-selected" : ""}`}
                                    key={item.key}
                                    type="button"
                                    aria-pressed={selected}
                                    aria-label={`${item.label}: ${item.products.length} products, ${percentage} percent. ${selected ? "Selected. Click to show all products." : "Click to filter products by this status."}`}
                                    disabled={inventoryLoading || inventoryError || products.length === 0}
                                    onClick={() => setSelectedInventoryStatus(selected ? "all" : item.key)}
                                >
                                    <span className="seller-inventory-stat-top">
                                        <span className="seller-inventory-stat-label"><i style={{ "--bar-color": item.color }} />{item.label}</span>
                                        <strong>{item.products.length}</strong>
                                    </span>
                                    <span className="seller-inventory-stat-track" aria-hidden="true">
                                        <span style={{ width: `${percentage}%`, "--bar-color": item.color }} />
                                    </span>
                                    <span className="seller-inventory-stat-foot">{percentage}% of listed inventory</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CURRENT PRODUCTS */}
                <div className="sl-panel seller-dashboard-panel">
                    <div className="sl-panel-head">
                        <div><h3>{selectedBreakdown ? `${selectedBreakdown.label} Products` : "Current Products"}</h3><p>{selectedBreakdown ? `Showing ${currentProducts.length} matching products` : "Latest inventory records"}</p></div>
                        <button className="sl-panel-link" onClick={() => navigate("/seller/inventory")}>View all</button>
                    </div>
                    <div className="sl-list">
                        {inventoryLoading ? <p className="sl-empty" role="status">Loading products…</p> : currentProducts.slice(0, 4).map((product) => (
                            <div className="sl-list-row" key={product.id}>
                                <div className="sl-list-main">
                                    <strong>{product.name}</strong>
                                    <span>{product.category} · {product.stock} units</span>
                                </div>
                                <div className="sl-list-right">
                                    <span className={`sl-badge ${product.review_status === "pending" ? "sl-badge--review" : product.review_status === "rejected" ? "sl-badge--rejected" : product.status === "active" ? "sl-badge--green" : "sl-badge--muted"}`}>
                                        {formatStatusLabel(product.review_status === "pending" ? "Pending review" : product.review_status === "rejected" ? "Rejected" : product.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!inventoryLoading && !inventoryError && currentProducts.length === 0 && <p className="sl-empty">{selectedBreakdown ? `No ${selectedBreakdown.label.toLowerCase()} products right now.` : "No products listed yet."}</p>}
                    </div>
                </div>
            </div>

            {/* LOW STOCK ALERT */}
            <div className="sl-panel sl-panel--alert seller-dashboard-panel">
                <div className="sl-panel-head">
                    <div><h3>Low Stock Alert</h3><p>{lowStockProducts.length ? `${lowStockProducts.length} ${lowStockProducts.length === 1 ? "product needs" : "products need"} attention` : "No products need restocking right now"}</p></div>
                    <button className="sl-panel-link" onClick={() => navigate("/seller/inventory")}>Manage inventory</button>
                </div>
                <div className="sl-list">
                    {inventoryLoading ? <p className="sl-empty" role="status">Loading stock levelsâ€¦</p> : lowStockProducts.map((product) => (
                        <div className="sl-list-row" key={product.id}>
                            <span>{product.name}</span>
                            <span className="sl-badge sl-badge--red">{product.stock} left</span>
                        </div>
                    ))}
                    {!inventoryLoading && !inventoryError && lowStockProducts.length === 0 && <p className="sl-empty">No low-stock products.</p>}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
