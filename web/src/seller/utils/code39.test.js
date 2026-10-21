import test from "node:test";
import assert from "node:assert/strict";
import { getCode39Barcode } from "./code39.js";

test("generates a Code 39 barcode with start/stop characters and quiet zones", () => {
    const barcode = getCode39Barcode(42);

    assert.equal(barcode.width, 83);
    assert.equal(barcode.bars[0].x, 10);
    assert.ok(barcode.bars.every((bar) => bar.width === 1 || bar.width === 3));
    assert.ok(barcode.bars.at(-1).x + barcode.bars.at(-1).width < barcode.width);
});

test("does not generate a barcode for unsupported order identifiers", () => {
    assert.equal(getCode39Barcode("order-42"), null);
    assert.equal(getCode39Barcode(""), null);
});
