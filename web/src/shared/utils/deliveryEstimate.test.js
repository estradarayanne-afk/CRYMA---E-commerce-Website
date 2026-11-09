import assert from "node:assert/strict";
import test from "node:test";
import { formatDeliveryEstimate, getBusinessDayEstimate } from "./deliveryEstimate.js";

test("formats a route delivery estimate as a date range", () => {
    assert.equal(
        formatDeliveryEstimate({ from: "2026-11-10", to: "2026-11-13" }),
        "Nov 10, 2026 – Nov 13, 2026",
    );
});

test("does not display absent or invalid delivery estimates", () => {
    assert.equal(formatDeliveryEstimate(null), null);
    assert.equal(formatDeliveryEstimate({ from: "2026-02-30", to: "2026-03-05" }), null);
});

test("calculates product-page estimates from today and skips weekends", () => {
    const estimate = getBusinessDayEstimate(2, 5, new Date(2026, 10, 6));

    assert.deepEqual(estimate, {
        from: "2026-11-10",
        to: "2026-11-13",
        min_days: 2,
        max_days: 5,
    });
});
