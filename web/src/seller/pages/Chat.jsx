import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, CheckCheck, LoaderCircle, MessageCircle, PackageCheck, Search, Send, Sparkles, X } from "lucide-react";
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

function getSellerHelpReply(question) {
    const text = question.toLowerCase();
    if (/pickup|courier|shipping|shipment|delivery/.test(text)) return "For a ready order, open Logistics and choose Schedule pickup. The request uses your default saved seller address. Logistics assigns a courier and sets the pickup date and time; you can follow updates from the order details.";
    if (/return|refund|repay/.test(text)) return "Customer Service reviews and approves refund requests. If a return is required, follow it in Returns. Confirm the parcel only after it physically reaches your store; Customer Service can then complete the approved repayment.";
    if (/order|prepare|status|confirm/.test(text)) return "Open Orders and select the order to review its details. Move it through Confirm Order, Start Preparing, and Mark Ready for Pickup. Mark it ready only after the parcel is packed.";
    if (/stock|inventory|product|price/.test(text)) return "Open Manage Inventory to add or update products, prices, discounts, vouchers, and stock levels. Check the product’s stock value before confirming availability to a buyer.";
    if (/voucher|coupon|discount/.test(text)) return "Create and manage seller promotions in Vouchers. Set the eligible product, discount, claim limit, and active dates, then verify the voucher is active before sharing it with a buyer.";
    if (/earning|payout|settlement|sales|report/.test(text)) return "Open Earnings & Reports to review your sales and earnings. Check the selected date range and payout status there; this chat assistant does not read live financial records.";
    if (/chat|buyer|message|reply|customer/.test(text)) return "Use the buyer inbox on the left to open a conversation. Quick replies are inserted into the message box as drafts, so you can review and edit them before sending.";
    return "I can guide you through Orders, Logistics and pickup, Returns and refunds, Inventory, Vouchers, or Earnings & Reports. I don’t access live order or payout records, but I can show you where to check them.";
}

const QUICK_REPLIES = [
    "Thanks for reaching out. We’re checking this and will update you shortly.",
    "Could you share your order number so I can check the details?",
    "Thanks for your patience. We’ll get back to you as soon as we can.",
];

