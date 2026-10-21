import { useEffect, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import {
    getBuyerWishlist,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerWishlist,
    showBuyerToast,
} from "../../../shared/utils/buyerAccess";
import { getProductDetailPath, toggleWishlistProduct } from "../../../shared/utils/buyerProductActions";
import { getProductCategory, getProductSellerName } from "../../../shared/utils/productDiscovery";
import "./ProductCard.css";

function ProductCard({
    product,
    saved,
    onSave,
    onAddToCart,
}) {
    const [wishlist, setWishlist] = useState(getBuyerWishlist);
    const imageCandidates = [product?.image, product?.image_url, product?.thumbnail, product?.displayImage];
    const imageArray = Array.isArray(product?.images)
        ? product.images.map((image) => typeof image === "string" ? image : image?.url || image?.image_url)
        : [];
    const productImages = [...new Set([...imageCandidates, ...imageArray]
        .filter((image) => typeof image === "string" && image.trim()))];
    const [failedImage, setFailedImage] = useState("");
    const productImage = productImages.find((image) => image !== failedImage) || "";

    const localSaved = wishlist.some((id) => String(id) === String(product?.id));

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

    const sellerName = getProductSellerName(product?.seller);
    const productCategory = getProductCategory(product);

    const handleSave = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to save favorites",
                message: "Create an account or sign in to save products to your wishlist.",
            });
            return;
        }

        const wishlist = getBuyerWishlist();
        const productId = product?.id;
        if (productId === null || productId === undefined || String(productId).trim() === "") return;

        const { ids: updated, added } = toggleWishlistProduct(wishlist, productId);

        if (!saveBuyerWishlist(updated)) {
            showBuyerToast("Unable to update favorites. Please try again.", "error");
            return;
        }

        setWishlist(updated);
        showBuyerToast(added ? "Added to favorites" : "Removed from favorites");

        onSave?.(product, added);
    };

    const handleAddToCart = () => {
        if (!isBuyerSession()) {
            requestBuyerSignIn({
                title: "Sign in to add to cart",
                message: "Create an account or sign in to shop on CRYMA.",
            });
            return;
        }

        try {
            const result = onAddToCart?.(product);
            if (result !== true) return;
            showBuyerToast("Added to cart");
        } catch {
            showBuyerToast("Unable to add this item to your cart. Please try again.", "error");
        }
    };

    return (
        <article className="buyer-product-card">

            <Link
                to={getProductDetailPath(product?.id)}
                className="buyer-product-image-button"
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
            </Link>

            <button
                type="button"
                className={`buyer-product-save ${
                    isSaved ? "saved" : ""
                }`}
                onClick={handleSave}
                aria-pressed={isSaved}
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

                {productCategory && (
                    <span className="buyer-product-category">
                        {productCategory}
                    </span>
                )}

                <Link
                    to={getProductDetailPath(product?.id)}
                    className="buyer-product-name"
                    aria-label={`View ${product?.name || "product"} details and reviews`}
                >
                    {product?.name ||
                        "Unnamed product"}
                </Link>

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
