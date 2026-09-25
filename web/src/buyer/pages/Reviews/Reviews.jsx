import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ArrowLeft,
    Check,
    LoaderCircle,
    Star,
} from "lucide-react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";

import api from "../../../shared/services/api";

import "./Reviews.css";

function formatCurrency(value) {
    return `₱${Number(value || 0).toLocaleString()}`;
}

function getProductId(item) {
    return (
        item?.product_id ||
        item?.product?.id ||
        null
    );
}

function getProductName(item) {
    return (
        item?.product?.name ||
        item?.product_name ||
        "Product"
    );
}

function getProductImage(item) {
    return (
        item?.product?.image ||
        item?.image ||
        null
    );
}

function Reviews() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const orderId = searchParams.get("order");

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedProductId, setSelectedProductId] =
        useState(null);

    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] =
        useState("");
    const [submitError, setSubmitError] = useState("");

    const items = useMemo(() => {
        return Array.isArray(order?.items)
            ? order.items
            : [];
    }, [order]);

    const loadOrder = useCallback(async () => {
        if (!orderId) {
            setError(
                "Select a completed order first."
            );
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/orders/${orderId}`
            );

            const loadedOrder =
                response.data?.data || null;

            if (!loadedOrder) {
                throw new Error(
                    "Order could not be loaded."
                );
            }

            const normalizedStatus = String(
                loadedOrder.status || ""
            ).toLowerCase();

            if (normalizedStatus !== "completed") {
                setError(
                    "Reviews are available only for completed orders."
                );
                setOrder(loadedOrder);
                return;
            }

            setOrder(loadedOrder);

            const firstProduct =
                loadedOrder.items?.[0];

            if (firstProduct) {
                setSelectedProductId(
                    getProductId(firstProduct)
                );
            }
        } catch (requestError) {
            console.error(
                "Failed to load review order:",
                requestError
            );

            if (
                requestError.response?.status ===
                401
            ) {
                navigate("/login", {
                    state: {
                        from: `/reviews?order=${orderId}`,
                    },
                });

                return;
            }

            setError(
                requestError.response?.data
                    ?.message ||
                    "We couldn't load this order."
            );
        } finally {
            setLoading(false);
        }
    }, [navigate, orderId]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadOrder();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [loadOrder]);

    const selectedItem = items.find(
        (item) =>
            String(getProductId(item)) ===
            String(selectedProductId)
    );

    const selectProduct = (item) => {
        setSelectedProductId(
            getProductId(item)
        );
        setRating(0);
        setHoverRating(0);
        setComment("");
        setSubmitError("");
        setSuccessMessage("");
    };

    const submitReview = async () => {
        if (!selectedProductId) {
            setSubmitError(
                "Please select a product first."
            );
            return;
        }

        if (!rating) {
            setSubmitError(
                "Please choose a star rating."
            );
            return;
        }

        setSubmitting(true);
        setSubmitError("");
        setSuccessMessage("");

        try {
            await api.post(
                `/products/${selectedProductId}/reviews`,
                {
                    order_id: Number(orderId),
                    rating,
                    comment:
                        comment.trim() || null,
                }
            );

            setSuccessMessage(
                "Your review has been submitted successfully."
            );

            setComment("");
            setRating(0);
            setHoverRating(0);

            window.setTimeout(() => {
                setSuccessMessage("");
            }, 3500);
        } catch (requestError) {
            console.error(
                "Failed to submit review:",
                requestError
            );

            setSubmitError(
                requestError.response?.data
                    ?.message ||
                    "We couldn't submit your review. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="reviews-page">
                <div className="reviews-state">
                    <LoaderCircle
                        size={22}
                        className="reviews-spinner"
                    />

                    <p>
                        Loading your review page...
                    </p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="reviews-page">
                <div className="reviews-container">
                    <Link
                        to={
                            orderId
                                ? `/orders/${orderId}`
                                : "/orders"
                        }
                        className="reviews-back-link"
                    >
                        <ArrowLeft size={15} />
                        Back to Orders
                    </Link>

                    <div className="reviews-state reviews-state-error">
                        <h1>
                            Unable to review
                        </h1>

                        <p>{error}</p>

                        <Link
                            to="/orders"
                            className="reviews-primary-button"
                        >
                            View My Orders
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (!order || items.length === 0) {
        return (
            <main className="reviews-page">
                <div className="reviews-container">
                    <Link
                        to="/orders"
                        className="reviews-back-link"
                    >
                        <ArrowLeft size={15} />
                        Back to Orders
                    </Link>

                    <div className="reviews-state">
                        <h1>
                            No products to review
                        </h1>

                        <p>
                            This order does not contain
                            any products that can be
                            reviewed.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="reviews-page">
            <div className="reviews-container">
                <Link
                    to={`/orders/${orderId}`}
                    className="reviews-back-link"
                >
                    <ArrowLeft size={15} />
                    Back to Order
                </Link>

                <header className="reviews-header">
                    <div>
                        <span className="reviews-eyebrow">
                            YOUR FEEDBACK
                        </span>

                        <h1>
                            Rate your purchase
                        </h1>

                        <p>
                            Tell us what you think about
                            the products in Order #
                            {orderId}.
                        </p>
                    </div>

                    <div className="reviews-completed-badge">
                        <Check size={14} />
                        Completed order
                    </div>
                </header>

                <div className="reviews-layout">
                    <section className="reviews-products-panel">
                        <div className="reviews-panel-heading">
                            <div>
                                <span>
                                    ORDER ITEMS
                                </span>

                                <h2>
                                    Choose a product
                                </h2>
                            </div>

                            <small>
                                {items.length}{" "}
                                {items.length === 1
                                    ? "item"
                                    : "items"}
                            </small>
                        </div>

                        <div className="reviews-product-list">
                            {items.map((item) => {
                                const productId =
                                    getProductId(item);

                                const active =
                                    String(
                                        selectedProductId
                                    ) ===
                                    String(productId);

                                return (
                                    <button
                                        type="button"
                                        key={
                                            item.id ||
                                            productId
                                        }
                                        className={`reviews-product ${
                                            active
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            selectProduct(
                                                item
                                            )
                                        }
                                    >
                                        <div className="reviews-product-image">
                                            {getProductImage(
                                                item
                                            ) ? (
                                                <img
                                                    src={getProductImage(
                                                        item
                                                    )}
                                                    alt=""
                                                />
                                            ) : (
                                                <span>
                                                    {getProductName(
                                                        item
                                                    )
                                                        .charAt(
                                                            0
                                                        )
                                                        .toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="reviews-product-info">
                                            <strong>
                                                {getProductName(
                                                    item
                                                )}
                                            </strong>

                                            <span>
                                                Qty{" "}
                                                {Number(
                                                    item.quantity ||
                                                        0
                                                )}
                                            </span>

                                            <small>
                                                {formatCurrency(
                                                    item.subtotal ??
                                                        Number(
                                                            item.unit_price ||
                                                                0
                                                        ) *
                                                            Number(
                                                                item.quantity ||
                                                                    0
                                                            )
                                                )}
                                            </small>
                                        </div>

                                        {active && (
                                            <Check
                                                size={17}
                                                className="reviews-product-check"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="reviews-form-panel">
                        <div className="reviews-panel-heading">
                            <div>
                                <span>
                                    YOUR REVIEW
                                </span>

                                <h2>
                                    {selectedItem
                                        ? getProductName(
                                              selectedItem
                                          )
                                        : "Select a product"}
                                </h2>
                            </div>
                        </div>

                        <div className="reviews-rating-section">
                            <span>
                                Your rating
                            </span>

                            <div className="reviews-stars">
                                {[1, 2, 3, 4, 5].map(
                                    (star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            aria-label={`${star} star`}
                                            onMouseEnter={() =>
                                                setHoverRating(
                                                    star
                                                )
                                            }
                                            onMouseLeave={() =>
                                                setHoverRating(
                                                    0
                                                )
                                            }
                                            onClick={() =>
                                                setRating(
                                                    star
                                                )
                                            }
                                        >
                                            <Star
                                                size={28}
                                                fill={
                                                    star <=
                                                    (hoverRating ||
                                                        rating)
                                                        ? "currentColor"
                                                        : "none"
                                                }
                                            />
                                        </button>
                                    )
                                )}
                            </div>

                            <small>
                                {rating === 0
                                    ? "Tap a star to rate"
                                    : `${rating} out of 5 stars`}
                            </small>
                        </div>

                        <label
                            className="reviews-comment-label"
                            htmlFor="review-comment"
                        >
                            Comment
                        </label>

                        <textarea
                            id="review-comment"
                            value={comment}
                            onChange={(event) =>
                                setComment(
                                    event.target.value
                                )
                            }
                            maxLength={1000}
                            placeholder="Share your experience with this product..."
                            rows={7}
                        />

                        <div className="reviews-form-footer">
                            <span>
                                {comment.length}/1000
                            </span>

                            <button
                                type="button"
                                className="reviews-submit-button"
                                onClick={
                                    submitReview
                                }
                                disabled={
                                    submitting ||
                                    !selectedProductId ||
                                    !rating
                                }
                            >
                                {submitting ? (
                                    <>
                                        <LoaderCircle
                                            size={15}
                                            className="reviews-spinner"
                                        />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Review"
                                )}
                            </button>
                        </div>

                        {submitError && (
                            <div className="reviews-message error">
                                {submitError}
                            </div>
                        )}

                        {successMessage && (
                            <div className="reviews-message success">
                                <Check size={15} />
                                {successMessage}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}

export default Reviews;