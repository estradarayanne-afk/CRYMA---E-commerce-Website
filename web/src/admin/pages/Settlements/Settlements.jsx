import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";

const peso = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const name = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "—";

export default function Settlements() {
    const [tab, setTab] = useState("cod");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(null);
    const [refs, setRefs] = useState({});
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get(`/admin/settlements/${tab}`);
            setRows(data?.data?.data || []);
        } catch (e) {
            setError(e.response?.data?.message || "Settlement records could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [tab]);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void load();
        }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);
    const act = async (row) => {
        if (busy) return;
        const reference = (refs[row.id] || "").trim();
        if (reference.length < 2) {
            setError("Enter the cash remittance or actual payout reference first.");
            return;
        }
        setBusy(row.id);
        setError("");
        try {
            if (tab === "cod")
                await api.patch(`/admin/settlements/cod/${row.id}/remit`, { reference });
            else
                await api.post(`/admin/settlements/payouts/${row.id}/pay`, {
                    method: "bank_transfer",
                    reference,
                });
            await load();
        } catch (e) {
            setError(e.response?.data?.message || "This settlement could not be recorded.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <section style={{ maxWidth: 1180, margin: "0 auto", padding: 28, color: "#321321" }}>
            <header style={{ marginBottom: 24 }}>
                <p
                    style={{
                        color: "#9b2445",
                        fontWeight: 800,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                    }}
                >
                    Finance operations
                </p>
                <h1 style={{ margin: "4px 0 8px" }}>Settlements</h1>
                <p>
                    Record courier COD remittances and seller payouts after the real cash transfer
                    is complete.
                </p>
            </header>
            <div
                role="tablist"
                aria-label="Settlement type"
                style={{ display: "flex", gap: 8, marginBottom: 18 }}
            >
                {[
                    ["cod", "Courier COD remittances"],
                    ["payouts", "Seller payouts"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        style={{
                            border: 0,
                            borderRadius: 10,
                            padding: "11px 16px",
                            background: tab === key ? "#711b39" : "#f8e9ed",
                            color: tab === key ? "white" : "#54162e",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: "#fff6e8", marginBottom: 16 }}>
                These controls only record payments already made. They do not transfer funds.
                Refunds after an order has been paid out require manual finance review.
            </div>
            {error && (
                <p role="alert" style={{ color: "#a01435" }}>
                    {error}
                </p>
            )}
            {loading ? (
                <p>Loading settlement records…</p>
            ) : rows.length === 0 ? (
                <p>No settlement records yet.</p>
            ) : (
                <div
                    style={{
                        overflowX: "auto",
                        background: "white",
                        border: "1px solid #f0dce2",
                        borderRadius: 14,
                    }}
                >
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>
                        <thead>
                            <tr>
                                {(tab === "cod"
                                    ? [
                                          "Order",
                                          "Buyer",
                                          "Courier",
                                          "Amount",
                                          "Status",
                                          "Reconciliation",
                                      ]
                                    : [
                                          "Order",
                                          "Seller",
                                          "Order status",
                                          "Seller net",
                                          "Balance",
                                          "Payout",
                                      ]
                                ).map((x) => (
                                    <th
                                        key={x}
                                        style={{
                                            textAlign: "left",
                                            padding: 14,
                                            borderBottom: "1px solid #f0dce2",
                                        }}
                                    >
                                        {x}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const canAct =
                                    tab === "cod"
                                        ? row.status === "collected"
                                        : row.status === "available";
                                const order = tab === "cod" ? row.order : row.order;
                                return (
                                    <tr key={row.id}>
                                        <td style={{ padding: 14 }}>#{order?.id}</td>
                                        <td style={{ padding: 14 }}>
                                            {tab === "cod" ? name(order?.buyer) : name(row.seller)}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            {tab === "cod"
                                                ? name(row.courier_profile?.user)
                                                : order?.status}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            {peso(
                                                tab === "cod"
                                                    ? (row.collected_amount ?? row.expected_amount)
                                                    : (row.payout_due ?? row.seller_earnings)
                                            )}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            {row.status}
                                            {tab === "payouts" && Number(row.refunded_amount) > 0
                                                ? ` · ${peso(row.refunded_amount)} refunded`
                                                : ""}
                                        </td>
                                        <td style={{ padding: 14 }}>
                                            {canAct ? (
                                                <div style={{ display: "flex", gap: 8 }}>
                                                    <input
                                                        aria-label="Payment reference"
                                                        placeholder="Transfer / remittance ref"
                                                        value={refs[row.id] || ""}
                                                        onChange={(e) =>
                                                            setRefs((old) => ({
                                                                ...old,
                                                                [row.id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                    <button
                                                        disabled={busy === row.id}
                                                        onClick={() => void act(row)}
                                                    >
                                                        {busy === row.id
                                                            ? "Saving…"
                                                            : tab === "cod"
                                                              ? "Record remitted"
                                                              : "Record paid"}
                                                    </button>
                                                </div>
                                            ) : (
                                                row.remittance_reference ||
                                                row.payout_reference ||
                                                "—"
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
