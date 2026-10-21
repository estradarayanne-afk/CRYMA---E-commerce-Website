import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../shared/services/api";
import PrivateDeliveryProof from "../../../shared/components/PrivateDeliveryProof";
import "./Deliveries.css";

const courierName = (profile) => [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ") || `Courier #${profile?.id}`;
const label = (status) => String(status || "Unknown").replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

export default function Deliveries() {
    const [queue, setQueue] = useState({ pickup_orders: [], pickup_assignments: [], sorting_orders: [], deliveries: [], areas: [], eligible_pickup_couriers: [], eligible_delivery_couriers: [] });
    const [areas, setAreas] = useState([]);
    const [pickupChoices, setPickupChoices] = useState({});
    const [areaChoices, setAreaChoices] = useState({});
    const [deliveryChoices, setDeliveryChoices] = useState({});
    const [areaCourierChoices, setAreaCourierChoices] = useState({});
    const [reasons, setReasons] = useState({});
    const [newArea, setNewArea] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const [queueResponse, areaResponse] = await Promise.all([api.get("/admin/logistics"), api.get("/admin/delivery-areas")]);
            setQueue(queueResponse.data?.data || { pickup_orders: [], pickup_assignments: [], sorting_orders: [], deliveries: [], areas: [], eligible_pickup_couriers: [], eligible_delivery_couriers: [] });
            setAreas(areaResponse.data?.data || []);
        } catch (err) { setError(err.response?.data?.message || "Logistics workspace is unavailable."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const mutate = async (key, task, message) => {
        setSaving(key); setError(""); setNotice("");
        try { await task(); setNotice(message); await load(); }
        catch (err) { setError(err.response?.data?.message || "Unable to save the logistics update."); }
        finally { setSaving(""); }
    };

    const assignPickup = (orderId, existing = null) => {
        const courierProfileId = Number(pickupChoices[orderId]);
        const reason = (reasons[`pickup-${orderId}`] || "").trim();
        if (!courierProfileId) { setError("Select an eligible pickup rider."); return; }
        if (existing?.courier_profile_id && !reason) { setError("Enter a reason to change the pickup rider."); return; }
        const payload = { courier_profile_id: courierProfileId };
        if (existing) payload.expected_courier_profile_id = existing.courier_profile_id ?? null;
        if (reason) payload.reason = reason;
        void mutate(`pickup-${orderId}`, () => api.post(`/admin/orders/${orderId}/pickup-assignment`, payload), `Pickup assignment for order #${orderId} saved.`);
    };

    const processSorting = (order) => {
        const areaId = Number(areaChoices[order.id] || order.delivery?.delivery_area_id);
        const courierProfileId = Number(deliveryChoices[order.id]);
        const courier = queue.eligible_delivery_couriers.find((profile) => profile.id === courierProfileId);
        const isLegacyInTransit = order.status === "OUT_FOR_DELIVERY" && order.delivery?.legacy_imported && !order.delivery?.courier_profile_id;
        const isDeliveryAssignment = ["ASSIGNED_TO_RIDER", "DELIVERY_FAILED"].includes(order.status) || isLegacyInTransit;
        if (!areaId) { setError("Select a configured delivery area."); return; }
        if (!courierProfileId || (isDeliveryAssignment && !courier?.delivery_areas?.some((area) => Number(area.id) === areaId))) { setError("Select an eligible courier assigned to the selected area."); return; }
        const reason = (reasons[`delivery-${order.id}`] || "").trim();
        if (isDeliveryAssignment && (order.delivery?.courier_profile_id || order.status === "DELIVERY_FAILED") && !reason) { setError("Enter a reason for retry or reassignment."); return; }
        const payload = { courier_profile_id: courierProfileId, delivery_area_id: areaId };
        if (isDeliveryAssignment) {
            payload.expected_courier_profile_id = order.delivery?.courier_profile_id ?? null;
            if (reason) payload.reason = reason;
            void mutate(`delivery-${order.id}`, () => api.post(`/admin/orders/${order.id}/delivery-assignment`, payload), `Delivery assignment for order #${order.id} saved.`);
        } else {
            payload.expected_status = order.status;
            if (reason) payload.reason = reason;
            void mutate(`delivery-${order.id}`, () => api.patch(`/admin/orders/${order.id}/sort-and-assign`, payload), `Order #${order.id} sorted and assigned to an area courier.`);
        }
    };

    const addArea = (event) => {
        event.preventDefault();
        const name = newArea.trim();
        if (!name) { setError("Enter a delivery-area name."); return; }
        void mutate("area-create", () => api.post("/admin/delivery-areas", { name }), `Delivery area “${name}” created.`).then(() => setNewArea(""));
    };

    const activeAreas = useMemo(() => areas.filter((area) => area.is_active), [areas]);
    const eligiblePickup = queue.eligible_pickup_couriers || [];
    const eligibleDelivery = queue.eligible_delivery_couriers || [];
    const couriersForArea = (areaId) => activeAreas.some((area) => Number(area.id) === Number(areaId)) ? eligibleDelivery.filter((profile) => profile.delivery_areas?.some((area) => Number(area.id) === Number(areaId) && area.is_active)) : [];
    const setReason = (key, value) => setReasons((current) => ({ ...current, [key]: value }));
    const courierSelect = (list, value, setValue, text) => <select aria-label={text} value={value || ""} onChange={(event) => setValue(event.target.value)}><option value="">Select courier</option>{list.map((profile) => <option value={profile.id} key={profile.id}>{courierName(profile)}{profile.vehicles?.[0] ? ` · ${profile.vehicles[0].vehicle_type}` : ""}</option>)}</select>;

    return <main className="ad-page">
        <header className="ad-heading"><div><span>FULFILLMENT</span><h1>Logistics workflow</h1><p>Assign seller pickups, record sorting-center operations, and assign area couriers.</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="ad-alert" role="alert">{error}</div>}{notice && <div className="ad-notice" role="status">{notice}</div>}
        {!loading && eligiblePickup.length === 0 && <div className="ad-note">No eligible riders are available. Riders must be active, email verified, have an approved required-document set, a courier profile, and a vehicle.</div>}

        <section className="ad-section"><div className="ad-section-title"><div><h2>Delivery areas and courier coverage</h2><p>Area names and rider membership are configured by administrators. No locality routing is assumed.</p></div><span>{areas.length}</span></div>
            <form className="ad-action-row ad-area-create" onSubmit={addArea}><input aria-label="New delivery area name" maxLength={100} value={newArea} onChange={(event) => setNewArea(event.target.value)} placeholder="Delivery area name"/><button type="submit" disabled={!!saving}>{saving === "area-create" ? "Saving…" : "Add area"}</button></form>
            {loading ? <div className="ad-empty" role="status">Loading delivery areas…</div> : areas.length === 0 ? <div className="ad-empty">No delivery areas configured.</div> : <div className="ad-area-grid">{areas.map((area) => <article className="ad-area-card" key={area.id}>
                <div className="ad-area-heading"><div><h3>{area.name}</h3><span className={area.is_active ? "ad-area-active" : "ad-area-inactive"}>{area.is_active ? "Active" : "Inactive"}</span></div><button type="button" disabled={!!saving} onClick={() => void mutate(`area-${area.id}`, () => api.patch(`/admin/delivery-areas/${area.id}`, { is_active: !area.is_active }), `${area.name} ${area.is_active ? "deactivated" : "activated"}.`)}>{area.is_active ? "Deactivate" : "Activate"}</button></div>
                <div className="ad-area-couriers">{area.couriers?.length ? area.couriers.map((profile) => <div key={profile.id}><span>{courierName(profile)}</span><button type="button" disabled={!!saving} aria-label={`Remove ${courierName(profile)} from ${area.name}`} onClick={() => void mutate(`remove-${area.id}-${profile.id}`, () => api.delete(`/admin/delivery-areas/${area.id}/couriers/${profile.id}`), `Courier removed from ${area.name}.`)}>Remove</button></div>) : <p>No couriers assigned.</p>}</div>
                {area.is_active && <div className="ad-action-row"><select aria-label={`Courier to add to ${area.name}`} value={areaCourierChoices[area.id] || ""} onChange={(event) => setAreaCourierChoices((current) => ({ ...current, [area.id]: event.target.value }))}><option value="">Choose eligible courier</option>{eligibleDelivery.filter((profile) => !area.couriers?.some((existing) => existing.id === profile.id)).map((profile) => <option key={profile.id} value={profile.id}>{courierName(profile)}</option>)}</select><button type="button" disabled={!!saving || !areaCourierChoices[area.id]} onClick={() => void mutate(`area-courier-${area.id}`, () => api.post(`/admin/delivery-areas/${area.id}/couriers`, { courier_profile_id: Number(areaCourierChoices[area.id]) }), `Courier assigned to ${area.name}.`)}>Add courier</button></div>}
            </article>)}</div>}
        </section>

        <section className="ad-section"><div className="ad-section-title"><div><h2>Seller pickups</h2><p>Assign an eligible rider to carry a ready parcel to the sorting center.</p></div><span>{queue.pickup_orders.length + queue.pickup_assignments.filter((row) => row.status !== "AT_SORTING_CENTER").length}</span></div>
            {loading ? <div className="ad-empty" role="status">Loading pickup assignments…</div> : <>
                {queue.pickup_orders.length === 0 && queue.pickup_assignments.filter((row) => row.status !== "AT_SORTING_CENTER").length === 0 && <div className="ad-empty">No pickups are waiting for assignment or collection.</div>}
                {queue.pickup_orders.map((order) => <article className="ad-logistics-row" key={`order-${order.id}`}><div><strong>Order #{order.id}</strong><span>{order.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</span><small>Buyer: {[order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(" ") || "Buyer"}</small></div><div className="ad-actions">{courierSelect(eligiblePickup, pickupChoices[order.id], (value) => setPickupChoices((current) => ({ ...current, [order.id]: value })), `Pickup rider for order ${order.id}`)}<button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(order.id)}>{saving === `pickup-${order.id}` ? "Saving…" : "Assign pickup"}</button></div></article>)}
                {queue.pickup_assignments.filter((row) => row.status !== "AT_SORTING_CENTER").map((row) => <article className="ad-logistics-row" key={`pickup-${row.id}`}><div><strong>Order #{row.order_id} · {label(row.status)}</strong><span>Pickup rider: {courierName(row.courierProfile)}</span><small>{row.order?.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</small></div>{["ASSIGNED_TO_PICKUP_RIDER", "ACCEPTED_BY_PICKUP_RIDER"].includes(row.status) && !row.picked_up_at ? <div className="ad-actions">{courierSelect(eligiblePickup, pickupChoices[row.order_id] ?? row.courier_profile_id, (value) => setPickupChoices((current) => ({ ...current, [row.order_id]: value })), `Pickup rider for order ${row.order_id}`)}<input aria-label={`Pickup reassignment reason for order ${row.order_id}`} maxLength={1000} value={reasons[`pickup-${row.order_id}`] || ""} onChange={(event) => setReason(`pickup-${row.order_id}`, event.target.value)} placeholder="Reason if changing rider"/><button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(row.order_id, row)}>Save pickup assignment</button></div> : <span className="ad-muted">Pickup collected or sorting center received parcel.</span>}</article>)}
            </>}
        </section>

        <section className="ad-section"><div className="ad-section-title"><div><h2>Sorting center and delivery assignments</h2><p>Confirm the area, then assign a courier explicitly configured for that area. Legacy statuses remain visibly identified.</p></div><span>{queue.sorting_orders.length}</span></div>
            {loading ? <div className="ad-empty" role="status">Loading sorting queue…</div> : queue.sorting_orders.length === 0 ? <div className="ad-empty">No parcels are waiting for sorting or delivery assignment.</div> : queue.sorting_orders.map((order) => {
                const needsLegacyReceiptVerification = order.status === "PICKED_UP" && order.delivery?.legacy_imported;
                const isLegacyInTransit = order.status === "OUT_FOR_DELIVERY" && order.delivery?.legacy_imported && !order.delivery?.courier_profile_id;
                const isAssignable = ["AT_SORTING_CENTER", "SORTED", "DELIVERY_FAILED"].includes(order.status) || (order.status === "ASSIGNED_TO_RIDER" && !order.delivery?.delivery_picked_up_at) || isLegacyInTransit;
                const selectedArea = areaChoices[order.id] || order.delivery?.delivery_area_id || "";
                const assignedCourier = order.delivery?.courierProfile?.user ? [order.delivery.courierProfile.user.first_name, order.delivery.courierProfile.user.last_name].filter(Boolean).join(" ") : "Unassigned legacy record";
                const needsReason = order.status === "DELIVERY_FAILED" || isLegacyInTransit || (order.status === "ASSIGNED_TO_RIDER" && !!order.delivery?.courier_profile_id);
                return <article className="ad-logistics-row ad-logistics-row--sorting" key={`sort-${order.id}`}><div><strong>Order #{order.id} · {label(order.status)}</strong>{order.delivery?.legacy_imported && <small className="ad-legacy">Legacy status; historical actors and assignments were not available.{isLegacyInTransit ? " Verify the current courier and area before recording a new assignment." : ""}</small>}<span>Destination: {order.delivery_address || "Buyer delivery address unavailable"}</span><span>Current courier: {assignedCourier}</span><small>{order.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</small></div>{isAssignable ? <div className="ad-actions">
                    <select aria-label={`Delivery area for order ${order.id}`} value={selectedArea} onChange={(event) => setAreaChoices((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select delivery area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
                    {courierSelect(couriersForArea(selectedArea), deliveryChoices[order.id] ?? (order.status === "ASSIGNED_TO_RIDER" ? order.delivery?.courier_profile_id : ""), (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Delivery rider for order ${order.id}`)}
                    {(needsReason || order.status === "ASSIGNED_TO_RIDER") && <input aria-label={`Delivery decision reason for order ${order.id}`} maxLength={1000} value={reasons[`delivery-${order.id}`] || ""} onChange={(event) => setReason(`delivery-${order.id}`, event.target.value)} placeholder={needsReason ? "Reason required" : "Reason if reassigning"}/>}
                    <button type="button" disabled={!!saving || !selectedArea || !couriersForArea(selectedArea).length} onClick={() => processSorting(order)}>{saving === `delivery-${order.id}` ? "Saving…" : order.status === "AT_SORTING_CENTER" || order.status === "SORTED" ? "Sort and assign" : order.status === "DELIVERY_FAILED" ? "Retry / reassign" : isLegacyInTransit ? "Record current assignment" : "Reassign before pickup"}</button>
                    {order.status === "DELIVERY_FAILED" && <button type="button" className="ad-secondary-button" disabled={!!saving || !(reasons[`delivery-${order.id}`] || "").trim()} onClick={() => void mutate(`return-${order.id}`, () => api.patch(`/admin/orders/${order.id}/delivery-resolution`, { status: "RETURNED", reason: (reasons[`delivery-${order.id}`] || "").trim() }), `Order #${order.id} recorded as returned.`)}>Record return decision</button>}
                </div> : needsLegacyReceiptVerification ? <div className="ad-actions"><p className="ad-note">Legacy status only: verify the parcel is physically at the sorting center before recording a new receipt event. No pickup rider is inferred.</p><input aria-label={`Legacy receipt verification note for order ${order.id}`} maxLength={1000} value={reasons[`legacy-${order.id}`] || ""} onChange={(event) => setReason(`legacy-${order.id}`, event.target.value)} placeholder="Verification note required"/><button type="button" disabled={!!saving || !(reasons[`legacy-${order.id}`] || "").trim()} onClick={() => void mutate(`legacy-${order.id}`, () => api.patch(`/admin/orders/${order.id}/legacy-sorting-receipt`, { reason: (reasons[`legacy-${order.id}`] || "").trim() }), `Sorting-center receipt verified for order #${order.id}.`)}>Record verified receipt</button></div> : <span className="ad-muted">No action available for this status.</span>}</article>;
            })}
        </section>
        <section className="ad-section"><div className="ad-section-title"><div><h2>Parcel event history</h2><p>Persisted parcel stages and actors. Imported legacy entries are identified as historical imports.</p></div><span>{queue.deliveries.length}</span></div>
            {loading ? <div className="ad-empty" role="status">Loading parcel history…</div> : queue.deliveries.length === 0 ? <div className="ad-empty">No parcel records yet.</div> : <div className="ad-history-list">{queue.deliveries.map((delivery) => <details key={`history-${delivery.id}`}><summary>Order #{delivery.order_id} · {label(delivery.status)}{delivery.legacy_imported ? " · legacy import" : ""}</summary><div>{(delivery.events || []).map((event) => <p key={event.id}><strong>{label(event.new_status)}</strong><span>{event.actor ? courierName({ user: event.actor }) : "Historical import; actor unavailable"}</span><time>{event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : ""}</time>{event.reason && <small>{event.reason}</small>}</p>)}<PrivateDeliveryProof proof={delivery.proof} basePath={`/admin/deliveries/${delivery.id}/proof`} /></div></details>)}</div>}
        </section>
    </main>;
}
