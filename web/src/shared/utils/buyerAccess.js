import { openAuthModal } from "../components/authModalEvents";

export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

export function isBuyerSession() {
    return Boolean(
        localStorage.getItem("token") &&
        getStoredUser()?.role === "buyer"
    );
}

export function requestBuyerSignIn(options = {}) {
    const from = options.from || (
        typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}${window.location.hash}`
            : undefined
    );
    openAuthModal("login", from ? { from } : {});
}

export function getBuyerWishlist() {
    if (!isBuyerSession()) return [];

    try {
        const value = JSON.parse(localStorage.getItem("cryma_wishlist") || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

export function saveBuyerWishlist(ids) {
    if (!isBuyerSession()) return false;
    localStorage.setItem("cryma_wishlist", JSON.stringify(ids));
    window.dispatchEvent(new Event("cryma-wishlist-updated"));
    return true;
}

export function getBuyerCart() {
    if (!isBuyerSession()) return [];

    try {
        const cart = JSON.parse(localStorage.getItem("cryma_cart") || "[]");
        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

export function saveBuyerCart(cart) {
    if (!isBuyerSession()) return false;
    localStorage.setItem("cryma_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cryma-cart-updated"));
    return true;
}

export function showBuyerToast(message) {
    window.dispatchEvent(new CustomEvent("cryma-toast", { detail: { message } }));
}
