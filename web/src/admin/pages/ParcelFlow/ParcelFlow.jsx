import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";

const human = (s = "") => s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const person = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Courier";
const card = {
    background: "#fff",
    border: "1px solid #f0dce2",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
};

export default function ParcelFlow({ base = "/admin" }) {
    const [data, setData] = useState({
        hubs: [],
        areas: [],
        transfers: [],
        returns: [],
        couriers: [],
    });
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [hubForm, setHubForm] = useState({ name: "", code: "", address: "" });
    const [choices, setChoices] = useState({});
    const load = useCallback(async () => {
        try {
            const { data: result } = await api.get(`${base}/parcel-flow`);
            setData(result.data);
        } catch (e) {
            setError(e.response?.data?.message || "Parcel operations could not be loaded.");
        }
    }, [base]);
    useEffect(() => {
        const t = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(t);
    }, [load]);
    const run = async (action, success) => {
        if (busy) return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await action();
            setNotice(success);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "Unable to update parcel operations.");
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
            () =>
                api.patch(`${base}/parcel-returns/${shipment.id}/receive-at-hub`, {
                    hub_id: choices[`hub-${shipment.id}`] || data.hubs[0]?.id,
                }),
            `Return #${shipment.id} received at hub.`
        );
    const transfer = (type, id) =>
        run(
            () =>
                api.post(`${base}/hub-transfers`, {
                    shipment_type: type,
                    shipment_id: id,
                    to_hub_id: choices[`to-${type}-${id}`],
                    courier_profile_id: choices[`transfer-${type}-${id}`],
                }),
            `Hub transfer created for ${type} #${id}.`
        );
    return (
        <main style={{ maxWidth: 1180, margin: "0 auto", padding: 28, color: "#351626" }}>
            <header style={{ marginBottom: 22 }}>
                <p style={{ color: "#982442", fontWeight: 800, letterSpacing: ".12em" }}>
                    LOGISTICS CONTROL
                </p>
                <h1>Parcel flow & hubs</h1>
                <p>
                    Logistics assigns each handoff; couriers confirm collection, departure, and
                    arrival. A parcel changes hub only when its transfer arrives.
                </p>
            </header>
            {error && (
                <p role="alert" style={{ color: "#a01435" }}>
                    {error}
                </p>
            )}
            {notice && <p role="status">{notice}</p>}
            <section style={card}>
                <h2>Hubs</h2>
                <p>
                    Start with CRYMA Central Hub. Add regional hubs, then map delivery areas to
                    their final-mile hub.
                </p>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                            await api.post(`${base}/hubs`, hubForm);
                            setHubForm({ name: "", code: "", address: "" });
                        }, "Hub added.");
                    }}
                    style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}
                >
                    <input
                        required
                        placeholder="Hub name"
                        value={hubForm.name}
                        onChange={(e) => setHubForm({ ...hubForm, name: e.target.value })}
                    />
                    <input
                        required
                        placeholder="Code"
                        value={hubForm.code}
                        onChange={(e) =>
                            setHubForm({ ...hubForm, code: e.target.value.toUpperCase() })
                        }
                    />
                    <input
                        placeholder="Address"
                        value={hubForm.address}
                        onChange={(e) => setHubForm({ ...hubForm, address: e.target.value })}
                    />
                    <button disabled={busy}>Add hub</button>
                </form>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {data.hubs.map((hub) => (
                        <strong
                            key={hub.id}
                            style={{ background: "#faedf1", padding: 10, borderRadius: 9 }}
                        >
                            {hub.name} · {hub.code}
                        </strong>
                    ))}
                </div>
                {data.areas.map((area) => (
                    <div
                        key={area.id}
                        style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}
                    >
                        <span>{area.name}</span>
                        <select
                            aria-label={`Destination hub for ${area.name}`}
                            value={choices[`area-${area.id}`] || area.hub_id || ""}
                            onChange={(e) =>
                                setChoices({ ...choices, [`area-${area.id}`]: e.target.value })
                            }
                        >
                            {data.hubs.map((hub) => (
                                <option key={hub.id} value={hub.id}>
                                    {hub.name}
                                </option>
                            ))}
                        </select>
                        <button
                            disabled={busy}
                            onClick={() =>
                                void run(
                                    () =>
                                        api.patch(`${base}/delivery-areas/${area.id}/hub`, {
                                            hub_id: choices[`area-${area.id}`] || area.hub_id,
                                        }),
                                    `Delivery area ${area.name} mapped.`
                                )
                            }
                        >
                            Save area hub
                        </button>
                    </div>
                ))}
            </section>
            <section style={card}>
                <h2>Return parcels</h2>
                <p>
                    Approve a refund with return required, assign a pickup courier, receive the item
                    at a hub, route it hub-to-hub if needed, then assign delivery to the seller.
                    Record the refund only after seller receipt.
                </p>
                {data.returns.length ? (
                    data.returns.map((r) => (
                        <article
                            key={r.id}
                            style={{ borderTop: "1px solid #f0dce2", padding: "14px 0" }}
                        >
                            <strong>
                                Return #{r.id} · Order #{r.order_id} · {human(r.status)}
                            </strong>
                            <p>
                                Buyer: {person(r.buyer)} · Seller: {person(r.seller)} · Hub:{" "}
                                {r.current_hub?.name || "Not received"}
                            </p>
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
                                    <select
                                        value={choices[`hub-${r.id}`] || data.hubs[0]?.id || ""}
                                        onChange={(e) =>
                                            setChoices({
                                                ...choices,
                                                [`hub-${r.id}`]: e.target.value,
                                            })
                                        }
                                    >
                                        {data.hubs.map((h) => (
                                            <option key={h.id} value={h.id}>
                                                {h.name}
                                            </option>
                                        ))}
                                    </select>
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
                        </article>
                    ))
                ) : (
                    <p>No approved returns requiring parcel movement.</p>
                )}
            </section>
            <section style={card}>
                <h2>Hub-to-hub transfers</h2>
                <p>
                    Assign a courier between a parcel’s current hub and its next hub. The courier
                    records departure and arrival in the courier workspace.
                </p>
                {data.deliveries.map((d) => (
                    <div
                        key={`d${d.id}`}
                        style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0" }}
                    >
                        <span>
                            Order #{d.order_id} from {d.current_hub?.name}
                        </span>
                        <select
                            value={choices[`to-delivery-${d.id}`] || ""}
                            onChange={(e) =>
                                setChoices({ ...choices, [`to-delivery-${d.id}`]: e.target.value })
                            }
                        >
                            <option value="">To hub</option>
                            {data.hubs
                                .filter((h) => h.id !== d.current_hub_id)
                                .map((h) => (
                                    <option key={h.id} value={h.id}>
                                        {h.name}
                                    </option>
                                ))}
                        </select>
                        <select
                            value={choices[`transfer-delivery-${d.id}`] || ""}
                            onChange={(e) =>
                                setChoices({
                                    ...choices,
                                    [`transfer-delivery-${d.id}`]: e.target.value,
                                })
                            }
                        >
                            {courierOptions}
                        </select>
                        <button
                            disabled={
                                busy ||
                                !choices[`to-delivery-${d.id}`] ||
                                !choices[`transfer-delivery-${d.id}`]
                            }
                            onClick={() => void transfer("delivery", d.id)}
                        >
                            Create transfer
                        </button>
                    </div>
                ))}
                {data.returns
                    .filter((r) => r.status === "at_hub")
                    .map((r) => (
                        <div
                            key={`r${r.id}`}
                            style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "8px 0" }}
                        >
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
                                {data.hubs
                                    .filter((h) => h.id !== r.current_hub_id)
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
                    ))}
                {data.transfers.slice(0, 30).map((t) => (
                    <p key={t.id}>
                        Transfer #{t.id}:{" "}
                        {t.delivery_id
                            ? `Order #${t.delivery?.order_id}`
                            : `Return #${t.return_shipment_id}`}{" "}
                        · {t.from_hub?.name} → {t.to_hub?.name} · {human(t.status)} ·{" "}
                        {person(t.courier?.user)}
                    </p>
                ))}
            </section>
        </main>
    );
}
