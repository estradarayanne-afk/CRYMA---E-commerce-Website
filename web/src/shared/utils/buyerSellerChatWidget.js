import { getBuyerInboxConversations } from "./buyerInboxConversations.js";

const EXCLUDED_ROUTES = ["/buyer/chat", "/buyer/support"];

export function canShowBuyerSellerChatWidget(pathname, isBuyer) {
    return Boolean(isBuyer && !EXCLUDED_ROUTES.some((route) => (
        pathname === route || pathname.startsWith(`${route}/`)
    )));
}

export function getSellerConversations(conversations) {
    return getBuyerInboxConversations(conversations);
}

export function getSellerUnreadCount(conversations) {
    return getSellerConversations(conversations).reduce(
        (count, conversation) => count + Math.max(0, Number(conversation.unread_messages_count) || 0),
        0,
    );
}

export function getSellerMessageUpdates(messages, buyerId) {
    const rows = Array.isArray(messages) ? messages : [];
    const hasUnread = rows.some((message) => (
        Number(message.sender_id) !== Number(buyerId) && !message.is_read
    ));
    return {
        hasUnread,
        readMessages: rows.map((message) => (
            Number(message.sender_id) === Number(buyerId)
                ? message
                : { ...message, is_read: true }
        )),
    };
}

export function mergeSellerSentMessage(messages, newMessage) {
    const current = Array.isArray(messages) ? messages : [];
    if (!newMessage) return current;
    return current.some((message) => String(message.id) === String(newMessage.id))
        ? current
        : [...current, newMessage];
}

export function getSellerConversationDraft(drafts, conversationId) {
    return conversationId === null || conversationId === undefined
        ? ""
        : drafts[String(conversationId)] || "";
}

export function setSellerConversationDraft(drafts, conversationId, value) {
    if (conversationId === null || conversationId === undefined) return drafts;
    return { ...drafts, [String(conversationId)]: value };
}
