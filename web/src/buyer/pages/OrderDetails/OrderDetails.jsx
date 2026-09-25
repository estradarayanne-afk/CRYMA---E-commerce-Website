import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    Clock3,
    MapPin,
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
        title: "Rider assigned",
        description:
            "A delivery rider has been assigned.",
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

                    setOrder(
                        response?.data
                            ?.data || null
                    );
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

    const currentStatus =
        normalizeStatus(
            order?.status
        );

    const currentStepIndex =
        useMemo(() => {
            const index =
                STATUS_STEPS.findIndex(
                    (step) =>
                        step.key ===
                        currentStatus
                );

            return index >= 0
                ? index
                : 0;
        }, [currentStatus]);

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
                        Placed{" "}
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
                        Current status
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
                                            TRACKING
                                        </span>

                                        <h2>
                                            Order progress
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
                                                                : "Waiting for this step."}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
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
                                    ITEMS
                                </span>

                                <h2>
                                    Items in this order
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
                                                    Qty{" "}
                                                    {
                                                        quantity
                                                    }
                                                </span>
                                            </div>

                                            <div className="order-item-pricing">
                                                <span>
                                                    {formatMoney(
                                                        unitPrice
                                                    )}{" "}
                                                    each
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

                    <section className="order-panel">
                        <div className="order-panel-heading">
                            <div>
                                <span>
                                    DELIVERY
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
                                            ? "You have confirmed receipt of this order."
                                            : "Your parcel has been delivered."}
                                    </p>
                                </div>
                            </div>

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
                            ORDER SUMMARY
                        </span>

                        <h2>
                            Payment details
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
                                Delivery
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

                        <div className="order-summary-total">
                            <span>
                                Total
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
                            ORDER INFORMATION
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
                </aside>
            </div>
        </main>
    );
}

export default OrderDetails;