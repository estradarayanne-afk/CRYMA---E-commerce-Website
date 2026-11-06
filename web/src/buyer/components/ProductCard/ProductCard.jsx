import { useEffect, useState } from "react";
import { Heart, PackageOpen, ShoppingCart, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
    getBuyerWishlist,
    isBuyerSession,
    requestBuyerSignIn,
    saveBuyerWishlist,
    showBuyerToast,
} from "../../../shared/utils/buyerAccess";
import { getProductDetailPath, toggleWishlistProduct } from "../../../shared/utils/buyerProductActions";
import { getProductCategory, getProductShopName } from "../../../shared/utils/productDiscovery";
import "./ProductCard.css";

// Known catalog mismatch: product 10 points to unrelated seller media.
// Keep its product data intact and use the neutral fallback until the catalog is corrected.
const KNOWN_MISMATCHED_PRODUCT_MEDIA = new Map([
    ["10", new Set([
        "/storage/products/10/tHbKkfs0Y9zXqUReFgoxxFwYoR9AqrdV1sHRFyYA.jpg",
        "/storage/products/10/HjunRcu6Wmw93Bhsbw3wd533ui3tVVQQLAJ9DICI.mp4",
    ])],
]);

function isKnownMismatchedMedia(product, mediaUrl) {
    const mismatchedPaths = KNOWN_MISMATCHED_PRODUCT_MEDIA.get(String(product?.id));
    if (!mismatchedPaths) return false;

    try {
        const pathname = decodeURIComponent(new URL(mediaUrl, window.location.origin).pathname).toLowerCase();
        return [...mismatchedPaths].some((path) => path.toLowerCase() === pathname);
    } catch {
        return [...mismatchedPaths].some((path) => path.toLowerCase() === String(mediaUrl).toLowerCase());
    }
}

function getMediaUrl(media) {
    const url = typeof media === "string"
        ? media
        : media?.url || media?.image_url || media?.video_url;
    return typeof url === "string" ? url.trim() : "";
}

