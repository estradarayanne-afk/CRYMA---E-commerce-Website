import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, LoaderCircle, MessageCircle, Send } from "lucide-react";
import api from "../../shared/services/api";
import { getChatMessageRequestId } from "../../shared/utils/chatMessageRequest";
import "./Chat.css";

function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("en-PH", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
          });
}

function getName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(" ") || "Buyer";
}

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const messagesEndRef = useRef(null);
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);

    const openConversation = useCallback(async (id) => {
        const requestId = ++openRequestRef.current;
        setMessagesLoading(true);
        setError("");
        try {
            const response = await api.get(`/seller/chat/conversations/${id}`);
            const conversation = response.data?.data;
            if (requestId !== openRequestRef.current) return;
            setSelectedConversation(conversation || null);
            if (conversation) {
                try {
                    await api.patch(`/seller/chat/conversations/${id}/read`);
                    if (requestId !== openRequestRef.current) return;
                    setSelectedConversation((current) => current?.id === conversation.id
                        ? {
                              ...current,
                              messages: current.messages?.map((item) => (
                                  Number(item.sender_id) === Number(current.seller_id)
                                      ? item
                                      : { ...item, is_read: true }
                              )),
                          }
                        : current);
                    setConversations((previous) => previous.map((item) => (
                          String(item.id) === String(conversation.id)
                              ? { ...item, unread_messages_count: 0 }
                              : item
                    )));
                } catch (readError) {
                    console.error("Failed to mark seller conversation as read:", readError);
                    setError("Conversation opened, but its unread status couldn't be updated.");
                }
            }
        } catch (requestError) {
            if (requestId !== openRequestRef.current) return;
            setError(requestError.response?.data?.message || "We couldn't open this conversation.");
        } finally {
            if (requestId === openRequestRef.current) setMessagesLoading(false);
        }
    }, []);

    const loadConversations = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/seller/chat/conversations");
            const data = response.data?.data;
            const items = Array.isArray(data) ? data : [];
            setConversations(items);
            if (items.length > 0) {
                await openConversation(items[0].id);
            } else {
                setSelectedConversation(null);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't load your conversations.");
        } finally {
            setLoading(false);
        }
    }, [openConversation]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadConversations(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadConversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversation?.messages]);

    useEffect(() => {
        if (!selectedConversation?.id) return undefined;
        const requestToken = openRequestRef.current;
        const intervalId = window.setInterval(async () => {
            try {
                const response = await api.get(`/seller/chat/conversations/${selectedConversation.id}`);
                const conversation = response.data?.data;
                if (!conversation || requestToken !== openRequestRef.current) return;
                const hasUnread = conversation.messages?.some((item) => (
                    Number(item.sender_id) !== Number(conversation.seller_id) && !item.is_read
                ));
                if (hasUnread) {
                    await api.patch(`/seller/chat/conversations/${conversation.id}/read`);
                    if (requestToken !== openRequestRef.current) return;
                    conversation.messages = conversation.messages.map((item) => (
                        Number(item.sender_id) === Number(conversation.seller_id)
                            ? item
                            : { ...item, is_read: true }
                    ));
                }
                setSelectedConversation((current) => (
                    String(current?.id) === String(conversation.id)
                        ? conversation
                        : current
                ));
                setConversations((previous) => previous.map((item) => (
                    String(item.id) === String(conversation.id)
                        ? { ...item, unread_messages_count: 0, messages: conversation.messages?.slice(-1), updated_at: conversation.updated_at }
                        : item
                )));
            } catch (requestError) {
                console.error("Failed to refresh seller conversation:", requestError);
            }
        }, 5000);
        return () => window.clearInterval(intervalId);
    }, [selectedConversation?.id]);

    const handleSendMessage = async (event) => {
        event.preventDefault();
        const text = message.trim();
        if (!text || !selectedConversation || sending) return;

        const requestId = getChatMessageRequestId(
            pendingMessageRef.current,
            text,
            selectedConversation.id
        );
        pendingMessageRef.current = { message: text, scope: selectedConversation.id, id: requestId };
        setSending(true);
        setError("");
        setNotice("");
        try {
            const response = await api.post(
                `/seller/chat/conversations/${selectedConversation.id}/messages`,
                { message: text, client_message_id: requestId }
            );
            const sent = response.data?.data;
            if (sent) {
                setSelectedConversation((current) => current?.id === selectedConversation.id
                    ? {
                          ...current,
                          messages: (current.messages || []).some((item) => item.id === sent.id)
                              ? current.messages
                              : [...(current.messages || []), sent],
                      }
                    : current);
            }
            setMessage("");
            pendingMessageRef.current = null;
            setNotice("Message sent.");
            window.setTimeout(() => setNotice(""), 3000);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't send your message. Your text is still here; please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <main className="sl-page seller-chat-page">
            <header className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">MESSAGING</div>
                    <h1 className="sl-h1">Messages</h1>
                    <p>Respond to buyers about your products. Conversations refresh every few seconds.</p>
                </div>
            </header>

            {error && (
                <div className="seller-chat-alert" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => selectedConversation
                            ? void openConversation(selectedConversation.id)
                            : void loadConversations()}
                        disabled={loading || messagesLoading}
                    >
                        {loading ? "Retrying…" : "Retry"}
                    </button>
                </div>
            )}
            {notice && <div className="seller-chat-notice" role="status">{notice}</div>}

            <section className="seller-chat-panel" aria-label="Seller messages">
                <aside className="seller-chat-sidebar">
                    <div className="seller-chat-sidebar-title">
                        <div><span>INBOX</span><h2>Conversations</h2></div>
                        <strong>{conversations.length}</strong>
                    </div>
                    {loading ? (
                        <div className="seller-chat-empty" role="status"><LoaderCircle className="seller-chat-spinner" size={19} /> Loading messages…</div>
                    ) : conversations.length === 0 ? (
                        <div className="seller-chat-empty"><MessageCircle size={22} /><span>No buyer conversations yet.</span></div>
                    ) : (
                        <div className="seller-chat-list">
                            {conversations.map((conversation) => {
                                const last = conversation.messages?.[0];
                                const unread = Number(conversation.unread_messages_count || 0) > 0;
                                return (
                                    <button
                                        type="button"
                                        key={conversation.id}
                                        className={`seller-chat-list-item${selectedConversation?.id === conversation.id ? " active" : ""}`}
                                        onClick={() => void openConversation(conversation.id)}
                                    >
                                        <span className="seller-chat-avatar">{getName(conversation.buyer).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                                        <span className="seller-chat-list-copy">
                                            <span className="seller-chat-list-top"><strong>{getName(conversation.buyer)}</strong><time>{formatTime(last?.created_at || conversation.updated_at)}</time></span>
                                            {conversation.product?.name && <span className="seller-chat-product">{conversation.product.name}</span>}
                                            <span className="seller-chat-preview">{last?.message || "Start the conversation"}</span>
                                            {unread && <span className="seller-chat-unread">Unread message</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <section className="seller-chat-window" aria-label="Active conversation">
                    {!selectedConversation ? (
                        <div className="seller-chat-placeholder"><MessageCircle size={28} /><h2>Your buyer messages</h2><p>Select a conversation to view its messages.</p></div>
                    ) : (
                        <>
                            <header className="seller-chat-header">
                                <span className="seller-chat-avatar large">{getName(selectedConversation.buyer).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                                <div><h2>{getName(selectedConversation.buyer)}</h2><span>{selectedConversation.product?.name ? `About ${selectedConversation.product.name}` : "Buyer conversation"}</span></div>
                            </header>
                            <div className="seller-chat-messages" aria-live="polite">
                                {messagesLoading ? (
                                    <div className="seller-chat-empty"><LoaderCircle className="seller-chat-spinner" size={19} /> Loading conversation…</div>
                                ) : selectedConversation.messages?.length ? (
                                    selectedConversation.messages.map((item) => {
                                        const mine = Number(item.sender_id) === Number(selectedConversation.seller_id);
                                        return (
                                            <div key={item.id} className={`seller-chat-message-row${mine ? " mine" : ""}`}>
                                                <div className="seller-chat-message-content">
                                                    <p>{item.message}</p>
                                                    <span>{formatTime(item.created_at)}{mine && (item.is_read ? <CheckCheck size={13} aria-label="Read" /> : <Check size={13} aria-label="Sent" />)}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="seller-chat-placeholder"><MessageCircle size={24} /><strong>Start the conversation</strong><p>Send a message to this buyer.</p></div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="seller-chat-composer" onSubmit={handleSendMessage}>
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    rows={1}
                                    maxLength={2000}
                                    placeholder="Type a message…"
                                    aria-label="Type a message"
                                    disabled={sending || messagesLoading}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            event.currentTarget.form?.requestSubmit();
                                        }
                                    }}
                                />
                                <button type="submit" aria-label="Send message" disabled={sending || messagesLoading || !message.trim()}>
                                    {sending ? <LoaderCircle size={17} className="seller-chat-spinner" /> : <Send size={17} />}
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </section>
        </main>
    );
}

export default Chat;
