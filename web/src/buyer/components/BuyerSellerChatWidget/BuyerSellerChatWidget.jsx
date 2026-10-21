import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    ArrowLeft,
    Check,
    CheckCheck,
    LoaderCircle,
    MessageCircle,
    Minimize2,
    RefreshCw,
    Send,
    X,
} from "lucide-react";
import api from "../../../shared/services/api";
import { getChatMessageRequestId } from "../../../shared/utils/chatMessageRequest";
import { getConversationIdentity } from "../../../shared/utils/getConversationIdentity";
import {
    canShowBuyerSellerChatWidget,
    getSellerConversations,
    getSellerConversationDraft,
    getSellerMessageUpdates,
    getSellerUnreadCount,
    mergeSellerSentMessage,
    setSellerConversationDraft,
} from "../../../shared/utils/buyerSellerChatWidget";
import { getStoredUser, isBuyerSession, showBuyerToast } from "../../../shared/utils/buyerAccess";
import "./BuyerSellerChatWidget.css";

function formatTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

function getLatestMessage(conversation) {
    return conversation?.messages?.[0] || null;
}

function BuyerSellerChatWidget() {
    const location = useLocation();
    const [buyerSession, setBuyerSession] = useState(isBuyerSession);
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [activeConversation, setActiveConversation] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [panelOpen, setPanelOpen] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [conversationLoading, setConversationLoading] = useState(false);
    const [conversationError, setConversationError] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [isSmallViewport, setIsSmallViewport] = useState(() => window.matchMedia("(max-width: 640px)").matches);
    const userId = getStoredUser()?.id;
    const sessionOwnerRef = useRef(userId);
    const draft = getSellerConversationDraft(drafts, selectedId);
    const pendingMessageRef = useRef(new Map());
    const sendingRef = useRef(false);
    const detailRequestRef = useRef(0);
    const selectedIdRef = useRef(selectedId);
    const listRequestInFlightRef = useRef(false);
    const panelWasOpenRef = useRef(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const launcherRef = useRef(null);
    const panelRef = useRef(null);
    const eligible = canShowBuyerSellerChatWidget(location.pathname, buyerSession);
    const selectedConversation = String(activeConversation?.id) === String(selectedId)
        ? activeConversation
        : null;
    const conversationReady = Boolean(selectedConversation);
    const unreadCount = useMemo(() => getSellerUnreadCount(conversations), [conversations]);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    useEffect(() => {
        const updateSession = () => setBuyerSession(isBuyerSession());
        window.addEventListener("cryma-user-updated", updateSession);
        window.addEventListener("storage", updateSession);
        return () => {
            window.removeEventListener("cryma-user-updated", updateSession);
            window.removeEventListener("storage", updateSession);
        };
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 640px)");
        const updateViewport = () => setIsSmallViewport(mediaQuery.matches);
        mediaQuery.addEventListener("change", updateViewport);
        return () => mediaQuery.removeEventListener("change", updateViewport);
    }, []);

    useEffect(() => {
        if (String(sessionOwnerRef.current) === String(userId) && buyerSession) return;
        if (String(sessionOwnerRef.current) !== String(userId) || !buyerSession) {
            setConversations([]);
            setSelectedId(null);
            setActiveConversation(null);
            setDrafts({});
            setPanelOpen(false);
            setMinimized(false);
            setListError("");
            setConversationError("");
            setSendError("");
            pendingMessageRef.current.clear();
            detailRequestRef.current += 1;
            selectedIdRef.current = null;
            sessionOwnerRef.current = buyerSession ? userId : null;
        }
    }, [buyerSession, userId]);

    const loadConversations = useCallback(async ({ silent = false } = {}) => {
        if (listRequestInFlightRef.current) return;
        listRequestInFlightRef.current = true;
        if (!silent) {
            setListLoading(true);
            setListError("");
        }
        try {
            const response = await api.get("/buyer/chat/conversations");
            if (!isBuyerSession() || String(getStoredUser()?.id) !== String(userId)) return;
            const sellerConversations = getSellerConversations(response.data?.data);
            setConversations(sellerConversations);
            setListError("");
            const currentSelectedId = selectedIdRef.current;
            if (currentSelectedId !== null && !sellerConversations.some((item) => String(item.id) === String(currentSelectedId))) {
                selectedIdRef.current = null;
                setSelectedId(null);
                setActiveConversation(null);
            }
        } catch (error) {
            if (!isBuyerSession() || String(getStoredUser()?.id) !== String(userId)) return;
            setListError(error.response?.data?.message || "Seller conversations could not be loaded.");
        } finally {
            if (!silent) setListLoading(false);
            listRequestInFlightRef.current = false;
        }
    }, [userId]);

    useEffect(() => {
        if (!eligible) return undefined;
        let cancelled = false;
        const refresh = async (silent) => {
            if (cancelled) return;
            await loadConversations({ silent });
        };
        const timeoutId = window.setTimeout(() => { void refresh(false); }, 0);
        const intervalId = window.setInterval(() => { void refresh(true); }, 15000);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [eligible, loadConversations]);

    const loadConversation = useCallback(async (id, { silent = false } = {}) => {
        const requestId = ++detailRequestRef.current;
        if (!silent) {
            setConversationLoading(true);
            setConversationError("");
        }
        try {
            const response = await api.get(`/buyer/chat/conversations/${id}`);
            const conversation = response.data?.data;
            if (requestId !== detailRequestRef.current) return;
            if (!conversation || !getSellerConversations([conversation]).length) {
                setActiveConversation(null);
                setConversationError("This conversation is not available in seller messages.");
                return;
            }
            const messageUpdates = getSellerMessageUpdates(conversation.messages, userId);
            const hasUnread = Number(conversation.unread_messages_count || 0) > 0 || messageUpdates.hasUnread;
            setActiveConversation(conversation);

            if (hasUnread) {
                try {
                    await api.patch(`/buyer/chat/conversations/${id}/read`);
                    if (requestId !== detailRequestRef.current) return;
                    setActiveConversation((current) => String(current?.id) === String(id)
                        ? { ...current, messages: messageUpdates.readMessages }
                        : current);
                    setConversations((current) => current.map((item) => (
                        String(item.id) === String(id)
                            ? { ...item, unread_messages_count: 0 }
                            : item
                    )));
                } catch {
                    if (requestId === detailRequestRef.current) {
                        setConversationError("Conversation opened, but its unread status could not be updated.");
                    }
                }
            }
        } catch (error) {
            if (requestId !== detailRequestRef.current) return;
            setConversationError(error.response?.data?.message || "This conversation could not be opened.");
        } finally {
            if (requestId === detailRequestRef.current && !silent) setConversationLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!eligible || !panelOpen || selectedId === null) return undefined;
        let cancelled = false;
        let inFlight = false;
        const refresh = async (silent) => {
            if (inFlight || cancelled) return;
            inFlight = true;
            try {
                await loadConversation(selectedId, { silent });
            } finally {
                inFlight = false;
            }
        };
        const timeoutId = window.setTimeout(() => { void refresh(false); }, 0);
        const intervalId = window.setInterval(() => { void refresh(true); }, 5000);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
            detailRequestRef.current += 1;
        };
    }, [eligible, panelOpen, selectedId, loadConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversation?.id, selectedConversation?.messages?.length]);

    useEffect(() => {
        if (!panelOpen) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === "Escape") setPanelOpen(false);
            if (!isSmallViewport || event.key !== "Tab") return;
            const controls = [...(panelRef.current?.querySelectorAll(
                'button:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            ) || [])].filter((control) => control.getClientRects().length > 0);
            if (!controls?.length) return;
            const firstControl = controls[0];
            const lastControl = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === firstControl) {
                event.preventDefault();
                lastControl.focus();
            } else if (!event.shiftKey && document.activeElement === lastControl) {
                event.preventDefault();
                firstControl.focus();
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [panelOpen, isSmallViewport]);

    useEffect(() => {
        if (!panelOpen) {
            if (!panelWasOpenRef.current) return undefined;
            panelWasOpenRef.current = false;
            launcherRef.current?.focus();
            return undefined;
        }
        panelWasOpenRef.current = true;
        const focusTarget = selectedId !== null && !conversationLoading && conversationReady
            ? inputRef.current
            : [...(panelRef.current?.querySelectorAll(
                ".buyer-seller-chat-back, .buyer-seller-chat-conversation, .buyer-seller-chat-icon",
            ) || [])].find((control) => control.getClientRects().length > 0);
        focusTarget?.focus();
        return undefined;
    }, [panelOpen, selectedId, conversationLoading, conversationReady]);

    const selectConversation = (id) => {
        if (String(id) === String(selectedId)) return;
        detailRequestRef.current += 1;
        selectedIdRef.current = id;
        setSelectedId(id);
        setActiveConversation(null);
        setConversationError("");
        setSendError("");
    };

    const updateDraft = (value) => {
        if (selectedId === null) return;
        setDrafts((current) => setSellerConversationDraft(current, selectedId, value));
        setSendError("");
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        const message = draft.trim();
        if (!message || !selectedConversation || sendingRef.current) return;
        const conversationId = selectedConversation.id;
        const ownerId = userId;
        sendingRef.current = true;
        setSending(true);
        setSendError("");
        try {
            const requestId = getChatMessageRequestId(
                pendingMessageRef.current.get(String(conversationId)),
                message,
                conversationId,
            );
            pendingMessageRef.current.set(String(conversationId), { message, scope: conversationId, id: requestId });
            const response = await api.post(`/buyer/chat/conversations/${conversationId}/messages`, {
                message,
                client_message_id: requestId,
            });
            if (!isBuyerSession() || String(getStoredUser()?.id) !== String(ownerId)) return;
            const newMessage = response.data?.data;
            if (!newMessage) throw new Error("Message response was empty.");
            setActiveConversation((current) => (
                String(current?.id) === String(conversationId)
                    ? {
                        ...current,
                        messages: mergeSellerSentMessage(current.messages, newMessage),
                    }
                    : current
            ));
            setConversations((current) => current.map((item) => (
                String(item.id) === String(conversationId)
                    ? { ...item, messages: [newMessage, ...(item.messages || []).filter((entry) => entry.id !== newMessage.id)], updated_at: newMessage.created_at }
                    : item
            )));
            setDrafts((current) => setSellerConversationDraft(current, conversationId, ""));
            pendingMessageRef.current.delete(String(conversationId));
            showBuyerToast("Message sent");
            window.setTimeout(() => inputRef.current?.focus(), 0);
        } catch (error) {
            if (
                isBuyerSession()
                && String(getStoredUser()?.id) === String(ownerId)
                && String(selectedIdRef.current) === String(conversationId)
            ) {
                setSendError(error.response?.data?.message || error.message || "Message could not be sent. Please try again.");
            }
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    };

    if (!eligible) return null;

    const startPanel = () => {
        setPanelOpen(true);
        setMinimized(false);
        if (!conversations.length && !listLoading) void loadConversations();
    };

    return (
        <div className={`buyer-seller-chat-widget${panelOpen ? " is-open" : ""}`}>
            {panelOpen ? (
                <section
                    ref={panelRef}
                    className="buyer-seller-chat-panel"
                    role={isSmallViewport ? "dialog" : "region"}
                    aria-modal={isSmallViewport ? "true" : undefined}
                    aria-label="Seller messages"
                >
                    <header className="buyer-seller-chat-header">
                        {selectedId !== null && (
                            <button
                                type="button"
                                className="buyer-seller-chat-back"
                                aria-label="Back to seller conversations"
                                onClick={() => {
                                    selectedIdRef.current = null;
                                    setSelectedId(null);
                                }}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div className="buyer-seller-chat-title">
                            <strong>{selectedConversation ? getConversationIdentity(selectedConversation).name : "Seller messages"}</strong>
                            <span>{selectedConversation?.product?.name || "Chat with marketplace sellers"}</span>
                        </div>
                        <button type="button" className="buyer-seller-chat-icon" onClick={() => { setPanelOpen(false); setMinimized(true); }} aria-label="Minimize seller messages">
                            <Minimize2 size={17} />
                        </button>
                        <button type="button" className="buyer-seller-chat-icon" onClick={() => { setPanelOpen(false); setMinimized(false); }} aria-label="Close seller messages">
                            <X size={18} />
                        </button>
                    </header>

                    <div className={`buyer-seller-chat-content${selectedId !== null ? " has-selection" : ""}`}>
                        <aside className="buyer-seller-chat-list" aria-label="Seller conversations">
                            <div className="buyer-seller-chat-list-heading">Conversations</div>
                            {listLoading && conversations.length === 0 ? (
                                <div className="buyer-seller-chat-state"><LoaderCircle className="buyer-seller-chat-spinner" size={20} />Loading conversations…</div>
                            ) : listError && conversations.length === 0 ? (
                                <div className="buyer-seller-chat-state" role="alert">
                                    <span>{listError}</span>
                                    <button type="button" onClick={() => void loadConversations()}>Try again</button>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="buyer-seller-chat-state">
                                    <MessageCircle size={22} />
                                    <strong>No seller conversations yet</strong>
                                    <span>Contact a seller from a product page to start a conversation.</span>
                                </div>
                            ) : (
                                <>
                                    {listError && <div className="buyer-seller-chat-inline-error" role="alert">{listError} <button type="button" onClick={() => void loadConversations()}>Retry</button></div>}
                                    {conversations.map((conversation) => {
                                        const identity = getConversationIdentity(conversation);
                                        const latest = getLatestMessage(conversation);
                                        return (
                                            <button
                                                type="button"
                                                className={`buyer-seller-chat-conversation${String(conversation.id) === String(selectedId) ? " active" : ""}`}
                                                key={conversation.id}
                                                onClick={() => selectConversation(conversation.id)}
                                            >
                                                <span className="buyer-seller-chat-avatar" aria-hidden="true">{identity.initials}</span>
                                                <span className="buyer-seller-chat-conversation-text">
                                                    <strong>{identity.name}</strong>
                                                    <span>{latest?.message || conversation.product?.name || "Start a conversation"}</span>
                                                </span>
                                                {Number(conversation.unread_messages_count) > 0 && (
                                                    <span className="buyer-seller-chat-unread" aria-label={`${conversation.unread_messages_count} unread messages`}>
                                                        {Number(conversation.unread_messages_count) > 9 ? "9+" : conversation.unread_messages_count}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </>
                            )}
                        </aside>

                        <section className="buyer-seller-chat-thread" aria-label="Conversation messages">
                            {!selectedId ? (
                                <div className="buyer-seller-chat-state buyer-seller-chat-thread-empty">
                                    <MessageCircle size={24} />
                                    <span>Select a seller conversation</span>
                                </div>
                            ) : conversationLoading && !selectedConversation ? (
                                <div className="buyer-seller-chat-state"><LoaderCircle className="buyer-seller-chat-spinner" size={20} />Loading conversation…</div>
                            ) : conversationError && !selectedConversation ? (
                                <div className="buyer-seller-chat-state" role="alert">
                                    <span>{conversationError}</span>
                                    <button type="button" onClick={() => void loadConversation(selectedId)}>Try again</button>
                                </div>
                            ) : selectedConversation ? (
                                <>
                                    {conversationError && (
                                        <div className="buyer-seller-chat-inline-error" role="status">
                                            {conversationError}
                                            <button type="button" onClick={() => void loadConversation(selectedId)}>Retry</button>
                                        </div>
                                    )}
                                    <div className="buyer-seller-chat-messages" aria-live="polite">
                                        {selectedConversation.messages?.length ? selectedConversation.messages.map((item) => {
                                            const mine = Number(item.sender_id) === Number(userId);
                                            return (
                                                <div key={item.id} className={`buyer-seller-chat-message${mine ? " mine" : ""}`}>
                                                    <p>{item.message}</p>
                                                    <span>{formatTime(item.created_at)}{mine && (item.is_read ? <CheckCheck size={12} aria-label="Read" /> : <Check size={12} aria-label="Sent" />)}</span>
                                                </div>
                                            );
                                        }) : (
                                            <div className="buyer-seller-chat-state buyer-seller-chat-empty-thread">
                                                <MessageCircle size={20} />
                                                <span>No messages yet. Send a message to this seller.</span>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                    <form className="buyer-seller-chat-composer" onSubmit={sendMessage}>
                                        {sendError && <p className="buyer-seller-chat-send-error" role="alert">{sendError}</p>}
                                        <textarea
                                            ref={inputRef}
                                            value={draft}
                                            onChange={(event) => updateDraft(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault();
                                                    event.currentTarget.form?.requestSubmit();
                                                }
                                            }}
                                            rows={1}
                                            maxLength={2000}
                                            placeholder="Write a message…"
                                            aria-label="Write a seller message"
                                            disabled={sending || conversationLoading}
                                        />
                                        <button type="submit" aria-label="Send message" disabled={sending || conversationLoading || !draft.trim()}>
                                            {sending ? <LoaderCircle size={18} className="buyer-seller-chat-spinner" /> : <Send size={17} />}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="buyer-seller-chat-state" role="alert">
                                    <span>Could not open this seller conversation.</span>
                                    <button type="button" onClick={() => void loadConversation(selectedId)}><RefreshCw size={14} /> Retry</button>
                                </div>
                            )}
                        </section>
                    </div>
                </section>
            ) : (
                <button
                    ref={launcherRef}
                    type="button"
                    className={`buyer-seller-chat-launcher${minimized ? " minimized" : ""}`}
                    onClick={startPanel}
                    aria-label={`${minimized ? "Restore" : "Open"} seller messages${unreadCount ? `, ${unreadCount} unread` : ""}`}
                    aria-expanded={false}
                >
                    <MessageCircle size={22} />
                    <span>Seller chat</span>
                    {unreadCount > 0 && <span className="buyer-seller-chat-launcher-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
            )}
        </div>
    );
}

export default BuyerSellerChatWidget;
