export function formatVoucherDiscount(voucher) {
    const value = Number(voucher?.discount_value);
    if (!Number.isFinite(value) || value <= 0) return "Discount";
    return voucher.discount_type === "percentage"
        ? `${value.toLocaleString()}% off`
        : `₱${value.toLocaleString()} off`;
}

export function formatVoucherStatus(status) {
    return {
        available: "Available",
        used: "Used",
        expired: "Expired",
        ineligible: "Not available",
    }[status] || "Not available";
}

export function calculateVoucherTotal(subtotal, shipping, discount) {
    const toCents = (value) => Math.round((Number(value) || 0) * 100);
    return Math.max(0, toCents(subtotal) + toCents(shipping) - toCents(discount)) / 100;
}
