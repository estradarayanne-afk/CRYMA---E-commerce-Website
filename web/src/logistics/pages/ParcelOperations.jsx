import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../shared/services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import PrivateDeliveryProof from "../../shared/components/PrivateDeliveryProof";
import ParcelQrScanner from "../../shared/components/ParcelQrScanner";
import { sortCouriersByHubDistance } from "../utils/courierProximity";
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
    sorting: { eyebrow: "SORTING CENTER", title: "Parcel sorting", description: "Receive and scan parcels, read each delivery address, choose its destination area, then assign a rider who covers that area. Fresh rider locations are ranked nearest-first; every eligible rider remains selectable." },
    assignment: { eyebrow: "COURIER ROUTING", title: "Delivery assignment", description: "Assign or reassign deliveries using configured area coverage and courier eligibility. Fresh rider locations are ranked nearest-first; every eligible rider remains selectable." },
    monitoring: { eyebrow: "DELIVERY OPERATIONS", title: "Courier Deliveries", description: "Monitor courier assignments, delivery status, history, failed attempts, and returns." },
    reports: { eyebrow: "OPERATIONS SUMMARY", title: "Logistics reports", description: "Current counts derived from CRYMA order and delivery records." },
};

const MONITOR_FILTERS = [
    { key: "all", label: "All deliveries" },
    { key: "attention", label: "Needs action" },
    { key: "active", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "returned", label: "Returned" },
];

