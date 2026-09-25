import { useEffect, useState } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard.jsx/ProductCard";
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

    const loadWishlist = async () => {
        setLoading(true);

        try {
            const wishlistIds = getWishlist();

            if (!wishlistIds.length) {
                setProducts([]);
                return;
            }

            const response = await api.get("/products", {
                params: {
                    per_page: 100,
                },
            });

            const payload = response.data;

            let items = [];

            if (Array.isArray(payload)) {
                items = payload;
            } else if (
                Array.isArray(payload?.data?.data)
            ) {
                items = payload.data.data;
            } else if (
                Array.isArray(payload?.data)
            ) {
                items = payload.data;
            } else if (
                Array.isArray(payload?.products)
            ) {
                items = payload.products;
            }

            const savedProducts = items.filter((product) =>
                wishlistIds.includes(Number(product.id))
            );

            setProducts(savedProducts);
        } catch (error) {
            console.error(
                "Unable to load favorites:",
                error
            );

            setProducts([]);
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

    const openProduct = (product) => {
        navigate(`/products/${product.id}`);
    };

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
                ) : products.length > 0 ? (
                    <div className="wishlist-grid">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onOpen={openProduct}
                                onAddToCart={(item) => {
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "cryma-add-to-cart",
                                            {
                                                detail: item,
                                            }
                                        )
                                    );
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