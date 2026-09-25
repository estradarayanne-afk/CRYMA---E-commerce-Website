import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    ShieldCheck,
    Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard.jsx/ProductCard";
import { PRODUCT_CATEGORIES } from "../../../shared/constants/categories";

import "./Home.css";

function Home() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cartModalOpen, setCartModalOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "null");

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get("/products?per_page=50");
                const payload = response?.data;

                let items = [];

                if (Array.isArray(payload)) {
                    items = payload;
                } else if (Array.isArray(payload?.data?.data)) {
                    items = payload.data.data;
                } else if (Array.isArray(payload?.data)) {
                    items = payload.data;
                } else if (Array.isArray(payload?.products)) {
                    items = payload.products;
                }

                setProducts(items);
            } catch (err) {
                console.error("Failed to load products:", err);
                setError("We couldn't load the products right now.");
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    const featuredProducts = useMemo(() => {
        return products.slice(0, 4);
    }, [products]);

    const categoryHighlights = useMemo(() => {
        const productCategories = products
            .map((product) => product?.category?.name || product?.category)
            .filter(Boolean);

        const uniqueCategories = [...new Set(productCategories)];

        if (uniqueCategories.length > 0) {
            return uniqueCategories.slice(0, 6);
        }

        return PRODUCT_CATEGORIES.slice(0, 6);
    }, [products]);

    const handleStartShopping = () => {
        navigate("/shop");
    };

    const handleCategoryClick = (category) => {
        navigate(`/shop?category=${encodeURIComponent(category)}`);
    };

    const handleProductClick = (product) => {
        navigate(`/products/${product.id}`);
    };

    const handleAddToCart = (product) => {
        if (!user) {
            navigate("/login");
            return;
        }

        const existingCart = JSON.parse(
            localStorage.getItem("cryma_cart") || "[]"
        );

        const existingIndex = existingCart.findIndex(
            (item) => String(item.id) === String(product.id)
        );

        if (existingIndex >= 0) {
            existingCart[existingIndex].quantity =
                Number(existingCart[existingIndex].quantity || 1) + 1;
        } else {
            existingCart.push({
                ...product,
                quantity: 1,
            });
        }

        localStorage.setItem("cryma_cart", JSON.stringify(existingCart));

        window.dispatchEvent(new Event("cryma-cart-updated"));

        setSelectedProduct(product);
        setCartModalOpen(true);
    };

    return (
        <div className="buyer-home">
            {/* =====================================================
                HERO
            ====================================================== */}
            <section className="buyer-landing-hero">
                <div className="buyer-landing-hero-content">
                    <span className="buyer-landing-eyebrow">
                        DISCOVER CRYMA
                    </span>

                    <h1>
                        Shop smart.
                        <br />
                        Discover more.
                    </h1>

                    <p>
                        Explore products from different categories in one
                        simple shopping experience designed around you.
                    </p>

                    <div className="buyer-landing-actions">
                        <button
                            type="button"
                            className="buyer-primary-button"
                            onClick={handleStartShopping}
                        >
                            Start Shopping
                            <ArrowRight size={16} />
                        </button>

                        <button
                            type="button"
                            className="buyer-secondary-button"
                            onClick={() => navigate("/shop")}
                        >
                            Explore Categories
                        </button>
                    </div>
                </div>

                <div className="buyer-landing-hero-visual">
                    {featuredProducts.length > 0 ? (
                        <>
                            {featuredProducts.slice(0, 3).map((product, index) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className={`buyer-hero-product buyer-hero-product-${index + 1}`}
                                    onClick={() => handleProductClick(product)}
                                >
                                    {product?.image ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                        />
                                    ) : (
                                        <span>
                                            {product?.name?.charAt(0) || "C"}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </>
                    ) : (
                        <div className="buyer-hero-placeholder">
                            CRYMA
                        </div>
                    )}
                </div>
            </section>

            {/* =====================================================
                FEATURED PRODUCTS
            ====================================================== */}
            <section className="buyer-landing-section">
                <div className="buyer-landing-section-heading">
                    <div>
                        <span className="buyer-landing-eyebrow">
                            FEATURED
                        </span>

                        <h2>Picked for you</h2>

                        <p>
                            A few products to help you start exploring CRYMA.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="buyer-landing-loading">
                        <div className="buyer-landing-spinner" />
                        <p>Loading products...</p>
                    </div>
                ) : error ? (
                    <div className="buyer-landing-state">
                        <strong>Unable to load products</strong>
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                        >
                            Try Again
                        </button>
                    </div>
                ) : featuredProducts.length === 0 ? (
                    <div className="buyer-landing-state">
                        <strong>No products yet</strong>
                        <p>
                            Products will appear here once they are available.
                        </p>
                    </div>
                ) : (
                    <div className="buyer-landing-product-grid">
                        {featuredProducts.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onOpen={handleProductClick}
                            onAddToCart={handleAddToCart}
                        />
                        ))}
                    </div>
                )}
            </section>

            {/* =====================================================
                CATEGORY DISCOVERY
            ====================================================== */}
            <section className="buyer-landing-section buyer-landing-category-section">
                <div className="buyer-landing-section-heading">
                    <div>
                        <span className="buyer-landing-eyebrow">
                            EXPLORE
                        </span>

                        <h2>Shop by category</h2>

                        <p>
                            Start with a category and find something that
                            matches what you're looking for.
                        </p>
                    </div>
                </div>

                <div className="buyer-landing-category-grid">
                    {categoryHighlights.map((category) => (
                        <button
                            key={category}
                            type="button"
                            className="buyer-landing-category-card"
                            onClick={() => handleCategoryClick(category)}
                        >
                            <span>{category}</span>
                            <ArrowRight size={16} />
                        </button>
                    ))}
                </div>
            </section>

            {/* =====================================================
                WHY CRYMA
            ====================================================== */}
            <section className="buyer-landing-value-section">
                <div className="buyer-landing-section-heading">
                    <div>
                        <span className="buyer-landing-eyebrow">
                            WHY CRYMA
                        </span>

                        <h2>A simpler way to shop online.</h2>
                    </div>
                </div>

                <div className="buyer-value-grid">
                    <div className="buyer-value-card">
                        <div className="buyer-value-icon">
                            <CheckCircle2 size={20} />
                        </div>

                        <h3>Simple shopping</h3>

                        <p>
                            Find products, add them to your cart, and check out
                            without unnecessary steps.
                        </p>
                    </div>

                    <div className="buyer-value-card">
                        <div className="buyer-value-icon">
                            <ShieldCheck size={20} />
                        </div>

                        <h3>Trusted experience</h3>

                        <p>
                            Designed to make browsing, ordering, and managing
                            your purchases feel clear and organized.
                        </p>
                    </div>

                    <div className="buyer-value-card">
                        <div className="buyer-value-icon">
                            <Truck size={20} />
                        </div>

                        <h3>Track your orders</h3>

                        <p>
                            Keep your purchases organized and follow your
                            order progress from one place.
                        </p>
                    </div>
                </div>
            </section>

            {/* =====================================================
                HOW IT WORKS
            ====================================================== */}
            <section className="buyer-how-section">
                <div className="buyer-landing-section-heading">
                    <div>
                        <span className="buyer-landing-eyebrow">
                            HOW IT WORKS
                        </span>

                        <h2>From discovery to delivery.</h2>
                    </div>
                </div>

                <div className="buyer-how-grid">
                    <div className="buyer-how-step">
                        <span>01</span>
                        <h3>Discover</h3>
                        <p>Browse categories and explore products.</p>
                    </div>

                    <div className="buyer-how-step">
                        <span>02</span>
                        <h3>Shop</h3>
                        <p>Choose the products you want to purchase.</p>
                    </div>

                    <div className="buyer-how-step">
                        <span>03</span>
                        <h3>Checkout</h3>
                        <p>Review your cart and complete your order.</p>
                    </div>

                    <div className="buyer-how-step">
                        <span>04</span>
                        <h3>Track</h3>
                        <p>Follow your order until it reaches you.</p>
                    </div>
                </div>
            </section>

            {/* =====================================================
                FINAL CTA
            ====================================================== */}
            <section className="buyer-landing-cta">
                <div>
                    <span className="buyer-landing-eyebrow">
                        READY TO EXPLORE?
                    </span>

                    <h2>Find your next favorite.</h2>

                    <p>
                        Start browsing CRYMA and discover products made for
                        your everyday needs.
                    </p>
                </div>

                <button
                    type="button"
                    className="buyer-primary-button"
                    onClick={handleStartShopping}
                >
                    Start Shopping
                    <ArrowRight size={16} />
                </button>
            </section>

            {/* =====================================================
                ADD TO CART CONFIRMATION
            ====================================================== */}
            {cartModalOpen && selectedProduct && (
                <div
                    className="buyer-cart-confirmation-overlay"
                    onClick={() => setCartModalOpen(false)}
                >
                    <div
                        className="buyer-cart-confirmation"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="buyer-success-icon">
                            <CheckCircle2 size={22} />
                        </div>

                        <h3>Added to cart</h3>

                        <p>
                            <strong>{selectedProduct.name}</strong> has been
                            added to your cart.
                        </p>

                        <div className="buyer-cart-confirmation-actions">
                            <button
                                type="button"
                                className="buyer-modal-secondary"
                                onClick={() => setCartModalOpen(false)}
                            >
                                Continue Shopping
                            </button>

                            <button
                                type="button"
                                className="buyer-modal-primary"
                                onClick={() => navigate("/cart")}
                            >
                                View Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;