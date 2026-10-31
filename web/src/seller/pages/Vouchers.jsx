import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Clock3, Plus, RefreshCw, Tag, Ticket, ToggleLeft, ToggleRight } from "lucide-react";
import api from "../../shared/services/api";
import Dialog from "../../shared/components/Dialog";
import "./Vouchers.css";

const EMPTY_FORM = {
    code: "", description: "", discount_type: "fixed", discount_value: "", minimum_spend: "0",
    maximum_discount: "", starts_at: "", expires_at: "", usage_limit: "", per_buyer_limit: "1",
    product_ids: [], is_active: true,
};
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }) : "No expiry";

function statusOf(voucher) {
    const now = Date.now();
    if (!voucher.is_active) return "Disabled";
    if (voucher.expires_at && new Date(voucher.expires_at).getTime() < now) return "Expired";
    if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now) return "Scheduled";
    if (voucher.usage_limit !== null && Number(voucher.redemptions_count) >= Number(voucher.usage_limit)) return "Used up";
    return "Active";
}

export default function SellerVouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [notice, setNotice] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const { data } = await api.get("/seller/vouchers");
            setVouchers(data?.data?.vouchers || []);
            setProducts(data?.data?.products || []);
        } catch (requestError) {
            setLoadError(requestError.response?.data?.message || "We couldn’t load your vouchers.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const setField = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setFormErrors((current) => ({ ...current, [key]: "" }));
        setFormError("");
    };

    const createVoucher = async (event) => {
        event.preventDefault();
        const errors = {};
        if (!/^[A-Z0-9_-]{2,64}$/i.test(form.code.trim())) errors.code = "Use 2–64 letters, numbers, hyphens, or underscores.";
        const amount = Number(form.discount_value);
        if (!Number.isFinite(amount) || amount <= 0 || (form.discount_type === "percentage" && amount > 100)) errors.discount_value = "Enter a valid discount amount. Percentage discounts can’t exceed 100%.";
        if (!Number.isFinite(Number(form.minimum_spend)) || Number(form.minimum_spend) < 0) errors.minimum_spend = "Enter a valid minimum spend.";
        if (form.maximum_discount && (Number(form.maximum_discount) <= 0 || form.discount_type !== "percentage")) errors.maximum_discount = "A discount cap is only available for percentage vouchers.";
        if (form.starts_at && form.expires_at && Date.parse(form.expires_at) < Date.parse(form.starts_at)) errors.expires_at = "Expiry must be on or after the start date.";
        if (!/^\d+$/.test(String(form.per_buyer_limit)) || Number(form.per_buyer_limit) < 1) errors.per_buyer_limit = "Enter at least one use per buyer.";
        if (form.usage_limit && (!/^\d+$/.test(String(form.usage_limit)) || Number(form.usage_limit) < 1)) errors.usage_limit = "Leave blank or enter a positive whole number.";
        setFormErrors(errors);
        if (Object.values(errors).some(Boolean)) return;

        setSaving(true);
        setFormError("");
        try {
            const payload = {
                ...form,
                code: form.code.trim().toUpperCase(),
                description: form.description.trim() || null,
                discount_value: String(form.discount_value),
                minimum_spend: String(form.minimum_spend || "0"),
                maximum_discount: form.maximum_discount || null,
                starts_at: form.starts_at || null,
                expires_at: form.expires_at || null,
                usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
                per_buyer_limit: Number(form.per_buyer_limit),
                product_ids: form.product_ids.map(Number),
            };
            const { data } = await api.post("/seller/vouchers", payload);
            setFormOpen(false);
            setForm(EMPTY_FORM);
            setFormErrors({});
            setNotice(data?.message || "Voucher created.");
            await load();
        } catch (requestError) {
            const serverErrors = requestError.response?.data?.errors || {};
            setFormErrors(Object.fromEntries(Object.entries(serverErrors).map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : messages])));
            if (!Object.keys(serverErrors).length) setFormError(requestError.response?.data?.message || "Unable to create this voucher.");
        } finally {
            setSaving(false);
        }
    };

    const toggleVoucher = async (voucher) => {
        if (updatingId) return;
        setUpdatingId(voucher.id);
        setNotice("");
        setLoadError("");
        try {
            const { data } = await api.patch(`/seller/vouchers/${voucher.id}/status`, { is_active: !voucher.is_active });
            setNotice(data?.message || "Voucher status updated.");
            await load();
        } catch (requestError) {
            setLoadError(requestError.response?.data?.message || "Unable to update this voucher.");
        } finally {
            setUpdatingId(null);
        }
    };

    const activeCount = vouchers.filter((voucher) => statusOf(voucher) === "Active").length;
    const redemptions = vouchers.reduce((total, voucher) => total + Number(voucher.redemptions_count || 0), 0);

    return (
        <div className="sl-page sl-vouchers-page">
            <header className="sl-page-head sl-vouchers-header">
                <div><span className="sl-eyebrow">PROMOTIONS FOR YOUR STORE</span><h1 className="sl-h1">Vouchers</h1><p>Create discount codes buyers can use on your products at checkout.</p></div>
                <button type="button" className="sl-btn-primary sl-voucher-primary" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setFormError(""); setFormOpen(true); }} disabled={products.length === 0}><Plus size={17} /> Create voucher</button>
            </header>

            {notice && <div className="sl-voucher-notice is-success" role="status"><Check size={16} />{notice}</div>}
            {loadError && <div className="sl-voucher-notice is-error" role="alert">{loadError}<button type="button" onClick={() => void load()}>Try again</button></div>}

            <section className="sl-stats sl-voucher-stats" aria-label="Voucher summary">
                <article className="sl-stat-card"><span className="sl-voucher-stat-icon"><Ticket size={17} /></span><span className="sl-stat-label">Created vouchers</span><strong className="sl-stat-value">{vouchers.length}</strong></article>
                <article className="sl-stat-card"><span className="sl-voucher-stat-icon is-green"><Tag size={17} /></span><span className="sl-stat-label">Currently active</span><strong className="sl-stat-value">{activeCount}</strong></article>
                <article className="sl-stat-card"><span className="sl-voucher-stat-icon is-gold"><Check size={17} /></span><span className="sl-stat-label">Total redemptions</span><strong className="sl-stat-value">{redemptions}</strong></article>
            </section>

            <section className="sl-card sl-voucher-list" aria-label="Your store vouchers">
                <div className="sl-panel-head sl-voucher-list-heading"><div><h3>Your voucher codes</h3><p>Codes are checked against eligible products and limits at checkout.</p></div><button type="button" className="sl-btn-sm" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
                {loading ? <div className="sl-voucher-empty"><span className="sl-voucher-spinner" /><strong>Loading vouchers</strong><small>Your store promotions will appear here.</small></div>
                    : vouchers.length === 0 ? <div className="sl-voucher-empty"><span className="sl-voucher-empty-icon"><Ticket size={23} /></span><strong>No vouchers yet</strong><small>Create a voucher to offer a discount to buyers.</small><button type="button" className="sl-voucher-primary" onClick={() => { setForm(EMPTY_FORM); setFormOpen(true); }} disabled={products.length === 0}><Plus size={16} /> Create your first voucher</button>{products.length === 0 && <small>Vouchers become available after you have approved, active products.</small>}</div>
                        : <div className="sl-voucher-cards">{vouchers.map((voucher) => {
                            const status = statusOf(voucher);
                            return <article className="sl-voucher-card" key={voucher.id}>
                                <div className="sl-voucher-card-main"><span className="sl-voucher-ticket-icon"><Ticket size={18} /></span><div className="sl-voucher-code"><strong>{voucher.code}</strong><small>{voucher.description || (voucher.eligible_product_names?.length ? voucher.eligible_product_names.join(", ") : "All eligible products in your store")}</small></div><span className={`sl-voucher-status is-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span></div>
                                <div className="sl-voucher-card-data"><span><small>Discount</small><strong>{voucher.discount_type === "percentage" ? `${Number(voucher.discount_value)}% off` : `${money(voucher.discount_value)} off`}</strong></span><span><small>Minimum spend</small><strong>{money(voucher.minimum_spend)}</strong></span><span><small>Redemptions</small><strong>{voucher.redemptions_count || 0}{voucher.usage_limit ? ` / ${voucher.usage_limit}` : " / unlimited"}</strong></span><span><small>Valid until</small><strong>{date(voucher.expires_at)}</strong></span></div>
                                <div className="sl-voucher-card-footer"><span><Clock3 size={13} /> {voucher.per_buyer_limit} use{Number(voucher.per_buyer_limit) === 1 ? "" : "s"} per buyer{voucher.maximum_discount ? ` · up to ${money(voucher.maximum_discount)} off` : ""}</span><button type="button" onClick={() => void toggleVoucher(voucher)} disabled={updatingId === voucher.id || status === "Expired" || status === "Used up"} aria-label={`${voucher.is_active ? "Disable" : "Enable"} ${voucher.code}`}>{updatingId === voucher.id ? "Updating…" : voucher.is_active ? <><ToggleRight size={16} /> Disable</> : <><ToggleLeft size={16} /> Enable</>}</button></div>
                            </article>;
                        })}</div>}
            </section>

            <aside className="sl-voucher-help"><CalendarClock size={16} /><span><strong>Voucher rules are enforced at checkout.</strong> Buyers can use a code only once per order, within its dates and usage limits, on your store’s products.</span></aside>

            <Dialog open={formOpen} onClose={() => { if (!saving) setFormOpen(false); }} ariaLabelledBy="seller-voucher-title" className="sl-voucher-dialog" busy={saving}>
                <form onSubmit={createVoucher} className="sl-voucher-form">
                    <header className="sl-voucher-dialog-header"><span className="sl-voucher-dialog-icon"><Ticket size={19} /></span><div><span className="sl-vouchers-eyebrow">STORE PROMOTION</span><h2 id="seller-voucher-title">Create a voucher</h2><p>Set the discount and choose which products it applies to.</p></div></header>
                    <div className="sl-voucher-fields">
                        <label className="is-full"><span>Voucher code</span><input value={form.code} onChange={(event) => setField("code", event.target.value.toUpperCase())} maxLength={64} placeholder="e.g. WELCOME10" autoComplete="off" />{formErrors.code && <small className="is-error">{formErrors.code}</small>}</label>
                        <label><span>Discount type</span><select value={form.discount_type} onChange={(event) => { const type = event.target.value; setField("discount_type", type); if (type === "fixed") setField("maximum_discount", ""); }}><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option></select></label>
                        <label><span>{form.discount_type === "percentage" ? "Discount (%)" : "Discount amount (₱)"}</span><input type="number" min="0.01" max={form.discount_type === "percentage" ? "100" : undefined} step="0.01" value={form.discount_value} onChange={(event) => setField("discount_value", event.target.value)} />{formErrors.discount_value && <small className="is-error">{formErrors.discount_value}</small>}</label>
                        <label><span>Minimum spend (₱)</span><input type="number" min="0" step="0.01" value={form.minimum_spend} onChange={(event) => setField("minimum_spend", event.target.value)} />{formErrors.minimum_spend && <small className="is-error">{formErrors.minimum_spend}</small>}</label>
                        {form.discount_type === "percentage" && <label><span>Maximum discount (₱) <em>Optional</em></span><input type="number" min="0.01" step="0.01" value={form.maximum_discount} onChange={(event) => setField("maximum_discount", event.target.value)} />{formErrors.maximum_discount && <small className="is-error">{formErrors.maximum_discount}</small>}</label>}
                        <label><span>Starts at <em>Optional</em></span><input type="datetime-local" value={form.starts_at} onChange={(event) => setField("starts_at", event.target.value)} /></label>
                        <label><span>Expires at <em>Optional</em></span><input type="datetime-local" value={form.expires_at} onChange={(event) => setField("expires_at", event.target.value)} />{formErrors.expires_at && <small className="is-error">{formErrors.expires_at}</small>}</label>
                        <label><span>Total uses <em>Blank means unlimited</em></span><input type="number" min="1" step="1" value={form.usage_limit} onChange={(event) => setField("usage_limit", event.target.value)} />{formErrors.usage_limit && <small className="is-error">{formErrors.usage_limit}</small>}</label>
                        <label><span>Uses per buyer</span><input type="number" min="1" step="1" value={form.per_buyer_limit} onChange={(event) => setField("per_buyer_limit", event.target.value)} />{formErrors.per_buyer_limit && <small className="is-error">{formErrors.per_buyer_limit}</small>}</label>
                        <label className="is-full"><span>Description <em>Optional</em></span><input value={form.description} maxLength={1000} onChange={(event) => setField("description", event.target.value)} placeholder="A short note buyers will see" /></label>
                        <fieldset className="sl-voucher-product-picker is-full"><legend>Eligible products <em>Optional</em></legend><p>Leave all unchecked to apply this voucher to all eligible products in your store.</p><div>{products.map((product) => <label key={product.id}><input type="checkbox" checked={form.product_ids.includes(product.id)} onChange={(event) => setField("product_ids", event.target.checked ? [...form.product_ids, product.id] : form.product_ids.filter((id) => id !== product.id))} /><span><strong>{product.name}</strong><small>{product.category || "Uncategorized"}</small></span></label>)}</div>{formErrors.product_ids && <small className="is-error">{formErrors.product_ids}</small>}</fieldset>
                        <label className="sl-voucher-enable is-full"><input type="checkbox" checked={form.is_active} onChange={(event) => setField("is_active", event.target.checked)} /><span><strong>Make voucher active</strong><small>Buyers can redeem it while its dates and usage limits allow.</small></span></label>
                    </div>
                    {formError && <div className="sl-voucher-notice is-error" role="alert">{formError}</div>}
                    <footer className="sl-voucher-dialog-actions"><button type="button" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button><button type="submit" className="sl-voucher-primary" disabled={saving}>{saving ? "Creating…" : "Create voucher"}</button></footer>
                </form>
            </Dialog>
        </div>
    );
}
