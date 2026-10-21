import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../shared/services/api";
import "./Logistics.css";

const ORDER_STATUS = {
    PENDING: "New order",
    PLACED: "New order",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready for pickup",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function Logistics() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchOrders = useCallback(async () => {
        const { data } = await api.get("/seller/orders");
        return Array.isArray(data?.data) ? data.data : [];
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        setError("");
        try {
            setOrders(await fetchOrders());
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load your orders.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let current = true;
        fetchOrders()
            .then((data) => { if (current) setOrders(data); })
            .catch((requestError) => {
                if (current) setError(requestError.response?.data?.message || "Unable to load your orders.");
            })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [fetchOrders]);

    return (
        <div className="sl-page">
            <section className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">ORDER FULFILLMENT</div>
                    <h1 className="sl-h1">Logistics</h1>
                    <p>Review order readiness using your current seller orders.</p>
                </div>
                <button type="button" className="sl-btn-primary" onClick={() => navigate("/seller/orders")}>
                    Manage orders
                </button>
            </section>

            <aside className="sl-logistics-note" role="note">
                Carrier assignment, pickup scheduling, and shipment tracking are not connected to this workspace. Update order preparation in Orders; the order status remains the authoritative record.
            </aside>

            {error && (
                <div className="sl-dashboard-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => void loadOrders()} disabled={loading}>Retry</button>
                </div>
            )}

            <div className="sl-card">
                <div className="sl-table-wrap">
                    <table className="sl-table">
                        <thead>
                            <tr><th>Order</th><th>Buyer</th><th>Items</th><th>Order date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="sl-empty" role="status">Loading orders…</td></tr>
                            ) : error ? (
                                <tr><td colSpan="5" className="sl-empty">Order data is unavailable.</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="5" className="sl-empty">No orders are available for fulfillment yet.</td></tr>
                            ) : orders.map((order) => {
                                const status = String(order.status || "PENDING").toUpperCase();
                                const buyerName = [order.buyer?.first_name, order.buyer?.middle_name, order.buyer?.last_name]
                                    .filter(Boolean).join(" ").trim() || "Buyer";
                                const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
                                const itemSummary = (order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ");
                                return (
                                    <tr key={order.id}>
                                        <td><strong>#{order.id}</strong></td>
                                        <td>{buyerName}</td>
                                        <td>{itemSummary || `${itemCount} item${itemCount === 1 ? "" : "s"}`}</td>
                                        <td>{formatDate(order.created_at)}</td>
                                        <td><span className="sl-badge sl-badge--muted">{ORDER_STATUS[status] || status.replaceAll("_", " ")}</span></td>
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

export default Logistics;
