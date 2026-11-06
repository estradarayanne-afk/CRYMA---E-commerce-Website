import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    MessageCircle,
    PackageOpen,
    Search,
    Truck,
    Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import HomeHeroScene from "./HomeHeroScene";
import ProductCard from "../../components/ProductCard/ProductCard";
import { LANDING_VISUALS } from "../../../shared/constants/landingVisuals";
import {
    getBuyerCart,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerCart,
} from "../../../shared/utils/buyerAccess";

import "./Home.css";

/* =========================================================
   HELPERS
========================================================= */

function getBuyerGreetingName() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");

        const firstName =
            user?.first_name ||
            user?.firstName ||
            user?.name?.split(" ")[0] ||
            user?.username;

        return typeof firstName === "string" && firstName.trim()
            ? firstName.trim()
            : "";
    } catch {
        return "";
    }
}

function getProductImage(product) {
    if (!product || typeof product !== "object") {
        return "";
    }

    const candidates = [
        product.image,
        product.image_url,
        product.thumbnail,
        product.primary_image,
        ...(Array.isArray(product.images)
            ? product.images.flatMap((image) => [
                typeof image === "string" ? image : image?.url,
                image?.image_url,
            ])
            : []),
    ];

    return (
        candidates.find(
            (image) =>
                typeof image === "string" &&
                image.trim().length > 0
        )?.trim() || ""
    );
}

function normalizeProduct(product) {
    return {
        ...product,
        displayImage: getProductImage(product),
    };
}

function getProductList(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data?.data)) {
        return payload.data.data;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.products)) {
        return payload.products;
    }

    return [];
}

function showToast(message, type = "error") {
    window.dispatchEvent(
        new CustomEvent("cryma-toast", {
            detail: { message, type },
        })
    );
}

/* =========================================================
   HOME COMPONENT
========================================================= */

