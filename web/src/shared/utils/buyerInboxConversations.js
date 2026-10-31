export function getBuyerInboxConversations(conversations, supportOnly = false) {
    const rows = Array.isArray(conversations) ? conversations : [];

    if (!supportOnly) {
        return rows.filter((conversation) => Boolean(conversation.seller_id));
    }

    // A CRYMA support conversation belongs to the buyer even before an admin
    // is assigned. This lets the assistant respond immediately and keeps the
    // same thread available for a human to pick up later.
    const supportRows = rows.filter((conversation) => !conversation.seller_id);
    const conversationsWithMessages = supportRows.filter((conversation) => conversation.messages?.length);
    if (conversationsWithMessages.length > 0) {
        return conversationsWithMessages;
    }

    const emptyRows = supportRows.filter((conversation) => !conversation.messages?.length);
    const canonicalEmpty = emptyRows.reduce((oldest, current) => (
        !oldest || Number(current.id) < Number(oldest.id) ? current : oldest
    ), null);

    return canonicalEmpty ? [canonicalEmpty] : [];
}
