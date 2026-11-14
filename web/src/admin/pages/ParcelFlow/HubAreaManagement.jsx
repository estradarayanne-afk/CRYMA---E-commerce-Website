import { useState } from "react";
import { MapPinned, Pencil, Plus, UsersRound, Warehouse } from "lucide-react";
import AdminSearchField from "../../components/AdminSearchField";
import api from "../../../shared/services/api";
import ConfirmationModal from "../../../logistics/components/ConfirmationModal";
import "../../../logistics/pages/ParcelOperations.css";
import "./HubAreaManagement.css";

const displayName = (profile) => [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ") || `Rider #${profile?.id}`;
const newHubForm = () => ({ name: "", code: "", address: "", latitude: "", longitude: "", proximity_radius_km: "2" });
const hubPayload = (hub) => ({
    ...hub,
    latitude: hub.latitude === "" || hub.latitude == null ? null : Number(hub.latitude),
    longitude: hub.longitude === "" || hub.longitude == null ? null : Number(hub.longitude),
    proximity_radius_km: Number(hub.proximity_radius_km || 2),
});

function HubCoordinates({ value, onChange, onUseCurrentLocation, locationError }) {
    return (
        <div className="lo-hub-geofence-fields">
            <label>Hub latitude<input type="number" step="any" min="-90" max="90" value={value.latitude ?? ""} onChange={(event) => onChange("latitude", event.target.value)} placeholder="Required for proximity detection" /></label>
            <label>Hub longitude<input type="number" step="any" min="-180" max="180" value={value.longitude ?? ""} onChange={(event) => onChange("longitude", event.target.value)} placeholder="Required for proximity detection" /></label>
            <label>Nearby radius (km)<input type="number" step="0.1" min="0.1" max="100" required value={value.proximity_radius_km ?? 2} onChange={(event) => onChange("proximity_radius_km", event.target.value)} /></label>
            <button type="button" onClick={onUseCurrentLocation}>Use this device's location</button>
            <small>Capture only while physically at the hub, or enter its verified coordinates.</small>
            {locationError && <p role="alert">{locationError}</p>}
        </div>
    );
}

export default function HubAreaManagement({ base, data, busy, run }) {
    const [hubForm, setHubForm] = useState(newHubForm);
    const [hubDrafts, setHubDrafts] = useState({});
    const [locationError, setLocationError] = useState("");
    const [areaNames, setAreaNames] = useState({});
    const [areaHubs, setAreaHubs] = useState({});
    const [riderChoices, setRiderChoices] = useState({});
    const [areaForm, setAreaForm] = useState({ name: "", hub_id: "" });
    const [pendingAction, setPendingAction] = useState(null);
    const [hubSearch, setHubSearch] = useState("");
    const [areaSearch, setAreaSearch] = useState("");
    const [hubLimit, setHubLimit] = useState(30);
    const [areaLimit, setAreaLimit] = useState(30);
    const [directoryView, setDirectoryView] = useState("hubs");

    const activeHubs = data.hubs.filter((hub) => hub.is_active);
    const hubsMissingAddress = data.hubs.filter((hub) => !hub.address?.trim()).length;
    const mappedAreas = data.areas.filter((area) => area.is_active && area.hub_id).length;
    const filteredHubs = data.hubs.filter((hub) => `${hub.name} ${hub.code} ${hub.location_label || ""}`.toLowerCase().includes(hubSearch.trim().toLowerCase()));
    const filteredAreas = data.areas.filter((area) => `${area.name} ${area.location_label || ""} ${area.hub?.name || ""}`.toLowerCase().includes(areaSearch.trim().toLowerCase()));
    const visibleHubs = filteredHubs.slice(0, hubLimit);
    const visibleAreas = filteredAreas.slice(0, areaLimit);
    const areasByHub = (hubId) => data.areas.filter((area) => Number(area.hub_id) === Number(hubId));
    const transfersByHub = (hubId) => data.transfers.filter((transfer) => Number(transfer.from_hub_id) === Number(hubId) || Number(transfer.to_hub_id) === Number(hubId));
    const captureHubLocation = (onCoordinates) => {
        setLocationError("");
        if (!navigator.geolocation) {
            setLocationError("This browser does not support location capture. Enter the coordinates manually.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => onCoordinates({ latitude: coords.latitude.toFixed(7), longitude: coords.longitude.toFixed(7) }),
            (error) => setLocationError(error.message || "Unable to read this device's location."),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    };
    const createHub = async (event) => {
        event.preventDefault();
        if (busy) return;
        const ok = await run(() => api.post(`${base}/hubs`, hubPayload(hubForm)), "Hub created.");
        if (ok) setHubForm(newHubForm());
    };

    const createArea = async (event) => {
        event.preventDefault();
        if (busy || !areaForm.hub_id) return;
        const ok = await run(() => api.post(`${base}/delivery-areas`, areaForm), "Delivery area created and mapped.");
        if (ok) setAreaForm({ name: "", hub_id: "" });
    };

    const confirmStatusChange = async () => {
        if (!pendingAction || busy) return;
        const action = pendingAction;
        const ok = await action.confirm();
        if (ok) setPendingAction(null);
    };

    const saveHub = (hub) => {
        const draft = hubDrafts[hub.id] || hub;
        return run(() => api.patch(`${base}/hubs/${hub.id}`, {
            name: draft.name,
            code: draft.code,
            address: draft.address,
            latitude: draft.latitude === "" || draft.latitude == null ? null : Number(draft.latitude),
            longitude: draft.longitude === "" || draft.longitude == null ? null : Number(draft.longitude),
            proximity_radius_km: Number(draft.proximity_radius_km || 2),
        }), `Hub ${hub.name} updated.`);
    };

    const toggleHub = (hub) => setPendingAction({
        title: `${hub.is_active ? "Deactivate" : "Activate"} ${hub.name}?`,
        description: hub.is_active
            ? "The hub will no longer be available for new area mappings, return receipts, or transfer destinations. Existing transfers remain available for completion."
            : "The hub will become available for new delivery-area mappings and transfer destinations.",
        confirmLabel: hub.is_active ? "Deactivate hub" : "Activate hub",
        destructive: hub.is_active,
        confirm: () => run(() => api.patch(`${base}/hubs/${hub.id}`, { is_active: !hub.is_active }), `Hub ${hub.name} ${hub.is_active ? "deactivated" : "activated"}.`),
    });

    const toggleArea = (area) => setPendingAction({
        title: `${area.is_active ? "Deactivate" : "Activate"} ${area.name}?`,
        description: area.is_active
            ? "Riders cannot receive new assignments for an inactive area. Existing delivery history and rider records remain intact."
            : "The area will become available for new sorting and rider assignments.",
        confirmLabel: area.is_active ? "Deactivate area" : "Activate area",
        destructive: area.is_active,
        confirm: () => run(() => api.patch(`${base}/delivery-areas/${area.id}`, { is_active: !area.is_active }), `Area ${area.name} ${area.is_active ? "deactivated" : "activated"}.`),
    });

    const assignRider = (area) => {
        const profileId = riderChoices[area.id];
        if (!profileId) return;
        void run(() => api.post(`${base}/delivery-areas/${area.id}/couriers`, { courier_profile_id: Number(profileId) }), `Rider assigned to ${area.name}.`);
    };

    const removeRider = (area, rider) => void run(
        () => api.delete(`${base}/delivery-areas/${area.id}/couriers/${rider.id}`),
        `${displayName(rider)} removed from ${area.name}.`,
    );

    const saveAreaName = (area) => {
        const name = areaNames[area.id] ?? area.name;
        if (name === area.name) return;
        void run(() => api.patch(`${base}/delivery-areas/${area.id}`, { name }), `Area ${area.name} renamed.`);
    };

    const mapArea = (area) => {
        const hubId = areaHubs[area.id];
        if (!hubId) return;
        const nextHub = activeHubs.find((hub) => Number(hub.id) === Number(hubId));
        setPendingAction({
            title: `Change hub for ${area.name}?`,
            description: `New parcels for this area will route through ${nextHub?.name || "the selected hub"}. Existing parcel history is unchanged.`,
            confirmLabel: "Update hub mapping",
            confirm: () => run(() => api.patch(`${base}/delivery-areas/${area.id}/hub`, { hub_id: Number(hubId) }), `Hub mapping updated for ${area.name}.`),
        });
    };

    return (
        <div className="lo-page lo-hub-management">
            <section className="lo-report-grid lo-hub-summary" aria-label="Hub network readiness">
                <article><span><Warehouse size={17} /> Enabled LGU nodes</span><strong>{activeHubs.length.toLocaleString()}</strong><small>{data.hubs.length.toLocaleString()} nodes total · all cities and municipalities</small></article>
                <article><span><MapPinned size={17} /> Areas mapped</span><strong>{mappedAreas.toLocaleString()}</strong><small>Active delivery areas assigned to a hub</small></article>
                <article><span><MapPinned size={17} /> Site addresses needed</span><strong>{hubsMissingAddress.toLocaleString()}</strong><small>Address must be recorded before a node represents a physical facility</small></article>
                <article><span><MapPinned size={17} /> GPS pins recorded</span><strong>{data.hubs.filter((hub) => hub.latitude != null && hub.longitude != null).length.toLocaleString()}</strong><small>Set coordinates at the physical hub for nearby-rider detection</small></article>
                <article><span><UsersRound size={17} /> Eligible riders</span><strong>{data.couriers.length.toLocaleString()}</strong><small>Assign riders to areas after confirming coverage</small></article>
            </section>
            <aside className="lo-network-warning">
                <strong>Important: LGU node does not mean a physical hub exists.</strong>
                <span>All {activeHubs.length.toLocaleString()} PSGC locations are enabled in the network. Record verified facility addresses and GPS pins at physical hubs; nearby detection uses a 2 km default radius that can be adjusted per hub.</span>
            </aside>

            <div className="lo-directory-tabs" role="group" aria-label="Network setup views">
                <button type="button" className={directoryView === "hubs" ? "is-current" : ""} aria-pressed={directoryView === "hubs"} onClick={() => setDirectoryView("hubs")}>
                    <Warehouse size={16} /> Hub directory <span>{data.hubs.length.toLocaleString()}</span>
                </button>
                <button type="button" className={directoryView === "areas" ? "is-current" : ""} aria-pressed={directoryView === "areas"} onClick={() => setDirectoryView("areas")}>
                    <MapPinned size={16} /> Delivery areas <span>{data.areas.length.toLocaleString()}</span>
                </button>
            </div>

            {directoryView === "hubs" && <section className="lo-panel">
                <div className="lo-hub-section-heading"><div><h2>Hub network</h2><p>PSGC city and municipality nodes are preloaded and active. Confirm each physical address and rider coverage before dispatching real parcels. Hubs are deactivated instead of deleted so parcel and transfer history stays auditable.</p></div><span>{data.hubs.length} hubs</span></div>
                <details className="lo-directory-create">
                    <summary><Plus size={16} /> Add a custom hub</summary>
                    <form className="lo-hub-form" onSubmit={createHub}>
                        <label>Hub name<input required maxLength={100} value={hubForm.name} onChange={(event) => setHubForm((current) => ({ ...current, name: event.target.value }))} placeholder="For example, North Regional Hub" /></label>
                        <label>Hub code<input required maxLength={24} pattern="[A-Za-z0-9_-]+" value={hubForm.code} onChange={(event) => setHubForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="NORTH-REGIONAL" /></label>
                        <label>Physical address<input maxLength={1000} value={hubForm.address} onChange={(event) => setHubForm((current) => ({ ...current, address: event.target.value }))} placeholder="Street, building, city, and province" /></label>
                        <HubCoordinates
                            value={hubForm}
                            onChange={(field, value) => setHubForm((current) => ({ ...current, [field]: value }))}
                            onUseCurrentLocation={() => captureHubLocation((coordinates) => setHubForm((current) => ({ ...current, ...coordinates })))}
                            locationError={locationError}
                        />
                        <button type="submit" disabled={busy}><Plus size={16} /> Add hub</button>
                    </form>
                </details>
                {data.hubs.length > 0 && <div className="lo-directory-tools"><label className="lo-directory-search">Search hubs<AdminSearchField ariaLabel="Search hubs" value={hubSearch} onChange={(event) => { setHubSearch(event.target.value); setHubLimit(30); }} placeholder="City, municipality, province, or code" /></label><span>Showing {visibleHubs.length.toLocaleString()} of {filteredHubs.length.toLocaleString()}</span></div>}
                {data.hubs.length === 0 ? <p className="lw-empty">No hubs are configured yet. Add a hub before creating a delivery area.</p> : filteredHubs.length === 0 ? <p className="lw-empty">No hubs match that search.</p> : <div className="lo-hub-grid">{visibleHubs.map((hub) => {
                    const draft = hubDrafts[hub.id] || hub;
                    return <article className="lo-hub-card" key={hub.id}>
                        <header><div><span className={`lo-state-pill${hub.is_active ? " is-active" : ""}`}>{hub.is_active ? "Network enabled" : "Network disabled"}</span><span className={`lo-site-pill${hub.address?.trim() ? "" : " needs-setup"}`}>{hub.address?.trim() ? "Address recorded · verify site" : "Physical site not set up"}</span><h3>{hub.name}</h3><strong>{hub.code}</strong></div><button className="lo-hub-status" type="button" disabled={busy} onClick={() => toggleHub(hub)}>{hub.is_active ? "Disable node" : "Enable node"}</button></header>
                        <p className="lo-hub-location">{hub.location_label || hub.address || "No location details recorded"}{hub.psgc_code && <span>PSGC {hub.psgc_code}</span>}</p>
                        <p className="lo-hub-location">{hub.latitude != null && hub.longitude != null ? `GPS pin · ${hub.latitude}, ${hub.longitude} · ${hub.proximity_radius_km || 2} km radius` : "GPS pin not set · nearby-rider detection unavailable for this hub"}</p>
                        <details className="lo-hub-details"><summary>Manage hub <span>{areasByHub(hub.id).length} areas · {transfersByHub(hub.id).length} transfers</span></summary>
                            <div className="lo-hub-details-body">
                                {hub.location_label && <div className="lo-hub-meta"><span>PSGC service location</span><p>{hub.location_label} · {hub.psgc_code}</p></div>}
                                <div className="lo-hub-meta"><span>Physical address</span><p>{hub.address || "Not recorded — update this before operating a physical hub."}</p></div>
                                <details className="lo-hub-edit"><summary><Pencil size={14} /> Edit hub details</summary><div className="lo-hub-edit-fields">
                                    <label>Name<input maxLength={100} value={draft.name} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, name: event.target.value } }))} /></label>
                                    <label>Code<input maxLength={24} value={draft.code} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, code: event.target.value.toUpperCase() } }))} /></label>
                                    <label>Physical address<input maxLength={1000} value={draft.address || ""} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, address: event.target.value } }))} placeholder="Street, building, city, and province" /></label>
                                    <HubCoordinates
                                        value={draft}
                                        onChange={(field, value) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, [field]: value } }))}
                                        onUseCurrentLocation={() => captureHubLocation((coordinates) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, ...coordinates } })))}
                                        locationError={locationError}
                                    />
                                    <button type="button" disabled={busy} onClick={() => void saveHub(hub)}>Save hub details</button>
                                </div></details>
                            </div>
                        </details>
                    </article>;
                })}</div>}
                {visibleHubs.length < filteredHubs.length && <button className="lo-directory-more" type="button" onClick={() => setHubLimit((limit) => limit + 30)}>Show more hubs ({visibleHubs.length} of {filteredHubs.length})</button>}
            </section>}

            {directoryView === "areas" && <section className="lo-panel">
                <div className="lo-hub-section-heading"><div><h2>Delivery areas and rider coverage</h2><p>PSGC city and municipality delivery areas are mapped to their matching active node. Assign eligible riders after confirming real operating coverage.</p></div><span>{data.areas.length} areas</span></div>
                <details className="lo-directory-create">
                    <summary><Plus size={16} /> Add a custom delivery area</summary>
                    <form className="lo-hub-form lo-area-create" onSubmit={createArea}>
                        <label>Delivery area name<input required maxLength={100} value={areaForm.name} onChange={(event) => setAreaForm((current) => ({ ...current, name: event.target.value }))} placeholder="Named operational area" /></label>
                        <label>Active hub<select required value={areaForm.hub_id} onChange={(event) => setAreaForm((current) => ({ ...current, hub_id: event.target.value }))}><option value="">Select an active hub</option>{activeHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}</select></label>
                        <button type="submit" disabled={busy || !activeHubs.length}><Plus size={16} /> Add area</button>
                    </form>
                </details>
                {data.areas.length > 0 && <div className="lo-directory-tools"><label className="lo-directory-search">Search delivery areas<AdminSearchField ariaLabel="Search delivery areas" value={areaSearch} onChange={(event) => { setAreaSearch(event.target.value); setAreaLimit(30); }} placeholder="LGU, province, or mapped hub" /></label><span>Showing {visibleAreas.length.toLocaleString()} of {filteredAreas.length.toLocaleString()}</span></div>}
                {data.areas.length === 0 ? <p className="lw-empty">No delivery areas configured.</p> : filteredAreas.length === 0 ? <p className="lw-empty">No delivery areas match that search.</p> : <div className="lo-area-list">{visibleAreas.map((area) => {
                    const assignedIds = new Set((area.couriers || []).map((rider) => Number(rider.id)));
                    const mappedHub = area.hub;
                    const selectedHubId = areaHubs[area.id] || "";
                    return <article className="lo-area-card" key={area.id}>
                        <header><div><span className={`lo-state-pill${area.is_active ? " is-active" : ""}`}>{area.is_active ? "Active" : "Inactive"}</span><h3>{area.name}</h3><p>Hub: <strong>{mappedHub ? `${mappedHub.name} · ${mappedHub.code}${mappedHub.is_active ? "" : " · inactive"}` : "No hub mapped"}</strong></p></div><button className="lo-hub-status" type="button" disabled={busy} onClick={() => toggleArea(area)}>{area.is_active ? "Deactivate" : "Activate"}</button></header>
                        {area.location_label && <p className="lo-area-location">PSGC service location · physical coverage needs confirmation: {area.location_label}</p>}
                        <details className="lo-area-details"><summary>Manage area <span>{area.couriers?.length || 0} riders assigned</span></summary><div className="lo-area-details-body">
                            <div className="lo-area-edit-row"><label>Area name<input maxLength={100} value={areaNames[area.id] ?? area.name} onChange={(event) => setAreaNames((current) => ({ ...current, [area.id]: event.target.value }))} /></label><button type="button" disabled={busy || (areaNames[area.id] ?? area.name) === area.name} onClick={() => saveAreaName(area)}>Save name</button><label>Move to active hub<select value={selectedHubId} onChange={(event) => setAreaHubs((current) => ({ ...current, [area.id]: event.target.value }))}><option value="">Choose a hub to change mapping</option>{activeHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}</select></label><button type="button" disabled={busy || !selectedHubId} onClick={() => mapArea(area)}>Save hub</button></div>
                            <div className="lo-area-riders"><div className="lo-area-riders-heading"><strong>Riders assigned</strong><span>{area.couriers?.length || 0}</span></div>{area.couriers?.length ? <ul>{area.couriers.map((rider) => <li key={rider.id}><span>{displayName(rider)}{rider.vehicles?.[0] ? ` · ${rider.vehicles[0].vehicle_type}` : ""}</span><button type="button" disabled={busy} aria-label={`Remove ${displayName(rider)} from ${area.name}`} onClick={() => removeRider(area, rider)}>Remove</button></li>)}</ul> : <p>No riders assigned to this area.</p>}</div>
                            {area.is_active && <div className="lo-area-assign"><label>Add eligible rider<select value={riderChoices[area.id] || ""} onChange={(event) => setRiderChoices((current) => ({ ...current, [area.id]: event.target.value }))}><option value="">Choose an eligible rider</option>{data.couriers.filter((rider) => !assignedIds.has(Number(rider.id))).map((rider) => <option key={rider.id} value={rider.id}>{displayName(rider)}</option>)}</select></label><button type="button" disabled={busy || !riderChoices[area.id]} onClick={() => assignRider(area)}>Assign rider</button></div>}
                        </div></details>
                    </article>;
                })}</div>}
                {visibleAreas.length < filteredAreas.length && <button className="lo-directory-more" type="button" onClick={() => setAreaLimit((limit) => limit + 30)}>Show more areas ({visibleAreas.length} of {filteredAreas.length})</button>}
            </section>}

            <ConfirmationModal open={!!pendingAction} title={pendingAction?.title} description={pendingAction?.description} confirmLabel={pendingAction?.confirmLabel} tone={pendingAction?.destructive ? "danger" : "default"} busy={busy} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmStatusChange()} />
        </div>
    );
}
