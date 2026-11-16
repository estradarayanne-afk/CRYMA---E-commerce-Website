import { normalizePsgcPlaceName } from "./normalizePsgcPlaceName.js";

const locationNameVariants = (value) => {
    const name = normalizePsgcPlaceName(String(value ?? "")).trim().toLocaleLowerCase();
    const parenthetical = name.match(/\(([^()]*)\)\s*$/u)?.[1]?.trim();

    return new Set([
        name,
        name.replace(/^city of\s+/u, ""),
        name.replace(/\s*\([^()]*\)\s*$/u, "").trim(),
        parenthetical,
    ].filter(Boolean));
};

export const findPlace = (places, value) => {
    const variants = locationNameVariants(value);

    return places.find((place) => (
        [...locationNameVariants(place.name)].some((variant) => variants.has(variant))
    ));
};

export const getAvailableRegions = (regions, allowedRegions) => {
    if (!Array.isArray(allowedRegions)) return regions;

    return regions.flatMap((place) => {
        const allowedName = allowedRegions.find((name) => findPlace([place], name));
        return allowedName ? [{ ...place, name: allowedName }] : [];
    });
};

export function getSelectedRegionName(regions, allowedRegions, selectedCode) {
    return getAvailableRegions(regions, allowedRegions)
        .find((region) => String(region.code) === String(selectedCode))
        ?.name || "";
}
