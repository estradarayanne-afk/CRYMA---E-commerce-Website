import assert from "node:assert/strict";
import test from "node:test";
import {
    characterLength,
    calculateAgeOnDate,
    getRegistrationStepErrors,
    normalizePhilippineMobile,
} from "./registrationRules.js";

const personal = {
    firstName: "María José",
    middleName: "A.",
    lastName: "Dela Cruz-O'Neil",
    birthDate: "1990-01-01",
    sex: "female",
};

test("calculates age by complete local calendar date", () => {
    const today = new Date(2026, 5, 15, 23, 59);
    assert.equal(calculateAgeOnDate("2008-06-16", today), 17);
    assert.equal(calculateAgeOnDate("2008-06-15", today), 18);
    assert.equal(calculateAgeOnDate("2008-01-01", today), 18);
    assert.equal(calculateAgeOnDate("2026-06-15", today), 0);
    assert.equal(calculateAgeOnDate("2026-06-16", today), null);
    assert.equal(calculateAgeOnDate("2027-01-01", today), null);
    assert.equal(calculateAgeOnDate("2024-02-29", new Date(2026, 1, 28)), 1);
    assert.equal(calculateAgeOnDate("2000-02-29", new Date(2026, 1, 28)), 25);
    assert.equal(calculateAgeOnDate("2023-02-30", today), null);
    assert.equal(calculateAgeOnDate("2008/06/15", today), null);
});

test("registration step rejects underage applicants, including one day before 18", () => {
    const today = new Date();
    const justUnder = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate() + 1);
    const iso = `${justUnder.getFullYear()}-${String(justUnder.getMonth() + 1).padStart(2, "0")}-${String(justUnder.getDate()).padStart(2, "0")}`;
    assert.match(getRegistrationStepErrors(1, { ...personal, birthDate: iso }).birthDate, /18 years old/);
});

test("accepts Unicode Filipino names and middle initials", () => {
    assert.deepEqual(getRegistrationStepErrors(1, personal), {});
    assert.equal(characterLength("é".repeat(30)), 30);
});

test("blocks empty and over-limit personal names and future birthdays", () => {
    assert.ok(getRegistrationStepErrors(1, { ...personal, firstName: "   " }).firstName);
    assert.match(getRegistrationStepErrors(1, { ...personal, firstName: "A".repeat(31) }).firstName, /30 characters/);
    assert.match(getRegistrationStepErrors(1, { ...personal, firstName: "A".repeat(10000) }).firstName, /30 characters/);
    assert.deepEqual(getRegistrationStepErrors(1, { ...personal, firstName: "A".repeat(30), lastName: "B".repeat(30) }), {});
    assert.ok(getRegistrationStepErrors(1, { ...personal, middleName: "ABC" }).middleName);
    assert.ok(getRegistrationStepErrors(1, { ...personal, birthDate: "2999-01-01" }).birthDate);
});

test("validates addresses and normalizes supported Philippine mobile formats", () => {
    assert.equal(normalizePhilippineMobile("9171234567"), "+639171234567");
    assert.equal(normalizePhilippineMobile("+63 917-123-4567"), "+639171234567");
    assert.equal(normalizePhilippineMobile("09171234567"), "+639171234567");
    assert.deepEqual(getRegistrationStepErrors(2, {
        phone: "9171234567", region: "NCR", province: "Metro Manila",
        municipality: "Manila", barangay: "Barangay 1", houseNumber: "12-A",
        street: "Rizal St.", buildingName: "", unitNumber: "", postalCode: "1000",
    }), {});
    assert.ok(getRegistrationStepErrors(2, { phone: "123", houseNumber: " ", street: "" }).phone);
    assert.deepEqual(getRegistrationStepErrors(2, {
        phone: "9171234567", region: "NCR", province: "Metro Manila",
        municipality: "Manila", barangay: "Barangay 1", houseNumber: "1".repeat(20),
        street: "S".repeat(100), buildingName: "B".repeat(80), unitNumber: "U".repeat(30), postalCode: "1000",
    }), {});
    assert.ok(getRegistrationStepErrors(2, {
        phone: "09171234567", region: "NCR", province: "Metro Manila",
        municipality: "Manila", barangay: "Barangay 1", houseNumber: "1".repeat(21),
        street: "S".repeat(101), buildingName: "", unitNumber: "", postalCode: "1000",
    }).street);
});

