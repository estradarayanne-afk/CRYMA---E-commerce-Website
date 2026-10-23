import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, LoaderCircle, Plus, Search, Ticket, X } from "lucide-react";
import api from "../../../shared/services/api";
import Dialog from "../../../shared/components/Dialog";
import { buildVoucherPayload, validateVoucherForm } from "./voucherForm";
import "./Vouchers.css";

const EMPTY_FORM = {
    code: "",
    description: "",
    discountType: "fixed",
    discountValue: "",
    minimumSpend: "0",
    maximumDiscount: "",
    startsAt: "",
    expiresAt: "",
    usageLimit: "",
    perBuyerLimit: "1",
    productIds: "",
    categories: "",
    isActive: false,
};

function dateTimeInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

function formatDate(value, includeTime = false) {
    if (!value) return "No date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-PH", includeTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" });
}

function formatMoney(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function discountText(voucher) {
    const value = Number(voucher.discount_value || 0);
    return voucher.discount_type === "percentage"
        ? `${value.toLocaleString()}% off`
        : `${formatMoney(value)} off`;
}

function voucherStatus(voucher) {
    const now = Date.now();
    if (!voucher.is_active) return "Disabled";
    if (voucher.expires_at && new Date(voucher.expires_at).getTime() < now) return "Expired";
    if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now) return "Scheduled";
    if (voucher.usage_limit !== null && Number(voucher.redemptions_count) >= Number(voucher.usage_limit)) return "Exhausted";
    return "Active";
}

function formFromVoucher(voucher) {
    return {
        code: voucher.code || "",
        description: voucher.description || "",
        discountType: voucher.discount_type,
        discountValue: String(voucher.discount_value ?? ""),
        minimumSpend: String(voucher.minimum_spend ?? "0"),
        maximumDiscount: voucher.maximum_discount === null ? "" : String(voucher.maximum_discount),
        startsAt: dateTimeInput(voucher.starts_at),
        expiresAt: dateTimeInput(voucher.expires_at),
        usageLimit: voucher.usage_limit === null ? "" : String(voucher.usage_limit),
        perBuyerLimit: String(voucher.per_buyer_limit ?? 1),
        productIds: (voucher.product_ids || []).join(", "),
        categories: (voucher.categories || []).join(", "),
        isActive: Boolean(voucher.is_active),
    };
}

