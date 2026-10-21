import test from "node:test";
import assert from "node:assert/strict";
import { validateDeliveryProof } from "./deliveryProof.js";

const validPhoto = { type: "image/jpeg", size: 1024 };

test("delivery proof requires recipient name and supported photo", () => {
    assert.match(validateDeliveryProof({ recipientName: " ", photo: validPhoto }), /full name/);
    assert.match(validateDeliveryProof({ recipientName: "A".repeat(151), photo: validPhoto }), /150 characters/);
    assert.match(validateDeliveryProof({ recipientName: "Maria Santos", photo: { type: "image/jpeg", size: 0 } }), /empty/);
    assert.match(validateDeliveryProof({ recipientName: "Maria Santos", photo: null }), /photo/);
    assert.match(validateDeliveryProof({ recipientName: "Maria Santos", photo: { type: "application/pdf", size: 20 } }), /JPEG/);
    assert.match(validateDeliveryProof({ recipientName: "Maria Santos", photo: { ...validPhoto, size: 5 * 1024 * 1024 + 1 } }), /5 MB/);
    assert.equal(validateDeliveryProof({ recipientName: "Maria Santos", photo: validPhoto }), "");
});
