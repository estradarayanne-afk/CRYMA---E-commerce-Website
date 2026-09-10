import { useState } from "react";

const ORDERS = [
    { id: "ORD-1041", customer: "Ana Reyes", email: "ana@email.com", phone: "+63 912 111 2222", product: "Ribbed Knit Co-ord (S)", qty: 2, amount: 1360, address: "123 Mabini St, Manila", date: "2026-06-10", status: "new" },
    { id: "ORD-1040", customer: "Ben Cruz", email: "ben@email.com", phone: "+63 917 333 4444", product: "Contour Shoulder Bag (Black)", qty: 1, amount: 840, address: "45 Rizal Ave, Quezon City", date: "2026-06-10", status: "packing" },
    { id: "ORD-1039", customer: "Carla Tan", email: "carla@email.com", phone: "+63 918 555 6666", product: "Everyday Overshirt (M)", qty: 1, amount: 920, address: "78 Bonifacio St, Makati", date: "2026-06-09", status: "shipped" },
    { id: "ORD-1038", customer: "Dan Lim", email: "dan@email.com", phone: "+63 919 777 8888", product: "Merino Crew Neck (L)", qty: 1, amount: 880, address: "9 Aguinaldo Blvd, Pasig", date: "2026-06-08", status: "delivered" },
    { id: "ORD-1037", customer: "Eva Santos", email: "eva@email.com", phone: "+63 920 999 0000", product: "Tailored Blazer (M)", qty: 1, amount: 1280, address: "22 Luna St, Taguig", date: "2026-06-07", status: "delivered" },
];

const STATUS_FLOW = ["new", "packing", "shipped", "delivered"];
const STATUS_LABEL = { new: "New Order", packing: "Packing", shipped: "Shipped", delivered: "Delivered" };
const STATUS_COLOR = { new: "#98751d", packing: "#48647a", shipped: "#176b68", delivered: "#27724d" };
const STATUS_BG    = { new: "#fff7df", packing: "#eef3f8", shipped: "#e9f3f2", delivered: "#e9f6ef" };

