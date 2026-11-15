import { useCallback, useEffect, useState } from "react";
import AdminSearchField from "../../components/AdminSearchField";
import api from "../../../shared/services/api";
import HubAreaManagement from "./HubAreaManagement";
import { canDispatchReturnTransfer } from "../../../hubStaff/utils/hubStaffWorkspace";

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
    });
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [choices, setChoices] = useState({});
    const [loading, setLoading] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [activeSection, setActiveSection] = useState("network");
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
            setError(firstValidationError || e.response?.data?.message || "Unable to update parcel operations.");
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
    return (
        <main className="lo-page lo-parcel-flow">
            <header className="lw-page-heading">
                <div><span className="lw-eyebrow">LOGISTICS CONTROL</span><h1>Hub and delivery area management</h1><p>Manage the operating network, delivery-area coverage, and hub transfers.</p></div>
                <button type="button" onClick={() => void load()} disabled={loading}>Refresh</button>
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
            {activeSection === "transfers" && <section className="lo-parcel-section lo-transfer-queue">
                <h2>Hub-to-hub transfers</h2>
                <p>The destination hub comes from the parcel address and configured delivery-area mapping. Assign a transfer courier; hub staff still confirm release and QR receipt.</p>
                {data.deliveries.map((d) => {
                    const route = d.destination_route;
                    const areaIsMapped = ["mapped", "mapping_conflict", "manual_route"].includes(route?.status);
                    const routeArea = route?.area || d.delivery_area;
                    const selectedAreaId = areaIsMapped ? routeArea?.id : choices[`area-delivery-${d.id}`] || "";
                    const selectedArea = areaIsMapped ? routeArea : data.areas.find((area) => Number(area.id) === Number(selectedAreaId));
                    const destinationHub = selectedArea?.hub;
                    const needsNote = !!d.order?.delivery_psgc_code && !["mapped", "mapping_conflict"].includes(route?.status);
                    return (
                        <details className="lo-transfer-prepare" key={`d${d.id}`}>
                            <summary>
                                <strong>Order #{d.order_id} · {human(d.status)}</strong>
                                <span>{d.current_hub?.name || "Unknown hub"} → {destinationHub?.name || "Routing exception"}</span>
                            </summary>
                            <div className="lo-parcel-item">
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
                            </div>
                        </details>
                    );
                })}
                {data.deliveries.length === 0 && !data.returns.some((item) => item.status === "at_hub") && (
                    <p className="lo-parcel-empty">No parcels are currently waiting for a hub-to-hub transfer.</p>
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
