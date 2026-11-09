import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, Plus, Search, X } from "lucide-react";
import api from "../../../shared/services/api";
import Dialog from "../../../shared/components/Dialog";

const EMPTY_ZONE = { regions: "" };
const EMPTY_RATE = {
    origin_zone_id: "",
    destination_zone_id: "",
    provider: "CRYMA Standard",
    rate_source: "cryma",
    min_weight_kg: "0",
    max_weight_kg: "1",
    fee: "",
    min_delivery_days: "3",
    max_delivery_days: "7",
    volumetric_divisor_cm3_per_kg: "",
    is_provisional: false,
    is_active: false,
};

function ShippingZonesPanel() {
    const [zones, setZones] = useState([]);
    const [zoneForm, setZoneForm] = useState(EMPTY_ZONE);
    const [editingZone, setEditingZone] = useState(null);
    const [rateForm, setRateForm] = useState(EMPTY_RATE);
    const [editingRate, setEditingRate] = useState(null);
    const [rateDialogOpen, setRateDialogOpen] = useState(false);
    const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
    const [verifyingRate, setVerifyingRate] = useState(null);
    const [confirmingDisable, setConfirmingDisable] = useState(null);
    const [verificationNote, setVerificationNote] = useState("");
    const [rateSearch, setRateSearch] = useState("");
    const [ratePage, setRatePage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const requestZones = useCallback(async () => {
        const response = await api.get("/admin/shipping-zones");
        return Array.isArray(response.data?.data) ? response.data.data : [];
    }, []);

    const loadZones = useCallback(async () => {
        try {
            setZones(await requestZones());
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load shipping zones.");
        } finally {
            setLoading(false);
        }
    }, [requestZones]);

    useEffect(() => {
        let cancelled = false;
        requestZones().then(
            (loadedZones) => {
                if (!cancelled) {
                    setZones(loadedZones);
                    setLoading(false);
                }
            },
            (requestError) => {
                if (!cancelled) {
                    setError(requestError.response?.data?.message || "Unable to load shipping zones.");
                    setLoading(false);
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [requestZones]);

    const saveZone = async (event) => {
        event.preventDefault();
        if (!editingZone) return;
        setSaving(true);
        setError("");
        try {
            const payload = {
                name: editingZone.name,
                slug: editingZone.slug,
                regions: zoneForm.regions.split(/\r?\n/).map((region) => region.trim()).filter(Boolean),
                is_active: true,
            };
            await api.patch(`/admin/shipping-zones/${editingZone.id}`, payload);
            setZoneForm(EMPTY_ZONE);
            setEditingZone(null);
            setZoneDialogOpen(false);
            await loadZones();
        } catch (requestError) {
            const errors = requestError.response?.data?.errors || {};
            setError(Object.values(errors).flat()[0] || requestError.response?.data?.message || "Unable to save the shipping zone.");
        } finally {
            setSaving(false);
        }
    };

    const saveRate = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...rateForm,
                origin_zone_id: Number(rateForm.origin_zone_id),
                destination_zone_id: Number(rateForm.destination_zone_id),
                volumetric_divisor_cm3_per_kg: rateForm.volumetric_divisor_cm3_per_kg || null,
                is_provisional: rateForm.rate_source === "courier" && rateForm.is_provisional,
            };
            if (editingRate) {
                await api.patch(`/admin/shipping-zone-rates/${editingRate.id}`, payload);
            } else {
                await api.post("/admin/shipping-zone-rates", payload);
            }
            setRateForm(EMPTY_RATE);
            setEditingRate(null);
            setRateDialogOpen(false);
            await loadZones();
        } catch (requestError) {
            const errors = requestError.response?.data?.errors || {};
            setError(Object.values(errors).flat()[0] || requestError.response?.data?.message || "Unable to save the shipping rate.");
        } finally {
            setSaving(false);
        }
    };

    const toggleRate = async (rate, confirmed = false) => {
        if (rate.is_active && !confirmed) {
            setConfirmingDisable(rate);
            setError("");
            return;
        }

        setSaving(true);
        setError("");
        try {
            await api.patch(`/admin/shipping-zone-rates/${rate.id}/status`, { is_active: !rate.is_active });
            setConfirmingDisable(null);
            await loadZones();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to update the shipping rate status.");
        } finally {
            setSaving(false);
        }
    };

    const verifyRate = async (event) => {
        event.preventDefault();
        if (!verifyingRate) return;
        setSaving(true);
        setError("");
        try {
            await api.post(`/admin/shipping-zone-rates/${verifyingRate.id}/verify`, { verification_note: verificationNote });
            setVerifyingRate(null);
            setVerificationNote("");
            await loadZones();
        } catch (requestError) {
            const errors = requestError.response?.data?.errors || {};
            setError(Object.values(errors).flat()[0] || requestError.response?.data?.message || "Unable to record rate verification.");
        } finally {
            setSaving(false);
        }
    };

    const zonesWithRates = zones.map((zone) => ({
        ...zone,
        rates: Array.isArray(zone.outgoing_rates) ? zone.outgoing_rates : [],
    }));
    const allRates = zonesWithRates.flatMap((zone) => zone.rates.map((rate) => ({
        ...rate,
        origin_zone: zone.name,
        destination_zone: zones.find((item) => item.id === rate.destination_zone_id)?.name || "Unknown",
    })));
    const normalizedRateSearch = rateSearch.trim().toLowerCase();
    const matchingRates = allRates.filter((rate) => [
        rate.origin_zone,
        rate.destination_zone,
        rate.provider,
        rate.rate_source === "cryma" ? "CRYMA managed" : rate.is_provisional ? "unverified courier" : "verified courier",
        rate.is_active ? "active enabled" : "disabled inactive",
        rate.min_weight_kg,
        rate.max_weight_kg,
        rate.fee,
        rate.min_delivery_days,
        rate.max_delivery_days,
    ].some((value) => String(value).toLowerCase().includes(normalizedRateSearch)));
    const ratePageCount = Math.max(1, Math.ceil(matchingRates.length / 5));
    const visibleRates = matchingRates.slice((ratePage - 1) * 5, ratePage * 5);

    const openRateDialog = (rate = null) => {
        setError("");
        setEditingRate(rate);
        setRateForm(rate ? {
            origin_zone_id: String(rate.origin_zone_id),
            destination_zone_id: String(rate.destination_zone_id),
            provider: rate.provider,
            rate_source: rate.rate_source || "courier",
            min_weight_kg: String(rate.min_weight_kg),
            max_weight_kg: String(rate.max_weight_kg),
            fee: String(rate.fee),
            min_delivery_days: String(rate.min_delivery_days ?? 3),
            max_delivery_days: String(rate.max_delivery_days ?? 7),
            volumetric_divisor_cm3_per_kg: rate.volumetric_divisor_cm3_per_kg == null ? "" : String(rate.volumetric_divisor_cm3_per_kg),
            is_provisional: Boolean(rate.is_provisional),
            is_active: Boolean(rate.is_active),
        } : EMPTY_RATE);
        setRateDialogOpen(true);
    };

    const closeRateDialog = () => {
        setRateDialogOpen(false);
        setEditingRate(null);
        setRateForm(EMPTY_RATE);
    };

    const openZoneDialog = (zone) => {
        if (!zone) return;
        setError("");
        setEditingZone(zone);
        setZoneForm({ regions: (zone.regions || []).map((item) => item.region_name).join("\n") });
        setZoneDialogOpen(true);
    };

    const closeZoneDialog = () => {
        setZoneDialogOpen(false);
        setEditingZone(null);
        setZoneForm(EMPTY_ZONE);
    };

    const rateFields = () => (
        <div className="voucher-form-grid">
            <label className="voucher-form-field">
                <span>Origin zone <b>*</b></span>
                <select required value={rateForm.origin_zone_id} onChange={(event) => setRateForm((current) => ({ ...current, origin_zone_id: event.target.value }))}>
                    <option value="">Select origin</option>
                    {zones.filter((zone) => zone.is_active).map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
                </select>
            </label>
            <label className="voucher-form-field">
                <span>Destination zone <b>*</b></span>
                <select required value={rateForm.destination_zone_id} onChange={(event) => setRateForm((current) => ({ ...current, destination_zone_id: event.target.value }))}>
                    <option value="">Select destination</option>
                    {zones.filter((zone) => zone.is_active).map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
                </select>
            </label>
            <label className="voucher-form-field">
                <span>Rate source <b>*</b></span>
                <select required value={rateForm.rate_source} onChange={(event) => {
                    const rate_source = event.target.value;
                    setRateForm((current) => ({
                        ...current,
                        rate_source,
                        provider: rate_source === "cryma" ? "CRYMA Standard" : "Courier",
                        is_provisional: rate_source === "courier",
                    }));
                }}>
                    <option value="cryma">CRYMA-managed fee</option>
                    <option value="courier">Courier quotation</option>
                </select>
            </label>
            <label className="voucher-form-field">
                <span>Rate/provider name <b>*</b></span>
                <input required maxLength={80} value={rateForm.provider} onChange={(event) => setRateForm((current) => ({ ...current, provider: event.target.value }))} />
            </label>
            <label className="voucher-form-field">
                <span>Minimum billable weight (kg)</span>
                <input required type="number" min="0" max="100000" step="0.001" value={rateForm.min_weight_kg} onChange={(event) => setRateForm((current) => ({ ...current, min_weight_kg: event.target.value }))} />
            </label>
            <label className="voucher-form-field">
                <span>Maximum billable weight (kg)</span>
                <input required type="number" min="0.001" max="100000" step="0.001" value={rateForm.max_weight_kg} onChange={(event) => setRateForm((current) => ({ ...current, max_weight_kg: event.target.value }))} />
            </label>
            <label className="voucher-form-field">
                <span>Fee (₱)</span>
                <input required type="number" min="0.01" step="0.01" value={rateForm.fee} onChange={(event) => setRateForm((current) => ({ ...current, fee: event.target.value }))} />
            </label>
            <label className="voucher-form-field">
                <span>Minimum delivery time (business days)</span>
                <input required type="number" min="1" max="60" step="1" value={rateForm.min_delivery_days} onChange={(event) => setRateForm((current) => ({ ...current, min_delivery_days: event.target.value }))} />
            </label>
            <label className="voucher-form-field">
                <span>Maximum delivery time (business days)</span>
                <input required type="number" min={rateForm.min_delivery_days} max="60" step="1" value={rateForm.max_delivery_days} onChange={(event) => setRateForm((current) => ({ ...current, max_delivery_days: event.target.value }))} />
                <small>Buyers see this route-specific estimated arrival window. Actual delivery may vary.</small>
            </label>
            <label className="voucher-form-field">
                <span>Volumetric divisor <em>Optional</em></span>
                <input type="number" min="0.01" step="0.01" value={rateForm.volumetric_divisor_cm3_per_kg} onChange={(event) => setRateForm((current) => ({ ...current, volumetric_divisor_cm3_per_kg: event.target.value }))} />
                <small>Leave blank to bill by actual product weight only.</small>
            </label>
            {rateForm.rate_source === "courier" && <label className="voucher-active-toggle">
                <input type="checkbox" checked={rateForm.is_provisional} onChange={(event) => setRateForm((current) => ({ ...current, is_provisional: event.target.checked }))} />
                <span><strong>Unverified courier quote</strong><small>Production requires a verified courier rate.</small></span>
            </label>}
            <label className="voucher-active-toggle">
                <input type="checkbox" checked={rateForm.is_active} onChange={(event) => setRateForm((current) => ({ ...current, is_active: event.target.checked }))} />
                <span><strong>Enable at checkout</strong><small>CRYMA rates are available directly; courier rates require verification.</small></span>
            </label>
        </div>
    );

    return (
        <section className="voucher-list-card shipping-zone-manager" aria-label="Shipping zone configuration">
            <div className="voucher-list-heading">
                <div>
                    <span>DELIVERY CONFIGURATION</span>
                    <h2>Shipping zones and rates</h2>
                    <p>Manage checkout delivery fees by route and parcel weight.</p>
                </div>
                <button type="button" className="voucher-primary-button" onClick={() => openRateDialog()}>
                    <Plus size={17} /> Add shipping rate
                </button>
            </div>
            <div className="shipping-zone-notice" role="note">
                CRYMA-managed fees use CRYMA's configured delivery prices and are available at checkout without courier verification. They are not courier quotations. Courier rates must be verified before production checkout can use them.
            </div>
            {error && !rateDialogOpen && !zoneDialogOpen && !verifyingRate && !confirmingDisable && <div className="voucher-alert error" role="alert">{error}</div>}

            <Dialog
                open={rateDialogOpen}
                onClose={closeRateDialog}
                ariaLabelledBy="shipping-rate-edit-title"
                className="voucher-modal shipping-rate-modal"
                busy={saving}
            >
                <header className="voucher-modal-header">
                    <div><span>SHIPPING CONFIGURATION</span><h2 id="shipping-rate-edit-title">{editingRate ? "Edit route rate" : "Add route rate"}</h2></div>
                    <button type="button" onClick={closeRateDialog} disabled={saving} aria-label="Close rate editor"><X size={19} /></button>
                </header>
                <form onSubmit={saveRate}>
                    {rateFields()}
                    {error && <div className="voucher-form-alert" role="alert">{error}</div>}
                    <footer className="voucher-modal-footer">
                        <button className="voucher-secondary-button" type="button" onClick={closeRateDialog} disabled={saving}>Cancel</button>
                        <button className="voucher-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingRate ? "Save rate" : "Add rate"}</button>
                    </footer>
                </form>
            </Dialog>

            <Dialog
                open={zoneDialogOpen}
                onClose={closeZoneDialog}
                ariaLabelledBy="shipping-zone-edit-title"
                className="voucher-modal shipping-rate-modal"
                busy={saving}
            >
                <header className="voucher-modal-header">
                    <div><span>DELIVERY ZONES</span><h2 id="shipping-zone-edit-title">Edit zone coverage</h2></div>
                    <button type="button" onClick={closeZoneDialog} disabled={saving} aria-label="Close zone editor"><X size={19} /></button>
                </header>
                <form onSubmit={saveZone}>
                    <div className="voucher-form-grid">
                        <label className="voucher-form-field">
                            <span>Zone name <b>*</b></span>
                            <select
                                required
                                value={editingZone?.id || ""}
                                onChange={(event) => {
                                    const selectedZone = zones.find((zone) => String(zone.id) === event.target.value);
                                    if (selectedZone) {
                                        setEditingZone(selectedZone);
                                        setZoneForm({ regions: (selectedZone.regions || []).map((item) => item.region_name).join("\n") });
                                    }
                                }}
                            >
                                <option value="" disabled>Select a configured zone</option>
                                {zones.map((zone) => <option value={zone.id} key={zone.id}>{zone.name}</option>)}
                            </select>
                        </label>
                        <label className="voucher-form-field">
                            <span>Zone key</span>
                            <input value={editingZone?.slug || ""} readOnly aria-readonly="true" />
                            <small>Assigned automatically to the selected zone.</small>
                        </label>
                        <label className="voucher-form-field full">
                            <span>Regions assigned to this zone <em>One per line</em></span>
                            <textarea required rows={5} value={zoneForm.regions} onChange={(event) => setZoneForm((current) => ({ ...current, regions: event.target.value }))} />
                        </label>
                    </div>
                    {error && <div className="voucher-form-alert" role="alert">{error}</div>}
                    <footer className="voucher-modal-footer">
                        <button className="voucher-secondary-button" type="button" onClick={closeZoneDialog} disabled={saving}>Cancel</button>
                        <button className="voucher-primary-button" type="submit" disabled={saving || !editingZone}>{saving ? "Saving…" : "Save region assignments"}</button>
                    </footer>
                </form>
            </Dialog>

            <Dialog
                open={Boolean(verifyingRate)}
                onClose={() => {
                    setVerifyingRate(null);
                    setVerificationNote("");
                }}
                ariaLabelledBy="shipping-rate-verify-title"
                className="voucher-modal shipping-rate-modal shipping-rate-verify-modal"
                busy={saving}
            >
                <header className="voucher-modal-header">
                    <div><span>COURIER RATE</span><h2 id="shipping-rate-verify-title">Verify {verifyingRate?.provider} rate</h2></div>
                    <button type="button" onClick={() => { setVerifyingRate(null); setVerificationNote(""); }} disabled={saving} aria-label="Close verification"><X size={19} /></button>
                </header>
                <form onSubmit={verifyRate}>
                    <div className="shipping-rate-verify-content">
                        <p>Enter the quotation reference or other details confirming this courier price.</p>
                        <label className="voucher-form-field">
                            <span>Verification evidence <b>*</b></span>
                            <input required minLength={5} maxLength={500} value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Courier quotation reference or verification details" />
                        </label>
                        {error && <div className="voucher-form-alert" role="alert">{error}</div>}
                    </div>
                    <footer className="voucher-modal-footer">
                        <button className="voucher-secondary-button" type="button" onClick={() => { setVerifyingRate(null); setVerificationNote(""); }} disabled={saving}>Cancel</button>
                        <button className="voucher-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Record verification"}</button>
                    </footer>
                </form>
            </Dialog>

            {loading ? (
                <div className="voucher-state"><LoaderCircle size={20} className="voucher-spinner" /> Loading shipping zones…</div>
            ) : (
                <>
                    <div className="shipping-rate-toolbar">
                        <label className="voucher-search">
                            <Search size={17} aria-hidden="true" />
                            <span className="voucher-visually-hidden">Search shipping rates</span>
                            <input
                                type="search"
                                maxLength={100}
                                placeholder="Search route, provider, weight, or status"
                                value={rateSearch}
                                onChange={(event) => {
                                    setRatePage(1);
                                    setRateSearch(event.target.value);
                                }}
                            />
                        </label>
                        <span>{matchingRates.length} rate{matchingRates.length === 1 ? "" : "s"}</span>
                    </div>
                    {visibleRates.length === 0 ? (
                        <div className="voucher-state voucher-empty">
                            <strong>{normalizedRateSearch ? "No matching shipping rates" : "No shipping rates configured"}</strong>
                            {normalizedRateSearch && <span>Try another route, provider, weight, or status.</span>}
                        </div>
                    ) : (
                        <div className="voucher-table-scroll">
                            <table className="voucher-table shipping-rate-table">
                                <thead><tr><th>Route</th><th>Weight band</th><th>Provider</th><th>Fee</th><th>Estimated delivery</th><th>Rate type</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {visibleRates.map((rate) => (
                                        <tr key={rate.id}>
                                            <td>{rate.origin_zone} → {rate.destination_zone}</td>
                                            <td>{rate.min_weight_kg}–{rate.max_weight_kg} kg</td>
                                            <td>{rate.provider}</td>
                                            <td>₱{Number(rate.fee).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                            <td>{rate.min_delivery_days}–{rate.max_delivery_days} business days</td>
                                            <td><span className={`voucher-status ${rate.rate_source === "cryma" || !rate.is_provisional ? "status-active" : "status-scheduled"}`}>{rate.rate_source === "cryma" ? "CRYMA MANAGED" : rate.is_provisional ? "UNVERIFIED COURIER" : "VERIFIED COURIER"}</span></td>
                                            <td><span className={`voucher-status ${rate.is_active ? "status-active" : "status-disabled"}`}>{rate.is_active ? "Active" : "Disabled"}</span></td>
                                            <td><div className="voucher-row-actions">
                                                <button type="button" onClick={() => openRateDialog(rate)}>Edit</button>
                                                <button type="button" onClick={() => void toggleRate(rate)} disabled={saving}>{rate.is_active ? "Disable" : "Enable"}</button>
                                                {rate.rate_source !== "cryma" && rate.is_provisional && <button type="button" onClick={() => { setError(""); setVerifyingRate(rate); setVerificationNote(""); }}>Verify</button>}
                                            </div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {matchingRates.length > 0 && <footer className="voucher-pagination shipping-rate-pagination">
                        <span>Showing {((ratePage - 1) * 5) + 1}–{Math.min(ratePage * 5, matchingRates.length)} of {matchingRates.length} rates</span>
                        <div>
                            <button type="button" onClick={() => setRatePage((current) => Math.max(1, current - 1))} disabled={ratePage <= 1} aria-label="Previous shipping-rate page"><ChevronLeft size={17} /></button>
                            <span>Page {ratePage} of {ratePageCount}</span>
                            <button type="button" onClick={() => setRatePage((current) => Math.min(ratePageCount, current + 1))} disabled={ratePage >= ratePageCount} aria-label="Next shipping-rate page"><ChevronRight size={17} /></button>
                        </div>
                    </footer>}

                    <details className="shipping-zone-coverage">
                        <summary>
                            <span><strong>Zone coverage</strong><small>Manage regions assigned to each delivery zone</small></span>
                            <span className="shipping-zone-count">{zones.length} zones</span>
                        </summary>
                        <div className="shipping-zone-list">
                            <div className="shipping-zone-section-heading">
                                <span>Rates use these region assignments to find the parcel's origin and destination zone.</span>
                            </div>
                            {zonesWithRates.map((zone) => (
                                <section className="shipping-zone-card" key={zone.id}>
                                    <header>
                                        <div><h3>{zone.name}</h3><span>{zone.slug}</span></div>
                                        <button className="voucher-secondary-button" type="button" onClick={() => openZoneDialog(zone)}>Edit regions</button>
                                    </header>
                                    <p>{(zone.regions || []).map((item) => item.region_name).join(" · ") || "No regions assigned"}</p>
                                </section>
                            ))}
                            {zones.length === 0 && <div className="voucher-state">No shipping zones configured.</div>}
                        </div>
                    </details>
                </>
            )}

            <Dialog
                open={Boolean(confirmingDisable)}
                onClose={() => setConfirmingDisable(null)}
                ariaLabelledBy="shipping-rate-disable-title"
                className="voucher-confirm-modal"
                busy={saving}
            >
                <div className="voucher-confirm-icon warning"><CircleAlert size={22} /></div>
                <h2 id="shipping-rate-disable-title">Disable this shipping rate?</h2>
                <p>
                    {confirmingDisable?.provider} for {zones.find((zone) => zone.id === confirmingDisable?.origin_zone_id)?.name || "origin"} → {zones.find((zone) => zone.id === confirmingDisable?.destination_zone_id)?.name || "destination"} will no longer be used for new checkout quotes. Existing orders will not change.
                </p>
                {error && <div className="voucher-form-alert" role="alert">{error}</div>}
                <div className="voucher-confirm-actions">
                    <button type="button" className="voucher-secondary-button" onClick={() => setConfirmingDisable(null)} disabled={saving}>Keep enabled</button>
                    <button type="button" className="voucher-primary-button" onClick={() => void toggleRate(confirmingDisable, true)} disabled={saving}>
                        {saving ? "Disabling…" : "Disable rate"}
                    </button>
                </div>
            </Dialog>
        </section>
    );
}

export default ShippingZonesPanel;
