import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, Eye, ImagePlus, Plus, Store, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import Dialog from "../../shared/components/Dialog";
import "./Storefront.css";

const DEFAULT_SETTINGS = {
    hero_title: "",
    hero_subtitle: "",
    on_vacation: false,
    categories: null,
    store_categories: [],
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
    const [nameChangeOpen, setNameChangeOpen] = useState(false);
    const [nameChangeConfirming, setNameChangeConfirming] = useState(false);
    const [requestedStoreName, setRequestedStoreName] = useState("");
    const [savingNameChange, setSavingNameChange] = useState(false);
    const [nameChangeError, setNameChangeError] = useState("");
    const [imageDrafts, setImageDrafts] = useState({ logo: null, banner: null });
    const [newCategory, setNewCategory] = useState("");
    const [categoryMessage, setCategoryMessage] = useState("");
    useEffect(() => {
        const url = imageDrafts.logo?.previewUrl;
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [imageDrafts.logo]);
    useEffect(() => {
        const url = imageDrafts.banner?.previewUrl;
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [imageDrafts.banner]);

    useEffect(() => {
        Promise.all([
            api.get("/seller/storefront"),
            api.get("/seller/products", { params: { per_page: 100 } }),
        ]).then(([storeResponse, productResponse]) => {
            const storeData = storeResponse.data.data;
            const productData = productResponse.data.data?.data ?? productResponse.data.data ?? [];
            const settings = storeData.settings || {};
            setProducts(productData);
            setStore({
                ...DEFAULT_STORE,
                ...storeData,
                settings: {
                    ...DEFAULT_SETTINGS,
                    ...settings,
                    categories: Array.isArray(settings.categories) ? settings.categories : [],
                    store_categories: Array.isArray(settings.store_categories) ? settings.store_categories : [],
                    featured_product_ids: Array.isArray(settings.featured_product_ids) ? settings.featured_product_ids.map(String) : [],
                    show_featured: settings.show_featured !== false,
                    show_categories: settings.show_categories !== false,
                },
            });
        }).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load your storefront settings."))
          .finally(() => setLoading(false));
    }, []);

    const approvedProducts = products.filter((product) => product.status === "active" && product.review_status === "approved");
    const update = (key) => (event) => {
        setStore((current) => ({ ...current, [key]: event.target.value }));
        setMessage("");
    };
    const chooseStoreImage = (key) => (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/") || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Choose a JPG, PNG, or WebP image.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("Store logo and banner images must be 5 MB or smaller.");
            return;
        }
        setError("");
        const previewUrl = URL.createObjectURL(file);
        const previousUrl = imageDrafts[key]?.previewUrl;
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        setImageDrafts((current) => {
            return { ...current, [key]: { file, previewUrl } };
        });
        setMessage("");
    };
    const updateSetting = (key, value) => {
        setStore((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
        setMessage("");
    };
    const addStoreCategory = () => {
        const category = newCategory.trim();
        if (!category) return;
        const categories = store.settings.store_categories || [];
        if (categories.some((item) => item.toLocaleLowerCase() === category.toLocaleLowerCase())) {
            setCategoryMessage("That category already exists.");
            return;
        }
        if (categories.length >= 20) {
            setCategoryMessage("You can add up to 20 storefront categories.");
            return;
        }
        updateSetting("store_categories", [...categories, category]);
        setNewCategory("");
        setCategoryMessage("");
    };
    const removeStoreCategory = (category) => {
        if (products.some((product) => product.store_category === category)) return;
        updateSetting("store_categories", store.settings.store_categories.filter((item) => item !== category));
    };
    const moveCategory = (index, direction) => {
        const categories = [...(store.settings.store_categories || [])];
        const target = index + direction;
        if (target < 0 || target >= categories.length) return;
        [categories[index], categories[target]] = [categories[target], categories[index]];
        updateSetting("store_categories", categories);
    };
    const toggleFeaturedProduct = (id) => {
        const selected = store.settings.featured_product_ids || [];
        const value = String(id);
        if (selected.includes(value)) updateSetting("featured_product_ids", selected.filter((item) => item !== value));
        else if (selected.length < 12) updateSetting("featured_product_ids", [...selected, value]);
    };

    const normalizedRequestedStoreName = requestedStoreName.trim().replace(/\s+/g, " ");
    const validateStoreName = () => {
        if (normalizedRequestedStoreName.length < 2) return "Store name must be at least 2 characters.";
        if (normalizedRequestedStoreName.length > 100) return "Store name must be 100 characters or fewer.";
        if (normalizedRequestedStoreName.toLocaleLowerCase() === store.name.trim().replace(/\s+/g, " ").toLocaleLowerCase()) return "Enter a name different from your current store name.";
        return "";
    };

    const submitStoreNameChange = (event) => {
        event.preventDefault();
        setNameChangeError("");
        const validationError = validateStoreName();
        if (validationError) { setNameChangeError(validationError); return; }
        setNameChangeConfirming(true);
    };

    const confirmStoreNameChange = async () => {
        setNameChangeError("");
        setSavingNameChange(true);
        try {
            const { data } = await api.patch("/seller/storefront/name", { business_name: normalizedRequestedStoreName });
            setStore((current) => ({ ...current, name: data.data.name, slug: data.data.slug }));
            setRequestedStoreName("");
            setNameChangeConfirming(false);
            setNameChangeOpen(false);
            setMessage(data.message || "Your store name was updated.");
        } catch (requestError) {
            setNameChangeError(requestError.response?.data?.errors?.business_name?.[0] || requestError.response?.data?.message || "Unable to update your store name.");
        } finally {
            setSavingNameChange(false);
        }
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
            const storefrontPayload = {
                business_name: store.name,
                store_tagline: store.tagline,
                store_description: store.description,
                store_accent_color: store.accent_color,
                store_logo_url: store.logo_url,
                store_banner_url: store.banner_url,
                storefront_settings: store.settings,
            };
            let response;
            if (imageDrafts.logo || imageDrafts.banner) {
                const formData = new FormData();
                formData.append("_method", "PATCH");
                formData.append("store_tagline", storefrontPayload.store_tagline || "");
                formData.append("store_description", storefrontPayload.store_description || "");
                formData.append("store_accent_color", storefrontPayload.store_accent_color);
                formData.append("store_logo_url", storefrontPayload.store_logo_url || "");
                formData.append("store_banner_url", storefrontPayload.store_banner_url || "");
                formData.append("storefront_settings", JSON.stringify(storefrontPayload.storefront_settings));
                if (imageDrafts.logo) formData.append("store_logo", imageDrafts.logo.file);
                if (imageDrafts.banner) formData.append("store_banner", imageDrafts.banner.file);
                response = await api.post("/seller/storefront", formData);
            } else {
                response = await api.patch("/seller/storefront", storefrontPayload);
            }
            const { data } = response;
            setStore({ ...DEFAULT_STORE, ...data.data, settings: { ...DEFAULT_SETTINGS, ...data.data.settings, ...store.settings } });
            setImageDrafts({ logo: null, banner: null });
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
    const previewCategories = (store.settings.store_categories || []).slice(0, 3);

    return (
        <div className="sl-page storefront-page" style={{ "--store-accent": store.accent_color || "#7E1830" }}>
            <header className="storefront-heading sl-page-head">
                <div>
                    <span className="sl-eyebrow">YOUR BRAND</span>
                    <h1 className="sl-h1">Storefront</h1>
                    <p>Customize your store landing page, product highlights, and category navigation.</p>
                </div>
            </header>

            {error && <div className="storefront-notice is-error" role="alert">{error}</div>}
            {message && <div className="storefront-notice is-success" role="status">{message}</div>}

            <div className="storefront-editor-intro"><strong>Build your storefront</strong><span>Work through each section, then save to publish your changes.</span></div>
            <nav className="storefront-step-nav" aria-label="Storefront editing steps">
                <a href="#storefront-step-details"><span>1</span> Details</a>
                <a href="#storefront-step-branding"><span>2</span> Appearance</a>
                <a href="#storefront-step-homepage"><span>3</span> Homepage</a>
                <a href="#storefront-step-availability"><span>4</span> Shop status</a>
            </nav>

            <div className="storefront-layout">
                <form className="storefront-editor sl-card" onSubmit={save}>
                    <section className="storefront-form-section" id="storefront-step-details">
                        <div className="storefront-section-title"><span className="storefront-step-number">1</span><div><h2>Store details</h2><p>Your name and introduction shown to shoppers.</p></div></div>
                        <div className="storefront-name-control">
                            <label className="storefront-field" htmlFor="storefront-current-name">Store name<input id="storefront-current-name" value={store.name} readOnly /></label>
                            <button type="button" className="storefront-name-request-button" onClick={() => { setRequestedStoreName(store.name); setNameChangeError(""); setNameChangeConfirming(false); setNameChangeOpen(true); }}>
                                Change name
                            </button>
                        </div>
                        <label className="storefront-field">Short tagline <span>Optional</span><input value={store.tagline || ""} onChange={update("tagline")} maxLength={100} placeholder="A short line shoppers will remember" /></label>
                        <label className="storefront-field">Shop introduction <span>Optional</span><textarea value={store.description || ""} onChange={update("description")} rows={3} maxLength={1000} placeholder="Tell shoppers what you sell and what makes your store special." /></label>
                    </section>

                    <section className="storefront-form-section" id="storefront-step-branding">
                        <div className="storefront-section-title"><span className="storefront-step-number">2</span><div><h2>Shop appearance</h2><p>Choose an accent color, logo, and cover image.</p></div></div>
                        <fieldset className="storefront-colors"><legend>Accent color</legend><div className="storefront-color-options">
                            {COLOR_PRESETS.map((color) => <button type="button" key={color} className={`storefront-color-swatch${store.accent_color === color ? " is-selected" : ""}`} style={{ background: color }} aria-label={`Use ${color} as accent color`} aria-pressed={store.accent_color === color} onClick={() => setStore((current) => ({ ...current, accent_color: color }))} />)}
                            <label className="storefront-custom-color" title="Choose a custom color"><input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(store.accent_color) ? store.accent_color : "#7E1830"} onChange={update("accent_color")} /><span>Custom</span></label>
                        </div></fieldset>
                        <div className="storefront-image-editors">
                            <div className="storefront-image-editor">
                                <div><strong>Store logo</strong><small>Square image · JPG, PNG, or WebP · up to 5 MB</small></div>
                                <div className="storefront-image-sample is-logo">{imageDrafts.logo?.previewUrl || store.logo_url ? <img src={imageDrafts.logo?.previewUrl || store.logo_url} alt="Store logo" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <Store size={22} />}</div>
                                <label className="storefront-image-upload"><ImagePlus size={15} /> Upload logo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseStoreImage("logo")} /></label>
                                <label className="storefront-field">Or paste image URL<input type="url" value={store.logo_url || ""} onChange={update("logo_url")} maxLength={2048} placeholder="https://…" /></label>
                            </div>
                            <div className="storefront-image-editor">
                                <div><strong>Store banner</strong><small>Wide image · JPG, PNG, or WebP · up to 5 MB</small></div>
                                <div className="storefront-image-sample is-banner">{imageDrafts.banner?.previewUrl || store.banner_url ? <img src={imageDrafts.banner?.previewUrl || store.banner_url} alt="Store banner" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <ImagePlus size={22} />}</div>
                                <label className="storefront-image-upload"><ImagePlus size={15} /> Upload banner<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseStoreImage("banner")} /></label>
                                <label className="storefront-field">Or paste image URL<input type="url" value={store.banner_url || ""} onChange={update("banner_url")} maxLength={2048} placeholder="https://…" /></label>
                            </div>
                        </div>
                    </section>

                    <section className="storefront-form-section" id="storefront-step-homepage">
                        <div className="storefront-section-title"><span className="storefront-step-number">3</span><div><h2>Homepage content</h2><p>Choose what shoppers see when they visit your store.</p></div></div>
                        <div className="storefront-home-block">
                            <div className="storefront-home-block-title"><strong>Landing page</strong><span>Your welcome message at the top of the store.</span></div>
                            <label className="storefront-field">Heading <span>Optional</span><input value={store.settings.hero_title || ""} onChange={(event) => updateSetting("hero_title", event.target.value)} maxLength={100} placeholder={store.name || "Welcome to our store"} /></label>
                            <label className="storefront-field">Message <span>Optional</span><textarea value={store.settings.hero_subtitle || ""} onChange={(event) => updateSetting("hero_subtitle", event.target.value)} maxLength={200} rows={2} placeholder={store.tagline || "A short welcome for your shoppers"} /></label>
                        </div>

                        <div className="storefront-home-block">
                            <div className="storefront-home-block-title"><strong>Featured products</strong><span>Highlight a few products near the top of your storefront.</span></div>
                            <label className="storefront-toggle"><input type="checkbox" checked={store.settings.show_featured} onChange={(event) => updateSetting("show_featured", event.target.checked)} /><span><strong>Show featured products</strong><small>Choose up to 12 approved products. The first three appear in the preview.</small></span></label>
                            {store.settings.show_featured && <>
                                <div className="storefront-choice-summary">{store.settings.featured_product_ids.length} of 12 selected</div>
                                <div className="storefront-choice-list">
                                    {approvedProducts.length ? approvedProducts.map((product) => <label key={product.id} className="storefront-choice-row"><input type="checkbox" checked={store.settings.featured_product_ids.includes(String(product.id))} disabled={!store.settings.featured_product_ids.includes(String(product.id)) && store.settings.featured_product_ids.length >= 12} onChange={() => toggleFeaturedProduct(product.id)} /><span>{product.name}<small>{product.category} · {product.stock} in stock</small></span><strong>{store.settings.featured_product_ids.includes(String(product.id)) ? "Selected" : "Feature"}</strong></label>) : <p className="storefront-inline-empty">No approved products available to feature yet.</p>}
                                </div>
                            </>}
                        </div>

                        <div className="storefront-home-block">
                            <div className="storefront-home-block-title"><strong>Store categories</strong><span>Make it easy for shoppers to browse your product groups.</span></div>
                            <label className="storefront-toggle"><input type="checkbox" checked={store.settings.show_categories} onChange={(event) => updateSetting("show_categories", event.target.checked)} /><span><strong>Show categories on my storefront</strong><small>Categories are created here and assigned to products in Inventory.</small></span></label>
                            {store.settings.show_categories && <div className="storefront-category-editor">
                                <div className="storefront-category-context"><span>YOUR REGISTERED BUSINESS CATEGORY</span><strong>{store.registered_category || "Not available"}</strong><small>Use this as a guide for your subcategories, such as Kitchen tools or Garden supplies.</small></div>
                                <div className="storefront-choice-heading">Your subcategories <small>Add up to 20. Assign products to them from Inventory.</small></div>
                                <div className="storefront-add-category">
                                    <input aria-label="New storefront category" value={newCategory} onChange={(event) => { setNewCategory(event.target.value); setCategoryMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addStoreCategory(); } }} maxLength={100} placeholder="For example, Kitchen tools" />
                                    <button type="button" onClick={addStoreCategory} disabled={!newCategory.trim() || store.settings.store_categories.length >= 20}><Plus size={15} /> Add</button>
                                </div>
                                {categoryMessage && <p className="storefront-inline-empty" role="status">{categoryMessage}</p>}
                                {store.settings.store_categories.length ? store.settings.store_categories.map((category, index) => {
                                    const assignedCount = products.filter((product) => product.store_category === category).length;
                                    return <div className="storefront-category-row" key={category}>
                                        <div className="storefront-category-label"><strong>{category}</strong><small>{assignedCount} {assignedCount === 1 ? "product" : "products"}</small></div>
                                        <span className="storefront-order-buttons"><button type="button" aria-label={`Move ${category} up`} disabled={index === 0} onClick={() => moveCategory(index, -1)}><ArrowUp size={14} /></button><button type="button" aria-label={`Move ${category} down`} disabled={index === store.settings.store_categories.length - 1} onClick={() => moveCategory(index, 1)}><ArrowDown size={14} /></button><button type="button" aria-label={`Remove ${category}`} title={assignedCount ? "Move assigned products to another category first" : "Remove category"} disabled={assignedCount > 0} onClick={() => removeStoreCategory(category)}><Trash2 size={14} /></button></span>
                                    </div>;
                                }) : <p className="storefront-inline-empty">No subcategories yet. Add one above to organize products.</p>}
                            </div>}
                        </div>
                    </section>

                    <section className="storefront-form-section storefront-availability-section" id="storefront-step-availability">
                        <div className="storefront-section-title"><span className="storefront-step-number">4</span><div><h2>Shop status</h2><p>Temporarily pause orders while you are away.</p></div></div>
                        <div className="storefront-vacation-control">
                            <button type="button" role="switch" aria-checked={store.settings.on_vacation === true} aria-label="Vacation mode" className={`storefront-switch${store.settings.on_vacation === true ? " is-on" : ""}`} onClick={requestVacationModeChange} disabled={savingVacationMode || saving}>
                                <span className="storefront-switch-thumb" />
                            </button>
                            <span><strong>Vacation mode <em>{store.settings.on_vacation === true ? "On" : "Off"}</em></strong><small>Your shop stays visible, but shoppers cannot place orders while vacation mode is on.</small></span>
                            {savingVacationMode && <span className="storefront-switch-saving" role="status">Saving...</span>}
                        </div>
                    </section>

                    <div className="storefront-form-footer"><span>Store link: <strong>/stores/{store.slug}</strong></span><button className="sl-btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save storefront"}</button></div>
                </form>

                <aside className="storefront-preview-column">
                    <div className="storefront-preview-label"><span><Eye size={15} /> Live preview</span><Link className="storefront-preview-link" to={`/stores/${store.slug}`} target="_blank" rel="noreferrer"><Eye size={15} /> View live store <ExternalLink size={14} /></Link></div>
                    <article className="storefront-preview-card">
                        <div className="storefront-preview-banner" style={(imageDrafts.banner?.previewUrl || store.banner_url) ? { backgroundImage: `linear-gradient(90deg,rgba(30,12,18,.42),rgba(30,12,18,.04)),url("${imageDrafts.banner?.previewUrl || store.banner_url}")` } : undefined}><span>YOUR STORE</span></div>
                        <div className="storefront-preview-content">
                            <div className="storefront-preview-brand">
                                {imageDrafts.logo?.previewUrl || store.logo_url ? <img src={imageDrafts.logo?.previewUrl || store.logo_url} alt="Store logo preview" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /> : <span>{store.name?.charAt(0)?.toUpperCase() || "S"}</span>}
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
                open={nameChangeOpen}
                onClose={() => { if (!savingNameChange) { setNameChangeOpen(false); setNameChangeConfirming(false); } }}
                ariaLabelledBy="storefront-name-dialog-title"
                className="storefront-vacation-dialog storefront-name-dialog"
                busy={savingNameChange}
            >
                <form className="storefront-vacation-dialog-content" onSubmit={submitStoreNameChange}>
                    <div className="storefront-vacation-dialog-icon"><Store size={21} /></div>
                    <span className="sl-eyebrow">STORE DETAILS</span>
                    <h2 id="storefront-name-dialog-title">Change your store name</h2>
                    {!nameChangeConfirming ? <>
                        <p>Choose a name between 2 and 100 characters. We’ll check that it’s available before saving.</p>
                        <label className="storefront-field" htmlFor="storefront-requested-name">New store name<input id="storefront-requested-name" value={requestedStoreName} onChange={(event) => { setRequestedStoreName(event.target.value); setNameChangeError(""); }} minLength={2} maxLength={100} required disabled={savingNameChange} placeholder="Enter your new store name" autoFocus /></label>
                    </> : <>
                        <p>Confirm this change to update the name shoppers see on your storefront.</p>
                        <div className="storefront-name-change-summary"><span>Current name<strong>{store.name}</strong></span><span>New name<strong>{normalizedRequestedStoreName}</strong></span></div>
                        <p>Your public store link will stay the same. We’ll check availability before saving.</p>
                    </>}
                    {nameChangeError && <div className="storefront-notice is-error" role="alert">{nameChangeError}</div>}
                    <div className="storefront-vacation-dialog-actions">
                        {nameChangeConfirming && <button type="button" className="storefront-vacation-cancel" onClick={() => { setNameChangeConfirming(false); setNameChangeError(""); }} disabled={savingNameChange}>Back</button>}
                        <button type="button" className="storefront-vacation-cancel" onClick={() => { setNameChangeOpen(false); setNameChangeConfirming(false); }} disabled={savingNameChange}>Cancel</button>
                        {nameChangeConfirming
                            ? <button type="button" className="sl-btn-primary" onClick={() => void confirmStoreNameChange()} disabled={savingNameChange}>{savingNameChange ? "Checking availability..." : "Confirm name change"}</button>
                            : <button type="submit" className="sl-btn-primary" disabled={savingNameChange}>Review change</button>}
                    </div>
                </form>
            </Dialog>
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
