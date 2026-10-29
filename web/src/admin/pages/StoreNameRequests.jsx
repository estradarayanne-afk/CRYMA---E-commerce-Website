import { useCallback, useEffect, useState } from "react";
import api from "../../shared/services/api";
import "./StoreNameRequests.css";

export default function StoreNameRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [reasons, setReasons] = useState({});

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/store-name-requests");
            setRequests(response.data?.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load store name requests.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const review = async (row, decision) => {
        setSavingId(row.id);
        setError("");
        setMessage("");
        try {
            const response = await api.patch(`/admin/store-name-requests/${row.id}`, {
                decision,
                reason: decision === "reject" ? reasons[row.id] || "" : "",
            });
            setMessage(response.data?.message || "Request reviewed.");
            setRequests((current) => current.filter((item) => item.id !== row.id));
        } catch (requestError) {
            const validation = requestError.response?.data?.errors?.requested_business_name?.[0];
            setError(validation || requestError.response?.data?.message || "Unable to review this request.");
        } finally {
            setSavingId(null);
        }
    };

    return <section className="snr-page">
        <header className="snr-heading"><div><span>SELLER STOREFRONTS</span><h1>Store name requests</h1><p>Review requested storefront name changes. Names already used by another seller cannot be approved.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="snr-notice is-error" role="alert">{error}</div>}
        {message && <div className="snr-notice is-success" role="status">{message}</div>}
        {loading ? <p className="snr-empty" role="status">Loading requests…</p> : requests.length === 0 ? <p className="snr-empty">There are no store name requests waiting for review.</p> : <div className="snr-list">
            {requests.map((row) => <article className="snr-card" key={row.id}>
                <div className="snr-seller"><strong>{[row.user?.first_name, row.user?.last_name].filter(Boolean).join(" ") || "Seller"}</strong><span>{row.user?.email || "Email unavailable"}</span><small>Submitted {row.business_name_requested_at ? new Date(row.business_name_requested_at).toLocaleString("en-PH") : "date unavailable"}</small></div>
                <div className="snr-names"><div><span>Current name</span><strong>{row.business_name}</strong></div><div><span>Requested name</span><strong>{row.requested_business_name}</strong></div></div>
                <label className="snr-reason">Rejection reason <span>Optional</span><textarea value={reasons[row.id] || ""} maxLength={1000} rows={2} onChange={(event) => setReasons((current) => ({ ...current, [row.id]: event.target.value }))} /></label>
                <div className="snr-actions"><button type="button" className="snr-reject" disabled={savingId === row.id} onClick={() => void review(row, "reject")}>Reject</button><button type="button" className="snr-approve" disabled={savingId === row.id} onClick={() => void review(row, "approve")}>{savingId === row.id ? "Saving…" : "Approve name"}</button></div>
            </article>)}
        </div>}
    </section>;
}