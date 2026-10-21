import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
    Check,
    CheckCheck,
    LoaderCircle,
    MessageCircle,
    Send,
} from "lucide-react";
import api from "../../../shared/services/api";
import { showBuyerToast } from "../../../shared/utils/buyerAccess";
import { getChatMessageRequestId } from "../../../shared/utils/chatMessageRequest";
import { getConversationIdentity } from "../../../shared/utils/getConversationIdentity";
import { getBuyerInboxConversations } from "../../../shared/utils/buyerInboxConversations";
import "./Chat.css";

function getStoredUser() {
    try {
        return JSON.parse(
            localStorage.getItem("user") || "null"
        );
    } catch {
        return null;
    }
}

function formatTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatConversationTime(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = new Date();

    if (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
    ) {
        return date.toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    return date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
    });
}

function Chat({ supportOnly = false }) {
    const user = getStoredUser();
    const userId = user?.id;
    const [searchParams] = useSearchParams();
    const requestedConversationId = searchParams.get("conversation");

    const [conversations, setConversations] =
        useState([]);

    const [selectedConversation, setSelectedConversation] =
        useState(null);

    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] =
        useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [supportAvailable, setSupportAvailable] = useState(true);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);

    const openConversation = useCallback(async (id) => {
        const requestId = ++openRequestRef.current;
        try {
            setMessagesLoading(true);
            setError("");

            const response = await api.get(
                `/buyer/chat/conversations/${id}`
            );

            const conversation =
                response.data?.data || null;
            if (requestId !== openRequestRef.current) return;

            setSelectedConversation(conversation);
            try {
                await api.patch(`/buyer/chat/conversations/${id}/read`);
                if (requestId !== openRequestRef.current) return;
                setSelectedConversation((current) => current?.id === conversation?.id
                    ? {
                        ...current,
                        messages: current.messages?.map((item) => (
                            Number(item.sender_id) === Number(userId)
                                ? item
                                : { ...item, is_read: true }
                        )),
                    }
                    : current);
                setConversations((previous) => previous.map((item) =>
                    String(item.id) === String(id)
                        ? { ...item, unread_messages_count: 0, messages: (item.messages || []).map((lastMessage) => (
                            Number(lastMessage.sender_id) === Number(userId)
                                ? lastMessage
                                : { ...lastMessage, is_read: true }
                        )) }
                        : item
                ));
            } catch (readError) {
                console.error("Failed to mark conversation as read:", readError);
                setError("Conversation opened, but its unread status couldn't be updated.");
            }
        } catch (requestError) {
            if (requestId !== openRequestRef.current) return;
            console.error(
                "Failed to load conversation:",
                requestError
            );

            setError(
                requestError.response?.data
                    ?.message ||
                    "We couldn't open this conversation."
            );
        } finally {
            if (requestId === openRequestRef.current) {
                setMessagesLoading(false);
            }
        }
    }, [userId]);

    const loadConversations = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(
                    "/buyer/chat/conversations"
                );

                const allConversations =
                    response.data?.data || [];
                setSupportAvailable(response.data?.support_available !== false);

                const data = getBuyerInboxConversations(allConversations, supportOnly);

                setConversations(data);

                if (data.length > 0) {
                    const requested = data.find((conversation) => String(conversation.id) === String(requestedConversationId));
                    await openConversation(requested?.id || data[0].id);
                } else {
                    setSelectedConversation(null);
                    setMessage("");
                }
            } catch (requestError) {
                console.error(
                    "Failed to load buyer conversations:",
                    requestError
                );

                setError(
                    requestError.response?.data
                        ?.message ||
                        "We couldn't load your messages."
                );
            } finally {
                setLoading(false);
            }
        },
        [openConversation, requestedConversationId, supportOnly]
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadConversations();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [loadConversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [
        selectedConversation?.messages,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Refresh current conversation
    |--------------------------------------------------------------------------
    |
    | This gives the buyer a simple near-real-time
    | experience without introducing WebSockets yet.
    |
    */

    useEffect(() => {
        if (!selectedConversation?.id) {
            return undefined;
        }
        const requestToken = openRequestRef.current;

        const intervalId = setInterval(async () => {
            try {
                const response = await api.get(
                    `/buyer/chat/conversations/${selectedConversation.id}`
                );

                const conversation =
                    response.data?.data || null;

                if (conversation && requestToken === openRequestRef.current) {
                    const unread = conversation.messages?.some((item) => (
                        Number(item.sender_id) !== Number(userId) && !item.is_read
                    ));
                    if (unread) {
                        await api.patch(`/buyer/chat/conversations/${conversation.id}/read`);
                        if (requestToken !== openRequestRef.current) return;
                        conversation.messages = conversation.messages.map((item) => (
                            Number(item.sender_id) === Number(userId)
                                ? item
                                : { ...item, is_read: true }
                        ));
                    }
                    setSelectedConversation((current) => (
                        String(current?.id) === String(conversation.id)
                            ? conversation
                            : current
                    ));

                    setConversations(
                        (previous) =>
                            previous.map((item) =>
                                item.id ===
                                conversation.id
                                    ? {
                                          ...item,
                                          messages:
                                              conversation.messages?.slice(
                                                  -1
                                              ),
                                          unread_messages_count: 0,
                                          updated_at:
                                              conversation.updated_at,
                                      }
                                    : item
                            )
                    );
                }
            } catch (requestError) {
                console.error(
                    "Failed to refresh conversation:",
                    requestError
                );
            }
        }, 5000);

        return () =>
            clearInterval(intervalId);
    }, [selectedConversation?.id, userId]);

    const handleSendMessage = async (event) => {
        event.preventDefault();

        const trimmedMessage =
            message.trim();

        if (
            !trimmedMessage ||
            !selectedConversation ||
            sending
        ) {
            return;
        }

        try {
            setSending(true);
            setError("");

            const requestId = getChatMessageRequestId(
                pendingMessageRef.current,
                trimmedMessage,
                selectedConversation.id
            );
            pendingMessageRef.current = { message: trimmedMessage, scope: selectedConversation.id, id: requestId };
            const response = await api.post(
                `/buyer/chat/conversations/${selectedConversation.id}/messages`,
                {
                    message: trimmedMessage,
                    client_message_id: requestId,
                }
            );

            const newMessage =
                response.data?.data;

            if (newMessage) {
                setSelectedConversation(
                    (previous) => previous?.id === selectedConversation.id
                        ? {
                            ...previous,
                            messages: [
                                ...(previous.messages || []),
                                ...((previous.messages || []).some((item) => item.id === newMessage.id) ? [] : [newMessage]),
                            ],
                        }
                        : previous
                );
            }

            setMessage("");
            pendingMessageRef.current = null;
            showBuyerToast("Message sent");

            window.setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        } catch (requestError) {
            console.error(
                "Failed to send message:",
                requestError
            );

            setError(
                requestError.response?.data
                    ?.message ||
                    "We couldn't send your message."
            );
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (event) => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();
            handleSendMessage(event);
        }
    };

    const activeIdentity = getConversationIdentity(selectedConversation);
    const supportBlocked = Boolean(
        selectedConversation &&
        activeIdentity.type === "support" &&
        !supportAvailable
    );

    return (
        <main className="buyer-chat-page">
            <div className="buyer-chat-container">
                <header className="buyer-chat-header">
                    <div>
                        <span className="buyer-chat-eyebrow">
                            {supportOnly ? "CRYMA CUSTOMER SERVICE" : "SELLER MESSAGES"}
                        </span>

                        <h1>{supportOnly ? "Customer Service" : "Seller messages"}</h1>

                        <p>
                            {supportOnly
                                ? "Contact CRYMA support about your account, orders, delivery, or payment questions."
                                : "Ask marketplace sellers about their products and listings."}
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="buyer-chat-error" role="alert" aria-live="assertive">
                        {error}
                    </div>
                )}
                {supportOnly && !supportAvailable && (
                    <div className="buyer-chat-support-unavailable" role="status">
                        CRYMA Customer Service is currently unavailable. Please try again later.
                    </div>
                )}

                <section className="buyer-chat-panel">
                    <aside className="buyer-chat-sidebar">
                        <div className="buyer-chat-sidebar-heading">
                            <div>
                                <span>{supportOnly ? "SUPPORT INBOX" : "SELLER INBOX"}</span>

                                <h2>
                                    Conversations
                                </h2>
                            </div>

                            <strong>
                                {conversations.length}
                            </strong>
                        </div>

                        {loading ? (
                            <div className="buyer-chat-empty">
                                <LoaderCircle
                                    size={19}
                                    className="buyer-chat-spinner"
                                />

                                <span>
                                    Loading messages...
                                </span>
                            </div>
                        ) : error && conversations.length === 0 ? (
                            <div className="buyer-chat-empty" role="alert">
                                <MessageCircle size={22} />
                                <span>We couldn't load your conversations.</span>
                                <button type="button" onClick={loadConversations}>Try again</button>
                            </div>
                        ) : conversations.length ===
                          0 ? (
                            <div className="buyer-chat-empty">
                                <MessageCircle
                                    size={22}
                                />

                                <span>
                                    No conversations yet.
                                </span>
                            </div>
                        ) : (
                            <div className="buyer-chat-conversation-list">
                                {conversations.map(
                                    (
                                        conversation
                                    ) => {
                                        const lastMessage =
                                            conversation
                                                .messages?.[0];
                                        const identity = getConversationIdentity(conversation);
                                        const hasUnread = Number(conversation.unread_messages_count || 0) > 0;

                                        return (
                                            <button
                                                type="button"
                                                key={
                                                    conversation.id
                                                }
                                                className={`buyer-chat-conversation ${
                                                    selectedConversation?.id ===
                                                    conversation.id
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    openConversation(
                                                        conversation.id
                                                    )
                                                }
                                            >
                                                <div className={`buyer-chat-avatar ${identity.type}`}>
                                                    {identity.initials}
                                                </div>

                                                <div className="buyer-chat-conversation-info">
                                                    <div className="buyer-chat-conversation-top">
                                                        <strong>
                                                            {identity.name}
                                                        </strong>

                                                        <span>
                                                            {formatConversationTime(
                                                                lastMessage?.created_at ||
                                                                    conversation.updated_at
                                                            )}
                                                        </span>
                                                    </div>

                                                    {hasUnread && <span className="buyer-chat-unread" aria-label="Unread message">New</span>}

                                                    <p>
                                                        {lastMessage?.message ||
                                                            (identity.type === "support" ? "Start a conversation with CRYMA Support." : conversation.product?.name || "Start a conversation with this seller.")}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </aside>

                    <section className="buyer-chat-window">
                        {!selectedConversation ? (
                            <div className="buyer-chat-placeholder">
                                <div className="buyer-chat-placeholder-icon">
                                    <MessageCircle
                                        size={25}
                                    />
                                </div>

                                <h2>Your messages</h2>

                                <p>
                                    {supportOnly
                                        ? "Your CRYMA support conversation will appear here."
                                        : "Your conversations with marketplace sellers will appear here."}
                                </p>
                            </div>
                        ) : (
                            <>
                                <header className="buyer-chat-window-header">
                                    <div className={`buyer-chat-avatar large ${activeIdentity.type}`}>
                                        {activeIdentity.initials}
                                    </div>

                                    <div>
                                        <h2>
                                            {activeIdentity.name}
                                        </h2>

                                        <span>
                                            {activeIdentity.description}
                                        </span>
                                        {selectedConversation.product?.name && <span className="buyer-chat-product-context">About: {selectedConversation.product.name}</span>}
                                    </div>
                                </header>

                                <div className="buyer-chat-messages">
                                    {messagesLoading ? (
                                        <div className="buyer-chat-loading">
                                            <LoaderCircle
                                                size={19}
                                                className="buyer-chat-spinner"
                                            />

                                            <span>
                                                Loading
                                                conversation...
                                            </span>
                                        </div>
                                    ) : selectedConversation
                                          .messages
                                          ?.length ===
                                      0 ? (
                                        <div className="buyer-chat-no-messages">
                                            <div>
                                                <MessageCircle
                                                    size={
                                                        19
                                                    }
                                                />
                                            </div>

                                            <strong>
                                                Start the
                                                conversation
                                            </strong>

                                            <span>
                                                {supportOnly
                                                    ? "Send a message below and CRYMA Customer Service can assist you."
                                                    : "Send a message below to contact this seller."}
                                            </span>
                                        </div>
                                    ) : (
                                        selectedConversation.messages.map(
                                            (
                                                item
                                            ) => {
                                                const isMine =
                                                    Number(
                                                        item.sender_id
                                                    ) ===
                                                    Number(
                                                        user?.id
                                                    );

                                                return (
                                                    <div
                                                        key={
                                                            item.id
                                                        }
                                                        className={`buyer-chat-message-row ${
                                                            isMine
                                                                ? "mine"
                                                                : "theirs"
                                                        }`}
                                                    >
                                                        <div className="buyer-chat-message-content">
                                                            <div className="buyer-chat-bubble">
                                                                {
                                                                    item.message
                                                                }
                                                            </div>

                                                            <span className="buyer-chat-message-time">
                                                                {formatTime(
                                                                    item.created_at
                                                                )}

                                                                {isMine && (
                                                                    item.is_read
                                                                        ? <CheckCheck size={12} aria-label="Read" />
                                                                        : <Check size={12} aria-label="Sent" />
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )
                                    )}

                                    <div
                                        ref={
                                            messagesEndRef
                                        }
                                    />
                                </div>

                                <form
                                    className={`buyer-chat-input-area${supportBlocked ? " support-unavailable" : ""}`}
                                    onSubmit={
                                        handleSendMessage
                                    }
                                >
                                    {supportBlocked && (
                                        <span className="buyer-chat-composer-note" role="status">
                                            Messages cannot be sent while Customer Service is unavailable.
                                        </span>
                                    )}
                                    <textarea
                                        ref={
                                            inputRef
                                        }
                                        value={
                                            message
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setMessage(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        onKeyDown={
                                            handleKeyDown
                                        }
                                        rows={1}
                                        maxLength={2000}
                                        placeholder="Type a message..."
                                        aria-label="Type a message"
                                        disabled={
                                            sending || messagesLoading || supportBlocked
                                        }
                                    />

                                    <button
                                        type="submit"
                                        disabled={
                                            sending ||
                                            messagesLoading ||
                                            supportBlocked ||
                                            !message.trim()
                                        }
                                        aria-label="Send message"
                                    >
                                        {sending ? (
                                            <LoaderCircle
                                                size={
                                                    17
                                                }
                                                className="buyer-chat-spinner"
                                            />
                                        ) : (
                                            <Send
                                                size={
                                                    17
                                                }
                                            />
                                        )}
                                    </button>
                                </form>
                            </>
                        )}
                    </section>
                </section>
            </div>
        </main>
    );
}

export default Chat;
