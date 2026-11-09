import { getBuyerCartItemKey } from "./buyerProductActions.js";
import { getProductShopName } from "./productDiscovery.js";

export function getCartSellerName(item) {
    const seller = item?.seller;
    const shopName = getProductShopName(seller);
    if (shopName !== "CRYMA Shop") return shopName;
    if (typeof seller === "string") return seller.trim() || "CRYMA Shop";

    return [
        seller?.first_name,
        seller?.middle_name,
        seller?.last_name,
    ].filter(Boolean).join(" ").trim()
        || seller?.name
        || (item?.seller_id ? `Seller ${item.seller_id}` : "CRYMA Shop");
}

export function getCartSellerKey(item) {
    const sellerId = item?.seller_id ?? item?.seller?.id;
    if (sellerId !== null && sellerId !== undefined && String(sellerId).trim()) {
        return `seller:${sellerId}`;
    }

    const shopName = getCartSellerName(item);
    return shopName && shopName !== "CRYMA Shop"
        ? `shop:${shopName.toLocaleLowerCase()}`
        : "seller:unknown";
}

export function groupCartItemsBySeller(items) {
    const groups = new Map();

    items.forEach((item) => {
        const key = getCartSellerKey(item);
        const existing = groups.get(key);
        if (existing) {
            existing.items.push(item);
            return;
        }

        groups.set(key, {
            key,
            name: getCartSellerName(item),
            items: [item],
        });
    });

    return [...groups.values()];
}

export function toggleCartItemKeys(selectedIds, itemKeys) {
    const current = new Set(selectedIds.map(String));
    const keys = itemKeys.map(String);
    const allSelected = keys.length > 0 && keys.every((key) => current.has(key));

    keys.forEach((key) => {
        if (allSelected) current.delete(key);
        else current.add(key);
    });

    return [...current];
}

export function isCartGroupSelected(selectedIds, items) {
    const current = new Set(selectedIds.map(String));
    const availableItems = items.filter((item) => {
        const stock = item?.stock;
        return stock === null || stock === undefined || stock === "" || Number(stock) > 0;
    });

    return availableItems.length > 0
        && availableItems.every((item) => current.has(getBuyerCartItemKey(item)));
}
