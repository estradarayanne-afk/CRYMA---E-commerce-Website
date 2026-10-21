import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

function Deliveries() {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const { data } = await api.get("/courier/deliveries"); setDeliveries(data?.data || []); }
        catch (err) { setError(err.response?.data?.message || "Assigned deliveries are unavailable."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    return <section className="cw-page">
        <header className="cw-page-heading"><div><span className="cw-eyebrow">COURIER WORKSPACE</span><h1>Assigned deliveries</h1><p>Orders assigned to your courier account.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error} <button type="button" onClick={() => void load()}>Try again</button></div>}
        {loading ? <div className="cw-state" role="status">Loading assigned deliveries…</div> : error ? null : deliveries.length === 0 ? <div className="cw-state"><strong>No assigned deliveries</strong><p>New assignments will appear here.</p></div> : <div className="cw-card-list">{deliveries.map((delivery) => <article className="cw-card" key={delivery.id}><div><span className="cw-order-number">Order #{delivery.order?.id}</span><h2>{delivery.status.replaceAll("_", " ")}</h2><p>{delivery.order?.delivery_address || "Delivery address unavailable"}</p><span className="cw-subtle">{delivery.order?.items?.length || 0} order line(s)</span></div><Link className="cw-primary-link" to={`/courier/deliveries/${delivery.id}`}>Open delivery</Link></article>)}</div>}
    </section>;
}
export default Deliveries;
