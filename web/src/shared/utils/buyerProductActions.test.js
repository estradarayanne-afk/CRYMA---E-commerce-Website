import test from "node:test";
import assert from "node:assert/strict";
import {
    addProductToCart,
    getProductDetailPath,
    toggleWishlistProduct,
} from "./buyerProductActions.js";

test("product detail links use the current product ID route", () => {
    assert.equal(getProductDetailPath(42), "/products/42");
    assert.equal(getProductDetailPath("product 42"), "/products/product%2042");
    assert.equal(getProductDetailPath(null), "/shop");
});

test("favorites add and remove IDs without string-number duplicates", () => {
    assert.deepEqual(toggleWishlistProduct([], "42"), { added: true, ids: [42] });
    assert.deepEqual(toggleWishlistProduct([42, 7], "42"), { added: false, ids: [7] });
    assert.deepEqual(toggleWishlistProduct([], null), { added: false, ids: [] });
});

test("cart action increments existing quantity within stock and rejects overflow", () => {
    const existing = [{ id: 42, quantity: 1, stock: 3, variant: "blue", variantId: 7 }];
    const added = addProductToCart(existing, { id: 42, stock: 3, variant: "red", price: "8.00" }, 1);
    assert.equal(added.success, true);
    assert.deepEqual(added.cart, [{ id: 42, quantity: 2, stock: 3, variant: "blue", variantId: 7, price: "8.00" }]);
    assert.equal(addProductToCart(added.cart, { id: 42, stock: 3 }, 2).reason, "insufficient_stock");
    assert.equal(addProductToCart([], { id: 1, stock: 0 }).reason, "insufficient_stock");
});

test("cart action adds a new item with its requested quantity", () => {
    const result = addProductToCart([], { id: 5, name: "Item", stock: 8 }, 2);
    assert.equal(result.success, true);
    assert.deepEqual(result.cart, [{ id: 5, name: "Item", stock: 8, quantity: 2 }]);
});
