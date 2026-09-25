import { useEffect, useMemo, useState } from "react";
import {
    Check,
    Package,
    Printer,
    Truck,
    X,
} from "lucide-react";
import api from "../../shared/services/api";

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

function Orders() {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("all");
    const [selected, setSelected] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [notice, setNotice] = useState("");

    const loadOrders = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

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

    const getCustomerAddress = (order) => {
        return order?.delivery_address || "No delivery address provided.";
    };

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">
                        ORDER MANAGEMENT
                    </div>

                    <h1 className="sl-h1">Orders</h1>

                    <p>
                        View customer orders and prepare them for
                        pickup.
                    </p>
                </div>
            </div>

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
                            onClick={() =>
                                setFilter(status)
                            }
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
                                        <th>Items</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {visible.map((order) => {
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
                </div>

                {selected && (
                    <div className="sl-card sl-order-detail">
                        <div className="sl-detail-head">
                            <div>
                                <h3>
                                    Order #{selected.id}
                                </h3>

                                <span
                                    className="sl-badge"
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

                        <div className="sl-detail-section">
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

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">
                                Delivery Address
                            </p>

                            <p className="sl-detail-val">
                                {getCustomerAddress(selected)}
                            </p>
                        </div>

                        <div className="sl-detail-section">
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

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">
                                Order Items
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

                                                <span>
                                                    Qty:{" "}
                                                    {
                                                        item.quantity
                                                    }
                                                </span>
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

                        <div className="sl-detail-section">
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

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">
                                Order Date
                            </p>

                            <p className="sl-detail-val">
                                {formatDate(
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
                                    className="sl-btn-ghost"
                                    onClick={() =>
                                        window.print()
                                    }
                                >
                                    <Printer size={15} />
                                    Print Waybill
                                </button>
                            )}

                            {getNextLabel(
                                normalizeStatus(
                                    selected.status
                                )
                            ) && (
                                <button
                                    type="button"
                                    className="sl-btn-primary"
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