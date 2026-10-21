import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

export default function Pickups() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const { data } = await api.get("/courier/pickups"); setRows(data?.data || []); }
        catch (err) { setError(err.response?.data?.message || "Pickup assignments are unavailable."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    return <section className="cw-page"><header className="cw-page-heading"><div><span className="cw-eyebrow">PICKUP WORKSPACE</span><h1>Seller pickups</h1><p>Collect assigned parcels and record their arrival at the sorting center.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
        {loading ? <div className="cw-state" role="status">Loading pickup assignments…</div> : error ? null : rows.length === 0 ? <div className="cw-state"><strong>No active pickup assignments</strong><p>Administrator-assigned seller pickups will appear here.</p></div> : <div className="cw-card-list">{rows.map((row) => <article className="cw-card" key={row.id}><div><span className="cw-order-number">Order #{row.order?.id}</span><h2>{row.status.replaceAll("_", " ")}</h2><p>{row.order?.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</p></div><Link className="cw-primary-link" to={`/courier/pickups/${row.id}`}>Open pickup</Link></article>)}</div>}
    </section>;
}
