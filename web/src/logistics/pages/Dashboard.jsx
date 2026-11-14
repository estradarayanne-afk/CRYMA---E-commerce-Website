import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, PackageCheck, Boxes, Truck, TriangleAlert } from "lucide-react";
import api from "../../shared/services/api";
import "./LogisticsPages.css";
import "./Reports.css";

const NEXT_ACTIONS = [
    { key: "failed_deliveries", label: "Review delivery exceptions", description: "Check failed attempts and decide whether to retry or return the parcel.", icon: TriangleAlert, to: "/logistics/delivery-monitoring" },
    { key: "pickups_awaiting_assignment", label: "Assign seller pickups", description: "Choose an eligible courier and pickup schedule for ready orders.", icon: ClipboardList, to: "/logistics/pickups" },
    { key: "incoming_parcels", label: "Receive incoming parcels", description: "Verify the parcel QR and record its physical receiving hub.", icon: PackageCheck, to: "/logistics/incoming-parcels" },
    { key: "parcels_awaiting_sorting", label: "Sort and route parcels", description: "Scan parcels; mapped addresses choose their delivery area and destination hub.", icon: Boxes, to: "/logistics/sorting" },
    { key: "transfers_awaiting_dispatch", label: "Dispatch hub transfers", description: "Send each parcel to the destination hub selected by its route.", icon: Truck, to: "/logistics/parcel-flow" },
    { key: "transfers_in_transit_awaiting_receipt", label: "Receive hub transfers", description: "Confirm the transfer at its recorded destination using the parcel QR.", icon: PackageCheck, to: "/logistics/incoming-parcels" },
    { key: "parcels_ready_for_dispatch", label: "Assign final-mile delivery", description: "Confirm a suggested eligible courier or choose another area-qualified rider.", icon: Truck, to: "/logistics/delivery-assignment" },
];

