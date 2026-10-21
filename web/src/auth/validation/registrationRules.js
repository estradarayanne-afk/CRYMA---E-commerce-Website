import { PRODUCT_CATEGORIES } from "../../shared/constants/categories.js";

export const REGISTRATION_LIMITS = Object.freeze({
    firstName: 30,
    middleName: 2,
    lastName: 30,
    email: 254,
    phone: 10,
    password: 128,
    houseNumber: 20,
    street: 100,
    buildingName: 80,
    unitNumber: 30,
    postalCode: 4,
    businessName: 100,
    tin: 13,
    plateNumber: 15,
});

export function capitalizeNameWords(value) {
    return String(value ?? "").replace(
        /(^|[\s'-])(\p{L})/gu,
        (_, boundary, letter) => `${boundary}${letter.toLocaleUpperCase()}`
    );
}

// Array.from counts Unicode code points, matching PHP mb_strlen for these fields.
export function characterLength(value) {
    return Array.from(String(value ?? "")).length;
}

export function getPhilippineCalendarDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function normalizePhilippineMobile(value) {
    const compact = String(value ?? "").replace(/[\s()-]/g, "");
    if (/^9\d{9}$/.test(compact)) return `+63${compact}`;
    if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
    return compact;
}

const validName = (value) => /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u.test(value);
const validPhilippineMobile = (value) => /^9\d{9}$/.test(value);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function calculateAgeOnDate(value, today = null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    // Construct and compare local calendar dates; avoid UTC parsing of YYYY-MM-DD.
    const birth = new Date(0);
    birth.setFullYear(year, month - 1, day);
    birth.setHours(0, 0, 0, 0);
    const todayString = today instanceof Date
        ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
        : getPhilippineCalendarDate(today ?? new Date());
    const [todayYear, todayMonth, todayDay] = todayString.split("-").map(Number);
    const current = new Date(todayYear, todayMonth - 1, todayDay);
    if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day || birth > current) return null;
    let age = current.getFullYear() - year;
    if (current.getMonth() < month - 1 || (current.getMonth() === month - 1 && current.getDate() < day)) age--;
    return age;
}

const requiredTextError = (value, label, maximum) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return `${label} is required.`;
    if (characterLength(value) > maximum) return `${label} must not exceed ${maximum} characters.`;
    return "";
};

export function getRegistrationStepErrors(step, values) {
    const errors = {};
    const add = (field, message) => { if (message) errors[field] = message; };

    if (step === 1) {
        add("firstName", requiredTextError(values.firstName, "First name", REGISTRATION_LIMITS.firstName));
        if (!errors.firstName && !validName(values.firstName.trim())) errors.firstName = "Use letters, spaces, hyphens, or apostrophes for your first name.";
        add("lastName", requiredTextError(values.lastName, "Last name", REGISTRATION_LIMITS.lastName));
        if (!errors.lastName && !validName(values.lastName.trim())) errors.lastName = "Use letters, spaces, hyphens, or apostrophes for your last name.";
        if (characterLength(values.middleName) > REGISTRATION_LIMITS.middleName) errors.middleName = "Middle initial must not exceed 2 characters.";
        else if (values.middleName && !/^\p{L}\p{M}*\.?$/u.test(values.middleName)) errors.middleName = "Enter one letter with an optional period.";
        const age = calculateAgeOnDate(values.birthDate);
        if (age === null) errors.birthDate = "Enter a valid birthday that is not in the future.";
        else if (age < 18) errors.birthDate = "You must be at least 18 years old to register.";
        if (!["male", "female", "prefer_not_to_say"].includes(values.sex)) errors.sex = "Choose one of the available options.";
    }

    if (step === 2) {
        if (!validPhilippineMobile(String(values.phone ?? ""))) errors.phone = "Enter the 10-digit mobile number after +63, starting with 9.";
        for (const [field, label, max] of [
            ["houseNumber", "House number", REGISTRATION_LIMITS.houseNumber],
            ["street", "Street", REGISTRATION_LIMITS.street],
        ]) add(field, requiredTextError(values[field], label, max));
        for (const [field, label, max] of [
            ["buildingName", "Building", REGISTRATION_LIMITS.buildingName],
            ["unitNumber", "Unit / floor", REGISTRATION_LIMITS.unitNumber],
        ]) if (characterLength(values[field]) > max) errors[field] = `${label} must not exceed ${max} characters.`;
        if (!values.region) errors.region = "Select a region.";
        if (!values.province) errors.province = "Select a province.";
        if (!values.municipality) errors.municipality = "Select a city or municipality.";
        if (!values.barangay) errors.barangay = "Select a barangay.";
        if (!/^\d{4}$/.test(values.postalCode ?? "")) errors.postalCode = "A valid four-digit postal code is required.";
    }

    if (step === 3) {
        const email = String(values.email ?? "").trim();
        if (characterLength(email) < 3 || characterLength(email) > REGISTRATION_LIMITS.email || !validEmail(email)) errors.email = "Enter a valid email address (3–254 characters).";
        if (characterLength(values.password) < 8 || characterLength(values.password) > REGISTRATION_LIMITS.password) errors.password = "Password must be 8–128 characters.";
        if (characterLength(values.passwordConfirmation) < 8 || characterLength(values.passwordConfirmation) > REGISTRATION_LIMITS.password) errors.passwordConfirmation = "Confirmation must be 8–128 characters.";
        else if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = "Passwords do not match.";
    }

    if (step === 4 && ["seller", "logistics"].includes(values.registrationRole)) {
        add("businessName", requiredTextError(values.businessName, "Business name", REGISTRATION_LIMITS.businessName));
        if (values.registrationRole === "seller") {
            if (!PRODUCT_CATEGORIES.includes(values.lineOfBusiness)) errors.lineOfBusiness = "Choose a valid business category.";
            const tin = String(values.tin ?? "").trim();
            if (tin && !/^\d{9,13}$/.test(tin)) errors.tin = "Enter a TIN containing 9 to 13 digits, or leave it blank.";
        }
    }
    if (step === 4 && values.registrationRole === "rider") {
        if (!["motorcycle", "tricycle", "car", "van", "truck"].includes(values.vehicleType)) errors.vehicleType = "Choose a supported vehicle type.";
        add("plateNumber", requiredTextError(values.plateNumber, "Plate number", REGISTRATION_LIMITS.plateNumber));
    }
    if (step === values.verificationStep) {
        if (!values.validId) errors.validId = "Upload a valid ID.";
        if (["seller", "logistics"].includes(values.registrationRole) && !values.businessPermit) errors.businessPermit = "Upload your business permit.";
        if (values.registrationRole === "rider" && !values.orCr) errors.orCr = "Upload the vehicle OR/CR.";
        if (values.registrationRole === "rider" && !values.driversLicense) errors.driversLicense = "Upload your driver's license.";
    }

    return errors;
}
