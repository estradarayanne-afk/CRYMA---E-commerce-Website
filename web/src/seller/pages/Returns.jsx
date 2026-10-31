import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Clock3, MapPin, Package, RefreshCw, RotateCcw, Truck } from "lucide-react";
import api from "../../shared/services/api";
import "./Returns.css";

const STATUS = {
    awaiting_pickup: { label: "Pickup being arranged", description: "Logistics is arranging a courier to collect the return from the buyer.", tone: "waiting", step: 0 },
    pickup_assigned: { label: "Courier assigned", description: "A courier has been assigned to collect the return parcel.", tone: "moving", step: 1 },
    picked_up: { label: "On the way to the hub", description: "The courier has collected the parcel and is taking it to a logistics hub.", tone: "moving", step: 1 },
    at_hub: { label: "At logistics hub", description: "The return is at a hub while Logistics arranges delivery back to your store.", tone: "moving", step: 2 },
    out_for_delivery: { label: "Returning to your store", description: "A courier is bringing the return parcel to your store.", tone: "moving", step: 2 },
    delivered: { label: "Needs your confirmation", description: "The courier marked the return delivered. Check the parcel before confirming receipt.", tone: "action", step: 3 },
    seller_received: { label: "Received by seller", description: "You confirmed receipt. Customer Service can now complete the approved repayment.", tone: "complete", step: 4 },
};
const FILTERS = [
    { id: "all", label: "All returns" },
    { id: "action", label: "Needs my action" },
    { id: "moving", label: "In progress" },
    { id: "complete", label: "Received" },
];
const STEPS = ["Pickup", "Logistics hub", "Return delivery", "Seller receipt"];
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value) => value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
const buyerName = (buyer) => [buyer?.first_name, buyer?.middle_name, buyer?.last_name].filter(Boolean).join(" ").trim() || "Buyer";

function RefundStatus({ request }) {
    if (!request) return null;
    const status = request.status || "pending";
    const label = status === "refunded" ? "Repayment completed" : status === "approved" ? "Refund approved" : status.replaceAll("_", " ");
    return <span className={`sr-refund-badge sr-refund-badge--${status}`}>{label}</span>;
}

