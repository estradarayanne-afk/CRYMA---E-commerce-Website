import { useState, useRef, useEffect } from "react";

const CONTACTS = [
    { id: 1, name: "CRYMA Support", role: "Platform", avatar: "CS", online: true, lastMsg: "How can we help you today?", time: "10:32" },
    { id: 2, name: "Ana Reyes", role: "Buyer", avatar: "AR", online: true, lastMsg: "Is the item still available?", time: "09:15" },
    { id: 3, name: "Ben Cruz", role: "Buyer", avatar: "BC", online: false, lastMsg: "Thanks for the update!", time: "Yesterday" },
    { id: 4, name: "J&T Express", role: "Courier", avatar: "JT", online: true, lastMsg: "Package picked up.", time: "Yesterday" },
];

const INIT_MESSAGES = {
    1: [
        { id: 1, from: "them", text: "Hello! How can we help you today?", time: "10:30" },
        { id: 2, from: "me", text: "I have a question about my commission rate.", time: "10:31" },
        { id: 3, from: "them", text: "Sure! Your current rate is 5%. Let me know if you need anything else.", time: "10:32" },
    ],
    2: [
        { id: 1, from: "them", text: "Hi! Is the Ribbed Knit Co-ord still available in size S?", time: "09:10" },
        { id: 2, from: "me", text: "Yes, we have 2 left in size S!", time: "09:12" },
        { id: 3, from: "them", text: "Is the item still available?", time: "09:15" },
    ],
    3: [
        { id: 1, from: "them", text: "Hi, just checking on my order ORD-1040.", time: "Yesterday" },
        { id: 2, from: "me", text: "It's been packed and ready for pickup!", time: "Yesterday" },
        { id: 3, from: "them", text: "Thanks for the update!", time: "Yesterday" },
    ],
    4: [
        { id: 1, from: "them", text: "We will pick up the package tomorrow at 10am.", time: "Yesterday" },
        { id: 2, from: "me", text: "Perfect, it will be ready.", time: "Yesterday" },
        { id: 3, from: "them", text: "Package picked up.", time: "Yesterday" },
    ],
};

function Chat() {
    const [active, setActive] = useState(CONTACTS[0]);
    const [messages, setMessages] = useState(INIT_MESSAGES);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, active]);

    const send = () => {
        const text = input.trim();
        if (!text) return;
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setMessages((prev) => ({
            ...prev,
            [active.id]: [...(prev[active.id] || []), { id: Date.now(), from: "me", text, time: now }],
        }));
        setInput("");
    };

    const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

    const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; } })();
    const myInitials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "ME";

    return (
        <div className="sl-page sl-page--fill">
            <div className="sl-page-head">
                <div><div className="sl-eyebrow">MESSAGING</div><h1 className="sl-h1">Chat</h1><p>Messages with buyers, couriers, and support.</p></div>
            </div>

            <div className="sl-chat-layout">
                {/* SIDEBAR */}
                <div className="sl-chat-sidebar">
                    {CONTACTS.map((c) => (
                        <button key={c.id} className={`sl-chat-contact${active.id === c.id ? " active" : ""}`} onClick={() => setActive(c)}>
                            <div className="sl-chat-avatar-wrap">
                                <div className="sl-chat-avatar">{c.avatar}</div>
                                {c.online && <span className="sl-chat-online" />}
                            </div>
                            <div className="sl-chat-contact-info">
                                <div className="sl-chat-contact-top">
                                    <strong>{c.name}</strong>
                                    <span className="sl-chat-time">{c.time}</span>
                                </div>
                                <span className="sl-chat-last">{c.lastMsg}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* CHAT WINDOW */}
                <div className="sl-chat-window">
                    <div className="sl-chat-header">
                        <div className="sl-chat-avatar-wrap">
                            <div className="sl-chat-avatar">{active.avatar}</div>
                            {active.online && <span className="sl-chat-online" />}
                        </div>
                        <div>
                            <strong>{active.name}</strong>
                            <span className="sl-chat-role">{active.role} · {active.online ? "Online" : "Offline"}</span>
                        </div>
                    </div>

                    <div className="sl-chat-messages">
                        {(messages[active.id] || []).map((m) => (
                            <div key={m.id} className={`sl-msg${m.from === "me" ? " sl-msg--me" : ""}`}>
                                {m.from !== "me" && <div className="sl-msg-avatar">{active.avatar}</div>}
                                <div className="sl-msg-body">
                                    <div className="sl-msg-bubble">{m.text}</div>
                                    <span className="sl-msg-time">{m.time}</span>
                                </div>
                                {m.from === "me" && <div className="sl-msg-avatar sl-msg-avatar--me">{myInitials}</div>}
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    <div className="sl-chat-input-bar">
                        <textarea
                            className="sl-chat-input"
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder={`Message ${active.name}…`}
                        />
                        <button className="sl-chat-send" onClick={send} disabled={!input.trim()}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chat;
