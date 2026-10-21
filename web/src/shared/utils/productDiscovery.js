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

export function matchesProductSearch(product, search) {
    const keyword = String(search || "").trim().toLocaleLowerCase();
    if (!keyword) return true;

    return [product?.name, getProductCategory(product), getProductSellerName(product?.seller)]
        .some((value) => String(value || "").toLocaleLowerCase().includes(keyword));
}

export function matchesProductCategory(product, category) {
    if (!category || category === "All") return true;
    return getProductCategory(product).toLocaleLowerCase() === String(category).trim().toLocaleLowerCase();
}
