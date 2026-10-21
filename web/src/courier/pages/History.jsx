import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import PrivateDeliveryProof from "../../shared/components/PrivateDeliveryProof";
import "../layouts/CourierPages.css";

const formatTimestamp = (value) => value ? new Date(value).toLocaleString("en-PH") : "Timestamp unavailable";

export default function History() {
    const [deliveries, setDeliveries] = useState([]);
    const [pickups, setPickups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const [deliveryResponse, pickupResponse] = await Promise.all([api.get("/courier/delivery-history"), api.get("/courier/pickup-history")]);
            setDeliveries(deliveryResponse.data?.data || []);
            setPickups(pickupResponse.data?.data || []);
        } catch (err) { setError(err.response?.data?.message || "Courier history is unavailable."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    return <section className="cw-page"><header className="cw-page-heading"><div><span className="cw-eyebrow">COMPLETED ASSIGNMENTS</span><h1>Courier history</h1><p>Completed seller pickups and delivery assignments associated with your account.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
        {loading ? <div className="cw-state" role="status">Loading history…</div> : error ? null : deliveries.length + pickups.length === 0 ? <div className="cw-state"><strong>No courier history yet</strong><p>Completed pickup and delivery assignments will appear here.</p></div> : <>
            <h2>Seller pickups</h2>{pickups.length === 0 ? <div className="cw-state cw-muted">No completed pickup assignments.</div> : <div className="cw-card-list">{pickups.map((row) => <article className="cw-card" key={`pickup-${row.id}`}><div><span className="cw-order-number">Order #{row.order?.id}</span><h2>{row.status.replaceAll("_", " ")}</h2><p>{row.order?.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</p><span className="cw-subtle">Assigned: {formatTimestamp(row.assigned_at)}</span><span className="cw-subtle">Collected: {formatTimestamp(row.picked_up_at)}</span><span className="cw-subtle">Received at sorting center: {formatTimestamp(row.received_at)}</span></div><Link className="cw-primary-link" to={`/courier/pickups/${row.id}`}>View pickup history</Link></article>)}</div>}
            <h2>Buyer deliveries</h2>{deliveries.length === 0 ? <div className="cw-state cw-muted">No completed delivery assignments.</div> : <div className="cw-card-list">{deliveries.map((row) => <article className="cw-card" key={`delivery-${row.id}`}><div><span className="cw-order-number">Order #{row.order?.id}</span><h2>{row.status.replaceAll("_", " ")}</h2><p>{row.order?.delivery_address || "Delivery address unavailable"}</p><span className="cw-subtle">Assigned: {formatTimestamp(row.assigned_at)}</span><span className="cw-subtle">Courier collected for delivery: {formatTimestamp(row.delivery_picked_up_at)}</span><span className="cw-subtle">Delivered: {formatTimestamp(row.delivered_at)}</span>{row.failure_reason && <p className="cw-failure-reason">Failure reason: {row.failure_reason}. Contact Logistics for an authorized retry or return decision.</p>}<PrivateDeliveryProof proof={row.proof} basePath={`/courier/deliveries/${row.id}/proof`} /></div><Link className="cw-primary-link" to={`/courier/deliveries/${row.id}`}>View delivery history</Link></article>)}</div>}
        </>}
    </section>;
}
