import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, Package, RefreshCw, Send } from "lucide-react";
import api from "../services/api";
import { getChatMessageRequestId } from "../utils/chatMessageRequest";
import "./DeliveryMessages.css";

const MODE_PATHS = {
    seller: "/seller/delivery-chats",
    logistics: "/logistics/delivery-chats",
    hubStaff: "/hub-staff/delivery-chats",
};

const fullName = (person, fallback) =>
    [person?.first_name, person?.last_name].filter(Boolean).join(" ") || fallback;

const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function DeliveryMessages({ mode }) {
    const basePath = MODE_PATHS[mode];
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [message, setMessage] = useState("");
    const [deliveryId, setDeliveryId] = useState("");
    const [loading, setLoading] = useState(true);
    const [threadLoading, setThreadLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const messageEndRef = useRef(null);
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);
    const currentUserId = (() => {
        try {
            return Number(JSON.parse(localStorage.getItem("user") || "null")?.id || 0);
        } catch {
            return 0;
        }
    })();
    const isSeller = mode === "seller";

    const openConversation = useCallback(async (id) => {
        const requestId = ++openRequestRef.current;
        setThreadLoading(true);
        setError("");
        try {
            const response = await api.get(`${basePath}/${id}`);
            if (requestId === openRequestRef.current) {
                setSelectedConversation(response.data?.data || null);
            }
        } catch (requestError) {
            if (requestId === openRequestRef.current) {
                setError(requestError.response?.data?.message || "We couldn't open this parcel conversation.");
            }
        } finally {
            if (requestId === openRequestRef.current) setThreadLoading(false);
        }
    }, [basePath]);

    const loadConversations = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) {
            setLoading(true);
            setError("");
        }
        try {
            const response = await api.get(basePath);
            const items = Array.isArray(response.data?.data) ? response.data.data : [];
            setConversations(items);
            if (!items.some((item) => String(item.id) === String(selectedConversation?.id))) {
                if (items.length) void openConversation(items[0].id);
                else setSelectedConversation(null);
            }
        } catch (requestError) {
            if (!quiet) setError(requestError.response?.data?.message || "We couldn't load parcel conversations.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [basePath, openConversation, selectedConversation?.id]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadConversations(), 0);
        const refresh = window.setInterval(() => void loadConversations({ quiet: true }), 15000);
        return () => {
            window.clearTimeout(timer);
            window.clearInterval(refresh);
        };
    }, [loadConversations]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversation?.messages]);

    useEffect(() => {
        if (!selectedConversation?.id) return undefined;
        const conversationId = selectedConversation.id;
        const requestId = openRequestRef.current;
        const timer = window.setInterval(async () => {
            try {
                const response = await api.get(`${basePath}/${conversationId}`);
                if (requestId !== openRequestRef.current) return;
                const latest = response.data?.data;
                if (latest) setSelectedConversation((current) => (
                    String(current?.id) === String(conversationId) ? latest : current
                ));
            } catch (requestError) {
                console.error("Failed to refresh parcel conversation:", requestError);
            }
        }, 5000);
        return () => window.clearInterval(timer);
    }, [basePath, selectedConversation?.id]);

    const startConversation = async (event) => {
        event.preventDefault();
        const id = Number(deliveryId);
        if (!Number.isInteger(id) || id < 1 || sending) return;
        setSending(true);
        setError("");
        setNotice("");
        try {
            const response = await api.post(`${basePath.replace("/delivery-chats", "")}/deliveries/${id}/seller-chat`);
            const started = Array.isArray(response.data?.data) ? response.data.data : [];
            setDeliveryId("");
            await loadConversations({ quiet: true });
            if (started.length) {
                await openConversation(started[0].id);
                setNotice(started.length === 1 ? "Seller conversation opened." : `${started.length} seller conversations opened.`);
            }
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't open seller conversations for that delivery.");
        } finally {
            setSending(false);
        }
    };

    const sendMessage = async (event) => {
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
        try {
            const response = await api.post(`${basePath}/${selectedConversation.id}/messages`, {
                message: text,
                client_message_id: requestId,
            });
            const sent = response.data?.data;
            if (sent) setSelectedConversation((current) => (
                String(current?.id) === String(selectedConversation.id)
                    ? { ...current, messages: [...(current.messages || []), sent] }
                    : current
            ));
            setMessage("");
            pendingMessageRef.current = null;
            setNotice("Message sent.");
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't send your message. Your text is still here; please try again.");
        } finally {
            setSending(false);
        }
    };

    const conversationName = (conversation) => isSeller
        ? fullName(conversation.created_by, "CRYMA logistics")
        : fullName(conversation.seller, "Seller");
    const participantLabel = (conversation) => isSeller
        ? "CRYMA logistics"
        : conversation.type === "buyer_rider"
            ? fullName(conversation.buyer, "Buyer")
            : fullName(conversation.seller, "Seller");

    if (!basePath) return null;

    return (
        <main className={`delivery-messages-page${isSeller ? " delivery-messages-page--seller" : ""}`}>
            <header className="delivery-messages-heading">
                <div className="delivery-messages-title">
                    <span className="delivery-messages-eyebrow"><MessageSquareText size={14} /> Parcel communication</span>
                    <h1>{isSeller ? "Logistics conversations" : "Parcel messages"}</h1>
                    <p>{isSeller
                        ? "Private conversations with logistics staff and assigned riders. These are separate from buyer chats."
                        : "Discuss parcel details with sellers and reply to buyer delivery questions."}</p>
                </div>
                {isSeller && <Link className="delivery-messages-header-action" to="/seller/orders">Manage orders</Link>}
                {!isSeller && <form className="delivery-message-start" onSubmit={startConversation}>
                    <label htmlFor="delivery-message-id">Start a conversation</label>
                    <div>
                        <input
                            id="delivery-message-id"
                            type="number"
                            min="1"
                            value={deliveryId}
                            onChange={(event) => setDeliveryId(event.target.value)}
                            placeholder="Enter delivery ID"
                            required
                        />
                        <button type="submit" disabled={sending || !deliveryId}>
                            {sending ? "Opening…" : "Contact seller"}
                        </button>
                    </div>
                </form>}
            </header>

            {error && <div className="delivery-message-alert" role="alert">{error}</div>}
            {notice && <div className="delivery-message-notice" role="status">{notice}</div>}

            <section className="delivery-message-workspace">
                <aside className="delivery-message-inbox" aria-label="Parcel conversations">
                    <div className="delivery-message-inbox-heading">
                        <div>
                            <h2>Conversations</h2>
                            <span>{conversations.length} {conversations.length === 1 ? "thread" : "threads"}</span>
                        </div>
                        <button type="button" onClick={() => void loadConversations()} disabled={loading} aria-label="Refresh conversations" title="Refresh conversations">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                    {loading ? <p className="delivery-message-empty" role="status">Loading conversations…</p>
                        : conversations.length === 0 ? <p className="delivery-message-empty">No parcel conversations yet.</p>
                            : conversations.map((conversation) => {
                                const lastMessage = conversation.last_message;
                                return <button type="button" key={conversation.id} className={`delivery-message-thread${String(selectedConversation?.id) === String(conversation.id) ? " is-active" : ""}`} onClick={() => void openConversation(conversation.id)}>
                                    <span className="delivery-message-avatar"><MessageSquareText size={17} /></span>
                                    <span className="delivery-message-thread-copy">
                                        <span className="delivery-message-thread-top">
                                            <strong>{conversationName(conversation)}</strong>
                                            {lastMessage?.created_at && <time>{formatTime(lastMessage.created_at)}</time>}
                                        </span>
                                        <small>Order #{conversation.order_id || "—"} · {conversation.type === "buyer_rider" ? "Buyer delivery chat" : "Seller parcel details"}</small>
                                        <span className="delivery-message-preview">{lastMessage?.message || "No messages yet"}</span>
                                    </span>
                                    {Number(conversation.unread_messages_count) > 0 && <span className="delivery-message-unread">{conversation.unread_messages_count}</span>}
                                </button>;
                            })}
                </aside>

                <section className="delivery-message-thread-panel">
                    {selectedConversation ? <>
                        <header className="delivery-message-thread-header">
                            <span className="delivery-message-avatar"><Package size={18} /></span>
                            <div>
                                <strong>{participantLabel(selectedConversation)}</strong>
                                <small>Order #{selectedConversation.order_id || "—"} · Parcel #{selectedConversation.delivery_id || "—"}</small>
                            </div>
                            <span className="delivery-message-thread-type">
                                {selectedConversation.type === "buyer_rider" ? "Buyer delivery chat" : "Parcel details"}
                            </span>
                        </header>
                        {threadLoading ? <p className="delivery-message-empty" role="status">Loading messages…</p> : <>
                            <div className="delivery-message-history" role="log" aria-live="polite">
                                {(selectedConversation.messages || []).map((item) => {
                                    const mine = Number(item.sender_id) === currentUserId;
                                    return <article key={item.id} className={`delivery-message-bubble${mine ? " is-mine" : ""}`}>
                                        <span>{mine ? "You" : fullName(item.sender, item.sender?.role === "rider" ? "Rider" : "Participant")}</span>
                                        <p>{item.message}</p>
                                        <time>{formatTime(item.created_at)}</time>
                                    </article>;
                                })}
                                {!selectedConversation.messages?.length && <p className="delivery-message-empty">Start the conversation with a parcel update.</p>}
                                <div ref={messageEndRef} />
                            </div>
                            <form className="delivery-message-composer" onSubmit={sendMessage}>
                                <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={2} placeholder="Write a parcel update…" aria-label="Message" />
                                <button type="submit" disabled={sending || !message.trim()} aria-label="Send message"><Send size={17} /></button>
                            </form>
                        </>}
                    </> : <div
                        className={`delivery-message-no-selection${conversations.length === 0 ? " is-empty" : ""}`}
                        role={loading || conversations.length === 0 ? "status" : undefined}
                    >
                        <MessageSquareText size={30} />
                        <strong>
                            {loading
                                ? "Loading parcel messages…"
                                : conversations.length === 0
                                    ? "No parcel messages yet"
                                    : "Select a conversation"}
                        </strong>
                        <span>
                            {loading
                                ? "Your parcel conversations will appear here."
                                : conversations.length === 0
                                    ? isSeller
                                        ? "Messages started by CRYMA Logistics or a rider about your deliveries will appear here."
                                        : "Start a conversation with a delivery ID, or select a thread from the list."
                                    : "Messages about parcel handling stay separate from buyer-to-seller chat."}
                        </span>
                    </div>}
                </section>
            </section>
        </main>
    );
}
