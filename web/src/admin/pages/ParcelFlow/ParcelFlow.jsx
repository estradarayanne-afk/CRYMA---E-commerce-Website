import { useCallback, useEffect, useState } from "react";
import AdminSearchField from "../../components/AdminSearchField";
import api from "../../../shared/services/api";
import HubAreaManagement from "./HubAreaManagement";
import { canDispatchReturnTransfer } from "../../../hubStaff/utils/hubStaffWorkspace";
import { buildThirdPartyReceivePayload, buildThirdPartyShipmentPayload, groupThirdPartyShipments, parcelCodeMatches } from "../../../logistics/utils/parcelOperations.js";
import { normalizeCompleteHubShipment } from "./shipmentDetails.js";

const human = (s = "") => s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const person = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Courier";

export default function ParcelFlow({ base = "/admin" }) {
    const [data, setData] = useState({
        hubs: [],
        areas: [],
        transfers: [],
        returns: [],
        deliveries: [],
        couriers: [],
        current_user_hub: null,
        incoming_shipments: [],
    });
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [choices, setChoices] = useState({});
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [activeSection, setActiveSection] = useState("network");
    const [shipmentForm, setShipmentForm] = useState({ fromHubId: "", toHubId: "", carrierCode: "manual", carrierName: "", trackingReference: "", shipmentReference: "" });
    const [selectedTransferDeliveryIds, setSelectedTransferDeliveryIds] = useState([]);
    const [arrivalParcelCodes, setArrivalParcelCodes] = useState({});
    const [verifiedArrivalCodes, setVerifiedArrivalCodes] = useState({});
    const [arrivalTrackingReferences, setArrivalTrackingReferences] = useState({});
    const [shipmentDetails, setShipmentDetails] = useState({});
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data: result } = await api.get(`${base}/parcel-flow`);
            const payload = result?.data;
            if (!payload || typeof payload !== "object") {
                throw new Error("The parcel operations response was incomplete.");
            }
            setData({
                hubs: Array.isArray(payload.hubs) ? payload.hubs : [],
                areas: Array.isArray(payload.areas) ? payload.areas : [],
                transfers: Array.isArray(payload.transfers) ? payload.transfers : [],
                returns: Array.isArray(payload.returns) ? payload.returns : [],
                deliveries: Array.isArray(payload.deliveries) ? payload.deliveries : [],
                couriers: Array.isArray(payload.couriers) ? payload.couriers : [],
                current_user_hub: payload.current_user_hub || null,
                incoming_shipments: Array.isArray(payload.incoming_shipments) ? payload.incoming_shipments : [],
            });
            setLoaded(true);
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Parcel operations could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [base]);
    useEffect(() => {
        const t = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(t);
    }, [load]);
    const run = async (action, success) => {
        if (busy) return false;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await action();
            setNotice(success);
            await load();
            return true;
        } catch (e) {
            const firstValidationError = Object.values(e.response?.data?.errors || {}).flat()[0];
            setError(firstValidationError || e.response?.data?.message || e.message || "Unable to update parcel operations.");
            return false;
        } finally {
            setBusy(false);
        }
    };
    const courierOptions = (
        <>
            <option value="">Choose courier</option>
            {data.couriers.map((c) => (
                <option key={c.id} value={c.id}>
                    {person(c.user)}
                </option>
            ))}
        </>
    );
    const availableDirectCourierOptions = (
        <>
            <option value="">Choose active, available courier</option>
            {data.couriers.filter((courier) => courier.is_available).map((courier) => (
                <option key={courier.id} value={courier.id}>
                    {person(courier.user)}
                </option>
            ))}
        </>
    );
    const assign = (shipment, leg) =>
        run(
            () =>
                api.post(`${base}/parcel-returns/${shipment.id}/assign-courier`, {
                    leg,
                    courier_profile_id: choices[`return-${shipment.id}-${leg}`],
                }),
            `Courier assigned to return #${shipment.id}.`
        );
    const receive = (shipment) =>
        run(
            () => {
                const hubId = choices[`hub-${shipment.id}`];
                if (!hubId) throw new Error("Choose an active hub before receiving this return.");
                return api.patch(`${base}/parcel-returns/${shipment.id}/receive-at-hub`, {
                    hub_id: hubId,
                });
            },
            `Return #${shipment.id} received at hub.`
        );
    const activeHubs = data.hubs.filter((hub) => hub.is_active);
    const transfer = (type, id) =>
        run(
            () => {
                const payload = {
                    shipment_type: type,
                    shipment_id: id,
                    courier_profile_id: choices[`transfer-${type}-${id}`],
                };
                if (type === "delivery") {
                    const delivery = data.deliveries.find((item) => Number(item.id) === Number(id));
                    const hasAutomaticRoute = ["mapped", "mapping_conflict", "manual_route"].includes(delivery?.destination_route?.status);
                    const routeArea = delivery?.destination_route?.area || delivery?.delivery_area;
                    payload.delivery_area_id = hasAutomaticRoute ? routeArea?.id : choices[`area-delivery-${id}`];
                    payload.note = choices[`route-note-${id}`] || undefined;
                } else {
                    payload.to_hub_id = choices[`to-${type}-${id}`];
                }
                return api.post(`${base}/hub-transfers`, payload);
            },
            `Hub transfer created for ${type} #${id}.`
        );
    const directDelivery = (delivery) =>
        run(
            () =>
                api.post(`${base}/orders/${delivery.order_id}/direct-delivery`, {
                    courier_profile_id: choices[`direct-delivery-${delivery.id}`],
                    expected_status: delivery.status,
                }),
            `Order #${delivery.order_id} assigned for direct delivery.`,
        );
    const bulkShipmentCandidates = data.deliveries
        .filter((delivery) => delivery.bulk_shipment_available)
        .sort((first, second) =>
            String(first.seller_origin?.municipality || "").localeCompare(String(second.seller_origin?.municipality || ""))
            || String(first.buyer_destination?.municipality || "").localeCompare(String(second.buyer_destination?.municipality || ""))
            || Number(first.id) - Number(second.id));
    const bulkOriginHubs = [...new Map(bulkShipmentCandidates
        .filter((delivery) => delivery.seller_origin?.hub?.id)
        .map((delivery) => [String(delivery.seller_origin.hub.id), {
            ...delivery.seller_origin.hub,
            municipality: delivery.seller_origin.municipality,
        }])).values()]
        .sort((first, second) => String(first.name).localeCompare(String(second.name)));
    const bulkDestinationHubs = [...new Map(bulkShipmentCandidates
        .filter((delivery) => !shipmentForm.fromHubId || String(delivery.seller_origin?.hub?.id) === String(shipmentForm.fromHubId))
        .filter((delivery) => delivery.buyer_destination?.hub?.id)
        .map((delivery) => [String(delivery.buyer_destination.hub.id), {
            ...delivery.buyer_destination.hub,
            municipality: delivery.buyer_destination.municipality,
        }])).values()]
        .sort((first, second) => String(first.name).localeCompare(String(second.name)));
    const availableShipmentDeliveries = bulkShipmentCandidates.filter((delivery) =>
        (!shipmentForm.fromHubId || String(delivery.seller_origin?.hub?.id) === String(shipmentForm.fromHubId))
        && (!shipmentForm.toHubId || String(delivery.buyer_destination?.hub?.id) === String(shipmentForm.toHubId)));
    const thirdPartyShipments = groupThirdPartyShipments(data.transfers);
    const incomingShipmentCount = data.incoming_shipments.reduce((count, shipment) => count + (shipment.items?.length || 0), 0);
    const addToBulkShipment = (delivery) => {
        const originHubId = String(delivery.seller_origin?.hub?.id || "");
        const destinationHubId = String(delivery.buyer_destination?.hub?.id || "");
        if (!originHubId || !destinationHubId) return;
        if (selectedTransferDeliveryIds.length && (
            shipmentForm.fromHubId !== originHubId || shipmentForm.toHubId !== destinationHubId
        )) {
            setError("A bulk shipment can only include parcels with the same seller-origin and buyer-destination hubs. Finish or clear the current selection first.");
            return;
        }
        setError("");
        setShipmentForm((current) => ({ ...current, fromHubId: originHubId, toHubId: destinationHubId }));
        setSelectedTransferDeliveryIds((current) => current.some((id) => Number(id) === Number(delivery.id))
            ? current
            : [...current, String(delivery.id)]);
    };
    const createThirdPartyShipment = async (event) => {
        event.preventDefault();
        const deliveryIds = selectedTransferDeliveryIds.filter((id) =>
            availableShipmentDeliveries.some((delivery) => Number(delivery.id) === Number(id)));
        if (!deliveryIds.length) {
            setError("Add at least one parcel with the selected seller-origin and buyer-destination hubs.");
            return;
        }
        if (!shipmentForm.fromHubId || !shipmentForm.toHubId || Number(shipmentForm.fromHubId) === Number(shipmentForm.toHubId)) {
            setError("Choose different active origin and destination hubs.");
            return;
        }
        if (!shipmentForm.carrierName.trim() || !shipmentForm.trackingReference.trim()) {
            setError("Enter the carrier name and tracking reference.");
            return;
        }
        const payload = buildThirdPartyShipmentPayload({
            deliveryIds,
            fromHubId: shipmentForm.fromHubId,
            toHubId: shipmentForm.toHubId,
            carrierCode: shipmentForm.carrierCode,
            carrierName: shipmentForm.carrierName,
            trackingReference: shipmentForm.trackingReference,
            shipmentReference: shipmentForm.shipmentReference,
        });
        const completed = await run(
            () => api.post(`${base}/hub-transfer-shipments`, payload),
            "Third-party shipment created. Record each parcel's arrival by scanning every item at the destination.",
        );
        if (completed) {
            setSelectedTransferDeliveryIds([]);
            setShipmentForm({ fromHubId: "", toHubId: "", carrierCode: "manual", carrierName: "", trackingReference: "", shipmentReference: "" });
        }
    };
    const receiveShipmentByTrackingReference = (shipmentReference) => void run(
        () => {
            const trackingReference = arrivalTrackingReferences[shipmentReference]?.trim();
            if (!trackingReference) throw new Error("Enter the shipment tracking reference to confirm arrival.");
            return api.patch(`${base}/hub-transfer-shipments/${encodeURIComponent(shipmentReference)}/receive`, {
                tracking_reference: trackingReference,
            });
        },
        `Shipment ${shipmentReference} received at ${data.current_user_hub?.name || "your hub"}.`,
    ).then((completed) => {
        if (completed) {
            setArrivalTrackingReferences((current) => ({ ...current, [shipmentReference]: "" }));
        }
    });
    const fetchCompleteShipment = async (shipmentReference) => {
        const response = await api.get(`${base}/hub-transfer-shipments/${encodeURIComponent(shipmentReference)}`);
        const normalized = normalizeCompleteHubShipment(response.data?.data);
        setShipmentDetails((current) => ({ ...current, [shipmentReference]: normalized }));
        return normalized;
    };
    const clearShipmentDetail = (shipmentReference) => {
        setShipmentDetails((current) => {
            const next = { ...current };
            delete next[shipmentReference];
            return next;
        });
    };
    const dispatchThirdPartyShipment = (shipmentReference) => run(
        async () => {
            const detail = await fetchCompleteShipment(shipmentReference);
            if (!detail.items.every((item) => item.status === "assigned")) {
                throw new Error("Every parcel must be assigned to this shipment before dispatch.");
            }
            await api.patch(`${base}/hub-transfer-shipments/${encodeURIComponent(shipmentReference)}/dispatch`, {});
            clearShipmentDetail(shipmentReference);
        },
        `Third-party shipment ${shipmentReference} dispatched.`,
    );
    const verifyArrivalCode = (transfer, candidate) => {
        if (!parcelCodeMatches(transfer.delivery?.parcel_code, candidate)) {
            setVerifiedArrivalCodes((current) => ({ ...current, [transfer.id]: "" }));
            setError(`Parcel code does not match transfer #${transfer.id}.`);
            return;
        }
        const normalized = candidate.trim().toUpperCase();
        setArrivalParcelCodes((current) => ({ ...current, [transfer.id]: normalized }));
        setVerifiedArrivalCodes((current) => ({ ...current, [transfer.id]: normalized }));
        setError("");
    };
    const receiveThirdPartyShipment = (shipmentReference) => void run(
        async () => {
            const detail = await fetchCompleteShipment(shipmentReference);
            const allInTransit = detail.items.every((item) => item.status === "in_transit");
            const allVerified = detail.items.every((transfer) =>
                parcelCodeMatches(transfer.delivery?.parcel_code, verifiedArrivalCodes[transfer.id]));
            if (!allInTransit || !allVerified) {
                throw new Error("Verify the parcel code for every in-transit item before receiving this shipment.");
            }
            const payload = buildThirdPartyReceivePayload(detail.items, verifiedArrivalCodes);
            await api.patch(`${base}/hub-transfer-shipments/${encodeURIComponent(shipmentReference)}/receive`, payload);
            clearShipmentDetail(shipmentReference);
        },
        `Every parcel in shipment ${shipmentReference} was verified and received.`,
    );
    return (
        <main className="lo-page lo-parcel-flow">
            <header className="lw-page-heading">
                <div><span className="lw-eyebrow">LOGISTICS CONTROL</span><h1>Hub and delivery area management</h1><p>Manage the operating network, delivery-area coverage, and hub transfers.</p></div>
                <div className="lo-parcel-flow-heading-actions">
                    <button
                        type="button"
                        className={`lo-proceed-bulk${bulkShipmentCandidates.length ? " is-ready" : ""}`}
                        onClick={() => setActiveSection("transfers")}
                        aria-label={`Proceed to Bulk Ship; ${bulkShipmentCandidates.length} eligible parcels`}
                    >
                        Proceed to Bulk Ship <span>{selectedTransferDeliveryIds.length || bulkShipmentCandidates.length}</span>
                    </button>
                    <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
                </div>
            </header>
            {error && <div className="lw-alert" role="alert">{error}</div>}
            {notice && <div className="lo-success" role="status">{notice}</div>}
            <datalist id={`${base}-active-hubs`}>
                {activeHubs.map((hub) => <option key={hub.id} value={`${hub.name} · ${hub.code}`} />)}
            </datalist>
            <datalist id={`${base}-active-areas`}>
                {data.areas.filter((area) => area.is_active && area.hub_id && area.hub?.is_active).map((area) => (
                    <option key={area.id} value={`${area.name} · ${area.hub?.name || "Hub unavailable"}`} />
                ))}
            </datalist>
            <nav className="lo-parcel-tabs" aria-label="Parcel operations sections">
                <button type="button" className={activeSection === "network" ? "is-current" : ""} aria-pressed={activeSection === "network"} onClick={() => setActiveSection("network")}>
                    Network setup <span>{data.hubs.length.toLocaleString()}</span>
                </button>
                <button type="button" className={activeSection === "transfers" ? "is-current" : ""} aria-pressed={activeSection === "transfers"} onClick={() => setActiveSection("transfers")}>
                    Hub transfers <span>{data.transfers.filter((transfer) => ["assigned", "in_transit"].includes(transfer.status)).length}</span>
                </button>
                {base === "/logistics" && <button type="button" className={activeSection === "arrivals" ? "is-current" : ""} aria-pressed={activeSection === "arrivals"} onClick={() => setActiveSection("arrivals")}>
                    Hub Transfer Arrivals <span>{incomingShipmentCount}</span>
                </button>}
                <button type="button" className={activeSection === "returns" ? "is-current" : ""} aria-pressed={activeSection === "returns"} onClick={() => setActiveSection("returns")}>
                    Returns <span>{data.returns.length}</span>
                </button>
            </nav>
            {!loaded && loading ? <p className="lw-empty" role="status">Loading hub and delivery area records…</p> : loaded && activeSection === "network" ? <HubAreaManagement base={base} data={data} busy={busy} run={run} /> : !loaded ? <p className="lw-empty">Hub and delivery area records are unavailable. Use Refresh to try again.</p> : null}
            {activeSection === "returns" && <section className="lo-parcel-section lo-return-queue">
                <h2>Return parcels</h2>
                <p>
                    Process refund returns and parcels returned after three unsuccessful delivery
                    attempts. Receive parcels at a hub, route them hub-to-hub if needed, then assign
                    delivery to the seller. Record refunds only after seller receipt.
                </p>
                {data.returns.length ? (
                    data.returns.map((r) => (
                        <details className="lo-return-item" key={r.id}>
                            <summary>
                                <strong>Return #{r.id} · Order #{r.order_id}</strong>
                                <span className="lo-return-status">{human(r.status)}</span>
                                <small>{r.return_type === "undeliverable" ? "Undeliverable parcel" : "Refund return"} · {person(r.buyer)} · {r.current_hub?.name || "Not received at hub"}</small>
                            </summary>
                            <div className="lo-return-item-body">
                            <p>
                                Buyer: {person(r.buyer)} · Seller: {person(r.seller)} · Hub:{" "}
                                {r.current_hub?.name || "Not received"}
                            </p>
                            {r.return_type === "undeliverable" && <p>Return reason: {r.return_reason || "Three unsuccessful delivery attempts"}</p>}
                            {r.status === "awaiting_pickup" && (
                                <div>
                                    <select
                                        value={choices[`return-${r.id}-pickup`] || ""}
                                        onChange={(e) =>
                                            setChoices({
                                                ...choices,
                                                [`return-${r.id}-pickup`]: e.target.value,
                                            })
                                        }
                                    >
                                        {courierOptions}
                                    </select>
                                    <button
                                        disabled={busy || !choices[`return-${r.id}-pickup`]}
                                        onClick={() => void assign(r, "pickup")}
                                    >
                                        Assign buyer pickup
                                    </button>
                                </div>
                            )}
                            {r.status === "picked_up" && (
                                <div>
                                    <AdminSearchField
                                        className="lo-parcel-search-field"
                                        list={`${base}-active-hubs`}
                                        ariaLabel={`Choose a hub to receive return ${r.id}`}
                                        placeholder="Search hub by LGU or code"
                                        value={activeHubs.find((hub) => String(hub.id) === String(choices[`hub-${r.id}`])) ? `${activeHubs.find((hub) => String(hub.id) === String(choices[`hub-${r.id}`])).name} · ${activeHubs.find((hub) => String(hub.id) === String(choices[`hub-${r.id}`])).code}` : ""}
                                        onChange={(event) => {
                                            const selectedHub = activeHubs.find((hub) => `${hub.name} · ${hub.code}` === event.target.value);
                                            setChoices({ ...choices, [`hub-${r.id}`]: selectedHub?.id || "" });
                                        }}
                                    />
                                    <button disabled={busy} onClick={() => void receive(r)}>
                                        Confirm hub receipt
                                    </button>
                                </div>
                            )}
                            {r.status === "at_hub" && (
                                <div>
                                    <select
                                        value={choices[`return-${r.id}-delivery`] || ""}
                                        onChange={(e) =>
                                            setChoices({
                                                ...choices,
                                                [`return-${r.id}-delivery`]: e.target.value,
                                            })
                                        }
                                    >
                                        {courierOptions}
                                    </select>
                                    <button
                                        disabled={busy || !choices[`return-${r.id}-delivery`]}
                                        onClick={() => void assign(r, "delivery")}
                                    >
                                        Assign seller delivery
                                    </button>
                                </div>
                            )}
                            {r.status === "delivered" && (
                                <p>Waiting for seller to confirm the returned parcel.</p>
                            )}
                            </div>
                        </details>
                    ))
                ) : (
                    <p className="lo-parcel-empty">No approved returns requiring parcel movement.</p>
                )}
            </section>}
            {activeSection === "arrivals" && base === "/logistics" && <section className="lo-parcel-section lo-transfer-queue">
                <h2>Hub Transfer Arrivals</h2>
                <p>Shipments addressed to your municipality hub appear here. Confirm each arrival by entering its carrier tracking reference; every parcel in the shipment is received together.</p>
                {data.current_user_hub
                    ? <p className="lo-arrival-hub">Assigned municipality hub: <strong>{data.current_user_hub.name} · {data.current_user_hub.code}</strong></p>
                    : <p className="lo-parcel-empty" role="alert">Your logistics account address does not map to an active municipality hub. Update the account address or ask an administrator to map that municipality before receiving shipments.</p>}
                {data.incoming_shipments.length === 0 && data.current_user_hub && <p className="lo-parcel-empty">No in-transit bulk shipments are addressed to this hub.</p>}
                {data.incoming_shipments.map((shipment) => <article className="lo-transfer-card lo-third-party-shipment" key={shipment.shipment_reference}>
                    <strong>Shipment {shipment.shipment_reference} | {shipment.carrier_name || "Carrier unavailable"}</strong>
                    <span>{shipment.origin_hub?.name || "Origin unavailable"} → {shipment.destination_hub?.name || "Destination unavailable"}</span>
                    <small>Tracking reference required · {shipment.items?.length || 0} parcel(s)</small>
                    <ul className="lo-arrival-parcel-list">{(shipment.items || []).map((item) => <li key={item.id}>
                        {item.parcel_code || `Parcel #${item.delivery_id}`} · Order #{item.order_id} · {human(item.status)}
                    </li>)}</ul>
                    <label className="lo-arrival-reference">Type the shipment tracking reference
                        <input
                            autoComplete="off"
                            value={arrivalTrackingReferences[shipment.shipment_reference] || ""}
                            onChange={(event) => setArrivalTrackingReferences((current) => ({ ...current, [shipment.shipment_reference]: event.target.value }))}
                        />
                    </label>
                    <button
                        type="button"
                        disabled={busy || !arrivalTrackingReferences[shipment.shipment_reference]?.trim() || !data.current_user_hub}
                        onClick={() => receiveShipmentByTrackingReference(shipment.shipment_reference)}
                    >
                        Confirm shipment arrival
                    </button>
                </article>)}
            </section>}
            {activeSection === "transfers" && <section className="lo-parcel-section lo-transfer-queue">
                <h2>Hub-to-hub transfers</h2>
                <p>The existing courier transfer path remains available below. Bulk shipment candidates are grouped by seller pickup municipality and buyer destination municipality; Flash Express is recorded as metadata only and does not connect to an external API.</p>
                <form className="lo-third-party-shipment-form" onSubmit={(event) => void createThirdPartyShipment(event)}>
                    <h3>Create a manual bulk shipment</h3>
                    <div className="lo-parcel-item lo-transfer-inputs">
                        <label>Seller municipality / origin hub<select disabled={selectedTransferDeliveryIds.length > 0} value={shipmentForm.fromHubId} onChange={(event) => setShipmentForm((current) => ({ ...current, fromHubId: event.target.value, toHubId: "" }))}><option value="">Choose seller municipality</option>{bulkOriginHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.municipality || hub.location_label || hub.name} · {hub.name} | {hub.code}</option>)}</select></label>
                        <label>Buyer municipality / destination hub<select disabled={!shipmentForm.fromHubId || selectedTransferDeliveryIds.length > 0} value={shipmentForm.toHubId} onChange={(event) => setShipmentForm((current) => ({ ...current, toHubId: event.target.value }))}><option value="">Choose buyer municipality</option>{bulkDestinationHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.municipality || hub.location_label || hub.name} · {hub.name} | {hub.code}</option>)}</select></label>
                        <label>Carrier<select value={shipmentForm.carrierCode} onChange={(event) => setShipmentForm((current) => ({ ...current, carrierCode: event.target.value, carrierName: event.target.value === "flash_express" ? "Flash Express" : current.carrierName === "Flash Express" ? "" : current.carrierName }))}><option value="manual">Manual carrier</option><option value="flash_express">Flash Express (metadata only)</option></select></label>
                        <label>Carrier name<input required maxLength={100} value={shipmentForm.carrierName} onChange={(event) => setShipmentForm((current) => ({ ...current, carrierName: event.target.value }))} /></label>
                        <label>Tracking reference<input required maxLength={120} value={shipmentForm.trackingReference} onChange={(event) => setShipmentForm((current) => ({ ...current, trackingReference: event.target.value }))} /></label>
                        <label>Shipment reference (optional)<input maxLength={64} value={shipmentForm.shipmentReference} onChange={(event) => setShipmentForm((current) => ({ ...current, shipmentReference: event.target.value }))} /></label>
                    </div>
                    <p>Choose an origin to filter by the sellers’ pickup municipalities, then choose a destination filtered by the buyers’ municipalities. A shipment can contain up to 100 parcels with the same route.</p>
                    {availableShipmentDeliveries.length === 0 ? <p className="lo-parcel-empty">{bulkShipmentCandidates.length ? "Choose an origin hub to view parcels for that seller-to-buyer route." : "No parcels currently have both a mapped seller-origin hub and buyer-destination hub."}</p> : <div className="lo-bulk-candidate-list" aria-label="Parcels for bulk shipment">{availableShipmentDeliveries.map((delivery) => {
                        const added = selectedTransferDeliveryIds.some((id) => Number(id) === Number(delivery.id));
                        return <article className="lo-bulk-candidate" key={delivery.id}>
                            <span><strong>Order #{delivery.order_id}</strong> · {delivery.parcel_code || `Parcel #${delivery.id}`} · {human(delivery.status)}<small>{delivery.seller_origin?.municipality || "Seller municipality unavailable"} → {delivery.buyer_destination?.municipality || "Buyer municipality unavailable"} · {delivery.current_hub?.name || "Hub unavailable"}</small></span>
                            <button type="button" disabled={busy || added || selectedTransferDeliveryIds.length >= 100} onClick={() => addToBulkShipment(delivery)}>{added ? "Added to Bulk Shipment" : "Add to Bulk Shipment"}</button>
                        </article>;
                    })}</div>}
                    {selectedTransferDeliveryIds.length > 0 && <div className="lo-bulk-staged-list">
                        <strong>Staged parcels ({selectedTransferDeliveryIds.length}/100)</strong>
                        {data.deliveries.filter((delivery) => selectedTransferDeliveryIds.some((id) => Number(id) === Number(delivery.id))).map((delivery) => <div key={delivery.id}>
                            <span>{delivery.parcel_code || `Parcel #${delivery.id}`} · {delivery.seller_origin?.municipality} → {delivery.buyer_destination?.municipality}</span>
                            <button type="button" disabled={busy} onClick={() => setSelectedTransferDeliveryIds((current) => current.filter((id) => Number(id) !== Number(delivery.id)))}>Remove</button>
                        </div>)}
                        <button type="button" disabled={busy} onClick={() => setSelectedTransferDeliveryIds([])}>Clear staged parcels</button>
                    </div>}
                    <div className="lo-parcel-item"><small>{selectedTransferDeliveryIds.length} parcel(s) staged. Backend accepts 1 to 100 unique delivery IDs.</small>
                        <button type="submit" disabled={busy || !selectedTransferDeliveryIds.length || !shipmentForm.fromHubId || !shipmentForm.toHubId || !shipmentForm.carrierName.trim() || !shipmentForm.trackingReference.trim()}>Create third-party shipment</button>
                    </div>
                </form>
                <h3>Manual carrier shipments</h3>
                {thirdPartyShipments.length === 0 && <p className="lo-parcel-empty">No manual carrier shipments are in the operations response.</p>}
                {thirdPartyShipments.map(({ shipmentReference, items }) => {
                    const detail = shipmentDetails[shipmentReference];
                    const shipmentItems = detail?.items ?? items;
                    const hasCompleteItems = !!detail && detail.items.length === Number(detail.total_items);
                    const first = shipmentItems[0] || items[0];
                    const allAssigned = hasCompleteItems && shipmentItems.length > 0 && shipmentItems.every((item) => item.status === "assigned");
                    const allInTransit = hasCompleteItems && shipmentItems.length > 0 && shipmentItems.every((item) => item.status === "in_transit");
                    const allArrived = hasCompleteItems && shipmentItems.length > 0 && shipmentItems.every((item) => item.status === "arrived");
                    return <article className="lo-transfer-card lo-third-party-shipment" key={shipmentReference}>
                        <strong>Shipment {shipmentReference} | {first.carrier_name || first.carrier_code || "Carrier unavailable"}</strong>
                        <span>{first.from_hub?.name || "Origin unavailable"} | {first.to_hub?.name || "Destination unavailable"}</span>
                        <small>Carrier: {first.carrier_code === "flash_express" ? "Flash Express metadata only" : first.carrier_name} | Tracking: {first.tracking_reference || "Not recorded"}</small>
                        <small>{detail?.total_items ?? items.length} parcel(s) | {human(first.status)}</small>
                        {!hasCompleteItems && <button type="button" disabled={busy} onClick={() => void run(() => fetchCompleteShipment(shipmentReference), `Loaded all parcels in shipment ${shipmentReference}.`)}>Load complete shipment items</button>}
                        {shipmentItems.map((item) => {
                            const parcelCode = item.delivery?.parcel_code || "";
                            const verified = !!parcelCode && verifiedArrivalCodes[item.id] === parcelCode.toUpperCase();
                            return <div className="lo-third-party-shipment-item" key={item.id}>
                                <span>Transfer #{item.id} | Delivery #{item.delivery?.id || item.delivery_id} | {parcelCode || "Parcel code unavailable"} | {human(item.status)}</span>
                                {allInTransit && base !== "/logistics" && <div className="lo-parcel-item lo-transfer-item-verification"><label>Arrival code for transfer #{item.id}<input aria-label={`Arrival parcel code for transfer ${item.id}`} autoComplete="off" value={arrivalParcelCodes[item.id] || ""} onChange={(event) => { setArrivalParcelCodes((current) => ({ ...current, [item.id]: event.target.value })); setVerifiedArrivalCodes((current) => ({ ...current, [item.id]: "" })); }} /></label><button type="button" disabled={busy || !arrivalParcelCodes[item.id]} onClick={() => verifyArrivalCode(item, arrivalParcelCodes[item.id])}>{verified ? "Verified" : "Verify item"}</button>{verified && <small role="status">Parcel code matches this item.</small>}</div>}
                            </div>;
                        })}
                        {allAssigned && <button type="button" disabled={busy} onClick={() => void dispatchThirdPartyShipment(shipmentReference)}>Dispatch whole shipment</button>}
                        {allInTransit && base === "/logistics" && <small>Confirm the arrival from the Hub Transfer Arrivals tab using the shipment tracking reference.</small>}
                        {allInTransit && base !== "/logistics" && <button type="button" disabled={busy || !shipmentItems.every((item) => verifiedArrivalCodes[item.id] === item.delivery?.parcel_code?.toUpperCase())} onClick={() => receiveThirdPartyShipment(shipmentReference)}>Receive verified shipment</button>}
                        {allArrived && <small role="status">Every listed parcel has arrived.</small>}
                    </article>;
                })}
                <h3>All available hub items ({data.deliveries.length})</h3>
                <p>Items from every hub are listed below. Use a hub transfer when the buyer’s delivery hub is elsewhere, or choose Direct Delivery to assign an active, available rider globally and skip the destination hub.</p>
                {data.deliveries.map((d) => {
                    const route = d.destination_route;
                    const areaIsMapped = ["mapped", "mapping_conflict", "manual_route"].includes(route?.status);
                    const routeArea = route?.area || d.delivery_area;
                    const selectedAreaId = areaIsMapped ? routeArea?.id : choices[`area-delivery-${d.id}`] || "";
                    const selectedArea = areaIsMapped ? routeArea : data.areas.find((area) => Number(area.id) === Number(selectedAreaId));
                    const destinationHub = selectedArea?.hub;
                    const transferNeeded = selectedArea
                        ? Number(selectedArea.hub_id) !== Number(d.current_hub_id)
                        : d.requires_transfer;
                    const needsNote = !!d.order?.delivery_psgc_code && !["mapped", "mapping_conflict"].includes(route?.status);
                    const verifiedAtCurrentHub = d.events?.some((event) =>
                        Number(event.hub_id) === Number(d.current_hub_id)
                        && ["parcel_scanned", "hub_transfer_arrived"].includes(event.event_type));
                    return (
                        <details className="lo-transfer-prepare" key={`d${d.id}`}>
                            <summary>
                                <strong>Order #{d.order_id} · {human(d.status)}</strong>
                                <span>{d.seller_origin?.municipality ? `${d.seller_origin.municipality} · ` : ""}{d.current_hub?.name || "Unknown hub"} → {d.buyer_destination?.municipality ? `${d.buyer_destination.municipality} · ` : ""}{destinationHub?.name || (d.requires_transfer ? "Routing exception" : "Buyer")}</span>
                            </summary>
                            <div className="lo-parcel-item">
                                {d.bulk_shipment_available && <button
                                    type="button"
                                    disabled={busy || selectedTransferDeliveryIds.some((id) => Number(id) === Number(d.id)) || selectedTransferDeliveryIds.length >= 100}
                                    onClick={() => addToBulkShipment(d)}
                                >
                                    {selectedTransferDeliveryIds.some((id) => Number(id) === Number(d.id)) ? "Added to Bulk Shipment" : "Add to Bulk Shipment"}
                                </button>}
                                <span>
                                    <strong>{route?.status === "manual_route" ? "Approved exception route" : "Automatic destination route"}</strong><br />
                                    {selectedArea
                                        ? `${selectedArea.name} · ${destinationHub?.name || "Hub unavailable"}`
                                        : "No unique destination area is mapped for this address."}
                                    {route?.status === "mapping_conflict" && <small className="lo-warning">The saved area conflicts with the address mapping; the address mapping will be used.</small>}
                                    {route?.status === "manual_route" && <small className="lo-warning">Manually resolved because the automatic route is {human(route.source_status || "unavailable").toLowerCase()}.</small>}
                                </span>
                                {!areaIsMapped && (
                                    <AdminSearchField
                                        className="lo-parcel-search-field"
                                        list={`${base}-active-areas`}
                                        ariaLabel={`Routing exception area for order ${d.order_id}`}
                                        placeholder="Resolve route by delivery area"
                                        value={(() => {
                                            const area = data.areas.find((item) => String(item.id) === String(choices[`area-delivery-${d.id}`]));
                                            return area ? `${area.name} · ${area.hub?.name || "Hub unavailable"}` : "";
                                        })()}
                                        onChange={(event) => {
                                            const area = data.areas.find((item) => item.is_active && item.hub?.is_active
                                                && `${item.name} · ${item.hub?.name || "Hub unavailable"}` === event.target.value);
                                            setChoices({ ...choices, [`area-delivery-${d.id}`]: area?.id || "" });
                                        }}
                                    />
                                )}
                                {needsNote && <input
                                    aria-label={`Routing exception note for order ${d.order_id}`}
                                    placeholder="Explain the manual route"
                                    maxLength={1000}
                                    value={choices[`route-note-${d.id}`] || ""}
                                    onChange={(event) => setChoices({ ...choices, [`route-note-${d.id}`]: event.target.value })}
                                />}
                                {transferNeeded ? (
                                    <>
                                        <label>
                                            Transfer courier
                                            <select
                                                value={choices[`transfer-delivery-${d.id}`] || ""}
                                                onChange={(event) => setChoices({ ...choices, [`transfer-delivery-${d.id}`]: event.target.value })}
                                            >
                                                {courierOptions}
                                            </select>
                                        </label>
                                        <button
                                            disabled={busy || !selectedAreaId || !choices[`transfer-delivery-${d.id}`] || (needsNote && !choices[`route-note-${d.id}`]?.trim())}
                                            onClick={() => void transfer("delivery", d.id)}
                                        >
                                            Create transfer to {destinationHub?.name || "destination hub"}
                                        </button>
                                    </>
                                ) : <p>This parcel is already at its delivery hub; no hub transfer is needed.</p>}
                                <label>
                                    Direct delivery rider (global, active and available)
                                    <select
                                        value={choices[`direct-delivery-${d.id}`] || ""}
                                        onChange={(event) => setChoices({ ...choices, [`direct-delivery-${d.id}`]: event.target.value })}
                                    >
                                        {availableDirectCourierOptions}
                                    </select>
                                </label>
                                <small>Direct delivery goes from the current hub straight to the buyer; no destination hub transfer is created.</small>
                                {!verifiedAtCurrentHub && <small className="lo-warning">Scan or receive this parcel at its current hub before assigning direct delivery.</small>}
                                <button
                                    disabled={busy || !verifiedAtCurrentHub || !choices[`direct-delivery-${d.id}`]}
                                    onClick={() => void directDelivery(d)}
                                >
                                    Direct Delivery
                                </button>
                            </div>
                        </details>
                    );
                })}
                {data.deliveries.length === 0 && !data.returns.some((item) => item.status === "at_hub") && (
                    <p className="lo-parcel-empty">No parcels are currently available for transfer or direct delivery.</p>
                )}
                {data.returns
                    .filter((r) => r.status === "at_hub")
                    .map((r) => (
                        <details className="lo-transfer-prepare" key={`r${r.id}`}>
                            <summary><strong>Return #{r.id}</strong><span>From {r.current_hub?.name || "current hub"} · choose destination</span></summary>
                            <div className="lo-parcel-item">
                            <span>
                                Return #{r.id} from {r.current_hub?.name}
                            </span>
                            <select
                                value={choices[`to-return-${r.id}`] || ""}
                                onChange={(e) =>
                                    setChoices({
                                        ...choices,
                                        [`to-return-${r.id}`]: e.target.value,
                                    })
                                }
                            >
                                <option value="">To hub</option>
                                {activeHubs
                                    .filter((h) => Number(h.id) !== Number(r.current_hub_id))
                                    .map((h) => (
                                        <option key={h.id} value={h.id}>
                                            {h.name}
                                        </option>
                                    ))}
                            </select>
                            <select
                                value={choices[`transfer-return-${r.id}`] || ""}
                                onChange={(e) =>
                                    setChoices({
                                        ...choices,
                                        [`transfer-return-${r.id}`]: e.target.value,
                                    })
                                }
                            >
                                {courierOptions}
                            </select>
                            <button
                                disabled={
                                    busy ||
                                    !choices[`to-return-${r.id}`] ||
                                    !choices[`transfer-return-${r.id}`]
                                }
                                onClick={() => void transfer("return", r.id)}
                            >
                                Create transfer
                            </button>
                            </div>
                        </details>
                    ))}
                <div className="lo-transfer-stage-summary" role="list" aria-label="Hub transfer stages">
                    {[
                        ['Awaiting Hub Staff release', data.transfers.filter((item) => item.delivery_id && !item.return_shipment_id && item.status === 'assigned' && !item.hub_released_at).length],
                        ['Awaiting Rider collection', data.transfers.filter((item) => item.delivery_id && !item.return_shipment_id && item.status === 'assigned' && item.hub_released_at).length],
                        ['In transit', data.transfers.filter((item) => item.status === 'in_transit').length],
                        ['Arrived', data.transfers.filter((item) => item.status === 'arrived').length],
                    ].map(([label, count]) => <article key={label} role="listitem"><span>{label}</span><strong>{count}</strong></article>)}
                </div>
                {data.transfers.slice(0, 100).map((t) => (
                    <article className="lo-transfer-card" key={t.id}>
                        Transfer #{t.id}:{" "}
                        {t.delivery_id
                            ? `Order #${t.delivery?.order_id}`
                            : `Return #${t.return_shipment_id}`}{" "}
                        · {t.from_hub?.name} → {t.to_hub?.name} · {human(t.status)} ·{" "}
                        {person(t.courier?.user)}
                        <small>Current custody: {t.delivery?.current_hub?.name || t.return_shipment?.current_hub?.name || (t.status === 'arrived' ? t.to_hub?.name : t.from_hub?.name) || 'Hub unavailable'}</small>
                        {t.delivery_id && !t.return_shipment_id && t.status === 'assigned' && <small>{t.hub_released_at ? 'Awaiting Rider collection confirmation' : 'Awaiting Hub Staff release'}</small>}
                        {t.return_shipment_id && t.status === 'assigned' && <small>Return transfer prepared; existing return dispatch flow applies.</small>}
                        {t.status === 'in_transit' && <small>In transit - awaiting QR receipt at destination</small>}
                        {t.status === 'arrived' && <small>Arrived - destination receipt confirmed</small>}
                        {t.hub_released_at && <small>Hub Staff release{t.hub_release_actor ? ": " + person(t.hub_release_actor) + " - " : " - "}{new Date(t.hub_released_at).toLocaleString('en-PH')}</small>}
                        {t.rider_collected_at && <small>Rider collection{t.rider_collection_actor ? ": " + person(t.rider_collection_actor) + " - " : " - "}{new Date(t.rider_collected_at).toLocaleString('en-PH')}</small>}
                        {t.departed_at && <small>Departed: {new Date(t.departed_at).toLocaleString('en-PH')}</small>}
                        {t.arrived_at && <small>Received: {new Date(t.arrived_at).toLocaleString('en-PH')}</small>}
                        {(() => { const event = [...(t.delivery?.events || [])].reverse().find((item) => ['hub_transfer_departed', 'hub_transfer_arrived'].includes(item.event_type) && String(item.reason || '').includes(`transfer #${t.id}`)); return event ? <small>Latest custody event: {human(event.event_type)} · {person(event.actor)} · {new Date(event.created_at).toLocaleString('en-PH')}</small> : null; })()}
                        {canDispatchReturnTransfer(t, base) && <button type="button" disabled={busy} onClick={() => void run(() => api.patch(`${base}/hub-transfers/${t.id}/dispatch`), `Return transfer #${t.id} departure recorded.`)}>Dispatch return transfer</button>}
                    </article>
                ))}
            </section>}
        </main>
    );
}
