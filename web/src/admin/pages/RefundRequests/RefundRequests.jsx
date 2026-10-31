import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, CircleDollarSign, LoaderCircle, RotateCcw, X } from "lucide-react";
import api from "../../../shared/services/api";
import "./RefundRequests.css";

const filters = ["all", "pending", "under_review", "approved", "rejected", "refunded"];
const label = (value = "") => value.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RefundRequests() {
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [notes, setNotes] = useState({});
    const [amounts, setAmounts] = useState({});
    const [returnRequired, setReturnRequired] = useState({});
    const [methods, setMethods] = useState({});
    const [references, setReferences] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/refund-requests", { params: { status: filter, page } });
            const result = response.data?.data;
            setRequests(result?.data || []);
            setPagination({ current_page: result?.current_page || 1, last_page: result?.last_page || 1, total: result?.total || 0 });
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "Refund requests couldn't be loaded.");
        } finally {
            setLoading(false);
        }
    }, [filter, page]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadRequests(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadRequests]);

    const updateRequest = async (refundRequest, status) => {
        if (saving) return;
        const note = (notes[refundRequest.id] || "").trim();
        if (note.length < 3) {
            setError("Add a short note for the buyer before changing this request.");
            return;
        }
        setSaving(refundRequest.id);
        setError("");
        setNotice("");
        const payload = { status, review_note: note };
        if (status === "approved") payload.approved_amount = Number(amounts[refundRequest.id] ?? refundRequest.requested_amount);
        if (status === "approved") payload.return_required = Boolean(returnRequired[refundRequest.id]);
        if (status === "refunded") {
            payload.refund_method = methods[refundRequest.id] || "other";
            payload.refund_reference = references[refundRequest.id] || null;
        }
        try {
            await api.patch(`/admin/refund-requests/${refundRequest.id}`, payload);
            setNotice(`Refund request #${refundRequest.id} updated.`);
            setNotes((current) => ({ ...current, [refundRequest.id]: "" }));
            await loadRequests();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || "The refund request couldn't be updated.");
        } finally {
            setSaving(null);
        }
    };

    return (
        <main className="refunds-page">
            <header className="refunds-header">
                <div>
                    <span>ORDER CARE</span>
                    <h1>Refund requests</h1>
                    <p>Review buyer requests, record decisions, and confirm repayment after it is completed.</p>
                </div>
                <div className="refunds-total"><strong>{pagination.total}</strong><span>requests</span></div>
            </header>

            <section className="refunds-workspace">
                <nav className="refunds-filters" aria-label="Filter refund requests">
                    {filters.map((item) => (
                        <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => { setFilter(item); setPage(1); }}>
                            {label(item)}
                        </button>
                    ))}
                </nav>

                {error && <div className="refunds-alert" role="alert">{error}</div>}
                {notice && <div className="refunds-notice" role="status">{notice}</div>}

                {loading ? (
                    <div className="refunds-empty"><LoaderCircle className="refunds-spinner" size={20} /> Loading refund requests…</div>
                ) : requests.length === 0 ? (
                    <div className="refunds-empty"><CircleDollarSign size={25} /><strong>No refund requests</strong><span>Requests submitted by buyers will appear here.</span></div>
                ) : (
                    <div className="refunds-list">
                        {requests.map((item) => {
                            const order = item.order || {};
                            const buyer = item.buyer || {};
                            const canReview = ["pending", "under_review"].includes(item.status);
                            const isSaving = saving === item.id;
                            return (
                                <article className="refund-card" key={item.id}>
                                    <header className="refund-card-header">
                                        <div><span>REQUEST #{item.id}</span><h2>Order #{order.id}</h2></div>
                                        <span className={`refund-badge ${item.status}`}>{label(item.status)}</span>
                                    </header>
                                    <div className="refund-card-summary">
                                        <div><span>Buyer</span><strong>{`${buyer.first_name || ""} ${buyer.last_name || ""}`.trim() || "Buyer"}</strong><small>{buyer.email}</small></div>
                                        <div><span>Order status</span><strong>{label(order.status)}</strong><small>{order.payment_method === "cash_on_delivery" ? "Cash on Delivery" : label(order.payment_method)}</small></div>
                                        <div><span>Requested</span><strong>{money(item.requested_amount)}</strong><small>Order total {money(order.total_amount)}</small></div>
                                        {item.approved_amount && <div><span>Approved</span><strong>{money(item.approved_amount)}</strong><small>{item.refunded_at ? `Repaid ${new Date(item.refunded_at).toLocaleDateString("en-PH")}` : "Awaiting repayment"}</small></div>}
                                    </div>
                                    <div className="refund-order-items">{order.items?.map((line) => line.product?.name).filter(Boolean).join(" · ") || "Order items"}</div>
                                    <div className="refund-reason"><span>Buyer’s reason</span><p>{item.reason}</p></div>
                                    {item.review_note && <div className="refund-review-note"><span>Latest review note</span><p>{item.review_note}</p></div>}
                                    {item.return_required && <div className="refund-review-note"><span>Return parcel</span><p>{label(item.return_shipment?.status || "awaiting pickup")}{item.return_shipment?.current_hub?.name ? ` · ${item.return_shipment.current_hub.name}` : ""}</p></div>}
                                    {item.status === "refunded" && <div className="refund-complete-note"><Check size={16} /> Repayment recorded via {label(item.refund_method)}{item.refund_reference ? ` · Reference ${item.refund_reference}` : ""}.</div>}

                                    {canReview && (
                                        <div className="refund-actions">
                                            {item.status === "pending" && <p className="refund-instruction">Start review or decide whether to approve the requested amount.</p>}
                                            {item.status === "under_review" && <p className="refund-instruction">Finish your review by approving or rejecting the request.</p>}
                                            {item.status !== "pending" && null}
                                            <label className="refund-field">Amount to approve<input type="number" min="0.01" max={item.requested_amount} step="0.01" value={amounts[item.id] ?? item.requested_amount} onChange={(event) => setAmounts((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                                            <label className="refund-field"><span><input type="checkbox" checked={Boolean(returnRequired[item.id])} onChange={(event) => setReturnRequired((current) => ({ ...current, [item.id]: event.target.checked }))} /> Require the buyer to return the item before repayment</span></label>
                                            <label className="refund-field">Note to buyer<textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1500} placeholder="Explain the decision or next step." /></label>
                                            <div className="refund-action-buttons">
                                                {item.status === "pending" && <button type="button" className="secondary" disabled={isSaving || (notes[item.id] || "").trim().length < 3} onClick={() => void updateRequest(item, "under_review")}>Start review</button>}
                                                <button type="button" className="reject" disabled={isSaving || (notes[item.id] || "").trim().length < 3} onClick={() => void updateRequest(item, "rejected")}><X size={15} /> Reject</button>
                                                <button type="button" disabled={isSaving || (notes[item.id] || "").trim().length < 3 || Number(amounts[item.id] ?? item.requested_amount) <= 0 || Number(amounts[item.id] ?? item.requested_amount) > Number(item.requested_amount)} onClick={() => void updateRequest(item, "approved")}><Check size={15} /> Approve</button>
                                            </div>
                                        </div>
                                    )}

                                    {item.status === "approved" && (
                                        <div className="refund-actions refund-actions-complete">
                                            <p className="refund-instruction"><strong>Only mark as refunded after repayment is completed outside CRYMA.</strong> This action records the completed payment; it does not transfer money.</p>
                                            <label className="refund-field">Repayment method<select value={methods[item.id] || "other"} onChange={(event) => setMethods((current) => ({ ...current, [item.id]: event.target.value }))}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="other">Other agreed method</option></select></label>
                                            <label className="refund-field">Reference (optional)<input value={references[item.id] || ""} onChange={(event) => setReferences((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={120} placeholder="Receipt or transfer reference; no account details" /></label>
                                            <label className="refund-field">Note to buyer<textarea value={notes[item.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1500} placeholder="Confirm how and when repayment was completed." /></label>
                                            <div className="refund-action-buttons"><button type="button" disabled={isSaving || (notes[item.id] || "").trim().length < 3} onClick={() => void updateRequest(item, "refunded")}><RotateCcw size={15} /> Record repayment completed</button></div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}

                {pagination.last_page > 1 && <footer className="refunds-pagination"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /> Previous</button><span>Page {pagination.current_page} of {pagination.last_page}</span><button type="button" disabled={page >= pagination.last_page || loading} onClick={() => setPage((current) => current + 1)}>Next <ChevronRight size={16} /></button></footer>}
            </section>
        </main>
    );
}

export default RefundRequests;
