import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../shared/services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import PrivateDeliveryProof from "../../shared/components/PrivateDeliveryProof";
import "./ParcelOperations.css";

const DEFAULT_QUEUE = {
    pickup_orders: [],
    pickup_assignments: [],
    sorting_orders: [],
    deliveries: [],
    areas: [],
    eligible_pickup_couriers: [],
    eligible_delivery_couriers: [],
};

const statusLabel = (status) => String(status || "Unknown").replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const courierName = (profile) => [profile?.user?.first_name, profile?.user?.last_name].filter(Boolean).join(" ") || `Courier #${profile?.id}`;
const localDateTimeValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatPickupAddress = (address) => address ? [
    address.recipient_name ? `Contact: ${address.recipient_name}` : "",
    address.phone ? `Phone: ${address.phone}` : "",
    [address.house_number, address.building_name, address.unit_number, address.street].filter(Boolean).join(" "),
    address.barangay, address.municipality, address.province, address.region, address.postal_code,
].filter(Boolean).join(", ") : "Pickup address not set";
const parcelWeight = (items = []) => {
    let total = 0;
    let unknown = false;
    items.forEach((item) => {
        const weight = Number(item.unit_weight_kg ?? item.product?.weight_kg);
        if (!Number.isFinite(weight) || weight <= 0) unknown = true;
        else total += weight * (Number(item.quantity) || 0);
    });
    if (!total && unknown) return "Weight unavailable";
    return `${total.toFixed(3)} kg${unknown ? " + unknown items" : ""}`;
};

const PAGE_CONFIG = {
    pickups: { eyebrow: "PICKUP QUEUE", title: "Seller pickup requests", description: "Assign a verified, eligible courier to seller orders marked ready for pickup." },
    incoming: { eyebrow: "INBOUND PARCELS", title: "Incoming parcels", description: "Verify parcel handover and record sorting-center receipt." },
    sorting: { eyebrow: "SORTING CENTER", title: "Parcel sorting", description: "Receive and scan parcels, read each delivery address, choose its destination area, then assign a rider who covers that area." },
    assignment: { eyebrow: "COURIER ROUTING", title: "Delivery assignment", description: "Assign or reassign deliveries using configured area coverage and courier eligibility." },
    monitoring: { eyebrow: "DELIVERY OPERATIONS", title: "Courier Deliveries", description: "Monitor courier assignments, delivery status, history, failed attempts, and returns." },
    reports: { eyebrow: "OPERATIONS SUMMARY", title: "Logistics reports", description: "Current counts derived from CRYMA order and delivery records." },
};

