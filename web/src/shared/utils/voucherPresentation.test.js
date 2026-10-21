import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateVoucherTotal,
    formatVoucherDiscount,
    formatVoucherStatus,
} from "./voucherPresentation.js";

test("voucher presentation formats fixed and percentage discounts and supported states", () => {
    assert.equal(formatVoucherDiscount({ discount_type: "fixed", discount_value: "20.00" }), "₱20 off");
    assert.equal(formatVoucherDiscount({ discount_type: "percentage", discount_value: "15.00" }), "15% off");
    assert.equal(formatVoucherStatus("used"), "Used");
    assert.equal(formatVoucherStatus("expired"), "Expired");
});

test("voucher totals are calculated in cents and never become negative", () => {
    assert.equal(calculateVoucherTotal(100.1, 0, 10.05), 90.05);
    assert.equal(calculateVoucherTotal(5, 0, 10), 0);
});
