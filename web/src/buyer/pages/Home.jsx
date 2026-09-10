import { useMemo, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../shared/services/api";
import logo from "../../assets/CRYMA LOGO.png";

const CATEGORIES = ["All", "Clothing", "Accessories", "Living", "Electronics", "Other"];

// Fallback images per category when no product image is available
const CATEGORY_IMAGES = {
    Clothing:    "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85",
    Accessories: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85",
    Living:      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    Electronics: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=85",
    Other:       "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=85",
};
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85";

function Home() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [activeCategory, setActiveCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [cartCount, setCartCount] = useState(0);
    const [saved, setSaved] = useState([]);
    const [toast, setToast] = useState(false);
    const [logoutToast, setLogoutToast] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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
    }, []);

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

    const toggleSaved = (id) => setSaved((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

    const handleAddToBag = () => {
        if (!isLoggedIn) { setToast(true); setTimeout(() => setToast(false), 3500); return; }
        setCartCount((c) => c + 1);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCartCount(0);
        setLogoutToast(true);
        setTimeout(() => setLogoutToast(false), 3000);
    };

    const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "";

    const getImage = (p) => p.image || CATEGORY_IMAGES[p.category] || DEFAULT_IMAGE;

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
                    <button type="button" onClick={() => { setToast(false); navigate("/buyer-login", { state: { from: "/" } }); }}>Sign in</button>
                </div>
            )}

            <div className="sf-announce">Free delivery on orders over ₱750 &nbsp;·&nbsp; Easy 30-day returns</div>

            <header className="sf-header">
                <button className="sf-hamburger" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
                    <span /><span /><span />
                </button>

                <Link to="/" className="sf-brand" aria-label="Cryma home">
                    <img src={logo} alt="Cryma logo" />
                </Link>

                <nav className={`sf-nav${menuOpen ? " open" : ""}`}>
                    <a href="#shop" onClick={() => setMenuOpen(false)}>Shop</a>
                    <a href="#edit" onClick={() => setMenuOpen(false)}>The Edit</a>
                    <a href="#journal" onClick={() => setMenuOpen(false)}>Journal</a>
                </nav>

                <div className="sf-actions">
                    <label className="sf-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search" />
                    </label>

                    {isLoggedIn ? (
                        <div className="sf-user-menu">
                            <button className="sf-avatar" type="button">{initials || "U"}</button>
                            <div className="sf-user-dropdown">
                                <span className="sf-user-name">{user ? `${user.first_name} ${user.last_name}` : "Account"}</span>
                                <Link to="/orders">My Orders</Link>
                                <button type="button" onClick={handleLogout}>Sign out</button>
                            </div>
                        </div>
                    ) : (
                        <Link to="/buyer-login" className="sf-icon-btn" aria-label="Sign in">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </Link>
                    )}

                    <button className="sf-bag-btn" type="button" aria-label="Bag">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        {cartCount > 0 && <span className="sf-bag-count">{cartCount}</span>}
                    </button>
                </div>
            </header>

            <main>
                {/* HERO */}
                <section className="sf-hero" id="edit">
                    <div className="sf-hero-content">
                        <p className="sf-eyebrow">New Season · 2026</p>
                        <h1>“Everything for Every Lifestyle.</h1>
                        <p className="sf-hero-sub">Thoughtful pieces for the way your days actually move. Considered design, uncomplicated living.</p>
                        <a className="sf-cta" href="#shop">Explore the edit <span>→</span></a>
                    </div>
                    <div className="sf-hero-img">
                        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90" alt="Curated fashion" />
                    </div>
                </section>

                {/* SHOP */}
                <section className="sf-shop" id="shop">
                    <div className="sf-shop-header">
                        <div>
                            <p className="sf-eyebrow">Curated for you</p>
                            <h2>Find your next favorite.</h2>
                        </div>
                        <div className="sf-filters" role="tablist">
                            {CATEGORIES.map((c) => (
                                <button key={c} type="button" role="tab" aria-selected={activeCategory === c} className={activeCategory === c ? "active" : ""} onClick={() => setActiveCategory(c)}>{c}</button>
                            ))}
                        </div>
                    </div>

                    <div className="sf-grid" aria-live="polite">
                        {loadingProducts && (
                            <p className="sf-empty">Loading products…</p>
                        )}
                        {!loadingProducts && visibleProducts.map((p) => (
                            <article className="sf-card" key={p.id} onClick={() => navigate(`/products/${p.id}`)} style={{ cursor: "pointer" }}>
                                <div className="sf-card-img">
                                    <img src={getImage(p)} alt={p.name} loading="lazy" />
                                    <button
                                        className={`sf-save${saved.includes(p.id) ? " saved" : ""}`}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }}
                                        aria-label={`${saved.includes(p.id) ? "Remove" : "Save"} ${p.name}`}
                                    >
                                        {saved.includes(p.id) ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#e05252" stroke="#e05252" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                        )}
                                    </button>
                                    <button className="sf-add" type="button" onClick={(e) => { e.stopPropagation(); handleAddToBag(); }}>Add to bag</button>
                                </div>
                                <div className="sf-card-info">
                                    <div>
                                        <h3>{p.name}</h3>
                                        <p>{p.description || p.category}</p>
                                    </div>
                                    <strong>₱{Number(p.price).toLocaleString()}</strong>
                                </div>
                            </article>
                        ))}
                        {!loadingProducts && visibleProducts.length === 0 && (
                            <p className="sf-empty">No pieces found — try a different search.</p>
                        )}
                    </div>
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
