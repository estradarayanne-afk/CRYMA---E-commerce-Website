const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export function validateDeliveryProof({ recipientName, photo }) {
    const name = String(recipientName ?? "").trim();
    if (!name) return "Enter the recipient’s full name.";
    if (name.length > 150) return "Recipient name must be 150 characters or fewer.";
    if (!photo) return "Select a delivery photo.";
    if (!PHOTO_TYPES.has(photo.type)) return "Choose a JPEG, PNG, or WebP photo.";
    if (photo.size <= 0) return "Choose a photo file that is not empty.";
    if (photo.size > MAX_PHOTO_SIZE) return "The delivery photo must be 5 MB or smaller.";
    return "";
}
