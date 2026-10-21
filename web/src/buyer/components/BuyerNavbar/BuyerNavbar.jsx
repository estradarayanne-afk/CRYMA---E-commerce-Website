import { useEffect, useRef, useState } from "react";
import {
    Bell,
    Headset,
    ChevronDown,
    Heart,
    LogOut,
    Menu,
    MessageCircle,
    Package,
    Search,
    ShoppingCart,
    Ticket,
    UserRound,
    X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import { openAuthModal } from "../../../shared/components/authModalEvents";
import { PRODUCT_CATEGORIES } from "../../../shared/constants/categories";
import {
    getBuyerCart,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerCart,
    showBuyerToast,
} from "../../../shared/utils/buyerAccess";
import { getConversationIdentity } from "../../../shared/utils/getConversationIdentity";
import { getBuyerInboxConversations } from "../../../shared/utils/buyerInboxConversations";
import "./BuyerNavbar.css";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function getCartCount() {
    return getBuyerCart().reduce((total, item) => total + Number(item.quantity || 1), 0);
}

function getNotificationReadAt(userId) {
    try {
        const value = localStorage.getItem(`cryma_order_activity_read_at:${userId}`);
        return value ? new Date(value).getTime() || 0 : 0;
    } catch {
        return 0;
    }
}

function getOrderActivity(orders) {
    return (Array.isArray(orders) ? orders : []).flatMap((order) =>
        (Array.isArray(order.delivery_progress?.events) ? order.delivery_progress.events : []).map((event, index) => {
            const createdAt = event.created_at ? new Date(event.created_at).getTime() : 0;
            const label = String(event.new_status || event.event_type || "Order updated")
                .replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
            return { id: `${order.id}:${event.created_at || index}:${label}`, orderId: order.id, label, createdAt };
        })
    ).filter((item) => item.createdAt > 0).sort((a, b) => b.createdAt - a.createdAt).slice(0, 12);
}

function isAvailableCartItem(item) {
    if (item?.stock === null || item?.stock === undefined || item.stock === "") return true;
    const stock = Number(item.stock);
    return !Number.isFinite(stock) || (stock > 0 && Number(item.quantity || 1) <= stock);
}

function BuyerNavbar() {
    const navigate = useNavigate();
    const navbarRef = useRef(null);

    const [user, setUser] = useState(getStoredUser);
    const profileImageReference = user?.profile_image_url || user?.profile_image_path || "";
    const profileImageKey = user?.id && profileImageReference
        ? `${user.id}:${profileImageReference}`
        : "";
    const [profilePhoto, setProfilePhoto] = useState({ key: "", url: "" });
    const [failedProfilePhotoKey, setFailedProfilePhotoKey] = useState("");
    const [cartCount, setCartCount] = useState(getCartCount);
    const [search, setSearch] = useState("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [orderActivity, setOrderActivity] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState("");
    const [activityRefresh, setActivityRefresh] = useState(0);
    const [activityReadAt, setActivityReadAt] = useState(() => getNotificationReadAt(getStoredUser()?.id));
    const [messagesOpen, setMessagesOpen] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState("");
    const [conversations, setConversations] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState(getBuyerCart);
    const [searchFocused, setSearchFocused] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);

    useEffect(() => {
        if (!profileImageKey || user?.role !== "buyer" || !localStorage.getItem("token")) return undefined;

        let cancelled = false;
        let objectUrl = "";
        api.get("/account/profile-image", { responseType: "blob" })
            .then(({ data }) => {
                if (!data?.size) return;
                objectUrl = URL.createObjectURL(data);
                if (cancelled) {
                    URL.revokeObjectURL(objectUrl);
                    return;
                }
                setProfilePhoto({ key: profileImageKey, url: objectUrl });
                setFailedProfilePhotoKey("");
            })
            .catch(() => {
                if (!cancelled) setFailedProfilePhotoKey(profileImageKey);
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [profileImageKey, user?.role]);

    useEffect(() => {
        const updateCart = () => {
            setCartCount(getCartCount());
            setCartItems(getBuyerCart());
        };

        const updateUser = () => {
            const nextUser = getStoredUser();
            setUser(nextUser);
            setActivityReadAt(getNotificationReadAt(nextUser?.id));
        };

        window.addEventListener("cryma-cart-updated", updateCart);
        window.addEventListener("cryma-user-updated", updateUser);

        window.addEventListener("storage", updateCart);
        window.addEventListener("storage", updateUser);

        return () => {
            window.removeEventListener("cryma-cart-updated", updateCart);
            window.removeEventListener("cryma-user-updated", updateUser);

            window.removeEventListener("storage", updateCart);
            window.removeEventListener("storage", updateUser);
        };
    }, []);

    useEffect(() => {
        if (!notificationOpen || !isBuyerSession()) return undefined;
        let cancelled = false;
        const timeoutId = window.setTimeout(() => {
            setActivityLoading(true);
            setActivityError("");
            api.get("/orders", { params: { sort: "newest", per_page: 10 } })
                .then(({ data }) => {
                    if (cancelled) return;
                    const orders = data?.data?.data ?? data?.data ?? [];
                    setOrderActivity(getOrderActivity(orders));
                })
                .catch((error) => {
                    if (!cancelled) setActivityError(error.response?.data?.message || "Order activity could not be loaded.");
                })
                .finally(() => {
                    if (!cancelled) setActivityLoading(false);
                });
        }, 0);
        return () => { cancelled = true; window.clearTimeout(timeoutId); };
    }, [notificationOpen, activityRefresh]);

    useEffect(() => {
        if (!messagesOpen || !isBuyerSession()) return undefined;
        let cancelled = false;
        const timeoutId = window.setTimeout(() => {
            setChatLoading(true);
            setChatError("");
            api.get("/buyer/chat/conversations")
                .then((response) => {
                    if (!cancelled) {
                        const data = response.data?.data;
                        setConversations(Array.isArray(data) ? data : []);
                    }
                })
                .catch((error) => {
                    if (!cancelled) setChatError(error.response?.data?.message || "Messages are temporarily unavailable.");
                })
                .finally(() => {
                    if (!cancelled) setChatLoading(false);
                });
        }, 0);
        return () => { cancelled = true; window.clearTimeout(timeoutId); };
    }, [messagesOpen]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key !== "Escape") return;

            setMobileOpen(false);
            setAccountOpen(false);
            setNotificationOpen(false);
            setMessagesOpen(false);
            setCartOpen(false);
            setSearchFocused(false);
            setLogoutOpen(false);
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (navbarRef.current && !navbarRef.current.contains(event.target)) {
                setNotificationOpen(false);
                setMessagesOpen(false);
                setCartOpen(false);
                setAccountOpen(false);
                setSearchFocused(false);
            }
        };
        document.addEventListener("pointerdown", handleOutsideClick);
        return () => document.removeEventListener("pointerdown", handleOutsideClick);
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

    const logoDestination = user ? "/shop" : "/";
    const sellerConversations = getBuyerInboxConversations(conversations);
    const unreadActivityCount = orderActivity.filter((item) => item.createdAt > activityReadAt).length;
    const profilePhotoUrl = profilePhoto.key === profileImageKey && failedProfilePhotoKey !== profileImageKey
        ? profilePhoto.url
        : "";

    const handleSearch = (event) => {
        event.preventDefault();

        const value = search.trim();

        setSearchFocused(false);

        if (!value) {
            navigate("/shop");
            return;
        }

        try {
            const recent = JSON.parse(localStorage.getItem("cryma_recent_searches") || "[]");
            localStorage.setItem("cryma_recent_searches", JSON.stringify([value, ...recent.filter((item) => item !== value)].slice(0, 5)));
        } catch {
            localStorage.setItem("cryma_recent_searches", JSON.stringify([value]));
        }

        navigate(`/shop?search=${encodeURIComponent(value)}`);
        setMobileOpen(false);
        setSearch("");
    };

    const requireAuth = (mode = "login") => {
        setMobileOpen(false);
        setAccountOpen(false);
        setNotificationOpen(false);
        openAuthModal(mode);
    };

    const requireBuyer = (title = "Sign in to continue", message = "Create an account or sign in to use buyer features.", from) => {
        if (isBuyerSession()) return true;
        requestBuyerSignIn({ title, message, from });
        return false;
    };

    const closeMenus = () => {
        setAccountOpen(false);
        setNotificationOpen(false);
        setMessagesOpen(false);
        setCartOpen(false);
        setMobileOpen(false);
        setSearchFocused(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("cryma_cart");
        localStorage.removeItem("cryma_wishlist");
        localStorage.removeItem("cryma_checkout_item_ids");
        localStorage.removeItem("cryma_selected_cart_ids");

        window.dispatchEvent(new Event("cryma-cart-updated"));
        window.dispatchEvent(new Event("cryma-wishlist-updated"));

        setUser(null);
        setAccountOpen(false);
        setLogoutOpen(false);
        setMobileOpen(false);

        navigate("/", { replace: true });
    };

    const goTo = (path) => {
        closeMenus();
        navigate(path);
    };

    const checkoutMiniCart = () => {
        if (!requireBuyer("Sign in to checkout", "Sign in to continue to checkout.", "/checkout")) return;
        const checkoutItems = getBuyerCart().filter(isAvailableCartItem);
        if (!checkoutItems.length) return;
        const ids = checkoutItems.map((item) => item.id);
        localStorage.setItem("cryma_checkout_item_ids", JSON.stringify(ids));
        localStorage.setItem("cryma_selected_cart_ids", JSON.stringify(ids.map(String)));
        goTo("/checkout");
    };

    return (
        <>
            <header className="cryma-global-navbar" ref={navbarRef}>
                <div className="cryma-navbar-inner">

                    {/* MOBILE MENU */}
                    <button
                        type="button"
                        className="cryma-mobile-toggle"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation"
                        aria-expanded={mobileOpen}
                    >
                        <Menu size={21} strokeWidth={2.2} />
                    </button>

                    {/* LOGO */}
                    <NavLink
                        to={logoDestination}
                        className="cryma-navbar-logo"
                        onClick={closeMenus}
                        aria-label={user ? "CRYMA All Categories" : "CRYMA landing page"}
                    >
                        <span className="cryma-logo-mark">
                            C
                        </span>

                        <span className="cryma-logo-word">
                            CRYMA
                        </span>
                    </NavLink>

                    {/* MAIN NAVIGATION */}
                    <nav
                        className="cryma-main-navigation"
                        aria-label="Main navigation"
                    >
                        <NavLink
                            to="/shop"
                            end
                            onClick={closeMenus}
                            className={({ isActive }) => `cryma-nav-link${isActive ? " active" : ""}`}
                        >
                            All Categories
                        </NavLink>
                    </nav>

                    {/* SEARCH */}
                    <form
                        className="cryma-navbar-search"
                        onSubmit={handleSearch}
                    >
                        <Search
                            size={17}
                            strokeWidth={2}
                            aria-hidden="true"
                        />

                        <input
                            type="search"
                            maxLength={100}
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            onFocus={() => setSearchFocused(true)}
                            placeholder="Search products, brands & more"
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

                        {searchFocused && (
                            <div className="cryma-search-suggestions">
                                {(() => {
                                    let recent = [];
                                    try { recent = JSON.parse(localStorage.getItem("cryma_recent_searches") || "[]"); } catch { /* ignore malformed recent searches */ }
                                    return recent.length > 0 && (
                                        <div>
                                            <strong>Recent searches</strong>
                                            {recent.map((item) => (
                                                <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(item); navigate(`/shop?search=${encodeURIComponent(item)}`); setSearchFocused(false); }}>
                                                    <Search size={14} /> {item}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div>
                                    <strong>Browse categories</strong>
                                    {PRODUCT_CATEGORIES.slice(0, 5).map((category) => (
                                        <button key={category} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { navigate(`/shop?category=${encodeURIComponent(category)}`); setSearchFocused(false); }}>
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </form>

                    {/* RIGHT ACTIONS */}
                    <div className="cryma-navbar-actions">

                        {/* NOTIFICATIONS */}
                        <div className="cryma-action-container">
                            <button
                                type="button"
                                className={`cryma-icon-action ${
                                    notificationOpen ? "active" : ""
                                }`}
                                onClick={() => {
                                    setNotificationOpen(
                                        (current) => !current
                                    );
                                    setAccountOpen(false);
                                    setMessagesOpen(false);
                                    setCartOpen(false);
                                }}
                                aria-label="Notifications"
                                aria-expanded={notificationOpen}
                            >
                                <Bell size={18} />
                                {unreadActivityCount > 0 && <span className="cryma-notification-badge" aria-label={`${unreadActivityCount} unread order updates`}>{unreadActivityCount > 9 ? "9+" : unreadActivityCount}</span>}
                            </button>

                            {notificationOpen && (
                                <div className="cryma-notification-dropdown">
                                    <div className="cryma-dropdown-title">
                                        <strong>Order activity</strong>
                                        {unreadActivityCount > 0 && <button type="button" onClick={() => {
                                            const readAt = Date.now();
                                            setActivityReadAt(readAt);
                                            try { localStorage.setItem(`cryma_order_activity_read_at:${user?.id}`, new Date(readAt).toISOString()); } catch { /* The feed remains available without local storage. */ }
                                        }}>Mark all read</button>}
                                    </div>

                                    {!isBuyerSession() ? (
                                        <div className="cryma-empty-notification"><div className="cryma-notification-icon"><Bell size={20} /></div><strong>Sign in to see order updates</strong><span>Delivery activity for your purchases will appear here.</span><button type="button" onClick={() => requireAuth("login")}>Sign in</button></div>
                                    ) : activityLoading ? (
                                        <div className="cryma-empty-notification" role="status">Loading order activity…</div>
                                    ) : activityError ? (
                                        <div className="cryma-empty-notification" role="alert"><strong>{activityError}</strong><button type="button" onClick={() => setActivityRefresh((current) => current + 1)}>Retry</button></div>
                                    ) : orderActivity.length > 0 ? (
                                        <div className="cryma-notification-list">
                                            {orderActivity.map((item) => (
                                                <button type="button" className={`cryma-notification-item ${item.createdAt > activityReadAt ? "unread" : ""}`} key={item.id} onClick={() => goTo(`/orders/${item.orderId}`)}>
                                                    <span className="cryma-notification-item-icon"><Package size={16} /></span>
                                                    <span className="cryma-notification-item-copy"><strong>Order #{item.orderId}: {item.label}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span>
                                                </button>
                                            ))}
                                            <button type="button" className="cryma-notification-footer" onClick={() => goTo("/orders")}>View all orders</button>
                                        </div>
                                    ) : (
                                        <div className="cryma-empty-notification"><div className="cryma-notification-icon"><Bell size={20} /></div><strong>No order updates yet</strong><span>Delivery progress will appear here as your orders move through fulfillment.</span><button type="button" onClick={() => goTo("/orders")}>View my orders</button></div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* MESSAGES */}
                        <div className="cryma-action-container">
                            <button
                                type="button"
                                className={`cryma-icon-action ${messagesOpen ? "active" : ""}`}
                                onClick={() => {
                                    if (!requireBuyer("Sign in to view seller messages", "Sign in to contact marketplace sellers.", "/buyer/chat")) return;
                                    setMessagesOpen((current) => !current);
                                    setNotificationOpen(false);
                                    setCartOpen(false);
                                }}
                                aria-label="Seller messages"
                                aria-expanded={messagesOpen}
                            >
                                <MessageCircle size={18} />
                            </button>
                        </div>

                        {messagesOpen && (
                            <section className="cryma-messages-popover" aria-label="Recent conversations">
                                <header>
                                    <strong>Seller messages</strong>
                                    <button type="button" onClick={() => setMessagesOpen(false)} aria-label="Close messages"><X size={17} /></button>
                                </header>
                                {chatLoading ? (
                                    <p className="cryma-messages-state">Loading seller messages…</p>
                                ) : chatError ? (
                                    <p className="cryma-messages-state">{chatError}</p>
                                ) : sellerConversations.length > 0 ? sellerConversations.map((conversation) => {
                                    const latest = conversation.messages?.[0];
                                    const identity = getConversationIdentity(conversation);
                                    return (
                                        <button key={conversation.id} type="button" className="cryma-message-preview" onClick={() => { setMessagesOpen(false); navigate(`/buyer/chat?conversation=${conversation.id}`); }}>
                                            <span className={`cryma-message-avatar ${identity.type}`}>{identity.initials}</span>
                                            <span><strong>{identity.name}</strong><small>{latest?.message || conversation.product?.name || "Start a conversation"}</small></span>
                                            <time>{conversation.updated_at ? new Date(conversation.updated_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : ""}</time>
                                        </button>
                                    );
                                }) : (
                                    <p className="cryma-messages-state">No seller conversations yet. Contact a seller from a product page to start one.</p>
                                )}
                                <button type="button" className="cryma-open-messages" onClick={() => { setMessagesOpen(false); goTo("/buyer/chat"); }}>Open seller messages</button>
                                <button type="button" className="cryma-open-messages" onClick={() => { setMessagesOpen(false); goTo("/buyer/support"); }}>Contact Customer Service</button>
                            </section>
                        )}

                        {/* WISHLIST */}
                        <button
                            type="button"
                            className="cryma-icon-action"
                            onClick={() => requireBuyer("Sign in to view your wishlist", "Sign in to see products saved to your wishlist.", "/wishlist") && goTo("/wishlist")}
                            aria-label="Wishlist"
                        >
                            <Heart size={18} />
                        </button>

                        {/* CART */}
                        <div className="cryma-action-container">
                        <button
                            type="button"
                            className={`cryma-icon-action cryma-cart-action ${cartOpen ? "active" : ""}`}
                            onClick={() => {
                                if (!requireBuyer("Sign in to view your cart", "Create an account or sign in to shop on CRYMA.", "/cart")) return;
                                setCartItems(getBuyerCart());
                                setCartOpen((current) => !current);
                                setMessagesOpen(false);
                                setNotificationOpen(false);
                            }}
                            aria-label={`Shopping cart${
                                cartCount
                                    ? `, ${cartCount} items`
                                    : ""
                            }`}
                        >
                            <ShoppingCart size={18} />

                            {cartCount > 0 && (
                                <span className="cryma-cart-badge">
                                    {cartCount > 99
                                        ? "99+"
                                        : cartCount}
                                </span>
                            )}
                        </button>
                        {cartOpen && (
                            <div className="cryma-mini-cart">
                                <header><strong>Your Cart</strong><button type="button" onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={17} /></button></header>
                                {cartItems.length ? (
                                    <>
                                        <div className="cryma-mini-cart-items">
                                            {cartItems.slice(0, 4).map((item) => (
                                                <div className="cryma-mini-cart-item" key={item.id}>
                                                    <div className="cryma-mini-cart-image">{(item.image || item.image_url || item.thumbnail) ? <img src={item.image || item.image_url || item.thumbnail} alt="" /> : <ShoppingCart size={17} />}</div>
                                                    <div><strong>{item.name}</strong><small>Qty {Number(item.quantity || 1)} · ₱{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</small></div>
                                                    <button type="button" aria-label={`Remove ${item.name} from cart`} onClick={() => {
                                                        const next = getBuyerCart().filter((entry) => String(entry.id) !== String(item.id));
                                                        saveBuyerCart(next);
                                                        setCartItems(next);
                                                        showBuyerToast("Removed from Cart");
                                                    }}><X size={15} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="cryma-mini-cart-subtotal"><span>Subtotal</span><strong>₱{cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0).toLocaleString()}</strong></div>
                                    </>
                                ) : <p className="cryma-messages-state">Your cart is empty.</p>}
                                <footer><button type="button" onClick={() => goTo("/cart")}>View Cart</button><button type="button" disabled={!cartItems.some(isAvailableCartItem)} onClick={checkoutMiniCart}>Checkout</button></footer>
                            </div>
                        )}
                        </div>

                        {/* ACCOUNT */}
                        {user ? (
                            <div className="cryma-account-container">
                                <button
                                    type="button"
                                    className={`cryma-account-trigger ${
                                        accountOpen ? "open" : ""
                                    }`}
                                    onClick={() => {
                                        setAccountOpen(
                                            (current) => !current
                                        );
                                        setNotificationOpen(false);
                                        setMessagesOpen(false);
                                        setCartOpen(false);
                                    }}
                                    aria-expanded={accountOpen}
                                    aria-label="Open account menu"
                                >
                                    <span className="cryma-avatar">
                                        {profilePhotoUrl && (
                                            <img
                                                src={profilePhotoUrl}
                                                alt=""
                                                onError={() => setFailedProfilePhotoKey(profileImageKey)}
                                            />
                                        )}
                                        {!profilePhotoUrl && <span>{initials}</span>}
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

                                        {/* ACCOUNT HERO */}
                                        <div className="cryma-account-hero">
                                            <div className="cryma-account-cover" />

                                            <div className="cryma-account-profile">
                                                <span className="cryma-dropdown-avatar">
                                                    {profilePhotoUrl && (
                                                        <img
                                                            src={profilePhotoUrl}
                                                            alt=""
                                                            onError={() => setFailedProfilePhotoKey(profileImageKey)}
                                                        />
                                                    )}
                                                    {!profilePhotoUrl && <span>{initials}</span>}
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
                                        </div>

                                        <div className="cryma-dropdown-divider" />

                                        <NavLink
                                            to="/account"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <UserRound size={16} />
                                            My Account
                                        </NavLink>

                                        <NavLink
                                            to="/buyer/vouchers"
                                            onClick={() => setAccountOpen(false)}
                                        >
                                            <Ticket size={16} />
                                            Vouchers
                                        </NavLink>

                                        <NavLink
                                            to="/orders"
                                            onClick={() =>
                                                setAccountOpen(false)
                                            }
                                        >
                                            <Package size={16} />
                                            My Orders
                                        </NavLink>

                                        <NavLink
                                            to="/buyer/support"
                                            onClick={() => setAccountOpen(false)}
                                        >
                                            <Headset size={16} />
                                            Customer Service / Help Center
                                        </NavLink>

                                        <div className="cryma-dropdown-divider" />

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
                            <div className="cryma-guest-actions">
                                <button
                                    type="button"
                                    className="cryma-signin-button"
                                    onClick={() =>
                                        requireAuth("login")
                                    }
                                >
                                    Sign In
                                </button>

                                <button
                                    type="button"
                                    className="cryma-create-button"
                                    onClick={() =>
                                        requireAuth("register")
                                    }
                                >
                                    Create Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* MOBILE NAVIGATION */}
            {mobileOpen && (
                <div
                    className="cryma-mobile-overlay"
                    onClick={closeMenus}
                >
                    <aside
                        className="cryma-mobile-panel"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="cryma-mobile-header">
                            <NavLink
                                to={logoDestination}
                                onClick={closeMenus}
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
                                onClick={closeMenus}
                                aria-label="Close navigation"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        {/* MOBILE USER CARD */}
                        <div className="cryma-mobile-user">
                            <div className="cryma-mobile-user-photo">
                                {profilePhotoUrl && (
                                    <img
                                        src={profilePhotoUrl}
                                        alt=""
                                        onError={() => setFailedProfilePhotoKey(profileImageKey)}
                                    />
                                )}

                                <span className={`cryma-mobile-avatar${profilePhotoUrl ? " has-photo" : ""}`}>
                                    {!profilePhotoUrl && (user ? initials : "G")}
                                </span>
                            </div>

                            <div>
                                <strong>
                                    {user
                                        ? userName
                                        : "Welcome to CRYMA"}
                                </strong>

                                <span>
                                    {user
                                        ? "Your personal marketplace"
                                        : "Discover something beautiful"}
                                </span>
                            </div>
                        </div>

                        {/* MOBILE SEARCH */}
                        <form
                            className="cryma-mobile-search"
                            onSubmit={handleSearch}
                        >
                            <Search size={17} />

                            <input
                                type="search"
                                maxLength={100}
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search products..."
                                aria-label="Search products"
                            />

                            <button type="submit">
                                Search
                            </button>
                        </form>

                        <nav
                            className="cryma-mobile-navigation"
                            aria-label="Mobile navigation"
                        >
                            <NavLink
                                to="/shop"
                                onClick={closeMenus}
                            >
                                All Categories
                            </NavLink>

                            <button
                                type="button"
                                onClick={() => {
                                    if (user) {
                                        setMobileOpen(false);
                                        if (requireBuyer("Sign in to view seller messages", "Sign in to contact marketplace sellers.", "/buyer/chat")) setMessagesOpen(true);
                                    } else {
                                        requestBuyerSignIn({ title: "Sign in to view seller messages", message: "Sign in to contact marketplace sellers.", from: "/buyer/chat" });
                                    }
                                }}
                            >
                                Seller messages
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (requireBuyer("Sign in to view your wishlist", "Sign in to see products saved to your wishlist.", "/wishlist")) goTo("/wishlist");
                                }}
                            >
                                Wishlist
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (requireBuyer("Sign in to view your cart", "Create an account or sign in to shop on CRYMA.", "/cart")) goTo("/cart");
                                }}
                            >
                                <span>Cart</span>

                                {cartCount > 0 && (
                                    <span className="cryma-mobile-count">
                                        {cartCount > 99
                                            ? "99+"
                                            : cartCount}
                                    </span>
                                )}
                            </button>

                            {user && (
                                <>
                                    <NavLink
                                        to="/orders"
                                        onClick={closeMenus}
                                    >
                                        <span className="cryma-mobile-link-label">
                                            <Package size={16} aria-hidden="true" />
                                            My Orders
                                        </span>
                                    </NavLink>

                                    <NavLink
                                        to="/account"
                                        onClick={closeMenus}
                                    >
                                        My Account
                                    </NavLink>
                                </>
                            )}
                        </nav>

                        {!user && (
                            <div className="cryma-mobile-auth-actions">
                                <button
                                    type="button"
                                    className="cryma-mobile-signin"
                                    onClick={() =>
                                        requireAuth("login")
                                    }
                                >
                                    Sign In
                                </button>

                                <button
                                    type="button"
                                    className="cryma-mobile-create"
                                    onClick={() =>
                                        requireAuth("register")
                                    }
                                >
                                    Create Account
                                </button>
                            </div>
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
                        <div className="cryma-logout-image">
                            <div className="cryma-logout-icon">
                                <LogOut size={21} />
                            </div>
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