function Home() {
    const navigate = useNavigate();

    const heroRef = useRef(null);
    const previousFocusRef = useRef(null);

    const buyerSession = isBuyerSession();
    const greetingName = buyerSession
        ? getBuyerGreetingName()
        : "";

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [mobileSearch, setMobileSearch] = useState("");

    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cartModalOpen, setCartModalOpen] = useState(false);

    const [retryCount, setRetryCount] = useState(0);

    /* =====================================================
       FEATURED PRODUCTS
    ===================================================== */

    const featuredProducts = useMemo(
        () => products.slice(0, 8),
        [products]
    );

    /* =====================================================
       PRODUCT FETCHING
    ===================================================== */

    useEffect(() => {
        const controller = new AbortController();

        const loadProducts = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(
                    "/products?per_page=8",
                    {
                        signal: controller.signal,
                    }
                );

                if (controller.signal.aborted) {
                    return;
                }

                const items = getProductList(response?.data);

                setProducts(
                    items.map(normalizeProduct)
                );
            } catch (err) {
                if (
                    controller.signal.aborted ||
                    err?.name === "CanceledError" ||
                    err?.code === "ERR_CANCELED"
                ) {
                    return;
                }

                console.error(
                    "Failed to load products:",
                    err
                );

                setProducts([]);
                setError(
                    "We couldn't load the products right now. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => controller.abort();
    }, [retryCount]);

    /* =====================================================
       HERO PARALLAX
    ===================================================== */

    useEffect(() => {
        const hero = heroRef.current;

        if (
            !hero ||
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            return undefined;
        }

        const onPointerMove = (event) => {
            const bounds = hero.getBoundingClientRect();

            if (!bounds.width || !bounds.height) {
                return;
            }

            const x =
                (event.clientX - bounds.left) /
                    bounds.width -
                0.5;

            const y =
                (event.clientY - bounds.top) /
                    bounds.height -
                0.5;

            hero.style.setProperty(
                "--hero-copy-x",
                `${-x * 8}px`
            );

            hero.style.setProperty(
                "--hero-copy-y",
                `${-y * 6}px`
            );
        };

        const resetParallax = () => {
            hero.style.setProperty(
                "--hero-copy-x",
                "0px"
            );

            hero.style.setProperty(
                "--hero-copy-y",
                "0px"
            );
        };

        hero.addEventListener(
            "pointermove",
            onPointerMove,
            { passive: true }
        );

        hero.addEventListener(
            "pointerleave",
            resetParallax,
            { passive: true }
        );

        return () => {
            hero.removeEventListener(
                "pointermove",
                onPointerMove
            );

            hero.removeEventListener(
                "pointerleave",
                resetParallax
            );

            resetParallax();
        };
    }, []);

    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    useEffect(() => {
        if (
            window.matchMedia?.(
                "(prefers-reduced-motion: reduce)"
            ).matches ||
            !("IntersectionObserver" in window)
        ) {
            return undefined;
        }

        const sections = document.querySelectorAll(
            "#featured-products, #how-it-works, #delivery-journey"
        );

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(
                            "is-visible"
                        );

                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -48px 0px",
            }
        );

        sections.forEach((section) => {
            section.classList.add(
                "buyer-scroll-reveal"
            );

            observer.observe(section);
        });

        return () => observer.disconnect();
    }, []);

    /* =====================================================
       NAVIGATION
    ===================================================== */

    const handleStartShopping = useCallback(() => {
        navigate("/shop");
    }, [navigate]);

    const handleMobileSearch = useCallback(
        (event) => {
            event.preventDefault();

            const query = mobileSearch.trim();

            navigate(
                query
                    ? `/shop?search=${encodeURIComponent(query)}`
                    : "/shop"
            );
        },
        [mobileSearch, navigate]
    );

    /* =====================================================
       ADD TO CART
    ===================================================== */

    const handleAddToCart = useCallback((product) => {
        if (!product?.id) {
            showToast(
                "This product is currently unavailable."
            );

            return false;
        }

        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to add to cart",
                message:
                    "Create an account or sign in to shop on CRYMA.",
            });

            return false;
        }

        let existingCart = getBuyerCart();

        if (!Array.isArray(existingCart)) {
            existingCart = [];
        }

        const existingIndex = existingCart.findIndex(
            (item) =>
                String(item.id) === String(product.id)
        );

        const existingItem =
            existingIndex >= 0
                ? existingCart[existingIndex]
                : null;

        const currentQuantity = Math.max(
            0,
            Number(existingItem?.quantity) || 0
        );

        const nextQuantity = currentQuantity + 1;

        const rawStock =
            product.stock ?? existingItem?.stock;

        const stock =
            rawStock === null ||
            rawStock === undefined ||
            rawStock === ""
                ? null
                : Number(rawStock);

        if (
            stock !== null &&
            (!Number.isFinite(stock) || stock < 0)
        ) {
            showToast(
                "Unable to verify product availability."
            );

            return false;
        }

        if (
            stock !== null &&
            nextQuantity > stock
        ) {
            showToast(
                stock === 0
                    ? "This product is currently out of stock."
                    : `Only ${stock} item${stock === 1 ? "" : "s"} available.`
            );

            return false;
        }

        const updatedCart = [...existingCart];

        if (existingIndex >= 0) {
            updatedCart[existingIndex] = {
                ...existingItem,
                quantity: nextQuantity,
            };
        } else {
            updatedCart.push({
                ...product,
                quantity: 1,
            });
        }

        if (!saveBuyerCart(updatedCart)) {
            showToast(
                "Unable to save your cart. Please try again."
            );

            return false;
        }

        previousFocusRef.current =
            document.activeElement;

        setSelectedProduct(product);
        setCartModalOpen(true);

        return true;
    }, []);

    /* =====================================================
       CART MODAL ACCESSIBILITY
    ===================================================== */

    useEffect(() => {
        if (!cartModalOpen) {
            return undefined;
        }

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                setCartModalOpen(false);
            }
        };

        window.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [cartModalOpen]);

    useEffect(() => {
        if (cartModalOpen) {
            const modal = document.querySelector(
                ".buyer-cart-confirmation"
            );

            modal?.querySelector("button")?.focus();

            return undefined;
        }

        previousFocusRef.current?.focus?.();

        return undefined;
    }, [cartModalOpen]);

    /* =====================================================
       SUPPORT NAVIGATION
    ===================================================== */

    const handleContactSupport = useCallback(() => {
        if (isBuyerSession()) {
            navigate("/buyer/support");
            return;
        }

        requestBuyerSignIn({
            title: "Contact CRYMA Customer Service",
            message:
                "Sign in to send a message to our support team.",
            from: "/buyer/support",
        });
    }, [navigate]);

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="buyer-home">
            <main className="buyer-home-main">

                {/* =========================================
                    MOBILE SEARCH
                ========================================= */}

                <form
                    className="buyer-mobile-home-search"
                    onSubmit={handleMobileSearch}
                    role="search"
                >
                    <Search
                        size={20}
                        aria-hidden="true"
                    />

                    <input
                        type="search"
                        value={mobileSearch}
                        onChange={(event) =>
                            setMobileSearch(event.target.value)
                        }
                        placeholder="Search products, brands..."
                        aria-label="Search products and brands"
                    />
                </form>

                {/* =========================================
                    HERO
                ========================================= */}

                <section
                    className="buyer-landing-hero"
                    ref={heroRef}
                >
                    <div className="buyer-landing-hero-content">

                        <span className="buyer-landing-eyebrow">
                            {buyerSession
                                ? "YOUR NEIGHBORHOOD MARKETPLACE"
                                : "LOCAL FINDS. REAL PEOPLE."}
                        </span>

                        {buyerSession && (
                            <span className="buyer-welcome-badge">
                                <span aria-hidden="true">
                                    👋
                                </span>

                                Welcome back
                                {greetingName
                                    ? `, ${greetingName}`
                                    : "!"}
                            </span>
                        )}

                        <h1>
                            {buyerSession ? (
                                <>
                                    Your next find
                                    <br />
                                    <em>is closer.</em>
                                </>
                            ) : (
                                <>
                                    Good things
                                    <br />
                                    <em>move closer.</em>
                                </>
                            )}
                        </h1>

                        <p>
                            Meet independent sellers, find things
                            you love, and get them delivered through
                            CRYMA — all in one local marketplace.
                        </p>

                        <div className="buyer-landing-actions">

                            <button
                                type="button"
                                className="buyer-primary-button"
                                onClick={handleStartShopping}
                            >
                                {buyerSession
                                    ? "Browse All Categories"
                                    : "Explore CRYMA"}

                                <ArrowRight size={17} />
                            </button>

                            {buyerSession ? (
                                <button
                                    type="button"
                                    className="buyer-secondary-button"
                                    onClick={() =>
                                        navigate("/orders")
                                    }
                                >
                                    View My Orders
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="buyer-secondary-button"
                                    onClick={() =>
                                        navigate("/register")
                                    }
                                >
                                    Join the marketplace
                                </button>
                            )}

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

                    <div className="buyer-landing-hero-visual buyer-hero-three-visual">
                        <HomeHeroScene />
                    </div>

                </section>

                {/* =========================================
                    FEATURED PRODUCTS
                ========================================= */}

                <section
                    id="featured-products"
                    className="buyer-landing-section buyer-landing-featured"
                >
                    <div className="buyer-landing-section-heading">

                        <div>
                            <span className="buyer-mobile-featured-eyebrow">
                                Featured Products
                            </span>

                            <span>CURATED FOR YOU</span>

                            <h2>
                                A few things worth discovering.
                            </h2>

                            <h2 className="buyer-mobile-featured-title">
                                Featured Products
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

                    {/* LOADING */}

                    {loading && (
                        <div
                            className="buyer-landing-loading"
                            role="status"
                            aria-live="polite"
                        >
                            <div className="buyer-landing-spinner" />

                            <p>
                                Finding something good...
                            </p>
                        </div>
                    )}

                    {/* ERROR */}

                    {!loading && error && (
                        <div
                            className="buyer-landing-state"
                            role="alert"
                        >
                            <strong>
                                Something went wrong
                            </strong>

                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={() =>
                                    setRetryCount((count) => count + 1)
                                }
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* EMPTY */}

                    {!loading &&
                        !error &&
                        featuredProducts.length === 0 && (
                            <div className="buyer-empty-featured">

                                <div
                                    className="buyer-empty-featured-visual"
                                    aria-hidden="true"
                                >
                                    <PackageOpen
                                        size={52}
                                        strokeWidth={1.3}
                                    />
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
                        )}

                    {/* PRODUCTS */}

                    {!loading &&
                        !error &&
                        featuredProducts.length > 0 && (
                            <div className="buyer-landing-product-grid">

                                {featuredProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        onAddToCart={handleAddToCart}
                                    />
                                ))}

                            </div>
                        )}

                </section>

                {/* =========================================
                    HOW IT WORKS
                ========================================= */}

                <section
                    id="how-it-works"
                    className="buyer-how-section"
                >
                    <div className="buyer-landing-section-heading">

                        <div>
                            <span>HOW IT WORKS</span>

                            <h2>
                                From discovery to doorstep.
                            </h2>

                            <p>
                                A simple shopping journey from
                                the first scroll to delivery.
                            </p>
                        </div>

                    </div>

                    <div className="buyer-how-grid">

                        <div className="buyer-how-step">
                            <span>01</span>

                            <h3>Discover</h3>

                            <p>
                                Explore products from local sellers
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
                                Follow your order as it makes
                                its way to you.
                            </p>
                        </div>

                    </div>
                </section>

                {/* =========================================
                    LOGISTICS NETWORK
                ========================================= */}

                <section
                    id="delivery-journey"
                    className="buyer-logistics-section"
                >
                    <div className="buyer-logistics-decoration">
                        <span>CRYMA</span>
                    </div>

                    <svg
                        className="buyer-logistics-route"
                        viewBox="0 0 480 280"
                        fill="none"
                        aria-hidden="true"
                    >
                        <path
                            className="buyer-logistics-route-path"
                            d="M30 170 C80 55 175 60 210 160 S360 265 440 120"
                        />

                        <path
                            className="buyer-logistics-route-highlight"
                            d="M30 170 C80 55 175 60 210 160 S360 265 440 120"
                        />

                        <g className="buyer-logistics-route-truck">
                            <rect
                                x="-17"
                                y="-11"
                                width="25"
                                height="16"
                                rx="3"
                            />

                            <path
                                d="M8 -7h8l7 7v5H8z"
                                fill="currentColor"
                            />

                            <circle cx="-9" cy="8" r="4" />
                            <circle cx="14" cy="8" r="4" />
                        </g>
                    </svg>

                    <div className="buyer-logistics-content">

                        <span className="buyer-landing-eyebrow">
                            MOVE WITH CRYMA
                        </span>

                        <h2>
                            Every parcel has
                            <br />
                            a <em>journey to make.</em>
                        </h2>

                        <p>
                            Be part of CRYMA's logistics network.
                            Help move parcels between hubs and keep
                            deliveries moving across the marketplace.
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

                                    event.currentTarget.parentElement?.classList.add(
                                        "image-unavailable"
                                    );
                                }}
                            />

                        </div>

                        <div className="buyer-logistics-icon">
                            <Truck size={27} />
                        </div>

                        <strong>
                            Connect. Transfer. Deliver.
                        </strong>

                        <p>
                            Support hub-to-hub parcel transfers
                            through the CRYMA logistics network.
                        </p>

                        <div className="buyer-logistics-points">

                            <span>
                                <CheckCircle2 size={14} />
                                Hub-to-hub transfers
                            </span>

                            <span>
                                <CheckCircle2 size={14} />
                                Parcel movement tracking
                            </span>

                            <span>
                                <CheckCircle2 size={14} />
                                Dedicated courier tools
                            </span>

                        </div>

                    </div>
                </section>

                {/* =========================================
                    FOOTER
                ========================================= */}

                <footer className="buyer-footer">

                    <div className="buyer-footer-main">

                        {/* BRAND */}

                        <div className="buyer-footer-brand">

                            <Link
                                className="buyer-footer-logo"
                                to="/"
                                aria-label="Go to the CRYMA home page"
                            >
                                CRYMA
                            </Link>

                            <p>
                                A modern marketplace connecting
                                buyers, sellers, and couriers
                                in one place.
                            </p>

                            <div className="buyer-footer-socials">

                                <button
                                    type="button"
                                    aria-label="Contact CRYMA Customer Service"
                                    onClick={handleContactSupport}
                                >
                                    <MessageCircle size={16} />
                                </button>

                            </div>
                        </div>

                        {/* SHOP */}

                        <div className="buyer-footer-column">

                            <h3>Shop</h3>

                            <Link to="/shop">
                                Browse products
                            </Link>

                            <Link to="/shop">
                                All Categories
                            </Link>

                        </div>

                        {/* JOIN */}

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

                        {/* SUPPORT */}

                        <div className="buyer-footer-column">

                            <h3>Need help?</h3>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/login")
                                }
                            >
                                Sign In
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/register")
                                }
                            >
                                Create Account
                            </button>

                            <button
                                type="button"
                                onClick={handleContactSupport}
                            >
                                Contact CRYMA
                            </button>

                        </div>

                    </div>

                    {/* FOOTER BOTTOM */}

                    <div className="buyer-footer-bottom">

                        <span>
                            © {new Date().getFullYear()} CRYMA.
                            All rights reserved.
                        </span>

                        <div>

                            <Link to="/privacy">
                                Privacy
                            </Link>

                            <Link to="/terms">
                                Terms
                            </Link>

                            <Link to="/delivery-and-payments">
                                Delivery &amp; payments
                            </Link>

                        </div>

                    </div>

                </footer>

            </main>

            {/* =============================================
                CART CONFIRMATION MODAL
            ============================================= */}

            {cartModalOpen && selectedProduct && (
                <div
                    className="buyer-cart-confirmation-overlay"
                    onClick={() =>
                        setCartModalOpen(false)
                    }
                >
                    <div
                        className="buyer-cart-confirmation"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="buyer-cart-title"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="buyer-success-icon">
                            <CheckCircle2 size={22} />
                        </div>

                        <h3 id="buyer-cart-title">
                            Added to cart
                        </h3>

                        <p>
                            <strong>
                                {selectedProduct.name ||
                                    selectedProduct.title ||
                                    "This product"}
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
