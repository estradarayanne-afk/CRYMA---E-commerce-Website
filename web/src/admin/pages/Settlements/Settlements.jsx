import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../../shared/services/api";
import "./Settlements.css";

const PAGE_SIZE = 15;
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
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get(`/admin/settlements/${tab}`, {
                params: { page, per_page: PAGE_SIZE },
            });
            const result = data?.data;
            setRows(result?.data || []);
            setPagination({
                current_page: result?.current_page || 1,
                last_page: result?.last_page || 1,
                total: result?.total || 0,
            });
        } catch (e) {
            setError(e.response?.data?.message || "Settlement records could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [page, tab]);
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
        <section className="admin-settlements" aria-label="Settlement operations">
            <div className="admin-settlement-tabs" role="tablist" aria-label="Settlement type">
                {[
                    ["cod", "Courier COD remittances"],
                    ["payouts", "Seller payouts"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        className={tab === key ? "is-active" : ""}
                        onClick={() => {
                            setTab(key);
                            setPage(1);
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="admin-settlement-note">
                These controls only record payments already made. They do not transfer funds.
                Refunds after an order has been paid out require manual finance review.
            </div>
            {error && (
                <p className="admin-settlement-error" role="alert">
                    {error}
                </p>
            )}
            {loading ? (
                <p>Loading settlement records…</p>
            ) : rows.length === 0 ? (
                <div className="admin-settlement-state">
                    <strong>No settlement records yet</strong>
                    <span>Completed remittances and payout records will appear here.</span>
                </div>
            ) : (
                <div className="admin-settlement-table-panel">
                    <div className="admin-settlement-table-heading">
                        <div><h3>{tab === "cod" ? "COD remittance records" : "Seller payout records"}</h3><p>Review status and record completed transfers.</p></div>
                        <span>{pagination.total} {pagination.total === 1 ? "record" : "records"}</span>
                    </div>
                    <div className="admin-settlement-table-scroll">
                    <table className="admin-settlement-table">
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
                                    <th key={x}>
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
                                        <td>#{order?.id}</td>
                                        <td>
                                            {tab === "cod" ? name(order?.buyer) : name(row.seller)}
                                        </td>
                                        <td>
                                            {tab === "cod"
                                                ? name(row.courier_profile?.user)
                                                : order?.status}
                                        </td>
                                        <td>
                                            {peso(
                                                tab === "cod"
                                                    ? (row.collected_amount ?? row.expected_amount)
                                                    : (row.payout_due ?? row.seller_earnings)
                                            )}
                                        </td>
                                        <td>
                                            {row.status}
                                            {tab === "payouts" && Number(row.refunded_amount) > 0
                                                ? ` · ${peso(row.refunded_amount)} refunded`
                                                : ""}
                                        </td>
                                        <td>
                                            {canAct ? (
                                                <div className="admin-settlement-actions">
                                                    <input
                                                        className="admin-settlement-reference"
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
                                                        className="admin-settlement-record-button"
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
                </div>
            )}
            {!loading && pagination.total > 0 && (
                <footer className="admin-settlement-pagination">
                    <span>
                        Showing {(pagination.current_page - 1) * PAGE_SIZE + 1}–
                        {Math.min(pagination.current_page * PAGE_SIZE, pagination.total)} of {pagination.total}
                    </span>
                    <div>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                            aria-label="Previous settlement page"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <span>Page {pagination.current_page} of {pagination.last_page}</span>
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))}
                            disabled={page >= pagination.last_page}
                            aria-label="Next settlement page"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </footer>
            )}
        </section>
    );
}
