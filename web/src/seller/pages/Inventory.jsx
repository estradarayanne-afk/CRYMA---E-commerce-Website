import { useState } from "react";

const SAMPLE = [
    { id: 1, name: "Ribbed Knit Co-ord", category: "Clothing", price: 680, discount: 0, stock: 2, status: "active" },
    { id: 2, name: "Contour Shoulder Bag", category: "Accessories", price: 840, discount: 10, stock: 1, status: "active" },
    { id: 3, name: "Everyday Overshirt", category: "Clothing", price: 920, discount: 0, stock: 15, status: "active" },
    { id: 4, name: "Sculptural Table Lamp", category: "Living", price: 560, discount: 5, stock: 8, status: "active" },
    { id: 5, name: "Linen Wrap Dress", category: "Clothing", price: 740, discount: 0, stock: 0, status: "archived" },
    { id: 6, name: "Merino Crew Neck", category: "Clothing", price: 880, discount: 0, stock: 3, status: "active" },
];

const EMPTY_FORM = { name: "", category: "Clothing", price: "", discount: "", stock: "", voucher: "", status: "active" };

function Inventory() {
    const [products, setProducts] = useState(SAMPLE);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [modal, setModal] = useState(null); // null | "add" | product obj
    const [form, setForm] = useState(EMPTY_FORM);
    const [confirmArchive, setConfirmArchive] = useState(null);

    const visible = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || (filter === "low" ? p.stock > 0 && p.stock <= 3 : filter === "out" ? p.stock === 0 : p.status === filter);
        return matchSearch && matchFilter;
    });

    const openAdd = () => { setForm(EMPTY_FORM); setModal("add"); };
    const openEdit = (p) => { setForm({ ...p, price: String(p.price), discount: String(p.discount), stock: String(p.stock), voucher: p.voucher || "" }); setModal(p); };

    const handleSave = () => {
        const entry = { ...form, price: Number(form.price), discount: Number(form.discount), stock: Number(form.stock) };
        if (modal === "add") {
            setProducts((prev) => [...prev, { ...entry, id: Date.now() }]);
        } else {
            setProducts((prev) => prev.map((p) => p.id === modal.id ? { ...p, ...entry } : p));
        }
        setModal(null);
    };

    const handleArchive = (id) => {
        setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "archived" ? "active" : "archived" } : p));
        setConfirmArchive(null);
    };

    const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><h2>Inventory</h2><p>Manage your products, prices, discounts and stock.</p></div>
                <button className="sl-btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {/* TOOLBAR */}
            <div className="sl-toolbar">
                <div className="sl-search-wrap">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" />
                </div>
                <div className="sl-filter-tabs">
                    {["all","active","low","out","archived"].map((f) => (
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
                                <th>Product</th><th>Category</th><th>Price</th><th>Discount</th><th>Voucher</th><th>Stock</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.length === 0 && (
                                <tr><td colSpan={8} className="sl-empty">No products found.</td></tr>
                            )}
                            {visible.map((p) => (
                                <tr key={p.id} className={p.status === "archived" ? "sl-row-muted" : ""}>
                                    <td><strong>{p.name}</strong></td>
                                    <td>{p.category}</td>
                                    <td>₱{p.price.toLocaleString()}</td>
                                    <td>{p.discount > 0 ? `${p.discount}%` : "—"}</td>
                                    <td>{p.voucher || "—"}</td>
                                    <td>
                                        <span className={`sl-stock ${p.stock === 0 ? "sl-stock--out" : p.stock <= 3 ? "sl-stock--low" : ""}`}>
                                            {p.stock === 0 ? "Out of stock" : `${p.stock} units`}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`sl-badge ${p.status === "archived" ? "sl-badge--muted" : "sl-badge--green"}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="sl-row-actions">
                                            <button className="sl-btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                            <button className="sl-btn-sm sl-btn-sm--ghost" onClick={() => setConfirmArchive(p)}>
                                                {p.status === "archived" ? "Restore" : "Archive"}
                                            </button>
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
                <div className="sl-overlay" onClick={() => setModal(null)}>
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
                                        {["Clothing","Accessories","Living","Electronics","Other"].map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="sl-form-row">
                                <div className="sl-field">
                                    <label>Price (₱)</label>
                                    <input name="price" type="number" min="0" value={form.price} onChange={set} placeholder="0" />
                                </div>
                                <div className="sl-field">
                                    <label>Discount (%)</label>
                                    <input name="discount" type="number" min="0" max="100" value={form.discount} onChange={set} placeholder="0" />
                                </div>
                                <div className="sl-field">
                                    <label>Stock</label>
                                    <input name="stock" type="number" min="0" value={form.stock} onChange={set} placeholder="0" />
                                </div>
                            </div>
                            <div className="sl-field">
                                <label>Voucher Code <span className="sl-opt">(optional)</span></label>
                                <input name="voucher" value={form.voucher} onChange={set} placeholder="e.g. SAVE10" />
                            </div>
                            <div className="sl-field">
                                <label>Status</label>
                                <select name="status" value={form.status} onChange={set}>
                                    <option value="active">Active</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="sl-btn-primary" onClick={handleSave}>
                                {modal === "add" ? "Add Product" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ARCHIVE CONFIRM */}
            {confirmArchive && (
                <div className="sl-overlay" onClick={() => setConfirmArchive(null)}>
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
                            <button className="sl-btn-ghost" onClick={() => setConfirmArchive(null)}>Cancel</button>
                            <button className="sl-btn-primary" onClick={() => handleArchive(confirmArchive.id)}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Inventory;
