import { Activity } from "lucide-react";
import { formatDate, hubStaffEventLabel } from "../utils/hubStaffWorkspace";

export default function HubStaffActivityPreview({ events, loading, error }) {
    return <section className="hs-section-card hs-action-activity"><div className="hs-section-head"><h2><Activity size={17}/> Latest hub activity</h2>{loading && <span role="status">Refreshing...</span>}</div>{error && <p className="hs-operation-history-note" role="status">{error} Open Activity History to reload.</p>}{!loading && !error && events.length === 0 && <p className="hs-operation-history-note">No activity has been loaded on this screen yet. Activity History will load the latest events when opened.</p>}{events.map((event) => <div className="hs-event" key={event.id}><div><p>{hubStaffEventLabel(event.event_type)}</p><small>{event.parcel_code || "Parcel reference unavailable"} · {event.actor || "Actor not recorded"}</small></div><small>{formatDate(event.created_at)}</small></div>)}</section>;
}
