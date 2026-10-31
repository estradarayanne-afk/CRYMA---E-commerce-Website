const ADDRESS_LABELS = new Set(["home", "work", "other", "office"]);

export function parseDeliveryAddress(value) {
    const parts = String(value || "").split(",").map((part) => part.trim()).filter(Boolean);
    let label = "";
    if (parts.length > 1 && ADDRESS_LABELS.has(parts[0].toLowerCase())) {
        label = parts.shift();
    }

    let recipient = "";
    let contact = "";
    const address = [];
    for (const part of parts) {
        if (/^recipient\s*:/i.test(part)) recipient = part.replace(/^recipient\s*:\s*/i, "").trim();
        else if (/^contact\s*:/i.test(part)) contact = part.replace(/^contact\s*:\s*/i, "").trim();
        else address.push(part);
    }

    const addressLines = [];
    for (let index = 0; index < address.length; index += 2) {
        addressLines.push(address.slice(index, index + 2).join(", "));
    }

    return { label, recipient, contact, addressLines };
}
