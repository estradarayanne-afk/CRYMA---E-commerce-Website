const CODE39_PATTERNS = {
    "0": "nnnwwnwnn",
    "1": "wnnwnnnnw",
    "2": "nnwwnnnnw",
    "3": "wnwwnnnnn",
    "4": "nnnwwnnnw",
    "5": "wnnwwnnnn",
    "6": "nnwwwnnnn",
    "7": "nnnwnnwnw",
    "8": "wnnwnnwnn",
    "9": "nnwwnnwnn",
};

const START_STOP_PATTERN = "nwnnwnwnn";

export function getCode39Barcode(value) {
    const text = String(value ?? "");
    if (!/^\d+$/.test(text)) return null;

    const patterns = [START_STOP_PATTERN, ...Array.from(text, (digit) => CODE39_PATTERNS[digit]), START_STOP_PATTERN];
    const bars = [];
    let x = 10;

    patterns.forEach((pattern, characterIndex) => {
        Array.from(pattern).forEach((width, elementIndex) => {
            const elementWidth = width === "w" ? 3 : 1;
            if (elementIndex % 2 === 0) bars.push({ x, width: elementWidth });
            x += elementWidth;
        });
        if (characterIndex < patterns.length - 1) x += 1;
    });

    return { width: x + 10, bars };
}
