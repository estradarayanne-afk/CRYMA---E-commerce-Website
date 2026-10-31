import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    Clock3,
    MapPin,
    MessageCircle,
    Package,
    ShoppingBag,
    Truck,
} from "lucide-react";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import api from "../../../shared/services/api";
import Dialog from "../../../shared/components/Dialog";
import { formatStatusLabel } from "../../../shared/utils/statusLabel";

import "./OrderDetails.css";

const STATUS_STEPS = [
    {
        key: "PLACED",
        title: "Order placed",
        description:
            "Your order has been placed.",
        icon: ShoppingBag,
    },
    {
        key: "CONFIRMED",
        title: "Order confirmed",
        description:
            "The seller confirmed your order.",
        icon: Check,
    },
    {
        key: "PREPARING",
        title: "Preparing",
        description:
            "The seller is preparing your order.",
        icon: Package,
    },
    {
        key: "READY_FOR_PICKUP",
        title: "Ready for pickup",
        description:
            "Your parcel is ready for pickup.",
        icon: Package,
    },
    {
        key: "ASSIGNED_TO_PICKUP_RIDER",
        title: "Pickup rider assigned",
        description: "A rider is assigned to collect the parcel from the seller.",
        icon: Truck,
    },
    {
        key: "ACCEPTED_BY_PICKUP_RIDER",
        title: "Pickup accepted",
        description: "The pickup rider accepted the collection assignment.",
        icon: Check,
    },
    {
        key: "PICKED_UP",
        title: "Picked up",
        description:
            "The rider picked up your parcel.",
        icon: Truck,
    },
    {
        key: "AT_SORTING_CENTER",
        title: "At sorting center",
        description:
            "Your parcel arrived at the sorting center.",
        icon: Package,
    },
    {
        key: "SORTED",
        title: "Sorted",
        description:
            "Your parcel has been sorted.",
        icon: Check,
    },
    {
        key: "ASSIGNED_TO_RIDER",
        title: "Delivery rider assigned",
        description:
            "A delivery rider has been assigned for your area.",
        icon: Truck,
    },
    {
        key: "OUT_FOR_DELIVERY",
        title: "Out for delivery",
        description:
            "Your parcel is on the way.",
        icon: Truck,
    },
    {
        key: "DELIVERED",
        title: "Delivered",
        description:
            "Your parcel has been delivered.",
        icon: Check,
    },
    {
        key: "COMPLETED",
        title: "Completed",
        description:
            "Order completed.",
        icon: Check,
    },
];

const STATUS_LABELS = {
    pending: "Order placed",
    PLACED: "Order placed",
    CONFIRMED: "Order confirmed",
    PREPARING: "Preparing",
    READY_FOR_PICKUP:
        "Ready for pickup",
    PICKED_UP: "Picked up",
    AT_SORTING_CENTER:
        "At sorting center",
    SORTED: "Sorted",
    ASSIGNED_TO_RIDER:
        "Rider assigned",
    OUT_FOR_DELIVERY:
        "Out for delivery",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    DELIVERY_FAILED:
        "Delivery failed",
    RETURNED: "Returned",
};

const STATUS_DESCRIPTIONS = {
    pending:
        "Your order has been placed.",
    PLACED:
        "Your order has been placed.",
    CONFIRMED:
        "The seller confirmed your order.",
    PREPARING:
        "The seller is preparing your order.",
    READY_FOR_PICKUP:
        "Your parcel is ready for pickup.",
    PICKED_UP:
        "The rider picked up your parcel.",
    AT_SORTING_CENTER:
        "Your parcel arrived at the sorting center.",
    SORTED:
        "Your parcel has been sorted.",
    ASSIGNED_TO_RIDER:
        "A delivery rider has been assigned.",
    OUT_FOR_DELIVERY:
        "Your parcel is on the way.",
    DELIVERED:
        "Your parcel has been delivered.",
    COMPLETED:
        "Order completed.",
    DELIVERY_FAILED:
        "The delivery attempt was unsuccessful.",
    RETURNED:
        "Your parcel was returned.",
};

function normalizeStatus(status) {
    if (!status) {
        return "PLACED";
    }

    if (
        String(status).toLowerCase() ===
        "pending"
    ) {
        return "PLACED";
    }

    return String(status).toUpperCase();
}

function formatMoney(value) {
    return `₱${Number(
        value || 0
    ).toLocaleString()}`;
}

