import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Heart,
    MessageCircle,
    Minus,
    Plus,
    Play,
    ShoppingCart,
    Star,
} from "lucide-react";
import {
    Link,
    useNavigate,
    useParams,
} from "react-router-dom";

import api from "../../../shared/services/api";
import {
    getBuyerWishlist,
    getBuyerCart,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerCart,
    saveBuyerWishlist,
    showBuyerToast,
} from "../../../shared/utils/buyerAccess";
import { addProductToCart } from "../../../shared/utils/buyerProductActions";

import "./ProductDetails.css";

const CHECKOUT_ITEMS_KEY = "cryma_checkout_item_ids";

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [saved, setSaved] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [activeTab, setActiveTab] = useState("Description");
    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState({
        averageRating: 0,
        reviewCount: 0,
    });
    const [reviewsLoading, setReviewsLoading] =
        useState(false);
    const [actionMessage, setActionMessage] = useState("");
    const [actionMessageType, setActionMessageType] = useState("success");

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
                    setActiveMediaIndex(0);
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
        const syncSaved = () => {
            setSaved(getBuyerWishlist().some((savedId) => String(savedId) === String(id)));
        };
        syncSaved();
        window.addEventListener("cryma-wishlist-updated", syncSaved);
        window.addEventListener("storage", syncSaved);
        return () => {
            window.removeEventListener("cryma-wishlist-updated", syncSaved);
            window.removeEventListener("storage", syncSaved);
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
        const item = getBuyerCart().find(
            (cartItem) => String(cartItem.id) === String(product?.id)
        );
        return Number(item?.quantity || 0);
    }, [product?.id]);

    const showMessage = (message, type = "success") => {
        setActionMessage(message);
        setActionMessageType(type);

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

        const requestedQuantity = Number(quantity);
        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
            showMessage("Enter a whole quantity of at least 1.", "error");
            return;
        }

        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to add to cart",
                message: "Create an account or sign in to shop on CRYMA.",
            });
            return;
        }

        const result = addProductToCart(getBuyerCart(), product, requestedQuantity);
        if (!result.success) {
            showMessage(
                result.reason === "insufficient_stock"
                    ? `Only ${result.stock} item${result.stock === 1 ? "" : "s"} available.`
                    : "Unable to add this product to your cart.",
                "error"
            );
            return;
        }

        if (!saveBuyerCart(result.cart)) {
            showMessage("Unable to save your cart. Please try again.", "error");
            return;
        }

        if (redirectToCheckout) {
            localStorage.setItem(
                CHECKOUT_ITEMS_KEY,
                JSON.stringify([product.id])
            );

            navigate("/checkout");
            return;
        }

        showBuyerToast("Added to cart");
    };

    const handleBuyNow = () => {
        addToCart({
            redirectToCheckout: true,
        });
    };

    const contactSeller = async () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to contact the seller",
                message: "Create an account or sign in to ask the seller about this product.",
                from: window.location.pathname,
            });
            return;
        }

        try {
            const { data } = await api.post("/buyer/chat/seller-conversations", { product_id: Number(id) });
            const conversationId = data?.data?.id;
            if (!conversationId) {
                throw new Error("Could not open a conversation with this seller.");
            }
            navigate(`/buyer/chat?conversation=${conversationId}`);
        } catch (requestError) {
            showBuyerToast(
                requestError.response?.data?.message || requestError.message || "Unable to contact this seller right now.",
                "error"
            );
        }
    };

    const handleSave = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to save favorites",
                message: "Create an account or sign in to save products to your wishlist.",
            });
            return;
        }

        const wishlist = getBuyerWishlist();
        const productId = Number(product?.id);
        const exists = wishlist.some((savedId) => String(savedId) === String(productId));
        const next = exists
            ? wishlist.filter((savedId) => String(savedId) !== String(productId))
            : [...wishlist, productId];
        if (saveBuyerWishlist(next)) {
            setSaved(!exists);
            showBuyerToast(exists ? "Removed from favorites" : "Added to favorites");
        } else {
            showBuyerToast("Unable to update favorites. Please try again.", "error");
        }
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

    const mediaItems = Array.isArray(product.media) && product.media.length
        ? product.media.filter((media) => media?.url && ["image", "video"].includes(media.type))
        : [
            ...(Array.isArray(product.images)
                ? product.images.map((image) => typeof image === "string" ? image : image?.url || image?.image_url)
                : []),
            product.image,
        ]
            .filter((url, index, urls) => typeof url === "string" && url.trim() && urls.indexOf(url) === index)
            .map((url) => ({ type: "image", url }));
    const activeMedia = mediaItems[activeMediaIndex] || mediaItems[0] || null;
    const image = activeMedia?.type === "image" ? activeMedia.url : product.image || null;

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
                            {mediaItems.map((media, index) => (
                                <button
                                    type="button"
                                    key={`${media.type}-${media.id || media.url}`}
                                    className={`product-thumbnail${index === activeMediaIndex ? " active" : ""}`}
                                    aria-label={`${media.type === "video" ? "Play product video" : "View product photo"} ${index + 1}`}
                                    aria-pressed={index === activeMediaIndex}
                                    onClick={() => setActiveMediaIndex(index)}
                                >
                                    {media.type === "video" ? <span className="product-video-thumb"><Play size={17} aria-hidden="true" /></span> : <img src={media.url} alt="" />}
                                </button>
                            ))}
                            {!mediaItems.length && (
                                <div className="product-thumbnail product-thumbnail-placeholder" aria-hidden="true">CRYMA</div>
                            )}
                        </div>

                        <div className="product-main-image">
                            {activeMedia?.type === "video" ? (
                                <video src={activeMedia.url} controls playsInline preload="metadata" aria-label={`${product.name} product video`} />
                            ) : image ? (
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
                                aria-pressed={saved}
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
                            {Number(product.original_price) > price && (
                                <span className="product-detail-sale-price">
                                    <del>₱{Number(product.original_price).toLocaleString()}</del>
                                    <b>{Math.round((1 - price / Number(product.original_price)) * 100)}% off</b>
                                </span>
                            )}
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
                                    step="1"
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
                            <div className={`product-action-message ${actionMessageType}`} role="status" aria-live="polite">
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
                            <button type="button" className="product-contact-seller" onClick={contactSeller}>
                                <MessageCircle size={14} /> Contact seller
                            </button>
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

                                    <button
                                        type="button"
                                        className="product-review-link"
                                        onClick={() => {
                                            if (isBuyerSession()) navigate("/reviews");
                                            else requestBuyerSignIn({
                                                title: "Sign in to leave a review",
                                                message: "Create an account or sign in to share your product experience.",
                                            });
                                        }}
                                    >
                                        Leave a Review
                                    </button>
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
