import { characterLength } from "../../../auth/validation/registrationRules.js";

const MAX_NAME_LENGTH = 30;
const MAX_PASSWORD_LENGTH = 128;
const validName = /^[\p{L}\p{M}]+\.?(?:[ '\u2019\-\u2010\u2011][\p{L}\p{M}]+\.?)*$/u;
const validPhilippineMobile = /^(?:09\d{9}|\+639\d{9})$/;

export function normalizeAccountMobile(value) {
    const compact = String(value ?? "").replace(/[\s()-]/g, "");
    if (/^9\d{9}$/.test(compact)) return `+63${compact}`;
    if (/^09\d{9}$/.test(compact)) return `+63${compact.slice(1)}`;
    return compact;
}

export function validateProfile(values) {
    const errors = {};

    for (const [field, label] of [["first_name", "First name"], ["last_name", "Last name"]]) {
        const value = String(values[field] ?? "");
        if (!value.trim()) errors[field] = `${label} is required.`;
        else if (characterLength(value) > MAX_NAME_LENGTH) {
            errors[field] = `${label} must be 30 characters or fewer.`;
        } else if (!validName.test(value.trim())) {
            errors[field] = "Use letters with spaces, hyphens, apostrophes, or periods.";
        }
    }

    const middleName = String(values.middle_name ?? "");
    if (middleName.trim()) {
        if (characterLength(middleName) > MAX_NAME_LENGTH) {
            errors.middle_name = "Middle name must be 30 characters or fewer.";
        } else if (!validName.test(middleName.trim())) {
            errors.middle_name = "Use letters with spaces, hyphens, apostrophes, or periods.";
        }
    }

    const phone = String(values.phone ?? "");
    if (phone && !validPhilippineMobile.test(normalizeAccountMobile(phone))) {
        errors.phone = "Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.";
    }

    return errors;
}

export function validatePassword(values) {
    const errors = {};
    const currentPassword = String(values.current_password ?? "");
    const password = String(values.password ?? "");
    const confirmation = String(values.password_confirmation ?? "");

    if (!currentPassword) errors.current_password = "Enter your current password.";
    else if (characterLength(currentPassword) > MAX_PASSWORD_LENGTH) {
        errors.current_password = "Password must be 128 characters or fewer.";
    }

    if (characterLength(password) < 8 || characterLength(password) > MAX_PASSWORD_LENGTH) {
        errors.password = "New password must be 8–128 characters.";
    }

    if (confirmation !== password) {
        errors.password_confirmation = "Passwords do not match.";
    }

    return errors;
}

export function validateProfileImage(file) {
    if (!file) return "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return "Choose a JPG, PNG, or WebP image.";
    }
    if (file.size > 2 * 1024 * 1024) {
        return "Profile pictures must be 2 MB or smaller.";
    }
    return "";
}
