import test from "node:test";
import assert from "node:assert/strict";

import {
    getProductCategory,
    getProductSellerName,
    matchesProductCategory,
    matchesProductSearch,
} from "./productDiscovery.js";

test("product discovery reads the category and seller fields returned by the API", () => {
    const product = {
        category: "Home & Garden",
        seller: { first_name: "Maria", last_name: "Santos" },
    };

    assert.equal(getProductCategory(product), "Home & Garden");
    assert.equal(getProductSellerName(product.seller), "Maria Santos");
    assert.equal(matchesProductSearch(product, "Santos"), true);
    assert.equal(matchesProductCategory(product, "home & garden"), true);
});

test("product discovery tolerates alternate category objects and seller names", () => {
    const product = {
        category: { name: "Books & Media" },
        seller: { name: "CRYMA Books" },
    };

    assert.equal(matchesProductSearch(product, "cryma books"), true);
    assert.equal(matchesProductCategory(product, "Books & Media"), true);
    assert.equal(matchesProductCategory(product, "Electronics & Gadgets"), false);
    assert.equal(matchesProductSearch(product, "   "), true);
});