function Vouchers() {
    const [vouchers, setVouchers] = useState([]);
    const [supportedCategories, setSupportedCategories] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [confirmation, setConfirmation] = useState(null);
    const [statusSaving, setStatusSaving] = useState(false);
    const [confirmationError, setConfirmationError] = useState("");
    const listRequestRef = useRef(0);
    const detailsRequestRef = useRef(0);

    const loadVouchers = useCallback(async (requestedPage = page) => {
        const requestId = ++listRequestRef.current;
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/vouchers", {
                params: {
                    search: search.trim() || undefined,
                    type: typeFilter,
                    status: statusFilter,
                    page: requestedPage,
                    per_page: 10,
                },
            });
            const result = response.data?.data;
            if (requestId !== listRequestRef.current) return;
            setVouchers(Array.isArray(result?.data) ? result.data : []);
            setSupportedCategories(Array.isArray(response.data?.meta?.categories) ? response.data.meta.categories : []);
            setPagination({
                current_page: result?.current_page || 1,
                last_page: result?.last_page || 1,
                total: result?.total || 0,
            });
        } catch (requestError) {
            if (requestId === listRequestRef.current) {
                setError(requestError.response?.data?.message || "Unable to load vouchers. Please try again.");
            }
        } finally {
            if (requestId === listRequestRef.current) setLoading(false);
        }
    }, [page, search, statusFilter, typeFilter]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadVouchers(page); }, 250);
        return () => window.clearTimeout(timer);
    }, [loadVouchers, page]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setError("");
        setFormOpen(true);
    };

    const openEdit = (voucher) => {
        setEditing(voucher);
        setForm(formFromVoucher(voucher));
        setFormErrors({});
        setError("");
        setFormOpen(true);
    };

    const closeForm = () => {
        if (saving) return;
        setFormOpen(false);
        setFormErrors({});
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");
        const clientErrors = validateVoucherForm(form);
        setFormErrors(clientErrors);
        if (Object.keys(clientErrors).length > 0) return;

        setSaving(true);
        try {
            const payload = buildVoucherPayload(form);
            const response = editing
                ? await api.patch(`/admin/vouchers/${editing.id}`, payload)
                : await api.post("/admin/vouchers", payload);
            setSuccess(response.data?.message || (editing ? "Voucher updated." : "Voucher created."));
            setFormOpen(false);
            setFormErrors({});
            await loadVouchers(page);
        } catch (requestError) {
            const responseErrors = requestError.response?.data?.errors || {};
            setFormErrors(Object.fromEntries(
                Object.entries(responseErrors).map(([key, messages]) => [key, Array.isArray(messages) ? messages[0] : messages])
            ));
            if (Object.keys(responseErrors).length === 0) {
                setError(requestError.response?.data?.message || "Unable to save voucher. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    const showDetails = async (voucher) => {
        const requestId = ++detailsRequestRef.current;
        setDetailsLoading(true);
        setDetails({ voucher, redemptions: null });
        try {
            const response = await api.get(`/admin/vouchers/${voucher.id}`);
            if (requestId !== detailsRequestRef.current) return;
            setDetails(response.data?.data || null);
        } catch (requestError) {
            if (requestId === detailsRequestRef.current) {
                setError(requestError.response?.data?.message || "Unable to load voucher details.");
                setDetails(null);
            }
        } finally {
            if (requestId === detailsRequestRef.current) setDetailsLoading(false);
        }
    };

    const confirmStatusChange = async () => {
        if (!confirmation) return;
        setStatusSaving(true);
        setConfirmationError("");
        setError("");
        setSuccess("");
        try {
            const response = await api.patch(`/admin/vouchers/${confirmation.voucher.id}/status`, {
                is_active: confirmation.nextActive,
            });
            setSuccess(response.data?.message || "Voucher status updated.");
            setConfirmation(null);
            setConfirmationError("");
            await loadVouchers(page);
            if (details?.voucher?.id === confirmation.voucher.id) {
                setDetails((current) => ({
                    ...current,
                    voucher: { ...current.voucher, is_active: confirmation.nextActive },
                }));
            }
        } catch (requestError) {
            const message = requestError.response?.data?.message || "Unable to change voucher status.";
            setError(message);
            setConfirmationError(message);
        } finally {
            setStatusSaving(false);
        }
    };

    const fieldError = (key) => {
        if (formErrors[key]) return formErrors[key];
        const serverFieldNames = {
            discountType: "discount_type",
            discountValue: "discount_value",
            minimumSpend: "minimum_spend",
            maximumDiscount: "maximum_discount",
            startsAt: "starts_at",
            expiresAt: "expires_at",
            usageLimit: "usage_limit",
            perBuyerLimit: "per_buyer_limit",
        };
        if (serverFieldNames[key] && formErrors[serverFieldNames[key]]) {
            return formErrors[serverFieldNames[key]];
        }
        const serverPrefix = key === "productIds" ? "product_ids." : key === "categories" ? "categories." : null;
        return serverPrefix
            ? Object.entries(formErrors).find(([name]) => name.startsWith(serverPrefix))?.[1] || ""
            : "";
    };
    const setField = (key, value) => {
        const serverFieldNames = {
            discountType: "discount_type",
            discountValue: "discount_value",
            minimumSpend: "minimum_spend",
            maximumDiscount: "maximum_discount",
            startsAt: "starts_at",
            expiresAt: "expires_at",
            usageLimit: "usage_limit",
            perBuyerLimit: "per_buyer_limit",
            productIds: "product_ids",
        };
        const serverField = serverFieldNames[key];
        setForm((current) => ({ ...current, [key]: value }));
        setFormErrors((current) => {
            const next = { ...current, [key]: "" };
            if (serverField) {
                delete next[serverField];
                for (const name of Object.keys(next)) {
                    if (name.startsWith(`${serverField}.`)) delete next[name];
                }
            }
            return next;
        });
    };

    return (
        <div className="voucher-admin-page">
            <header className="voucher-admin-header">
                <div>
                    <span className="voucher-admin-eyebrow">PROMOTIONS</span>
                    <h1>Voucher management</h1>
                    <p>Create and manage buyer discounts. Checkout continues to validate every redemption server-side.</p>
                </div>
            </header>

            {error && <div className="voucher-alert error" role="alert">{error}</div>}
            {success && <div className="voucher-alert success" role="status"><Check size={16} />{success}</div>}

            <section className="voucher-list-card" aria-label="Voucher list">
                <div className="voucher-list-heading">
                    <div>
                        <span>VOUCHER LIBRARY</span>
                        <h2>All vouchers</h2>
                        <p>Track discount rules, redemption limits, and availability.</p>
                    </div>
                    <button type="button" className="voucher-primary-button" onClick={openCreate}>
                        <Plus size={17} /> Create voucher
                    </button>
                </div>
                <div className="voucher-toolbar">
                    <label className="voucher-search">
                        <Search size={17} aria-hidden="true" />
                        <span className="voucher-visually-hidden">Search vouchers</span>
                        <input
                            type="search"
                            maxLength={64}
                            placeholder="Search code or description"
                            value={search}
                            onChange={(event) => {
                                setPage(1);
                                setSearch(event.target.value);
                            }}
                        />
                    </label>
                    <label className="voucher-filter">
                        <span>Type</span>
                        <select value={typeFilter} onChange={(event) => {
                            setPage(1);
                            setTypeFilter(event.target.value);
                        }}>
                            <option value="all">All types</option>
                            <option value="fixed">Fixed amount</option>
                            <option value="percentage">Percentage</option>
                        </select>
                    </label>
                    <label className="voucher-filter">
                        <span>Status</span>
                        <select value={statusFilter} onChange={(event) => {
                            setPage(1);
                            setStatusFilter(event.target.value);
                        }}>
                            <option value="all">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Disabled</option>
                            <option value="upcoming">Scheduled</option>
                            <option value="expired">Expired</option>
                            <option value="exhausted">Exhausted</option>
                        </select>
                    </label>
                </div>

                {loading ? (
                    <div className="voucher-state" role="status"><LoaderCircle size={20} className="voucher-spinner" /> Loading vouchers…</div>
                ) : vouchers.length === 0 ? (
                    <div className="voucher-state voucher-empty">
                        <Ticket size={25} />
                        <strong>{search || typeFilter !== "all" || statusFilter !== "all" ? "No matching vouchers" : "No vouchers created yet"}</strong>
                        <span>{search || typeFilter !== "all" || statusFilter !== "all" ? "Try a different search or filter." : "Create a voucher to make it available to eligible buyers."}</span>
                    </div>
                ) : (
                    <div className="voucher-table-scroll">
                        <table className="voucher-table">
                            <thead>
                                <tr>
                                    <th scope="col">Voucher</th>
                                    <th scope="col">Discount</th>
                                    <th scope="col">Minimum spend</th>
                                    <th scope="col">Validity</th>
                                    <th scope="col">Usage</th>
                                    <th scope="col">Status</th>
                                    <th scope="col"><span className="voucher-visually-hidden">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {vouchers.map((voucher) => {
                                    const status = voucherStatus(voucher);
                                    return (
                                        <tr key={voucher.id}>
                                            <td>
                                                <div className="voucher-code-cell">
                                                    <code>{voucher.code}</code>
                                                    {voucher.description && <span title={voucher.description}>{voucher.description}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <strong>{discountText(voucher)}</strong>
                                                {voucher.discount_type === "percentage" && voucher.maximum_discount !== null && (
                                                    <small>Max {formatMoney(voucher.maximum_discount)}</small>
                                                )}
                                            </td>
                                            <td>{formatMoney(voucher.minimum_spend)}</td>
                                            <td className="voucher-date-cell">
                                                <span>{formatDate(voucher.starts_at)}</span>
                                                <small>to {formatDate(voucher.expires_at)}</small>
                                            </td>
                                            <td>
                                                <strong>{voucher.redemptions_count || 0}</strong>
                                                <small>{voucher.usage_limit === null ? "of unlimited" : `of ${voucher.usage_limit}`}</small>
                                                {voucher.usage_limit !== null && Number(voucher.usage_limit) > 0 && (
                                                    <div className="voucher-usage-meter" role="progressbar" aria-label={`Redemption usage for ${voucher.code}`} aria-valuemin="0" aria-valuemax={Number(voucher.usage_limit)} aria-valuenow={Math.min(Number(voucher.redemptions_count) || 0, Number(voucher.usage_limit))}>
                                                        <span style={{ width: `${Math.min(100, ((Number(voucher.redemptions_count) || 0) / Number(voucher.usage_limit)) * 100)}%` }} />
                                                    </div>
                                                )}
                                            </td>
                                            <td><span className={`voucher-status status-${status.toLowerCase()}`}>{status}</span></td>
                                            <td>
                                                <div className="voucher-row-actions">
                                                    <button type="button" onClick={() => void showDetails(voucher)} aria-label={`View details for ${voucher.code}`} title="View details"><Eye size={16} /></button>
                                                    <button type="button" onClick={() => openEdit(voucher)} aria-label={`Edit ${voucher.code}`} title="Edit"><span aria-hidden="true">Edit</span></button>
                                                    <button
                                                        type="button"
                                                        className={voucher.is_active ? "danger" : "enable"}
                                                        onClick={() => {
                                                            setConfirmationError("");
                                                            setConfirmation({ voucher, nextActive: !voucher.is_active });
                                                        }}
                                                        aria-label={`${voucher.is_active ? "Disable" : "Enable"} ${voucher.code}`}
                                                        title={voucher.is_active ? "Disable voucher" : "Enable voucher"}
                                                    >
                                                        {voucher.is_active ? "Disable" : "Enable"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && pagination.total > 0 && (
                    <footer className="voucher-pagination">
                        <span>{pagination.total} voucher{pagination.total === 1 ? "" : "s"}</span>
                        <div>
                            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={17} /></button>
                            <span>Page {pagination.current_page} of {pagination.last_page}</span>
                            <button type="button" onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))} disabled={page >= pagination.last_page} aria-label="Next page"><ChevronRight size={17} /></button>
                        </div>
                    </footer>
                )}
            </section>

            {formOpen && (
                <Dialog
                    open={formOpen}
                    onClose={closeForm}
                    ariaLabelledBy="voucher-form-title"
                    className="voucher-modal voucher-edit-modal"
                    busy={saving}
                >
                        <header className="voucher-modal-header">
                            <div><span>VOUCHER DETAILS</span><h2 id="voucher-form-title">{editing ? `Edit ${editing.code}` : "Create voucher"}</h2></div>
                            <button type="button" onClick={closeForm} disabled={saving} aria-label="Close voucher form"><X size={19} /></button>
                        </header>
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="voucher-form-grid">
                                <label className="voucher-form-field">
                                    <span>Voucher code <b>*</b></span>
                                    <input value={form.code} maxLength={64} autoComplete="off" onChange={(event) => setField("code", event.target.value.toUpperCase())} aria-invalid={Boolean(fieldError("code"))} aria-describedby={fieldError("code") ? "voucher-code-error" : undefined} />
                                    {fieldError("code") && <small className="voucher-field-error" id="voucher-code-error">{fieldError("code")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>Discount type <b>*</b></span>
                                    <select value={form.discountType} onChange={(event) => {
                                        setField("discountType", event.target.value);
                                        if (event.target.value === "fixed") setField("maximumDiscount", "");
                                    }}>
                                        <option value="fixed">Fixed amount</option>
                                        <option value="percentage">Percentage</option>
                                    </select>
                                    {fieldError("discountType") && <small className="voucher-field-error">{fieldError("discountType")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>{form.discountType === "percentage" ? "Discount percentage" : "Discount amount"} <b>*</b></span>
                                    <div className="voucher-number-input">
                                        {form.discountType === "fixed" && <span>₱</span>}
                                        <input type="number" min="0.01" max={form.discountType === "percentage" ? "100" : "9999999999.99"} step="0.01" value={form.discountValue} onChange={(event) => setField("discountValue", event.target.value)} />
                                        {form.discountType === "percentage" && <span>%</span>}
                                    </div>
                                    {fieldError("discountValue") && <small className="voucher-field-error">{fieldError("discountValue")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>Minimum spend <b>*</b></span>
                                    <div className="voucher-number-input"><span>₱</span><input type="number" min="0" max="9999999999.99" step="0.01" value={form.minimumSpend} onChange={(event) => setField("minimumSpend", event.target.value)} /></div>
                                    {fieldError("minimumSpend") && <small className="voucher-field-error">{fieldError("minimumSpend")}</small>}
                                </label>
                                {form.discountType === "percentage" && (
                                    <label className="voucher-form-field">
                                        <span>Maximum discount <em>Optional</em></span>
                                        <div className="voucher-number-input"><span>₱</span><input type="number" min="0.01" max="9999999999.99" step="0.01" value={form.maximumDiscount} onChange={(event) => setField("maximumDiscount", event.target.value)} /></div>
                                        {fieldError("maximumDiscount") && <small className="voucher-field-error">{fieldError("maximumDiscount")}</small>}
                                    </label>
                                )}
                                <label className="voucher-form-field">
                                    <span>Starts at <em>Optional</em></span>
                                    <input type="datetime-local" value={form.startsAt} onChange={(event) => setField("startsAt", event.target.value)} />
                                    {fieldError("startsAt") && <small className="voucher-field-error">{fieldError("startsAt")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>Expires at <em>Optional</em></span>
                                    <input type="datetime-local" value={form.expiresAt} onChange={(event) => setField("expiresAt", event.target.value)} />
                                    {fieldError("expiresAt") && <small className="voucher-field-error">{fieldError("expiresAt")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>Total usage limit <em>Blank means unlimited</em></span>
                                    <input type="number" min="1" step="1" value={form.usageLimit} onChange={(event) => setField("usageLimit", event.target.value)} />
                                    {fieldError("usageLimit") && <small className="voucher-field-error">{fieldError("usageLimit")}</small>}
                                </label>
                                <label className="voucher-form-field">
                                    <span>Uses per buyer <b>*</b></span>
                                    <input type="number" min="1" step="1" value={form.perBuyerLimit} onChange={(event) => setField("perBuyerLimit", event.target.value)} />
                                    {fieldError("perBuyerLimit") && <small className="voucher-field-error">{fieldError("perBuyerLimit")}</small>}
                                </label>
                                <label className="voucher-form-field full">
                                    <span>Description <em>Optional</em></span>
                                    <textarea rows={2} maxLength={1000} value={form.description} onChange={(event) => setField("description", event.target.value)} />
                                    {fieldError("description") && <small className="voucher-field-error">{fieldError("description")}</small>}
                                </label>
                                <label className="voucher-form-field full">
                                    <span>Eligible product IDs <em>Optional, comma-separated</em></span>
                                    <input value={form.productIds} placeholder="Example: 12, 24" onChange={(event) => setField("productIds", event.target.value)} />
                                    <small>Product IDs must exist. Leave blank to include every product.</small>
                                    {fieldError("productIds") && <small className="voucher-field-error">{fieldError("productIds")}</small>}
                                </label>
                                <label className="voucher-form-field full">
                                    <span>Eligible categories <em>Optional, comma-separated</em></span>
                                    <input list="voucher-supported-categories" value={form.categories} placeholder="Choose names from the existing product categories" onChange={(event) => setField("categories", event.target.value)} />
                                    <datalist id="voucher-supported-categories">
                                        {supportedCategories.map((category) => <option value={category} key={category} />)}
                                    </datalist>
                                    <small>Use exact category names from the suggestions. When both restriction fields are set, a product matching either restriction qualifies.</small>
                                    {fieldError("categories") && <small className="voucher-field-error">{fieldError("categories")}</small>}
                                </label>
                                <label className="voucher-active-toggle">
                                    <input type="checkbox" checked={form.isActive} onChange={(event) => setField("isActive", event.target.checked)} />
                                    <span><strong>Enable voucher</strong><small>Buyers can see and use it only when all checkout conditions are met.</small></span>
                                </label>
                            </div>
                            {error && <div className="voucher-form-alert" role="alert">{error}</div>}
                            <footer className="voucher-modal-footer">
                                <button type="button" className="voucher-secondary-button" onClick={closeForm} disabled={saving}>Cancel</button>
                                <button type="submit" className="voucher-primary-button" disabled={saving}>
                                    {saving ? <><LoaderCircle size={16} className="voucher-spinner" /> Saving…</> : editing ? "Save changes" : "Create voucher"}
                                </button>
                            </footer>
                        </form>
                </Dialog>
            )}

            {details && (
                <Dialog
                    open={Boolean(details)}
                    onClose={() => setDetails(null)}
                    ariaLabelledBy="voucher-details-title"
                    className="voucher-modal voucher-details-modal"
                    busy={detailsLoading}
                >
                        <header className="voucher-modal-header">
                            <div><span>VOUCHER REPORT</span><h2 id="voucher-details-title">{details.voucher.code}</h2></div>
                            <button type="button" onClick={() => setDetails(null)} aria-label="Close voucher details" disabled={detailsLoading}><X size={19} /></button>
                        </header>
                        {detailsLoading ? (
                            <div className="voucher-state"><LoaderCircle size={20} className="voucher-spinner" /> Loading details…</div>
                        ) : (
                            <>
                                <div className="voucher-detail-summary">
                                    <div><span>Discount</span><strong>{discountText(details.voucher)}</strong></div>
                                    <div><span>Status</span><strong>{voucherStatus(details.voucher)}</strong></div>
                                    <div><span>Total redemptions</span><strong>{details.voucher.redemptions_count || 0}{details.voucher.usage_limit === null ? " / Unlimited" : ` / ${details.voucher.usage_limit}`}</strong></div>
                                    <div><span>Recorded discount</span><strong>{formatMoney(details.voucher.redemptions_sum_discount_amount)}</strong></div>
                                    <div><span>Minimum spend</span><strong>{formatMoney(details.voucher.minimum_spend)}</strong></div>
                                    <div><span>Per-buyer limit</span><strong>{details.voucher.per_buyer_limit}</strong></div>
                                    <div><span>Starts</span><strong>{formatDate(details.voucher.starts_at, true)}</strong></div>
                                    <div><span>Expires</span><strong>{formatDate(details.voucher.expires_at, true)}</strong></div>
                                </div>
                                {details.voucher.description && <p className="voucher-detail-description">{details.voucher.description}</p>}
                                {(details.voucher.categories?.length > 0 || details.voucher.product_ids?.length > 0) && (
                                    <div className="voucher-detail-restrictions">
                                        <strong>Eligibility</strong>
                                        {details.voucher.categories?.length > 0 && <span>Categories: {details.voucher.categories.join(", ")}</span>}
                                        {details.voucher.product_ids?.length > 0 && <span>Product IDs: {details.voucher.product_ids.join(", ")}</span>}
                                    </div>
                                )}
                                <section className="voucher-redemptions">
                                    <h3>Recent redemptions</h3>
                                    {details.redemptions?.data?.length ? (
                                        <div className="voucher-redemption-list">
                                            {details.redemptions.data.map((redemption) => (
                                                <div key={redemption.id}>
                                                    <span>Order #{redemption.order_id}</span>
                                                    <strong>{formatMoney(redemption.discount_amount)}</strong>
                                                    <time>{formatDate(redemption.created_at, true)}</time>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p>No redemptions have been recorded.</p>}
                                    <small>Buyer contact and profile details are not displayed here.</small>
                                </section>
                                <footer className="voucher-modal-footer">
                                    <button type="button" className="voucher-secondary-button" onClick={() => setDetails(null)}>Close</button>
                                    <button type="button" className="voucher-primary-button" onClick={() => {
                                        const voucher = details.voucher;
                                        setDetails(null);
                                        openEdit(voucher);
                                    }}>Edit voucher</button>
                                </footer>
                            </>
                        )}
                </Dialog>
            )}

            {confirmation && (
                <Dialog
                    open={Boolean(confirmation)}
                    onClose={() => setConfirmation(null)}
                    ariaLabelledBy="voucher-confirm-title"
                    className="voucher-confirm-modal"
                    busy={statusSaving}
                >
                        <div className={`voucher-confirm-icon${confirmation.nextActive ? "" : " warning"}`}><Ticket size={21} /></div>
                        <h2 id="voucher-confirm-title">{confirmation.nextActive ? "Enable this voucher?" : "Disable this voucher?"}</h2>
                        <p>{confirmation.nextActive
                            ? `${confirmation.voucher.code} can be used by buyers when its dates, limits, and checkout eligibility allow it.`
                            : `${confirmation.voucher.code} will no longer be redeemable. Existing order discounts remain unchanged.`}</p>
                        {confirmationError && <div className="voucher-form-alert" role="alert">{confirmationError}</div>}
                        <div className="voucher-confirm-actions">
                            <button type="button" className="voucher-secondary-button" onClick={() => setConfirmation(null)} disabled={statusSaving}>Cancel</button>
                            <button type="button" className="voucher-primary-button" onClick={() => void confirmStatusChange()} disabled={statusSaving}>
                                {statusSaving ? "Updating…" : confirmation.nextActive ? "Enable voucher" : "Disable voucher"}
                            </button>
                        </div>
                </Dialog>
            )}
        </div>
    );
}

export default Vouchers;
