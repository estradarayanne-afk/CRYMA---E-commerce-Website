import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Package, PackageCheck, Truck } from "lucide-react";
import { getHubStaffActivity, getHubStaffIncomingTransfers, getHubStaffParcels } from "../api";
import { useHubStaffWorkspace } from "../HubStaffWorkspaceContext";
import { useHubStaffPage } from "../useHubStaffPage";
import { formatDate, hubStaffEventLabel } from "../utils/hubStaffWorkspace";
import { PageHeading, StatePanel } from "../components/HubStaffUI";

export default function Overview() {
    const { hub } = useHubStaffWorkspace();
    const loader = useCallback(async (hubId) => {
        const [parcels, transfers, activity] = await Promise.all([
            getHubStaffParcels({ page: 1, per_page: 1 }, hubId),
            getHubStaffIncomingTransfers({ page: 1, per_page: 1 }, hubId),
            getHubStaffActivity({ page: 1, per_page: 5 }, hubId),
        ]);
        return { parcels, transfers, activity };
    }, []);
    const page = useHubStaffPage(loader, "overview");
    const counts = page.data?.parcels.counts;
    const metrics = useMemo(() => [
        { label: "Parcels at this hub", value: counts?.parcels_at_hub, icon: Package },
        { label: "Awaiting sorting", value: counts?.awaiting_sorting, icon: PackageCheck },
        { label: "Sorted parcels", value: counts?.sorted, icon: PackageCheck },
        { label: "Incoming transfers", value: counts?.incoming_transfers, icon: Truck },
    ], [counts]);

    return <>
        <PageHeading eyebrow="Hub operations" title="Overview" description="A focused view of parcels and activity assigned to your hub." />
        <section className="hs-hub-welcome"><div><span className="hs-welcome-kicker">YOUR ASSIGNED HUB</span><h2>{hub.name}</h2><p>{hub.code} <span>·</span> Active assignment</p></div><div className="hs-welcome-icon"><Package size={25}/></div></section>
        {page.error && <div className="hs-inline-error" role="alert"><strong>Overview could not be loaded.</strong><p>{page.errorMessage}</p><button className="hs-button hs-button--secondary" type="button" onClick={page.retry}>Retry</button></div>}
        {page.loading && !page.data ? <StatePanel kind="loading" title="Loading hub overview" busy><p>Retrieving the latest hub-scoped counts and activity.</p></StatePanel> : page.data && <div className="hs-content-stack">
            <section className="hs-metric-grid" aria-label="Hub parcel counts">{metrics.map(({ label, value, icon: Icon }) => <article className="hs-metric" key={label}><span><Icon size={16} aria-hidden="true"/> {label}</span><strong>{Number.isFinite(Number(value)) ? Number(value).toLocaleString() : "—"}</strong></article>)}</section>
            <section className="hs-section-card"><div className="hs-section-head"><h2><Activity size={17}/> Recent hub activity</h2><Link to="/hub-staff/activity">View history <ArrowRight size={15}/></Link></div>
                {page.data.activity.rows.length ? <div className="hs-event-list">{page.data.activity.rows.map((event) => <div className="hs-event" key={event.id}><div><p>{hubStaffEventLabel(event.event_type)}</p><small>{event.parcel_code ? `Parcel ${event.parcel_code}` : "Parcel reference unavailable"} · {event.actor || "Actor not recorded"}</small></div><small>{formatDate(event.created_at)}</small></div>)}</div> : <p className="hs-muted">No hub activity has been recorded yet.</p>}
            </section>
            <div className="hs-quick-links"><Link to="/hub-staff/parcels"><Package size={18}/><span><strong>Parcels</strong><small>Scan and sort parcels held here</small></span><ArrowRight size={16}/></Link><Link to="/hub-staff/pickup-receiving"><PackageCheck size={18}/><span><strong>Pickup receiving</strong><small>Verify and receive incoming pickups</small></span><ArrowRight size={16}/></Link><Link to="/hub-staff/incoming-transfers"><Truck size={18}/><span><strong>Incoming transfers</strong><small>Receive forward transfers addressed here</small></span><ArrowRight size={16}/></Link><Link to="/hub-staff/outgoing-transfers"><Truck size={18}/><span><strong>Outgoing handoffs</strong><small>Record physical release to the assigned Rider</small></span><ArrowRight size={16}/></Link><Link to="/hub-staff/activity"><Activity size={18}/><span><strong>Activity history</strong><small>Review recorded hub events</small></span><ArrowRight size={16}/></Link></div>
        </div>}
    </>;
}
