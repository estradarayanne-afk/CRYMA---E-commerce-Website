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

const PAGE_CONFIG = {
    pickups: { eyebrow: "PICKUP QUEUE", title: "Seller pickup requests", description: "Assign a verified, eligible courier to seller orders marked ready for pickup." },
    incoming: { eyebrow: "INBOUND PARCELS", title: "Incoming parcels", description: "Verify parcel handover and record sorting-center receipt." },
    sorting: { eyebrow: "SORTING CENTER", title: "Parcel sorting", description: "Record destination area and assign an eligible courier to each received parcel." },
    assignment: { eyebrow: "COURIER ROUTING", title: "Delivery assignment", description: "Assign or reassign deliveries using configured area coverage and courier eligibility." },
    monitoring: { eyebrow: "DELIVERY OPERATIONS", title: "Courier Deliveries", description: "Monitor courier assignments, delivery status, history, failed attempts, and returns." },
    reports: { eyebrow: "OPERATIONS SUMMARY", title: "Logistics reports", description: "Current counts derived from CRYMA order and delivery records." },
};

export default function ParcelOperations({ section }) {
    const config = PAGE_CONFIG[section];
    const [queue, setQueue] = useState(DEFAULT_QUEUE);
    const [areas, setAreas] = useState([]);
    const [pickupChoices, setPickupChoices] = useState({});
    const [deliveryChoices, setDeliveryChoices] = useState({});
    const [areaChoices, setAreaChoices] = useState({});
    const [reasons, setReasons] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pendingAction, setPendingAction] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
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
            setError(err.response?.data?.message || err.message || "Logistics operations are unavailable.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
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
    const courierSelect = (couriers, value, onChange, label) => (
        <select aria-label={label} value={value || ""} onChange={(event) => onChange(event.target.value)}>
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
        const reason = getReason(`pickup-${orderId}`).trim();
        if (!courierProfileId) {
            setError("Choose an eligible courier for this pickup.");
            return;
        }
        if (existing && courierProfileId !== Number(existing.courier_profile_id) && !reason) {
            setError("Provide a reason when changing the assigned pickup courier.");
            return;
        }
        const payload = { courier_profile_id: courierProfileId };
        if (existing) payload.expected_courier_profile_id = existing.courier_profile_id;
        if (reason) payload.reason = reason;
        const courier = eligiblePickup.find((item) => Number(item.id) === courierProfileId);
        requestConfirmation(
            existing ? "Change pickup courier?" : "Assign pickup courier?",
            `Order #${orderId} will be assigned to ${courierName(courier)} for seller pickup.${reason ? ` Reason: ${reason}` : ""}`,
            () => void mutate(`pickup-${orderId}`, () => api.post(`/logistics/orders/${orderId}/pickup-assignment`, payload), "Pickup courier assigned."),
        );
    };

    const confirmReceipt = (assignment) => {
        requestConfirmation(
            "Confirm sorting-center receipt?",
            `This records order #${assignment.order_id} as received at the sorting center.`,
            () => void mutate(
                `receipt-${assignment.id}`,
                () => api.patch(`/logistics/orders/${assignment.order_id}/sorting-receipt`, { expected_status: "PICKED_UP" }),
                "Sorting-center receipt confirmed.",
            ),
        );
    };

    const sortAndAssign = (order) => {
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
                            <p className="lo-note">These requests are derived from seller orders marked Ready for pickup. The current order workflow has no separate reject/cancel state for a pickup request.</p>
                            {queue.pickup_orders.length === 0 && pickupRows.length === 0 ? <p className="lw-empty">No pickups are waiting for assignment or collection.</p> : <>
                                {queue.pickup_orders.map((order) => <article className="lo-row" key={`ready-${order.id}`}>
                                    <div><strong>Order #{order.id}</strong><span>{(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</span><small>Buyer: {[order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(" ") || "Buyer"}</small></div>
                                    <div className="lo-actions">{courierSelect(eligiblePickup, pickupChoices[order.id], (value) => setPickupChoices((current) => ({ ...current, [order.id]: value })), `Pickup courier for order ${order.id}`)}<button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(order.id)}>{saving === `pickup-${order.id}` ? "Saving…" : "Assign courier"}</button></div>
                                </article>)}
                                {pickupRows.filter((item) => item.status !== "PICKED_UP").map((assignment) => <article className="lo-row" key={`assigned-${assignment.id}`}>
                                    <div><strong>Order #{assignment.order_id} · {statusLabel(assignment.status)}</strong><span>Courier: {courierName(assignment.courierProfile)}</span><small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small></div>
                                    {["ASSIGNED_TO_PICKUP_RIDER", "ACCEPTED_BY_PICKUP_RIDER"].includes(assignment.status) && <div className="lo-actions">
                                        {courierSelect(eligiblePickup, pickupChoices[assignment.order_id] ?? assignment.courier_profile_id, (value) => setPickupChoices((current) => ({ ...current, [assignment.order_id]: value })), `Reassign pickup for order ${assignment.order_id}`)}
                                        <input aria-label={`Pickup reassignment reason for order ${assignment.order_id}`} placeholder="Reason to change courier" maxLength={1000} value={getReason(`pickup-${assignment.order_id}`)} onChange={(event) => setReason(`pickup-${assignment.order_id}`, event.target.value)} />
                                        <button type="button" disabled={!!saving} onClick={() => assignPickup(assignment.order_id, assignment)}>Save assignment</button>
                                    </div>}
                                </article>)}
                            </>}
                        </section>
                    )}

                    {section === "incoming" && <section className="lo-panel"><h2>Collected parcels awaiting receipt</h2>
                        {awaitingReceipt.length === 0 ? <p className="lw-empty">No collected parcels are awaiting sorting-center receipt.</p> : awaitingReceipt.map((assignment) => <article className="lo-row" key={assignment.id}>
                            <div><strong>Order #{assignment.order_id} · Collected</strong><span>Pickup courier: {courierName(assignment.courierProfile)}</span><small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small><small>Collection recorded: {assignment.picked_up_at ? new Date(assignment.picked_up_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small></div>
                            <button type="button" disabled={!!saving} onClick={() => confirmReceipt(assignment)}>{saving === `receipt-${assignment.id}` ? "Saving…" : "Confirm sorting-center receipt"}</button>
                        </article>)}</section>}

                    {section === "sorting" && <section className="lo-panel"><h2>Parcels at the sorting center</h2>
                        {(queue.sorting_orders || []).filter((order) => order.status === "AT_SORTING_CENTER").length === 0 ? <p className="lw-empty">No received parcels are waiting to be sorted.</p> : queue.sorting_orders.filter((order) => order.status === "AT_SORTING_CENTER").map((order) => <article className="lo-row" key={order.id}>
                            <div><strong>Order #{order.id}</strong><span>Destination: {order.delivery_address || "Address unavailable"}</span><small>{(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small></div>
                            <div className="lo-actions"><select aria-label={`Area for order ${order.id}`} value={areaChoices[order.id] || ""} onChange={(event) => setAreaChoices((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{courierSelect(eligibleForArea(areaChoices[order.id]), deliveryChoices[order.id], (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Delivery courier for order ${order.id}`)}<button type="button" disabled={!!saving} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : "Sort and assign"}</button></div>
                        </article>)}</section>}

                    {section === "assignment" && <section className="lo-panel"><h2>Sorted parcels awaiting dispatch</h2>
                        {(queue.sorting_orders || []).filter((order) => order.status === "SORTED").length === 0 ? <p className="lw-empty">No sorted parcels are awaiting a delivery assignment.</p> : queue.sorting_orders.filter((order) => order.status === "SORTED").map((order) => <article className="lo-row" key={order.id}>
                            <div><strong>Order #{order.id}</strong><span>Area: {order.delivery?.deliveryArea?.name || "Select an area"}</span><small>{order.delivery_address || "Address unavailable"}</small></div>
                            <div className="lo-actions"><select aria-label={`Area for order ${order.id}`} value={areaChoices[order.id] || order.delivery?.delivery_area_id || ""} onChange={(event) => setAreaChoices((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{courierSelect(eligibleForArea(areaChoices[order.id] || order.delivery?.delivery_area_id), deliveryChoices[order.id], (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Delivery courier for order ${order.id}`)}<button type="button" disabled={!!saving} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : "Assign delivery"}</button></div>
                        </article>)}</section>}

                    {section === "monitoring" && <section className="lo-panel"><h2>Parcel status and history</h2>
                        {deliveries.length === 0 ? <p className="lw-empty">No delivery records are available.</p> : deliveries.map((delivery) => {
                            const needsAction = delivery.status === "DELIVERY_FAILED" || (delivery.status === "ASSIGNED_TO_RIDER" && !delivery.delivery_picked_up_at);
                            const areaId = areaChoices[delivery.order_id] || delivery.delivery_area_id || "";
                            return <article className="lo-row lo-monitor-row" key={delivery.id}>
                                <div><strong>Order #{delivery.order_id} · {statusLabel(delivery.status)}</strong><span>Area: {delivery.deliveryArea?.name || "Not assigned"} · Courier: {courierName(delivery.courierProfile)}</span><small>Updated: {delivery.updated_at ? new Date(delivery.updated_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small>
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
