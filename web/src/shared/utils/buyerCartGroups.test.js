import test from "node:test";
import assert from "node:assert/strict";
import {
    groupCartItemsBySeller,
    isCartGroupSelected,
    toggleCartItemKeys,
} from "./buyerCartGroups.js";

test("groups cart variants and products by seller in cart order", () => {
    const items = [
        { id: 1, seller_id: 8, seller: { id: 8, business_name: "CRYMA Shoes" } },
        { id: 2, seller_id: 9, seller: { id: 9, business_name: "CRYMA Bags" } },
        { id: 1, variant_id: 4, seller_id: 8, seller: { id: 8, business_name: "CRYMA Shoes" } },
    ];

    const groups = groupCartItemsBySeller(items);

    assert.equal(groups.length, 2);
    assert.equal(groups[0].name, "CRYMA Shoes");
    assert.deepEqual(groups[0].items, [items[0], items[2]]);
    assert.equal(groups[1].name, "CRYMA Bags");
});

test("selects and deselects multiple cart items while preserving other seller selections", () => {
    const selected = toggleCartItemKeys(["2::base"], ["1::base", "1::4"]);
    assert.deepEqual(selected, ["2::base", "1::base", "1::4"]);
    assert.deepEqual(toggleCartItemKeys(selected, ["1::base", "1::4"]), ["2::base"]);
});

test("seller selection state ignores out-of-stock items", () => {
    const items = [
        { id: 1, stock: 2 },
        { id: 2, stock: 0 },
    ];

    assert.equal(isCartGroupSelected(["1::base"], items), true);
    assert.equal(isCartGroupSelected([], items), false);
});
