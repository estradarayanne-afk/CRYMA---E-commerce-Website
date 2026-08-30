// import { useMemo, useState, useEffect } from "react";
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const categories = ["All", "New in", "For her", "For him", "Living"];

const products = [
	{ id: 1, name: "Ribbed Knit Co-ord", category: "New in", price: 68, note: "Soft cotton blend", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=85" },
	{ id: 2, name: "Contour Shoulder Bag", category: "For her", price: 84, note: "Vegan leather", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85" },
	{ id: 3, name: "Everyday Overshirt", category: "For him", price: 92, note: "Brushed twill", image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85" },
	{ id: 4, name: "Sculptural Table Lamp", category: "Living", price: 56, note: "Warm ambient light", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85" },
	{ id: 5, name: "Linen Wrap Dress", category: "For her", price: 74, note: "Breathable linen", image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85" },
	{ id: 6, name: "Merino Crew Neck", category: "For him", price: 88, note: "100% merino wool", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85" },
	{ id: 7, name: "Ceramic Vase Set", category: "Living", price: 45, note: "Hand-thrown ceramic", image: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=900&q=85" },
	{ id: 8, name: "Tailored Blazer", category: "New in", price: 128, note: "Italian fabric", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85" },
];

function Home() {
	const navigate = useNavigate();
	const [activeCategory, setActiveCategory] = useState("All");
	const [search, setSearch] = useState("");
	const [cartCount, setCartCount] = useState(0);
	const [saved, setSaved] = useState([]);
	const [toast, setToast] = useState(false);
	const [logoutToast, setLogoutToast] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	// const [user, setUser] = useState(null);
	const user = (() => {
			const stored = localStorage.getItem("user");

			if (!stored) return null;

			try {
					return JSON.parse(stored);
			} catch {
					return null;
			}
	})();

	// useEffect(() => {
	// 	const stored = localStorage.getItem("user");
	// 	if (stored) {
	// 		try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
	// 	}
	// }, []);

	const isLoggedIn = !!localStorage.getItem("token");

	const visibleProducts = useMemo(() => products.filter((p) => {
		const matchCat = activeCategory === "All" || p.category === activeCategory;
		const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
		return matchCat && matchSearch;
	}), [activeCategory, search]);

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

	return (
		<div className="sf">
			{/* LOGOUT TOAST */}
			{logoutToast && (
				<div className="sf-toast sf-toast--success">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
					<span>Signed out successfully.</span>
				</div>
			)}
			{/* TOAST */}
			{toast && (
				<div className="sf-toast">
					<span>Sign in to add items to your bag</span>
					<button type="button" onClick={() => { setToast(false); navigate("/buyer-login", { state: { from: "/" } }); }}>Sign in</button>
				</div>
			)}

			{/* ANNOUNCEMENT */}
			<div className="sf-announce">Free delivery on orders over $75 &nbsp;·&nbsp; Easy 30-day returns</div>

			{/* HEADER */}
			<header className="sf-header">
				<button className="sf-hamburger" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
					<span /><span /><span />
				</button>

				<Link to="/" className="sf-brand">CRYMA<sup>®</sup></Link>

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
						<h1>Made for the<br /><em>in-between.</em></h1>
						<p className="sf-hero-sub">Thoughtful pieces for the way your days actually move. Considered design, uncomplicated living.</p>
						<a className="sf-cta" href="#shop">Explore the edit <span>→</span></a>
					</div>
					<div className="sf-hero-img">
						<img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=90" alt="Curated fashion" />
						<div className="sf-hero-badge"><span>01 / 04</span><strong>Quiet confidence</strong></div>
					</div>
				</section>

				{/* CATEGORIES + GRID */}
				<section className="sf-shop" id="shop">
					<div className="sf-shop-header">
						<div>
							<p className="sf-eyebrow">Curated for you</p>
							<h2>Find your next favorite.</h2>
						</div>
						<div className="sf-filters" role="tablist">
							{categories.map((c) => (
								<button key={c} type="button" role="tab" aria-selected={activeCategory === c} className={activeCategory === c ? "active" : ""} onClick={() => setActiveCategory(c)}>{c}</button>
							))}
						</div>
					</div>

					<div className="sf-grid" aria-live="polite">
						{visibleProducts.map((p) => (
							<article className="sf-card" key={p.id}>
								<div className="sf-card-img">
									<img src={p.image} alt={p.name} loading="lazy" />
									<button className={`sf-save${saved.includes(p.id) ? " saved" : ""}`} type="button" onClick={() => toggleSaved(p.id)} aria-label={`${saved.includes(p.id) ? "Remove" : "Save"} ${p.name}`}>
										{saved.includes(p.id) ? (
											<svg width="16" height="16" viewBox="0 0 24 24" fill="#e05252" stroke="#e05252" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
										) : (
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
										)}
									</button>
									<button className="sf-add" type="button" onClick={handleAddToBag}>Add to bag</button>
								</div>
								<div className="sf-card-info">
									<div>
										<h3>{p.name}</h3>
										<p>{p.note}</p>
									</div>
									<strong>${p.price.toFixed(2)}</strong>
								</div>
							</article>
						))}
						{visibleProducts.length === 0 && <p className="sf-empty">No pieces found — try a different search.</p>}
					</div>
				</section>

				{/* VALUES */}
				<section className="sf-values" id="journal">
					<div className="sf-value">
						<span className="sf-value-num">01</span>
						<h3>Designed to last</h3>
						<p>Fewer, better things with a place in your everyday.</p>
					</div>
					<div className="sf-value">
						<span className="sf-value-num">02</span>
						<h3>Made with care</h3>
						<p>Honest materials and responsible partners.</p>
					</div>
					<div className="sf-value">
						<span className="sf-value-num">03</span>
						<h3>Here when needed</h3>
						<p>Real people, ready to help you find your fit.</p>
					</div>
				</section>
			</main>

			{/* FOOTER */}
			<footer className="sf-footer">
				<Link to="/" className="sf-brand">CRYMA<sup>®</sup></Link>
				<p>Objects, clothes, and ideas for living well.</p>
				<span>© 2026 Cryma</span>
			</footer>
		</div>
	);
}

export default Home;
