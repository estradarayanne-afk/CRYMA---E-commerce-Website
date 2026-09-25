import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Heart,
    Minus,
    Plus,
    ShoppingCart,
    Star,
} from "lucide-react";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import api from "../../../shared/services/api";

import "./ProductDetails.css";

const CART_KEY = "cryma_cart";
const CHECKOUT_ITEMS_KEY = "cryma_checkout_item_ids";

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState("Description");
    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState({
        averageRating: 0,
        reviewCount: 0,
    });
    const [reviewsLoading, setReviewsLoading] =
        useState(false);
    const [actionMessage, setActionMessage] = useState("");

    const isLoggedIn = Boolean(
        localStorage.getItem("token")
    );

    useEffect(() => {
        let cancelled = false;

        const loadProduct = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(
                    `/products/${id}`
                );

                if (!cancelled) {
                    setProduct(
                        response.data?.data || null
                    );
                }
            } catch (requestError) {
                console.error(
                    "Failed to load product:",
                    requestError
                );

                if (!cancelled) {
                    setError(
                        requestError.response?.data
                            ?.message ||
                            "This product is no longer available."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProduct();

        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        let cancelled = false;

        const loadReviews = async () => {
            if (!id) {
                return;
            }

            setReviewsLoading(true);

            try {
                const response = await api.get(
                    `/products/${id}/reviews`
                );

                const data =
                    response.data?.data || {};

                if (!cancelled) {
                    setReviews(
                        Array.isArray(data.reviews)
                            ? data.reviews
                            : []
                    );

                    setReviewSummary({
                        averageRating: Number(
                            data.average_rating || 0
                        ),
                        reviewCount: Number(
                            data.review_count || 0
                        ),
                    });
                }
            } catch (requestError) {
                console.error(
                    "Failed to load product reviews:",
                    requestError
                );

                if (!cancelled) {
                    setReviews([]);
                    setReviewSummary({
                        averageRating: 0,
                        reviewCount: 0,
                    });
                }
            } finally {
                if (!cancelled) {
                    setReviewsLoading(false);
                }
            }
        };

        loadReviews();

        return () => {
            cancelled = true;
        };
    }, [id]);

    const sellerName = useMemo(() => {
        if (!product?.seller) {
            return "Marketplace seller";
        }

        if (typeof product.seller === "string") {
            return product.seller;
        }

        return (
            [
                product.seller.first_name,
                product.seller.middle_name,
                product.seller.last_name,
            ]
                .filter(Boolean)
                .join(" ") ||
            product.seller.name ||
            "Marketplace seller"
        );
    }, [product]);

    const price = Number(product?.price || 0);
    const stock = Number(product?.stock || 0);

    const cartQuantity = useMemo(() => {
        try {
            const cart = JSON.parse(
                localStorage.getItem(CART_KEY) || "[]"
            );

            const item = cart.find(
                (cartItem) =>
                    cartItem.id === product?.id
            );

            return Number(item?.quantity || 0);
        } catch {
            return 0;
        }
    }, [product?.id]);

    const showMessage = (message) => {
        setActionMessage(message);

        window.setTimeout(() => {
            setActionMessage("");
        }, 2500);
    };

    const addToCart = ({
        redirectToCheckout = false,
    } = {}) => {
        if (!product || stock <= 0) {
            return;
        }

        if (!isLoggedIn) {
            navigate("/login", {
                state: {
                    from: `/products/${id}`,
                },
            });

            return;
        }

        let cart = [];

        try {
            cart = JSON.parse(
                localStorage.getItem(CART_KEY) || "[]"
            );
        } catch {
            // Keep the empty cart initialized above when stored data is invalid.
        }

        const existing = cart.find(
            (item) => item.id === product.id
        );

        const currentQuantity = Number(
            existing?.quantity || 0
        );

        const nextQuantity =
            currentQuantity + quantity;

        if (nextQuantity > stock) {
            showMessage(
                `Only ${stock} item${
                    stock === 1 ? "" : "s"
                } available.`
            );

            return;
        }

        if (existing) {
            existing.quantity = nextQuantity;
        } else {
            cart.push({
                ...product,
                quantity,
            });
        }

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

        window.dispatchEvent(
            new Event("cryma-cart-updated")
        );

        if (redirectToCheckout) {
            localStorage.setItem(
                CHECKOUT_ITEMS_KEY,
                JSON.stringify([product.id])
            );

            navigate("/checkout");
            return;
        }

        showMessage("Added to cart.");
    };

    const handleBuyNow = () => {
        addToCart({
            redirectToCheckout: true,
        });
    };

    const handleSave = () => {
        setSaved((current) => !current);
    };

    const decreaseQuantity = () => {
        setQuantity((current) =>
            Math.max(
                1,
                (Number(current) || 1) - 1
            )
        );
    };

    const increaseQuantity = () => {
        setQuantity((current) =>
            Math.min(
                stock,
                Math.max(1, Number(current) || 1) + 1
            )
        );
    };

    if (loading) {
        return (
            <main className="product-details-page">
                <div className="product-details-loading">
                    <div className="product-details-loading-image" />

                    <div className="product-details-loading-content">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="product-details-page">
                <div className="product-details-error">
                    <span className="product-details-error-icon">
                        !
                    </span>

                    <h1>
                        Product unavailable
                    </h1>

                    <p>
                        {error ||
                            "We couldn't find this product."}
                    </p>

                    <Link
                        to="/shop"
                        className="product-details-error-button"
                    >
                        Back to Shop
                    </Link>
                </div>
            </main>
        );
    }

    const image = product.image || null;

    return (
        <main className="product-details-page">
            <div className="product-details-container">
                <Link
                    to="/shop"
                    className="product-back-link"
                >
                    <ArrowLeft size={15} />
                    Back to Shopping
                </Link>

                <div className="product-breadcrumb">
                    <Link to="/">
                        Home
                    </Link>

                    <span>/</span>

                    <Link to="/shop">
                        {product.category ||
                            "Products"}
                    </Link>

                    <span>/</span>

                    <strong>
                        {product.name}
                    </strong>
                </div>

                <section className="product-details-card">
                    <div className="product-gallery">
                        <div className="product-thumbnails">
                            <button
                                type="button"
                                className="product-thumbnail active"
                                aria-label="Product image"
                            >
                                {image ? (
                                    <img
                                        src={image}
                                        alt=""
                                    />
                                ) : (
                                    <span>
                                        CRYMA
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="product-main-image">
                            {image ? (
                                <img
                                    src={image}
                                    alt={
                                        product.name
                                    }
                                />
                            ) : (
                                <div className="product-detail-placeholder">
                                    <strong>
                                        CRYMA
                                    </strong>

                                    <span>
                                        Product image
                                        unavailable
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="product-detail-info">
                        <div className="product-detail-heading">
                            <div>
                                {product.category && (
                                    <span className="product-detail-category">
                                        {product.category}
                                    </span>
                                )}

                                <h1>
                                    {product.name}
                                </h1>
                            </div>

                            <button
                                type="button"
                                className={`product-save-button ${
                                    saved
                                        ? "saved"
                                        : ""
                                }`}
                                onClick={
                                    handleSave
                                }
                                aria-label={
                                    saved
                                        ? "Remove from wishlist"
                                        : "Save product"
                                }
                            >
                                <Heart
                                    size={18}
                                    fill={
                                        saved
                                            ? "currentColor"
                                            : "none"
                                    }
                                />
                            </button>
                        </div>

                        <div className="product-detail-price">
                            <strong>
                                ₱
                                {price.toLocaleString()}
                            </strong>
                        </div>

                        <div className="product-stock-row">
                            <span>
                                Availability
                            </span>

                            <strong
                                className={
                                    stock > 0
                                        ? "in-stock"
                                        : "out-of-stock"
                                }
                            >
                                {stock > 0
                                    ? `${stock} available`
                                    : "Out of stock"}
                            </strong>
                        </div>

                        <div className="product-divider" />

                        <div className="product-quantity">
                            <label>
                                Quantity
                            </label>

                            <div className="product-quantity-control">
                                <button
                                    type="button"
                                    onClick={decreaseQuantity}
                                    disabled={quantity <= 1}
                                    aria-label="Decrease quantity"
                                >
                                    <Minus size={14} />
                                </button>

                                <input
                                    type="number"
                                    min="1"
                                    max={stock}
                                    value={quantity}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);

                                        if (event.target.value === "") {
                                            setQuantity("");
                                            return;
                                        }

                                        if (!Number.isFinite(value)) {
                                            return;
                                        }

                                        setQuantity(
                                            Math.min(
                                                stock,
                                                Math.max(1, value)
                                            )
                                        );
                                    }}
                                    onBlur={() => {
                                        if (!quantity || quantity < 1) {
                                            setQuantity(1);
                                        }

                                        if (quantity > stock) {
                                            setQuantity(stock);
                                        }
                                    }}
                                    aria-label="Product quantity"
                            />

                                <button
                                    type="button"
                                    onClick={increaseQuantity}
                                    disabled={
                                        stock <= 0 ||
                                        quantity >= stock
                                    }
                                    aria-label="Increase quantity"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {cartQuantity > 0 && (
                                <span className="product-cart-note">
                                    {cartQuantity} already
                                    in cart
                                </span>
                            )}
                        </div>

                        <div className="product-actions">
                            <button
                                type="button"
                                className="product-add-button"
                                onClick={() =>
                                    addToCart()
                                }
                                disabled={
                                    stock <= 0
                                }
                            >
                                <ShoppingCart
                                    size={15}
                                />
                                Add to Cart
                            </button>

                            <button
                                type="button"
                                className="product-buy-button"
                                onClick={
                                    handleBuyNow
                                }
                                disabled={
                                    stock <= 0
                                }
                            >
                                Buy Now
                            </button>
                        </div>

                        {actionMessage && (
                            <div className="product-action-message">
                                {actionMessage}
                            </div>
                        )}

                        <div className="product-seller-card">
                            <div className="seller-avatar">
                                {sellerName
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </div>

                            <div>
                                <span>
                                    Sold by
                                </span>

                                <strong>
                                    {sellerName}
                                </strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="product-detail-tabs">
                    <nav>
                        {[
                            "Description",
                            "Specifications",
                            "Reviews",
                        ].map((tab) => (
                            <button
                                type="button"
                                key={tab}
                                className={
                                    activeTab ===
                                    tab
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setActiveTab(
                                        tab
                                    )
                                }
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>

                    <div className="product-tab-content">
                        {activeTab === "Description" && (
                            <p>
                                {product.description ||
                                    "No product description has been provided."}
                            </p>
                        )}

                        {activeTab === "Specifications" && (
                            <div className="product-specifications">
                                <div>
                                    <span>
                                        Category
                                    </span>

                                    <strong>
                                        {product.category ||
                                            "Not specified"}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Stock
                                    </span>

                                    <strong>
                                        {stock > 0
                                            ? `${stock} available`
                                            : "Out of stock"}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Seller
                                    </span>

                                    <strong>
                                        {sellerName}
                                    </strong>
                                </div>
                            </div>
                        )}

                        {activeTab === "Reviews" && (
                            <div className="product-reviews">
                                <div className="product-reviews-summary">
                                    <div className="product-review-average">
                                        <strong>
                                            {reviewSummary.averageRating
                                                ? reviewSummary.averageRating.toFixed(
                                                    1
                                                )
                                                : "0.0"}
                                        </strong>

                                        <div>
                                            <div className="product-review-stars">
                                                {[1, 2, 3, 4, 5].map(
                                                    (star) => (
                                                        <Star
                                                            key={star}
                                                            size={14}
                                                            fill={
                                                                star <=
                                                                Math.round(
                                                                    reviewSummary.averageRating
                                                                )
                                                                    ? "currentColor"
                                                                    : "none"
                                                            }
                                                        />
                                                    )
                                                )}
                                            </div>

                                            <span>
                                                {reviewSummary.reviewCount}{" "}
                                                {reviewSummary.reviewCount ===
                                                1
                                                    ? "review"
                                                    : "reviews"}
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        to={
                                            isLoggedIn
                                                ? `/reviews`
                                                : "/login"
                                        }
                                        className="product-review-link"
                                    >
                                        Leave a Review
                                    </Link>
                                </div>

                                {reviewsLoading ? (
                                    <div className="product-reviews-empty">
                                        Loading reviews...
                                    </div>
                                ) : reviews.length === 0 ? (
                                    <div className="product-reviews-empty">
                                        <strong>
                                            No reviews yet
                                        </strong>

                                        <span>
                                            Be the first buyer to share
                                            your experience.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="product-review-list">
                                        {reviews.map((review) => {
                                            const firstName =
                                                review.buyer
                                                    ?.first_name || "";

                                            const lastName =
                                                review.buyer
                                                    ?.last_name || "";

                                            const buyerName =
                                                `${firstName} ${lastName}`
                                                    .trim() ||
                                                "Buyer";

                                            return (
                                                <article
                                                    className="product-review-item"
                                                    key={review.id}
                                                >
                                                    <div className="product-review-top">
                                                        <strong>
                                                            {buyerName}
                                                        </strong>

                                                        <span>
                                                            {review.created_at
                                                                ? new Date(
                                                                    review.created_at
                                                                ).toLocaleDateString(
                                                                    "en-PH"
                                                                )
                                                                : ""}
                                                        </span>
                                                    </div>

                                                    <div className="product-review-stars">
                                                        {[1, 2, 3, 4, 5].map(
                                                            (star) => (
                                                                <Star
                                                                    key={
                                                                        star
                                                                    }
                                                                    size={12}
                                                                    fill={
                                                                        star <=
                                                                        Number(
                                                                            review.rating
                                                                        )
                                                                            ? "currentColor"
                                                                            : "none"
                                                                    }
                                                                />
                                                            )
                                                        )}
                                                    </div>

                                                    {review.comment && (
                                                        <p>
                                                            {
                                                                review.comment
                                                            }
                                                        </p>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

export default ProductDetails;