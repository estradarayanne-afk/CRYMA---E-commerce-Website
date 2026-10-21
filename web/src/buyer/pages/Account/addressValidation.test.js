import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBuyerAddress, validateBuyerAddress } from "./addressValidation.js";

const validAddress = {
    label: "home",
    recipient_name: "María-Joy O'Neil",
    phone: "0917-123-4567",
    region: "Region VII",
    province: "Cebu",
    municipality: "Cebu City",
    barangay: "Lahug",
    house_number: "18-A",
    building_name: "",
    unit_number: "",
    street: "Market Road",
    postal_code: "6000",
};

test("address validation accepts supported names and Philippine mobile formats", () => {
    assert.deepEqual(validateBuyerAddress(validAddress), {});
    assert.equal(normalizeBuyerAddress(validAddress).phone, "+639171234567");
});

test("address validation rejects blank required values, invalid mobile and over-limit fields", () => {
    const errors = validateBuyerAddress({
        ...validAddress,
        recipient_name: " \t ",
        phone: "08171234567",
        region: "",
        street: "x".repeat(101),
    });

    assert.ok(errors.recipient_name);
    assert.ok(errors.phone);
    assert.ok(errors.region);
    assert.ok(errors.street);
});
