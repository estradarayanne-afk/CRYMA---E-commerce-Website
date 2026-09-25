import { useEffect, useState } from "react";
import {
    ChevronDown,
    Heart,
    LogOut,
    Menu,
    Search,
    ShoppingCart,
    UserRound,
    Settings,
    X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import "./BuyerNavbar.css";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function getCartCount() {
    try {
        const cart = JSON.parse(
            localStorage.getItem("cryma_cart") || "[]"
        );

        return Array.isArray(cart) ? cart.length : 0;
    } catch {
        return 0;
    }
}

function BuyerNavbar() {
    const navigate = useNavigate();

    const [user, setUser] = useState(getStoredUser);
    const [cartCount, setCartCount] = useState(getCartCount());
    const [search, setSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    useEffect(() => {
        const updateCart = () => {
            setCartCount(getCartCount());
        };

        const updateUser = () => {
            setUser(getStoredUser());
        };

        window.addEventListener(
            "cryma-cart-updated",
            updateCart
        );

        window.addEventListener(
            "cryma-user-updated",
            updateUser
        );

        window.addEventListener(
            "storage",
            updateCart
        );

        window.addEventListener(
            "storage",
            updateUser
        );

        return () => {
            window.removeEventListener(
                "cryma-cart-updated",
                updateCart
            );

            window.removeEventListener(
                "cryma-user-updated",
                updateUser
            );

            window.removeEventListener(
                "storage",
                updateCart
            );

            window.removeEventListener(
                "storage",
                updateUser
            );
        };
    }, []);

    const userName =
        user?.first_name ||
        user?.firstName ||
        user?.name ||
        user?.email?.split("@")[0] ||
        "Account";

    const initials =
        `${user?.first_name?.charAt(0) || ""}${user?.last_name?.charAt(0) || ""}`
            .toUpperCase() ||
        userName.charAt(0).toUpperCase();

    const handleSearch = (event) => {
        event.preventDefault();

        const value = search.trim();

        if (!value) {
            navigate("/shop");
            return;
        }

        navigate(
            `/shop?search=${encodeURIComponent(value)}`
        );
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setAccountOpen(false);
        setLogoutOpen(false);
        setMobileOpen(false);

        navigate("/login", { replace: true });
    };

    const closeMobile = () => {
        setMobileOpen(false);
    };

    const closeMenus = () => {
        setAccountOpen(false);
        setMobileOpen(false);
    };

    return (
        <>
            <header className="cryma-global-navbar">
                <div className="cryma-navbar-inner">

                    {/* MOBILE MENU */}
                    <button
                        type="button"
                        className="cryma-mobile-toggle"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation"
                    >
                        <Menu size={20} />
                    </button>

                    {/* CRYMA WORDMARK */}
                    <NavLink
                        to="/"
                        className="cryma-navbar-logo"
                            onClick={closeMenus}
                        aria-label="CRYMA Home"
                    >
                        <span className="cryma-logo-mark">
                            C
                        </span>

                        <span className="cryma-logo-word">
                            CRYMA
                        </span>
                    </NavLink>

                    {/* MAIN NAVIGATION */}
                    <nav className="cryma-main-navigation">

                        <NavLink
                            to="/"
                            end
                            onClick={closeMenus}
                            className={({ isActive }) =>
                                `cryma-nav-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            Home
                        </NavLink>

                        <NavLink
                            to="/shop"
                            onClick={closeMenus}
                            className={({ isActive }) =>
                                `cryma-nav-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            Categories
                        </NavLink>

                        <NavLink
                            to="/orders"
                            onClick={closeMenus}
                            className={({ isActive }) =>
                                `cryma-nav-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            My Orders
                        </NavLink>

                        <NavLink
                            to="/buyer/chat"
                            onClick={closeMenus}
                            className={({ isActive }) =>
                                `cryma-nav-link ${
                                    isActive ? "active" : ""
                                }`
                            }
                        >
                            Messages
                        </NavLink>

                    </nav>

                    {/* SEARCH */}
                    <form
                        className="cryma-navbar-search"
                        onSubmit={handleSearch}
                    >
                        <Search size={16} />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search products"
                            aria-label="Search products"
                        />

                        {search && (
                            <button
                                type="button"
                                className="cryma-search-clear"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}

                        <button
                            type="submit"
                            className="cryma-search-submit"
                        >
                            Search
                        </button>
                    </form>

                    {/* RIGHT ACTIONS */}
                    <div className="cryma-navbar-actions">

                        <NavLink
                            to="/cart"
                            onClick={closeMenus}
                            className={({ isActive }) =>
                                `cryma-icon-action ${
                                    isActive ? "active" : ""
                                }`
                            }
                            aria-label="Shopping cart"
                        >
                            <ShoppingCart size={18} />

                            {cartCount > 0 && (
                                <span className="cryma-cart-badge">
                                    {cartCount > 99
                                        ? "99+"
                                        : cartCount}
                                </span>
                            )}
                        </NavLink>

                        {user ? (
                            <div className="cryma-account-container">

                                <button
                                    type="button"
                                    className={`cryma-account-trigger ${
                                        accountOpen ? "open" : ""
                                    }`}
                                    onClick={() =>
                                        setAccountOpen(
                                            (current) => !current
                                        )
                                    }
                                >
                                    <span className="cryma-avatar">
                                        {initials}
                                    </span>

                                    <span className="cryma-account-name">
                                        {userName}
                                    </span>

                                    <ChevronDown
                                        size={14}
                                        className={
                                            accountOpen
                                                ? "rotated"
                                                : ""
                                        }
                                    />
                                </button>

                                {accountOpen && (
                                    <div className="cryma-account-dropdown">

                                        {/* PROFILE HEADER */}
                                        <div className="cryma-account-heading">
                                            <span className="cryma-dropdown-avatar">
                                                {initials}
                                            </span>

                                            <div>
                                                <strong>
                                                    {userName}
                                                </strong>

                                                <small>
                                                    {user?.email}
                                                </small>
                                            </div>
                                        </div>

                                        <div className="cryma-dropdown-divider" />

                                        {/* ACCOUNT */}
                                        <NavLink
                                            to="/account"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <UserRound size={16} />
                                            My Account
                                        </NavLink>

                                        {/* FAVORITES */}
                                        <NavLink
                                            to="/wishlist"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <Heart size={16} />
                                            Favorites
                                        </NavLink>

                                        {/* SETTINGS */}
                                        <NavLink
                                            to="/account"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <Settings size={16} />
                                            Account Settings
                                        </NavLink>

                                        <div className="cryma-dropdown-divider" />

                                        {/* SIGN OUT */}
                                        <button
                                            type="button"
                                            className="cryma-logout-button"
                                            onClick={() => {
                                                setAccountOpen(false);
                                                setLogoutOpen(true);
                                            }}
                                        >
                                            <LogOut size={16} />
                                            Sign Out
                                        </button>

                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="cryma-signin-button"
                                onClick={() => navigate("/login")}
                            >
                                <UserRound size={17} />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* MOBILE NAVIGATION */}
            {mobileOpen && (
                <div
                    className="cryma-mobile-overlay"
                    onClick={closeMobile}
                >
                    <aside
                        className="cryma-mobile-panel"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="cryma-mobile-header">
                            <NavLink
                                to="/"
                                onClick={closeMobile}
                                className="cryma-mobile-logo"
                            >
                                <span className="cryma-logo-mark">
                                    C
                                </span>
                                <span className="cryma-logo-word">
                                    CRYMA
                                </span>
                            </NavLink>

                            <button
                                type="button"
                                onClick={closeMobile}
                                aria-label="Close navigation"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <div className="cryma-mobile-user">
                            <span className="cryma-avatar large">
                                {user ? initials : "G"}
                            </span>

                            <div>
                                <strong>
                                    {user
                                        ? userName
                                        : "Guest"}
                                </strong>

                                <span>
                                    {user
                                        ? "CRYMA Buyer"
                                        : "Browse as guest"}
                                </span>
                            </div>
                        </div>

                        <nav className="cryma-mobile-navigation">

                            <NavLink
                                to="/"
                                end
                                onClick={closeMobile}
                            >
                                Home
                            </NavLink>

                            <NavLink
                                to="/shop"
                                onClick={closeMobile}
                            >
                                Categories
                            </NavLink>

                            <NavLink
                                to="/cart"
                                onClick={closeMobile}
                            >
                                Cart
                                {cartCount > 0 && (
                                    <span>
                                        {cartCount}
                                    </span>
                                )}
                            </NavLink>

                            <NavLink
                                to="/orders"
                                onClick={closeMobile}
                            >
                                My Orders
                            </NavLink>

                            <NavLink
                                to="/buyer/chat"
                                onClick={closeMobile}
                            >
                                Messages
                            </NavLink>

                            {user && (
                                <>
                                    <NavLink
                                        to="/wishlist"
                                        onClick={closeMobile}
                                    >
                                        Favorites
                                    </NavLink>

                                    <NavLink
                                        to="/account"
                                        onClick={closeMobile}
                                    >
                                        My Account
                                    </NavLink>
                                </>
                            )}

                        </nav>

                        {!user && (
                            <button
                                type="button"
                                className="cryma-mobile-signin"
                                onClick={() => {
                                    closeMobile();
                                    navigate("/login");
                                }}
                            >
                                <UserRound size={17} />
                                Sign In
                            </button>
                        )}
                    </aside>
                </div>
            )}

            {/* LOGOUT MODAL */}
            {logoutOpen && (
                <div
                    className="cryma-logout-overlay"
                    onClick={() => setLogoutOpen(false)}
                >
                    <div
                        className="cryma-logout-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="cryma-logout-icon">
                            <LogOut size={21} />
                        </div>

                        <h2>
                            Sign out of CRYMA?
                        </h2>

                        <p>
                            You will need to sign in again
                            to access your buyer account.
                        </p>

                        <div className="cryma-logout-actions">
                            <button
                                type="button"
                                className="cryma-cancel-button"
                                onClick={() =>
                                    setLogoutOpen(false)
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="cryma-confirm-logout"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default BuyerNavbar;