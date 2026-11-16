import test from "node:test";
import assert from "node:assert/strict";

import {
    getProductCategory,
    getProductImageCandidates,
    getProductShopName,
    getProductSellerName,
    isKnownMismatchedProductMedia,
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
    assert.equal(getProductShopName(product.seller), "CRYMA Shop");
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

test("buyer-facing shop name prefers the seller business name", () => {
    assert.equal(
        getProductShopName({ first_name: "Maria", seller_profile: { business_name: "Maria's Closet" } }),
        "Maria's Closet",
    );
    assert.equal(
        getProductShopName({ first_name: "Maria", last_name: "Santos" }),
        "CRYMA Shop",
    );
});

test("product image discovery includes variant photos and excludes products without photos", () => {
    assert.deepEqual(getProductImageCandidates({ id: 2, variants: [
        { color_image_url: " /storage/blue.jpg " },
        { media_type: "video", media_url: "/storage/preview.mp4" },
    ] }), ["/storage/blue.jpg"]);
    assert.deepEqual(getProductImageCandidates({ id: 3, media: [{ type: "video", url: "/storage/preview.mp4" }] }), []);
    assert.deepEqual(getProductImageCandidates({ id: 4, images: [{ video_url: "/storage/preview.mp4" }] }), []);
});

test("product image discovery omits known mismatched catalog media", () => {
    const mismatchedImage = "/storage/products/10/tHbKkfs0Y9zXqUReFgoxxFwYoR9AqrdV1sHRFyYA.jpg";
    assert.equal(isKnownMismatchedProductMedia({ id: 10 }, mismatchedImage), true);
    assert.deepEqual(getProductImageCandidates({ id: 10, image: mismatchedImage }), []);
});
