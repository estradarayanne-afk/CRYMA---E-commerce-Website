import { useState, useEffect, useCallback } from "react";
import api from "../../shared/services/api";
import { PRODUCT_CATEGORIES } from "../../shared/constants/categories";

const EMPTY_FORM = { name: "", category: PRODUCT_CATEGORIES[0], description: "", price: "", stock: "" };

function Inventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [modal, setModal] = useState(null); // null | "add" | product obj
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [confirmArchive, setConfirmArchive] = useState(null);
    const [archiving, setArchiving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState("");

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/seller/products", { params: { per_page: 100 } });
            setProducts(data.data?.data ?? data.data ?? []);
        } catch {
            setError("Failed to load products.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const visible = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === "all" ? true :
            filter === "low" ? p.stock > 0 && p.stock <= 3 :
            filter === "out" ? p.stock === 0 :
            filter === "archived" ? p.status === "archived" :
            filter === "active" ? p.status === "active" : true;
        return matchSearch && matchFilter;
    });

    const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
    const openEdit = (p) => {
        setForm({ name: p.name, category: p.category, description: p.description || "", price: String(p.price), stock: String(p.stock) });
        setModal(p);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.price || !form.stock) return;
        setSaving(true);
        try {
            const payload = { name: form.name, category: form.category, description: form.description, price: Number(form.price), stock: Number(form.stock) };
            if (modal === "add") {
                await api.post("/seller/products", { ...payload, status: "active" });
                showToast("Product added.");
            } else {
                await api.patch(`/seller/products/${modal.id}`, payload);
                showToast("Product updated.");
            }
            setModal(null);
            load();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save product.");
        } finally {
            setSaving(false);
        }
    };

    const handleArchiveToggle = async () => {
        if (!confirmArchive) return;
        setArchiving(true);
        try {
            if (confirmArchive.status === "archived") {
                await api.patch(`/seller/products/${confirmArchive.id}/restore`);
                showToast("Product restored.");
            } else {
                await api.patch(`/seller/products/${confirmArchive.id}/archive`);
                showToast("Product archived.");
            }
            setConfirmArchive(null);
            load();
        } catch (err) {
            setError(err.response?.data?.message || "Action failed.");
        } finally {
            setArchiving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/seller/products/${confirmDelete.id}`);
            setConfirmDelete(null);
            showToast("Product removed.");
            load();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove product.");
        } finally {
            setDeleting(false);
        }
    };

    const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="sl-page">
            {toast && (
                <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f4c4c", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
                    {toast}
                </div>
            )}

            <div className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">INVENTORY</div>
                    <h1 className="sl-h1">Inventory</h1>
                    <p>Manage your products, prices, and stock.</p>
                </div>
                <button className="sl-btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {error && <div className="auth-notice auth-notice--error" style={{ marginBottom: 16 }}>{error}</div>}

            {/* TOOLBAR */}
            <div className="sl-toolbar">
                <div className="sl-search-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" />
                </div>
                <div className="sl-filter-tabs">
                    {["all", "active", "low", "out", "archived"].map((f) => (
                        <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
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
                            {loading && <tr><td colSpan={6} className="sl-empty">Loading…</td></tr>}
                            {!loading && visible.length === 0 && <tr><td colSpan={6} className="sl-empty">No products found.</td></tr>}
                            {!loading && visible.map((p) => (
                                <tr key={p.id} className={p.status === "archived" ? "sl-row-muted" : ""}>
                                    <td>
                                        <strong>{p.name}</strong>
                                        {p.description && <div style={{ fontSize: 11, color: "#9aa8a6", marginTop: 2 }}>{p.description}</div>}
                                    </td>
                                    <td>{p.category}</td>
                                    <td>₱{Number(p.price).toLocaleString()}</td>
                                    <td>
                                        <span className={`sl-stock ${p.stock === 0 ? "sl-stock--out" : p.stock <= 3 ? "sl-stock--low" : ""}`}>
                                            {p.stock === 0 ? "Out of stock" : `${p.stock} units`}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`sl-badge ${p.status === "archived" ? "sl-badge--muted" : p.status === "active" ? "sl-badge--green" : "sl-badge--muted"}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="sl-row-actions">
                                            <button className="sl-btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                            <button className="sl-btn-sm sl-btn-sm--ghost" onClick={() => setConfirmArchive(p)}>
                                                {p.status === "archived" ? "Restore" : "Archive"}
                                            </button>
                                            <button className="sl-btn-sm sl-btn-sm--ghost" onClick={() => setConfirmDelete(p)}>Remove</button>
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
                <div className="sl-overlay" onClick={() => !saving && setModal(null)}>
                    <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>{modal === "add" ? "Add Product" : "Edit Product"}</h3>
                            <button className="sl-modal-close" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="sl-modal-body">
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label>Product Name</label>
                                    <input name="name" value={form.name} onChange={set} placeholder="e.g. Ribbed Knit Co-ord" />
                                </div>
                                <div className="sl-field">
                                    <label>Category</label>
                                    <select name="category" value={form.category} onChange={set}>
                                        {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="sl-field" style={{ marginBottom: 16 }}>
                                <label>Description <span className="sl-opt">(optional)</span></label>
                                <textarea name="description" rows={2} value={form.description} onChange={set} placeholder="Short product description…" style={{ resize: "vertical" }} />
                            </div>
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label>Price (₱)</label>
                                    <input name="price" type="number" min="0" value={form.price} onChange={set} placeholder="0" />
                                </div>
                                <div className="sl-field">
                                    <label>Stock</label>
                                    <input name="stock" type="number" min="0" value={form.stock} onChange={set} placeholder="0" />
                                </div>
                            </div>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setModal(null)} disabled={saving}>Cancel</button>
                            <button className="sl-btn-primary" onClick={handleSave} disabled={saving || !form.name.trim() || !form.price || !form.stock}>
                                {saving ? "Saving…" : modal === "add" ? "Add Product" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ARCHIVE CONFIRM */}
            {confirmArchive && (
                <div className="sl-overlay" onClick={() => !archiving && setConfirmArchive(null)}>
                    <div className="sl-modal sl-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>{confirmArchive.status === "archived" ? "Restore Product" : "Archive Product"}</h3>
                            <button className="sl-modal-close" onClick={() => setConfirmArchive(null)}>✕</button>
                        </div>
                        <div className="sl-modal-body">
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
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {confirmDelete && (
                <div className="sl-overlay" onClick={() => !deleting && setConfirmDelete(null)}>
                    <div className="sl-modal sl-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>Remove Product</h3>
                            <button className="sl-modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
                        </div>
                        <div className="sl-modal-body">
                            <p style={{ fontSize: 14, color: "#4a6462" }}>
                                Remove "{confirmDelete.name}" permanently from your inventory?
                            </p>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</button>
                            <button className="sl-btn-primary" onClick={handleDelete} disabled={deleting}>
                                {deleting ? "Removing…" : "Remove Product"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
