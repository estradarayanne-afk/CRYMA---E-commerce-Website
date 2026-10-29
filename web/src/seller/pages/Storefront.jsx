import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Eye, Palette, Store } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import Dialog from "../../shared/components/Dialog";
import "./Storefront.css";

const DEFAULT_SETTINGS = {
    hero_title: "",
    hero_subtitle: "",
    on_vacation: false,
    categories: null,
    featured_product_ids: [],
    show_featured: true,
    show_categories: true,
};
const DEFAULT_STORE = {
    name: "", slug: "", tagline: "", description: "", accent_color: "#7E1830", logo_url: "", banner_url: "",
    settings: DEFAULT_SETTINGS,
};
const COLOR_PRESETS = ["#7E1830", "#A93654", "#315C4A", "#315A78", "#795333", "#4C426F"];

function SellerStorefront() {
    const [store, setStore] = useState(DEFAULT_STORE);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [vacationConfirmOpen, setVacationConfirmOpen] = useState(false);
    const [savingVacationMode, setSavingVacationMode] = useState(false);
    const [vacationModeError, setVacationModeError] = useState("");

    useEffect(() => {
        Promise.all([
            api.get("/seller/storefront"),
            api.get("/seller/products", { params: { per_page: 100 } }),
        ]).then(([storeResponse, productResponse]) => {
            const storeData = storeResponse.data.data;
            const productData = productResponse.data.data?.data ?? productResponse.data.data ?? [];
            const settings = storeData.settings || {};
            const availableCategories = [...new Set(productData.map((product) => product.category).filter(Boolean))];
            setProducts(productData);
            setStore({
                ...DEFAULT_STORE,
                ...storeData,
                settings: {
                    ...DEFAULT_SETTINGS,
                    ...settings,
                    categories: Array.isArray(settings.categories) ? settings.categories : availableCategories,
                    featured_product_ids: Array.isArray(settings.featured_product_ids) ? settings.featured_product_ids.map(String) : [],
                    show_featured: settings.show_featured !== false,
                    show_categories: settings.show_categories !== false,
                },
            });
        }).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load your storefront settings."))
          .finally(() => setLoading(false));
    }, []);

    const availableCategories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
    const approvedProducts = products.filter((product) => product.status === "active" && product.review_status === "approved");
    const update = (key) => (event) => {
        setStore((current) => ({ ...current, [key]: event.target.value }));
        setMessage("");
    };
    const updateSetting = (key, value) => {
        setStore((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
        setMessage("");
    };
    const toggleCategory = (category) => {
        const selected = store.settings.categories || [];
        updateSetting("categories", selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category]);
    };
    const moveCategory = (index, direction) => {
        const categories = [...(store.settings.categories || [])];
        const target = index + direction;
        if (target < 0 || target >= categories.length) return;
        [categories[index], categories[target]] = [categories[target], categories[index]];
        updateSetting("categories", categories);
    };
    const toggleFeaturedProduct = (id) => {
        const selected = store.settings.featured_product_ids || [];
        const value = String(id);
        if (selected.includes(value)) updateSetting("featured_product_ids", selected.filter((item) => item !== value));
        else if (selected.length < 12) updateSetting("featured_product_ids", [...selected, value]);
    };

    const saveVacationMode = async (enabled) => {
        setVacationModeError("");
        setError("");
        setMessage("");
        setSavingVacationMode(true);
        try {
            const { data } = await api.patch("/seller/storefront/vacation-mode", { on_vacation: enabled });
            const isOnVacation = data.data.on_vacation === true;
            setStore((current) => ({
                ...current,
                on_vacation: isOnVacation,
                settings: { ...current.settings, on_vacation: isOnVacation },
            }));
            setMessage(isOnVacation
                ? "Vacation mode is on. Your products remain visible, but buyers cannot order."
                : "Vacation mode is off. Buyers can order your products again.");
            setVacationConfirmOpen(false);
        } catch (requestError) {
            const validation = requestError.response?.data?.errors?.on_vacation?.[0];
            const failure = validation || requestError.response?.data?.message || "Unable to update vacation mode.";
            setVacationModeError(failure);
            setError(failure);
        } finally {
            setSavingVacationMode(false);
        }
    };

    const requestVacationModeChange = () => {
        if (savingVacationMode || saving) return;
        if (store.settings.on_vacation === true) {
            void saveVacationMode(false);
        } else {
            setVacationModeError("");
            setVacationConfirmOpen(true);
        }
    };

    const save = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setSaving(true);
        try {
            const { data } = await api.patch("/seller/storefront", {
                business_name: store.name,
                store_tagline: store.tagline,
                store_description: store.description,
                store_accent_color: store.accent_color,
                store_logo_url: store.logo_url,
                store_banner_url: store.banner_url,
                storefront_settings: store.settings,
            });
            setStore({ ...DEFAULT_STORE, ...data.data, settings: { ...DEFAULT_SETTINGS, ...data.data.settings, ...store.settings } });
            setMessage("Your storefront has been saved.");
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : requestError.response?.data?.message || "Unable to save your storefront.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="sl-page storefront-page"><p className="storefront-muted">Loading storefront settings…</p></div>;

    const featuredProducts = approvedProducts.filter((product) => store.settings.featured_product_ids.includes(String(product.id))).slice(0, 3);
    const previewCategories = (store.settings.categories || []).slice(0, 3);

    return (
        <div className="sl-page storefront-page" style={{ "--store-accent": store.accent_color || "#7E1830" }}>
            <header className="storefront-heading">
                <div>
                    <span className="sl-eyebrow">YOUR BRAND</span>
                    <h1 className="sl-h1">Storefront</h1>
                    <p>Customize your store landing page, product highlights, and category navigation.</p>
                </div>
                <Link className="storefront-preview-link" to={`/stores/${store.slug}`} target="_blank" rel="noreferrer">
                    <Eye size={16} /> View live store <ExternalLink size={14} />
                </Link>
            </header>

            {error && <div className="storefront-notice is-error" role="alert">{error}</div>}
            {message && <div className="storefront-notice is-success" role="status">{message}</div>}

            <div className="storefront-layout">
                <form className="storefront-editor sl-card" onSubmit={save}>
                    <section className="storefront-form-section">
                        <div className="storefront-section-title"><Store size={18} /><div><h2>Store identity</h2><p>Choose how customers recognize your business.</p></div></div>
                        <label className="storefront-field">Store name<input value={store.name} readOnly aria-describedby="store-name-request-help" /><small id="store-name-request-help">To change your store name, submit an optional request in <Link to="/seller/account-settings">Account Settings</Link>. An admin must approve it.</small></label>
                        <label className="storefront-field">Tagline <span>Optional</span><input value={store.tagline || ""} onChange={update("tagline")} maxLength={100} placeholder="A short line about what makes your store special" /></label>
                        <label className="storefront-field">About your store <span>Optional</span><textarea value={store.description || ""} onChange={update("description")} rows={4} maxLength={1000} placeholder="Tell customers what you sell and what they can expect." /></label>
                    </section>

                    <section className="storefront-form-section">
                        <div className="storefront-section-title"><Palette size={18} /><div><h2>Store style</h2><p>Pick an accent color and add your brand images.</p></div></div>
                        <fieldset className="storefront-colors"><legend>Accent color</legend><div className="storefront-color-options">
                            {COLOR_PRESETS.map((color) => <button type="button" key={color} className={`storefront-color-swatch${store.accent_color === color ? " is-selected" : ""}`} style={{ background: color }} aria-label={`Use ${color} as accent color`} aria-pressed={store.accent_color === color} onClick={() => setStore((current) => ({ ...current, accent_color: color }))} />)}
                            <label className="storefront-custom-color" title="Choose a custom color"><input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(store.accent_color) ? store.accent_color : "#7E1830"} onChange={update("accent_color")} /><span>Custom</span></label>
                        </div></fieldset>
                        <label className="storefront-field">Logo image URL <span>Optional</span><input type="url" value={store.logo_url || ""} onChange={update("logo_url")} maxLength={2048} placeholder="https://…" /></label>
                        <label className="storefront-field">Banner image URL <span>Optional</span><input type="url" value={store.banner_url || ""} onChange={update("banner_url")} maxLength={2048} placeholder="https://…" /></label>
                    </section>

                    <section className="storefront-form-section">
                        <div className="storefront-section-title"><Eye size={18} /><div><h2>Landing page</h2><p>Choose the content buyers see first.</p></div></div>
                        <div className="storefront-vacation-control">
                            <button type="button" role="switch" aria-checked={store.settings.on_vacation === true} aria-label="Vacation mode" className={`storefront-switch${store.settings.on_vacation === true ? " is-on" : ""}`} onClick={requestVacationModeChange} disabled={savingVacationMode || saving}>
                                <span className="storefront-switch-thumb" />
                            </button>
                            <span><strong>Vacation mode <em>{store.settings.on_vacation === true ? "On" : "Off"}</em></strong><small>Your products stay visible and can be favorited. Buyers cannot add them to cart or place orders while this is on.</small></span>
                            {savingVacationMode && <span className="storefront-switch-saving" role="status">Saving...</span>}
                        </div>
                        <label className="storefront-field">Hero heading <span>Optional</span><input value={store.settings.hero_title || ""} onChange={(event) => updateSetting("hero_title", event.target.value)} maxLength={100} placeholder={store.name || "Welcome to our store"} /></label>
                        <label className="storefront-field">Hero message <span>Optional</span><textarea value={store.settings.hero_subtitle || ""} onChange={(event) => updateSetting("hero_subtitle", event.target.value)} maxLength={200} rows={2} placeholder={store.tagline || "A short welcome for your shoppers"} /></label>

                        <label className="storefront-toggle"><input type="checkbox" checked={store.settings.show_featured} onChange={(event) => updateSetting("show_featured", event.target.checked)} /><span><strong>Show featured products</strong><small>Highlight selected approved items near the top of your store.</small></span></label>
                        <div className="storefront-choice-list">
                            {approvedProducts.length ? approvedProducts.map((product) => <label key={product.id} className="storefront-choice-row"><input type="checkbox" checked={store.settings.featured_product_ids.includes(String(product.id))} disabled={!store.settings.featured_product_ids.includes(String(product.id)) && store.settings.featured_product_ids.length >= 12} onChange={() => toggleFeaturedProduct(product.id)} /><span>{product.name}<small>{product.category} · {product.stock} in stock</small></span><strong>{store.settings.featured_product_ids.includes(String(product.id)) ? "Selected" : "Feature"}</strong></label>) : <p className="storefront-inline-empty">You need approved active products before you can feature them.</p>}
                        </div>
                        <p className="storefront-field-note">Select up to 12 products. The first three appear in the preview.</p>

                        <label className="storefront-toggle"><input type="checkbox" checked={store.settings.show_categories} onChange={(event) => updateSetting("show_categories", event.target.checked)} /><span><strong>Show category navigation</strong><small>Let shoppers jump to the categories you choose.</small></span></label>
                        {availableCategories.length ? <div className="storefront-category-editor">
                            <div className="storefront-choice-heading">Store categories <small>Choose categories and arrange their order.</small></div>
                            {availableCategories.map((category) => {
                                const index = store.settings.categories.indexOf(category);
                                return <div className="storefront-category-row" key={category}>
                                    <label><input type="checkbox" checked={index >= 0} onChange={() => toggleCategory(category)} /><span>{category}</span></label>
                                    {index >= 0 && <span className="storefront-order-buttons"><button type="button" aria-label={`Move ${category} up`} disabled={index === 0} onClick={() => moveCategory(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${category} down`} disabled={index === store.settings.categories.length - 1} onClick={() => moveCategory(index, 1)}><ArrowDown size={14} /></button></span>}
                                </div>;
                            })}
                        </div> : <p className="storefront-inline-empty">Add products to your inventory to configure store categories.</p>}
                    </section>

                    <div className="storefront-form-footer"><span>Store link: <strong>/stores/{store.slug}</strong></span><button className="sl-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save storefront"}</button></div>
                </form>

                <aside className="storefront-preview-column">
                    <div className="storefront-preview-label"><Eye size={15} /> Live preview</div>
                    <article className="storefront-preview-card">
                        <div className="storefront-preview-banner" style={store.banner_url ? { backgroundImage: `linear-gradient(90deg,rgba(30,12,18,.42),rgba(30,12,18,.04)),url("${store.banner_url}")` } : undefined}><span>YOUR STORE</span></div>
                        <div className="storefront-preview-content">
                            <div className="storefront-preview-brand">
                                {store.logo_url ? <img src={store.logo_url} alt="Store logo preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <span>{store.name?.charAt(0)?.toUpperCase() || "S"}</span>}
                                <div><h2>{store.name || "Your store name"}</h2><p>{store.tagline || "Your store tagline will appear here"}</p></div>
                            </div>
                            <div className="storefront-preview-hero"><strong>{store.settings.hero_title || store.name || "Welcome to our store"}</strong><span>{store.settings.hero_subtitle || store.tagline || "Your welcome message will appear here."}</span></div>
                            {store.settings.show_categories && <div className="storefront-preview-category-list">{previewCategories.map((category) => <span key={category}>{category}</span>)}</div>}
                            {store.settings.show_featured && <><p className="storefront-preview-section-title">Featured products</p><div className="storefront-preview-products">{featuredProducts.length ? featuredProducts.map((product) => <span key={product.id}>{product.name}</span>) : <span>Select products to feature</span>}</div></>}
                        </div>
                    </article>
                    <p className="storefront-preview-help">Your page changes appear on your public store after you save.</p>
                </aside>
            </div>
            <Dialog
                open={vacationConfirmOpen}
                onClose={() => { if (!savingVacationMode) setVacationConfirmOpen(false); }}
                ariaLabelledBy="vacation-mode-dialog-title"
                className="storefront-vacation-dialog"
                busy={savingVacationMode}
            >
                <div className="storefront-vacation-dialog-content">
                    <div className="storefront-vacation-dialog-icon"><AlertTriangle size={21} /></div>
                    <span className="sl-eyebrow">SELLER VACATION MODE</span>
                    <h2 id="vacation-mode-dialog-title">Turn on vacation mode?</h2>
                    <p>Your products will remain visible and buyers can still favorite them, but Add to Cart, Buy Now, and checkout will be blocked until you turn vacation mode off.</p>
                    {vacationModeError && <div className="storefront-notice is-error" role="alert">{vacationModeError}</div>}
                    <div className="storefront-vacation-dialog-actions">
                        <button type="button" className="storefront-vacation-cancel" onClick={() => setVacationConfirmOpen(false)} disabled={savingVacationMode}>Cancel</button>
                        <button type="button" className="sl-btn-primary" onClick={() => void saveVacationMode(true)} disabled={savingVacationMode}>{savingVacationMode ? "Turning on..." : "Yes, turn it on"}</button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

export default SellerStorefront;