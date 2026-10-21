export function getBuyerInboxConversations(conversations, supportOnly = false) {
    const rows = Array.isArray(conversations) ? conversations : [];

    if (!supportOnly) {
        return rows.filter((conversation) => Boolean(conversation.seller_id));
    }

    const supportRows = rows.filter((conversation) => Boolean(conversation.admin_id || conversation.admin));
    const emptyRows = supportRows.filter((conversation) => !conversation.messages?.length);
    const canonicalEmpty = emptyRows.reduce((oldest, current) => (
        !oldest || Number(current.id) < Number(oldest.id) ? current : oldest
    ), null);

    return supportRows.filter((conversation) => (
        Boolean(conversation.messages?.length) || conversation === canonicalEmpty
    ));
}
