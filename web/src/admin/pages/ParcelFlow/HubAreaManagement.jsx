import { useState } from "react";
import { MapPinned, Pencil, Plus, UsersRound, Warehouse } from "lucide-react";
import api from "../../../shared/services/api";
import ConfirmationModal from "../../../logistics/components/ConfirmationModal";
import "../../../logistics/pages/ParcelOperations.css";
import "./HubAreaManagement.css";

const displayName = (profile) => [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ") || `Rider #${profile?.id}`;

export default function HubAreaManagement({ base, data, busy, run }) {
    const [hubForm, setHubForm] = useState({ name: "", code: "", address: "" });
    const [hubDrafts, setHubDrafts] = useState({});
    const [areaNames, setAreaNames] = useState({});
    const [areaHubs, setAreaHubs] = useState({});
    const [riderChoices, setRiderChoices] = useState({});
    const [areaForm, setAreaForm] = useState({ name: "", hub_id: "" });
    const [pendingAction, setPendingAction] = useState(null);

    const activeHubs = data.hubs.filter((hub) => hub.is_active);
    const areasByHub = (hubId) => data.areas.filter((area) => Number(area.hub_id) === Number(hubId));
    const transfersByHub = (hubId) => data.transfers.filter((transfer) => Number(transfer.from_hub_id) === Number(hubId) || Number(transfer.to_hub_id) === Number(hubId));
    const createHub = async (event) => {
        event.preventDefault();
        if (busy) return;
        const ok = await run(() => api.post(`${base}/hubs`, hubForm), "Hub created.");
        if (ok) setHubForm({ name: "", code: "", address: "" });
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
            <section className="lo-report-grid lo-hub-summary" aria-label="Hub and delivery area summary">
                <article><span><Warehouse size={17} /> Active hubs</span><strong>{activeHubs.length}</strong><small>{data.hubs.length} total hubs, including inactive</small></article>
                <article><span><MapPinned size={17} /> Delivery areas</span><strong>{data.areas.length}</strong><small>{data.areas.filter((area) => area.is_active).length} active operational areas</small></article>
                <article><span><UsersRound size={17} /> Eligible riders</span><strong>{data.couriers.length}</strong><small>Eligibility is checked again by the server on assignment</small></article>
            </section>

            <section className="lo-panel">
                <div className="lo-hub-section-heading"><div><h2>Hub network</h2><p>Maintain named operating hubs. Hubs are deactivated instead of deleted so parcel and transfer history stays auditable.</p></div><span>{data.hubs.length} hubs</span></div>
                <form className="lo-hub-form" onSubmit={createHub}>
                    <label>Hub name<input required maxLength={100} value={hubForm.name} onChange={(event) => setHubForm((current) => ({ ...current, name: event.target.value }))} placeholder="For example, North Regional Hub" /></label>
                    <label>Hub code<input required maxLength={24} pattern="[A-Za-z0-9_-]+" value={hubForm.code} onChange={(event) => setHubForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="NORTH-REGIONAL" /></label>
                    <label>Address<input maxLength={1000} value={hubForm.address} onChange={(event) => setHubForm((current) => ({ ...current, address: event.target.value }))} placeholder="Operational address" /></label>
                    <button type="submit" disabled={busy}><Plus size={16} /> Add hub</button>
                </form>
                {data.hubs.length === 0 ? <p className="lw-empty">No hubs are configured yet. Add a hub before creating a delivery area.</p> : <div className="lo-hub-grid">{data.hubs.map((hub) => {
                    const draft = hubDrafts[hub.id] || hub;
                    return <article className="lo-hub-card" key={hub.id}>
                        <header><div><span className={`lo-state-pill${hub.is_active ? " is-active" : ""}`}>{hub.is_active ? "Active" : "Inactive"}</span><h3>{hub.name}</h3><strong>{hub.code}</strong></div><button className="lo-hub-status" type="button" disabled={busy} onClick={() => toggleHub(hub)}>{hub.is_active ? "Deactivate" : "Activate"}</button></header>
                        <details className="lo-hub-details"><summary>Hub details <span>{areasByHub(hub.id).length} areas · {transfersByHub(hub.id).length} recent transfers</span></summary>
                            <div className="lo-hub-details-body">
                                <div className="lo-hub-meta"><span>Address</span><p>{hub.address || "No address recorded"}</p></div>
                                <details className="lo-hub-edit"><summary><Pencil size={14} /> Edit hub details</summary><div className="lo-hub-edit-fields">
                                    <label>Name<input maxLength={100} value={draft.name} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, name: event.target.value } }))} /></label>
                                    <label>Code<input maxLength={24} value={draft.code} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, code: event.target.value.toUpperCase() } }))} /></label>
                                    <label>Address<input maxLength={1000} value={draft.address || ""} onChange={(event) => setHubDrafts((current) => ({ ...current, [hub.id]: { ...draft, address: event.target.value } }))} /></label>
                                    <button type="button" disabled={busy} onClick={() => void saveHub(hub)}>Save hub details</button>
                                </div></details>
                            </div>
                        </details>
                    </article>;
                })}</div>}
            </section>

            <section className="lo-panel">
                <div className="lo-hub-section-heading"><div><h2>Delivery areas and rider coverage</h2><p>Every new area must be mapped to an active hub. Existing mappings stay in place until an operator changes them.</p></div><span>{data.areas.length} areas</span></div>
                <form className="lo-hub-form lo-area-create" onSubmit={createArea}>
                    <label>Delivery area name<input required maxLength={100} value={areaForm.name} onChange={(event) => setAreaForm((current) => ({ ...current, name: event.target.value }))} placeholder="Named operational area" /></label>
                    <label>Active hub<select required value={areaForm.hub_id} onChange={(event) => setAreaForm((current) => ({ ...current, hub_id: event.target.value }))}><option value="">Select an active hub</option>{activeHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}</select></label>
                    <button type="submit" disabled={busy || !activeHubs.length}><Plus size={16} /> Add area</button>
                </form>
                {data.areas.length === 0 ? <p className="lw-empty">No delivery areas configured.</p> : <div className="lo-area-list">{data.areas.map((area) => {
                    const assignedIds = new Set((area.couriers || []).map((rider) => Number(rider.id)));
                    const mappedHub = area.hub;
                    const selectedHubId = areaHubs[area.id] || "";
                    return <article className="lo-area-card" key={area.id}>
                        <header><div><span className={`lo-state-pill${area.is_active ? " is-active" : ""}`}>{area.is_active ? "Active" : "Inactive"}</span><h3>{area.name}</h3><p>Hub: <strong>{mappedHub ? `${mappedHub.name} · ${mappedHub.code}${mappedHub.is_active ? "" : " · inactive"}` : "No hub mapped"}</strong></p></div><button className="lo-hub-status" type="button" disabled={busy} onClick={() => toggleArea(area)}>{area.is_active ? "Deactivate" : "Activate"}</button></header>
                        <details className="lo-area-details"><summary>Manage area <span>{area.couriers?.length || 0} riders assigned</span></summary><div className="lo-area-details-body">
                            <div className="lo-area-edit-row"><label>Area name<input maxLength={100} value={areaNames[area.id] ?? area.name} onChange={(event) => setAreaNames((current) => ({ ...current, [area.id]: event.target.value }))} /></label><button type="button" disabled={busy || (areaNames[area.id] ?? area.name) === area.name} onClick={() => saveAreaName(area)}>Save name</button><label>Move to active hub<select value={selectedHubId} onChange={(event) => setAreaHubs((current) => ({ ...current, [area.id]: event.target.value }))}><option value="">Choose a hub to change mapping</option>{activeHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}</select></label><button type="button" disabled={busy || !selectedHubId} onClick={() => mapArea(area)}>Save hub</button></div>
                            <div className="lo-area-riders"><div className="lo-area-riders-heading"><strong>Riders assigned</strong><span>{area.couriers?.length || 0}</span></div>{area.couriers?.length ? <ul>{area.couriers.map((rider) => <li key={rider.id}><span>{displayName(rider)}{rider.vehicles?.[0] ? ` · ${rider.vehicles[0].vehicle_type}` : ""}</span><button type="button" disabled={busy} aria-label={`Remove ${displayName(rider)} from ${area.name}`} onClick={() => removeRider(area, rider)}>Remove</button></li>)}</ul> : <p>No riders assigned to this area.</p>}</div>
                            {area.is_active && <div className="lo-area-assign"><label>Add eligible rider<select value={riderChoices[area.id] || ""} onChange={(event) => setRiderChoices((current) => ({ ...current, [area.id]: event.target.value }))}><option value="">Choose an eligible rider</option>{data.couriers.filter((rider) => !assignedIds.has(Number(rider.id))).map((rider) => <option key={rider.id} value={rider.id}>{displayName(rider)}</option>)}</select></label><button type="button" disabled={busy || !riderChoices[area.id]} onClick={() => assignRider(area)}>Assign rider</button></div>}
                        </div></details>
                    </article>;
                })}</div>}
            </section>

            <ConfirmationModal open={!!pendingAction} title={pendingAction?.title} description={pendingAction?.description} confirmLabel={pendingAction?.confirmLabel} tone={pendingAction?.destructive ? "danger" : "default"} busy={busy} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmStatusChange()} />
        </div>
    );
}
