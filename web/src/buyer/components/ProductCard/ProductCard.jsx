import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import {
    getBuyerWishlist,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerWishlist,
    showBuyerToast,
} from "../../../shared/utils/buyerAccess";
import "./ProductCard.css";

function ProductCard({
    product,
    saved,
    onSave,
    onAddToCart,
    onOpen,
}) {
    const [wishlist, setWishlist] = useState(getBuyerWishlist);
    const imageCandidates = [product?.image, product?.image_url, product?.thumbnail, product?.displayImage];
    const imageArray = Array.isArray(product?.images)
        ? product.images.map((image) => typeof image === "string" ? image : image?.url || image?.image_url)
        : [];
    const productImage = [...imageCandidates, ...imageArray]
        .find((image) => typeof image === "string" && image.trim()) || "";
    const [failedImage, setFailedImage] = useState("");

    const localSaved = wishlist.includes(Number(product?.id));

    const isSaved =
        typeof saved === "boolean"
            ? saved
            : localSaved;

    useEffect(() => {
        const syncWishlist = () => setWishlist(getBuyerWishlist());
        window.addEventListener("cryma-wishlist-updated", syncWishlist);
        window.addEventListener("storage", syncWishlist);
        return () => {
            window.removeEventListener("cryma-wishlist-updated", syncWishlist);
            window.removeEventListener("storage", syncWishlist);
        };
    }, []);

    const price = Number(product?.price || 0);
    const stock = Number(product?.stock || 0);
    const rating = Number(product?.average_rating ?? product?.rating ?? 0);
    const reviewCount = Number(product?.review_count ?? product?.reviews_count ?? 0);
    const originalPrice = Number(product?.original_price ?? product?.compare_at_price ?? 0);

    const sellerName =
        typeof product?.seller === "string"
            ? product.seller
        : product?.seller?.name || [product?.seller?.first_name, product?.seller?.last_name].filter(Boolean).join(" ");

    const handleSave = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to save favorites",
                message: "Create an account or sign in to save products to your wishlist.",
            });
            return;
        }

        const wishlist = getBuyerWishlist();
        const productId = Number(product?.id);

        const exists = wishlist.includes(productId);

        const updated = exists
            ? wishlist.filter((id) => id !== productId)
            : [...wishlist, productId];

        if (!saveBuyerWishlist(updated)) return;

        setWishlist(updated);
        showBuyerToast(exists ? "Removed from Wishlist" : "Added to Wishlist");

        onSave?.(product);
    };

    const handleAddToCart = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to add to cart",
                message: "Create an account or sign in to shop on CRYMA.",
            });
            return;
        }

        const result = onAddToCart?.(product);
        if (result === false) return;
        showBuyerToast("Added to Cart");
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
                    {productImage && failedImage !== productImage ? (
                        <img
                            src={productImage}
                            alt={product?.name || "Product"}
                            loading="lazy"
                            decoding="async"
                            onError={() => setFailedImage(productImage)}
                        />
                    ) : (
                        <span className="buyer-product-image-fallback" aria-label="Product photo unavailable">
                            <span aria-hidden="true">{product?.name?.charAt(0)?.toUpperCase() || "C"}</span>
                            <small>Photo unavailable</small>
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
                    {String.fromCharCode(8369)}{price.toLocaleString()}
                </strong>

                {originalPrice > price && (
                    <div className="buyer-product-deal">
                        <del>{String.fromCharCode(8369)}{originalPrice.toLocaleString()}</del>
                        <span>{Math.round((1 - price / originalPrice) * 100)}% off</span>
                    </div>
                )}

                {rating > 0 && (
                    <div className="buyer-product-rating" aria-label={`${rating.toFixed(1)} out of 5 stars${reviewCount ? `, ${reviewCount} reviews` : ""}`}>
                        <Star size={14} fill="currentColor" aria-hidden="true" />
                        <strong>{rating.toFixed(1)}</strong>
                        {reviewCount > 0 && <span>({reviewCount.toLocaleString()})</span>}
                    </div>
                )}

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
                onClick={handleAddToCart}
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
