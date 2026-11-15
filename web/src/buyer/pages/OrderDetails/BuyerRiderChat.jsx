import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import api from "../../../shared/services/api";
import { getChatMessageRequestId } from "../../../shared/utils/chatMessageRequest";
import "./BuyerRiderChat.css";

const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export default function BuyerRiderChat({ orderId, onClose }) {
    const [conversation, setConversation] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const messageEndRef = useRef(null);
    const pendingMessageRef = useRef(null);
    const currentUserId = (() => {
        try {
            return Number(JSON.parse(localStorage.getItem("user") || "null")?.id || 0);
        } catch {
            return 0;
        }
    })();

    const refresh = useCallback(async (quiet = false) => {
        if (!quiet) {
            setLoading(true);
            setError("");
        }
        try {
            const response = await api.get(`/orders/${orderId}/rider-chat`);
            setConversation(response.data?.data || null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't load rider messages.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        const timer = window.setTimeout(() => void refresh(), 0);
        const refreshTimer = window.setInterval(() => void refresh(true), 5000);
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.clearTimeout(timer);
            window.clearInterval(refreshTimer);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose, refresh]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation?.messages]);

    const sendMessage = async (event) => {
        event.preventDefault();
        const text = message.trim();
        if (!text || !conversation || sending) return;
        const requestId = getChatMessageRequestId(
            pendingMessageRef.current,
            text,
            conversation.id
        );
        pendingMessageRef.current = { message: text, scope: conversation.id, id: requestId };
        setSending(true);
        setError("");
        try {
            const response = await api.post(`/orders/${orderId}/rider-chat/messages`, {
                message: text,
                client_message_id: requestId,
            });
            const sent = response.data?.data;
            if (sent) setConversation((current) => (
                current?.id === conversation.id
                    ? { ...current, messages: [...(current.messages || []), sent] }
                    : current
            ));
            setMessage("");
            pendingMessageRef.current = null;
        } catch (requestError) {
            setError(requestError.response?.data?.message || "We couldn't send your message. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="buyer-rider-chat-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="buyer-rider-chat" role="dialog" aria-modal="true" aria-labelledby="buyer-rider-chat-title">
                <header>
                    <span><MessageCircle size={18} /></span>
                    <div><h2 id="buyer-rider-chat-title">Message your rider</h2><p>Order #{orderId} · {conversation?.rider ? [conversation.rider.first_name, conversation.rider.last_name].filter(Boolean).join(" ") : "Assigned rider"}</p></div>
                    <button type="button" onClick={onClose} aria-label="Close rider chat"><X size={18} /></button>
                </header>
                {error && <p className="buyer-rider-chat-error" role="alert">{error}</p>}
                {loading ? <div className="buyer-rider-chat-empty" role="status">Loading messages…</div> : (
                    <>
                        <div className="buyer-rider-chat-history" role="log" aria-live="polite">
                            {(conversation?.messages || []).map((item) => {
                                const mine = Number(item.sender_id) === currentUserId;
                                const senderName = [item.sender?.first_name, item.sender?.last_name].filter(Boolean).join(" ") || "Rider";
                                return <article className={`buyer-rider-chat-message${mine ? " is-mine" : ""}`} key={item.id}>
                                    <span>{mine ? "You" : senderName}</span>
                                    <p>{item.message}</p>
                                    <time>{formatTime(item.created_at)}</time>
                                </article>;
                            })}
                            {!conversation?.messages?.length && <p className="buyer-rider-chat-empty">Say hello or ask for an update about your delivery.</p>}
                            <div ref={messageEndRef} />
                        </div>
                        <form className="buyer-rider-chat-composer" onSubmit={sendMessage}>
                            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} maxLength={2000} placeholder="Write a message…" aria-label="Message your rider" />
                            <button type="submit" disabled={sending || !message.trim()} aria-label="Send message"><Send size={17} /></button>
                        </form>
                    </>
                )}
            </section>
        </div>
    );
}
