import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Check,
    CheckCheck,
    LoaderCircle,
    MessageCircle,
    PackageCheck,
    Bot,
    X,
    Paperclip,
    Search,
    Download,
    Send,
    ChevronDown,
    Store,
    ShoppingBag,
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

function formatProductPrice(product) {
    const price = product?.discounted_price ?? product?.price;
    if (price === null || price === undefined || price === "") return "Price unavailable";
    return `₱${Number(price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    const [attachment, setAttachment] = useState(null);

    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] =
        useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [supportAvailable, setSupportAvailable] = useState(true);
    const [buyerOrders, setBuyerOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState("");
    const [selectedProductId, setSelectedProductId] = useState("");
    const [conversationSearch, setConversationSearch] = useState("");
    const [unreadOnly, setUnreadOnly] = useState(false);

    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const refocusAfterSendRef = useRef(false);
    const pendingMessageRef = useRef(null);
    const openRequestRef = useRef(0);

    useEffect(() => {
        let active = true;
        api.get("/orders")
            .then((response) => {
                if (active) setBuyerOrders(response.data?.data?.data || []);
            })
            .catch((requestError) => {
                console.error("Failed to load orders for support chat:", requestError);
            });
        return () => { active = false; };
    }, []);

    const openConversation = useCallback(async (id) => {
        const requestId = ++openRequestRef.current;
        try {
            setMessagesLoading(true);
            setError("");

            const response = await api.get(
                `/buyer/chat/conversations/${id}`
            );

            let conversation =
                response.data?.data || null;
            if (requestId !== openRequestRef.current) return;

            if (conversation?.seller_id && conversation.product?.id && !conversation.messages?.some((item) => Number(item.product_id || item.product?.id) === Number(conversation.product.id))) {
                try {
                    const shared = await api.post(`/buyer/chat/conversations/${id}/products`, { product_id: conversation.product.id });
                    const productMessage = shared.data?.data;
                    if (productMessage) conversation = { ...conversation, messages: [...(conversation.messages || []), productMessage] };
                } catch (shareError) {
                    console.error("Failed to add the product card to this conversation:", shareError);
                }
                if (requestId !== openRequestRef.current) return;
            }

            setSelectedConversation(conversation);
            setSelectedOrderId("");
            setSelectedProductId("");
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
        const intervalId = window.setInterval(async () => {
            try {
                const response = await api.get("/buyer/chat/conversations");
                const latest = getBuyerInboxConversations(response.data?.data || [], supportOnly);
                setConversations(latest);
                if (supportOnly) setSupportAvailable(response.data?.support_available !== false);
            } catch (requestError) {
                console.error("Failed to refresh buyer conversation list:", requestError);
            }
        }, 20_000);
        return () => window.clearInterval(intervalId);
    }, [supportOnly]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }, [
        selectedConversation?.messages,
    ]);

    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        input.style.height = "auto";
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }, [message]);

    useEffect(() => {
        if (sending || !refocusAfterSendRef.current) return;
        refocusAfterSendRef.current = false;
        inputRef.current?.focus({ preventScroll: true });
    }, [sending]);

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

    const handleSendMessage = async (event, messageOverride = null) => {
        event?.preventDefault();

        const trimmedMessage =
            (messageOverride ?? message).trim() || (selectedOrderId ? `I’m sharing Order #${selectedOrderId} for context.` : "");

        if (
            (!trimmedMessage && !attachment) ||
            !selectedConversation ||
            sending
        ) {
            return;
        }

        try {
            setSending(true);
            setError("");

            const messageScope = `${selectedConversation.id}:${selectedOrderId || ""}:${selectedProductId || ""}`;
            const scopedRequestId = getChatMessageRequestId(pendingMessageRef.current, trimmedMessage, messageScope);
            pendingMessageRef.current = { message: trimmedMessage, scope: messageScope, id: scopedRequestId };
            const response = attachment
                ? await (() => {
                    const formData = new FormData();
                    formData.append("attachment", attachment);
                    formData.append("message", trimmedMessage);
                    if (selectedOrderId) formData.append("order_id", selectedOrderId);
                    return api.post(`/buyer/chat/conversations/${selectedConversation.id}/attachments`, formData);
                })()
                : await api.post(
                    `/buyer/chat/conversations/${selectedConversation.id}/messages`,
                    {
                        message: trimmedMessage,
                        client_message_id: scopedRequestId,
                        order_id: selectedOrderId || null,
                        product_id: selectedProductId || null,
                    }
                );

            const newMessage =
                response.data?.data;
            const assistantMessage = response.data?.assistant_message;

            const appendedMessages = [newMessage, assistantMessage].filter(Boolean);
            if (appendedMessages.length) {
                setSelectedConversation(
                    (previous) => previous?.id === selectedConversation.id
                        ? {
                            ...previous,
                            messages: [
                                ...(previous.messages || []),
                                ...appendedMessages.filter((item) => !(previous.messages || []).some((existing) => existing.id === item.id)),
                            ],
                        }
                        : previous
                );
                setConversations((previous) => previous.map((item) => item.id === selectedConversation.id
                    ? { ...item, messages: [assistantMessage || newMessage], updated_at: (assistantMessage || newMessage).created_at }
                    : item));
            }

            setMessage("");
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setSelectedOrderId("");
            setSelectedProductId("");
            pendingMessageRef.current = null;
            refocusAfterSendRef.current = true;
            showBuyerToast("Message sent");
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

    const handleAttachmentChange = (event) => {
        const file = event.target.files?.[0] || null;
        if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            setError("Choose a JPEG, PNG, or WebP image up to 5 MB.");
            setAttachment(null);
            event.target.value = "";
            return;
        }
        setError("");
        setAttachment(file);
    };

    const downloadAttachment = async (item) => {
        try {
            const response = await api.get(
                `/buyer/chat/conversations/${selectedConversation.id}/messages/${item.id}/attachment`,
                { responseType: "blob" }
            );
            const url = URL.createObjectURL(response.data);
            const link = document.createElement("a");
            link.href = url;
            link.download = item.attachment_name || "support-attachment";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setError("We couldn't download that attachment.");
        }
    };

    const activeIdentity = getConversationIdentity(selectedConversation);
    const shareableOrders = supportOnly
        ? buyerOrders
        : buyerOrders.filter((order) => order.items?.some((item) => Number(item.seller_id) === Number(selectedConversation?.seller_id)));
    const selectedOrder = shareableOrders.find((order) => String(order.id) === String(selectedOrderId));
    const unreadConversationCount = conversations.filter((conversation) => Number(conversation.unread_messages_count || 0) > 0).length;
    const visibleConversations = conversations.filter((conversation) => {
        if (unreadOnly && Number(conversation.unread_messages_count || 0) < 1) return false;
        const identity = getConversationIdentity(conversation);
        const searchable = [identity.name, conversation.product?.name, conversation.messages?.[0]?.message]
            .filter(Boolean).join(" ").toLowerCase();
        return searchable.includes(conversationSearch.trim().toLowerCase());
    });
    return (
        <main className="buyer-chat-page">
            <div className="buyer-chat-container">
                <header className="buyer-chat-header buyer-page-masthead">
                    <div>
                        <span className="buyer-chat-eyebrow">
                            {supportOnly ? "CRYMA CUSTOMER SERVICE" : "SELLER MESSAGES"}
                        </span>

                        <h1>{supportOnly ? "Customer Service" : "Seller messages"}</h1>

                        <p>
                            {supportOnly
                                ? "Get help with an order, delivery, payment, or your account. Share the details and our team can follow up here."
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
                        Instant answers are available. A human Customer Service agent can follow up in this same conversation.
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

                        <div className="buyer-chat-inbox-tools">
                            <label className="buyer-chat-search"><Search size={15} aria-hidden="true" /><input type="search" value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search people or products" aria-label="Search conversations" /></label>
                            <div className="buyer-chat-inbox-filters" role="group" aria-label="Filter conversations">
                                <button type="button" className={!unreadOnly ? "active" : ""} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All <span>{conversations.length}</span></button>
                                <button type="button" className={unreadOnly ? "active" : ""} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread <span>{unreadConversationCount}</span></button>
                            </div>
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
                        ) : visibleConversations.length === 0 ? (
                            <div className="buyer-chat-empty"><Search size={20} /><span>{unreadOnly ? "No unread conversations." : "No conversations match your search."}</span></div>
                        ) : (
                            <div className="buyer-chat-conversation-list">
                                {visibleConversations.map(
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
                                                aria-current={selectedConversation?.id === conversation.id ? "true" : undefined}
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

                                                        <time title={lastMessage?.created_at ? new Date(lastMessage.created_at).toLocaleString("en-PH") : undefined}>
                                                            {formatConversationTime(
                                                                lastMessage?.created_at ||
                                                                    conversation.updated_at
                                                            )}
                                                        </time>
                                                    </div>

                                                    {hasUnread && <span className="buyer-chat-unread" aria-label="Unread message">New</span>}

                                                    <p title={lastMessage?.message || undefined}>
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
                                        {supportOnly && (
                                            <span className={`buyer-chat-presence ${supportAvailable ? "available" : "unavailable"}`}>
                                                <i aria-hidden="true" />
                                                {supportAvailable ? "Instant replies · Human support available" : "Instant replies · Human support offline"}
                                            </span>
                                        )}
                                        {selectedConversation.product?.name && <span className="buyer-chat-product-context">About: {selectedConversation.product.name}</span>}
                                    </div>
                                    {!supportOnly && selectedConversation.seller?.seller_profile?.store_slug && (
                                        <Link className="buyer-chat-storefront-link" to={`/stores/${encodeURIComponent(selectedConversation.seller.seller_profile.store_slug)}`}>
                                            <Store size={15} aria-hidden="true" /> <span>Visit storefront</span>
                                        </Link>
                                    )}
                                </header>

                                {!supportOnly && selectedConversation.product && <aside className="buyer-chat-live-product" aria-label="Product context for this conversation">
                                    <Link className="buyer-chat-live-product-image" to={`/products/${selectedConversation.product.id}`} aria-label={`View ${selectedConversation.product.name}`}>
                                        {selectedConversation.product.media?.find((media) => media.type === "image")?.url
                                            ? <img src={selectedConversation.product.media.find((media) => media.type === "image").url} alt={selectedConversation.product.name} />
                                            : <span>{selectedConversation.product.name?.charAt(0)?.toUpperCase() || <PackageCheck size={22} />}</span>}
                                    </Link>
                                    <div className="buyer-chat-live-product-info"><span>PRODUCT SHARED IN THIS CHAT</span><strong>{selectedConversation.product.name}</strong><small>{selectedConversation.product.category || "Marketplace listing"} · {formatProductPrice(selectedConversation.product)}</small><span className={`buyer-chat-stock-pill ${selectedConversation.product.status === "active" && Number(selectedConversation.product.stock) > 0 ? "available" : "unavailable"}`}><i />{selectedConversation.product.status === "active" && Number(selectedConversation.product.stock) > 0 ? "In stock" : "Unavailable"}</span></div>
                                    <Link className="buyer-chat-product-buy" to={`/products/${selectedConversation.product.id}`}><ShoppingBag size={15} /> View product &amp; vouchers</Link>
                                    <div className="buyer-chat-product-questions"><button type="button" onClick={() => { setSelectedOrderId(""); setSelectedProductId(String(selectedConversation.product.id)); setMessage(`Hi! Is ${selectedConversation.product.name} currently available?`); inputRef.current?.focus(); }}>Check availability</button><button type="button" onClick={() => { setSelectedOrderId(""); setSelectedProductId(String(selectedConversation.product.id)); setMessage(`Hi! Could you tell me more about ${selectedConversation.product.name}?`); inputRef.current?.focus(); }}>Ask about this item</button></div>
                                </aside>}

                                <div className="buyer-chat-messages" ref={messagesContainerRef}>
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
                                                    ? "Ask anything here for an instant reply. A human Customer Service agent can continue this same conversation."
                                                    : "Send a message below to contact this seller."}
                                            </span>
                                        </div>
                                    ) : (
                                        selectedConversation.messages.map(
                                            (
                                                item
                                            ) => {
                                                const isAssistant = item.sender_type === "assistant";
                                                const isMine = !isAssistant &&
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
                                                            isAssistant ? "assistant" : isMine
                                                                ? "mine"
                                                                : "theirs"
                                                        }`}
                                                    >
                                                        <div className="buyer-chat-message-content">
                                                            <div className="buyer-chat-bubble">
                                                                {isAssistant && <strong className="buyer-chat-assistant-label"><Bot size={13} /> CRYMA Customer Service · Instant reply</strong>}
                                                                {
                                                                    item.message
                                                                }
                                                                {item.product && (
                                                                    <div className="buyer-chat-shared-product-wrap">
                                                                        <Link className="buyer-chat-shared-product-card" to={`/products/${item.product.id}`}>
                                                                            <span className="buyer-chat-shared-product-image">{item.product.media?.find((media) => media.type === "image")?.url ? <img src={item.product.media.find((media) => media.type === "image").url} alt="" /> : <PackageCheck size={22} />}</span>
                                                                            <span className="buyer-chat-shared-product-copy"><strong>{item.product.name}</strong><span>{formatProductPrice(item.product)} · {item.product.status === "active" && Number(item.product.stock) > 0 ? "In stock" : "Unavailable"}</span><small>Open product details</small></span>
                                                                            <ChevronDown className="buyer-chat-shared-product-arrow" size={17} aria-hidden="true" />
                                                                        </Link>
                                                                        {isMine && <div className="buyer-chat-shared-product-replies" aria-label="Quick replies about this product">
                                                                            {[
                                                                                ["Check availability", `Hi! Is ${item.product.name} currently available?`],
                                                                                ["Ask about delivery", `Hi! What are the delivery options for ${item.product.name}?`],
                                                                                ["Ask about voucher", `Hi! Is there an available voucher for ${item.product.name}?`],
                                                                            ].map(([label, prompt]) => <button type="button" key={label} onClick={() => { setSelectedOrderId(""); setSelectedProductId(String(item.product.id)); setMessage(prompt); inputRef.current?.focus(); }} disabled={sending || messagesLoading}>{label}</button>)}
                                                                        </div>}
                                                                    </div>
                                                                )}
                                                                {item.order && (
                                                                    <div className="buyer-chat-order-card">
                                                                        <PackageCheck size={17} aria-hidden="true" />
                                                                        <div><strong>Order #{item.order.id}</strong><span>{item.order.items?.[0]?.product?.name || "CRYMA order"} · {item.order.status} · ₱{Number(item.order.total_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
                                                                    </div>
                                                                )}
                                                                {item.attachment_name && (
                                                                    <button type="button" className="buyer-chat-attachment-card" onClick={() => downloadAttachment(item)}>
                                                                        <Paperclip size={16} />
                                                                        <span>{item.attachment_name || "Support attachment"}</span>
                                                                        <Download size={15} />
                                                                    </button>
                                                                )}
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

                                </div>

                                <form
                                    className="buyer-chat-input-area"
                                    onSubmit={
                                        handleSendMessage
                                    }
                                >
                                    {supportOnly && (
                                        <div className="buyer-chat-support-tools">
                                            <div className="buyer-chat-assistant-suggestions inline" aria-label="Quick questions">
                                                {["Where is my order?", "Request a refund", "I have a payment issue"].map((prompt) => (
                                                    <button type="button" key={prompt} onClick={() => handleSendMessage(null, prompt)} disabled={sending || !selectedConversation || Boolean(message.trim())}>{prompt}</button>
                                                ))}
                                            </div>
                                            <label className="buyer-chat-order-picker" htmlFor="buyer-support-order" title="Attach an order to your message">
                                                <PackageCheck size={15} aria-hidden="true" />
                                                <span>Order</span>
                                                <select id="buyer-support-order" aria-label="Add an order for context" value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)} disabled={!shareableOrders.length || sending}>
                                                    <option value="">Add context</option>
                                                    {shareableOrders.map((order) => (
                                                        <option key={order.id} value={order.id}>
                                                            Order #{order.id} · {order.status} · {order.items?.[0]?.product?.name || "Order"}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="buyer-chat-order-chevron" size={14} aria-hidden="true" />
                                            </label>
                                        </div>
                                    )}
                                    {!supportOnly && selectedConversation?.seller_id && (
                                        <div className="buyer-chat-support-tools buyer-chat-seller-order-tools">
                                            <label className="buyer-chat-order-picker" htmlFor="buyer-seller-order">
                                                <PackageCheck size={15} aria-hidden="true" />
                                                <span>Share an order</span>
                                                <select id="buyer-seller-order" aria-label="Choose an order to share with this seller" value={selectedOrderId} onChange={(event) => { setSelectedOrderId(event.target.value); setSelectedProductId(""); }} disabled={!shareableOrders.length || sending}>
                                                    <option value="">Select order</option>
                                                    {shareableOrders.map((order) => (
                                                        <option key={order.id} value={order.id}>Order #{order.id} · {order.status}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="buyer-chat-order-chevron" size={14} aria-hidden="true" />
                                            </label>
                                            <span className="buyer-chat-order-hint">{selectedOrder ? `Order #${selectedOrder.id} will be attached to your message` : shareableOrders.length ? "Only orders from this seller are shown" : "No orders from this seller yet"}</span>
                                            {selectedOrder && <div className="buyer-chat-order-quick-replies" aria-label="Quick replies about this order">
                                                <button type="button" onClick={() => { setSelectedProductId(""); setMessage(`Hi! Could you update me on Order #${selectedOrder.id}?`); inputRef.current?.focus(); }} disabled={sending || messagesLoading}>Ask about status</button>
                                                <button type="button" onClick={() => { setSelectedProductId(""); setMessage(`Hi! When can I expect Order #${selectedOrder.id} to ship?`); inputRef.current?.focus(); }} disabled={sending || messagesLoading}>Ask about delivery</button>
                                            </div>}
                                        </div>
                                    )}
                                    {selectedProductId && !supportOnly && (
                                        <div className="buyer-chat-product-attachment-hint" role="status">
                                            <PackageCheck size={14} /> Product card will be included with your message
                                            <button type="button" onClick={() => setSelectedProductId("")} aria-label="Remove product card from message"><X size={13} /></button>
                                        </div>
                                    )}
                                    {attachment && (
                                        <div className="buyer-chat-attachment-pending">
                                            <Paperclip size={14} />
                                            <span>{attachment.name}</span>
                                            <button type="button" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} aria-label="Remove attachment"><X size={14} /></button>
                                        </div>
                                    )}
                                    {supportOnly && (
                                        <>
                                            <input ref={fileInputRef} className="buyer-chat-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAttachmentChange} aria-label="Choose an image to attach" />
                                            <button className="buyer-chat-attach-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={sending || messagesLoading} aria-label="Attach an image" title="Attach an image (JPEG, PNG, or WebP; 5 MB max)">
                                                <Paperclip size={17} />
                                            </button>
                                        </>
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
                                        placeholder={supportOnly ? "Message CRYMA Customer Service..." : "Type a message..."}
                                        aria-label={supportOnly ? "Message CRYMA Customer Service" : "Type a message"}
                                        disabled={
                                            sending || messagesLoading
                                        }
                                    />

                                    <button
                                        type="submit"
                                        disabled={
                                            sending ||
                                            messagesLoading ||
                                            (!message.trim() && !attachment && !selectedOrderId)
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