export default function SellerReturns() {
    const [rows, setRows] = useState([]);
    const [filter, setFilter] = useState("all");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) { setLoading(true); setError(""); }
        try {
            const { data } = await api.get("/seller/parcel-returns");
            setRows(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            if (!quiet) setError(err.response?.data?.message || "Return parcels could not be loaded.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initial = window.setTimeout(() => void load(), 0);
        const refresh = window.setInterval(() => void load({ quiet: true }), 30_000);
        return () => { window.clearTimeout(initial); window.clearInterval(refresh); };
    }, [load]);

    const filtered = useMemo(() => rows.filter((row) => {
        if (filter === "all") return true;
        if (filter === "moving") return ["awaiting_pickup", "pickup_assigned", "picked_up", "at_hub", "out_for_delivery"].includes(row.status);
        return (STATUS[row.status]?.tone || "waiting") === filter;
    }), [rows, filter]);

    const counts = useMemo(() => ({
        all: rows.length,
        action: rows.filter((row) => row.status === "delivered").length,
        moving: rows.filter((row) => ["awaiting_pickup", "pickup_assigned", "picked_up", "at_hub", "out_for_delivery"].includes(row.status)).length,
        complete: rows.filter((row) => row.status === "seller_received").length,
    }), [rows]);

    const confirmReceipt = async (row) => {
        setBusy(row.id);
        setError("");
        setNotice("");
        try {
            await api.patch(`/seller/parcel-returns/${row.id}/receive`);
            setConfirming(null);
            setNotice(`Receipt confirmed for order #${row.order_id}.`);
            await load({ quiet: true });
        } catch (err) {
            setError(err.response?.data?.message || "Receipt could not be recorded.");
        } finally {
            setBusy(null);
        }
    };

    return <section className="sl-page sr-page">
        <header className="sl-page-head sr-page-head">
            <div><span className="sl-eyebrow">AFTER-SALES</span><h1 className="sl-h1">Returns</h1><p>Track parcels coming back to your store and confirm receipt when they arrive.</p></div>
            <button className="sr-refresh" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "sr-spinning" : ""} />{loading ? "Refreshing…" : "Refresh"}</button>
        </header>

        <section className="sr-summary" aria-label="Return summary">
            <article><span className="sr-summary-icon"><RotateCcw size={17} /></span><div><small>Total returns</small><strong>{counts.all}</strong></div></article>
            <article className={counts.action ? "is-attention" : ""}><span className="sr-summary-icon"><AlertCircle size={17} /></span><div><small>Needs your confirmation</small><strong>{counts.action}</strong></div></article>
            <article><span className="sr-summary-icon"><Truck size={17} /></span><div><small>In progress</small><strong>{counts.moving}</strong></div></article>
            <article><span className="sr-summary-icon"><CheckCircle2 size={17} /></span><div><small>Received by you</small><strong>{counts.complete}</strong></div></article>
        </section>

        {error && <div className="sr-alert" role="alert"><AlertCircle size={17} /><span>{error}</span><button type="button" onClick={() => void load()}>Try again</button></div>}
        {notice && <div className="sr-notice" role="status"><Check size={17} />{notice}</div>}

        <section className="sr-returns-panel" aria-labelledby="sr-returns-title">
            <div className="sr-panel-heading"><div><span className="sr-panel-eyebrow">RETURN TRACKER</span><h2 id="sr-returns-title">Your return parcels</h2><p>Check each parcel’s latest stage and see what needs your attention.</p></div><span className="sr-results-count">{filtered.length} {filtered.length === 1 ? "return" : "returns"}</span></div>
            <div className="sr-filter-tabs" role="tablist" aria-label="Filter returns">
                {FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}<span>{counts[item.id]}</span></button>)}
            </div>

            {loading ? <div className="sr-empty" role="status"><span className="sr-loader" /><strong>Loading return parcels</strong><p>Please wait while we get the latest updates.</p></div> : filtered.length === 0 ? <div className="sr-empty"><span className="sr-empty-icon"><Package size={22} /></span><strong>{rows.length ? "No returns in this view" : "No return parcels yet"}</strong><p>{rows.length ? "Choose another filter to see more return activity." : "When an approved return is sent back to your store, its progress will appear here."}</p></div> : <div className="sr-return-list">
                {filtered.map((row) => {
                    const stage = STATUS[row.status] || { label: row.status?.replaceAll("_", " ") || "Status unavailable", description: "Check back for the next return update.", tone: "waiting", step: 0 };
                    const items = row.order?.items || [];
                    return <article className="sr-return-card" key={row.id}>
                        <div className="sr-return-topline"><div className="sr-return-identity"><span className="sr-return-icon"><Package size={17} /></span><div><small>RETURN #{row.id}</small><h3>Order #{row.order_id}</h3></div></div><span className={`sr-status sr-status--${stage.tone}`}><i />{stage.label}</span></div>
                        <div className="sr-return-body">
                            <div className="sr-return-main">
                                <p className="sr-stage-description">{stage.description}</p>
                                <div className="sr-progress" aria-label={`Return progress: ${stage.label}`}>
                                    {STEPS.map((label, index) => <div className={`sr-progress-step${index < stage.step ? " is-done" : ""}${index === stage.step ? " is-current" : ""}`} key={label}><span>{index < stage.step ? <Check size={11} /> : index + 1}</span><small>{label}</small></div>)}
                                </div>
                                <div className="sr-return-meta">
                                    <div><small>Buyer</small><strong>{buyerName(row.buyer)}</strong></div>
                                    <div><small>Current location</small><strong><MapPin size={13} />{row.current_hub?.name || (row.status === "delivered" || row.status === "seller_received" ? "Your store" : "With courier")}</strong></div>
                                    <div><small>Last updated</small><strong><Clock3 size={13} />{dateTime(row.updated_at)}</strong></div>
                                </div>
                                {items.length > 0 && <div className="sr-item-list"><small>Items in the order</small><ul>{items.map((item) => <li key={item.id}><span>{item.product?.name || "Product"}</span><b>× {item.quantity}</b></li>)}</ul></div>}
                            </div>
                            <aside className="sr-return-side">
                                <div className="sr-refund-block"><small>Refund request</small><RefundStatus request={row.refund_request} />{row.refund_request?.approved_amount != null && <strong>{money(row.refund_request.approved_amount)}</strong>}</div>
                                {row.picked_up_at && <p><Truck size={13} />Collected {dateTime(row.picked_up_at)}</p>}
                                {row.received_at && <p><CheckCircle2 size={13} />Delivered {dateTime(row.received_at)}</p>}
                                {row.status === "delivered" && <div className="sr-confirm-box">
                                    {confirming === row.id ? <><strong>Has the parcel arrived at your store?</strong><p>Check the parcel before confirming. This lets Customer Service proceed with the approved repayment.</p><div><button type="button" className="sr-confirm-cancel" disabled={busy === row.id} onClick={() => setConfirming(null)}>Not yet</button><button type="button" className="sr-confirm-action" disabled={busy === row.id} onClick={() => void confirmReceipt(row)}>{busy === row.id ? "Saving…" : "Yes, confirm receipt"}</button></div></> : <button type="button" className="sr-receive-button" onClick={() => setConfirming(row.id)}>Confirm parcel received<ArrowRight size={15} /></button>}
                                </div>}
                            </aside>
                        </div>
                    </article>;
                })}
            </div>}
        </section>
    </section>;
}
