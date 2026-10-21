import { useCallback, useEffect, useState } from "react";
import api from "../../shared/services/api";

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function Feedback() {
    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({ review_count: 0, average_rating: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchReviews = useCallback(async () => {
        const { data } = await api.get("/seller/reviews");
        return {
            reviews: data?.data?.data ?? [],
            summary: data?.summary ?? { review_count: 0, average_rating: null },
        };
    }, []);

    const reload = async () => {
        setLoading(true);
        setError("");
        try {
            const result = await fetchReviews();
            setReviews(result.reviews);
            setSummary(result.summary);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load customer reviews.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let current = true;
        fetchReviews()
            .then((result) => {
                if (current) {
                    setReviews(result.reviews);
                    setSummary(result.summary);
                }
            })
            .catch((requestError) => {
                if (current) setError(requestError.response?.data?.message || "Unable to load customer reviews.");
            })
            .finally(() => { if (current) setLoading(false); });
        return () => { current = false; };
    }, [fetchReviews]);

    const average = summary.average_rating ?? "—";

    return (
        <div className="sl-page">
            <section className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">CUSTOMER REVIEWS</div>
                    <h1 className="sl-h1">Customer Feedback</h1>
                    <p>Reviews left on products in your store.</p>
                </div>
                {summary.review_count > 0 && (
                    <div className="sl-rating-summary" aria-label={`Average rating ${average} out of 5`}>
                        <strong style={{ fontSize: 28, color: "#9a6d00" }}>{average} / 5</strong>
                        <span>{summary.review_count} review{summary.review_count === 1 ? "" : "s"}</span>
                    </div>
                )}
            </section>

            {error && (
                <div className="sl-dashboard-error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => void reload()} disabled={loading}>Retry</button>
                </div>
            )}

            <div className="sl-feedback-list">
                {loading ? (
                    <div className="sl-card sl-empty" role="status">Loading reviews…</div>
                ) : error ? (
                    <div className="sl-card sl-empty">Review data is unavailable.</div>
                ) : reviews.length === 0 ? (
                    <div className="sl-card sl-empty">No customer reviews yet.</div>
                ) : reviews.map((review) => {
                    const buyerName = [review.buyer?.first_name, review.buyer?.last_name].filter(Boolean).join(" ") || "Buyer";
                    const rating = Math.min(5, Math.max(0, Number(review.rating || 0)));
                    return (
                        <article className="sl-card sl-feedback-card" key={review.id}>
                            <header className="sl-feedback-head">
                                <div>
                                    <strong>{buyerName}</strong>
                                    <span className="sl-feedback-meta">{review.product?.name || "Product"} · {formatDate(review.created_at)}</span>
                                </div>
                                <div className="sl-feedback-stars" aria-label={`${rating} out of 5 stars`}>
                                    <span aria-hidden="true">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
                                </div>
                            </header>
                            <p className="sl-feedback-comment">{review.comment?.trim() || "No written comment."}</p>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

export default Feedback;
