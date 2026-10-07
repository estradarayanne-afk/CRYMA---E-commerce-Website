import postalCodeData from "../data/philpostZipCodes.json" with { type: "json" };

export const normalizePlaceName = (name) => {
    const words = String(name || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        // Treat punctuation, hyphens, apostrophes, and repeated whitespace alike.
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/^(?:(?:city|municipality|province) of)\s+/, "")
        .replace(/\s+(?:city|municipality|province)$/, "")
        .split(/\s+/)
        .filter(Boolean);

    return words
        .map((word) => {
            if (word === "sta") return "santa";
            if (word === "sto") return "santo";
            return word;
        })
        .join(" ");
};

const postalCodesByLocation = new Map();

postalCodeData.records.forEach((record) => {
    const province = normalizePlaceName(record.province);
    const locality = normalizePlaceName(record.locality);

    if (!province || !locality || !record.postalCode) {
        return;
    }

    const key = `${province}|${locality}`;
    const postalCodes = postalCodesByLocation.get(key) || new Set();
    postalCodes.add(String(record.postalCode).trim());
    postalCodesByLocation.set(key, postalCodes);
});

const findUnambiguousPostalCode = (province, locality) => {
    const postalCodes = postalCodesByLocation.get(`${province}|${locality}`);
    return postalCodes?.size === 1 ? [...postalCodes][0] : "";
};

export function getPhilPostPostalCode(
    province,
    municipality
) {
    const normalizedProvince = normalizePlaceName(province);
    const normalizedMunicipality = normalizePlaceName(municipality);

    if (!normalizedProvince || !normalizedMunicipality) {
        return "";
    }

    // The source dataset maps province/locality postal codes, not barangays.
    // Avoid returning an unrelated municipality code for a same-named barangay.
    return findUnambiguousPostalCode(normalizedProvince, normalizedMunicipality);
}
