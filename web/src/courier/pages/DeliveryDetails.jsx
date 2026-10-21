import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

function DeliveryDetails() {
    const { id } = useParams();
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reason, setReason] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const { data } = await api.get(`/courier/deliveries/${id}`); setDelivery(data?.data || null); }
        catch (err) { setError(err.response?.data?.message || "Delivery details are unavailable."); }
        finally { setLoading(false); }
    }, [id]);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const updateStatus = async (status) => {
        setSaving(true); setError(""); setNotice("");
        try {
            const { data } = await api.patch(`/courier/deliveries/${id}/status`, { status, expected_status: delivery.status, ...(status === "DELIVERY_FAILED" ? { reason } : {}) });
            setDelivery(data?.data || delivery); setNotice(data?.message || "Delivery updated."); setReason("");
        } catch (err) { setError(err.response?.data?.message || "Unable to update delivery status."); }
        finally { setSaving(false); }
    };

    if (loading) return <section className="cw-state" role="status">Loading delivery…</section>;
    if (error && !delivery) return <section className="cw-state cw-error" role="alert"><h1>Delivery unavailable</h1><p>{error}</p><Link to="/courier/deliveries">Back to deliveries</Link></section>;
    if (!delivery) return null;

    const nextAction = { ASSIGNED_TO_RIDER: ["OUT_FOR_DELIVERY"], OUT_FOR_DELIVERY: ["DELIVERED"] }[delivery.status] || [];
    const canFail = delivery.status === "OUT_FOR_DELIVERY";
    const items = delivery.order?.items || [];

    return <section className="cw-page">
        <Link className="cw-back-link" to="/courier/deliveries">← Assigned deliveries</Link>
        <header className="cw-page-heading"><div><span className="cw-eyebrow">ORDER #{delivery.order?.id}</span><h1>Delivery details</h1><p>Current status: <strong>{delivery.status.replaceAll("_", " ")}</strong>{delivery.deliveryArea?.name && <> · Area: <strong>{delivery.deliveryArea.name}</strong></>}</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error}</div>}{notice && <div className="cw-notice" role="status">{notice}</div>}
        <div className="cw-detail-grid"><article className="cw-panel"><h2>Delivery address</h2><p className="cw-address">{delivery.order?.delivery_address || "Delivery address unavailable"}</p><h2>Items</h2><ul className="cw-items">{items.map((item) => <li key={item.id}><span>{item.product?.name || "Product"}</span><strong>× {item.quantity}</strong></li>)}</ul></article>
            <aside className="cw-panel"><h2>Update status</h2><p>Record only the delivery action you have completed.</p>{canFail && <label className="cw-reason-label">If delivery cannot be completed, enter a reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} /></label>}
                <div className="cw-actions">{nextAction.map((status) => <button className="cw-primary" key={status} type="button" disabled={saving} onClick={() => void updateStatus(status)}>{saving ? "Saving…" : status.replaceAll("_", " ")}</button>)}{canFail && <button className="cw-danger" type="button" disabled={saving || !reason.trim()} onClick={() => void updateStatus("DELIVERY_FAILED")}>{saving ? "Saving…" : "Report failed delivery"}</button>}</div>
            </aside>
        </div>
        <article className="cw-panel cw-history"><h2>Delivery history</h2>{delivery.events?.length ? delivery.events.map((event) => <div className="cw-event" key={event.id}><span>{event.new_status.replaceAll("_", " ")}</span><time>{event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : "Recorded"}</time>{event.reason && <p>{event.reason}</p>}</div>) : <p>No delivery events are recorded yet.</p>}</article>
    </section>;
}
export default DeliveryDetails;
