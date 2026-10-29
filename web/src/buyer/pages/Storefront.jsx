import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart, Store } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/services/api";
import { getBuyerWishlist, isBuyerSession, requestBuyerSignIn, saveBuyerWishlist, showBuyerToast } from "../../shared/utils/buyerAccess";
import { toggleWishlistProduct } from "../../shared/utils/buyerProductActions";
import "./Storefront.css";

function StoreProductCard({ product }) {
    const image = product.image || product.images?.[0] || "";
    const price = Number(product.price || 0);
    const originalPrice = Number(product.original_price || 0);
    const [wishlist, setWishlist] = useState(getBuyerWishlist);
    const isSaved = wishlist.some((id) => String(id) === String(product.id));

    useEffect(() => {
        const syncWishlist = () => setWishlist(getBuyerWishlist());
        window.addEventListener("cryma-wishlist-updated", syncWishlist);
        window.addEventListener("storage", syncWishlist);
        return () => {
            window.removeEventListener("cryma-wishlist-updated", syncWishlist);
            window.removeEventListener("storage", syncWishlist);
        };
    }, []);

    const saveFavorite = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to save favorites",
                message: "Create an account or sign in to save products to your wishlist.",
            });
            return;
        }
        const { ids, added } = toggleWishlistProduct(wishlist, product.id);
        if (!saveBuyerWishlist(ids)) {
            showBuyerToast("Unable to update favorites. Please try again.", "error");
            return;
        }
        setWishlist(ids);
        showBuyerToast(added ? "Added to favorites" : "Removed from favorites");
    };

    return (
        <article className="public-store-product">
            <Link className="public-store-product-link" to={`/products/${product.id}`}>
                <div className="public-store-product-image">{product.seller?.is_on_vacation && <span className="public-store-vacation-badge">On vacation</span>}{image ? <img src={image} alt={product.name} loading="lazy" /> : <span className="public-store-product-fallback">{product.name?.charAt(0)?.toUpperCase() || "C"}</span>}</div>
                <div className="public-store-product-copy"><span>{product.category}</span><h3>{product.name}</h3><strong>{String.fromCharCode(8369)}{price.toLocaleString()}</strong>{originalPrice > price && <del>{String.fromCharCode(8369)}{originalPrice.toLocaleString()}</del>}</div>
            </Link>
            <button type="button" className={`public-store-product-save${isSaved ? " saved" : ""}`} onClick={saveFavorite} aria-pressed={isSaved} aria-label={isSaved ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}><Heart size={16} fill={isSaved ? "currentColor" : "none"} /></button>
        </article>
    );
}

function PublicStorefront() {
    const { slug } = useParams();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError("");
        setSelectedCategory("all");
        api.get(`/stores/${encodeURIComponent(slug)}`)
            .then(({ data }) => {
                if (cancelled) return;
                setStore(data.data.store);
                setProducts(data.data.products || []);
            })
            .catch(() => { if (!cancelled) setError("This storefront is unavailable right now."); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [slug]);

    const settings = store?.settings || {};
    const availableCategories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
    const categoryOrder = Array.isArray(settings.categories) ? settings.categories : availableCategories;
    const visibleCategories = categoryOrder.filter((category) => availableCategories.includes(category));
    const selectedProducts = selectedCategory === "all" ? products : products.filter((product) => product.category === selectedCategory);
    const featuredProducts = (settings.show_featured && Array.isArray(settings.featured_product_ids))
        ? settings.featured_product_ids.map((id) => products.find((product) => String(product.id) === String(id))).filter(Boolean)
        : [];
    const sections = settings.show_categories
        ? (selectedCategory === "all" ? (visibleCategories.length ? visibleCategories : ["All products"]) : [selectedCategory])
        : (selectedCategory === "all" ? ["All products"] : [selectedCategory]);

    if (loading) return <main className="public-store-page"><p className="public-store-state">Loading storefront…</p></main>;
    if (error || !store) return <main className="public-store-page"><p className="public-store-state">{error || "Store not found."}</p><Link to="/shop"><ArrowLeft size={15} /> Back to shopping</Link></main>;

    return (
        <main className="public-store-page" style={{ "--store-accent": store.accent_color || "#7E1830" }}>
            <div className="public-store-banner" style={store.banner_url ? { backgroundImage: `linear-gradient(90deg,rgba(30,12,18,.58),rgba(30,12,18,.08)),url("${store.banner_url}")` } : undefined} />
            {store.on_vacation && <div className="public-store-vacation-notice" role="status"><strong>On vacation</strong><span>This seller is temporarily not accepting orders. You can still browse and favorite products.</span></div>}
            <section className="public-store-profile">
                <div className="public-store-logo">{store.logo_url ? <img src={store.logo_url} alt={`${store.name} logo`} /> : <span>{store.name?.charAt(0)?.toUpperCase() || <Store />}</span>}</div>
                <div className="public-store-copy"><span className="public-store-kicker">OFFICIAL STORE</span><h1>{store.name}</h1>{store.tagline && <p>{store.tagline}</p>}</div>
                <Link to="/shop" className="public-store-back"><ArrowLeft size={15} /> Browse CRYMA</Link>
            </section>

            <section className="public-store-hero">
                <span>WELCOME TO {store.name?.toLocaleUpperCase()}</span>
                <h2>{settings.hero_title || store.name}</h2>
                <p>{settings.hero_subtitle || store.tagline || store.description || "Discover products selected for you."}</p>
            </section>

            {store.description && <p className="public-store-description">{store.description}</p>}

            {settings.show_categories && visibleCategories.length > 0 && <nav className="public-store-categories" aria-label="Shop store categories">
                <button type="button" className={selectedCategory === "all" ? "is-active" : ""} onClick={() => setSelectedCategory("all")}>All products</button>
                {visibleCategories.map((category) => <button type="button" key={category} className={selectedCategory === category ? "is-active" : ""} onClick={() => setSelectedCategory(category)}>{category}</button>)}
            </nav>}

            {selectedCategory === "all" && featuredProducts.length > 0 && <section className="public-store-products public-store-featured">
                <div className="public-store-section-heading"><div><span>SELLER PICKS</span><h2>Featured products</h2></div><p>{featuredProducts.length} featured</p></div>
                <div className="public-store-grid">{featuredProducts.map((product) => <StoreProductCard product={product} key={`featured-${product.id}`} />)}</div>
            </section>}

            <div className="public-store-collections">
                {sections.map((category) => {
                    const categoryProducts = category === "All products" ? products : selectedProducts.filter((product) => product.category === category);
                    if (!categoryProducts.length) return null;
                    return <section className="public-store-products" key={category}>
                        <div className="public-store-section-heading"><div><span>SHOP BY CATEGORY</span><h2>{category}</h2></div><p>{categoryProducts.length} {categoryProducts.length === 1 ? "product" : "products"}</p></div>
                        <div className="public-store-grid">{categoryProducts.map((product) => <StoreProductCard product={product} key={`${category}-${product.id}`} />)}</div>
                    </section>;
                })}
            </div>
            {!products.length && <div className="public-store-empty">This store is getting ready. Check back soon for new products.</div>}
        </main>
    );
}

export default PublicStorefront;