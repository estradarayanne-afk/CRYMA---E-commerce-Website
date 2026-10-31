import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Banknote, CircleHelp, Clock3, RefreshCw, WalletCards } from "lucide-react";
import api from "../../shared/services/api";

const peso = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function SellerEarnings() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/seller/earnings");
            setRows(data?.data?.data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Earnings could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const sum = (status) => rows
        .filter((row) => row.status === status)
        .reduce((total, row) => total + Number(row.payout_amount ?? row.payout_due ?? row.seller_earnings ?? 0), 0);

    return (
        <section className="sl-earnings" aria-label="Seller earnings and payouts">
            <div className="sl-earnings-heading">
                <div><span className="sl-earnings-kicker">PAYOUT OVERVIEW</span><h2>Your earnings</h2><p>Follow your order earnings from settlement through payout.</p></div>
                <button className="sl-earnings-refresh" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "is-spinning" : ""} /> Refresh</button>
            </div>

            <div className="sl-earnings-summary">
                <article className="sl-earnings-available">
                    <div className="sl-earnings-balance-label"><span className="sl-earnings-balance-icon"><WalletCards size={18} /></span><span>Available for payout<small>Settled earnings ready for payout</small></span></div>
                    <strong>{peso(sum("available"))}</strong>
                    <span className="sl-earnings-balance-foot"><span className="sl-earnings-live-dot" /> Based on recorded order settlements</span>
                    <span className="sl-earnings-decor" aria-hidden="true"><Banknote size={120} /></span>
                </article>
                <article className="sl-earnings-stat sl-earnings-pending"><span className="sl-earnings-stat-icon"><Clock3 size={17} /></span><span className="sl-earnings-stat-label">Pending</span><strong>{peso(sum("pending"))}</strong><small>Awaiting settlement</small></article>
                <article className="sl-earnings-stat sl-earnings-paid"><span className="sl-earnings-stat-icon"><ArrowDownToLine size={17} /></span><span className="sl-earnings-stat-label">Paid out</span><strong>{peso(sum("paid"))}</strong><small>Recorded as transferred</small></article>
            </div>

            <div className="sl-earnings-table-panel">
                <div className="sl-earnings-table-head"><div><h3>Payout activity</h3><p>Order level earnings, fees, and settlement status.</p></div><span className="sl-earnings-count">{rows.length} {rows.length === 1 ? "record" : "records"}</span></div>
                {error && <div className="sl-earnings-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>Try again</button></div>}
                {loading ? <div className="sl-earnings-empty"><span className="sl-earnings-loader" /><strong>Loading payout activity</strong><span>Your latest order settlements will appear here.</span></div>
                    : rows.length === 0 ? <div className="sl-earnings-empty"><span className="sl-earnings-empty-icon"><WalletCards size={22} /></span><strong>No earnings recorded yet</strong><span>Once an order is eligible for settlement, its earnings will show up here.</span></div>
                        : <div className="sl-earnings-table-scroll"><table className="sl-earnings-table"><thead><tr><th>Order</th><th>Order date</th><th>Order status</th><th>Commission</th><th>Your net</th><th>Settlement</th></tr></thead><tbody>
                            {rows.map((row) => <tr key={row.id}>
                                <td><span className="sl-earnings-order">#{row.order_id}</span><small>{row.order?.payment_method === "cash_on_delivery" ? "Cash on delivery" : "Online payment"}</small></td>
                                <td>{dateLabel(row.order?.created_at)}</td>
                                <td><span className={`sl-earnings-order-status is-${String(row.order?.status || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{row.order?.status || "Unknown"}</span></td>
                                <td><span className="sl-earnings-money-muted">{peso(row.commission_amount)}</span><small>{Number(row.commission_rate || 0)}% fee</small></td>
                                <td><strong className="sl-earnings-net">{peso(row.payout_amount ?? row.payout_due ?? row.seller_earnings)}</strong></td>
                                <td><span className={`sl-earnings-settlement is-${String(row.status || "unknown").toLowerCase()}`}><i />{row.status || "Unknown"}</span>
                                    {row.order?.payment_method === "cash_on_delivery" && <small className="sl-earnings-cod">COD: {row.order?.cod_collection?.status || "Awaiting collection"}</small>}
                                    {Number(row.refunded_amount) > 0 && <small className="sl-earnings-meta">{peso(row.refunded_amount)} refunded</small>}
                                    {row.payout_reference && <small className="sl-earnings-meta">Ref {row.payout_reference}</small>}
                                </td>
                            </tr>)}
                        </tbody></table></div>}
            </div>

            <aside className="sl-earnings-note"><CircleHelp size={16} /><span><strong>About your payout status</strong>Pending earnings are still being settled. Available earnings are ready for payout, and Paid reflects transfers recorded by CRYMA.</span><ArrowUpRight size={15} /></aside>
        </section>
    );
}
