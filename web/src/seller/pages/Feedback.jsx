import { useState } from "react";

const FEEDBACK = [
    { id: 1, order: "ORD-1037", customer: "Eva Santos", product: "Tailored Blazer", rating: 5, comment: "Absolutely love the quality! Fits perfectly and the fabric feels premium.", date: "2026-06-08", replied: false },
    { id: 2, order: "ORD-1036", customer: "Felix Gomez", product: "Ribbed Knit Co-ord", rating: 4, comment: "Great product, delivery was a bit slow but overall satisfied.", date: "2026-06-07", replied: true, reply: "Thank you Felix! We're working on faster delivery." },
    { id: 3, order: "ORD-1035", customer: "Grace Uy", product: "Contour Shoulder Bag", rating: 3, comment: "The bag is nice but the strap feels a bit thin.", date: "2026-06-06", replied: false },
    { id: 4, order: "ORD-1034", customer: "Henry Tan", product: "Merino Crew Neck", rating: 5, comment: "Super soft and warm. Already ordered another one!", date: "2026-06-05", replied: true, reply: "So glad you love it, Henry! 🙌" },
];

const STARS = (n) => "★".repeat(n) + "☆".repeat(5 - n);
const STAR_COLOR = (n) => n >= 4 ? "#d4a017" : n === 3 ? "#e07b39" : "#c24141";

function Feedback() {
    const [items, setItems] = useState(FEEDBACK);
    const [filter, setFilter] = useState("all");
    const [replyModal, setReplyModal] = useState(null);
    const [replyText, setReplyText] = useState("");

    const visible = items.filter((f) =>
        filter === "all" ? true : filter === "pending" ? !f.replied : f.replied
    );

    const submitReply = () => {
        setItems((prev) => prev.map((f) =>
            f.id === replyModal.id ? { ...f, replied: true, reply: replyText } : f
        ));
        setReplyModal(null);
        setReplyText("");
    };

    const avgRating = (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(1);

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><h2>Customer Feedback</h2><p>View and respond to customer reviews.</p></div>
                <div className="sl-rating-summary">
                    <strong style={{ fontSize: 28, color: "#d4a017" }}>{avgRating}★</strong>
                    <span>{items.length} reviews</span>
                </div>
            </div>

            <div className="sl-filter-tabs sl-filter-tabs--standalone">
                {["all", "pending", "replied"].map((f) => (
                    <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="sl-tab-count">
                            {f === "all" ? items.length : f === "pending" ? items.filter((i) => !i.replied).length : items.filter((i) => i.replied).length}
                        </span>
                    </button>
                ))}
            </div>

            <div className="sl-feedback-list">
                {visible.length === 0 && <div className="sl-card" style={{ padding: 40, textAlign: "center", color: "#9aa8a6" }}>No feedback found.</div>}
                {visible.map((f) => (
                    <div className="sl-card sl-feedback-card" key={f.id}>
                        <div className="sl-feedback-head">
                            <div>
                                <strong>{f.customer}</strong>
                                <span className="sl-feedback-meta">{f.order} · {f.product} · {f.date}</span>
                            </div>
                            <div className="sl-feedback-stars" style={{ color: STAR_COLOR(f.rating) }}>
                                {STARS(f.rating)}
                            </div>
                        </div>
                        <p className="sl-feedback-comment">"{f.comment}"</p>
                        {f.replied && f.reply && (
                            <div className="sl-feedback-reply">
                                <span className="sl-feedback-reply-label">Your reply:</span>
                                <p>{f.reply}</p>
                            </div>
                        )}
                        {!f.replied && (
                            <button className="sl-btn-sm" style={{ marginTop: 12 }} onClick={() => { setReplyModal(f); setReplyText(""); }}>
                                Reply
                            </button>
                        )}
                        {f.replied && (
                            <button className="sl-btn-sm sl-btn-sm--ghost" style={{ marginTop: 12 }} onClick={() => { setReplyModal(f); setReplyText(f.reply || ""); }}>
                                Edit Reply
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {replyModal && (
                <div className="sl-overlay" onClick={() => setReplyModal(null)}>
                    <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>Reply to {replyModal.customer}</h3>
                            <button className="sl-modal-close" onClick={() => setReplyModal(null)}>✕</button>
                        </div>
                        <div className="sl-modal-body">
                            <p style={{ fontSize: 13, color: "#4a6462", marginBottom: 8 }}>
                                <span style={{ color: STAR_COLOR(replyModal.rating) }}>{STARS(replyModal.rating)}</span>
                            </p>
                            <p style={{ fontSize: 13, color: "#2a3f3e", marginBottom: 20 }}>"{replyModal.comment}"</p>
                            <div className="sl-field">
                                <label>Your Reply</label>
                                <textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a helpful, friendly response…" style={{ resize: "vertical" }} />
                            </div>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setReplyModal(null)}>Cancel</button>
                            <button className="sl-btn-primary" disabled={!replyText.trim()} onClick={submitReply}>Submit Reply</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Feedback;
