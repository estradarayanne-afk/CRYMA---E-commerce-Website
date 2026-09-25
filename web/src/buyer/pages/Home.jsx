import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Heart,
    LogOut,
    Menu,
    MessageCircle,
    Package,
    Search,
    ShoppingCart,
    UserRound,
    X,
} from "lucide-react";
import api from "../../shared/services/api";
import logo from "../../assets/CRYMA LOGO.png";
import { PRODUCT_CATEGORIES } from "../../shared/constants/categories";
import ProductCard from "../../components/buyer/ProductCard";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function getCartItems() {
    try {
        const cart = JSON.parse(localStorage.getItem("cryma_cart") || "[]");
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function Home() {
    const navigate = useNavigate();

    const [user] = useState(getStoredUser);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productError, setProductError] = useState("");
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [cartCount, setCartCount] = useState(getCartItems().length);
    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [savedProducts, setSavedProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [toast, setToast] = useState("");

    useEffect(() => {
        if (user?.role === "admin") {
            navigate("/admin/dashboard", { replace: true });
            return;
        }

        if (user?.role === "seller") {
            navigate("/seller/dashboard", { replace: true });
            return;
        }

        if (user?.role === "rider") {
            navigate("/courier/dashboard", { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        let mounted = true;

        async function loadProducts() {
            setLoadingProducts(true);
            setProductError("");

            try {
                const response = await api.get("/products?per_page=50");

                if (!mounted) return;

                const payload = response?.data;

                let items = [];

                if (Array.isArray(payload)) {
                    items = payload;
                } else if (Array.isArray(payload?.data)) {
                    items = payload.data;
                } else if (Array.isArray(payload?.data?.data)) {
                    items = payload.data.data;
                } else if (Array.isArray(payload?.products)) {
                    items = payload.products;
                }

                setProducts(items);
            } catch (error) {
                if (!mounted) return;

                console.error("Failed to load products:", error);
                setProductError(
                    "We couldn't load the products right now. Please try again."
                );
            } finally {
                if (mounted) {
                    setLoadingProducts(false);
                }
            }
        }

        loadProducts();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const updateCartCount = () => {
            setCartCount(getCartItems().length);
        };

        window.addEventListener("cryma-cart-updated", updateCartCount);
        window.addEventListener("storage", updateCartCount);

        return () => {
            window.removeEventListener(
                "cryma-cart-updated",
                updateCartCount
            );
            window.removeEventListener("storage", updateCartCount);
        };
    }, []);

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return products.filter((product) => {
            const categoryMatch =
                activeCategory === "All" ||
                String(product.category || "").toLowerCase() ===
                    activeCategory.toLowerCase();

            const searchMatch =
                !query ||
                String(product.name || "")
                    .toLowerCase()
                    .includes(query) ||
                String(product.category || "")
                    .toLowerCase()
                    .includes(query) ||
                String(product.seller?.name || product.seller || "")
                    .toLowerCase()
                    .includes(query);

            return categoryMatch && searchMatch;
        });
    }, [products, activeCategory, search]);

    const handleSearch = (event) => {
        event.preventDefault();

        const value = search.trim();

        if (!value) {
            navigate("/shop");
            return;
        }

        navigate(`/shop?search=${encodeURIComponent(value)}`);
    };

    const handleCategory = (category) => {
        setActiveCategory(category);

        if (category === "All") {
            navigate("/");
            return;
        }

        navigate(`/shop?category=${encodeURIComponent(category)}`);
    };

    const handleProductClick = (product) => {
        if (!user) {
            navigate("/login");
            return;
        }

        navigate(`/products/${product.id}`);
    };

    const handleAddToCart = (product) => {
        if (!user) {
            navigate("/login");
            return;
        }

        const cart = getCartItems();

        const existingIndex = cart.findIndex(
            (item) => Number(item.id) === Number(product.id)
        );

        if (existingIndex >= 0) {
            cart[existingIndex] = {
                ...cart[existingIndex],
                quantity: Number(cart[existingIndex].quantity || 1) + 1,
            };
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: Number(product.price || 0),
                quantity: 1,
                stock: Number(product.stock || 0),
                category: product.category || "",
                seller: product.seller || null,
            });
        }

        localStorage.setItem("cryma_cart", JSON.stringify(cart));
        setCartCount(cart.length);
        window.dispatchEvent(new Event("cryma-cart-updated"));

        setSelectedProduct(product);
    };

    const handleToggleSaved = (product) => {
        if (!user) {
            navigate("/login");
            return;
        }

        setSavedProducts((current) => {
            if (current.includes(product.id)) {
                return current.filter((id) => id !== product.id);
            }

            return [...current, product.id];
        });
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setAccountOpen(false);
        setLogoutOpen(false);

        setToast("You have been signed out.");

        setTimeout(() => {
            navigate("/login", { replace: true });
        }, 700);
    };

    const userName =
        user?.first_name ||
        user?.firstName ||
        user?.name ||
        user?.email?.split("@")[0] ||
        "Account";

    return (
        <div className="buyer-home">
            <header className="buyer-market-header">
                <div className="buyer-market-header-inner">
                    <button
                        type="button"
                        className="buyer-mobile-menu"
                        aria-label="Open navigation"
                        onClick={() => setMenuOpen(true)}
                    >
                        <Menu size={21} />
                    </button>

                    <Link
                        to="/"
                        className="buyer-market-logo"
                        aria-label="CRYMA Home"
                    >
                        <img src={logo} alt="CRYMA" />
                    </Link>

                    <nav className="buyer-main-nav">
                        <Link
                            to="/"
                            className="buyer-main-nav-link active"
                        >
                            Home
                        </Link>

                        <Link
                            to="/shop"
                            className="buyer-main-nav-link"
                        >
                            Categories
                        </Link>

                        <Link
                            to="/cart"
                            className="buyer-main-nav-link buyer-nav-with-icon"
                        >
                            <ShoppingCart size={17} />
                            Cart
                            {cartCount > 0 && (
                                <span className="buyer-nav-badge">
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            to="/orders"
                            className="buyer-main-nav-link buyer-nav-with-icon"
                        >
                            <Package size={17} />
                            My Orders
                        </Link>

                        <Link
                            to="/buyer/chat"
                            className="buyer-main-nav-link buyer-nav-with-icon"
                        >
                            <MessageCircle size={17} />
                            Messages
                        </Link>
                    </nav>

                    <form
                        className="buyer-market-search"
                        onSubmit={handleSearch}
                    >
                        <Search size={18} />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search products..."
                            aria-label="Search products"
                        />

                        {search && (
                            <button
                                type="button"
                                className="buyer-search-clear"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                            >
                                <X size={15} />
                            </button>
                        )}

                        <button type="submit" className="buyer-search-button">
                            Search
                        </button>
                    </form>

                    <div className="buyer-market-actions">
                        <Link
                            to="/cart"
                            className="buyer-header-icon-button"
                            aria-label="Cart"
                        >
                            <ShoppingCart size={20} />

                            {cartCount > 0 && (
                                <span className="buyer-header-badge">
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>

                        {user ? (
                            <div className="buyer-account-wrapper">
                                <button
                                    type="button"
                                    className="buyer-account-button"
                                    onClick={() =>
                                        setAccountOpen((current) => !current)
                                    }
                                >
                                    <span className="buyer-account-avatar">
                                        {userName.charAt(0).toUpperCase()}
                                    </span>

                                    <span className="buyer-account-name">
                                        {userName}
                                    </span>
                                </button>

                                {accountOpen && (
                                    <div className="buyer-account-menu">
                                        <div className="buyer-account-menu-header">
                                            <strong>{userName}</strong>
                                            <span>{user?.email}</span>
                                        </div>

                                        <Link
                                            to="/account"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <UserRound size={17} />
                                            My Account
                                        </Link>

                                        <Link
                                            to="/orders"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <Package size={17} />
                                            My Orders
                                        </Link>

                                        <Link
                                            to="/buyer/chat"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <MessageCircle size={17} />
                                            Messages
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAccountOpen(false);
                                                setLogoutOpen(true);
                                            }}
                                        >
                                            <LogOut size={17} />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="buyer-sign-in-button"
                                onClick={() => navigate("/login")}
                            >
                                <UserRound size={18} />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {menuOpen && (
                <div
                    className="buyer-mobile-menu-overlay"
                    onClick={() => setMenuOpen(false)}
                >
                    <aside
                        className="buyer-mobile-menu-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="buyer-mobile-menu-header">
                            <strong>CRYMA</strong>

                            <button
                                type="button"
                                onClick={() => setMenuOpen(false)}
                                aria-label="Close navigation"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="buyer-mobile-nav">
                            <Link to="/" onClick={() => setMenuOpen(false)}>
                                Home
                            </Link>

                            <Link
                                to="/shop"
                                onClick={() => setMenuOpen(false)}
                            >
                                Categories
                            </Link>

                            <Link
                                to="/cart"
                                onClick={() => setMenuOpen(false)}
                            >
                                Cart
                                {cartCount > 0 && (
                                    <span>{cartCount}</span>
                                )}
                            </Link>

                            <Link
                                to="/orders"
                                onClick={() => setMenuOpen(false)}
                            >
                                My Orders
                            </Link>

                            <Link
                                to="/buyer/chat"
                                onClick={() => setMenuOpen(false)}
                            >
                                Messages
                            </Link>

                            {user && (
                                <Link
                                    to="/account"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    My Account
                                </Link>
                            )}
                        </nav>
                    </aside>
                </div>
            )}

            <main className="buyer-home-main">
                <section className="buyer-home-heading">
                    <div>
                        <span className="buyer-section-eyebrow">
                            CRYMA MARKETPLACE
                        </span>

                        <h1>Find what you need.</h1>

                        <p>
                            Browse products from different categories and
                            shop at your own pace.
                        </p>
                    </div>

                    <Link
                        to="/shop"
                        className="buyer-view-all-link"
                    >
                        View all products
                    </Link>
                </section>

                <section className="buyer-category-section">
                    <div className="buyer-section-heading">
                        <h2>Categories</h2>
                    </div>

                    <div className="buyer-category-list">
                        <button
                            type="button"
                            className={
                                activeCategory === "All"
                                    ? "active"
                                    : ""
                            }
                            onClick={() => handleCategory("All")}
                        >
                            All
                        </button>

                        {PRODUCT_CATEGORIES.map((category) => (
                            <button
                                type="button"
                                key={category}
                                className={
                                    activeCategory === category
                                        ? "active"
                                        : ""
                                }
                                onClick={() => handleCategory(category)}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="buyer-products-section">
                    <div className="buyer-section-heading">
                        <div>
                            <h2>
                                {search
                                    ? `Results for "${search}"`
                                    : activeCategory === "All"
                                      ? "Products"
                                      : activeCategory}
                            </h2>

                            {!loadingProducts && (
                                <span>
                                    {filteredProducts.length}{" "}
                                    {filteredProducts.length === 1
                                        ? "product"
                                        : "products"}
                                </span>
                            )}
                        </div>

                        <Link to="/shop">See all</Link>
                    </div>

                    {loadingProducts ? (
                        <div className="buyer-products-loading">
                            <div className="buyer-loading-grid">
                                {Array.from({ length: 12 }).map(
                                    (_, index) => (
                                        <div
                                            className="buyer-product-skeleton"
                                            key={index}
                                        >
                                            <div className="buyer-skeleton-image" />
                                            <div className="buyer-skeleton-line large" />
                                            <div className="buyer-skeleton-line small" />
                                            <div className="buyer-skeleton-line price" />
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    ) : productError ? (
                        <div className="buyer-state-card">
                            <strong>Something went wrong.</strong>
                            <p>{productError}</p>

                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="buyer-state-card">
                            <Search size={28} />

                            <strong>No products found</strong>

                            <p>
                                Try another search or choose a different
                                category.
                            </p>

                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setActiveCategory("All");
                                    navigate("/");
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="buyer-product-grid">
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    saved={savedProducts.includes(
                                        product.id
                                    )}
                                    onSave={handleToggleSaved}
                                    onAddToCart={handleAddToCart}
                                    onOpen={handleProductClick}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <footer className="buyer-simple-footer">
                <span>© {new Date().getFullYear()} CRYMA</span>

                <div>
                    <Link to="/shop">Shop</Link>
                    <Link to="/orders">Orders</Link>
                    <Link to="/account">Account</Link>
                </div>
            </footer>

            {selectedProduct && (
                <div className="buyer-modal-backdrop">
                    <div
                        className="buyer-confirmation-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cart-confirmation-title"
                    >
                        <div className="buyer-success-icon">✓</div>

                        <h2 id="cart-confirmation-title">
                            Added to cart
                        </h2>

                        <p className="buyer-modal-product-name">
                            {selectedProduct.name}
                        </p>

                        <strong className="buyer-modal-product-price">
                            ₱
                            {Number(
                                selectedProduct.price || 0
                            ).toLocaleString()}
                        </strong>

                        <div className="buyer-modal-actions">
                            <button
                                type="button"
                                className="buyer-modal-secondary"
                                onClick={() =>
                                    setSelectedProduct(null)
                                }
                            >
                                Continue Shopping
                            </button>

                            <button
                                type="button"
                                className="buyer-modal-primary"
                                onClick={() => {
                                    setSelectedProduct(null);
                                    navigate("/cart");
                                }}
                            >
                                View Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {logoutOpen && (
                <div className="buyer-modal-backdrop">
                    <div
                        className="buyer-confirmation-modal buyer-logout-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-title"
                    >
                        <div className="buyer-modal-icon">
                            <LogOut size={21} />
                        </div>

                        <h2 id="logout-title">Sign out?</h2>

                        <p>
                            Are you sure you want to sign out of your
                            CRYMA account?
                        </p>

                        <div className="buyer-modal-actions">
                            <button
                                type="button"
                                className="buyer-modal-secondary"
                                onClick={() => setLogoutOpen(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="buyer-modal-danger"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="buyer-toast" role="status">
                    {toast}
                </div>
            )}
        </div>
    );
}

export default Home;