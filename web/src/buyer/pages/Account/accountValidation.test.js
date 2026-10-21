import assert from "node:assert/strict";
import test from "node:test";
import {
    normalizeAccountMobile,
    validatePassword,
    validateProfile,
    validateProfileImage,
} from "./accountValidation.js";

const profile = {
    first_name: "Ana María",
    middle_name: "Joy",
    last_name: "Dela Cruz-O'Neil",
    phone: "09171234567",
};

test("profile validation enforces required, nonblank, and 30-character names", () => {
    assert.deepEqual(validateProfile(profile), {});
    assert.match(validateProfile({ ...profile, first_name: "   " }).first_name, /required/);
    assert.match(validateProfile({ ...profile, last_name: "B".repeat(31) }).last_name, /30 characters/);
    assert.equal(validateProfile({ ...profile, first_name: "A".repeat(30) }).first_name, undefined);
    assert.equal(validateProfile({ ...profile, middle_name: "M".repeat(30) }).middle_name, undefined);
});

test("profile validation allows common Unicode name punctuation", () => {
    assert.deepEqual(validateProfile({
        ...profile,
        first_name: "Mary Jane",
        middle_name: "O’Neil",
        last_name: "St. John-Smith",
    }), {});
});

test("mobile validation accepts supported Philippine formats and rejects invalid values", () => {
    for (const phone of ["09171234567", "+639171234567", "9171234567", "+63 917-123-4567"]) {
        assert.equal(validateProfile({ ...profile, phone }).phone, undefined);
    }
    assert.equal(normalizeAccountMobile("(0917) 123-4567"), "+639171234567");
    for (const phone of ["1234567890", "08171234567", "+63917123456", "091712345678"]) {
        assert.ok(validateProfile({ ...profile, phone }).phone, `expected ${phone} to fail`);
    }
});

test("password validation enforces policy and matching confirmation", () => {
    assert.deepEqual(validatePassword({
        current_password: "old-password",
        password: "new-pass",
        password_confirmation: "new-pass",
    }), {});
    assert.match(validatePassword({
        current_password: "old",
        password: "short",
        password_confirmation: "different",
    }).password, /8–128/);
    assert.match(validatePassword({
        current_password: "old",
        password: "long-enough",
        password_confirmation: "does-not-match",
    }).password_confirmation, /do not match/);
});

test("profile image validation enforces supported MIME types and 2 MB size", () => {
    assert.equal(validateProfileImage({ type: "image/webp", size: 1024 }), "");
    assert.match(validateProfileImage({ type: "application/pdf", size: 1024 }), /JPG, PNG, or WebP/);
    assert.match(validateProfileImage({ type: "image/png", size: 2 * 1024 * 1024 + 1 }), /2 MB/);
});
