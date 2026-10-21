import { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard/ProductCard";
import "./Wishlist.css";

const WISHLIST_KEY = "cryma_wishlist";

function getWishlist() {
    try {
        const value = JSON.parse(
            localStorage.getItem(WISHLIST_KEY) || "[]"
        );

        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function Wishlist() {
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const loadWishlist = async () => {
        setLoading(true);
        setLoadError(false);

        try {
            const wishlistIds = getWishlist();

            if (!wishlistIds.length) {
                setProducts([]);
                return;
            }

            const wantedIds = new Set(wishlistIds.map(String));
            const items = [];
            let lastPage = 1;

            for (let page = 1; page <= lastPage; page += 1) {
                const response = await api.get("/products", {
                    params: { per_page: 100, page },
                });
                const payload = response.data;
                const pageItems = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data?.data)
                        ? payload.data.data
                        : Array.isArray(payload?.data)
                            ? payload.data
                            : Array.isArray(payload?.products)
                                ? payload.products
                                : [];

                items.push(...pageItems);
                lastPage = Math.max(1, Number(payload?.data?.last_page) || 1);

                if (wantedIds.size && items.filter((product) => wantedIds.has(String(product.id))).length >= wantedIds.size) {
                    break;
                }
            }

            const savedProducts = items.filter((product) =>
                wantedIds.has(String(product.id))
            );

            setProducts(savedProducts);
        } catch (error) {
            console.error(
                "Unable to load favorites:",
                error
            );

            setProducts([]);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const refresh = () => loadWishlist();
        const initialLoad = window.setTimeout(refresh, 0);

        window.addEventListener(
            "cryma-wishlist-updated",
            refresh
        );

        return () => {
            window.removeEventListener(
                "cryma-wishlist-updated",
                refresh
            );
            window.clearTimeout(initialLoad);
        };
    }, []);

    return (
        <main className="wishlist-page">
            <div className="wishlist-container">

                <header className="wishlist-header">
                    <div className="wishlist-heading-icon">
                        <Heart size={19} />
                    </div>

                    <div>
                        <p>YOUR SAVED ITEMS</p>
                        <h1>Favorites</h1>
                        <span>
                            Products you want to keep
                            close.
                        </span>
                    </div>
                </header>

                {loading ? (
                    <div className="wishlist-empty">
                        <div className="wishlist-spinner" />
                        <p>
                            Loading your favorites...
                        </p>
                    </div>
                ) : loadError ? (
                    <div className="wishlist-empty" role="alert">
                        <h2>Unable to load favorites</h2>
                        <p>Please check your connection and try again.</p>
                        <button type="button" onClick={loadWishlist}>Try again</button>
                    </div>
                ) : products.length > 0 ? (
                    <div className="wishlist-grid">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onSave={(savedProduct, added) => {
                                    if (!added) {
                                        setProducts((current) => current.filter(
                                            (item) => String(item.id) !== String(savedProduct.id)
                                        ));
                                    }
                                }}
                                onAddToCart={(item) => {
                                    const event = new CustomEvent(
                                        "cryma-add-to-cart",
                                        { detail: item, cancelable: true }
                                    );
                                    window.dispatchEvent(event);
                                    return !event.defaultPrevented;
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="wishlist-empty">

                        <div className="wishlist-empty-icon">
                            <Heart size={22} />
                        </div>

                        <h2>
                            No favorites yet
                        </h2>

                        <p>
                            Tap the heart on any product
                            you want to save.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/shop")
                            }
                        >
                            <ShoppingBag size={15} />
                            Browse Products
                        </button>

                    </div>
                )}

            </div>
        </main>
    );
}

export default Wishlist;