function formatDate(value) {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleString(
        "en-PH",
        {
            dateStyle: "medium",
            timeStyle: "short",
        }
    );
}

function getStatusClass(status) {
    const normalized =
        String(status || "")
            .toLowerCase()
            .replaceAll("_", "-");

    if (
        [
            "delivered",
            "completed",
        ].includes(normalized)
    ) {
        return "order-status-success";
    }

    if (
        [
            "delivery-failed",
            "returned",
        ].includes(normalized)
    ) {
        return "order-status-danger";
    }

    if (
        [
            "out-for-delivery",
            "assigned-to-rider",
            "picked-up",
            "sorted",
            "at-sorting-center",
        ].includes(normalized)
    ) {
        return "order-status-shipping";
    }

    return "order-status-progress";
}

function OrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");
    const [notice, setNotice] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [receiptConfirmOpen, setReceiptConfirmOpen] = useState(false);
    const [receiptActionError, setReceiptActionError] = useState("");
    const [refundFormOpen, setRefundFormOpen] = useState(false);
    const [refundReason, setRefundReason] = useState("");
    const [refundAmount, setRefundAmount] = useState("");
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [refundError, setRefundError] = useState("");

    const isLoggedIn =
        !!localStorage.getItem(
            "token"
        );

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login", {
                replace: true,
                state: {
                    from: `/orders/${id}`,
                },
            });

            return;
        }

        const loadOrder =
            async () => {
                setLoading(true);
                setError("");

                try {
                    const response =
                        await api.get(
                            `/orders/${id}`
                        );

                    const loadedOrder = response?.data?.data || null;
                    setOrder(loadedOrder);
                    setRefundAmount(String(loadedOrder?.total_amount || ""));
                } catch (requestError) {
                    console.error(
                        "Order details error:",
                        requestError
                    );

                    setError(
                        requestError
                            ?.response
                            ?.data
                            ?.message ||
                            "Unable to load this order."
                    );
                } finally {
                    setLoading(false);
                }
            };

        loadOrder();
    }, [
        id,
        isLoggedIn,
        navigate,
    ]);

    const confirmReceipt = async () => {
        setConfirming(true);
        setReceiptActionError("");
        setError("");
        setNotice("");
        try {
            await api.post(`/orders/${id}/confirm-received`);
            setNotice("Receipt confirmed. The order is complete.");
            setReceiptConfirmOpen(false);
            try {
                const response = await api.get(`/orders/${id}`);
                setOrder(response?.data?.data || null);
            } catch (refreshError) {
                setError(refreshError?.response?.data?.message || "Receipt was confirmed, but order details could not be refreshed. Reload the page to see the latest status.");
            }
        } catch (requestError) {
            const message = requestError?.response?.data?.message || "Unable to confirm receipt. Refresh the order and try again.";
            setError(message);
            setReceiptActionError(message);
        } finally {
            setConfirming(false);
        }
    };

    const submitRefundRequest = async (event) => {
        event.preventDefault();
        if (!order || refundSubmitting) return;
        setRefundSubmitting(true);
        setRefundError("");
        setNotice("");
        try {
            const response = await api.post(`/orders/${order.id}/refund-requests`, {
                reason: refundReason.trim(),
                requested_amount: Number(refundAmount),
            });
            setNotice("Your refund request was submitted for review. You can follow its status here and in Customer Service chat.");
            setRefundFormOpen(false);
            setRefundReason("");
            const submittedRefund = response?.data?.data;
            if (submittedRefund) {
                setOrder((current) => current ? { ...current, latest_refund_request: submittedRefund } : current);
            }
        } catch (requestError) {
            setRefundError(requestError?.response?.data?.message || "We couldn't submit your refund request. Please review the details and try again.");
        } finally {
            setRefundSubmitting(false);
        }
    };

    const currentStatus =
        normalizeStatus(
            order?.status
        );

    const currentStepIndex =
        useMemo(() => {
            const eventStatus = [...(order?.delivery_progress?.events || [])].reverse().find((event) =>
                ["ASSIGNED_TO_PICKUP_RIDER", "ACCEPTED_BY_PICKUP_RIDER"].includes(event.new_status)
            )?.new_status;
            const trackingStatus = currentStatus === "READY_FOR_PICKUP" && eventStatus ? eventStatus : currentStatus;
            const index =
                STATUS_STEPS.findIndex(
                    (step) =>
                        step.key ===
                        trackingStatus
                );

            return index >= 0
                ? index
                : 0;
        }, [currentStatus, order?.delivery_progress?.events]);

    const items = Array.isArray(
        order?.items
    )
        ? order.items
        : [];

    const subtotal = Number(
        order?.subtotal ??
            items.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.subtotal ??
                            Number(
                                item.unit_price ||
                                    0
                            ) *
                                Number(
                                    item.quantity ||
                                        0
                                )
                    ),
                0
            )
    );

    const shippingFee = Number(
        order?.shipping_fee || 0
    );

    const total = Number(
        order?.total_amount ??
            subtotal +
                shippingFee
    );

    const paymentMethod =
        order?.payment_method ===
        "gcash"
            ? "GCash"
            : "Cash on Delivery";

    const isCompleted =
        currentStatus ===
        "COMPLETED";

    const isDelivered =
        currentStatus ===
        "DELIVERED";

    const isFailed =
        currentStatus ===
        "DELIVERY_FAILED";

    const isReturned =
        currentStatus ===
        "RETURNED";

    const refundRequest = order?.latest_refund_request || null;
    const refundRequestOpen = ["pending", "under_review", "approved", "refunded"].includes(refundRequest?.status);
    const refundEligible = ["DELIVERED", "COMPLETED"].includes(currentStatus) && !refundRequestOpen;

    const refundRequestForm = (
        <form className="order-refund-form" onSubmit={submitRefundRequest}>
            <label>Amount requested
                <div className="order-refund-amount"><span>₱</span><input type="number" min="0.01" max={total} step="0.01" required value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} /></div>
                <small>Maximum {formatMoney(total)}. Customer Service may approve a different amount.</small>
            </label>
            <label htmlFor="order-refund-reason">Reason for request</label>
            <textarea id="order-refund-reason" minLength={10} maxLength={2000} required value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Tell us what happened and why you are requesting a refund." />
            {refundError && <p className="order-refund-error" role="alert">{refundError}</p>}
            <p className="order-refund-disclaimer">Cash on Delivery orders are not refunded automatically. If approved, Customer Service will contact you to arrange repayment outside the app.</p>
            <div className="order-refund-actions">
                <button type="button" onClick={() => setRefundFormOpen(false)} disabled={refundSubmitting}>Cancel</button>
                <button type="submit" disabled={refundSubmitting || refundReason.trim().length < 10 || Number(refundAmount) <= 0 || Number(refundAmount) > total}>{refundSubmitting ? "Submitting…" : "Submit for review"}</button>
            </div>
        </form>
    );

    if (!isLoggedIn) {
        return null;
    }

    if (loading) {
        return (
            <main className="order-details-page">
                <div className="order-details-state">
                    <div className="order-details-spinner" />

                    <h2>
                        Loading your order...
                    </h2>

                    <p>
                        Please wait while
                        we get the latest
                        order information.
                    </p>
                </div>
            </main>
        );
    }

    if (
        error ||
        !order
    ) {
        return (
            <main className="order-details-page">
                <Link
                    className="order-back-link"
                    to="/orders"
                >
                    <ArrowLeft
                        size={15}
                    />
                    Back to My Orders
                </Link>

                <div className="order-details-state order-details-error-state">
                    <div className="order-details-state-icon">
                        <Package
                            size={23}
                        />
                    </div>

                    <h2>
                        Order unavailable
                    </h2>

                    <p>
                        {error ||
                            "We couldn't find this order."}
                    </p>

                    <Link to="/orders">
                        View My Orders
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="order-details-page">
            <Link
                className="order-back-link"
                to="/orders"
            >
                <ArrowLeft
                    size={15}
                />
                Back to My Orders
            </Link>

            <header className="order-details-header">
                <div>
                    <span className="order-details-eyebrow">
                        ORDER DETAILS
                    </span>

                    <h1>
                        Order #{order.id}
                    </h1>

                    <p>
                        Placed on{" "}
                        {formatDate(
                            order.created_at
                        )}
                    </p>
                </div>

                <span
                    className={`order-status-badge ${getStatusClass(
                        currentStatus
                    )}`}
                >
                    {STATUS_LABELS[
                        currentStatus
                    ] ||
                        currentStatus}
                </span>
            </header>

            {error && <div className="order-inline-alert" role="alert">{error}</div>}
            {notice && <div className="order-inline-notice" role="status">{notice}</div>}

            <section
                className={`order-current-status ${
                    isFailed ||
                    isReturned
                        ? "exception"
                        : ""
                }`}
            >
                <div className="order-current-icon">
                    {isCompleted ||
                    isDelivered ? (
                        <Check
                            size={21}
                        />
                    ) : isFailed ||
                      isReturned ? (
                        <Clock3
                            size={21}
                        />
                    ) : (
                        <Truck
                            size={21}
                        />
                    )}
                </div>

                <div>
                    <span>
                        LATEST UPDATE
                    </span>

                    <h2>
                        {STATUS_LABELS[
                            currentStatus
                        ] ||
                            currentStatus}
                    </h2>

                    <p>
                        {STATUS_DESCRIPTIONS[
                            currentStatus
                        ] ||
                            "Your order is being processed."}
                    </p>
                </div>
            </section>

            <div className="order-details-layout">
                <div className="order-details-main">
                    {!isFailed &&
                        !isReturned && (
                            <section className="order-panel">
                                <div className="order-panel-heading">
                                    <div>
                                        <span>
                                            DELIVERY JOURNEY
                                        </span>

                                        <h2>
                                            Track your order
                                        </h2>
                                    </div>
                                </div>

                                <div className="order-timeline">
                                    {STATUS_STEPS.map(
                                        (
                                            step,
                                            index
                                        ) => {
                                            const Icon =
                                                step.icon;

                                            const completed =
                                                index <
                                                currentStepIndex;

                                            const active =
                                                index ===
                                                currentStepIndex;
                                            const deliveryEvent = [...(order.delivery_progress?.events || [])].reverse().find(
                                                (event) => event.new_status === step.key
                                            );

                                            return (
                                                <div
                                                    key={
                                                        step.key
                                                    }
                                                    className={`order-timeline-item ${
                                                        completed
                                                            ? "completed"
                                                            : ""
                                                    } ${
                                                        active
                                                            ? "active"
                                                            : ""
                                                    }`}
                                                >
                                                    <div className="order-timeline-marker">
                                                        {completed ? (
                                                            <Check
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                        ) : (
                                                            <Icon
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="order-timeline-content">
                                                        <strong>
                                                            {
                                                                step.title
                                                            }
                                                        </strong>

                                                        <span>
                                                            {active
                                                                ? step.description
                                                                : completed
                                                                ? "Completed"
                                                                : "Not started yet"}
                                                            {deliveryEvent?.created_at && (
                                                                <><br />{new Date(deliveryEvent.created_at).toLocaleString("en-PH")}</>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                                {(order.delivery_progress?.events || []).filter((event) => event.event_type?.startsWith("hub_transfer_")).map((event) => (
                                    <p key={`${event.event_type}-${event.created_at}`}><strong>{event.event_type === "hub_transfer_departed" ? "Hub transfer departed" : "Hub transfer arrived"}:</strong> {event.reason} · {formatDate(event.created_at)}</p>
                                ))}
                                {order.delivery_progress?.current_hub?.name && <p><strong>Current hub:</strong> {order.delivery_progress.current_hub.name}</p>}
                            </section>
                        )}

                    {(isFailed ||
                        isReturned) && (
                        <section className="order-panel order-exception-panel">
                            <span>
                                ORDER UPDATE
                            </span>

                            <h2>
                                {STATUS_LABELS[
                                    currentStatus
                                ]}
                            </h2>

                            <p>
                                {STATUS_DESCRIPTIONS[
                                    currentStatus
                                ]}
                            </p>
                        </section>
                    )}

                    <section className="order-panel">
                        <div className="order-panel-heading">
                            <div>
                                <span>
                                    ORDER CONTENTS
                                </span>

                                <h2>
                                    Your items
                                </h2>
                            </div>

                            <span>
                                {items.length}{" "}
                                {items.length ===
                                1
                                    ? "item"
                                    : "items"}
                            </span>
                        </div>

                        <div className="order-items-list">
                            {items.map(
                                (item) => {
                                    const product =
                                        item.product ||
                                        {};

                                    const itemName =
                                        product?.name ||
                                        item.product_name ||
                                        "Product";

                                    const quantity =
                                        Number(
                                            item.quantity ||
                                                0
                                        );

                                    const unitPrice =
                                        Number(
                                            item.unit_price ??
                                                product?.price ??
                                                0
                                        );

                                    const itemSubtotal =
                                        Number(
                                            item.subtotal ??
                                                unitPrice *
                                                    quantity
                                        );

                                    return (
                                        <div
                                            className="order-item-row"
                                            key={
                                                item.id
                                            }
                                        >
                                            <div className="order-item-image">
                                                {product?.image ? (
                                                    <img
                                                        src={
                                                            product.image
                                                        }
                                                        alt={
                                                            itemName
                                                        }
                                                    />
                                                ) : (
                                                    <span>
                                                        {itemName
                                                            .charAt(
                                                                0
                                                            )
                                                            .toUpperCase()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="order-item-info">
                                                <strong>
                                                    {
                                                        itemName
                                                    }
                                                </strong>

                                                <span>
                                                    Quantity: {quantity}
                                                </span>
                                                {item.variant_label && <span>{item.variant_label}</span>}
                                            </div>

                                            <div className="order-item-pricing">
                                                <span>
                                                    {formatMoney(
                                                        unitPrice
                                                    )}{" "}
                                                    per item
                                                </span>

                                                <strong>
                                                    {formatMoney(
                                                        itemSubtotal
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </section>

                    {(refundEligible || refundRequest) && (
                        <section className="order-panel order-refund-panel">
                            <div className="order-panel-heading">
                                <div>
                                    <span>REFUND SUPPORT</span>
                                    <h2>{refundRequest ? `Refund request #${refundRequest.id}` : "Request a refund"}</h2>
                                </div>
                                {refundRequest && <span className={`order-refund-status ${refundRequest.status}`}>{refundRequest.status.replaceAll("_", " ")}</span>}
                            </div>

                            {refundRequest ? (
                                <div className="order-refund-details">
                                    <p><strong>Requested amount:</strong> {formatMoney(refundRequest.requested_amount)}</p>
                                    {refundRequest.approved_amount && <p><strong>Approved amount:</strong> {formatMoney(refundRequest.approved_amount)}</p>}
                                    <p><strong>Reason:</strong> {refundRequest.reason}</p>
                                    {refundRequest.review_note && <p><strong>Customer Service:</strong> {refundRequest.review_note}</p>}
                                    {refundRequest.return_required && <p><strong>Return parcel:</strong> {refundRequest.return_shipment?.status?.replaceAll("_", " ") || "Awaiting logistics assignment"}{refundRequest.return_shipment?.current_hub?.name ? ` · ${refundRequest.return_shipment.current_hub.name}` : ""}</p>}
                                    {refundRequest.status === "refunded" && <p><strong>Repayment recorded:</strong> {refundRequest.refund_method?.replaceAll("_", " ")}{refundRequest.refunded_at ? ` · ${formatDate(refundRequest.refunded_at)}` : ""}</p>}
                                    <p className="order-refund-disclaimer">Refunds are reviewed by Customer Service. CRYMA does not send money automatically. The team will confirm the repayment arrangement with you.</p>
                                    <Link to="/buyer/support" className="order-refund-chat-link"><MessageCircle size={15} /> Open Customer Service chat</Link>
                                    {refundRequest.status === "rejected" && (refundFormOpen ? refundRequestForm : <button type="button" className="order-refund-start" onClick={() => { setRefundError(""); setRefundFormOpen(true); }}>Submit a new request</button>)}
                                </div>
                            ) : (
                                <div className="order-refund-details">
                                    <p>Submit the amount and reason for Customer Service to review. Approval and repayment are not automatic.</p>
                                    {!refundFormOpen ? <button type="button" className="order-refund-start" onClick={() => { setRefundError(""); setRefundFormOpen(true); }}>Start refund request</button> : refundRequestForm}
                                </div>
                            )}
                        </section>
                    )}

                    <section className="order-panel">
                        <div className="order-panel-heading">
                            <div>
                                <span>
                                    SHIP TO
                                </span>

                                <h2>
                                    Delivery information
                                </h2>
                            </div>
                        </div>

                        <div className="order-information-box">
                            <div className="order-information-icon">
                                <MapPin
                                    size={17}
                                />
                            </div>

                            <div>
                                <strong>
                                    Delivery address
                                </strong>

                                <p>
                                    {order.delivery_address ||
                                        "Delivery address not available."}
                                </p>
                                {order.delivery_progress?.delivery_area?.name && <small>Delivery area: {order.delivery_progress.delivery_area.name}</small>}
                                {order.delivery_progress?.pickup?.status && <small>Seller pickup: {formatStatusLabel(order.delivery_progress.pickup.status)}</small>}
                            </div>
                        </div>
                    </section>

                    {(isDelivered ||
                        isCompleted) && (
                        <section className="order-completed-panel">
                            <div className="order-completed-content">
                                <div className="order-completed-icon">
                                    <Check
                                        size={17}
                                    />
                                </div>

                                <div>
                                    <strong>
                                        {isCompleted
                                            ? "Order completed"
                                            : "Order delivered"}
                                    </strong>

                                    <p>
                                        {isCompleted
                                            ? "This order is complete."
                                            : "Your parcel has been delivered."}
                                    </p>
                                </div>
                            </div>

                            {isDelivered && <button type="button" className="order-confirm-received" onClick={() => { setReceiptActionError(""); setReceiptConfirmOpen(true); }} disabled={confirming}>
                                {confirming ? "Confirming…" : "Confirm order received"}
                            </button>}

                            {isCompleted && (
                                <Link to={`/reviews?order=${order.id}`}>
                                    Leave a Review
                                </Link>
                            )}
                        </section>
                    )}
                </div>

                <aside className="order-details-sidebar">
                    <section className="order-summary-panel">
                        <span className="order-summary-eyebrow">
                            PAYMENT SUMMARY
                        </span>

                        <h2>
                            Order total
                        </h2>

                        <div className="order-summary-line">
                            <span>
                                Subtotal
                            </span>

                            <strong>
                                {formatMoney(
                                    subtotal
                                )}
                            </strong>
                        </div>

                        <div className="order-summary-line">
                            <span>
                                Delivery fee
                            </span>

                            <strong>
                                {shippingFee ===
                                0
                                    ? "Free"
                                    : formatMoney(
                                          shippingFee
                                      )}
                            </strong>
                        </div>

                        {Number(order?.voucher_discount || 0) > 0 && (
                            <div className="order-summary-line">
                                <span>
                                    Voucher{order?.voucher_code ? ` (${order.voucher_code})` : ""}
                                </span>
                                <strong>
                                    −{formatMoney(Number(order.voucher_discount))}
                                </strong>
                            </div>
                        )}

                        <div className="order-summary-total">
                            <span>
                                Total for this order
                            </span>

                            <strong>
                                {formatMoney(
                                    total
                                )}
                            </strong>
                        </div>

                        <div className="order-payment-method">
                            <span>
                                Payment method
                            </span>

                            <strong>
                                {paymentMethod}
                            </strong>
                        </div>
                    </section>

                    <section className="order-mini-panel">
                        <span className="order-summary-eyebrow">
                            ORDER INFO
                        </span>

                        <div>
                            <span>
                                Order number
                            </span>

                            <strong>
                                #{order.id}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Placed
                            </span>

                            <strong>
                                {formatDate(
                                    order.created_at
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Status
                            </span>

                            <strong>
                                {STATUS_LABELS[
                                    currentStatus
                                ] ||
                                    currentStatus}
                            </strong>
                        </div>
                    </section>

                    <section className="order-mini-panel order-support-panel">
                        <span className="order-summary-eyebrow">NEED HELP?</span>
                        <strong>CRYMA Customer Service</strong>
                        <p>Our team can help with tracking, delivery, payment, or returns.</p>
                        <button type="button" onClick={() => navigate("/buyer/support")}>
                            <MessageCircle size={15} />
                            Contact Customer Service
                        </button>
                    </section>
                </aside>
            </div>
            <Dialog
                open={receiptConfirmOpen}
                onClose={() => setReceiptConfirmOpen(false)}
                ariaLabelledBy="receipt-confirm-title"
                className="order-confirm-dialog"
                busy={confirming}
            >
                <h2 id="receipt-confirm-title">Confirm order received?</h2>
                <p>Please confirm only if you have received this order.</p>
                {receiptActionError && <p className="order-confirm-error" role="alert">{receiptActionError}</p>}
                <div className="order-confirm-dialog-actions">
                    <button type="button" onClick={() => setReceiptConfirmOpen(false)} disabled={confirming}>Cancel</button>
                    <button type="button" className="order-confirm-received" onClick={() => void confirmReceipt()} disabled={confirming}>
                        {confirming ? "Confirming…" : "Confirm receipt"}
                    </button>
                </div>
            </Dialog>
        </main>
    );
}

export default OrderDetails;
