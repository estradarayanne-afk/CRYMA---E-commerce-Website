import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../shared/services/api";
import logo from "../../assets/CRYMA LOGO.png";
import { CATEGORY_FILTERS } from "../../shared/constants/categories";

const CATEGORY_CARDS = [
    { name: "Pet Supplies", image: "https://images.unsplash.com/photo-1589924691106-073b4f2c4d74?auto=format&fit=crop&w=420&q=85" },
    { name: "Electronics & Gadgets", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=420&q=85" },
    { name: "Women's Apparel", image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=420&q=85" },
    { name: "Men's Apparel", image: "https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=420&q=85" },
    { name: "Kids & Baby", image: "https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=420&q=85" },
    { name: "Home & Garden", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=420&q=85" },
    { name: "Sports & Outdoors", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=420&q=85" },
    { name: "Health & Beauty", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=420&q=85" },
    { name: "Books & Media", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=420&q=85" },
    { name: "Food & Gourmet", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=420&q=85" },
    { name: "Automotive & Motorcycle", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=420&q=85" },
    { name: "Furniture & Office Equipment", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=420&q=85" },
    { name: "Jewelry & Watches", image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=420&q=85" },
    { name: "Office & School Supplies", image: "https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=420&q=85" },
];

function Home() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [cartCount, setCartCount] = useState(() => JSON.parse(localStorage.getItem("cryma_cart") || "[]").reduce((sum, item) => sum + item.quantity, 0));
    const [saved, setSaved] = useState([]);
    const [toast, setToast] = useState(false);
    const [logoutToast, setLogoutToast] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const user = (() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    })();

    useEffect(() => {
        if (localStorage.getItem("token") && user?.role === "admin") {
            navigate("/admin/dashboard", { replace: true });
        }
        if (localStorage.getItem("token") && user?.role === "seller") {
            navigate("/seller/dashboard", { replace: true });
        }
    }, [navigate, user?.role]);

    useEffect(() => {
        api.get("/products", { params: { per_page: 50 } })
            .then(({ data }) => setProducts(data.data?.data ?? data.data ?? []))
            .catch(() => setProducts([]))
            .finally(() => setLoadingProducts(false));
    }, []);

    const isLoggedIn = !!localStorage.getItem("token");

    const visibleProducts = useMemo(() => products.filter((p) => {
        const matchCat = activeCategory === "All" || p.category === activeCategory;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    }), [products, activeCategory, search]);

    const dealProducts = visibleProducts.slice(0, 8);

    const toggleSaved = (id) => {
        if (!isLoggedIn) {
            navigate("/login", { state: { from: "/" } });
            return;
        }

        setSaved((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    };

    const handleAddToBag = (product) => {
        if (!isLoggedIn) {
            setToast(true);
            setTimeout(() => setToast(false), 3500);
            return false;
        }
        const cart = JSON.parse(localStorage.getItem("cryma_cart") || "[]");
        const existing = cart.find((item) => item.id === product.id);
        if (existing) existing.quantity += 1;
        else cart.push({ ...product, quantity: 1 });
        localStorage.setItem("cryma_cart", JSON.stringify(cart));
        setCartCount((c) => c + 1);
        return true;
    };

    const openProduct = (product) => {
        if (!isLoggedIn) {
            navigate("/login", { state: { from: `/products/${product.id}` } });
            return;
        }

        navigate(`/products/${product.id}`);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCartCount(0);
        setLogoutToast(true);
        setTimeout(() => setLogoutToast(false), 3000);
    };

    const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "";

    const getImage = (p) => p.image || null;

    return (
        <div className="sf">
            {logoutToast && (
                <div className="sf-toast sf-toast--success">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Signed out successfully.</span>
                </div>
            )}
            {toast && (
                <div className="sf-toast">
                    <span>Sign in to add items to your bag</span>
                    <button type="button" onClick={() => { setToast(false); navigate("/login", { state: { from: "/" } }); }}>Sign in</button>
                </div>
            )}

            <header className="sf-header">
                <button className="sf-hamburger" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
                    <span /><span /><span />
                </button>

                <Link to="/" className="sf-brand" aria-label="Cryma home">
                    <img src={logo} alt="Cryma logo" />
                </Link>

                <nav className={`sf-nav${menuOpen ? " open" : ""}`}>
                    <a href="#shop" onClick={() => setMenuOpen(false)}>Shop</a>
                </nav>

                <div className="sf-actions">
                    <label className="sf-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search" />
                    </label>

                    {isLoggedIn ? (
                        <div className="sf-user-menu">
                            <button className="sf-avatar" type="button" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile menu" aria-expanded={profileOpen}>{initials || "U"}</button>
                            <div className={`sf-user-dropdown${profileOpen ? " open" : ""}`}>
                                <span className="sf-user-name">{user ? `${user.first_name} ${user.last_name}` : "Account"}</span>
                                <Link to="/account" onClick={() => setProfileOpen(false)}>Profile settings</Link>
                                <Link to="/orders">My Orders</Link>
                                <button type="button" onClick={handleLogout}>Sign out</button>
                            </div>
                        </div>
                    ) : (
                        <Link to="/login" className="sf-icon-btn" aria-label="Sign in">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </Link>
                    )}

                    <button className="sf-bag-btn" type="button" aria-label="Bag" onClick={() => navigate("/cart")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        {cartCount > 0 && <span className="sf-bag-count">{cartCount}</span>}
                    </button>
                </div>
            </header>

            <main>
                <section className="market-hero">
                    <div className="market-hero-copy">
                        <span className="market-sale-pill">MEGA SALE - UP TO 40% OFF</span>
                        <h1>Everything for Every Lifestyle.</h1>
                        <p>Discover thousands of products from verified Filipino sellers. Fast delivery, secure payments, and 100% buyer protection.</p>
                        <div className="market-hero-actions">
                            <a className="market-primary-button" href="#shop">Shop Now</a>
                            <a className="market-secondary-button" href="#deals">View Deals</a>
                        </div>
                    </div>
                    <div className="market-trending">
                        <span>🔥 &nbsp;Trending Now</span>
                        {dealProducts.slice(0, 3).map((p) => (
                            <button type="button" key={p.id} onClick={() => openProduct(p)}>
                                {getImage(p) ? <img src={getImage(p)} alt="" /> : <div className="market-image-placeholder" aria-label="Image unavailable">CRYMA</div>}
                                <span><strong>{p.name}</strong><b>₱{Number(p.price).toLocaleString()}</b></span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="market-section market-categories" id="shop">
                    <div className="market-section-heading"><h2>Shop by Category</h2><button type="button" onClick={() => setActiveCategory("All")}>View All <span>›</span></button></div>
                    <div className="category-rail">
                        {CATEGORY_CARDS.map((category) => (
                            <button type="button" key={category.name} onClick={() => setActiveCategory(category.name)}>
                                <img src={category.image} alt="" /><span>{category.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="market-section market-deals" id="deals">
                    <div className="market-section-heading"><h2>⚡ Flash Deals <span className="deal-timer">● 02:14:38</span></h2><div className="deal-filter-row">{CATEGORY_FILTERS.slice(0, 4).map((c) => <button key={c} type="button" className={activeCategory === c ? "active" : ""} onClick={() => setActiveCategory(c)}>{c}</button>)}</div></div>
                    <div className="market-product-grid" aria-live="polite">
                        {loadingProducts && <p className="sf-empty">Loading products…</p>}
                        {!loadingProducts && dealProducts.map((p, index) => (
                            <article className="market-product-card" key={p.id} onClick={() => openProduct(p)}>
                                <div className="market-product-image"><span className="discount-badge">-{28 + (index % 9)}%</span>{getImage(p) ? <img src={getImage(p)} alt={p.name} loading="lazy" /> : <div className="market-image-placeholder" aria-label="Image unavailable">CRYMA</div>}<button type="button" className={`market-save${saved.includes(p.id) ? " saved" : ""}`} onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }} aria-label={`${saved.includes(p.id) ? "Remove" : "Save"} ${p.name}`}>♡</button></div>
                                <div className="market-product-info"><h3>{p.name}</h3><div className="product-meta"><span>★★★★★ <small>({120 + index * 217})</small></span><small>{(index + 1) * 1.8}K sold</small></div><strong>₱{Number(p.price).toLocaleString()}</strong><del>₱{Math.round(Number(p.price) * 1.32).toLocaleString()}</del><p>{p.seller ? `${p.seller.first_name} ${p.seller.last_name}` : "Verified marketplace seller"}</p><button type="button" onClick={(e) => { e.stopPropagation(); handleAddToBag(p); }}>Add to Cart</button></div>
                            </article>
                        ))}
                        {!loadingProducts && dealProducts.length === 0 && <p className="sf-empty">No products found - try a different search.</p>}
                    </div>
                </section>

                <section className="market-promo-grid">
                    <button type="button" onClick={() => setActiveCategory("Electronics & Gadgets")}><span>New Arrivals</span><strong>Tech &amp; Gadgets</strong><b>Shop Now →</b></button>
                    <button type="button" onClick={() => setActiveCategory("Women's Apparel")}><span>Fashion Week</span><strong>Trending Style</strong><b>Shop Now →</b></button>
                </section>
            </main>

            <footer className="sf-footer">
                <Link to="/" className="sf-brand" aria-label="Cryma home">
                    <img src={logo} alt="Cryma logo" />
                </Link>
                <p>“Everything for Every Lifestyle.”</p>
                <span>© 2026 Cryma</span>
            </footer>
        </div>
    );
}

export default Home;