function Chat() {
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [conversationSearch, setConversationSearch] = useState("");
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [assistantDraft, setAssistantDraft] = useState("");
    const [assistantTyping, setAssistantTyping] = useState(false);
    const [assistantMessages, setAssistantMessages] = useState([{ role: "assistant", text: "Hi! I can help you find the right seller workflow. What do you need help with?" }]);
    const messagesEndRef = useRef(null);
    const assistantEndRef = useRef(null);
    const assistantScopeRef = useRef(null);
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);

    const openConversation = useCallback(async (id) => {
        const requestId = ++openRequestRef.current;
        assistantScopeRef.current = `${id}:pending`;
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
        if (assistantOpen) assistantEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [assistantMessages, assistantOpen]);

    useEffect(() => {
        const conversationId = selectedConversation?.id || null;
        const productId = selectedConversation?.product_id || selectedConversation?.product?.id || "";
        assistantScopeRef.current = conversationId ? `${conversationId}:${productId}` : null;
        setAssistantDraft("");
        setAssistantMessages([{ role: "assistant", text: conversationId
            ? `I’m ready to help with ${selectedConversation?.product?.name || "this buyer conversation"}. Ask about its live product details or this buyer’s recent order status.`
            : "Hi! I can help you find the right seller workflow. Select a buyer chat to ask about its live product and order details." }]);
    }, [selectedConversation?.id, selectedConversation?.product_id, selectedConversation?.product?.id]);

    const askSellerAssistant = async (question) => {
        const text = String(question || assistantDraft).trim();
        if (!text || assistantTyping) return;
        const requestedScope = selectedConversation
            ? `${selectedConversation.id}:${selectedConversation.product_id || selectedConversation.product?.id || ""}`
            : null;
        setAssistantMessages((current) => [...current, { role: "seller", text }]);
        setAssistantDraft("");
        setAssistantTyping(true);
        try {
            const { data } = await api.post("/seller/chat/assistant", {
                message: text,
                conversation_id: selectedConversation?.id || null,
            });
            if (assistantScopeRef.current !== requestedScope) return;
            const result = data?.data;
            const context = result?.product?.name
                ? `Live product: ${result.product.name}`
                : result?.order?.id
                    ? `Live order: #${result.order.id}`
                    : null;
            setAssistantMessages((current) => [...current, { role: "assistant", text: result?.reply || getSellerHelpReply(text), context }]);
        } catch {
            if (assistantScopeRef.current !== requestedScope) return;
            setAssistantMessages((current) => [...current, { role: "assistant", text: `${getSellerHelpReply(text)} Live order or product data is temporarily unavailable.`, context: null }]);
        } finally {
            setAssistantTyping(false);
        }
    };

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

    const filteredConversations = conversations.filter((conversation) => {
        const last = conversation.messages?.[0];
        const searchable = [getName(conversation.buyer), conversation.buyer?.email, conversation.product?.name, last?.message]
            .filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(conversationSearch.trim().toLowerCase());
    });

    return (
        <main className="sl-page seller-chat-page">
            <header className="sl-page-head seller-chat-page-head">
                <div>
                    <span className="sl-eyebrow">MESSAGING</span>
                    <h1 className="sl-h1">Customer Service</h1>
                    <p>Communicate with buyers about your products and orders.</p>
                </div>
                <button type="button" className="seller-assistant-trigger" onClick={() => setAssistantOpen((open) => !open)} aria-expanded={assistantOpen} aria-controls="seller-assistant-panel"><Sparkles size={15} /> Seller assistant</button>
            </header>

            {assistantOpen && <section className="seller-assistant-panel" id="seller-assistant-panel" role="dialog" aria-label="Seller assistant">
                <header><span className="seller-assistant-mark"><Bot size={17} /></span><div><strong>Seller assistant</strong><small>Quick help for your CRYMA workspace</small></div><button type="button" className="seller-assistant-close" onClick={() => setAssistantOpen(false)} aria-label="Close seller assistant"><X size={17} /></button></header>
                <div className="seller-assistant-context">{selectedConversation ? <><span>Active buyer chat</span><strong>{selectedConversation.product?.name || getName(selectedConversation.buyer)}</strong><small>Product and this buyer’s order status are checked live when you ask.</small></> : <><span>General seller help</span><strong>Select a buyer chat to include its live product and order details.</strong></>}</div>
                <div className="seller-assistant-messages" role="log" aria-live="polite">{assistantMessages.map((item, index) => <div key={`${item.role}-${index}`} className={`seller-assistant-message ${item.role}`}><span>{item.role === "assistant" ? "CRYMA helper" : "You"}</span>{item.context && <small className="seller-assistant-live-context">{item.context}</small>}<p>{item.text}</p></div>)}{assistantTyping && <div className="seller-assistant-typing" role="status"><LoaderCircle size={13} className="seller-chat-spinner" /> Checking live product and order details…</div>}<div ref={assistantEndRef} /></div>
                <div className="seller-assistant-prompts" aria-label="Suggested help topics">{(selectedConversation?.product?.name ? [`What’s the current price and stock of ${selectedConversation.product.name}?`, "What is the latest order status?", "How do I schedule a pickup?"] : ["How do I schedule a pickup?", "How do I handle a return?", "How do I update stock?"]).map((prompt) => <button type="button" key={prompt} onClick={() => void askSellerAssistant(prompt)} disabled={assistantTyping}>{prompt}</button>)}</div>
                <form className="seller-assistant-composer" onSubmit={(event) => { event.preventDefault(); void askSellerAssistant(assistantDraft); }}><input value={assistantDraft} onChange={(event) => setAssistantDraft(event.target.value)} maxLength={300} placeholder="Ask about this product or order…" aria-label="Ask the seller assistant" disabled={assistantTyping} /><button type="submit" disabled={!assistantDraft.trim() || assistantTyping} aria-label="Ask"><Send size={15} /></button></form>
                <p className="seller-assistant-disclaimer">Uses live CRYMA product and order records for the selected buyer chat. It does not read payouts or buyer addresses.</p>
            </section>}

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
                        <div><span>BUYER INBOX</span><h2>Buyer chats</h2></div>
                        <strong>{conversations.length}</strong>
                    </div>
                    <label className="seller-chat-search"><Search size={15} aria-hidden="true" /><input type="search" value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search buyers or products" aria-label="Search conversations by buyer or product" /></label>
                    {loading ? (
                        <div className="seller-chat-empty" role="status"><LoaderCircle className="seller-chat-spinner" size={19} /> Loading messages…</div>
                    ) : conversations.length === 0 ? (
                        <div className="seller-chat-empty"><MessageCircle size={22} /><span>No buyer conversations yet.</span></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="seller-chat-empty">No conversations match your search.</div>
                    ) : (
                        <div className="seller-chat-list">
                            {filteredConversations.map((conversation) => {
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
                                                    {item.product && (
                                                        <div className="seller-chat-shared-product-card">
                                                            <span className="seller-chat-shared-product-image">{item.product.media?.find((media) => media.type === "image")?.url ? <img src={item.product.media.find((media) => media.type === "image").url} alt="" /> : <PackageCheck size={20} />}</span>
                                                            <span className="seller-chat-shared-product-copy"><strong>{item.product.name}</strong><span>₱{Number(item.product.discounted_price ?? item.product.price ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} · {item.product.status === "active" && Number(item.product.stock) > 0 ? "In stock" : "Unavailable"}</span></span>
                                                        </div>
                                                    )}
                                                    {item.order && (
                                                        <div className="seller-chat-shared-order">
                                                            <PackageCheck size={16} aria-hidden="true" />
                                                            <div><strong>Order #{item.order.id}</strong><span>{item.order.items?.map((orderItem) => orderItem.product?.name).filter(Boolean).join(", ") || "Order details"} · {String(item.order.status || "").replaceAll("_", " ")} · ₱{Number(item.order.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
                                                        </div>
                                                    )}
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
                            <div className="seller-chat-quick-replies" aria-label="Quick replies"><span>Quick replies</span>{QUICK_REPLIES.map((reply) => <button type="button" key={reply} onClick={() => setMessage(reply)} disabled={sending || messagesLoading}>{reply}</button>)}</div>
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