export default function ParcelOperations({ section }) {
    const navigate = useNavigate();
    const config = PAGE_CONFIG[section];
    const [queue, setQueue] = useState(DEFAULT_QUEUE);
    const [areas, setAreas] = useState([]);
    const [hubs, setHubs] = useState([]);
    const [pickupChoices, setPickupChoices] = useState({});
    const [pickupSchedules, setPickupSchedules] = useState({});
    const [deliveryChoices, setDeliveryChoices] = useState({});
    const [areaChoices, setAreaChoices] = useState({});
    const [hubChoices, setHubChoices] = useState({});
    const [reasons, setReasons] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [receiptResult, setReceiptResult] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [sortingScannerOpen, setSortingScannerOpen] = useState(false);
    const [receiptScannerAssignment, setReceiptScannerAssignment] = useState(null);
    const [transferScannerId, setTransferScannerId] = useState(null);
    const [transfers, setTransfers] = useState([]);
    const [transferHubChoices, setTransferHubChoices] = useState({});
    const [monitorFilter, setMonitorFilter] = useState("attention");

    const load = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) {
            setLoading(true);
            setError("");
        }
        try {
            const [queueResponse, areasResponse, hubsResponse, flowResponse] = await Promise.all([
                api.get("/logistics/operations"),
                api.get("/logistics/delivery-areas"),
                api.get("/logistics/hubs"),
                api.get("/logistics/parcel-flow"),
            ]);
            if (queueResponse.data?.success !== true || !queueResponse.data?.data) {
                throw new Error("The logistics operations response is invalid.");
            }
            setQueue({ ...DEFAULT_QUEUE, ...queueResponse.data.data });
            setAreas(Array.isArray(areasResponse.data?.data) ? areasResponse.data.data : []);
            setHubs(Array.isArray(hubsResponse.data?.data) ? hubsResponse.data.data : []);
            setTransfers(Array.isArray(flowResponse.data?.data?.transfers) ? flowResponse.data.data.transfers : []);
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
            return data;
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save the logistics update.");
        } finally {
            setSaving("");
        }
    };

    const contactSeller = (delivery) => {
        void mutate(
            `seller-chat-${delivery.id}`,
            () => api.post(`/logistics/deliveries/${delivery.id}/seller-chat`),
            `Seller conversation opened for order #${delivery.order_id}.`,
        ).then((data) => {
            if (data) navigate("/logistics/messages");
        });
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
    const courierSelect = (couriers, value, onChange, label, disabled = false, hubId = null) => {
        const getProximity = (courier) => hubId == null ? null : courier.hub_proximity?.[String(hubId)];
        const orderedCouriers = sortCouriersByHubDistance(couriers, hubId);
        const proximityLabel = (courier) => {
            const proximity = getProximity(courier);
            if (!proximity) return "";
            if (proximity.distance_km != null) {
                return proximity.nearby
                    ? ` · Nearby · ${Number(proximity.distance_km).toFixed(2)} km`
                    : ` · ${Number(proximity.distance_km).toFixed(2)} km away`;
            }
            if (proximity.state === "stale") return " · Location stale";
            if (proximity.state === "hub_unpinned") return " · Hub GPS pin needed";
            return " · Not sharing location";
        };
        return (
        <select aria-label={label} value={value || ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
            <option value="">{hubId == null ? "Select eligible courier" : "Select rider (nearest first)"}</option>
            {orderedCouriers.map((courier) => (
                <option value={courier.id} key={courier.id}>
                    {courierName(courier)}{courier.vehicles?.[0] ? ` · ${courier.vehicles[0].vehicle_type}` : ""}{proximityLabel(courier)}
                </option>
            ))}
        </select>
        );
    };

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

    const confirmReceipt = (assignment, parcelCode) => {
        const hubId = hubChoices[assignment.id];
        if (!hubId || !parcelCode) { setError("Select the receiving hub and scan the parcel QR code."); return; }
        setReceiptScannerAssignment(null);
        setReceiptResult(null);
        void mutate(`receipt-${assignment.id}`, () => api.patch(`/logistics/orders/${assignment.order_id}/sorting-receipt`, { expected_status: "PICKED_UP", hub_id: Number(hubId), parcel_code: parcelCode }), "Parcel QR verified and received at the sorting center.").then((data) => { if (data) setReceiptResult({ parcelCode, orderId: assignment.order_id, hubName: hubs.find((hub) => Number(hub.id) === Number(hubId))?.name || "selected hub" }); });
    };

    const scanParcel = (parcelCode) => {
        if (!parcelCode) { setError("Scan the parcel QR code before recording it."); return; }
        setSortingScannerOpen(false);
        setReceiptResult(null);
        void mutate("scan-qr", () => api.post("/logistics/parcels/scan", { parcel_code: parcelCode }), "Parcel QR verified. Continue with its destination area and rider.").then((data) => { if (data) setReceiptResult({ parcelCode, orderId: data.data?.data?.order_id }); });
    };
    const receiveSortingQr = (parcelCode) => {
        scanParcel(parcelCode);
    };

    const receiveTransferQr = (transfer, parcelCode) => {
        const hubId = transferHubChoices[transfer.id];
        if (!hubId) { setError("Select the assigned destination hub before scanning this transfer."); return; }
        setTransferScannerId(null);
        setReceiptResult(null);
        void mutate(`transfer-receipt-${transfer.id}`, () => api.patch(`/logistics/hub-transfers/${transfer.id}/receive`, { hub_id: Number(hubId), parcel_code: parcelCode }), "Transfer QR verified and received at its destination hub.").then((data) => { if (data) setReceiptResult({ parcelCode, transferId: transfer.id, hubName: transfer.to_hub?.name || "destination hub" }); });
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
    const sortingQueue = (queue.sorting_orders || []).filter((order) => ["AT_SORTING_CENTER", "SORTED"].includes(order.status));
    const scannedSortingCount = sortingQueue.filter((order) => order.delivery?.events?.some((event) => event.event_type === "parcel_scanned")).length;
    const unscannedSortingCount = sortingQueue.length - scannedSortingCount;
    const filteredDeliveries = deliveries.filter((delivery) => {
        if (monitorFilter === "attention") return delivery.status === "DELIVERY_FAILED" || (delivery.status === "ASSIGNED_TO_RIDER" && !delivery.delivery_picked_up_at);
        if (monitorFilter === "active") return ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(delivery.status);
        if (monitorFilter === "completed") return ["DELIVERED", "COMPLETED"].includes(delivery.status);
        if (monitorFilter === "returned") return delivery.status === "RETURNED";
        return true;
    });
    const monitorFilterCount = (key) => {
        if (key === "attention") return deliveries.filter((delivery) => delivery.status === "DELIVERY_FAILED" || (delivery.status === "ASSIGNED_TO_RIDER" && !delivery.delivery_picked_up_at)).length;
        if (key === "active") return deliveries.filter((delivery) => ["ASSIGNED_TO_RIDER", "PICKED_UP", "OUT_FOR_DELIVERY"].includes(delivery.status)).length;
        if (key === "completed") return deliveries.filter((delivery) => ["DELIVERED", "COMPLETED"].includes(delivery.status)).length;
        if (key === "returned") return deliveries.filter((delivery) => delivery.status === "RETURNED").length;
        return deliveries.length;
    };
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
            {receiptResult && <div className="lr-notice" role="status">Backend verified parcel {receiptResult.parcelCode}{receiptResult.orderId ? ` · Order #${receiptResult.orderId}` : ""}{receiptResult.transferId ? ` · Transfer #${receiptResult.transferId}` : ""} at {receiptResult.hubName || "the selected hub"}.</div>}
            {loading ? <div className="lw-empty" role="status">Loading parcel records…</div> : (
                <>
                    {section === "reports" && <div className="lo-report-grid">{counts.map(([label, count]) => <article key={label}><span>{label}</span><strong>{count}</strong></article>)}</div>}

                    {section === "pickups" && (
                        <section className="lo-panel">
                            <h2>Orders ready for pickup</h2>
                            <p className="lo-note">Confirm the seller pickup address, choose a future pickup date and time, then assign an eligible courier. The current order workflow has no separate reject/cancel state for a pickup request.</p>
                            {queue.pickup_orders.length === 0 && pickupRows.length === 0 ? <p className="lw-empty">No pickups are waiting for assignment or collection.</p> : <>
                                {queue.pickup_orders.map((order) => <article className="lo-row lo-pickup-row" key={`ready-${order.id}`}>
                                    <div><strong>Order #{order.id}</strong><span>{(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</span><small>Buyer: {[order.buyer?.first_name, order.buyer?.last_name].filter(Boolean).join(" ") || "Buyer"}</small><small>Pickup from seller: {formatPickupAddress(order.items?.[0]?.seller?.addresses?.find((address) => address.is_default) || order.items?.[0]?.seller?.addresses?.[0])}</small><label className="lo-field-label">Pickup date and time<input type="datetime-local" value={pickupSchedules[order.id] || ""} onChange={(event) => setPickupSchedules((current) => ({ ...current, [order.id]: event.target.value }))} /></label><small>Parcel weight: {parcelWeight(order.items)}</small></div>
                                    <div className="lo-actions">{courierSelect(eligiblePickup, pickupChoices[order.id], (value) => setPickupChoices((current) => ({ ...current, [order.id]: value })), `Pickup courier for order ${order.id}`)}<button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(order.id)}>{saving === `pickup-${order.id}` ? "Saving…" : "Assign courier"}</button></div>
                                </article>)}
                                {pickupRows.filter((item) => item.status !== "PICKED_UP").map((assignment) => <article className="lo-row lo-pickup-row" key={`assigned-${assignment.id}`}>
                                    <div><strong>Order #{assignment.order_id} · {statusLabel(assignment.status)}</strong><span>{assignment.courierProfile ? `Courier: ${courierName(assignment.courierProfile)}` : "Awaiting courier assignment"}</span>{assignment.requested_at && <small>Seller requested: {new Date(assignment.requested_at).toLocaleString("en-PH")}</small>}{assignment.assigned_at && <small>Courier assigned: {new Date(assignment.assigned_at).toLocaleString("en-PH")}</small>}<small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small><small>Parcel weight: {parcelWeight(assignment.order?.items)}</small></div>
                                    {assignment.pickup_address && <p className="lo-pickup-schedule-summary">Pickup address: {assignment.pickup_address}</p>}
                                    {assignment.scheduled_at && <p className="lo-pickup-schedule-summary">Pickup scheduled: {new Date(assignment.scheduled_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>}
                                    {["PICKUP_REQUESTED", "ASSIGNED_TO_PICKUP_RIDER", "ACCEPTED_BY_PICKUP_RIDER"].includes(assignment.status) && <div className="lo-actions">
                                        <label className="lo-field-label">Pickup date and time<input type="datetime-local" value={pickupSchedules[assignment.order_id] ?? localDateTimeValue(assignment.scheduled_at)} onChange={(event) => setPickupSchedules((current) => ({ ...current, [assignment.order_id]: event.target.value }))} /></label>
                                        {courierSelect(eligiblePickup, pickupChoices[assignment.order_id] ?? assignment.courier_profile_id, (value) => setPickupChoices((current) => ({ ...current, [assignment.order_id]: value })), `Reassign pickup for order ${assignment.order_id}`)}
                                        {assignment.status !== "PICKUP_REQUESTED" && <input aria-label={`Pickup reassignment reason for order ${assignment.order_id}`} placeholder="Reason to change courier" maxLength={1000} value={getReason(`pickup-${assignment.order_id}`)} onChange={(event) => setReason(`pickup-${assignment.order_id}`, event.target.value)} />}
                                        <button type="button" disabled={!!saving || !eligiblePickup.length} onClick={() => assignPickup(assignment.order_id, assignment)}>{assignment.status === "PICKUP_REQUESTED" ? "Assign courier" : "Save assignment"}</button>
                                    </div>}
                                </article>)}
                            </>}
                        </section>
                    )}

                    {section === "incoming" && <section className="lo-panel"><div className="lo-panel-heading"><div><h2>Parcels awaiting sorting-center receipt</h2><p>Choose the receiving hub, then scan the parcel QR to confirm custody.</p></div><span className="lo-queue-count">{awaitingReceipt.length} waiting</span></div>
                        {awaitingReceipt.length === 0 ? <p className="lw-empty">No collected parcels are awaiting sorting-center receipt.</p> : awaitingReceipt.map((assignment) => <article className="lo-row lo-incoming-row" key={assignment.id}>
                            <div><strong>Order #{assignment.order_id} · Collected</strong><span>Pickup courier: {courierName(assignment.courierProfile)}</span><small>{(assignment.order?.items || []).map((item) => item.product?.name).filter(Boolean).join(", ")}</small><small>Parcel weight: {parcelWeight(assignment.order?.items)}</small><small>Collection recorded: {assignment.picked_up_at ? new Date(assignment.picked_up_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small></div>
                            <div className="lo-actions"><label className="lo-field-label">Receiving hub<select aria-label={`Receiving hub for order ${assignment.order_id}`} value={hubChoices[assignment.id] || ""} onChange={(event) => setHubChoices((current) => ({ ...current, [assignment.id]: event.target.value }))}><option value="">Select active hub</option>{hubs.filter((hub) => hub.is_active).map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}</select></label><button type="button" disabled={!!saving || !hubChoices[assignment.id]} onClick={() => setReceiptScannerAssignment(assignment)}>{saving === `receipt-${assignment.id}` ? "Receiving…" : "Scan QR and receive"}</button>{receiptScannerAssignment?.id === assignment.id && <ParcelQrScanner title={`Receive parcel for order ${assignment.order_id}`} onScan={(code) => confirmReceipt(assignment, code)} onClose={() => setReceiptScannerAssignment(null)} />}</div>
                        </article>)}</section>}
                    {section === "incoming" && <section className="lo-panel"><h2>Hub transfer arrivals</h2><p className="lo-note">A rider can mark a transfer in transit. Logistics must select its assigned destination and verify the parcel QR before custody moves.</p>{transfers.filter((transfer) => transfer.status === "in_transit").length === 0 ? <p className="lw-empty">No hub transfers are awaiting receipt.</p> : transfers.filter((transfer) => transfer.status === "in_transit").map((transfer) => <article className="lo-row" key={`transfer-${transfer.id}`}><div><strong>Transfer #{transfer.id} · {transfer.delivery ? `Order #${transfer.delivery.order_id}` : `Return #${transfer.return_shipment?.id}`}</strong><span>{transfer.from_hub?.name} → {transfer.to_hub?.name}</span><small>Parcel: {transfer.delivery?.parcel_code || "Scan the parcel QR to verify"}</small></div><div className="lo-actions"><label>Receiving hub<select aria-label={`Receiving hub for transfer ${transfer.id}`} value={transferHubChoices[transfer.id] || ""} onChange={(event) => setTransferHubChoices((current) => ({ ...current, [transfer.id]: event.target.value }))}><option value="">Select assigned destination</option>{transfer.to_hub && <option value={transfer.to_hub.id}>{transfer.to_hub.name} · {transfer.to_hub.code}{transfer.to_hub.is_active ? "" : " · inactive, existing transfer"}</option>}</select></label><button type="button" disabled={!!saving || !transferHubChoices[transfer.id]} onClick={() => setTransferScannerId(transfer.id)}>Scan QR and receive</button>{transferScannerId === transfer.id && <ParcelQrScanner title={`Receive transfer ${transfer.id}`} onScan={(code) => receiveTransferQr(transfer, code)} onClose={() => setTransferScannerId(null)} />}</div></article>)}</section>}

                    {section === "sorting" && <section className="lo-panel lo-sorting-panel"><div className="lo-panel-heading"><div><h2>Sorting workflow</h2><p>Verify each parcel, select the area that matches its address, then assign an eligible rider.</p></div><span className="lo-queue-count">{sortingQueue.length} at center</span></div>
                        <div className="lo-workflow-steps" aria-label="Sorting steps">
                            <div className={unscannedSortingCount ? "is-current" : "is-complete"}><span>1</span><strong>Scan parcel QR</strong><small>{unscannedSortingCount} need a scan</small></div>
                            <div className={scannedSortingCount ? "is-current" : ""}><span>2</span><strong>Choose delivery area</strong><small>Match the address to coverage</small></div>
                            <div className={scannedSortingCount ? "is-current" : ""}><span>3</span><strong>Assign rider</strong><small>Must cover the selected area</small></div>
                        </div>
                        <div className="lo-sorting-toolbar"><p>Scan or look up a parcel to load its current record before routing.</p><button type="button" disabled={!!saving} onClick={() => setSortingScannerOpen((open) => !open)}>{sortingScannerOpen ? "Close parcel scanner" : "Scan or look up parcel ID"}</button></div>{sortingScannerOpen && <ParcelQrScanner title="Sorting-center parcel scan" onScan={receiveSortingQr} onClose={() => setSortingScannerOpen(false)} />}
                        {sortingQueue.length === 0 ? <p className="lw-empty">No received parcels are waiting to be sorted.</p> : sortingQueue.map((order) => {
                            const scanned = order.delivery?.events?.some((event) => event.event_type === "parcel_scanned");
                            const areaId = areaChoices[order.id] || order.delivery?.delivery_area_id || "";
                            const eligible = eligibleForArea(areaId);
                            const courierId = deliveryChoices[order.id] || (order.status === "SORTED" ? order.delivery?.courier_profile_id : "");
                            const selectedArea = activeAreas.find((area) => Number(area.id) === Number(areaId));
                            const currentHubId = Number(order.delivery?.current_hub_id || 0);
                            const requiresTransfer = !!selectedArea && Number(selectedArea.hub_id || 0) !== currentHubId;
                            return <article className="lo-row lo-sort-row" key={order.id}>
                                <div className="lo-parcel-details"><strong>Parcel #{order.id} <span className="lo-stage-pill">{scanned ? "Scanned · ready to route" : "Received · scan required"}</span></strong>
                                    <small>Current hub: {order.delivery?.currentHub?.name || "Hub unavailable"}</small>
                                    <span className="lo-destination"><b>Delivery address</b>{order.delivery_address || "Address unavailable"}</span>
                                    <small>Items: {(order.items || []).map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items"}</small><small>Parcel weight: {parcelWeight(order.items)}</small>
                                    {scanned && <small>Scan recorded: {order.delivery.events.find((event) => event.event_type === "parcel_scanned")?.created_at ? new Date(order.delivery.events.find((event) => event.event_type === "parcel_scanned").created_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small>}
                                </div>
                                <div className="lo-routing-fields">
                                    {!scanned && <button type="button" disabled={!!saving} onClick={() => setSortingScannerOpen(true)}>{saving === `scan-${order.id}` ? "Scanning…" : "Scan parcel QR"}</button>}
                                    <label>Destination area<select aria-label={`Destination area for parcel ${order.id}`} value={areaChoices[order.id] || order.delivery?.delivery_area_id || ""} disabled={!scanned || !!saving} onChange={(event) => { setAreaChoices((current) => ({ ...current, [order.id]: event.target.value })); setDeliveryChoices((current) => ({ ...current, [order.id]: "" })); }}><option value="">Read address and select area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.hub?.name || "Unmapped hub"}</option>)}</select></label>
                                    {selectedArea && <small>Destination hub: {selectedArea.hub?.name || "Unmapped"}{requiresTransfer ? " · Transfer required before final-mile assignment" : " · Matches current custody"}</small>}
                                    <label>Rider assigned to this area{courierSelect(eligible, courierId, (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Rider for parcel ${order.id}`, !scanned || !!saving, currentHubId)}</label>
                                    <button type="button" disabled={!scanned || !!saving || !areaId || !courierId || requiresTransfer} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : requiresTransfer ? "Hub transfer required" : "Sort and assign to rider"}</button>
                                </div>
                            </article>;
                        })}</section>}

                    {section === "assignment" && <section className="lo-panel"><div className="lo-panel-heading"><div><h2>Sorted parcels awaiting dispatch</h2><p>Check each delivery area and assign a rider who is eligible to serve it.</p></div><span className="lo-queue-count">{deliveries.filter((delivery) => delivery.status === "SORTED").length} waiting</span></div>
                        {(queue.sorting_orders || []).filter((order) => order.status === "SORTED").length === 0 ? <p className="lw-empty">No sorted parcels are awaiting a delivery assignment.</p> : queue.sorting_orders.filter((order) => order.status === "SORTED").map((order) => <article className="lo-row lo-assignment-row" key={order.id}>
                            <div><strong>Order #{order.id}</strong><span>Area: {order.delivery?.deliveryArea?.name || "Select an area"}</span><small>{order.delivery_address || "Address unavailable"}</small><small>Parcel weight: {parcelWeight(order.items)}</small></div>
                            <div className="lo-actions"><select aria-label={`Area for order ${order.id}`} value={areaChoices[order.id] || order.delivery?.delivery_area_id || ""} onChange={(event) => setAreaChoices((current) => ({ ...current, [order.id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{courierSelect(eligibleForArea(areaChoices[order.id] || order.delivery?.delivery_area_id), deliveryChoices[order.id], (value) => setDeliveryChoices((current) => ({ ...current, [order.id]: value })), `Delivery courier for order ${order.id}`, false, order.delivery?.current_hub_id)}<button type="button" disabled={!!saving} onClick={() => sortAndAssign(order)}>{saving === `sort-${order.id}` ? "Saving…" : "Assign delivery"}</button></div>
                        </article>)}</section>}

                    {section === "monitoring" && <section className="lo-panel lo-monitoring-panel"><div className="lo-panel-heading"><div><h2>Parcel status and history</h2><p>Filter the delivery queue to focus on exceptions or review completed work.</p></div><span className="lo-queue-count">{deliveries.length} records</span></div>
                        <nav className="lo-queue-filters" aria-label="Filter courier deliveries">{MONITOR_FILTERS.map(({ key, label }) => <button type="button" key={key} className={monitorFilter === key ? "is-active" : ""} aria-pressed={monitorFilter === key} onClick={() => setMonitorFilter(key)}>{label}<span>{monitorFilterCount(key)}</span></button>)}</nav>
                        {deliveries.length === 0 ? <p className="lw-empty">No delivery records are available.</p> : filteredDeliveries.length === 0 ? <p className="lw-empty">No deliveries match this filter.</p> : filteredDeliveries.map((delivery) => {
                            const needsAction = delivery.status === "DELIVERY_FAILED" || (delivery.status === "ASSIGNED_TO_RIDER" && !delivery.delivery_picked_up_at);
                            const areaId = areaChoices[delivery.order_id] || delivery.delivery_area_id || "";
                            return <article className="lo-row lo-monitor-row" key={delivery.id}>
                                <div><strong>Order #{delivery.order_id} · {statusLabel(delivery.status)}</strong><span>Area: {delivery.deliveryArea?.name || "Not assigned"} · Courier: {courierName(delivery.courierProfile)}</span><small>Parcel weight: {parcelWeight(delivery.order?.items)}</small><small>Updated: {delivery.updated_at ? new Date(delivery.updated_at).toLocaleString("en-PH") : "Timestamp unavailable"}</small>
                                    {delivery.failure_reason && <small className="lo-warning">Failure reason: {delivery.failure_reason}</small>}
                                    <details><summary>Parcel event history</summary>{(delivery.events || []).length ? (delivery.events || []).map((event) => <span className="lo-event" key={event.id}>{statusLabel(event.new_status)} · {event.actor ? [event.actor.first_name, event.actor.last_name].filter(Boolean).join(" ") : "Recorded actor unavailable"} · {event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : "Timestamp unavailable"}{event.reason ? ` · ${event.reason}` : ""}</span>) : <small>No recorded events.</small>}</details>
                                    <PrivateDeliveryProof proof={delivery.proof} basePath={`/logistics/deliveries/${delivery.id}/proof`} />
                                    <div className="lo-actions"><button type="button" disabled={!!saving} onClick={() => contactSeller(delivery)}>{saving === `seller-chat-${delivery.id}` ? "Opening…" : "Contact seller"}</button></div>
                                </div>
                                {needsAction && <div className="lo-actions">
                                    <select aria-label={`Area for delivery order ${delivery.order_id}`} value={areaId} onChange={(event) => setAreaChoices((current) => ({ ...current, [delivery.order_id]: event.target.value }))}><option value="">Select active area</option>{activeAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
                                    {courierSelect(eligibleForArea(areaId), deliveryChoices[delivery.order_id], (value) => setDeliveryChoices((current) => ({ ...current, [delivery.order_id]: value })), `Courier for delivery order ${delivery.order_id}`, false, delivery.current_hub_id)}
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
