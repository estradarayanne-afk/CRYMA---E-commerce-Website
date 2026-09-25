import { useEffect, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";

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

function ProductCard({
    product,
    saved,
    onSave,
    onAddToCart,
    onOpen,
}) {
    const [wishlist, setWishlist] = useState(getWishlist);

    const localSaved = wishlist.includes(Number(product?.id));

    const isSaved =
        typeof saved === "boolean"
            ? saved
            : localSaved;

    useEffect(() => {
        const syncWishlist = () => setWishlist(getWishlist());
        window.addEventListener("cryma-wishlist-updated", syncWishlist);
        window.addEventListener("storage", syncWishlist);
        return () => {
            window.removeEventListener("cryma-wishlist-updated", syncWishlist);
            window.removeEventListener("storage", syncWishlist);
        };
    }, []);

    const price = Number(product?.price || 0);
    const stock = Number(product?.stock || 0);

    const sellerName =
        typeof product?.seller === "string"
            ? product.seller
            : product?.seller?.name || "";

    const handleSave = () => {
        const wishlist = getWishlist();
        const productId = Number(product?.id);

        const exists = wishlist.includes(productId);

        const updated = exists
            ? wishlist.filter((id) => id !== productId)
            : [...wishlist, productId];

        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(updated)
        );

        setWishlist(updated);

        window.dispatchEvent(
            new Event("cryma-wishlist-updated")
        );

        onSave?.(product);
    };

    return (
        <article className="buyer-product-card">

            <button
                type="button"
                className="buyer-product-image-button"
                onClick={() => onOpen?.(product)}
                aria-label={`View ${
                    product?.name || "product"
                }`}
            >
                <div className="buyer-product-image">
                    {product?.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                        />
                    ) : (
                        <span>
                            {product?.name
                                ?.charAt(0)
                                ?.toUpperCase() || "C"}
                        </span>
                    )}
                </div>
            </button>

            <button
                type="button"
                className={`buyer-product-save ${
                    isSaved ? "saved" : ""
                }`}
                onClick={handleSave}
                aria-label={
                    isSaved
                        ? `Remove ${product.name} from wishlist`
                        : `Add ${product.name} to wishlist`
                }
            >
                <Heart
                    size={16}
                    fill={
                        isSaved
                            ? "currentColor"
                            : "none"
                    }
                />
            </button>

            <div className="buyer-product-content">

                {product?.category && (
                    <span className="buyer-product-category">
                        {product.category}
                    </span>
                )}

                <button
                    type="button"
                    className="buyer-product-name"
                    onClick={() => onOpen?.(product)}
                >
                    {product?.name ||
                        "Unnamed product"}
                </button>

                <strong className="buyer-product-price">
                    ₱{price.toLocaleString()}
                </strong>

                <div className="buyer-product-meta">

                    {sellerName && (
                        <span className="buyer-product-seller">
                            {sellerName}
                        </span>
                    )}

                    <span className="buyer-product-stock">
                        {stock > 0
                            ? `${stock} available`
                            : "Out of stock"}
                    </span>

                </div>

                <button
                    type="button"
                    className="buyer-product-add"
                    disabled={stock <= 0}
                    onClick={() =>
                        onAddToCart?.(product)
                    }
                >
                    <ShoppingCart size={15} />

                    {stock > 0
                        ? "Add to Cart"
                        : "Out of Stock"}
                </button>

            </div>
        </article>
    );
}

export default ProductCard;