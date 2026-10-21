export function getProductDetailPath(productId) {
    if (productId === null || productId === undefined || String(productId).trim() === "") {
        return "/shop";
    }

    return `/products/${encodeURIComponent(String(productId))}`;
}

export function toggleWishlistProduct(ids, productId) {
    if (productId === null || productId === undefined || String(productId).trim() === "") {
        return { added: false, ids };
    }

    const normalizedId = String(productId);
    const exists = ids.some((id) => String(id) === normalizedId);

    return {
        added: !exists,
        ids: exists
            ? ids.filter((id) => String(id) !== normalizedId)
            : [...ids, Number.isNaN(Number(productId)) ? productId : Number(productId)],
    };
}

export function addProductToCart(cart, product, requestedQuantity = 1) {
    if (!product?.id || !Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
        return { success: false, reason: "invalid_item", cart };
    }

    const existingIndex = cart.findIndex((item) => String(item.id) === String(product.id));
    const existing = existingIndex >= 0 ? cart[existingIndex] : null;
    const currentQuantity = Number(existing?.quantity || 0);
    const nextQuantity = currentQuantity + requestedQuantity;
    const rawStock = product.stock ?? existing?.stock;
    const stock = rawStock === null || rawStock === undefined || rawStock === ""
        ? null
        : Number(rawStock);

    if (Number.isFinite(stock) && (stock <= 0 || nextQuantity > stock)) {
        return { success: false, reason: "insufficient_stock", stock, cart };
    }

    const nextCart = cart.map((item) => ({ ...item }));
    if (existingIndex >= 0) {
        const updated = { ...nextCart[existingIndex], ...product, quantity: nextQuantity };
        ["variant", "variantId", "variant_name"].forEach((key) => {
            if (nextCart[existingIndex][key] !== undefined) {
                updated[key] = nextCart[existingIndex][key];
            }
        });
        nextCart[existingIndex] = updated;
    } else {
        nextCart.push({ ...product, quantity: requestedQuantity });
    }

    return { success: true, cart: nextCart };
}
