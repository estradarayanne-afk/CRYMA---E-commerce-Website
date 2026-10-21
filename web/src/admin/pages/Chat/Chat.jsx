import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../shared/services/api";
import { getChatMessageRequestId } from "../../../shared/utils/chatMessageRequest";
import "./Chat.css";

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [message, setMessage] = useState("");

    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);

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

    const openConversation = async (id) => {
        const requestId = ++openRequestRef.current;
        try {
            setMessagesLoading(true);
            setError("");

            const response = await api.get(
                `/admin/chat/conversations/${id}`
            );

            if (requestId !== openRequestRef.current) return;
            setSelectedConversation(response.data.data);

            await api.patch(
                `/admin/chat/conversations/${id}/read`
            );
            if (requestId !== openRequestRef.current) return;
            setConversations((previous) => previous.map((item) => (
                String(item.id) === String(id)
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
                        <h2>Customer conversations</h2>

                        <span>
                            {conversations.length}
                        </span>
                    </div>

                    <div className="conversation-list">

                        {loading ? (
                            <div className="chat-empty">
                                Loading conversations...
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="chat-empty">
                                No conversations yet.
                            </div>
                        ) : (
                            conversations.map(
                                (conversation) => (
                                    <button
                                        type="button"
                                        key={conversation.id}
                                        className={
                                            selectedConversation?.id ===
                                            conversation.id
                                                ? "conversation-item active"
                                                : "conversation-item"
                                        }
                                        onClick={() =>
                                            openConversation(
                                                conversation.id
                                            )
                                        }
                                    >
                                        <div className="conversation-avatar">
                                            {conversation.buyer?.first_name
                                                ?.charAt(0)
                                                ?.toUpperCase() || "B"}
                                        </div>

                                        <div className="conversation-info">
                                            <strong>
                                                {conversation.buyer
                                                    ? `${conversation.buyer.first_name || ""} ${conversation.buyer.last_name || ""}`.trim()
                                                    : "Buyer"}
                                            </strong>

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
                                )
                            )
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
                                    {selectedConversation.buyer
                                        ?.first_name
                                        ?.charAt(0)
                                        ?.toUpperCase() || "B"}
                                </div>

                                <div>
                                    <h2>
                                        {selectedConversation.buyer
                                            ? `${selectedConversation.buyer.first_name || ""} ${selectedConversation.buyer.last_name || ""}`.trim()
                                            : "Buyer"}
                                    </h2>

                                    <span>
                                        Customer
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
                                                        {item.message}
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
                                <input
                                    type="text"
                                    maxLength={2000}
                                    value={message}
                                    onChange={(e) =>
                                        setMessage(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Type a message..."
                                    disabled={sending || messagesLoading}
                                />

                                <button
                                    type="submit"
                                    disabled={
                                        sending ||
                                        messagesLoading ||
                                        !message.trim()
                                    }
                                >
                                    {sending
                                        ? "..."
                                        : "Send"}
                                </button>
                            </form>
                        </>
                    )}

                </main>

            </section>
        </div>
    );
}

export default Chat;
