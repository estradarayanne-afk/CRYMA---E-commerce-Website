const ENYE_ENCODING_FIXES = [
    ["\u00c3\u00b1", "\u00f1"],
    ["\u00c3\u2018", "\u00d1"],
    ["\u00c3\u0091", "\u00d1"],
];

export function normalizePsgcPlaceName(value) {
    if (typeof value !== "string") {
        return value;
    }

    return ENYE_ENCODING_FIXES.reduce(
        (name, [misdecoded, enye]) => name.replaceAll(misdecoded, enye),
        value,
    );
}
