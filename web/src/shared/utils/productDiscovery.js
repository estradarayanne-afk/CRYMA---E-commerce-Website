// These catalog paths belong to a different seller and must not be shown as product photos.
const KNOWN_MISMATCHED_PRODUCT_MEDIA = new Map([
    ["10", new Set([
        "/storage/products/10/tHbKkfs0Y9zXqUReFgoxxFwYoR9AqrdV1sHRFyYA.jpg",
        "/storage/products/10/HjunRcu6Wmw93Bhsbw3wd533ui3tVVQQLAJ9DICI.mp4",
    ])],
]);

function getImageUrl(media) {
    const url = typeof media === "string" ? media : media?.url || media?.image_url;
    return typeof url === "string" ? url.trim() : "";
}

export function isKnownMismatchedProductMedia(product, mediaUrl) {
    const mismatchedPaths = KNOWN_MISMATCHED_PRODUCT_MEDIA.get(String(product?.id));
    if (!mismatchedPaths) return false;

    try {
        const pathname = decodeURIComponent(new URL(mediaUrl, "https://cryma.store").pathname).toLowerCase();
        return [...mismatchedPaths].some((path) => path.toLowerCase() === pathname);
    } catch {
        return [...mismatchedPaths].some((path) => path.toLowerCase() === String(mediaUrl).toLowerCase());
    }
}

export function getProductImageCandidates(product) {
    const imageCandidates = [
        product?.image,
        product?.image_url,
        product?.thumbnail,
        product?.displayImage,
        product?.primary_image,
    ].map(getImageUrl);
    const imageArray = Array.isArray(product?.images) ? product.images.map(getImageUrl) : [];
    const mediaImages = Array.isArray(product?.media)
        ? product.media.filter((media) => String(media?.type || "").toLowerCase() === "image").map(getImageUrl)
        : [];
    const variantImages = Array.isArray(product?.variants)
        ? product.variants.flatMap((variant) => [
            variant?.color_image_url,
            String(variant?.media_type || "").toLowerCase() === "image" ? variant?.media_url : "",
        ]).map(getImageUrl)
        : [];

    return [...new Set([...imageCandidates, ...mediaImages, ...imageArray, ...variantImages]
        .filter((image) => image && !isKnownMismatchedProductMedia(product, image)))];
}

export function getProductCategory(product) {
    const category = product?.category;
    if (typeof category === "string") return category.trim();
    if (category && typeof category === "object") {
        return String(category.name || category.category || "").trim();
    }
    return String(product?.category_name || "").trim();
}

export function getProductSellerName(seller) {
    if (typeof seller === "string") return seller.trim();
    if (!seller || typeof seller !== "object") return "";

    const fullName = [seller.first_name, seller.middle_name, seller.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || String(seller.name || seller.business_name || "").trim();
}

export function getProductShopName(seller) {
    if (typeof seller === "string") return seller.trim();
    if (!seller || typeof seller !== "object") return "";

    return String(
        seller.seller_profile?.business_name
        || seller.sellerProfile?.business_name
        || seller.shop_name
        || seller.business_name
        || "CRYMA Shop",
    ).trim();
}

export function matchesProductSearch(product, search) {
    const keyword = String(search || "").trim().toLocaleLowerCase();
    if (!keyword) return true;

    return [product?.name, getProductCategory(product), getProductSellerName(product?.seller), getProductShopName(product?.seller)]
        .some((value) => String(value || "").toLocaleLowerCase().includes(keyword));
}

export function matchesProductCategory(product, category) {
    if (!category || category === "All") return true;
    return getProductCategory(product).toLocaleLowerCase() === String(category).trim().toLocaleLowerCase();
}