export default function ParcelOperations({ section }) {
    const config = PAGE_CONFIG[section];
    const [queue, setQueue] = useState(DEFAULT_QUEUE);
    const [areas, setAreas] = useState([]);
    const [pickupChoices, setPickupChoices] = useState({});
    const [pickupSchedules, setPickupSchedules] = useState({});
    const [deliveryChoices, setDeliveryChoices] = useState({});
    const [areaChoices, setAreaChoices] = useState({});
    const [reasons, setReasons] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pendingAction, setPendingAction] = useState(null);

    const load = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) {
            setLoading(true);
            setError("");
        }
        try {
            const [queueResponse, areasResponse] = await Promise.all([
                api.get("/logistics/operations"),
                api.get("/logistics/delivery-areas"),
            ]);
            if (queueResponse.data?.success !== true || !queueResponse.data?.data) {
                throw new Error("The logistics operations response is invalid.");
            }
            setQueue({ ...DEFAULT_QUEUE, ...queueResponse.data.data });
            setAreas(Array.isArray(areasResponse.data?.data) ? areasResponse.data.data : []);
        } catch (err) {
            if (!quiet) setError(err.response?.data?.message || err.message || "Logistics operations are unavailable.");
        } finally {
            if (!quiet) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        const refresh = window.setInterval(() => { void load({ quiet: true }); }, 30_000);
        return () => { window.clearTimeout(timer); window.clearInterval(refresh); };
    }, [load]);

    const mutate = async (key, task, message) => {
        setSaving(key);
        setError("");
        setNotice("");
        try {
            const { data } = await task();
            setNotice(data?.message || message);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save the logistics update.");
        } finally {
            setSaving("");
        }
    };

    const requestConfirmation = (title, description, run, options = {}) => {
        setError("");
        setPendingAction({ title, description, run, ...options });
    };

    const cancelConfirmation = useCallback(() => setPendingAction(null), []);
    const confirmPendingAction = () => {
        if (!pendingAction || saving) return;
        const { run } = pendingAction;
        setPendingAction(null);
        run();
    };

    const activeAreas = useMemo(() => areas.filter((area) => area.is_active), [areas]);
    const eligiblePickup = queue.eligible_pickup_couriers || [];
    const eligibleDelivery = queue.eligible_delivery_couriers || [];
    const eligibleForArea = (areaId) => eligibleDelivery.filter((courier) =>
        courier.delivery_areas?.some((area) => Number(area.id) === Number(areaId) && area.is_active));
    const getReason = (key) => reasons[key] || "";
    const setReason = (key, value) => setReasons((current) => ({ ...current, [key]: value }));
    const courierSelect = (couriers, value, onChange, label, disabled = false) => (
        <select aria-label={label} value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            <option value="">Select eligible courier</option>
            {couriers.map((courier) => (
                <option value={courier.id} key={courier.id}>
                    {courierName(courier)}{courier.vehicles?.[0] ? ` · ${courier.vehicles[0].vehicle_type}` : ""}
                </option>
            ))}
        </select>
    );

    const assignPickup = (orderId, existing = null) => {
        const courierProfileId = Number(pickupChoices[orderId] || existing?.courier_profile_id);
        const localSchedule = pickupSchedules[orderId] ?? localDateTimeValue(existing?.scheduled_at);
        const reason = getReason(`pickup-${orderId}`).trim();
        if (!courierProfileId) {
            setError("Choose an eligible courier for this pickup.");
            return;
        }
        const scheduledAt = new Date(localSchedule);
        if (!localSchedule || Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
            setError("Choose a pickup date and time in the future.");
            return;
        }
        if (existing && existing.status !== "PICKUP_REQUESTED" && courierProfileId !== Number(existing.courier_profile_id) && !reason) {
            setError("Provide a reason when changing the assigned pickup courier.");
            return;
        }
        const payload = { courier_profile_id: courierProfileId, scheduled_at: scheduledAt.toISOString() };
        if (existing) payload.expected_courier_profile_id = existing.courier_profile_id;
        if (reason) payload.reason = reason;
        const courier = eligiblePickup.find((item) => Number(item.id) === courierProfileId);
        const order = queue.pickup_orders.find((item) => Number(item.id) === Number(orderId)) || existing?.order;
        const pickupLocation = existing?.pickup_address || formatPickupAddress(order?.items?.[0]?.seller?.addresses?.find((address) => address.is_default) || order?.items?.[0]?.seller?.addresses?.[0]);
        const pickupTime = scheduledAt.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
        requestConfirmation(
            existing ? "Change pickup courier?" : "Assign pickup courier?",
            `Order #${orderId} will be picked up at ${pickupLocation} on ${pickupTime} by ${courierName(courier)}.${reason ? ` Reason: ${reason}` : ""}`,
            () => void mutate(`pickup-${orderId}`, () => api.post(`/logistics/orders/${orderId}/pickup-assignment`, payload), "Pickup courier assigned."),
        );
    };

    const confirmReceipt = (assignment) => {
        requestConfirmation(
            "Receive parcel at the sorting center?",
            `This records order #${assignment.order_id} as received at the sorting center.`,
            () => void mutate(
                `receipt-${assignment.id}`,
                () => api.patch(`/logistics/orders/${assignment.order_id}/sorting-receipt`, { expected_status: "PICKED_UP" }),
                        "Parcel received at the sorting center.",
            ),
        );
    };

    const scanParcel = (order) => {
        requestConfirmation(
            "Scan parcel at sorting center?",
            `Confirm that parcel #${order.id} has been physically received and scanned. You can then read the address and route it to an area rider.`,
            () => void mutate(
                `scan-${order.id}`,
                () => api.patch(`/logistics/orders/${order.id}/scan`, { expected_status: order.status }),
                `Parcel #${order.id} scanned. Continue with its destination area and rider.`,
            ),
        );
    };

    const sortAndAssign = (order) => {
        const scanned = order.delivery?.events?.some((event) => event.event_type === "parcel_scanned");
        if (!scanned) {
            setError("Scan the parcel before choosing its delivery area and rider.");
            return;
        }
        const areaId = Number(areaChoices[order.id] || order.delivery?.delivery_area_id);
        const courierProfileId = Number(deliveryChoices[order.id]);
        if (!areaId || !courierProfileId || !eligibleForArea(areaId).some((courier) => courier.id === courierProfileId)) {
            setError("Select an active delivery area and a courier assigned to that area.");
            return;
        }
        const courier = eligibleForArea(areaId).find((item) => Number(item.id) === courierProfileId);
        const area = activeAreas.find((item) => Number(item.id) === areaId);
        requestConfirmation(
            "Sort and assign this parcel?",
            `Order #${order.id} will be routed to ${area?.name || "the selected area"} and assigned to ${courierName(courier)}.`,
            () => void mutate(
                `sort-${order.id}`,
                () => api.patch(`/logistics/orders/${order.id}/sort-and-assign`, {
                    delivery_area_id: areaId,
                    courier_profile_id: courierProfileId,
                    expected_status: order.status,
                }),
                `Order #${order.id} sorted and assigned.`,
            ),
        );
    };

    const reassignDelivery = (delivery) => {
        const orderId = delivery.order_id;
        const areaId = Number(areaChoices[orderId] || delivery.delivery_area_id);
        const courierProfileId = Number(deliveryChoices[orderId]);
        const reason = getReason(`delivery-${orderId}`).trim();
        if (!areaId || !eligibleForArea(areaId).some((courier) => courier.id === courierProfileId)) {
            setError("Select an active delivery area and a courier assigned to that area.");
            return;
        }
        if (!reason) {
            setError("A reason is required to retry or reassign this delivery.");
            return;
        }
        const courier = eligibleForArea(areaId).find((item) => Number(item.id) === courierProfileId);
        const area = activeAreas.find((item) => Number(item.id) === areaId);
        requestConfirmation(
            delivery.status === "DELIVERY_FAILED" ? "Retry delivery?" : "Reassign delivery courier?",
            `Order #${orderId} will be assigned to ${courierName(courier)} for ${area?.name || "the selected area"}. Reason: ${reason}`,
            () => void mutate(
                `delivery-${orderId}`,
                () => api.post(`/logistics/orders/${orderId}/delivery-assignment`, {
                    delivery_area_id: areaId,
                    courier_profile_id: courierProfileId,
                    expected_courier_profile_id: delivery.courier_profile_id,
                    reason,
                }),
                `Delivery assignment for order #${orderId} saved.`,
            ),
        );
    };

    const returnDelivery = (delivery) => {
        const reason = getReason(`return-${delivery.order_id}`).trim();
        if (!reason) {
            setError("A reason is required to record a return.");
            return;
        }
        requestConfirmation(
            "Mark parcel as returned?",
            `Order #${delivery.order_id} will be recorded as returned to the sorting center. Reason: ${reason}`,
            () => void mutate(
                `return-${delivery.order_id}`,
                () => api.patch(`/logistics/orders/${delivery.order_id}/delivery-resolution`, { status: "RETURNED", reason }),
                `Order #${delivery.order_id} marked returned to the sorting center.`,
            ),
            { destructive: true, confirmLabel: "Confirm return" },
        );
    };

    if (!config) return null;
    const pickupRows = (queue.pickup_assignments || []).filter((item) => item.status !== "AT_SORTING_CENTER");
    const awaitingReceipt = pickupRows.filter((item) => item.status === "PICKED_UP");
    const deliveries = queue.deliveries || [];
    const counts = [
        ["Awaiting pickup assignment", queue.pickup_orders.length],
        ["Pickup handovers in progress", pickupRows.filter((item) => item.status !== "PICKED_UP").length],
        ["Awaiting sorting-center receipt", awaitingReceipt.length],
        ["Awaiting sorting / assignment", (queue.sorting_orders || []).filter((order) => order.status === "AT_SORTING_CENTER").length],
        ["Sorted, awaiting dispatch", deliveries.filter((delivery) => delivery.status === "SORTED").length],
        ["Deliveries in progress", deliveries.filter((delivery) => delivery.status === "OUT_FOR_DELIVERY").length],
        ["Failed deliveries", deliveries.filter((delivery) => delivery.status === "DELIVERY_FAILED").length],
        ["Completed deliveries", deliveries.filter((delivery) => ["DELIVERED", "COMPLETED"].includes(delivery.status)).length],
        ["Returned parcels", deliveries.filter((delivery) => delivery.status === "RETURNED").length],
    ];

    return (
        <section className="lo-page">
            <header className="lw-page-heading">
                <div><span className="lw-eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div>
                <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
            </header>
            {error && <div className="lw-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} disabled={loading}>Retry</button></div>}
            {notice && <div className="lr-notice" role="status">{notice}</div>}
            {loading ? <div className="lw-empty" role="status">Loading parcel records…</div> : (
                <>
                    {section === "reports" && <div className="lo-report-grid">{counts.map(([label, count]) => <article key={label}><span>{label}</span><strong>{count}</strong></article>)}</div>}

                    {section === "pickups" && (
                        <section className="lo-panel">
                            <h2>Orders ready for pickup</h2>
                            <p className="lo-note">Confirm the seller pickup address, choose a future pickup date and time, then assign an eligible courier. The current order workflow has no separate reject/cancel state for a pickup request.</p>
                            {queue.pickup_orders.length === 0 && pickupRows.length === 0 ? <p className="lw-empty">No pickups are waiting for assignment or collection.</p> : <>
                                {queue.pickup_orders.map((order) => <article className="lo-row" key={`ready-${order.id}`}>
                                    <div><strong>Order #{order.id}</strong><span>{(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</span><small>Buyer: {[order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(" ") || "Buyer"}</small><small>Pickup from seller: {formatPickupAddress(order.items?.[0]?.seller?.addresses?.find((address) => address.is_default) || order.items?.[0]?.seller?.addresses?.[0])}</small><label className="lo-field-label">Pickup date and time<input type="datetime-local" min={localDateTimeValue(new Date(Date.now() + 60_000))} value={pickupSchedules[order.id] || ""} onChange={(event) => setPickupSchedules((current) => ({ ...current, [order.id]: event.target.value }))} /></label><small>Parcel weight: {parcelWeight(order.items)}</small></div>
                                    <div className="lo-actions">{courierSelect(eligiblePickup, pickupChoices[order.id], (value) => setPickupChoices((current) => ({ ...current, [order.id]: value })), `Pickup courier for order ${order.id}`)}<button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(order.id)}>{saving === `pickup-${order.id}` ? "Saving…" : "Assign courier"}</button></div>
                                </article>)}
                                {pickupRows.filter((item) => item.status !== "PICKED_UP").map((assignment) => <article className="lo-row" key={`assigned-${assignment.id}`}>
                                    <div><strong>Order #{assignment.order_id} · {statusLabel(assignment.status)}</strong><span>{assignment.courierProfile ? `Courier: ${courierName(assignment.courierProfile)}` : "Awaiting courier assignment"}</span>{assignment.requested_at && <small>Seller requested: {new Date(assignment.requested_at).toLocaleString("en-PH")}</small>}{assignment.assigned_at && <small>Courier assigned: {new Date(assignment.assigned_at).toLocaleString("en-PH")}</small>}<small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small><small>Parcel weight: {parcelWeight(assignment.order?.items)}</small></div>
                                    {assignment.pickup_address && <p className="lo-pickup-schedule-summary">Pickup address: {assignment.pickup_address}</p>}
                                    {assignment.scheduled_at && <p className="lo-pickup-schedule-summary">Pickup scheduled: {new Date(assignment.scheduled_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>}
                                    {["PICKUP_REQUESTED", "ASSIGNED_TO_PICKUP_RIDER", "ACCEPTED_BY_PICKUP_RIDER"].includes(assignment.status) && <div className="lo-actions">
                                        <label className="lo-field-label">Pickup date and time<input type="datetime-local" min={localDateTimeValue(new Date(Date.now() + 60_000))} value={pickupSchedules[assignment.order_id] ?? localDateTimeValue(assignment.scheduled_at)} onChange={(event) => setPickupSchedules((current) => ({ ...current, [assignment.order_id]: event.target.value }))} /></label>
                                        {courierSelect(eligiblePickup, pickupChoices[assignment.order_id] ?? assignment.courier_profile_id, (value) => setPickupChoices((current) => ({ ...current, [assignment.order_id]: value })), `Reassign pickup for order ${assignment.order_id}`)}
                                        {assignment.status !== "PICKUP_REQUESTED" && <input aria-label={`Pickup reassignment reason for order ${assignment.order_id}`} placeholder="Reason to change courier" maxLength={1000} value={getReason(`pickup-${assignment.order_id}`)} onChange={(event) => setReason(`pickup-${assignment.order_id}`, event.target.value)} />}
                                        <button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(assignment.order_id, assignment)}>{assignment.status === "PICKUP_REQUESTED" ? "Assign courier" : "Save assignment"}</button>
                                    </div>}
                                </article>)}
                            </>}
                        </section>
                    )}

                    {section === "incoming" && <section className="lo-panel"><h2>Parcels awaiting sorting-center receipt</h2>
                        {awaitingReceipt.length === 0 ? <p className="lw-empty">No collected parcels are awaiting sorting-center receipt.</p> : awaitingReceipt.map((assignment) => <article className="lo-row" key={assignment.id}>
                            <div><strong>Order #{assignment.order_id} · Collected</strong><span>Pickup courier: {courierName(assignment.courierProfile)}</span><small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small><small>Parcel weight: {parcelWeight(assignment.order?.items)}</small><small>Collection recorded: {assignment.picked_up_at ? new Date(assignment.picked_up_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small></div>
                            <button type="button" disabled={!!saving} onClick={() => confirmReceipt(assignment)}>{saving === `receipt-${assignment.id}` ? "Receiving…" : "Receive parcel"}</button>
                        </article>)}</section>}

                    {section === "sorting" && <section className="lo-panel"><h2>Receive · Scan · Read address · Sort · Assign</h2>
                        {(queue.sorting_orders || []).filter((order) => ["AT_SORTING_CENTER", "SORTED"].includes(order.status)).length === 0 ? <p className="lw-empty">No received parcels are waiting to be sorted.</p> : queue.sorting_orders.filter((order) => ["AT_SORTING_CENTER", "SORTED"].includes(order.status)).map((order) => {
                            const scanned = order.delivery?.events?.some((event) => event.event_type === "parcel_scanned");
                            const areaId = areaChoices[order.id] || order.delivery?.delivery_area_id || "";
                            const eligible = eligibleForArea(areaId);
                            const courierId = deliveryChoices[order.id] || (order.status === "SORTED" ? order.delivery?.courier_profile_id : "");
                            return <article className="lo-row lo-sort-row" key={order.id}>
                                <div className="lo-parcel-details"><strong>Parcel #{order.id} <span className="lo-stage-pill">{scanned ? "Scanned · ready to route" : "Received · scan required"}</span></strong>
                                    <span className="lo-destination"><b>Delivery address</b>{order.delivery_address || "Address unavailable"}</span>
                                    <small>Items: {(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</small><small>Parcel weight: {parcelWeight(order.items)}</small>
                                    {scanned && <small>Scan recorded: {new Date(order.delivery.events.find((event) => event.event_type === "parcel_scanned")?.created_at || Date.now()).toLocaleString("en-PH")}</small>}
                                </div>
                                <div className="lo-routing-fields">
                                    {!scanned && <button type="button" disabled={!!saving} onClick={() => scanParcel(order)}>{saving === `scan-${order.id}` ? "Scanning…" : "Scan parcel"}</button>}
                                    <label>Destination area<select aria-label={`Destination area for parcel ${order.id}`} value={areaChoices[order.id] || order.delivery?.delivery_area_id || ""} disabled={!scanned || !!saving} onChange={(event) => { setAreaChoices((current) => ({ ...current, [order.id]: event.target.value })); setDeliveryChoices((current) => ({ ...current, [order.id]: "" })); }}><option value="">Read address and select area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
                                    <label>Rider assigned to this area{courierSelect(eligible, courierId, (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Rider for parcel ${order.id}`, !scanned || !!saving)}</label>
                                    <button type="button" disabled={!scanned || !!saving || !areaId || !courierId} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : "Sort and assign to rider"}</button>
                                </div>
                            </article>;
                        })}</section>}

                    {section === "assignment" && <section className="lo-panel"><h2>Sorted parcels awaiting dispatch</h2>
                        {(queue.sorting_orders || []).filter((order) => order.status === "SORTED").length === 0 ? <p className="lw-empty">No sorted parcels are awaiting a delivery assignment.</p> : queue.sorting_orders.filter((order) => order.status === "SORTED").map((order) => <article className="lo-row" key={order.id}>
                            <div><strong>Order #{order.id}</strong><span>Area: {order.delivery?.deliveryArea?.name || "Select an area"}</span><small>{order.delivery_address || "Address unavailable"}</small><small>Parcel weight: {parcelWeight(order.items)}</small></div>
                            <div className="lo-actions"><select aria-label={`Area for order ${order.id}`} value={areaChoices[order.id] || order.delivery?.delivery_area_id || ""} onChange={(event) => setAreaChoices((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{courierSelect(eligibleForArea(areaChoices[order.id] || order.delivery?.delivery_area_id), deliveryChoices[order.id], (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Delivery courier for order ${order.id}`)}<button type="button" disabled={!!saving} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : "Assign delivery"}</button></div>
                        </article>)}</section>}

                    {section === "monitoring" && <section className="lo-panel"><h2>Parcel status and history</h2>
                        {deliveries.length === 0 ? <p className="lw-empty">No delivery records are available.</p> : deliveries.map((delivery) => {
                            const needsAction = delivery.status === "DELIVERY_FAILED" || (delivery.status === "ASSIGNED_TO_RIDER" && !delivery.delivery_picked_up_at);
                            const areaId = areaChoices[delivery.order_id] || delivery.delivery_area_id || "";
                            return <article className="lo-row lo-monitor-row" key={delivery.id}>
                                <div><strong>Order #{delivery.order_id} · {statusLabel(delivery.status)}</strong><span>Area: {delivery.deliveryArea?.name || "Not assigned"} · Courier: {courierName(delivery.courierProfile)}</span><small>Parcel weight: {parcelWeight(delivery.order?.items)}</small><small>Updated: {delivery.updated_at ? new Date(delivery.updated_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small>
                                    {delivery.failure_reason && <small className="lo-warning">Failure reason: {delivery.failure_reason}</small>}
                                    <details><summary>Parcel event history</summary>{(delivery.events || []).length ? (delivery.events || []).map((event) => <span className="lo-event" key={event.id}>{statusLabel(event.new_status)} · {event.actor ? [event.actor.first_name, event.actor.last_name].filter(Boolean).join(" ") : "Recorded actor unavailable"} · {event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : "Timestamp unavailable"}{event.reason ? ` · ${event.reason}` : ""}</span>) : <small>No recorded events.</small>}</details>
                                    <PrivateDeliveryProof proof={delivery.proof} basePath={`/logistics/deliveries/${delivery.id}/proof`} />
                                </div>
                                {needsAction && <div className="lo-actions">
                                    <select aria-label={`Area for delivery order ${delivery.order_id}`} value={areaId} onChange={(event) => setAreaChoices((current) => ({ ...current, [delivery.order_id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
                                    {courierSelect(eligibleForArea(areaId), deliveryChoices[delivery.order_id], (value) => setDeliveryChoices((current) => ({ ...current, [delivery.order_id]: value })), `Courier for delivery order ${delivery.order_id}`)}
                                    <input aria-label={`Action reason for delivery order ${delivery.order_id}`} placeholder="Reason for retry or reassignment" maxLength={1000} value={getReason(`delivery-${delivery.order_id}`)} onChange={(event) => setReason(`delivery-${delivery.order_id}`, event.target.value)} />
                                    <button type="button" disabled={!!saving} onClick={() => reassignDelivery(delivery)}>{saving === `delivery-${delivery.order_id}` ? "Saving…" : delivery.status === "DELIVERY_FAILED" ? "Retry delivery" : "Reassign courier"}</button>
                                    {delivery.status === "DELIVERY_FAILED" && <><input aria-label={`Return reason for order ${delivery.order_id}`} placeholder="Reason for return to center" maxLength={1000} value={getReason(`return-${delivery.order_id}`)} onChange={(event) => setReason(`return-${delivery.order_id}`, event.target.value)} /><button className="lo-danger" type="button" disabled={!!saving} onClick={() => returnDelivery(delivery)}>{saving === `return-${delivery.order_id}` ? "Saving…" : "Mark returned"}</button></>}
                                </div>}
                            </article>;
                        })}</section>}

                    {!["reports", "pickups", "incoming", "sorting", "assignment", "monitoring"].includes(section) && <p className="lw-empty">This logistics view is unavailable.</p>}
                </>
            )}
            <ConfirmationModal open={!!pendingAction} title={pendingAction?.title} description={pendingAction?.description} confirmLabel={pendingAction?.confirmLabel} tone={pendingAction?.destructive ? "danger" : "default"} busy={!!saving} onCancel={cancelConfirmation} onConfirm={confirmPendingAction} />
        </section>
    );
}
