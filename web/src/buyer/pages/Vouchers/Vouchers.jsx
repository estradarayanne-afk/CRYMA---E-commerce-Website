import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../shared/services/api";
import { formatVoucherDiscount, formatVoucherStatus } from "../../../shared/utils/voucherPresentation";
import "./Vouchers.css";

function BuyerVouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api.get("/buyer/vouchers")
            .then(({ data }) => {
                if (!cancelled) setVouchers(Array.isArray(data?.data) ? data.data : []);
            })
            .catch((requestError) => {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Unable to load your vouchers. Please try again.");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const copyCode = async (voucher) => {
        try {
            if (!navigator.clipboard?.writeText) {
                setError("Copying is not supported in this browser. You can select the code and copy it manually.");
                return;
            }
            await navigator.clipboard.writeText(voucher.code);
            setCopiedId(voucher.id);
            window.setTimeout(() => setCopiedId(null), 2500);
        } catch {
            setError("Unable to copy this code. Please select and copy it manually.");
        }
    };

    return (
        <main className="buyer-vouchers-page">
            <section className="buyer-vouchers">
                <header className="buyer-vouchers-header">
                    <div>
                        <p className="buyer-vouchers-eyebrow">SAVINGS FOR YOU</p>
                        <h1>My vouchers</h1>
                        <p>Vouchers are checked against your items and order total at checkout.</p>
                    </div>
                    <div className="buyer-vouchers-icon"><Ticket size={20} /></div>
                </header>

                {error && <p className="buyer-vouchers-alert" role="alert">{error}</p>}
                {loading ? (
                    <p className="buyer-vouchers-state" role="status">Loading vouchers…</p>
                ) : vouchers.length === 0 ? (
                    <div className="buyer-vouchers-empty">
                        <Ticket size={22} />
                        <h2>No vouchers yet</h2>
                        <p>Vouchers issued by CRYMA will appear here.</p>
                    </div>
                ) : (
                    <div className="buyer-voucher-list">
                        {vouchers.map((voucher) => (
                            <article className={`buyer-voucher-card status-${voucher.buyer_status}`} key={voucher.id}>
                                <div className="buyer-voucher-value">
                                    <strong>{formatVoucherDiscount(voucher)}</strong>
                                    <span>{formatVoucherStatus(voucher.buyer_status)}</span>
                                </div>
                                <div className="buyer-voucher-details">
                                    <div className="buyer-voucher-code-row">
                                        <code>{voucher.code}</code>
                                        <button type="button" onClick={() => copyCode(voucher)} aria-label={`Copy voucher code ${voucher.code}`}>
                                            <Copy size={14} /> {copiedId === voucher.id ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                    {voucher.buyer_status_reason && <p className="buyer-voucher-status-reason">{voucher.buyer_status_reason}</p>}
                                    {voucher.description && <p>{voucher.description}</p>}
                                    <ul>
                                        {Number(voucher.minimum_spend) > 0 && <li>Minimum spend ₱{Number(voucher.minimum_spend).toLocaleString()}</li>}
                                        {voucher.discount_type === "percentage" && voucher.maximum_discount !== null && <li>Maximum discount ₱{Number(voucher.maximum_discount).toLocaleString()}</li>}
                                        {voucher.expires_at && <li>Expires {new Date(voucher.expires_at).toLocaleDateString()}</li>}
                                        {voucher.per_buyer_limit > 1 && <li>Up to {voucher.per_buyer_limit} uses per buyer</li>}
                                        {voucher.usage_limit !== null && <li>Limited to {voucher.usage_limit} total uses</li>}
                                        {voucher.categories?.length > 0 && <li>Eligible categories: {voucher.categories.join(", ")}</li>}
                                        {voucher.eligible_product_names?.length > 0 && <li>Eligible products: {voucher.eligible_product_names.join(", ")}</li>}
                                    </ul>
                                    {voucher.buyer_status === "available" && (
                                        <Link to="/shop" className="buyer-voucher-shop-link">Browse products <ArrowUpRight size={14} /></Link>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}

export default BuyerVouchers;
