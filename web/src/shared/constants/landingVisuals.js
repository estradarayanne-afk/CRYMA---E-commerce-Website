const unsplash = (photoId, width = 1100) =>
    `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=85`;

export const LANDING_VISUALS = {
    hero: {
        src: unsplash("photo-1556742049-0cfed4f6a45d", 1400),
        alt: "A shopper browsing and paying for products online",
    },
    logistics: {
        src: unsplash("photo-1601584115197-04ecc0da31d7", 1000),
        alt: "A delivery truck moving parcels along a road",
    },
    sellerRegistration: {
        src: unsplash("photo-1441986300917-64674bd600d8", 1200),
        alt: "A modern retail store with clothing and product displays",
    },
    categories: {
        "Pet Supplies": {
            src: unsplash("photo-1548199973-03cce0bbc87b", 800),
            alt: "Dogs running outdoors",
            position: "center 48%",
        },
        "Electronics & Gadgets": {
            src: unsplash("photo-1498049794561-7780e7231661", 800),
            alt: "A selection of modern electronic devices",
            position: "center",
        },
        "Women's Apparel": {
            src: unsplash("photo-1483985988355-763728e1935b", 800),
            alt: "Friends browsing apparel in a clothing store",
            position: "center 44%",
        },
        "Men's Apparel": {
            src: unsplash("photo-1516257984-b1b4d707412e", 800),
            alt: "Contemporary men's clothing",
            position: "center 40%",
        },
        "Kids & Baby": {
            src: unsplash("photo-1519689680058-324335c77eba", 800),
            alt: "A young child resting comfortably",
            position: "center",
        },
        "Home & Garden": {
            src: unsplash("photo-1600210492486-724fe5c67fb0", 800),
            alt: "A bright, modern home interior",
            position: "center",
        },
        "Sports & Outdoors": {
            src: unsplash("photo-1461896836934-ffe607ba8211", 800),
            alt: "Runners training outdoors",
            position: "center 42%",
        },
        "Health & Beauty": {
            src: unsplash("photo-1596462502278-27bfdc403348", 800),
            alt: "Beauty and personal care products",
            position: "center",
        },
        "Books & Media": {
            src: unsplash("photo-1507842217343-583bb7270b66", 800),
            alt: "Shelves of books in a library",
            position: "center",
        },
        "Food & Gourmet": {
            src: unsplash("photo-1542838132-92c53300491e", 800),
            alt: "Fresh produce at a grocery market",
            position: "center",
        },
        "Automotive & Motorcycle": {
            src: unsplash("photo-1486262715619-67b85e0b08d3", 800),
            alt: "Automotive parts and tools",
            position: "center",
        },
        "Furniture & Office Equipment": {
            src: unsplash("photo-1497366754035-f200968a6e72", 800),
            alt: "A well-lit contemporary workspace",
            position: "center",
        },
        "Jewelry & Watches": {
            src: unsplash("photo-1617038220319-276d3cfab638", 800),
            alt: "A selection of jewelry accessories",
            position: "center",
        },
        "Office & School Supplies": {
            src: unsplash("photo-1453738773917-9c3eff1db985", 800),
            alt: "Study and office supplies on a desk",
            position: "center",
        },
    },
};

export const HERO_DISCOVERY_CATEGORIES = [
    "Electronics & Gadgets",
    "Home & Garden",
    "Sports & Outdoors",
];

export function getLandingCategoryVisual(category) {
    const key = Object.keys(LANDING_VISUALS.categories).find(
        (name) => name.toLowerCase() === String(category || "").trim().toLowerCase()
    );

    return key ? LANDING_VISUALS.categories[key] : null;
}
