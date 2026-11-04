import { useCallback, useMemo, useState } from "react";
import { getHubStaffActivity } from "../api";
import { useHubStaffPage } from "../useHubStaffPage";
import { formatDate, hubStaffEventLabel, hubStaffEventTone } from "../utils/hubStaffWorkspace";
import { PageHeading, Pagination, RecordTable, StatePanel, StatusBadge } from "../components/HubStaffUI";

const EVENT_OPTIONS = ["transfer_hub_released", "rider_transfer_collected", "hub_transfer_departed", "hub_transfer_arrived", "sorting_center_received", "legacy_sorting_receipt_verified", "parcel_scanned", "sorted"];

export default function Activity() {
    const [eventType, setEventType] = useState("");
    const [filter, setFilter] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const key = `${filter}:${pageNumber}`;
    const loader = useCallback((hubId) => getHubStaffActivity({ event_type: filter, page: pageNumber, per_page: 20 }, hubId), [filter, pageNumber]);
    const result = useHubStaffPage(loader, key);
    const columns = useMemo(() => [
        { key: "event", label: "Activity", render: (row) => <span className={`hs-event-type hs-event-type--${hubStaffEventTone(row.event_type)}`}>{hubStaffEventLabel(row.event_type)}</span> },
        { key: "parcel_code", label: "Parcel", render: (row) => row.parcel_code ? <span className="hs-reference">{row.parcel_code}</span> : "Reference unavailable" },
        { key: "actor", label: "Actor", render: (row) => row.actor || "Not recorded" },
        { key: "state", label: "Status change", render: (row) => row.new_status ? <span><StatusBadge status={row.previous_status}/> <span aria-hidden="true">→</span> <StatusBadge status={row.new_status}/></span> : "—" },
        { key: "created_at", label: "Recorded", render: (row) => formatDate(row.created_at) },
    ], []);
    const submit = (event) => { event.preventDefault(); setPageNumber(1); setFilter(eventType); };
    return <>
        <PageHeading title="Activity history" description="Recorded events for parcels and transfers at your assigned hub. Historical hub context is not inferred when the API does not provide it." />
        <form className="hs-filter-bar" onSubmit={submit}><label className="hs-field">Event type<select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">All event types</option>{EVENT_OPTIONS.map((type) => <option value={type} key={type}>{hubStaffEventLabel(type)}</option>)}</select></label><button className="hs-button hs-button--primary" type="submit">Apply filter</button></form>
        {result.error && <div className="hs-inline-error" role="alert"><strong>Activity history could not be loaded.</strong><p>{result.errorMessage}</p><button className="hs-button hs-button--secondary" type="button" onClick={result.retry}>Retry</button></div>}
        {result.loading && !result.data ? <StatePanel kind="loading" title="Loading activity" busy><p>Retrieving recorded events for this hub.</p></StatePanel> : result.data && (result.data.rows.length ? <><RecordTable columns={columns} rows={result.data.rows} rowKey={(row) => row.id}/><Pagination pagination={result.data.pagination} busy={result.loading} onPageChange={setPageNumber}/></> : <StatePanel title="No activity found"><p>No recorded hub events match this filter.</p></StatePanel>)}
    </>;
}
