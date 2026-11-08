const MONEY_PATTERN = /^\d{1,10}(?:\.\d{1,2})?$/;

export function validateVoucherForm(form) {
    const errors = {};
    const code = String(form.code || "").trim();
    const discountValue = String(form.discountValue || "").trim();
    const minimumSpend = String(form.minimumSpend ?? "").trim();
    const maximumDiscount = String(form.maximumDiscount || "").trim();
    const usageLimit = String(form.usageLimit || "").trim();
    const perBuyerLimit = String(form.perBuyerLimit || "").trim();
    const productIds = parseCommaList(form.productIds);
    const categories = parseCommaList(form.categories);
    const scope = form.scope || "product";

    if (!["product", "shipping"].includes(scope)) {
        errors.scope = "Choose a supported voucher scope.";
    }
    if (!code) errors.code = "Enter a voucher code.";
    else if (code.length > 64 || !/^[A-Z0-9_-]+$/i.test(code)) {
        errors.code = "Use up to 64 letters, numbers, hyphens, or underscores.";
    }

    if (!["fixed", "percentage"].includes(form.discountType)) {
        errors.discountType = "Choose a supported discount type.";
    }
    if (!MONEY_PATTERN.test(discountValue) || Number(discountValue) <= 0) {
        errors.discountValue = "Enter a positive amount with up to two decimal places.";
    } else if (form.discountType === "percentage" && Number(discountValue) > 100) {
        errors.discountValue = "Percentage discounts cannot exceed 100%.";
    }

    if (!MONEY_PATTERN.test(minimumSpend) || Number(minimumSpend) < 0) {
        errors.minimumSpend = "Enter a non-negative amount with up to two decimal places.";
    }

    if (maximumDiscount && (!MONEY_PATTERN.test(maximumDiscount) || Number(maximumDiscount) <= 0)) {
        errors.maximumDiscount = "Enter a positive amount with up to two decimal places.";
    } else if (maximumDiscount && form.discountType !== "percentage") {
        errors.maximumDiscount = "A maximum discount cap only applies to percentage vouchers.";
    }

    if (form.startsAt && Number.isNaN(Date.parse(form.startsAt))) {
        errors.startsAt = "Enter a valid start date.";
    }
    if (form.expiresAt && Number.isNaN(Date.parse(form.expiresAt))) {
        errors.expiresAt = "Enter a valid expiration date.";
    } else if (
        form.startsAt &&
        form.expiresAt &&
        Date.parse(form.expiresAt) < Date.parse(form.startsAt)
    ) {
        errors.expiresAt = "Expiration must be on or after the start date.";
    }

    if (usageLimit && (!/^\d+$/.test(usageLimit) || Number(usageLimit) < 1)) {
        errors.usageLimit = "Leave blank for unlimited uses or enter a positive whole number.";
    }
    if (!/^\d+$/.test(perBuyerLimit) || Number(perBuyerLimit) < 1) {
        errors.perBuyerLimit = "Enter a positive whole number.";
    }
    if (scope === "shipping" && (productIds.length > 0 || categories.length > 0)) {
        errors.productIds = "Shipping vouchers cannot be restricted to products or categories.";
    }
    if (scope === "product" && (productIds.length > 100 || productIds.some((id) => !/^\d+$/.test(id) || Number(id) < 1))) {
        errors.productIds = "Enter up to 100 valid product IDs separated by commas.";
    }
    if (scope === "product" && new Set(productIds).size !== productIds.length) {
        errors.productIds = "Product IDs must not be repeated.";
    }
    if (scope === "product" && (categories.length > 100 || categories.some((category) => category.length > 100))) {
        errors.categories = "Enter up to 100 category names, each no longer than 100 characters.";
    }
    if (scope === "product" && new Set(categories.map((category) => category.toLocaleLowerCase())).size !== categories.length) {
        errors.categories = "Category names must not be repeated.";
    }

    return errors;
}

export function buildVoucherPayload(form) {
    return {
        code: String(form.code || "").trim().toUpperCase(),
        description: String(form.description || "").trim() || null,
        scope: form.scope || "product",
        discount_type: form.discountType,
        discount_value: String(form.discountValue).trim(),
        minimum_spend: String(form.minimumSpend || "0").trim(),
        maximum_discount: String(form.maximumDiscount || "").trim() || null,
        starts_at: form.startsAt || null,
        expires_at: form.expiresAt || null,
        usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
        per_buyer_limit: Number(form.perBuyerLimit),
        product_ids: form.scope === "shipping" ? null : parseCommaList(form.productIds).map(Number),
        categories: form.scope === "shipping" ? null : parseCommaList(form.categories),
        is_active: Boolean(form.isActive),
    };
}

function parseCommaList(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
