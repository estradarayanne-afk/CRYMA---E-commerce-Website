import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../../shared/services/api";
import { getChatMessageRequestId } from "../../../shared/utils/chatMessageRequest";
import "./Chat.css";

const getConversationActivity = (conversation) => {
    const date = conversation.messages?.[0]?.created_at
        || conversation.updated_at
        || conversation.created_at;
    return date ? new Date(date).getTime() || 0 : 0;
};

const getConversationBuyerKey = (conversation) => {
    const buyerId = conversation.buyer_id ?? conversation.buyer?.id;
    const sellerId = conversation.seller_id ?? conversation.seller?.id;
    if (sellerId != null) return `buyer:${buyerId}:seller:${sellerId}`;
    return buyerId == null ? `conversation:${conversation.id}` : `buyer:${buyerId}`;
};

const getConversationInbox = (conversation) => (
    conversation.seller_id != null || conversation.seller?.id != null
        ? "sellers"
        : conversation.buyer?.role === "logistics"
            ? "logistics"
            : conversation.buyer?.role === "rider"
                ? "couriers"
                : "buyers"
);

const getPersonName = (person, fallback) => (
    `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || fallback
);

const formatMessageTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
};

const quickReplyGroups = {
    buyers: [
        { label: "Welcome", text: "Hi! Thanks for reaching out to CRYMA. How can I help you today?" },
        { label: "Order details", text: "Could you share your order number so I can check this for you?" },
        { label: "Checking this", text: "I’m checking this with the relevant team and will update you shortly." },
        { label: "Follow up", text: "Thanks for your patience. Is there anything else I can help you with?" },
    ],
    sellers: [
        { label: "Welcome", text: "Hi! Thanks for contacting CRYMA Seller Support. How can we help?" },
        { label: "Listing details", text: "Please share the product name or listing link you need help with." },
        { label: "Reviewing", text: "We’re reviewing the details and will get back to you shortly." },
        { label: "Next steps", text: "Your request has been received. We’ll follow up with the next steps." },
    ],
    logistics: [
        { label: "Welcome", text: "Hi! Thanks for contacting CRYMA Support. How can I help?" },
        { label: "Order details", text: "Please share the order number so I can check the delivery details." },
        { label: "Delivery check", text: "We’re checking the delivery details and will get back to you shortly." },
        { label: "Parcel status", text: "Please confirm the current parcel status and delivery area." },
    ],
    couriers: [
        { label: "Welcome", text: "Hi! Thanks for the update. How can I help?" },
        { label: "Order details", text: "Please share the order number so I can check this for you." },
        { label: "Delivery check", text: "We’re checking the delivery details and will get back to you shortly." },
        { label: "Follow up", text: "Thanks for your patience. We’ll update you as soon as we have confirmation." },
    ],
};

const inboxOptions = [
    { key: "all", label: "All chats" },
    { key: "buyers", label: "Buyers" },
    { key: "sellers", label: "Sellers" },
    { key: "logistics", label: "Logistics" },
    { key: "couriers", label: "Couriers" },
];

const getUniqueBuyerConversations = (items) => {
    const groups = new Map();

    items.forEach((conversation) => {
        const key = getConversationBuyerKey(conversation);
        const group = groups.get(key) || { latest: null, ids: [], unreadCount: 0 };

        group.ids.push(conversation.id);
        group.unreadCount += Number(conversation.unread_messages_count || 0);
        if (!group.latest || getConversationActivity(conversation) > getConversationActivity(group.latest)) {
            group.latest = conversation;
        }
        groups.set(key, group);
    });

    return Array.from(groups.values())
        .map(({ latest, ids, unreadCount }) => ({
            ...latest,
            groupedConversationIds: ids,
            unread_messages_count: unreadCount,
        }))
        .sort((a, b) => getConversationActivity(b) - getConversationActivity(a));
};

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [message, setMessage] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [activeInbox, setActiveInbox] = useState("all");

    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);
    const uniqueConversations = useMemo(
        () => getUniqueBuyerConversations(conversations),
        [conversations]
    );
    const filteredConversations = useMemo(() => {
        const query = userSearch.trim().toLocaleLowerCase();
        return uniqueConversations.filter((conversation) => {
            if (activeInbox !== "all" && getConversationInbox(conversation) !== activeInbox) return false;
            if (!query) return true;
            const buyer = conversation.buyer;
            const seller = conversation.seller;
            const searchable = [
                getPersonName(buyer, "Buyer"), buyer?.email,
                getPersonName(seller, "Seller"), seller?.email,
                conversation.product?.name,
            ].filter(Boolean).join(" ");
            return searchable.toLocaleLowerCase().includes(query);
        });
    }, [uniqueConversations, userSearch, activeInbox]);
    const inboxCounts = useMemo(() => uniqueConversations.reduce((counts, conversation) => {
        counts.all += 1;
        counts[getConversationInbox(conversation)] += 1;
        return counts;
    }, { all: 0, buyers: 0, sellers: 0, logistics: 0, couriers: 0 }), [uniqueConversations]);
    const selectedConversationKey = selectedConversation
        ? getConversationBuyerKey(selectedConversation)
        : null;
    const selectedChatPerson = selectedConversation
        ? activeInbox === "sellers" ? selectedConversation.seller : selectedConversation.buyer
        : null;
    const suggestedReplies = selectedConversation
        ? quickReplyGroups[getConversationInbox(selectedConversation)] || quickReplyGroups.buyers
        : [];

    const loadConversations = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get(
                "/admin/chat/conversations"
            );

            setConversations(response.data.data || []);
        } catch (err) {
            console.error(
                "Failed to load conversations:",
                err
            );

            setError("Unable to load conversations.");
        } finally {
            setLoading(false);
        }
    }, []);

    const openConversation = async (conversation) => {
        const id = conversation.id;
        const groupedIds = conversation.groupedConversationIds || [id];
        const requestId = ++openRequestRef.current;
        try {
            setMessagesLoading(true);
            setError("");

            const response = await api.get(
                `/admin/chat/conversations/${id}`
            );

            if (requestId !== openRequestRef.current) return;
            setSelectedConversation({
                ...response.data.data,
                groupedConversationIds: groupedIds,
            });

            await Promise.allSettled(groupedIds.map((conversationId) => (
                api.patch(`/admin/chat/conversations/${conversationId}/read`)
            )));
            if (requestId !== openRequestRef.current) return;
            const readIds = new Set(groupedIds.map(String));
            setConversations((previous) => previous.map((item) => (
                readIds.has(String(item.id))
                    ? { ...item, unread_messages_count: 0 }
                    : item
            )));
        } catch (err) {
            if (requestId !== openRequestRef.current) return;
            console.error(
                "Failed to load conversation:",
                err
            );

            setError("Unable to load conversation.");
        } finally {
            if (requestId === openRequestRef.current) {
                setMessagesLoading(false);
            }
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadConversations();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [loadConversations]);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        const trimmedMessage = message.trim();
        if (!trimmedMessage || !selectedConversation || sending) {
            return;
        }

        const requestId = getChatMessageRequestId(
            pendingMessageRef.current,
            trimmedMessage,
            selectedConversation.id
        );
        pendingMessageRef.current = { message: trimmedMessage, scope: selectedConversation.id, id: requestId };

        try {
            setSending(true);

            const response = await api.post(
                `/admin/chat/conversations/${selectedConversation.id}/messages`,
                {
                    message: trimmedMessage,
                    client_message_id: requestId,
                }
            );

            setSelectedConversation((previous) => previous?.id === selectedConversation.id
                ? {
                      ...previous,
                      messages: (previous.messages || []).some((item) => item.id === response.data.data.id)
                          ? previous.messages
                          : [...(previous.messages || []), response.data.data],
                  }
                : previous);

            setMessage("");
            pendingMessageRef.current = null;
        } catch (err) {
            console.error(
                "Failed to send message:",
                err
            );

            setError("Unable to send message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="chat-page">

            {/* HEADER */}

            <section className="chat-page-header">
                <div>
                    <span className="chat-eyebrow">
                        CRYMA SUPPORT
                    </span>

                    <h1>Customer Service</h1>

                    <p>
                        Communicate with buyers and provide
                        platform assistance.
                    </p>
                </div>
            </section>

            {error && (
                <div className="chat-error">
                    {error}
                </div>
            )}

            {/* CHAT PANEL */}

            <section className="chat-panel">

                {/* CONVERSATIONS */}

                <aside className="chat-conversations">

                    <div className="chat-conversations-header">
                        <h2>{activeInbox === "all" ? "All conversations" : `${inboxOptions.find((item) => item.key === activeInbox)?.label} chats`}</h2>

                        <span>
                            {inboxCounts[activeInbox]}
                        </span>
                    </div>

                    <nav className="chat-inbox-nav" aria-label="Filter conversations by user role">
                        {inboxOptions.map((item) => (
                            <button
                                type="button"
                                key={item.key}
                                className={activeInbox === item.key ? "active" : ""}
                                aria-pressed={activeInbox === item.key}
                                onClick={() => {
                                    setActiveInbox(item.key);
                                    if (selectedConversation && item.key !== "all" && getConversationInbox(selectedConversation) !== item.key) {
                                        openRequestRef.current += 1;
                                        setSelectedConversation(null);
                                        setMessagesLoading(false);
                                    }
                                }}
                            >
                                <span>{item.label}</span>
                                <small>{inboxCounts[item.key]}</small>
                            </button>
                        ))}
                    </nav>

                    <label className="conversation-search">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" />
                        </svg>
                        <input
                            type="search"
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                            placeholder={`Search ${activeInbox === "all" ? "conversations" : activeInbox}...`}
                            aria-label="Search conversations by participant, email, or product"
                        />
                    </label>

                    <div className="conversation-list">

                        {loading ? (
                            <div className="chat-empty">
                                Loading conversations...
                            </div>
                        ) : filteredConversations.length === 0 && userSearch.trim() === "" ? (
                            activeInbox === "all" ? (
                                <div className="chat-empty">
                                    No conversations yet.
                                </div>
                            ) : (
                                <div className="chat-empty">
                                    No {inboxOptions.find((item) => item.key === activeInbox)?.label.toLowerCase()} conversations yet.
                                </div>
                            )
                        ) : filteredConversations.length === 0 ? (
                            <div className="chat-empty">
                                No conversations match that search.
                            </div>
                        ) : (
                            filteredConversations.map((conversation) => {
                                const isSellerChat = getConversationInbox(conversation) === "sellers";
                                const primaryPerson = activeInbox === "sellers" ? conversation.seller : conversation.buyer;
                                const name = getPersonName(primaryPerson, activeInbox === "sellers" ? "Seller" : "Buyer");
                                const context = isSellerChat
                                    ? activeInbox === "sellers"
                                        ? `Buyer: ${getPersonName(conversation.buyer, "Buyer")}${conversation.product?.name ? ` - ${conversation.product.name}` : ""}`
                                        : `Seller conversation - ${getPersonName(conversation.seller, "Seller")}`
                                    : primaryPerson?.email || "Buyer support";

                                return (
                                    <button
                                        type="button"
                                        key={conversation.id}
                                        className={
                                            selectedConversationKey ===
                                                getConversationBuyerKey(conversation)
                                                ? "conversation-item active"
                                                : "conversation-item"
                                        }
                                        onClick={() =>
                                            openConversation(conversation)
                                        }
                                    >
                                        <div className="conversation-avatar">
                                            {primaryPerson?.first_name
                                                ?.charAt(0)
                                                ?.toUpperCase() || (isSellerChat ? "S" : "B")}
                                        </div>

                                        <div className="conversation-info">
                                            <strong>{name}</strong>
                                            <small className={`chat-conversation-context ${isSellerChat ? "seller" : "buyer"}`}>{context}</small>

                                            <span>
                                                {conversation.messages?.[0]
                                                    ?.message ||
                                                    "No messages yet"}
                                            </span>
                                            {Number(conversation.unread_messages_count || 0) > 0 && (
                                                <span className="chat-unread-indicator">Unread messages</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}

                    </div>
                </aside>

                {/* MESSAGE AREA */}

                <main className="chat-window">

                    {!selectedConversation ? (
                        <div className="chat-placeholder">
                            <div className="chat-placeholder-icon">
                                💬
                            </div>

                            <h2>
                                Select a conversation
                            </h2>

                            <p>
                                Choose a conversation from the
                                left to start messaging.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* CHAT HEADER */}

                            <header className="chat-window-header">

                                <div className="chat-user-avatar">
                                    {selectedChatPerson
                                        ?.first_name
                                        ?.charAt(0)
                                        ?.toUpperCase() || "B"}
                                </div>

                                <div>
                                    <h2>
                                        {getPersonName(selectedChatPerson, activeInbox === "sellers" ? "Seller" : "Buyer")}
                                    </h2>

                                    <span>
                                        {activeInbox === "sellers"
                                            ? `Seller conversation with ${getPersonName(selectedConversation.buyer, "Buyer")}`
                                            : selectedConversation.seller
                                                ? `Buyer conversation with ${getPersonName(selectedConversation.seller, "Seller")}`
                                                : "Buyer support"}
                                    </span>
                                </div>

                            </header>

                            {/* MESSAGES */}

                            <div className="chat-messages">

                                {messagesLoading ? (
                                    <div className="chat-empty">
                                        Loading messages...
                                    </div>
                                ) : selectedConversation.messages
                                    ?.length === 0 ? (
                                    <div className="chat-empty">
                                        No messages in this
                                        conversation.
                                    </div>
                                ) : (
                                    selectedConversation.messages.map(
                                        (item) => {
                                            const isAdmin =
                                                Number(item.sender_id) !==
                                                Number(selectedConversation.buyer_id);

                                            return (
                                                <div
                                                    key={item.id}
                                                    className={
                                                        isAdmin
                                                            ? "message-row admin"
                                                            : "message-row buyer"
                                                    }
                                                >
                                                    <div className="message-bubble">
                                                        <p>{item.message}</p>
                                                        {formatMessageTime(item.created_at) && (
                                                            <time>{isAdmin ? "You · " : ""}{formatMessageTime(item.created_at)}</time>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    )
                                )}

                            </div>

                            {/* MESSAGE FORM */}

                            <form
                                className="chat-input-area"
                                onSubmit={handleSendMessage}
                            >
                                <div className="chat-reply-suggestions" aria-label="Suggested replies">
                                    <div className="chat-reply-heading">
                                        <strong>Quick replies</strong>
                                        <span>Choose one to add it to your message</span>
                                    </div>
                                    <div className="chat-reply-chips">
                                        {suggestedReplies.map((reply) => (
                                            <button
                                                type="button"
                                                key={reply.label}
                                                title={reply.text}
                                                disabled={sending || messagesLoading}
                                                onClick={() => setMessage(reply.text)}
                                            >
                                                {reply.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="chat-composer">
                                    <input
                                        type="text"
                                        maxLength={2000}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Write a thoughtful reply..."
                                        aria-label="Write a chat message"
                                        disabled={sending || messagesLoading}
                                    />

                                    <button
                                        type="submit"
                                        disabled={sending || messagesLoading || !message.trim()}
                                    >
                                        {sending ? "Sending..." : "Send message"}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                </main>

            </section>
        </div>
    );
}

export default Chat;