export default function Dashboard() {
    const [firstName] = useState(() => { try { return JSON.parse(localStorage.getItem("user") || "null")?.first_name || "there"; } catch { return "there"; } });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async (signal) => {
        setLoading(true); setError("");
        try {
            const response = await api.get("/logistics/dashboard", { signal });
            if (response.data?.success !== true || !response.data?.data) throw new Error("The logistics dashboard returned an invalid response.");
            setData(response.data.data);
        } catch (err) {
            if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
                setData(null);
                setError(err.response?.data?.message || err.message || "The logistics dashboard is unavailable.");
            }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, []);
    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
    const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date()));
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const today = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date());
    return <section className="lw-page" aria-busy={loading}>
        <header className="lw-page-heading"><div><span className="lw-eyebrow">{today}</span><h1>{greeting}, {firstName}</h1><p>Work the next pending step, then review recent parcel activity.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></header>
        {error && <div className="lw-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} disabled={loading}>Retry</button></div>}
        <section className="lo-panel lo-next-action-panel" aria-busy={loading}>
            <div className="lo-panel-heading"><div><h2>Next actions</h2><p>Exceptions appear first, followed by the normal parcel flow. Select a queue to continue.</p></div>{data && <span className="lo-queue-count">{NEXT_ACTIONS.filter(({ key }) => Number(data[key]) > 0).length} queues waiting</span>}</div>
            {!data && loading ? <p className="lw-empty">Loading current queue counts…</p> : !data ? <p className="lw-empty">Queue counts are unavailable. Refresh to try again.</p> : NEXT_ACTIONS.filter(({ key }) => Number(data[key]) > 0).length ? <ol className="lo-next-action-list">
                {NEXT_ACTIONS.filter(({ key }) => Number(data[key]) > 0).map(({ key, label, description, icon: Icon, to }, index) => <li className={`lo-next-action${index === 0 ? " is-next" : ""}`} key={key}>
                    <Link to={to} aria-label={`${label}: ${data[key]}. Open queue`}>
                        <span className="lo-next-action-count">{data[key]}</span>
                        <span className="lo-next-action-copy"><strong>{label}</strong><small>{description}</small></span>
                        <span className="lo-next-action-open"><Icon size={16} aria-hidden="true" /> Open queue <span aria-hidden="true">→</span></span>
                    </Link>
                </li>)}
            </ol> : <p className="lw-empty">No queues need action right now. New parcels will appear here as they move through logistics.</p>}
            {data && <div className="lo-active-summary"><span><Truck size={17} aria-hidden="true" /> Deliveries in progress</span><strong>{data.deliveries_in_progress ?? 0}</strong><Link to="/logistics/delivery-monitoring">Monitor deliveries <span aria-hidden="true">→</span></Link></div>}
        </section>
        {data && <>
            <section className="lo-panel lo-dashboard-panel"><div className="lo-panel-heading"><div><h2>Hub overview</h2><p>Current recorded parcel associations and transfer queues by hub.</p></div><Link to="/logistics/parcel-flow">Manage hubs</Link></div>
                {data.hubs?.length ? <div className="lo-table-wrap lo-dashboard-table-wrap"><table className="lo-table"><thead><tr><th>Hub</th><th>State</th><th>Parcels</th><th>Incoming</th><th>Awaiting dispatch</th><th>In transit</th></tr></thead><tbody>{data.hubs.map((hub) => <tr key={hub.id}><td><strong>{hub.name}</strong><small>{hub.code}</small></td><td><span className={`lo-status-tag ${hub.is_active ? "is-active" : "is-inactive"}`}>{hub.is_active ? "Active" : "Inactive"}</span></td><td>{hub.deliveries_count}</td><td>{hub.incoming_transfers_awaiting_receipt}</td><td>{hub.outgoing_transfers_awaiting_dispatch}</td><td>{hub.outgoing_transfers_in_transit}</td></tr>)}</tbody></table></div> : <p className="lw-empty">No hubs are recorded yet. Add one in Parcel Flow & Hubs.</p>}
            </section>
            <section className="lo-panel lo-dashboard-panel"><div className="lo-panel-heading"><div><h2>Recent transfers</h2><p>Latest recorded hub movements.</p></div><Link to="/logistics/parcel-flow">Open parcel flow</Link></div>{data.transfers?.length ? <div className="lo-table-wrap lo-dashboard-table-wrap"><table className="lo-table"><thead><tr><th>Parcel</th><th>Origin</th><th>Destination</th><th>Status</th><th>Latest activity</th></tr></thead><tbody>{data.transfers.map((transfer) => <tr key={transfer.id}><td><strong>{transfer.parcel_reference}</strong></td><td>{transfer.from_hub || "Unavailable"}</td><td>{transfer.to_hub || "Unavailable"}</td><td><span className="lo-status-tag">{String(transfer.status || "Unknown").replaceAll("_", " ")}</span></td><td>{transfer.latest_activity_at ? new Date(transfer.latest_activity_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "Not recorded"}</td></tr>)}</tbody></table></div> : <p className="lw-empty">No hub transfers are recorded yet.</p>}</section>
            <section className="lo-panel lo-dashboard-panel"><div className="lo-panel-heading"><div><h2>Recent parcel events</h2><p>Recorded custody and handling updates.</p></div><Link to="/logistics/reports">View reports</Link></div>{data.recent_events?.data?.length ? <div className="lo-table-wrap lo-dashboard-table-wrap"><table className="lo-table"><thead><tr><th>Event</th><th>Parcel</th><th>Recorded hub</th><th>Actor</th><th>Recorded at</th></tr></thead><tbody>{data.recent_events.data.map((event) => <tr key={event.id}><td><span className="lo-event-type">{String(event.event_type || "Unknown").replaceAll("_", " ")}</span></td><td>{event.parcel_reference || "Unavailable"}</td><td>{event.hub || "Not recorded"}</td><td>{event.actor_recorded ? event.actor : "No actor recorded"}</td><td>{event.created_at ? new Date(event.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }) : "Timestamp unavailable"}</td></tr>)}</tbody></table><p className="lo-pagination">Page {data.recent_events.current_page} of {data.recent_events.last_page}; {data.recent_events.total} recorded events.</p></div> : <p className="lw-empty">No parcel events are recorded yet.</p>}</section>
        </>}
        <p className="lw-footnote">Pickup counts use ready-for-pickup orders without a pickup assignment. Transfer receipt is counted only after the stored lifecycle status is arrived. Historical return-transfer departure actors are not retained by the current data model.</p>
    </section>;
}