test("requires a ten digit subscriber number beginning with 9 after the fixed country prefix", () => {
    const address = { region: "NCR", province: "Metro Manila", municipality: "Manila", barangay: "Barangay 1", houseNumber: "1", street: "Road", postalCode: "1000" };
    for (const phone of ["", "917123456", "0171234567", "+639171234567", "917123456a", "91712345678"]) {
        assert.ok(getRegistrationStepErrors(2, { ...address, phone }).phone, `expected ${phone} to fail`);
    }
    assert.equal(getRegistrationStepErrors(2, { ...address, phone: "9171234567" }).phone, undefined);
});

test("enforces email and password boundaries", () => {
    const password = "x".repeat(8);
    assert.deepEqual(getRegistrationStepErrors(3, { email: "a@b.com", password, passwordConfirmation: password }), {});
    assert.deepEqual(getRegistrationStepErrors(3, { email: `${"a".repeat(242)}@example.com`, password: "x".repeat(128), passwordConfirmation: "x".repeat(128) }), {});
    assert.ok(getRegistrationStepErrors(3, { email: `${"a".repeat(250)}@example.com`, password, passwordConfirmation: password }).email);
    assert.ok(getRegistrationStepErrors(3, { email: "a@b.com", password: "x".repeat(129), passwordConfirmation: "x".repeat(129) }).password);
    assert.ok(getRegistrationStepErrors(3, { email: "a@b.com", password, passwordConfirmation: `${password}x` }).passwordConfirmation);
});

test("enforces role-specific business and vehicle limits", () => {
    assert.deepEqual(getRegistrationStepErrors(4, { registrationRole: "seller", businessName: "Local Shop", lineOfBusiness: "Pet Supplies" }), {});
    assert.ok(getRegistrationStepErrors(4, { registrationRole: "seller", businessName: "B".repeat(101), lineOfBusiness: "Pet Supplies" }).businessName);
    assert.deepEqual(getRegistrationStepErrors(4, { registrationRole: "logistics", businessName: "North Sorting Center" }), {});
    assert.ok(getRegistrationStepErrors(4, { registrationRole: "logistics", businessName: " " }).businessName);
    assert.ok(getRegistrationStepErrors(4, { registrationRole: "rider", vehicleType: "motorcycle", plateNumber: "P".repeat(16) }).plateNumber);
});

test("requires valid ID and business permit for logistics registration", () => {
    const errors = getRegistrationStepErrors(5, {
        registrationRole: "logistics",
        verificationStep: 5,
        validId: null,
        businessPermit: null,
    });
    assert.ok(errors.validId);
    assert.ok(errors.businessPermit);
    assert.deepEqual(getRegistrationStepErrors(5, {
        registrationRole: "logistics",
        verificationStep: 5,
        validId: { name: "id.pdf" },
        businessPermit: { name: "permit.pdf" },
    }), {});
});

test("TIN is optional for sellers and accepts supported numeric TIN lengths only", () => {
    for (const tin of ["123456789", "123456789012", "1234567890123"]) {
        assert.equal(getRegistrationStepErrors(4, { registrationRole: "seller", businessName: "Local Shop", lineOfBusiness: "Pet Supplies", tin }).tin, undefined);
    }
    for (const tin of ["12345678", "12345678A", "12345678901234", "123-456-789"]) {
        assert.ok(getRegistrationStepErrors(4, { registrationRole: "seller", businessName: "Local Shop", lineOfBusiness: "Pet Supplies", tin }).tin);
    }
    assert.equal(getRegistrationStepErrors(4, { registrationRole: "seller", businessName: "Local Shop", lineOfBusiness: "Pet Supplies", tin: "" }).tin, undefined);
    assert.deepEqual(getRegistrationStepErrors(4, { registrationRole: "buyer" }), {});
    assert.deepEqual(getRegistrationStepErrors(4, { registrationRole: "rider", vehicleType: "motorcycle", plateNumber: "ABC123" }), {});
});
