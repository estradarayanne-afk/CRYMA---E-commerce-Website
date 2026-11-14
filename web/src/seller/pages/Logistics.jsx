import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../shared/services/api";
import { formatStatusLabel } from "../../shared/utils/statusLabel";
import "./Logistics.css";

const ORDER_STATUS = {
    PENDING: "New Order",
    PLACED: "New Order",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready For Pickup",
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

function localDateTimeValue(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function Logistics() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [schedulingOrderId, setSchedulingOrderId] = useState(null);
    const [selectedPickupOrderIds, setSelectedPickupOrderIds] = useState([]);
    const [preferredPickupAt, setPreferredPickupAt] = useState("");
    const [schedulingBatch, setSchedulingBatch] = useState(false);

    const eligiblePickupOrders = orders.filter((order) => (
        String(order.status || "").toUpperCase() === "READY_FOR_PICKUP"
        && !order.delivery_progress?.pickup?.status
    ));
    const selectedPickupCount = selectedPickupOrderIds.filter((id) => (
        eligiblePickupOrders.some((order) => order.id === id)
    )).length;
    const minimumPickupDateTime = localDateTimeValue();

    const allEligibleSelected = eligiblePickupOrders.length > 0
        && eligiblePickupOrders.every((order) => selectedPickupOrderIds.includes(order.id));

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

    const schedulePickup = async (order) => {
        if (schedulingOrderId) return;
        setSchedulingOrderId(order.id);
        setError("");
        setNotice("");
        try {
            const { data } = await api.post(`/seller/orders/${order.id}/pickup-request`);
            await loadOrders();
            setNotice(data?.message || `Pickup requested for order #${order.id}.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to schedule courier pickup.");
        } finally {
            setSchedulingOrderId(null);
        }
    };

    const requestBulkPickup = async () => {
        const orderIds = selectedPickupOrderIds.filter((id) => (
            eligiblePickupOrders.some((order) => order.id === id)
        ));
        if (orderIds.length < 2 || !preferredPickupAt || schedulingBatch || schedulingOrderId) return;
        setSchedulingBatch(true);
        setError("");
        setNotice("");
        try {
            const { data } = await api.post("/seller/pickup-batches", {
                order_ids: orderIds,
                preferred_scheduled_at: preferredPickupAt,
            });
            setSelectedPickupOrderIds([]);
            setPreferredPickupAt("");
            await loadOrders();
            setNotice(data?.message || `Bulk pickup requested for ${orderIds.length} parcels.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to request a bulk courier pickup.");
        } finally {
            setSchedulingBatch(false);
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
        const refreshTimer = window.setInterval(() => {
            fetchOrders().then((data) => { if (current) setOrders(data); }).catch(() => {});
        }, 30_000);
        return () => { current = false; window.clearInterval(refreshTimer); };
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
                Pickups use your default saved seller address. Select at least two ready parcels to request one shared courier stop; Logistics assigns the rider and pickup time.
            </aside>

            {notice && <div className="sl-order-notice" role="status">{notice}</div>}

            {error && (
                <div className="sl-dashboard-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => void loadOrders()} disabled={loading}>Retry</button>
                </div>
            )}

            <div className="sl-card">
                <div className="sl-logistics-bulk-bar">
                    <span>{selectedPickupCount} ready parcels selected</span>
                    <label className="sl-logistics-preferred-time">
                        Preferred pickup date and time
                        <input
                            type="datetime-local"
                            aria-label="Preferred bulk pickup date and time"
                            min={minimumPickupDateTime}
                            value={preferredPickupAt}
                            onChange={(event) => setPreferredPickupAt(event.target.value)}
                            disabled={selectedPickupCount < 2 || schedulingBatch || Boolean(schedulingOrderId)}
                        />
                    </label>
                    <button type="button" className="sl-logistics-pickup-button" disabled={selectedPickupCount < 2 || !preferredPickupAt || schedulingBatch || Boolean(schedulingOrderId)} onClick={() => void requestBulkPickup()}>
                        {schedulingBatch ? "Requesting…" : "Request bulk pickup"}
                    </button>
                </div>
                <div className="sl-table-wrap">
                    <table className="sl-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" aria-label="Select all ready parcels for bulk pickup" checked={allEligibleSelected} disabled={!eligiblePickupOrders.length || schedulingBatch || Boolean(schedulingOrderId)} onChange={(event) => setSelectedPickupOrderIds(event.target.checked ? eligiblePickupOrders.map((order) => order.id) : [])} /></th>
                                <th>Order</th><th>Buyer</th><th>Items</th><th>Order date</th><th>Order status</th><th>Shipment</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="sl-empty" role="status">Loading orders…</td></tr>
                            ) : error ? (
                                <tr><td colSpan="8" className="sl-empty">Order data is unavailable.</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="8" className="sl-empty">No orders are available for fulfillment yet.</td></tr>
                            ) : orders.map((order) => {
                                const status = String(order.status || "PENDING").toUpperCase();
                                const pickupStatus = order.delivery_progress?.pickup?.status;
                                const eligibleForBulkPickup = status === "READY_FOR_PICKUP" && !pickupStatus;
                                const shipmentLabel = pickupStatus ? pickupStatus.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase()) : (status === "READY_FOR_PICKUP" ? "Pickup not scheduled" : "Not ready");
                                const buyerName = [order.buyer?.first_name, order.buyer?.middle_name, order.buyer?.last_name]
                                    .filter(Boolean).join(" ").trim() || "Buyer";
                                const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
                                const itemSummary = (order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ");
                                return (
                                    <tr key={order.id}>
                                        <td><input type="checkbox" aria-label={`Select order #${order.id} for bulk pickup`} checked={selectedPickupOrderIds.includes(order.id)} disabled={!eligibleForBulkPickup || schedulingBatch || Boolean(schedulingOrderId)} onChange={(event) => setSelectedPickupOrderIds((current) => event.target.checked ? [...current, order.id] : current.filter((id) => id !== order.id))} /></td>
                                        <td><strong>#{order.id}</strong></td>
                                        <td>{buyerName}</td>
                                        <td>{itemSummary || `${itemCount} item${itemCount === 1 ? "" : "s"}`}</td>
                                        <td>{formatDate(order.created_at)}</td>
                                        <td><span className="sl-badge sl-badge--muted">{ORDER_STATUS[status] || formatStatusLabel(status)}</span></td>
                                        <td><span className="sl-badge sl-badge--muted">{shipmentLabel}</span>{order.delivery_progress?.pickup?.courier?.name && <small> · {order.delivery_progress.pickup.courier.name}</small>}{order.delivery_progress?.pickup?.scheduled_at && <small> · {new Date(order.delivery_progress.pickup.scheduled_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</small>}</td>
                                        <td><button type="button" className="sl-logistics-pickup-button" disabled={Boolean(schedulingOrderId)} onClick={() => status === "READY_FOR_PICKUP" && !pickupStatus ? void schedulePickup(order) : navigate("/seller/orders", { state: { sellerNotification: { order_id: order.id } } })}>{schedulingOrderId === order.id ? "Scheduling…" : status === "READY_FOR_PICKUP" && !pickupStatus ? "Schedule pickup" : "View tracking"}</button></td>
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
