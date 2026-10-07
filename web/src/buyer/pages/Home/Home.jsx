import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    MessageCircle,
    PackageOpen,
    ShieldCheck,
    Truck,
    Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard/ProductCard";
import { PRODUCT_CATEGORIES } from "../../../shared/constants/categories";
import {
    HERO_DISCOVERY_CATEGORIES,
    LANDING_VISUALS,
    getLandingCategoryVisual,
} from "../../../shared/constants/landingVisuals";
import {
    getBuyerCart,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerCart,
} from "../../../shared/utils/buyerAccess";

import "./Home.css";

function getProductImage(product) {
    if (!product) {
        return "";
    }

    if (typeof product.image === "string" && product.image.trim()) {
        return product.image;
    }

    if (
        typeof product.image_url === "string" &&
        product.image_url.trim()
    ) {
        return product.image_url;
    }

    if (
        typeof product.thumbnail === "string" &&
        product.thumbnail.trim()
    ) {
        return product.thumbnail;
    }

    if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];

        if (typeof firstImage === "string") {
            return firstImage;
        }

        if (firstImage?.url) {
            return firstImage.url;
        }

        if (firstImage?.image_url) {
            return firstImage.image_url;
        }
    }

    return "";
}

function normalizeProduct(product) {
    return {
        ...product,
        displayImage: getProductImage(product),
    };
}