function ProductCard({
    product,
    saved,
    onSave,
    onAddToCart,
    tiltOnHover = false,
}) {
    const navigate = useNavigate();
    const [wishlist, setWishlist] = useState(getBuyerWishlist);
    const imageCandidates = [product?.image, product?.image_url, product?.thumbnail, product?.displayImage]
        .map(getMediaUrl);
    const imageArray = Array.isArray(product?.images) ? product.images.map(getMediaUrl) : [];
    const mediaImages = Array.isArray(product?.media)
        ? product.media.filter((media) => String(media?.type || "").toLowerCase() === "image").map(getMediaUrl)
        : [];
    const videoCandidates = Array.isArray(product?.videos) ? product.videos.map(getMediaUrl) : [];
    const productImages = [...new Set([...imageCandidates, ...mediaImages, ...imageArray]
        .filter((image) => typeof image === "string" && image.trim() && !isKnownMismatchedMedia(product, image)))];
    const [failedImage, setFailedImage] = useState("");
    const productImage = productImages.find((image) => image !== failedImage) || "";
    const productVideoCandidates = [...videoCandidates, ...(Array.isArray(product?.media)
        ? product.media.filter((media) => String(media?.type || "").toLowerCase() === "video").map(getMediaUrl)
        : [])].filter((video) => typeof video === "string" && video.trim() && !isKnownMismatchedMedia(product, video));
    const [failedVideo, setFailedVideo] = useState("");
    const productVideo = productVideoCandidates.find((video) => video !== failedVideo) || "";
    const [loadedImage, setLoadedImage] = useState("");

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

    const handleCardPointerMove = (event) => {
        if (event.pointerType === "touch" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        event.currentTarget.style.setProperty("--card-tilt-x", `${-y * 6}deg`);
        event.currentTarget.style.setProperty("--card-tilt-y", `${x * 7}deg`);
    };

    const resetCardTilt = (event) => {
        event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
        event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
    };

    const hasPrice = product?.price !== null && product?.price !== undefined && String(product.price).trim() !== "" && Number.isFinite(Number(product.price));
    const price = hasPrice ? Number(product.price) : null;
    const hasStock = product?.stock !== null && product?.stock !== undefined && String(product.stock).trim() !== "" && Number.isFinite(Number(product.stock));
    const stock = hasStock ? Number(product.stock) : null;
    const rating = Number(product?.average_rating ?? product?.rating ?? 0);
    const reviewCount = Number(product?.review_count ?? product?.reviews_count ?? 0);
    const originalPriceValue = product?.original_price ?? product?.compare_at_price;
    const originalPrice = originalPriceValue !== null && originalPriceValue !== undefined && String(originalPriceValue).trim() !== "" && Number.isFinite(Number(originalPriceValue))
        ? Number(originalPriceValue)
        : null;

    const shopName = getProductShopName(product?.seller);
    const sellerOnVacation = product?.seller?.is_on_vacation === true || product?.seller_on_vacation === true;
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
        if (Array.isArray(product?.variants) && product.variants.length > 0) {
            navigate(getProductDetailPath(product.id));
            return;
        }

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
        <article
            className={`buyer-product-card ${tiltOnHover ? "is-tiltable" : ""}`}
            onPointerMove={tiltOnHover ? handleCardPointerMove : undefined}
            onPointerLeave={tiltOnHover ? resetCardTilt : undefined}
        >

            <Link
                to={getProductDetailPath(product?.id)}
                className="buyer-product-image-button"
                aria-label={`View ${
                    product?.name || "product"
                }`}
            >
                <div className={`buyer-product-image ${productImage || productVideo ? "has-image" : ""} ${((productImage && loadedImage === productImage) || (productVideo && loadedImage === productVideo)) ? "has-loaded-image" : ""}`}>
                    {sellerOnVacation && <span className="buyer-product-vacation-badge">On vacation</span>}
                    {productImage && failedImage !== productImage ? (
                        <img
                            src={productImage}
                            alt={product?.name || "Product"}
                            loading="lazy"
                            decoding="async"
                            onLoad={() => setLoadedImage(productImage)}
                            onError={() => setFailedImage(productImage)}
                        />
                    ) : productVideo ? (
                        <video
                            src={productVideo}
                            muted
                            playsInline
                            preload="metadata"
                            aria-label={`${product?.name || "Product"} video preview`}
                            onLoadedData={() => setLoadedImage(productVideo)}
                            onError={() => setFailedVideo(productVideo)}
                        />
                    ) : (
                        <span className="buyer-product-image-fallback" role="img" aria-label={`Illustrated placeholder for ${product?.name || "product"}`}>
                            <span className="buyer-product-fallback-orbit" aria-hidden="true" />
                            <span className="buyer-product-fallback-mark" aria-hidden="true"><PackageOpen size={32} strokeWidth={1.4} /></span>
                            <small>Image unavailable</small>
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

                {product?.name && (
                    <Link
                        to={getProductDetailPath(product?.id)}
                        className="buyer-product-name"
                        aria-label={`View ${product.name} details and reviews`}
                    >
                        {product.name}
                    </Link>
                )}

                {price !== null && (
                    <strong className="buyer-product-price">
                        {product?.price_from_variants ? "From " : ""}
                        {String.fromCharCode(8369)}{price.toLocaleString()}
                    </strong>
                )}

                {originalPrice !== null && price !== null && originalPrice > price && (
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

                    {shopName && (
                        <span className="buyer-product-seller">
                            {shopName}
                        </span>
                    )}

                    {hasStock && <span className="buyer-product-stock">
                        {stock > 0 ? `${stock} available` : "Out of stock"}
                    </span>}

                </div>

                <button
                    type="button"
                    className="buyer-product-add"
                    disabled={stock === null || stock <= 0 || sellerOnVacation}
                onClick={handleAddToCart}
                >
                    <ShoppingCart size={15} />

                    {sellerOnVacation ? "On vacation" : stock !== null && stock > 0
                        ? product?.variants?.length ? "Choose Options" : "Add to Cart"
                        : stock === null ? "Unavailable" : "Out of Stock"}
                </button>

            </div>
        </article>
    );
}

export default ProductCard;
