import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/services/api";
import CourierConfirmModal from "../components/CourierConfirmModal";
import "../layouts/CourierPages.css";

const addressText = (address) => [address?.house_number, address?.street, address?.building_name, address?.unit_number, address?.barangay, address?.municipality, address?.province, address?.region, address?.postal_code].filter(Boolean).join(", ");
const formatTimestamp = (value) => value ? new Date(value).toLocaleString("en-PH") : "Timestamp unavailable";

export default function PickupDetails() {
    const { id } = useParams();
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pendingStatus, setPendingStatus] = useState(null);
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const { data } = await api.get(`/courier/pickups/${id}`); setAssignment(data?.data || null); }
        catch (err) { setError(err.response?.data?.message || "Pickup details are unavailable."); }
        finally { setLoading(false); }
    }, [id]);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const update = async (status) => {
        setSaving(true); setError(""); setNotice("");
        try {
            const { data } = await api.patch(`/courier/pickups/${id}/status`, { status, expected_status: assignment.status });
            setAssignment(data?.data || assignment); setNotice(data?.message || "Pickup update recorded.");
        } catch (err) { setError(err.response?.data?.message || "Unable to record the pickup update."); }
        finally { setSaving(false); }
    };

    if (loading) return <section className="cw-state" role="status">Loading pickup…</section>;
    if (error && !assignment) return <section className="cw-state cw-error" role="alert"><h1>Pickup unavailable</h1><p>{error}</p><Link to="/courier/pickups">Back to pickups</Link></section>;
    if (!assignment) return null;
    const order = assignment.order;
    const seller = order?.items?.[0]?.seller;
    const sellerAddresses = seller?.addresses || [];
    const pickupAddress = sellerAddresses.length === 1 ? sellerAddresses[0] : null;
    const next = assignment.status === "ASSIGNED_TO_PICKUP_RIDER" ? "ACCEPTED_BY_PICKUP_RIDER" : assignment.status === "ACCEPTED_BY_PICKUP_RIDER" ? "PICKED_UP" : assignment.status === "PICKED_UP" ? "AT_SORTING_CENTER" : null;

    const actionLabel = next === "ACCEPTED_BY_PICKUP_RIDER" ? "Accept pickup assignment" : next === "PICKED_UP" ? "Confirm parcel collected" : "Confirm sorting-center receipt";
    return <section className="cw-page"><Link className="cw-back-link" to="/courier/pickups">← Seller pickups</Link>
        <header className="cw-page-heading"><div><span className="cw-eyebrow">ORDER #{order?.id}</span><h1>Pickup details</h1><p>Current stage: <strong>{assignment.status.replaceAll("_", " ")}</strong></p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error}</div>}{notice && <div className="cw-notice" role="status">{notice}</div>}
        <div className="cw-detail-grid"><article className="cw-panel"><h2>Seller pickup address</h2><p className="cw-address">{addressText(pickupAddress) || (sellerAddresses.length > 1 ? "More than one seller address is saved, and no pickup address is designated." : "Seller address is not available in the account record.")}</p><h2>Parcel items</h2><ul className="cw-items">{(order?.items || []).map((item) => <li key={item.id}><span>{item.product?.name || "Product"}</span><strong>× {item.quantity}</strong></li>)}</ul></article>
            <aside className="cw-panel"><h2>Pickup progress</h2><p>Accept the assignment, confirm collection from the seller, then record receipt at the sorting center.</p><div className="cw-task-timestamps"><span>Assigned: {formatTimestamp(assignment.assigned_at)}</span><span>Collected: {formatTimestamp(assignment.picked_up_at)}</span><span>Received at sorting center: {formatTimestamp(assignment.received_at)}</span></div>{next ? <button className="cw-primary" type="button" disabled={saving} onClick={() => setPendingStatus(next)}>{saving ? "Saving…" : next === "ACCEPTED_BY_PICKUP_RIDER" ? "Accept pickup assignment" : next === "PICKED_UP" ? "Confirm parcel collected" : "Confirm sorting-center receipt"}</button> : <p className="cw-muted">This pickup is complete. Delivery routing is managed by the logistics workspace.</p>}</aside>
        </div>
        <article className="cw-panel cw-history"><h2>Parcel event history</h2>{assignment.events?.length ? assignment.events.map((event) => <div className="cw-event" key={event.id}><span>{event.new_status.replaceAll("_", " ")}</span><time>{event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : "Recorded"}</time></div>) : <p>No parcel events are recorded yet.</p>}</article>
        {pendingStatus && <CourierConfirmModal title={`${actionLabel}?`} message="This will update the pickup stage shown in your courier task history." confirmLabel={actionLabel} loading={saving} onCancel={() => setPendingStatus(null)} onConfirm={() => { const status = pendingStatus; setPendingStatus(null); void update(status); }} />}
    </section>;
}
