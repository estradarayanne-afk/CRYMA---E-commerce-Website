import { characterLength } from "../../../auth/validation/registrationRules.js";
import { normalizeAccountMobile } from "./accountValidation.js";

const validName = /^[\p{L}\p{M}]+\.?(?:[ '\u2019\-\u2010\u2011][\p{L}\p{M}]+\.?)*$/u;
const validMobile = /^\+639\d{9}$/;
const fieldLimits = {
    region: 100,
    province: 100,
    municipality: 100,
    barangay: 100,
    street: 100,
    house_number: 20,
    building_name: 80,
    unit_number: 30,
};

export function validateBuyerAddress(address) {
    const errors = {};

    if (!["home", "work", "other"].includes(address.label)) {
        errors.label = "Choose an address label.";
    }

    const recipient = String(address.recipient_name ?? "").trim();
    if (!recipient) errors.recipient_name = "Recipient name is required.";
    else if (characterLength(recipient) > 100) errors.recipient_name = "Recipient name must be 100 characters or fewer.";
    else if (!validName.test(recipient)) errors.recipient_name = "Use a valid name with letters, spaces, hyphens, apostrophes, or periods.";

    const normalizedPhone = normalizeAccountMobile(address.phone);
    if (!validMobile.test(normalizedPhone)) {
        errors.phone = "Enter a valid Philippine mobile number, such as 09171234567 or +639171234567.";
    }

    for (const field of ["region", "province", "municipality", "barangay"]) {
        const value = String(address[field] ?? "").trim();
        if (!value) errors[field] = "Choose a value from the Philippine address list.";
        else if (characterLength(value) > fieldLimits[field]) errors[field] = "This field exceeds the 100-character limit.";
    }

    for (const [field, limit] of Object.entries(fieldLimits)) {
        if (["region", "province", "municipality", "barangay"].includes(field)) continue;
        if (characterLength(String(address[field] ?? "")) > limit) {
            errors[field] = `Must be ${limit} characters or fewer.`;
        }
    }

    if (address.postal_code && !/^\d{4}$/.test(address.postal_code)) {
        errors.postal_code = "Enter a four-digit postal code.";
    }

    return errors;
}

export function normalizeBuyerAddress(address) {
    return { ...address, phone: normalizeAccountMobile(address.phone) };
}
