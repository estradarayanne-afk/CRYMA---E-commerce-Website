import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Check,
    Package,
    Printer,
    Truck,
    X,
} from "lucide-react";
import api from "../../shared/services/api";
import { parseDeliveryAddress } from "../../shared/utils/deliveryAddress";
import ParcelSlip from "../components/ParcelSlip";

const STATUS_FLOW = [
    "PLACED",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_PICKUP",
];

const STATUS_LABEL = {
    PLACED: "New Order",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY_FOR_PICKUP: "Ready for Pickup",
};

const STATUS_COLOR = {
    PLACED: "#98751d",
    CONFIRMED: "#48647a",
    PREPARING: "#176b68",
    READY_FOR_PICKUP: "#27724d",
};

const STATUS_BG = {
    PLACED: "#fff7df",
    CONFIRMED: "#eef3f8",
    PREPARING: "#e9f3f2",
    READY_FOR_PICKUP: "#e9f6ef",
};
const ORDERS_PER_PAGE = 8;

function normalizeStatus(status) {
    if (!status) return "PLACED";

    const normalized = String(status).toUpperCase();

    if (normalized === "PENDING") {
        return "PLACED";
    }

    return normalized;
}

function formatMoney(value) {
    return `₱${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function getCustomerName(buyer) {
    if (!buyer) return "Unknown customer";

    return [
        buyer.first_name,
        buyer.middle_name,
        buyer.last_name,
    ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Unknown customer";
}

function getNextStatus(status) {
    const index = STATUS_FLOW.indexOf(status);

    if (index === -1 || index >= STATUS_FLOW.length - 1) {
        return null;
    }

    return STATUS_FLOW[index + 1];
}

function getNextLabel(status) {
    const labels = {
        PLACED: "Confirm Order",
        CONFIRMED: "Start Preparing",
        PREPARING: "Mark Ready for Pickup",
    };

    return labels[status] || null;
}

function getStatusHelp(status) {
    const descriptions = {
        PLACED: "New order received. Confirm it to start preparing the items.",
        CONFIRMED: "Order confirmed. Gather the items and prepare the parcel.",
        PREPARING: "Parcel is being prepared. Mark it ready after packing is complete.",
        READY_FOR_PICKUP: "Parcel is ready. Waiting for pickup.",
        COMPLETED: "This order has been completed.",
        CANCELLED: "This order was cancelled.",
    };
    return descriptions[status] || "Review the order details and current progress below.";
}

function Orders() {
    const location = useLocation();
    const notificationOrderId = Number(location.state?.sellerNotification?.order_id || 0);
    const handledNotificationKey = useRef(null);
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selected, setSelected] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [notice, setNotice] = useState("");

    const loadOrders = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) setLoading(true);
        setError("");

        try {
            const response = await api.get("/seller/orders");

            const data = response?.data?.data;

            setOrders(Array.isArray(data) ? data : []);

            setSelected((current) => {
                if (!current) return null;

                const updated = data?.find(
                    (order) => order.id === current.id
                );

                return updated || null;
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to load seller orders."
            );
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadOrders(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadOrders]);

    useEffect(() => {
        if (!notificationOrderId || orders.length === 0 || handledNotificationKey.current === location.key) return;
        const notifiedOrder = orders.find((order) => Number(order.id) === notificationOrderId);
        if (!notifiedOrder) return;
        handledNotificationKey.current = location.key;
        setFilter("all");
        setCurrentPage(Math.floor(orders.findIndex((order) => Number(order.id) === notificationOrderId) / ORDERS_PER_PAGE) + 1);
        setSelected(notifiedOrder);
    }, [location.key, notificationOrderId, orders]);

    useEffect(() => {
        if (!selected || !["READY_FOR_PICKUP", "PICKED_UP", "AT_SORTING_CENTER", "SORTED", "ASSIGNED_TO_RIDER", "OUT_FOR_DELIVERY", "DELIVERY_FAILED"].includes(normalizeStatus(selected.status))) return undefined;
        const timer = window.setInterval(() => { void loadOrders({ quiet: true }); }, 30_000);
        return () => window.clearInterval(timer);
    }, [loadOrders, selected?.id, selected?.status]);

    const normalizedOrders = useMemo(() => {
        return orders.map((order) => ({
            ...order,
            displayStatus: normalizeStatus(order.status),
        }));
    }, [orders]);

    const visible = useMemo(() => {
        if (filter === "all") {
            return normalizedOrders;
        }

        return normalizedOrders.filter(
            (order) => order.displayStatus === filter
        );
    }, [normalizedOrders, filter]);

    const pageCount = Math.max(1, Math.ceil(visible.length / ORDERS_PER_PAGE));
    const pageOrders = visible.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

    useEffect(() => {
        if (currentPage > pageCount) setCurrentPage(pageCount);
    }, [currentPage, pageCount]);

    const needsActionCount = useMemo(
        () => normalizedOrders.filter((order) => ["PLACED", "CONFIRMED", "PREPARING"].includes(order.displayStatus)).length,
        [normalizedOrders],
    );

    const updateStatus = async (order) => {
        const currentStatus = normalizeStatus(order.status);
        const nextStatus = getNextStatus(currentStatus);

        if (!nextStatus) return;

        setActionLoading(true);
        setNotice("");
        setError("");

        try {
            const response = await api.patch(
                `/seller/orders/${order.id}/status`,
                {
                    status: nextStatus,
                }
            );

            const updatedOrder = response?.data?.data;

            setOrders((previous) =>
                previous.map((item) =>
                    item.id === order.id
                        ? {
                              ...item,
                              ...updatedOrder,
                          }
                        : item
                )
            );

            setSelected((current) =>
                current?.id === order.id
                    ? {
                          ...current,
                          ...updatedOrder,
                      }
                    : current
            );

            setNotice(
                `Order #${order.id} is now ${
                    STATUS_LABEL[nextStatus]
                }.`
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to update order status."
            );
        } finally {
            setActionLoading(false);
        }
    };

    const requestPickup = async (order) => {
        setActionLoading(true);
        setNotice("");
        setError("");
        try {
            const response = await api.post(`/seller/orders/${order.id}/pickup-request`);
            await loadOrders();
            setNotice(response?.data?.message || `Pickup requested for order #${order.id}.`);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to schedule courier pickup.");
        } finally {
            setActionLoading(false);
        }
    };

    const getOrderSubtotal = (order) => {
        if (order?.subtotal !== undefined) {
            return Number(order.subtotal || 0);
        }

        return (order?.items || []).reduce(
            (sum, item) =>
                sum +
                Number(
                    item.subtotal ??
                        Number(item.unit_price || 0) *
                            Number(item.quantity || 0)
                ),
            0
        );
    };

    return (
        <div className="sl-page">
            <header className="sl-page-head sl-orders-page-head">
                <div>
                    <span className="sl-eyebrow">SELLER WORKSPACE · ORDERS</span>
                    <h1 className="sl-h1">Orders</h1>
                    <p>Confirm new orders, prepare the parcel, then mark it ready for pickup. Select any order below to see buyer and item details.</p>
                </div>
                <div className="sl-orders-header-status" role="status" aria-live="polite">
                    <span className="sl-orders-header-status-dot" aria-hidden="true" />
                    <span><strong>{needsActionCount}</strong><small>{needsActionCount === 1 ? "order needs" : "orders need"} your action</small></span>
                </div>
            </header>

            {notice && (
                <div
                    className="sl-order-notice"
                    role="status"
                >
                    <Check size={16} />
                    {notice}
                </div>
            )}

            {error && (
                <div
                    className="sl-order-error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <div className="sl-filter-tabs sl-filter-tabs--standalone">
                {[
                    "all",
                    ...STATUS_FLOW,
                ].map((status) => {
                    const count =
                        status === "all"
                            ? normalizedOrders.length
                            : normalizedOrders.filter(
                                  (order) =>
                                      order.displayStatus ===
                                      status
                              ).length;

                    return (
                        <button
                            key={status}
                            type="button"
                            className={
                                filter === status
                                    ? "active"
                                    : ""
                            }
                            onClick={() => {
                                setFilter(status);
                                setCurrentPage(1);
                            }}
                        >
                            {status === "all"
                                ? "All Orders"
                                : STATUS_LABEL[status]}

                            <span className="sl-tab-count">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div
                className={`sl-orders-layout${
                    selected ? " has-detail" : ""
                }`}
            >
                <div className="sl-card sl-orders-list">
                    <div className="sl-orders-list-head"><div><h2>Order list</h2><p>{visible.length} {visible.length === 1 ? "order" : "orders"}{filter === "all" ? " across all statuses" : ` · ${STATUS_LABEL[filter] || "filtered"}`}</p></div><span className="sl-orders-list-hint">Select a row to view details</span></div>
                    {loading ? (
                        <div className="sl-orders-state">
                            <div className="sl-orders-spinner" />
                            <p>Loading orders...</p>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="sl-orders-state">
                            <Package size={34} />
                            <h3>No orders found</h3>
                            <p>
                                New buyer orders will appear here
                                automatically.
                            </p>
                        </div>
                    ) : (
                        <div className="sl-table-wrap">
                            <table className="sl-table">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Customer</th>
                                        <th>Quantity</th>
                                        <th>Order total</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pageOrders.map((order) => {
                                        const status =
                                            order.displayStatus;

                                        const itemCount =
                                            (order.items || []).reduce(
                                                (sum, item) =>
                                                    sum +
                                                    Number(
                                                        item.quantity ||
                                                            0
                                                    ),
                                                0
                                            );

                                        return (
                                            <tr
                                                key={order.id}
                                                className={
                                                    selected?.id ===
                                                    order.id
                                                        ? "sl-row-active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setSelected(
                                                        order
                                                    )
                                                }
                                                style={{
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <td>
                                                    <strong>
                                                        #{order.id}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {getCustomerName(
                                                        order.buyer
                                                    )}
                                                </td>

                                                <td>
                                                    {itemCount}{" "}
                                                    {itemCount === 1
                                                        ? "item"
                                                        : "items"}
                                                </td>

                                                <td>
                                                    {formatMoney(
                                                        getOrderSubtotal(
                                                            order
                                                        )
                                                    )}
                                                </td>

                                                <td>
                                                    {formatDate(
                                                        order.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className="sl-badge"
                                                        style={{
                                                            color:
                                                                STATUS_COLOR[
                                                                    status
                                                                ],
                                                            background:
                                                                STATUS_BG[
                                                                    status
                                                                ],
                                                        }}
                                                    >
                                                        {STATUS_LABEL[
                                                            status
                                                        ] ||
                                                            status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && visible.length > ORDERS_PER_PAGE && <nav className="sl-orders-pagination" aria-label="Order list pages">
                        <span>Page {currentPage} of {pageCount}</span>
                        <div>
                            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>Previous</button>
                            <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage >= pageCount}>Next</button>
                        </div>
                    </nav>}
                </div>

                {selected && (
                    <div className="sl-card sl-order-detail">
                        <ParcelSlip order={selected} />
                        <div className="sl-detail-head">
                            <div className="sl-order-detail-heading">
                                <span className="sl-order-detail-eyebrow">ORDER DETAILS</span>
                                <h3>Order #{selected.id}</h3>
                                <p>{getStatusHelp(normalizeStatus(selected.status))}</p>
                                <span
                                    className={`sl-badge sl-order-detail-status sl-order-detail-status--${normalizeStatus(selected.status).toLowerCase()}`}
                                    style={{
                                        color:
                                            STATUS_COLOR[
                                                normalizeStatus(
                                                    selected.status
                                                )
                                            ],
                                        background:
                                            STATUS_BG[
                                                normalizeStatus(
                                                    selected.status
                                                )
                                            ],
                                    }}
                                >
                                    {
                                        STATUS_LABEL[
                                            normalizeStatus(
                                                selected.status
                                            )
                                        ]
                                    }
                                </span>
                            </div>

                            <button
                                type="button"
                                className="sl-modal-close"
                                onClick={() =>
                                    setSelected(null)
                                }
                                aria-label="Close order details"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="sl-detail-section sl-order-detail-customer">
                            <p className="sl-detail-label">
                                Customer
                            </p>

                            <p className="sl-detail-val">
                                <strong>
                                    {getCustomerName(
                                        selected.buyer
                                    )}
                                </strong>
                            </p>

                            <p className="sl-detail-val">
                                {selected.buyer?.email || "—"}
                            </p>

                            <p className="sl-detail-val">
                                {selected.buyer?.phone || "—"}
                            </p>
                        </div>

                        <div className="sl-detail-section sl-order-detail-address">
                            <p className="sl-detail-label">
                                Delivery Address
                            </p>
                            {(() => {
                                const address = parseDeliveryAddress(selected.delivery_address);
                                return <div className="sl-delivery-address-content">
                                    {address.label && <span className="sl-delivery-address-type">Address label · {address.label}</span>}
                                    {address.recipient && <p className="sl-detail-val"><span>Recipient</span><strong>{address.recipient}</strong></p>}
                                    {address.contact && <p className="sl-detail-val"><span>Contact</span><strong>{address.contact}</strong></p>}
                                    <div className="sl-delivery-address-lines">{address.addressLines.length ? address.addressLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>) : <span>No delivery address provided.</span>}</div>
                                </div>;
                            })()}
                        </div>

                        <div className="sl-detail-section sl-order-detail-payment">
                            <p className="sl-detail-label">
                                Payment Method
                            </p>

                            <p className="sl-detail-val">
                                {selected.payment_method ===
                                "gcash"
                                    ? "GCash"
                                    : "Cash on Delivery"}
                            </p>
                        </div>

                        <div className="sl-detail-section sl-order-detail-items">
                            <p className="sl-detail-label">
                                Items in this order
                            </p>

                            <div className="sl-order-items">
                                {(selected.items || []).map(
                                    (item) => (
                                        <div
                                            className="sl-detail-item-row"
                                            key={item.id}
                                        >
                                            <div>
                                                <strong>
                                                    {item.product
                                                        ?.name ||
                                                        "Product"}
                                                </strong>

                                                <span>{item.quantity} × {formatMoney(item.unit_price)}</span>
                                            </div>

                                            <strong>
                                                {formatMoney(
                                                    item.subtotal
                                                )}
                                            </strong>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "AT_SORTING_CENTER", "SORTED", "ASSIGNED_TO_RIDER", "OUT_FOR_DELIVERY", "DELIVERY_FAILED", "DELIVERED", "COMPLETED"].includes(
                            normalizeStatus(selected.status)
                        ) && (
                            <section className="sl-preparation-panel" aria-labelledby="sl-preparation-title">
                                <div className="sl-preparation-heading">
                                    <Package size={18} aria-hidden="true" />
                                    <div>
                                        <h4 id="sl-preparation-title">Parcel preparation</h4>
                                        <p>Order status is the authoritative fulfillment record.</p>
                                    </div>
                                </div>
                                {!['CONFIRMED', 'PREPARING'].includes(normalizeStatus(selected.status)) ? (
                                    <div className="sl-preparation-ready" role="status">
                                        {(() => {
                                            const pickup = selected.delivery_progress?.pickup;
                                            const status = pickup?.status;
                                            const labels = {
                                                PICKUP_REQUESTED: "Pickup requested. Logistics will assign a courier.",
                                                ASSIGNED_TO_PICKUP_RIDER: `Pickup scheduled${pickup.courier?.name ? ` with ${pickup.courier.name}` : ""}.`,
                                                ACCEPTED_BY_PICKUP_RIDER: `Courier accepted the pickup${pickup.courier?.name ? ` · ${pickup.courier.name}` : ""}.`,
                                                PICKED_UP: "Courier collected the parcel. It is on the way to the sorting center.",
                                                AT_SORTING_CENTER: "Parcel received at the sorting center.",
                                            };
                                            return <>
                                                <strong>{labels[status] || "Parcel is ready for courier pickup."}</strong>
                                                {status === "PICKUP_REQUESTED" && <p>Requested {formatDateTime(pickup.requested_at)}. Follow status updates here.</p>}
                                                {pickup?.pickup_address && <p>Pickup location: {pickup.pickup_address}</p>}
                                                {pickup?.scheduled_at && <p>Pickup scheduled: {formatDateTime(pickup.scheduled_at)}</p>}
                                                {pickup?.courier?.phone && <p>Courier contact: {pickup.courier.phone}</p>}
                                                {!status && <><p>Schedule a pickup to send this parcel to the logistics team.</p><button type="button" className="sl-btn-primary" disabled={actionLoading} onClick={() => void requestPickup(selected)}>{actionLoading ? "Scheduling…" : "Schedule courier pickup"}</button></>}
                                                {pickup?.picked_up_at && <p>Collected {formatDateTime(pickup.picked_up_at)}</p>}
                                                {pickup?.received_at && <p>Received at sorting center {formatDateTime(pickup.received_at)}</p>}
                                                {(selected.delivery_progress?.events || []).length > 0 && <ol className="sl-preparation-steps">{selected.delivery_progress.events.map((event, index) => <li key={`${event.event_type}-${index}`}>{String(event.event_type || "Shipment update").replaceAll("_", " ")} · {formatDateTime(event.created_at)}</li>)}</ol>}
                                            </>;
                                        })()}
                                    </div>
                                ) : (
                                    <>
                                        <ol className="sl-preparation-steps">
                                            <li>Match each item and quantity to the order.</li>
                                            <li>Check item condition and pack the parcel securely.</li>
                                            <li>Print and attach the CRYMA parcel slip.</li>
                                        </ol>
                                        <p className="sl-preparation-note">
                                            The preparation guide does not save a separate packing status. Select “Mark Ready for Pickup” only after the parcel is packed; that action updates the order status.
                                        </p>
                                    </>
                                )}
                            </section>
                        )}

                        <div className="sl-detail-section sl-order-detail-total">
                            <p className="sl-detail-label">
                                Order Total
                            </p>

                            <p className="sl-detail-total">
                                {formatMoney(
                                    selected.total_amount ??
                                        getOrderSubtotal(
                                            selected
                                        )
                                )}
                            </p>
                        </div>

                        <div className="sl-detail-section sl-order-detail-date">
                            <p className="sl-detail-label">
                                Order Date & Time
                            </p>

                            <p className="sl-detail-val">
                                {formatDateTime(
                                    selected.created_at
                                )}
                            </p>
                        </div>

                        <div className="sl-detail-actions">
                            {normalizeStatus(
                                selected.status
                            ) === "PREPARING" && (
                                <button
                                    type="button"
                                    className="sl-order-action-button sl-order-action-button--print"
                                    onClick={() =>
                                        window.print()
                                    }
                                >
                                    <Printer size={15} />
                                    Print Parcel Slip
                                </button>
                            )}

                            {getNextLabel(
                                normalizeStatus(
                                    selected.status
                                )
                            ) && (
                                <button
                                    type="button"
                                    className="sl-order-action-button sl-order-action-button--primary"
                                    disabled={actionLoading}
                                    onClick={() =>
                                        updateStatus(
                                            selected
                                        )
                                    }
                                >
                                    {actionLoading ? (
                                        "Updating..."
                                    ) : (
                                        <>
                                            {normalizeStatus(
                                                selected.status
                                            ) ===
                                                "PREPARING" ? (
                                                <Truck size={15} />
                                            ) : (
                                                <Check size={15} />
                                            )}

                                            {getNextLabel(
                                                normalizeStatus(
                                                    selected.status
                                                )
                                            )}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Orders;
