function personName(person) {
    return (
        [person?.first_name, person?.last_name].filter(Boolean).join(" ") ||
        person?.name ||
        ""
    );
}

export function getConversationIdentity(conversation) {
    const isSupport = Boolean(
        conversation?.type === "support" ||
        conversation?.admin_id ||
        conversation?.admin
    );

    if (isSupport || !conversation?.seller) {
        return {
            name: "CRYMA Customer Service",
            description: "Official CRYMA Support",
            initials: "CS",
            type: "support",
        };
    }

    const sellerName = personName(conversation.seller) || "Marketplace Seller";
    const initials = sellerName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join("")
        .toUpperCase();

    return {
        name: sellerName,
        description: "Product Seller",
        initials: initials || "S",
        type: "seller",
    };
}