function Home() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cartModalOpen, setCartModalOpen] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadProducts = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get("/products?per_page=50");

                if (!mounted) return;

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

                setProducts(
                    items.map(normalizeProduct)
                );
            } catch (err) {
                console.error("Failed to load products:", err);

                if (mounted) {
                    setError(
                        "We couldn't load the products right now."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            mounted = false;
        };
    }, []);

    const featuredProducts = useMemo(() => {
        return products.slice(0, 4);
    }, [products]);

    const categoryHighlights = useMemo(() => {
        const productCategories = products
            .map(
                (product) =>
                    product?.category?.name ||
                    product?.category ||
                    product?.category_name
            )
            .filter(Boolean);

        const known = new Set(PRODUCT_CATEGORIES.map((name) => name.toLowerCase()));
        const additionalCategories = [...new Set(productCategories)]
            .filter((name) => !known.has(String(name).toLowerCase()));

        return [...PRODUCT_CATEGORIES, ...additionalCategories];
    }, [products]);

    const handleStartShopping = () => {
        navigate("/shop");
    };

    const handleCategoryClick = (category) => {
        navigate(
            `/shop?category=${encodeURIComponent(category)}`
        );
    };

    const handleProductClick = (product) => {
        navigate(`/products/${product.id}`);
    };

    const handleAddToCart = (product) => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to add to cart",
                message: "Create an account or sign in to shop on CRYMA.",
            });
            return false;
        }

        const existingCart = getBuyerCart();
        const existingIndex = existingCart.findIndex(
            (item) => String(item.id) === String(product.id)
        );
        const currentQuantity = existingIndex >= 0
            ? Number(existingCart[existingIndex].quantity || 1)
            : 0;
        const nextQuantity = currentQuantity + 1;
        const rawStock = product?.stock ?? existingCart[existingIndex]?.stock;
        const stock = rawStock === null || rawStock === undefined || rawStock === ""
            ? null
            : Number(rawStock);

        if (Number.isFinite(stock) && nextQuantity > stock) {
            window.dispatchEvent(new CustomEvent("cryma-toast", {
                detail: { message: `Only ${stock} item${stock === 1 ? "" : "s"} available.` },
            }));
            return false;
        }

        if (existingIndex >= 0) {
            existingCart[existingIndex].quantity = nextQuantity;
        } else {
            existingCart.push({ ...product, quantity: 1 });
        }

        if (!saveBuyerCart(existingCart)) return;
        setSelectedProduct(product);
        setCartModalOpen(true);
        return true;
    };

    return (
        <div className="buyer-home">
            <main className="buyer-home-main">

                {/* HERO */}
                <section className="buyer-landing-hero">

                    <div className="buyer-landing-hero-content">

                        <span className="buyer-landing-eyebrow">
                            WELCOME TO CRYMA
                        </span>

                        <h1>
                            Shopping should
                            <br />
                            feel a little
                            <br />
                            <em>more personal.</em>
                        </h1>

                        <p>
                            Discover everyday finds from independent
                            sellers, curated products, and people
                            worth discovering — all in one marketplace.
                        </p>

                        <div className="buyer-landing-actions">
                            <button
                                type="button"
                                className="buyer-primary-button"
                                onClick={handleStartShopping}
                            >
                                Explore CRYMA
                                <ArrowRight size={17} />
                            </button>

                            <button
                                type="button"
                                className="buyer-secondary-button"
                                onClick={() => navigate("/register")}
                            >
                                Join the marketplace
                            </button>
                        </div>

                        <div className="buyer-hero-trust">

                            <span>
                                <CheckCircle2 size={15} />
                                Trusted marketplace
                            </span>

                            <span>
                                <Users size={15} />
                                Local sellers
                            </span>

                            <span>
                                <Truck size={15} />
                                Flexible delivery
                            </span>

                        </div>

                    </div>

                    <div className="buyer-landing-hero-visual">

                        <div className="buyer-hero-main-photo">
                            <img
                                src={LANDING_VISUALS.hero.src}
                                alt={LANDING_VISUALS.hero.alt}
                                fetchPriority="high"
                                decoding="async"
                                onError={(event) => {
                                    event.currentTarget.hidden = true;
                                    event.currentTarget.parentElement?.classList.add("image-unavailable");
                                }}
                            />

                            <div className="buyer-hero-photo-overlay">
                                <span>DISCOVER</span>
                                <strong>
                                    Things you'll love.
                                </strong>
                            </div>
                        </div>

                        {HERO_DISCOVERY_CATEGORIES.map((category, index) => {
                            const visual = getLandingCategoryVisual(category);

                            return (
                                <button
                                    key={category}
                                    type="button"
                                    className={`buyer-hero-product buyer-hero-product-${index + 1}`}
                                    onClick={() => handleCategoryClick(category)}
                                    aria-label={`Explore ${category}`}
                                >
                                    <img
                                        src={visual.src}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => {
                                            event.currentTarget.hidden = true;
                                            event.currentTarget.parentElement?.classList.add("image-unavailable");
                                        }}
                                    />
                                    <span>{category}</span>
                                </button>
                            );
                        })}

                        <div className="buyer-hero-floating-note">
                            <CheckCircle2 size={16} />
                            <div>
                                <strong>Made for everyday</strong>
                                <span>
                                    Discover something new today.
                                </span>
                            </div>
                        </div>

                    </div>
                </section>


                {/* FEATURED */}
                <section className="buyer-landing-section buyer-landing-featured">

                    <div className="buyer-landing-section-heading">

                        <div>
                            <span>CURATED FOR YOU</span>

                            <h2>
                                A few things worth discovering.
                            </h2>

                            <p>
                                Start with what's catching attention,
                                then explore the marketplace your way.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="buyer-section-link"
                            onClick={handleStartShopping}
                        >
                            View all
                            <ArrowRight size={15} />
                        </button>

                    </div>

                    {loading ? (
                        <div className="buyer-landing-loading">
                            <div className="buyer-landing-spinner" />
                            <p>Finding something good...</p>
                        </div>
                    ) : error ? (
                        <div className="buyer-landing-state">
                            <strong>Something went wrong</strong>
                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={() =>
                                    window.location.reload()
                                }
                            >
                                Try Again
                            </button>
                        </div>
                    ) : featuredProducts.length === 0 ? (
                        <div className="buyer-empty-featured">

                            <div className="buyer-empty-featured-visual" aria-hidden="true">
                                <PackageOpen size={52} strokeWidth={1.3} />
                            </div>

                            <div>
                                <strong>
                                    The shelves are still being filled.
                                </strong>

                                <p>
                                    New products will appear here
                                    once they're available.
                                </p>

                                <button
                                    type="button"
                                    onClick={handleStartShopping}
                                >
                                    Explore marketplace
                                    <ArrowRight size={15} />
                                </button>
                            </div>

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


                {/* CATEGORY DISCOVERY */}
                <section className="buyer-landing-section buyer-landing-category-section">

                    <div className="buyer-landing-section-heading">

                        <div>
                            <span>EXPLORE</span>

                            <h2>
                                Find your next favorite.
                            </h2>

                            <p>
                                Browse different corners of CRYMA
                                and discover products from sellers
                                across the marketplace.
                            </p>
                        </div>

                    </div>

                    <div className="buyer-landing-category-grid">

                        {categoryHighlights.map(
                            (category, index) => (
                                <button
                                    key={category}
                                    type="button"
                                    className={`buyer-landing-category-card category-${index + 1}`}
                                    onClick={() => handleCategoryClick(category)}
                                >
                                    {getLandingCategoryVisual(category) ? (
                                        <img
                                            className="buyer-category-image"
                                            src={getLandingCategoryVisual(category).src}
                                            alt={getLandingCategoryVisual(category).alt}
                                            loading="lazy"
                                            decoding="async"
                                            style={{ objectPosition: getLandingCategoryVisual(category).position }}
                                            onError={(event) => {
                                                event.currentTarget.hidden = true;
                                                event.currentTarget.parentElement?.classList.add("image-unavailable");
                                            }}
                                        />
                                    ) : (
                                        <span className="buyer-category-fallback" aria-hidden="true">
                                            {category.slice(0, 1).toUpperCase()}
                                        </span>
                                    )}
                                    <span className="buyer-category-shade" aria-hidden="true" />
                                    <span className="buyer-category-number">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    <span className="buyer-category-name">
                                        {category}
                                    </span>

                                    <ArrowRight size={18} />
                                </button>
                            )
                        )}

                    </div>
                </section>


                {/* WHY CRYMA */}
                <section className="buyer-landing-section buyer-landing-value-section">

                    <div className="buyer-landing-section-heading">

                        <div>
                            <span>WHY CRYMA</span>

                            <h2>
                                More than a place to shop.
                            </h2>

                            <p>
                                A marketplace designed around people,
                                discovery, and a better buying experience.
                            </p>
                        </div>

                    </div>

                    <div className="buyer-value-grid">

                        <article className="buyer-value-card">
                            <div className="buyer-value-icon">
                                <Users size={22} />
                            </div>

                            <h3>
                                Discover real sellers
                            </h3>

                            <p>
                                Shop from people and businesses
                                bringing their own products to CRYMA.
                            </p>
                        </article>

                        <article className="buyer-value-card">
                            <div className="buyer-value-icon">
                                <ShieldCheck size={22} />
                            </div>

                            <h3>
                                Shop with confidence
                            </h3>

                            <p>
                                Clear product information and an
                                experience designed around trust.
                            </p>
                        </article>

                        <article className="buyer-value-card">
                            <div className="buyer-value-icon">
                                <Truck size={22} />
                            </div>

                            <h3>
                                Delivery made easier
                            </h3>

                            <p>
                                Orders can move through CRYMA's
                                growing logistics network.
                            </p>
                        </article>

                    </div>
                </section>


                {/* HOW IT WORKS */}
                <section className="buyer-how-section">

                    <div className="buyer-landing-section-heading">

                        <div>
                            <span>HOW IT WORKS</span>

                            <h2>
                                From discovery to doorstep.
                            </h2>

                            <p>
                                A simple shopping journey from the
                                first scroll to delivery.
                            </p>
                        </div>

                    </div>

                    <div className="buyer-how-grid">

                        <div className="buyer-how-step">
                            <span>01</span>
                            <h3>Discover</h3>
                            <p>
                                Browse products and categories
                                that interest you.
                            </p>
                        </div>

                        <div className="buyer-how-step">
                            <span>02</span>
                            <h3>Choose</h3>
                            <p>
                                Find something you love and add it
                                to your cart.
                            </p>
                        </div>

                        <div className="buyer-how-step">
                            <span>03</span>
                            <h3>Order</h3>
                            <p>
                                Complete your purchase through
                                the marketplace.
                            </p>
                        </div>

                        <div className="buyer-how-step">
                            <span>04</span>
                            <h3>Receive</h3>
                            <p>
                                Follow your order as it makes its
                                way to you.
                            </p>
                        </div>

                    </div>
                </section>


                {/* LOGISTICS */}
                <section className="buyer-logistics-section">

                    <div className="buyer-logistics-decoration">
                        <span>CRYMA</span>
                    </div>

                    <div className="buyer-logistics-content">

                        <span className="buyer-landing-eyebrow">
                            MOVE WITH CRYMA
                        </span>

                        <h2>
                            Want to be part of
                            <br />
                            the <em>delivery journey?</em>
                        </h2>

                        <p>
                            Join CRYMA as a courier and help
                            bring orders from local sellers to customers.
                        </p>

                        <button
                            type="button"
                            className="buyer-logistics-button"
                            onClick={() =>
                                navigate("/register")
                            }
                        >
                            Register as a courier
                            <ArrowRight size={16} />
                        </button>

                    </div>

                    <div className="buyer-logistics-card">
                        <div className="buyer-logistics-photo">
                            <img
                                src={LANDING_VISUALS.logistics.src}
                                alt={LANDING_VISUALS.logistics.alt}
                                loading="lazy"
                                decoding="async"
                                onError={(event) => {
                                    event.currentTarget.hidden = true;
                                    event.currentTarget.parentElement?.classList.add("image-unavailable");
                                }}
                            />
                        </div>

                        <div className="buyer-logistics-icon">
                            <Truck size={27} />
                        </div>

                        <strong>
                            Deliver. Connect. Earn.
                        </strong>

                        <p>
                            Flexible delivery opportunities through
                            the CRYMA marketplace.
                        </p>

                        <div className="buyer-logistics-points">

                            <span>
                                <CheckCircle2 size={14} />
                                Delivery opportunities
                            </span>

                            <span>
                                <CheckCircle2 size={14} />
                                Order tracking
                            </span>

                            <span>
                                <CheckCircle2 size={14} />
                                Dedicated courier tools
                            </span>

                        </div>

                    </div>
                </section>


                {/* FOOTER */}
                <footer className="buyer-footer">

                    <div className="buyer-footer-main">

                        <div className="buyer-footer-brand">

                            <button
                                type="button"
                                className="buyer-footer-logo"
                                onClick={() => navigate("/")}
                            >
                                CRYMA
                            </button>

                            <p>
                                A modern marketplace connecting
                                buyers, sellers, and couriers
                                in one place.
                            </p>

                            <div className="buyer-footer-socials">

                                <button
                                    type="button"
                                    aria-label="Facebook"
                                >
                                    f
                                </button>

                                <button
                                    type="button"
                                    aria-label="Instagram"
                                >
                                    ◎
                                </button>

                                <button
                                    type="button"
                                    aria-label="Messages"
                                    onClick={() => isBuyerSession()
                                        ? navigate("/buyer/chat")
                                        : requestBuyerSignIn({ title: "Sign in to contact support", message: "Sign in to message CRYMA Customer Service.", from: "/buyer/chat" })}
                                >
                                    <MessageCircle size={16} />
                                </button>

                            </div>
                        </div>

                        <div className="buyer-footer-column">
                            <h3>Shop</h3>

                            <button
                                type="button"
                                onClick={handleStartShopping}
                            >
                                All Products
                            </button>

                            <button
                                type="button"
                                onClick={handleStartShopping}
                            >
                                Categories
                            </button>

                            <button
                                type="button"
                                onClick={handleStartShopping}
                            >
                                New Finds
                            </button>
                        </div>

                        <div className="buyer-footer-column">
                            <h3>Join CRYMA</h3>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/register")
                                }
                            >
                                Become a Buyer
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/register")
                                }
                            >
                                Become a Seller
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/register")
                                }
                            >
                                Become a Courier
                            </button>
                        </div>

                        <div className="buyer-footer-column">
                            <h3>Need help?</h3>

                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                            >
                                Sign In
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/register")}
                            >
                                Create Account
                            </button>

                            <button
                                type="button"
                                onClick={() => isBuyerSession()
                                    ? navigate("/buyer/chat")
                                    : requestBuyerSignIn({ title: "Contact CRYMA Customer Service", message: "Sign in to send a message to our support team.", from: "/buyer/chat" })}
                            >
                                Contact CRYMA
                            </button>
                        </div>
                    </div>

                    <div className="buyer-footer-bottom">

                        <span>
                            © {new Date().getFullYear()} CRYMA.
                            All rights reserved.
                        </span>

                        <div>
                            <button type="button">
                                Privacy
                            </button>

                            <button type="button">
                                Terms
                            </button>

                            <button type="button">
                                Guidelines
                            </button>
                        </div>

                    </div>
                </footer>
            </main>


            {/* CART MODAL */}
            {cartModalOpen && selectedProduct && (
                <div
                    className="buyer-cart-confirmation-overlay"
                    onClick={() => setCartModalOpen(false)}
                >
                    <div
                        className="buyer-cart-confirmation"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="buyer-success-icon">
                            <CheckCircle2 size={22} />
                        </div>

                        <h3>Added to cart</h3>

                        <p>
                            <strong>
                                {selectedProduct.name}
                            </strong>{" "}
                            has been added to your cart.
                        </p>

                        <div className="buyer-cart-confirmation-actions">

                            <button
                                type="button"
                                className="buyer-modal-secondary"
                                onClick={() =>
                                    setCartModalOpen(false)
                                }
                            >
                                Continue Shopping
                            </button>

                            <button
                                type="button"
                                className="buyer-modal-primary"
                                onClick={() =>
                                    navigate("/cart")
                                }
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
