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
    const logisticsMotionRef = useRef(null);

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

    useEffect(() => {
        const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
        const syncVehicleMotion = () => {
            const motion = logisticsMotionRef.current;
            if (!motion) return;

            if (motionPreference.matches) {
                motion.endElement();
            } else {
                motion.endElement();
                motion.beginElement();
            }
        };

        syncVehicleMotion();
        motionPreference.addEventListener("change", syncVehicleMotion);
        return () => motionPreference.removeEventListener("change", syncVehicleMotion);
    }, []);

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
                    "/products?per_page=8&sort=randomized",
                    {
                        signal: controller.signal,
                    }
                );

                if (controller.signal.aborted) {
                    return;
                }

                const items = getProductList(response?.data);
                if (items.length) {
                    api.post("/products/impressions", {
                        product_ids: items.map((item) => Number(item.id)),
                    }).catch((trackingError) => {
                        console.warn("Unable to record product exposure:", trackingError);
                    });
                }

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
                            <div
                                className="buyer-logistics-scene"
                                role="img"
                                aria-label="Animated CRYMA delivery journey from a local shop to a home"
                            >
                                <svg className="buyer-journey-svg" viewBox="0 0 640 320" fill="none" aria-hidden="true">
                                    <defs>
                                        <linearGradient id="journey-sky" x1="320" y1="0" x2="320" y2="320" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#F9E8E9" />
                                            <stop offset="1" stopColor="#E9B9C6" />
                                        </linearGradient>
                                        <linearGradient id="journey-road" x1="70" y1="260" x2="580" y2="230" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#A65770" />
                                            <stop offset="1" stopColor="#76243F" />
                                        </linearGradient>
                                        <linearGradient id="journey-van" x1="265" y1="180" x2="355" y2="242" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#FFFDFB" />
                                            <stop offset="1" stopColor="#F2DDE1" />
                                        </linearGradient>
                                    </defs>
                                    <path className="journey-sky" fill="url(#journey-sky)" d="M0 0h640v320H0z" />
                                    <circle className="journey-sun-glow" cx="516" cy="69" r="44" fill="#FFF6E7" />
                                    <circle cx="516" cy="69" r="25" fill="#FFF8EC" />
                                    <g className="journey-cloud journey-cloud--one" fill="#FFFDFC" fillOpacity=".76">
                                        <ellipse cx="153" cy="75" rx="33" ry="9" />
                                        <circle cx="140" cy="69" r="13" />
                                        <circle cx="157" cy="64" r="17" />
                                        <circle cx="174" cy="70" r="12" />
                                    </g>
                                    <g className="journey-cloud journey-cloud--two" fill="#FFFDFC" fillOpacity=".58">
                                        <ellipse cx="376" cy="106" rx="27" ry="7" />
                                        <circle cx="365" cy="100" r="11" />
                                        <circle cx="380" cy="96" r="14" />
                                        <circle cx="394" cy="101" r="9" />
                                    </g>
                                    <g className="journey-birds" fill="none" stroke="#8E4961" strokeLinecap="round" strokeWidth="2">
                                        <path d="m248 70 7-6 7 6m5-9 5-4 5 4" />
                                    </g>
                                    <path fill="#D99AAC" d="M0 188c78-35 133-33 213-5 75 27 139 24 204-9 77-39 141-34 223-3v149H0V188Z" />
                                    <path fill="#C77B92" d="M0 222c83-35 157-35 234-2 68 29 123 26 190-7 76-37 137-34 216-4v111H0V222Z" />

                                    <g className="journey-tree journey-tree--left">
                                        <path d="M30 232h8v-45h-8z" fill="#8A4B50" />
                                        <circle cx="34" cy="180" r="20" fill="#8DB18D" stroke="#668C75" strokeWidth="3" />
                                        <circle cx="22" cy="190" r="13" fill="#A4C59E" stroke="#668C75" strokeWidth="2" />
                                        <circle cx="47" cy="190" r="13" fill="#A4C59E" stroke="#668C75" strokeWidth="2" />
                                        <circle cx="29" cy="176" r="3" fill="#F8E8B9" />
                                    </g>
                                    <g className="journey-tree journey-tree--right">
                                        <path d="M614 232h7v-39h-7z" fill="#8A4B50" />
                                        <circle cx="617" cy="186" r="17" fill="#8DB18D" stroke="#668C75" strokeWidth="3" />
                                        <circle cx="606" cy="195" r="11" fill="#A4C59E" stroke="#668C75" strokeWidth="2" />
                                        <circle cx="628" cy="195" r="11" fill="#A4C59E" stroke="#668C75" strokeWidth="2" />
                                        <circle cx="622" cy="183" r="3" fill="#F8E8B9" />
                                    </g>

                                    <g className="journey-shop">
                                        <path d="M56 157h112v76H56z" fill="#FFF9F6" />
                                        <path d="M47 157h130l-13-32H60l-13 32Z" fill="#8C3453" />
                                        <path d="M47 157h130v8H47z" fill="#F6D6DD" stroke="#6D203C" strokeWidth="2" />
                                        <path d="M56 157 67 130h15l-8 27m21 0 7-27h15v27m21 0 2-27h15l-2 27" fill="#C9748D" stroke="#F9DDE3" strokeWidth="2" />
                                        <path className="journey-shop-flag" d="M164 125v-24m0 1h22l-7 8 7 7h-22" fill="#D76D87" stroke="#84314E" strokeWidth="2" strokeLinejoin="round" />
                                        <path d="M69 157v-20h20v20m15 0v-20h20v20m15 0v-20h20v20" stroke="#F7CBD5" strokeWidth="4" />
                                        <path d="M69 178h35v55H69z" fill="#E9B5C2" />
                                        <path d="M117 177h38v25h-38z" fill="#D8EEF0" />
                                        <path d="M136 177v25m-19-12h38" stroke="#FFF9F6" strokeWidth="3" />
                                        <circle cx="96" cy="207" r="2" fill="#7B2946" />
                                        <path d="M55 233h114" stroke="#8C3453" strokeWidth="5" strokeLinecap="round" />
                                        <g className="journey-sign">
                                            <rect x="76" y="106" width="75" height="19" rx="9.5" fill="#FFFDFC" fillOpacity=".94" />
                                            <text x="113.5" y="119" textAnchor="middle" fill="#76243F" fontSize="8" fontWeight="800" letterSpacing="1.1">LOCAL SHOP</text>
                                        </g>
                                    </g>

                                    <g className="journey-home">
                                        <path d="m474 157 64-52 65 52v76H474v-76Z" fill="#FFF9F6" />
                                        <path d="m461 158 77-63 78 63-8 9-70-57-70 57-7-9Z" fill="#87324F" />
                                        <path d="M493 172h28v29h-28zm53 0h28v29h-28z" fill="#D8EEF0" stroke="#E8B8C5" strokeWidth="3" />
                                        <path d="M507 172v29m-14-14h28m53-15v29m-14-14h28" stroke="#FFFDFC" strokeWidth="2" />
                                        <path className="journey-home-door" d="M522 192h28v41h-28z" fill="#DCA0B0" stroke="#87324F" strokeWidth="2" />
                                        <circle cx="543" cy="214" r="2" fill="#76243F" />
                                        <g className="journey-delivered-parcel">
                                            <path d="m560 229 9-5 10 5v10l-10 5-9-5v-10Z" fill="#D99B64" stroke="#7D4A3F" strokeWidth="1.5" strokeLinejoin="round" />
                                            <path d="m560 229 9 5 10-5m-10 5v10m-5-13 10-5" stroke="#F8E3B7" strokeWidth="1.5" />
                                        </g>
                                        <path d="M468 233h143" stroke="#8C3453" strokeWidth="5" strokeLinecap="round" />
                                        <g className="journey-arrival">
                                            <circle cx="570" cy="88" r="20" fill="#FFFDFC" fillOpacity=".72" />
                                            <circle cx="570" cy="88" r="11" fill="#8C3453" />
                                            <path d="m565 88 4 4 7-8" stroke="#FFFDFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </g>
                                        <g className="journey-sign">
                                            <rect x="528" y="244" width="82" height="19" rx="9.5" fill="#FFFDFC" fillOpacity=".94" />
                                            <text x="569" y="257" textAnchor="middle" fill="#76243F" fontSize="8" fontWeight="800" letterSpacing="1">YOUR DOOR</text>
                                        </g>
                                    </g>

                                    <path d="M0 254c83-15 141-36 209-32 84 5 111 47 188 42 74-5 129-41 243-40v96H0v-66Z" fill="url(#journey-road)" />
                                    <path d="M-8 254c84-15 145-36 217-31 81 6 112 46 188 41 74-5 128-41 251-40" stroke="#F2CCD4" strokeOpacity=".52" strokeWidth="3" />
                                    <path className="journey-road-dashes" d="M-8 278c84-15 145-36 217-31 81 6 112 46 188 41 74-5 128-41 251-40" stroke="#FFF3F0" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 15" />
                                    <g className="journey-vehicle">
                                        <g className="journey-vehicle-body">
                                            <path d="M-42-20h45c4 0 7 3 7 7v26h-58v-27c0-3 3-6 6-6Z" fill="url(#journey-van)" stroke="#84314E" strokeWidth="2" />
                                            <path d="M10-15h20l14 14v14H10v-28Z" fill="#EFC8D1" stroke="#84314E" strokeWidth="2" />
                                            <path d="M14-11h13l9 10H14v-10Z" fill="#9CC8CF" />
                                            <circle cx="25" cy="-7" r="4.5" fill="#F1C4A5" stroke="#84314E" strokeWidth="1" />
                                            <path d="M19-8c1-7 11-8 14-2l-1 3H19z" fill="#8C3453" stroke="#84314E" strokeWidth="1" />
                                            <circle cx="27" cy="-7" r="0.8" fill="#472034" />
                                            <path d="M-35-13h34v15h-34z" fill="#E8B8C5" />
                                            <path d="M-31-9h26" stroke="#FFFDFC" strokeWidth="2" />
                                            <rect x="-25" y="-25" width="25" height="8" rx="2" fill="#8C3453" />
                                            <text x="-12.5" y="-19" textAnchor="middle" fill="#FFF7F3" fontSize="5" fontWeight="900" letterSpacing=".4">C</text>
                                            <g className="journey-wheel">
                                                <circle cx="-29" cy="14" r="7" fill="#472034" />
                                                <circle cx="-29" cy="14" r="3" fill="#F8E8E8" />
                                                <path d="M-29 8v12m-6-6h12" stroke="#C8899B" strokeWidth="1" />
                                            </g>
                                            <g className="journey-wheel">
                                                <circle cx="28" cy="14" r="7" fill="#472034" />
                                                <circle cx="28" cy="14" r="3" fill="#F8E8E8" />
                                                <path d="M28 8v12m-6-6h12" stroke="#C8899B" strokeWidth="1" />
                                            </g>
                                            <rect x="38" y="4" width="4" height="5" rx="2" fill="#FFF0D6" />
                                            <rect x="-44" y="3" width="4" height="5" rx="2" fill="#F2A5B6" />
                                            <path d="M-8-15v11m7-11v11m7-11v11" stroke="#FFFDFC" strokeOpacity=".76" strokeWidth="2" />
                                            <path className="journey-van-smile" d="M24-2q3 2 6 0" stroke="#84314E" strokeWidth="1" strokeLinecap="round" />
                                        </g>
                                        <animateMotion
                                            ref={logisticsMotionRef}
                                            begin="indefinite"
                                            dur="9s"
                                            repeatCount="indefinite"
                                            rotate="auto"
                                            path="M90 246 C164 238 218 207 286 229 S397 258 462 232 S526 208 558 218"
                                        />
                                    </g>
                                </svg>
                            </div>
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
