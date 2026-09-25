import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    CheckCheck,
    LoaderCircle,
    MessageCircle,
    Send,
} from "lucide-react";
import api from "../../../shared/services/api";
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

function getUserName(user) {
    return (
        `${user?.first_name || ""} ${
            user?.last_name || ""
        }`.trim() ||
        user?.email?.split("@")[0] ||
        "You"
    );
}

function getInitials(firstName, lastName) {
    const initials =
        `${firstName?.charAt(0) || ""}${
            lastName?.charAt(0) || ""
        }`.toUpperCase();

    return initials || "CS";
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

function Chat() {
    const user = getStoredUser();

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

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const openConversation = useCallback(async (id) => {
        try {
            setMessagesLoading(true);
            setError("");

            const response = await api.get(
                `/buyer/chat/conversations/${id}`
            );

            const conversation =
                response.data?.data || null;

            setSelectedConversation(
                conversation
            );

            await api.patch(
                `/buyer/chat/conversations/${id}/read`
            );
        } catch (requestError) {
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
            setMessagesLoading(false);
        }
    }, []);

    const loadConversations = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(
                    "/buyer/chat/conversations"
                );

                const data =
                    response.data?.data || [];

                setConversations(
                    Array.isArray(data) ? data : []
                );

                if (
                    !selectedConversation &&
                    data.length > 0
                ) {
                    await openConversation(
                        data[0].id
                    );
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
        [selectedConversation, openConversation]
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

        const intervalId = setInterval(async () => {
            try {
                const response = await api.get(
                    `/buyer/chat/conversations/${selectedConversation.id}`
                );

                const conversation =
                    response.data?.data || null;

                if (conversation) {
                    setSelectedConversation(
                        conversation
                    );

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
    }, [selectedConversation?.id]);

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

            const response = await api.post(
                `/buyer/chat/conversations/${selectedConversation.id}/messages`,
                {
                    message: trimmedMessage,
                }
            );

            const newMessage =
                response.data?.data;

            if (newMessage) {
                setSelectedConversation(
                    (previous) => ({
                        ...previous,
                        messages: [
                            ...(previous.messages ||
                                []),
                            newMessage,
                        ],
                    })
                );
            }

            setMessage("");

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

    const admin =
        selectedConversation?.admin;

    const adminName = admin
        ? getUserName(admin)
        : "CRYMA Support";

    const adminInitials = admin
        ? getInitials(
              admin.first_name,
              admin.last_name
          )
        : "CS";

    return (
        <main className="buyer-chat-page">
            <div className="buyer-chat-container">
                <header className="buyer-chat-header">
                    <div>
                        <span className="buyer-chat-eyebrow">
                            CRYMA SUPPORT
                        </span>

                        <h1>Messages</h1>

                        <p>
                            Need help? Send us a
                            message and our support
                            team will assist you.
                        </p>
                    </div>
                </header>

                {error && (
                    <div className="buyer-chat-error">
                        {error}
                    </div>
                )}

                <section className="buyer-chat-panel">
                    <aside className="buyer-chat-sidebar">
                        <div className="buyer-chat-sidebar-heading">
                            <div>
                                <span>
                                    SUPPORT
                                </span>

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

                                        const conversationAdmin =
                                            conversation.admin;

                                        const name =
                                            conversationAdmin
                                                ? getUserName(
                                                      conversationAdmin
                                                  )
                                                : "CRYMA Support";

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
                                                <div className="buyer-chat-avatar">
                                                    {conversationAdmin
                                                        ? getInitials(
                                                              conversationAdmin.first_name,
                                                              conversationAdmin.last_name
                                                          )
                                                        : "CS"}
                                                </div>

                                                <div className="buyer-chat-conversation-info">
                                                    <div className="buyer-chat-conversation-top">
                                                        <strong>
                                                            {name}
                                                        </strong>

                                                        <span>
                                                            {formatConversationTime(
                                                                lastMessage?.created_at ||
                                                                    conversation.updated_at
                                                            )}
                                                        </span>
                                                    </div>

                                                    <p>
                                                        {lastMessage?.message ||
                                                            "Start a conversation with CRYMA Support."}
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

                                <h2>
                                    Your support inbox
                                </h2>

                                <p>
                                    Your CRYMA support
                                    conversation will
                                    appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                <header className="buyer-chat-window-header">
                                    <div className="buyer-chat-avatar large">
                                        {adminInitials}
                                    </div>

                                    <div>
                                        <h2>
                                            {adminName}
                                        </h2>

                                        <span>
                                            CRYMA Support
                                        </span>
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
                                                Send a
                                                message
                                                below and
                                                our support
                                                team can
                                                assist you.
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
                                                                    <CheckCheck
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
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
                                    className="buyer-chat-input-area"
                                    onSubmit={
                                        handleSendMessage
                                    }
                                >
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
                                        disabled={
                                            sending
                                        }
                                    />

                                    <button
                                        type="submit"
                                        disabled={
                                            sending ||
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