function Orders() {
    const [orders, setOrders] = useState(ORDERS);
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);
    const [printMode, setPrintMode] = useState(false);

    const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

    const advance = (id) => {
        setOrders((prev) => prev.map((o) => {
            if (o.id !== id) return o;
            const idx = STATUS_FLOW.indexOf(o.status);
            return idx < STATUS_FLOW.length - 1 ? { ...o, status: STATUS_FLOW[idx + 1] } : o;
        }));
        setSelected((s) => {
            if (!s || s.id !== id) return s;
            const idx = STATUS_FLOW.indexOf(s.status);
            return idx < STATUS_FLOW.length - 1 ? { ...s, status: STATUS_FLOW[idx + 1] } : s;
        });
    };

    const nextLabel = (status) => {
        const idx = STATUS_FLOW.indexOf(status);
        if (idx >= STATUS_FLOW.length - 1) return null;
        const next = STATUS_FLOW[idx + 1];
        return { new: "Mark as Packing", packing: "Mark as Shipped", shipped: "Confirm Delivery" }[status] || `Move to ${next}`;
    };

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><div className="sl-eyebrow">ORDER MANAGEMENT</div><h1 className="sl-h1">Orders</h1><p>View, pack, and manage all customer orders.</p></div>
            </div>

            {/* FILTER TABS */}
            <div className="sl-filter-tabs sl-filter-tabs--standalone">
                {["all", ...STATUS_FLOW].map((f) => (
                    <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                        {f === "all" ? "All Orders" : STATUS_LABEL[f]}
                        <span className="sl-tab-count">
                            {f === "all" ? orders.length : orders.filter((o) => o.status === f).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className={`sl-orders-layout${selected ? " has-detail" : ""}`}>
                {/* ORDER LIST */}
                <div className="sl-card sl-orders-list">
                    <div className="sl-table-wrap">
                        <table className="sl-table">
                            <thead>
                                <tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Date</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 && <tr><td colSpan={6} className="sl-empty">No orders found.</td></tr>}
                                {visible.map((o) => (
                                    <tr key={o.id} className={selected?.id === o.id ? "sl-row-active" : ""} onClick={() => setSelected(o)} style={{ cursor: "pointer" }}>
                                        <td><strong>{o.id}</strong></td>
                                        <td>{o.customer}</td>
                                        <td>{o.product}</td>
                                        <td>₱{o.amount.toLocaleString()}</td>
                                        <td>{o.date}</td>
                                        <td>
                                            <span className="sl-badge" style={{ color: STATUS_COLOR[o.status], background: STATUS_BG[o.status] }}>
                                                {STATUS_LABEL[o.status]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ORDER DETAIL PANEL */}
                {selected && (
                    <div className="sl-card sl-order-detail">
                        <div className="sl-detail-head">
                            <div>
                                <h3>{selected.id}</h3>
                                <span className="sl-badge" style={{ color: STATUS_COLOR[selected.status], background: STATUS_BG[selected.status] }}>
                                    {STATUS_LABEL[selected.status]}
                                </span>
                            </div>
                            <button className="sl-modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Customer</p>
                            <p className="sl-detail-val"><strong>{selected.customer}</strong></p>
                            <p className="sl-detail-val">{selected.email}</p>
                            <p className="sl-detail-val">{selected.phone}</p>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Delivery Address</p>
                            <p className="sl-detail-val">{selected.address}</p>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Order Items</p>
                            <div className="sl-detail-item-row">
                                <span>{selected.product}</span>
                                <span>x{selected.qty}</span>
                                <strong>₱{selected.amount.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Order Date</p>
                            <p className="sl-detail-val">{selected.date}</p>
                        </div>

                        {/* ACTIONS */}
                        <div className="sl-detail-actions">
                            {selected.status === "packing" && (
                                <button className="sl-btn-ghost" onClick={() => setPrintMode(true)}>
                                    🖨 Print Waybill
                                </button>
                            )}
                            {nextLabel(selected.status) && (
                                <button className="sl-btn-primary" onClick={() => advance(selected.id)}>
                                    {nextLabel(selected.status)}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* PRINT WAYBILL MODAL */}
            {printMode && selected && (
                <div className="sl-overlay" onClick={() => setPrintMode(false)}>
                    <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>Shipping Label / Waybill</h3>
                            <button className="sl-modal-close" onClick={() => setPrintMode(false)}>✕</button>
                        </div>
                        <div className="sl-modal-body sl-waybill">
                            <div className="sl-waybill-brand">CRYMA<sup>®</sup></div>
                            <div className="sl-waybill-grid">
                                <div>
                                    <p className="sl-waybill-label">FROM</p>
                                    <p><strong>CRYMA Seller</strong></p>
                                    <p>seller@cryma.com</p>
                                </div>
                                <div>
                                    <p className="sl-waybill-label">TO</p>
                                    <p><strong>{selected.customer}</strong></p>
                                    <p>{selected.address}</p>
                                    <p>{selected.phone}</p>
                                </div>
                            </div>
                            <div className="sl-waybill-divider" />
                            <div className="sl-waybill-grid">
                                <div>
                                    <p className="sl-waybill-label">ORDER ID</p>
                                    <p><strong>{selected.id}</strong></p>
                                </div>
                                <div>
                                    <p className="sl-waybill-label">ITEM</p>
                                    <p>{selected.product} × {selected.qty}</p>
                                </div>
                                <div>
                                    <p className="sl-waybill-label">AMOUNT</p>
                                    <p><strong>₱{selected.amount.toLocaleString()}</strong></p>
                                </div>
                            </div>
                            <div className="sl-waybill-barcode">
                                ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
                            </div>
                            <p style={{ textAlign: "center", fontSize: 11, color: "#9aa8a6" }}>{selected.id}</p>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setPrintMode(false)}>Close</button>
                            <button className="sl-btn-primary" onClick={() => window.print()}>🖨 Print</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Orders;
