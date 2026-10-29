export function formatStatusLabel(status, fallback = "Unknown") {
    const normalized = String(status ?? "")
        .trim()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .toLowerCase();

    if (!normalized) return fallback;

    return normalized.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
