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
    const [activeTab, setActiveTab] = useState("discover");
    const [claimingId, setClaimingId] = useState(null);

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

    const claimVoucher = async (voucher) => {
        if (claimingId) return;
        setClaimingId(voucher.id);
        setError("");
        try {
            await api.post(`/buyer/vouchers/${voucher.id}/claim`);
            setVouchers((current) => current.map((item) => item.id === voucher.id ? { ...item, is_claimed: true } : item));
            setActiveTab("claimed");
        } catch (requestError) {
            setError(requestError.response?.data?.errors?.voucher?.[0] || requestError.response?.data?.message || "Unable to claim this voucher.");
        } finally {
            setClaimingId(null);
        }
    };

    const claimedVouchers = vouchers.filter((voucher) => voucher.is_claimed);
    const claimableVouchers = vouchers.filter((voucher) => !voucher.is_claimed && voucher.buyer_status === "available");
    const visibleVouchers = activeTab === "claimed" ? claimedVouchers : claimableVouchers;

    return (
        <main className="buyer-vouchers-page">
            <section className="buyer-vouchers">
                <header className="buyer-vouchers-header buyer-page-masthead">
                    <div>
                        <p className="buyer-vouchers-eyebrow">SAVINGS FOR YOU</p>
                        <h1>Vouchers</h1>
                        <p>Claim store offers, then choose an eligible voucher at checkout.</p>
                    </div>
                    <div className="buyer-vouchers-icon"><Ticket size={20} /></div>
                </header>

                {error && <p className="buyer-vouchers-alert" role="alert">{error}</p>}
                {loading ? (
                    <p className="buyer-vouchers-state" role="status">Loading vouchers…</p>
                ) : <>
                    <div className="buyer-voucher-tabs" role="group" aria-label="Voucher collection">
                        <button type="button" aria-pressed={activeTab === "claimed"} className={activeTab === "claimed" ? "is-active" : ""} onClick={() => setActiveTab("claimed")}>My vouchers <span>{claimedVouchers.length}</span></button>
                        <button type="button" aria-pressed={activeTab === "discover"} className={activeTab === "discover" ? "is-active" : ""} onClick={() => setActiveTab("discover")}>Available to claim <span>{claimableVouchers.length}</span></button>
                    </div>
                {visibleVouchers.length === 0 ? (
                    <div className="buyer-vouchers-empty">
                        <Ticket size={22} />
                        <h2>{activeTab === "claimed" ? "No claimed vouchers yet" : "No vouchers available to claim"}</h2>
                        <p>{activeTab === "claimed" ? "Browse available offers and claim one to save it here." : "Check back later for new store offers."}</p>
                    </div>
                ) : (
                    <div className="buyer-voucher-list">
                        {visibleVouchers.map((voucher) => (
                            <article className={`buyer-voucher-card status-${voucher.buyer_status}`} key={voucher.id}>
                                <div className="buyer-voucher-value">
                                    <strong>{formatVoucherDiscount(voucher)}</strong>
                                    <span>{formatVoucherStatus(voucher.buyer_status)}</span>
                                </div>
                                <div className="buyer-voucher-details">
                                    <div className="buyer-voucher-code-row">
                                        <code>{voucher.code}</code>
                                        {voucher.is_claimed
                                            ? <button type="button" onClick={() => copyCode(voucher)} aria-label={`Copy voucher code ${voucher.code}`}><Copy size={14} /> {copiedId === voucher.id ? "Copied" : "Copy"}</button>
                                            : <button type="button" className="buyer-voucher-claim" onClick={() => void claimVoucher(voucher)} disabled={claimingId === voucher.id} aria-label={`Claim voucher ${voucher.code}`}>{claimingId === voucher.id ? "Claiming…" : "Claim voucher"}</button>}
                                    </div>
                                    {voucher.seller_name && <p className="buyer-voucher-seller">Store voucher · {voucher.seller_name}</p>}
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
                                    {voucher.is_claimed && voucher.buyer_status === "available" && (
                                        <Link to="/shop" className="buyer-voucher-shop-link">Browse products <ArrowUpRight size={14} /></Link>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
                </>}
            </section>
        </main>
    );
}

export default BuyerVouchers;
