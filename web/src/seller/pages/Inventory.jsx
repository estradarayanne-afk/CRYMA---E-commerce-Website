import { useState, useEffect, useCallback, useRef } from "react";
import { ImagePlus, Trash2, Upload, Video } from "lucide-react";
import api from "../../shared/services/api";
import { formatStatusLabel } from "../../shared/utils/statusLabel";
import { PRODUCT_CATEGORIES } from "../../shared/constants/categories";
import Dialog from "../../shared/components/Dialog";
import Toast from "../../shared/components/Toast";

const EMPTY_FORM = {
    name: "",
    sku: "",
    category: PRODUCT_CATEGORIES[0],
    description: "",
    price: "",
    discounted_price: "",
    stock: "",
    weight_kg: "",
    variants: [],
    status: "active",
};

const MEDIA_LIMITS = { image: 8, video: 2 };
const MAX_VARIANTS = 20;
const MAX_MEDIA_FILE_BYTES = 1536 * 1024;
const MAX_MEDIA_TOTAL_BYTES = 6 * 1024 * 1024;

function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [modal, setModal] = useState(null); // null | "add" | product obj
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [mediaUploads, setMediaUploads] = useState([]);
    const [variantMedia, setVariantMedia] = useState({});
    const [existingMedia, setExistingMedia] = useState([]);
    const [saving, setSaving] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState(null);
    const [archiving, setArchiving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState(null);
    const [actionError, setActionError] = useState("");
    const toastIdRef = useRef(0);
    const previewUrlsRef = useRef(new Set());

    const showToast = (message) => setToast({ id: ++toastIdRef.current, message });

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const allProducts = [];
            let page = 1;
            let lastPage = 1;
            do {
                const { data } = await api.get("/seller/products", { params: { per_page: 100, page } });
                const pageData = data.data;
                allProducts.push(...(pageData?.data ?? pageData ?? []));
                lastPage = Number(pageData?.last_page || 1);
                page += 1;
            } while (page <= lastPage);
            setProducts(allProducts);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Failed to load products. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void load(); }, 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    useEffect(() => () => {
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrlsRef.current.clear();
    }, []);

    const visible = products.filter((p) => {
        const matchSearch = `${p.name} ${p.sku || ""}`.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "all" ? true :
            filter === "low" ? p.stock > 0 && p.stock <= 3 :
            filter === "out" ? p.stock === 0 :
            filter === "archived" ? p.status === "archived" :
            filter === "active" ? p.status === "active" : true;
        return matchSearch && matchFilter;
    });

    const clearMediaDraft = () => {
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrlsRef.current.clear();
        setMediaUploads([]);
        setVariantMedia({});
        setExistingMedia([]);
    };
    const closeProductForm = () => {
        if (saving) return;
        clearMediaDraft();
        setModal(null);
    };
    const openAdd = () => {
        setActionError("");
        setFormErrors({});
        clearMediaDraft();
        setForm(EMPTY_FORM);
        setModal("add");
    };
    const openEdit = (p) => {
        setActionError("");
        setFormErrors({});
        clearMediaDraft();
        setExistingMedia(p.media || []);
        setVariantMedia(Object.fromEntries(
            (Array.isArray(p.variants) ? p.variants : [])
                .filter((variant) => variant.media_url || variant.color_image_url)
                .map((variant) => [String(variant.id), {
                    type: variant.media_type || "image",
                    url: variant.media_url || variant.color_image_url,
                }]),
        ));
        setForm({
            name: p.name,
            sku: p.sku || "",
            category: p.category,
            description: p.description || "",
            price: String(p.price),
            discounted_price: p.discounted_price ? String(p.discounted_price) : "",
            stock: String(p.stock),
            weight_kg: p.weight_kg ? String(p.weight_kg) : "",
            variants: Array.isArray(p.variants) ? p.variants : [],
            status: p.status || "active",
        });
        setModal(p);
    };

    const addMediaFiles = (type, event) => {
        const files = Array.from(event.target.files || []);
        event.target.value = "";
        const existingCount = existingMedia.filter((media) => media.type === type).length;
        const pendingCount = mediaUploads.filter((media) => media.type === type).length;
        const available = MEDIA_LIMITS[type] - existingCount - pendingCount;
        const pendingBytes = mediaUploads.reduce((total, media) => total + media.file.size, 0)
            + Object.values(variantMedia).reduce((total, photo) => total + (photo.file?.size || 0), 0);
        let remainingBytes = MAX_MEDIA_TOTAL_BYTES - pendingBytes;
        const selectedFiles = [];
        let message = "";
        for (const file of files) {
            if (selectedFiles.length >= Math.max(0, available)) {
                message = `You can add up to ${MEDIA_LIMITS[type]} ${type === "image" ? "photos" : "videos"} per product.`;
                break;
            }
            if (file.size > MAX_MEDIA_FILE_BYTES) {
                message = "Each photo or video must be 1.5 MB or smaller.";
                continue;
            }
            if (file.size > remainingBytes) {
                message = "Photos and videos together must be 6 MB or smaller per save.";
                continue;
            }
            selectedFiles.push(file);
            remainingBytes -= file.size;
        }
        setFormErrors((current) => {
            const next = { ...current };
            if (message) next[type] = message;
            else delete next[type];
            return next;
        });
        const selected = selectedFiles.map((file) => {
            const previewUrl = URL.createObjectURL(file);
            previewUrlsRef.current.add(previewUrl);
            return { file, type, previewUrl };
        });
        setMediaUploads((current) => [...current, ...selected]);
    };

    const removePendingMedia = (index) => {
        setMediaUploads((current) => {
            const removed = current[index];
            if (removed) {
                URL.revokeObjectURL(removed.previewUrl);
                previewUrlsRef.current.delete(removed.previewUrl);
            }
            return current.filter((_, itemIndex) => itemIndex !== index);
        });
    };

    const removeExistingMedia = (id) => {
        setExistingMedia((current) => current.filter((media) => media.id !== id));
    };

    const addVariantMedia = (variantId, event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        const key = String(variantId);
        const previous = variantMedia[key];
        const pendingMediaBytes = mediaUploads.reduce((total, media) => total + media.file.size, 0);
        const pendingVariantBytes = Object.values(variantMedia)
            .reduce((total, media) => total + (media.file?.size || 0), 0) - (previous?.file?.size || 0);
        if (file.size > MAX_MEDIA_FILE_BYTES) {
            setFormErrors((current) => ({ ...current, variantMedia: "Each variant photo or video must be 1.5 MB or smaller." }));
            return;
        }
        if (pendingMediaBytes + pendingVariantBytes + file.size > MAX_MEDIA_TOTAL_BYTES) {
            setFormErrors((current) => ({ ...current, variantMedia: "Product and variant photos/videos together must be 6 MB or smaller per save." }));
            return;
        }
        if (previous?.previewUrl) {
            URL.revokeObjectURL(previous.previewUrl);
            previewUrlsRef.current.delete(previous.previewUrl);
        }
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        const type = file.type.startsWith("video/") ? "video" : "image";
        setVariantMedia((current) => ({ ...current, [key]: { type, file, url: previewUrl, previewUrl } }));
        setFormErrors((current) => {
            const next = { ...current };
            delete next.variantMedia;
            return next;
        });
    };
    const handleSave = async () => {
        const hasVariants = form.variants.length > 0;
        if (!form.name.trim() || (!hasVariants && (!form.price || !form.stock))) return;
        if (!form.weight_kg || !Number.isFinite(Number(form.weight_kg)) || Number(form.weight_kg) <= 0 || Number(form.weight_kg) > 100000) {
            setFormErrors((current) => ({ ...current, weight_kg: "Enter a product weight greater than 0 kg and no more than 100,000 kg." }));
            return;
        }
        if (form.variants.length > MAX_VARIANTS) {
            setFormErrors((current) => ({ ...current, variants: `You can add up to ${MAX_VARIANTS} variants per product.` }));
            return;
        }
        const missingVariant = form.variants.find((variant) => !variantMedia[String(variant.id)]?.url);
        if (missingVariant) {
            setFormErrors((current) => ({ ...current, variantMedia: `Upload a photo or video for every variant. ${missingVariant.color || missingVariant.size || "Variant"} is missing media.` }));
            return;
        }
        setSaving(true);
        setActionError("");
        setFormErrors({});
        try {
            const payload = new FormData();
            payload.append("name", form.name.trim());
            payload.append("sku", form.sku.trim());
            payload.append("category", form.category);
            payload.append("description", form.description);
            payload.append("weight_kg", form.weight_kg);
            const variantPrices = form.variants
                .map((variant) => Number(variant.price))
                .filter(Number.isFinite);
            payload.append("price", hasVariants ? String(Math.min(...variantPrices)) : form.price);
            payload.append("discounted_price", hasVariants ? "" : form.discounted_price);
            payload.append("stock", hasVariants
                ? String(form.variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0))
                : form.stock);
            payload.append("status", form.status);
            payload.append("variants", JSON.stringify(form.variants.map(({ image, media_path, media_type, media_url, color_image_url, ...variant }) => variant)));
            form.variants.forEach((variant) => {
                const media = variantMedia[String(variant.id)];
                if (media?.file) {
                    payload.append("variant_media[]", media.file);
                    payload.append("variant_media_ids[]", String(variant.id));
                }
            });
            mediaUploads.filter((media) => media.type === "image").forEach(({ file }) => payload.append("images[]", file));
            mediaUploads.filter((media) => media.type === "video").forEach(({ file }) => payload.append("videos[]", file));
            if (modal === "add") {
                const response = await api.post("/seller/products", payload);
                showToast(response.data.message || "Product submitted for admin review.");
            } else {
                payload.append("_method", "PATCH");
                payload.append("replace_media", "1");
                existingMedia.forEach((media) => payload.append("keep_media_ids[]", String(media.id)));
                const response = await api.post(`/seller/products/${modal.id}`, payload);
                showToast(response.data.message || "Product updated.");
            }
            clearMediaDraft();
            setModal(null);
            await load();
        } catch (err) {
            const validationErrors = err.response?.data?.errors;
            if (validationErrors && typeof validationErrors === "object") {
                const fieldErrors = Object.fromEntries(
                    Object.entries(validationErrors).map(([field, messages]) => [
                        field === "images" || field.startsWith("images.") ? "image" : field.startsWith("videos.") ? "video" : field.startsWith("variant_media") || field.startsWith("color_photos") || field.startsWith("color_photo_colors") ? "variantMedia" : field.startsWith("variants.") ? "variants" : field,
                        Array.isArray(messages) ? messages[0] : messages,
                    ]),
                );
                setFormErrors(fieldErrors);
                setActionError(Object.keys(fieldErrors).length ? "Review the highlighted fields." : "");
            } else {
                setActionError(err.response?.data?.message || "Failed to save product. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!confirmArchive) return;
        setArchiving(true);
        setActionError("");
        try {
            if (confirmArchive.status === "archived") {
                await api.patch(`/seller/products/${confirmArchive.id}/restore`);
                showToast("Product restored.");
            } else {
                await api.patch(`/seller/products/${confirmArchive.id}/archive`);
                showToast("Product archived.");
            }
            setConfirmArchive(null);
            await load();
        } catch (err) {
            setActionError(err.response?.data?.message || "Action failed. Please try again.");
        } finally {
            setArchiving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        setActionError("");
        try {
            await api.delete(`/seller/products/${confirmDelete.id}`);
            setConfirmDelete(null);
            showToast("Product removed.");
            await load();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to remove product. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    const handleArchiveFromDelete = async () => {
        if (!confirmDelete) return;
        setArchiving(true);
        setActionError("");
        try {
            await api.patch(`/seller/products/${confirmDelete.id}/archive`);
            setConfirmDelete(null);
            showToast("Product archived.");
            await load();
        } catch (err) {
            setActionError(err.response?.data?.message || "Failed to archive product. Please try again.");
        } finally {
            setArchiving(false);
        }
    };
    const set = (e) => {
        const { name, value } = e.target;
        setForm((current) => ({ ...current, [name]: value }));
        setFormErrors((current) => {
            if (!(name in current)) return current;
            const next = { ...current };
            delete next[name];
            return next;
        });
    };

    const addVariant = () => {
        if (form.variants.length >= MAX_VARIANTS) {
            setFormErrors((current) => ({ ...current, variants: "You can add up to 20 variants per product." }));
            return;
        }
        setForm((current) => ({
            ...current,
            variants: [...current.variants, {
                id: crypto.randomUUID(), color: "", size: "", price: "", discounted_price: "", stock: "",
            }],
        }));
        setFormErrors((current) => { const next = { ...current }; delete next.variants; return next; });
    };
    const updateVariant = (index, field, value) => {
        setForm((current) => ({
            ...current,
            variants: current.variants.map((variant, rowIndex) =>
                rowIndex === index ? { ...variant, [field]: value } : variant
            ),
        }));
        setFormErrors((current) => {
            if (!current.variants) return current;
            const next = { ...current };
            delete next.variants;
            return next;
        });
    };

    const removeVariant = (index) => {
        const removedVariant = form.variants[index];
        const removedMedia = removedVariant && variantMedia[String(removedVariant.id)];
        if (removedMedia?.previewUrl) {
            URL.revokeObjectURL(removedMedia.previewUrl);
            previewUrlsRef.current.delete(removedMedia.previewUrl);
        }
        if (removedVariant) {
            setVariantMedia((current) => { const next = { ...current }; delete next[String(removedVariant.id)]; return next; });
        }
        setForm((current) => ({ ...current, variants: current.variants.filter((_, rowIndex) => rowIndex !== index) }));
        setFormErrors((current) => { const next = { ...current }; delete next.variantMedia; return next; });
    };
    return (
        <div className="sl-page sl-inventory-page">
            {toast && (
                <Toast key={toast.id} message={toast.message} type="success" onDismiss={() => setToast(null)} />
            )}

            <div className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">INVENTORY</div>
                    <h1 className="sl-h1">Inventory</h1>
                    <p>{products.length} products · {products.filter((product) => product.status === "active").length} active · {products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 3).length} low stock</p>
                </div>
                <button type="button" className="sl-btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {error && <div className="auth-notice auth-notice--error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* TOOLBAR */}
            <div className="sl-toolbar">
                <div className="sl-search-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input aria-label="Search products" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product name or SKU" />
                </div>
                <div className="sl-filter-tabs">
                    {["all", "active", "low", "out", "archived"].map((f) => (
                        <button type="button" key={f} className={filter === f ? "active" : ""} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                            {f === "low" ? "Low Stock" : f === "out" ? "Out of Stock" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* TABLE */}
            <div className="sl-card">
                <div className="sl-table-wrap">
                    <table className="sl-table">
                        <thead>
                            <tr>
                                <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} className="sl-empty" role="status">Loading products…</td></tr>}
                            {!loading && visible.length === 0 && <tr><td colSpan={6} className="sl-empty">{search ? "No products match your search." : products.length ? "No products in this filter." : "No products yet. Add your first product to start building your storefront."}</td></tr>}
                            {!loading && visible.map((p) => (
                                <tr key={p.id} className={p.status === "archived" ? "sl-row-muted" : ""}>
                                    <td>
                                        <div className="sl-inventory-product">
                                            {p.image && <img src={p.image} alt="" loading="lazy" />}
                                            <div><strong>{p.name}</strong><span>{p.sku ? `SKU ${p.sku}` : "No SKU"} · {(p.media || []).length} media</span></div>
                                        </div>
                                    </td>
                                    <td>{p.category}</td>
                                    <td className="sl-inventory-price">{p.variants?.length ? <><strong>From ₱{Math.min(...p.variants.map((variant) => Number(variant.discounted_price || variant.price))).toLocaleString()}</strong><span>{p.variants.length} variants</span></> : p.discounted_price ? <><strong>₱{Number(p.discounted_price).toLocaleString()}</strong><del>₱{Number(p.price).toLocaleString()}</del></> : `₱${Number(p.price).toLocaleString()}`}</td>
                                    <td>
                                        <span className={`sl-stock ${p.stock === 0 ? "sl-stock--out" : p.stock <= 3 ? "sl-stock--low" : ""}`}>
                                            {p.stock === 0 ? "Out of stock" : `${p.stock} units`}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="sl-inventory-status">
                                            <span className={`sl-badge ${p.status === "active" ? "sl-badge--green" : "sl-badge--muted"}`}>
                                                {formatStatusLabel(p.status === "out_of_stock" ? "Out of stock" : p.status === "archived" ? "Archived" : p.status === "inactive" ? "Inactive" : "Active")}


                                            </span>
                                            {p.review_status === "pending" && <span className="sl-badge sl-badge--review">Pending admin review</span>}
                                            {p.review_status === "rejected" && <span className="sl-badge sl-badge--rejected" title={p.review_reason || "Review the product and update its listing to resubmit."}>Rejected · edit to resubmit</span>}
                                            {p.review_status === "rejected" && p.review_reason && <small className="sl-review-reason">Reason: {p.review_reason}</small>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="sl-row-actions">
                                            <button className="sl-btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                            <button className="sl-btn-sm sl-btn-sm--ghost" onClick={() => { setActionError(""); setConfirmArchive(p); }}>
                                                {p.status === "archived" ? "Restore" : "Archive"}
                                            </button>
                                            <button className="sl-btn-sm sl-btn-sm--remove" onClick={() => { setActionError(""); setConfirmDelete(p); }}>Remove</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT MODAL */}
            {modal !== null && (
                <Dialog
                    open={modal !== null}
                    onClose={closeProductForm}
                    ariaLabelledBy="inventory-modal-title"
                    className="sl-modal sl-modal--edit"
                    busy={saving}
                >
                        <div className="sl-modal-head">
                            <div className="sl-modal-heading-copy"><span className="sl-modal-eyebrow">{modal === "add" ? "NEW LISTING" : "PRODUCT LISTING"}</span><h3 id="inventory-modal-title">{modal === "add" ? "Add Product" : "Edit Product"}</h3>{modal !== "add" && <p>Update product details, options, pricing, and media.</p>}</div>
                            <button type="button" className="sl-modal-close" aria-label="Close product form" onClick={closeProductForm} disabled={saving}>✕</button>
                        </div>
                        <form id="inventory-product-form" className="sl-modal-body sl-product-form" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
                            {actionError && <div className="auth-notice auth-notice--error" role="alert">{actionError}</div>}
                            <section className="sl-form-section">
                                <div className="sl-form-section-heading"><h4>Product information</h4><p>Help shoppers identify and understand your item.</p></div>
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label htmlFor="inventory-product-name">Product name <b>*</b></label>
                                    <input id="inventory-product-name" name="name" value={form.name} maxLength={150} onChange={set} placeholder="e.g. Ribbed Knit Co-ord" disabled={saving} required aria-invalid={Boolean(formErrors.name)} aria-describedby={formErrors.name ? "inventory-product-name-error" : undefined} />
                                    {formErrors.name && <small id="inventory-product-name-error" className="sl-field-error">{formErrors.name}</small>}
                                </div>
                                <div className="sl-field">
                                    <label htmlFor="inventory-product-category">Category <b>*</b></label>
                                    <select id="inventory-product-category" name="category" value={form.category} onChange={set} disabled={saving} required aria-invalid={Boolean(formErrors.category)} aria-describedby={formErrors.category ? "inventory-product-category-error" : undefined}>
                                        {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                    {formErrors.category && <small id="inventory-product-category-error" className="sl-field-error">{formErrors.category}</small>}
                                </div>
                            </div>
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label htmlFor="inventory-product-sku">SKU <span className="sl-opt">(optional, unique per store)</span></label>
                                    <input id="inventory-product-sku" name="sku" value={form.sku} maxLength={64} onChange={set} placeholder="e.g. DRESS-RED-M" disabled={saving} aria-invalid={Boolean(formErrors.sku)} aria-describedby={formErrors.sku ? "inventory-product-sku-error" : undefined} />
                                    {formErrors.sku && <small id="inventory-product-sku-error" className="sl-field-error">{formErrors.sku}</small>}
                                </div>
                                <div className="sl-field">
                                    <label htmlFor="inventory-product-status">Listing status</label>
                                    <select id="inventory-product-status" name="status" value={form.status} onChange={set} disabled={saving}>
                                        <option value="active">Active — visible to buyers</option>
                                        <option value="inactive">Inactive — hidden from buyers</option>
                                        <option value="out_of_stock">Out of stock — not purchasable</option>
                                    </select>
                                </div>
                            </div>
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label htmlFor="inventory-product-weight">Product weight (kg) <b>*</b></label>
                                    <input id="inventory-product-weight" name="weight_kg" type="number" min="0.001" max="100000" step="0.001" value={form.weight_kg} onChange={set} placeholder="e.g. 0.500" disabled={saving} required aria-invalid={Boolean(formErrors.weight_kg)} aria-describedby={formErrors.weight_kg ? "inventory-product-weight-error" : "inventory-product-weight-help"} />
                                    {formErrors.weight_kg ? <small id="inventory-product-weight-error" className="sl-field-error">{formErrors.weight_kg}</small> : <small id="inventory-product-weight-help" className="sl-opt">Enter the weight of one item in kilograms.</small>}
                                </div>
                            </div>
                            <div className="sl-field">
                                <label htmlFor="inventory-product-description">Description <span className="sl-opt">(optional)</span></label>
                                <textarea id="inventory-product-description" name="description" rows={4} value={form.description} maxLength={2000} onChange={set} placeholder="Describe the item, materials, fit, and useful care details…" disabled={saving} aria-invalid={Boolean(formErrors.description)} aria-describedby={formErrors.description ? "inventory-product-description-error" : undefined} />
                                {formErrors.description && <small id="inventory-product-description-error" className="sl-field-error">{formErrors.description}</small>}
                            </div>
                            </section>
                            <section className="sl-form-section">
                                <div className="sl-form-section-heading"><h4>Price and stock</h4><p>Set a product-wide price, or define prices and stock for each color and size combination.</p></div>
                                {form.variants.length > 0 ? (
                                    <div className="sl-variant-editor">
                                        <div className="sl-variant-editor-heading">
                                            <strong>Color and size variants <span className="sl-variant-count">{form.variants.length}/{MAX_VARIANTS}</span></strong>
                                            <button type="button" className="sl-btn-sm" onClick={addVariant} disabled={saving || form.variants.length >= MAX_VARIANTS}>+ Add variant</button>
                                        </div>
                                        <p className="sl-variant-help">Each combination can have its own price, sale price, and stock. Enter at least a color or a size.</p>
                                        {form.variants.map((variant, index) => {
                                            const variantId = String(variant.id || index);
                                            const media = variantMedia[variantId];
                                            return (
                                                <div className="sl-variant-entry" key={variantId}>
                                                    <div className="sl-variant-row">
                                                        <div className="sl-field">
                                                            <label htmlFor={"variant-color-" + index}>Color</label>
                                                            <input id={"variant-color-" + index} value={variant.color || ""} maxLength={50} placeholder="e.g. Navy blue" onChange={(event) => updateVariant(index, "color", event.target.value)} disabled={saving} />
                                                        </div>
                                                        <div className="sl-field">
                                                            <label htmlFor={"variant-size-" + index}>Size</label>
                                                            <input id={"variant-size-" + index} value={variant.size || ""} maxLength={50} placeholder="e.g. M" onChange={(event) => updateVariant(index, "size", event.target.value)} disabled={saving} />
                                                        </div>
                                                        <div className="sl-field">
                                                            <label htmlFor={"variant-price-" + index}>Price (₱)</label>
                                                            <input id={"variant-price-" + index} type="number" min="0" max="9999999999.99" step="0.01" value={variant.price} placeholder="0.00" onChange={(event) => updateVariant(index, "price", event.target.value)} disabled={saving} required />
                                                        </div>
                                                        <div className="sl-field">
                                                            <label htmlFor={"variant-sale-" + index}>Sale price (₱)</label>
                                                            <input id={"variant-sale-" + index} type="number" min="0.01" max="9999999999.99" step="0.01" value={variant.discounted_price || ""} placeholder="Optional" onChange={(event) => updateVariant(index, "discounted_price", event.target.value)} disabled={saving} />
                                                        </div>
                                                        <div className="sl-field">
                                                            <label htmlFor={"variant-stock-" + index}>Stock</label>
                                                            <input id={"variant-stock-" + index} type="number" min="0" max="4294967295" step="1" value={variant.stock} placeholder="0" onChange={(event) => updateVariant(index, "stock", event.target.value)} disabled={saving} required />
                                                        </div>
                                                        <button type="button" className="sl-btn-sm sl-variant-remove" onClick={() => removeVariant(index)} disabled={saving} aria-label={"Remove variant " + (index + 1)}><Trash2 size={15} /></button>
                                                    </div>
                                                    <div className={"sl-variant-media-card" + (!media?.url ? " is-missing" : "")}>
                                                        <div className="sl-variant-media-copy">
                                                            <strong>Photo or video for this variant <b>*</b></strong>
                                                            <p>Required. JPG, PNG, WebP, MP4, or WebM; up to 1.5 MB.</p>
                                                        </div>
                                                        {media?.url && (media.type === "video"
                                                            ? <video src={media.url} controls muted preload="metadata" aria-label={"Video for variant " + (index + 1)} />
                                                            : <img src={media.url} alt={"Photo for variant " + (index + 1)} />)}
                                                        <label className="sl-media-upload-button">
                                                            {media?.type === "video" ? <Video size={16} /> : <ImagePlus size={16} />}
                                                            {media?.url ? "Replace photo or video" : "Upload required media"}
                                                            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" disabled={saving} onChange={(event) => addVariantMedia(variantId, event)} aria-required={!media?.url} aria-invalid={Boolean(formErrors.variantMedia && !media?.url)} aria-label={"Upload a photo or video for variant " + (index + 1)} />
                                                        </label>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {formErrors.variantMedia && <small className="sl-field-error" role="alert">{formErrors.variantMedia}</small>}
                                        {formErrors.variants && <small className="sl-field-error" role="alert">{formErrors.variants}</small>}
                                    </div>
                                ) : (
                                    <>
                                        <div className="sl-form-row">
                                            <div className="sl-field">
                                                <label htmlFor="inventory-product-price">Regular price (₱) <b>*</b></label>
                                                <input id="inventory-product-price" name="price" type="number" min="0" max="9999999999.99" step="0.01" value={form.price} onChange={set} placeholder="0.00" disabled={saving} required aria-invalid={Boolean(formErrors.price)} aria-describedby={formErrors.price ? "inventory-product-price-error" : undefined} />
                                                {formErrors.price && <small id="inventory-product-price-error" className="sl-field-error">{formErrors.price}</small>}
                                            </div>
                                            <div className="sl-field">
                                                <label htmlFor="inventory-product-sale-price">Discounted price (₱) <span className="sl-opt">(optional)</span></label>
                                                <input id="inventory-product-sale-price" name="discounted_price" type="number" min="0.01" max="9999999999.99" step="0.01" value={form.discounted_price} onChange={set} placeholder="Leave blank for no sale" disabled={saving} aria-invalid={Boolean(formErrors.discounted_price)} aria-describedby={formErrors.discounted_price ? "inventory-product-sale-price-error" : undefined} />
                                                {formErrors.discounted_price && <small id="inventory-product-sale-price-error" className="sl-field-error">{formErrors.discounted_price}</small>}
                                            </div>
                                            <div className="sl-field">
                                                <label htmlFor="inventory-product-stock">Available stock <b>*</b></label>
                                                <input id="inventory-product-stock" name="stock" type="number" min="0" max="4294967295" step="1" value={form.stock} onChange={set} placeholder="0" disabled={saving} required aria-invalid={Boolean(formErrors.stock)} aria-describedby={formErrors.stock ? "inventory-product-stock-error" : undefined} />
                                                {formErrors.stock && <small id="inventory-product-stock-error" className="sl-field-error">{formErrors.stock}</small>}
                                            </div>
                                        </div>
                                        <button type="button" className="sl-btn-ghost sl-add-variant-button" onClick={addVariant} disabled={saving || form.variants.length >= MAX_VARIANTS}>Add color and size variants</button>
                                    </>
                                )}
                            </section>
                            <section className="sl-form-section">
                                <div className="sl-form-section-heading"><h4>Photos and videos</h4><p>Upload up to 8 JPG, PNG, or WebP photos and 2 MP4 or WebM videos. Each file can be up to 1.5 MB; new uploads can total up to 6 MB per save.</p></div>
                                <div className="sl-media-upload-actions">
                                    <label className="sl-media-upload-button"><ImagePlus size={17} /> Add photos
                                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={saving || existingMedia.filter((media) => media.type === "image").length + mediaUploads.filter((media) => media.type === "image").length >= MEDIA_LIMITS.image} onChange={(event) => addMediaFiles("image", event)} />
                                    </label>
                                    <label className="sl-media-upload-button"><Video size={17} /> Add videos
                                        <input type="file" accept="video/mp4,video/webm" multiple disabled={saving || existingMedia.filter((media) => media.type === "video").length + mediaUploads.filter((media) => media.type === "video").length >= MEDIA_LIMITS.video} onChange={(event) => addMediaFiles("video", event)} />
                                    </label>
                                </div>
                                {(formErrors.image || formErrors.video) && <p className="sl-field-error" role="alert">{[formErrors.image, formErrors.video].filter(Boolean).join(" ")}</p>}
                                {(existingMedia.length > 0 || mediaUploads.length > 0) ? (
                                    <div className="sl-media-grid">
                                        {existingMedia.map((media) => (
                                            <div className="sl-media-preview" key={`existing-${media.id}`}>
                                                {media.type === "video" ? <video src={media.url} controls preload="metadata" aria-label="Existing product video" /> : <img src={media.url} alt="Existing product listing" />}
                                                <span>{media.type === "video" ? "Video" : "Photo"}</span>
                                                <button type="button" onClick={() => removeExistingMedia(media.id)} disabled={saving} aria-label={`Remove existing ${media.type}`}><Trash2 size={15} /></button>
                                            </div>
                                        ))}
                                        {mediaUploads.map((media, index) => (
                                            <div className="sl-media-preview" key={`${media.type}-${media.previewUrl}`}>
                                                {media.type === "video" ? <video src={media.previewUrl} controls preload="metadata" aria-label="New product video preview" /> : <img src={media.previewUrl} alt="New product photo preview" />}
                                                <span>{media.type === "video" ? "New video" : "New photo"}</span>
                                                <button type="button" onClick={() => removePendingMedia(index)} disabled={saving} aria-label={`Remove new ${media.type}`}><Trash2 size={15} /></button>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="sl-media-empty"><Upload size={18} /><span>No media added yet. Clear photos help shoppers understand your product.</span></div>}
                            </section>

                        </form>
                        <div className="sl-modal-foot">
                            <button type="button" className="sl-btn-ghost" onClick={closeProductForm} disabled={saving}>Cancel</button>
                            <button type="submit" form="inventory-product-form" className="sl-btn-primary" disabled={saving}>
                                {saving ? "Saving…" : modal === "add" ? "Add Product" : "Save Changes"}
                            </button>
                        </div>
                </Dialog>
            )}

            {/* ARCHIVE CONFIRM */}
            {confirmArchive && (
                <Dialog
                    open={Boolean(confirmArchive)}
                    onClose={() => setConfirmArchive(null)}
                    ariaLabelledBy="inventory-archive-title"
                    className="sl-modal sl-modal--sm"
                    busy={archiving}
                >
                        <div className="sl-modal-head">
                            <h3 id="inventory-archive-title">{confirmArchive.status === "archived" ? "Restore Product" : "Archive Product"}</h3>
                            <button type="button" className="sl-modal-close" aria-label="Close confirmation" onClick={() => setConfirmArchive(null)} disabled={archiving}>✕</button>
                        </div>
                        <div className="sl-modal-body">
                            {actionError && <div className="auth-notice auth-notice--error" role="alert">{actionError}</div>}
                            <p style={{ fontSize: 14, color: "#4a6462" }}>
                                {confirmArchive.status === "archived"
                                    ? `Restore "${confirmArchive.name}" so it appears in your store again?`
                                    : `Archive "${confirmArchive.name}"? It will be hidden from your store.`}
                            </p>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setConfirmArchive(null)} disabled={archiving}>Cancel</button>
                            <button className="sl-btn-primary" onClick={handleArchiveToggle} disabled={archiving}>
                                {archiving ? "Processing…" : "Confirm"}
                            </button>
                        </div>
                </Dialog>
            )}

            {/* DELETE CONFIRM */}
            {confirmDelete && (
                <Dialog
                    open={Boolean(confirmDelete)}
                    onClose={() => setConfirmDelete(null)}
                    ariaLabelledBy="inventory-delete-title"
                    className="sl-modal sl-modal--sm sl-modal--remove"
                    busy={deleting || archiving}
                >
                        <div className="sl-modal-head">
                            <div><span className="sl-modal-eyebrow">INVENTORY ACTION</span><h3 id="inventory-delete-title">Remove this product?</h3></div>
                            <button type="button" className="sl-modal-close" aria-label="Close confirmation" onClick={() => setConfirmDelete(null)} disabled={deleting || archiving}>×</button>
                        </div>
                        <div className="sl-modal-body sl-remove-body">
                            {actionError && <div className="auth-notice auth-notice--error" role="alert">{actionError}</div>}
                            <p className="sl-remove-intro"><strong>{confirmDelete.name}</strong> will be permanently deleted if you remove it. You can archive it instead to hide it from your store and restore it later.</p>
                            <div className="sl-remove-options">
                                <button type="button" className="sl-remove-option sl-remove-option--danger" onClick={handleDelete} disabled={deleting || archiving}>
                                    <strong>{deleting ? "Removing product…" : "Remove permanently"}</strong>
                                    <span>Delete this product and its listing from your inventory.</span>
                                </button>
                                <button type="button" className="sl-remove-option sl-remove-option--archive" onClick={handleArchiveFromDelete} disabled={deleting || archiving}>
                                    <strong>{archiving ? "Moving to archive…" : "Move to archive instead"}</strong>
                                    <span>Hide it from shoppers; you can restore it later.</span>
                                </button>
                            </div>
                        </div>
                        <div className="sl-modal-foot sl-remove-foot">
                            <button type="button" className="sl-btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting || archiving}>Cancel</button>
                        </div>
                </Dialog>
            )}
        </div>
    );
}

export default Inventory;
