import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import api from "../../shared/services/api";

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState("Description");
    const [actionMessage, setActionMessage] = useState("");

    const isLoggedIn = Boolean(localStorage.getItem("token"));

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login", {
                replace: true,
                state: { from: `/products/${id}` },
            });
            return;
        }

        let cancelled = false;

        const loadProduct = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/products/${id}`);

                if (!cancelled) {
                    setProduct(response.data?.data || null);
                }
            } catch (requestError) {
                console.error("Failed to load product:", requestError);

                if (!cancelled) {
                    setError(
                        requestError.response?.data?.message ||
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
    }, [id, isLoggedIn, navigate]);

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
                localStorage.getItem("cryma_cart") || "[]"
            );

            const item = cart.find(
                (cartItem) => cartItem.id === product?.id
            );

            return Number(item?.quantity || 0);
        } catch {
            return 0;
        }
    }, [product?.id]);

    const addToCart = (redirectToCheckout = false) => {
        if (!product || stock <= 0) {
            return;
        }

        const cart = JSON.parse(
            localStorage.getItem("cryma_cart") || "[]"
        );

        const existing = cart.find(
            (item) => item.id === product.id
        );

        const currentQuantity = Number(existing?.quantity || 0);
        const nextQuantity = currentQuantity + quantity;

        if (nextQuantity > stock) {
            setActionMessage(
                `Only ${stock} item${
                    stock === 1 ? "" : "s"
                } available.`
            );

            window.setTimeout(() => {
                setActionMessage("");
            }, 2500);

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
            "cryma_cart",
            JSON.stringify(cart)
        );

        if (redirectToCheckout) {
            navigate("/checkout");
            return;
        }

        setActionMessage("Added to cart.");

        window.setTimeout(() => {
            setActionMessage("");
        }, 2500);
    };

    const handleBuyNow = () => {
        addToCart(true);
    };

    const handleSave = () => {
        setSaved((current) => !current);
    };

    if (!isLoggedIn) {
        return null;
    }

    if (loading) {
        return (
            <main className="product-page">
                <div className="product-loading">
                    <div className="product-loading-image" />
                    <div className="product-loading-content">
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
            <main className="product-page">
                <div className="product-error">
                    <span className="product-error-icon">!</span>

                    <h1>Product unavailable</h1>

                    <p>
                        {error ||
                            "We couldn't find this product."}
                    </p>

                    <Link to="/shop" className="product-error-button">
                        Back to shop
                    </Link>
                </div>
            </main>
        );
    }

    const image = product.image || null;

    return (
        <main className="product-page">
            <div className="product-breadcrumb">
                <Link to="/">Home</Link>
                <span>/</span>

                <Link to="/shop">
                    {product.category || "Products"}
                </Link>

                <span>/</span>

                <strong>{product.name}</strong>
            </div>

            <section className="product-detail-layout">
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
                                <span>CRYMA</span>
                            )}
                        </button>
                    </div>

                    <div className="product-main-image">
                        {image ? (
                            <img
                                src={image}
                                alt={product.name}
                            />
                        ) : (
                            <div className="product-detail-placeholder">
                                <strong>CRYMA</strong>
                                <span>
                                    Product image unavailable
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

                            <h1>{product.name}</h1>
                        </div>

                        <button
                            type="button"
                            className={`product-save-button ${
                                saved ? "saved" : ""
                            }`}
                            onClick={handleSave}
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
                            ₱{price.toLocaleString()}
                        </strong>
                    </div>

                    <div className="product-stock-row">
                        <span>Availability</span>

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
                        <label htmlFor="product-quantity">
                            Quantity
                        </label>

                        <div>
                            <button
                                type="button"
                                onClick={() =>
                                    setQuantity((value) =>
                                        Math.max(
                                            1,
                                            value - 1
                                        )
                                    )
                                }
                                disabled={quantity <= 1}
                                aria-label="Decrease quantity"
                            >
                                <Minus size={14} />
                            </button>

                            <strong>
                                {quantity}
                            </strong>

                            <button
                                type="button"
                                onClick={() =>
                                    setQuantity((value) =>
                                        Math.min(
                                            stock,
                                            value + 1
                                        )
                                    )
                                }
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
                            <span>
                                {cartQuantity} already in cart
                            </span>
                        )}
                    </div>

                    <div className="product-actions">
                        <button
                            type="button"
                            className="product-add-button"
                            onClick={() => addToCart(false)}
                            disabled={stock <= 0}
                        >
                            <ShoppingCart size={15} />
                            Add to Cart
                        </button>

                        <button
                            type="button"
                            className="product-buy-button"
                            onClick={handleBuyNow}
                            disabled={stock <= 0}
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
                            <span>Sold by</span>
                            <strong>{sellerName}</strong>
                        </div>
                    </div>
                </div>
            </section>

            <section className="product-detail-tabs">
                <nav>
                    {[
                        "Description",
                        "Specifications",
                    ].map((tab) => (
                        <button
                            type="button"
                            key={tab}
                            className={
                                activeTab === tab
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setActiveTab(tab)
                            }
                        >
                            {tab}
                        </button>
                    ))}
                </nav>

                <div>
                    {activeTab === "Description" ? (
                        <p>
                            {product.description ||
                                "No product description has been provided."}
                        </p>
                    ) : (
                        <div className="product-specifications">
                            <div>
                                <span>Category</span>
                                <strong>
                                    {product.category ||
                                        "Not specified"}
                                </strong>
                            </div>

                            <div>
                                <span>Stock</span>
                                <strong>
                                    {stock > 0
                                        ? `${stock} available`
                                        : "Out of stock"}
                                </strong>
                            </div>

                            <div>
                                <span>Seller</span>
                                <strong>
                                    {sellerName}
                                </strong>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

export default ProductDetails;