import test from "node:test";
import assert from "node:assert/strict";
import { buildVoucherPayload, validateVoucherForm } from "./voucherForm.js";

const validForm = {
    code: "spring-20",
    description: "Seasonal offer",
    discountType: "percentage",
    discountValue: "20",
    minimumSpend: "100.00",
    maximumDiscount: "50",
    startsAt: "2026-10-01T00:00",
    expiresAt: "2026-10-31T23:59",
    usageLimit: "100",
    perBuyerLimit: "2",
    productIds: "1, 2",
    categories: "Pet Supplies, Home",
    isActive: true,
};

test("accepts valid percentage voucher values and restrictions", () => {
    assert.deepEqual(validateVoucherForm(validForm), {});
});

test("rejects invalid percentage, money, date order, and usage values", () => {
    const errors = validateVoucherForm({
        ...validForm,
        discountValue: "100.01",
        minimumSpend: "-1",
        startsAt: "2026-11-01T00:00",
        expiresAt: "2026-10-01T00:00",
        usageLimit: "0",
        perBuyerLimit: "-1",
        productIds: "1, nope",
    });

    for (const key of ["discountValue", "minimumSpend", "expiresAt", "usageLimit", "perBuyerLimit", "productIds"]) {
        assert.ok(errors[key], `expected ${key} to be invalid`);
    }
});

test("builds backend-compatible payload with normalized code and null optional caps", () => {
    const payload = buildVoucherPayload({
        ...validForm,
        code: " save-20 ",
        maximumDiscount: "",
        usageLimit: "",
        productIds: "",
        categories: "",
    });

    assert.equal(payload.code, "SAVE-20");
    assert.equal(payload.maximum_discount, null);
    assert.equal(payload.usage_limit, null);
    assert.deepEqual(payload.product_ids, []);
    assert.deepEqual(payload.categories, []);
});
