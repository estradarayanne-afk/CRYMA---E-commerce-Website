import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import api from "../../../shared/services/api";

const EMPTY_ZONE = { name: "", slug: "", regions: "" };
const EMPTY_RATE = {
    origin_zone_id: "",
    destination_zone_id: "",
    provider: "CRYMA Demo",
    min_weight_kg: "0",
    max_weight_kg: "1",
    fee: "",
    volumetric_divisor_cm3_per_kg: "",
    is_provisional: true,
    is_active: false,
};

function ShippingZonesPanel() {
    const [zones, setZones] = useState([]);
    const [zoneForm, setZoneForm] = useState(EMPTY_ZONE);
    const [editingZone, setEditingZone] = useState(null);
    const [rateForm, setRateForm] = useState(EMPTY_RATE);
    const [editingRate, setEditingRate] = useState(null);
    const [verifyingRate, setVerifyingRate] = useState(null);
    const [verificationNote, setVerificationNote] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadZones = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const response = await api.get("/admin/shipping-zones");
            setZones(Array.isArray(response.data?.data) ? response.data.data : []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to load shipping zones.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadZones();
    }, [loadZones]);

    const saveZone = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload = {
                name: zoneForm.name.trim(),
                slug: zoneForm.slug.trim().toLowerCase(),
                regions: zoneForm.regions.split(/\r?\n/).map((region) => region.trim()).filter(Boolean),
                is_active: true,
            };
            if (editingZone) {
                await api.patch(`/admin/shipping-zones/${editingZone.id}`, payload);
            } else {
                await api.post("/admin/shipping-zones", payload);
            }
            setZoneForm(EMPTY_ZONE);
            setEditingZone(null);
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
            };
            if (editingRate) {
                await api.patch(`/admin/shipping-zone-rates/${editingRate.id}`, payload);
            } else {
                await api.post("/admin/shipping-zone-rates", payload);
            }
            setRateForm(EMPTY_RATE);
            setEditingRate(null);
            await loadZones();
        } catch (requestError) {
            const errors = requestError.response?.data?.errors || {};
            setError(Object.values(errors).flat()[0] || requestError.response?.data?.message || "Unable to save the shipping rate.");
        } finally {
            setSaving(false);
        }
    };

    const toggleRate = async (rate) => {
        setError("");
        try {
            await api.patch(`/admin/shipping-zone-rates/${rate.id}/status`, { is_active: !rate.is_active });
            await loadZones();
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to update the shipping rate status.");
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

    return (
        <section className="voucher-list-card shipping-zone-manager" aria-label="Shipping zone configuration">
            <div className="voucher-list-heading">
                <div>
                    <span>DELIVERY CONFIGURATION</span>
                    <h2>Shipping zones and rates</h2>
                    <p>Checkout prices each seller parcel by origin zone, destination zone, and billable weight.</p>
                </div>
            </div>
            <div className="shipping-zone-notice" role="note">
                Demo rates are provisional estimates, not verified courier prices. They can be used in local/demo environments only. Production checkout requires a verified rate.
            </div>
            {error && <div className="voucher-alert error" role="alert">{error}</div>}

            <form className="shipping-zone-form" onSubmit={saveRate}>
                <strong>{editingRate ? "Edit route rate" : "Add route rate"}</strong>
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
                        <span>Volumetric divisor <em>Optional</em></span>
                        <input type="number" min="0.01" step="0.01" value={rateForm.volumetric_divisor_cm3_per_kg} onChange={(event) => setRateForm((current) => ({ ...current, volumetric_divisor_cm3_per_kg: event.target.value }))} />
                        <small>Leave blank to bill by actual product weight only.</small>
                    </label>
                    <label className="voucher-active-toggle">
                        <input type="checkbox" checked={rateForm.is_provisional} onChange={(event) => setRateForm((current) => ({ ...current, is_provisional: event.target.checked }))} />
                        <span><strong>Provisional/demo estimate</strong><small>Production cannot activate provisional rates.</small></span>
                    </label>
                    <label className="voucher-active-toggle">
                        <input type="checkbox" checked={rateForm.is_active} onChange={(event) => setRateForm((current) => ({ ...current, is_active: event.target.checked }))} />
                        <span><strong>Enable at checkout</strong><small>Production only permits verified rates.</small></span>
                    </label>
                </div>
                <div className="voucher-row-actions">
                    <button className="voucher-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingRate ? "Save rate" : "Add rate"}</button>
                    {editingRate && <button className="voucher-secondary-button" type="button" onClick={() => { setEditingRate(null); setRateForm(EMPTY_RATE); }}>Cancel</button>}
                </div>
            </form>

            <form className="shipping-zone-form" onSubmit={saveZone}>
                <strong>{editingZone ? `Edit ${editingZone.name} region coverage` : "Add a future shipping zone"}</strong>
                <div className="voucher-form-grid">
                    <label className="voucher-form-field">
                        <span>Zone name</span>
                        <input required maxLength={80} value={zoneForm.name} onChange={(event) => setZoneForm((current) => ({ ...current, name: event.target.value }))} />
                    </label>
                    <label className="voucher-form-field">
                        <span>Zone key</span>
                        <input required maxLength={80} pattern="[A-Za-z0-9_-]+" value={zoneForm.slug} onChange={(event) => setZoneForm((current) => ({ ...current, slug: event.target.value }))} />
                    </label>
                    <label className="voucher-form-field full">
                        <span>Regions assigned to this zone <em>One per line</em></span>
                        <textarea required rows={3} value={zoneForm.regions} onChange={(event) => setZoneForm((current) => ({ ...current, regions: event.target.value }))} />
                    </label>
                </div>
                <div className="voucher-row-actions">
                    <button className="voucher-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingZone ? "Save zone" : "Add zone"}</button>
                    {editingZone && <button className="voucher-secondary-button" type="button" onClick={() => { setEditingZone(null); setZoneForm(EMPTY_ZONE); }}>Cancel</button>}
                </div>
            </form>

            {verifyingRate && (
                <form className="shipping-zone-verify" onSubmit={verifyRate}>
                    <label className="voucher-form-field">
                        <span>Verification evidence for {verifyingRate.provider} rate</span>
                        <input required minLength={5} maxLength={500} value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="Courier quotation reference or verification details" />
                    </label>
                    <div className="voucher-row-actions">
                        <button className="voucher-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Record verification"}</button>
                        <button className="voucher-secondary-button" type="button" onClick={() => { setVerifyingRate(null); setVerificationNote(""); }}>Cancel</button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="voucher-state"><LoaderCircle size={20} className="voucher-spinner" /> Loading shipping zones…</div>
            ) : (
                <div className="shipping-zone-list">
                    {zonesWithRates.map((zone) => (
                        <section className="shipping-zone-card" key={zone.id}>
                            <header>
                                <div><h3>{zone.name}</h3><span>{zone.slug}</span></div>
                                <button className="voucher-secondary-button" type="button" onClick={() => {
                                    setEditingZone(zone);
                                    setZoneForm({ name: zone.name, slug: zone.slug, regions: (zone.regions || []).map((item) => item.region_name).join("\n") });
                                }}>Edit regions</button>
                            </header>
                            <p>{(zone.regions || []).map((item) => item.region_name).join(" · ") || "No regions assigned"}</p>
                            <div className="voucher-table-scroll">
                                <table className="voucher-table">
                                    <thead><tr><th>Route</th><th>Weight band</th><th>Provider</th><th>Fee</th><th>Rate type</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {zone.rates.map((rate) => {
                                            const destination = zones.find((item) => item.id === rate.destination_zone_id)?.name || "Unknown";
                                            return (
                                                <tr key={rate.id}>
                                                    <td>{zone.name} → {destination}</td>
                                                    <td>{rate.min_weight_kg}–{rate.max_weight_kg} kg</td>
                                                    <td>{rate.provider}</td>
                                                    <td>₱{Number(rate.fee).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                                    <td><span className={`voucher-status ${rate.is_provisional ? "status-scheduled" : "status-active"}`}>{rate.is_provisional ? "PROVISIONAL DEMO" : "VERIFIED"}</span></td>
                                                    <td><span className={`voucher-status ${rate.is_active ? "status-active" : "status-disabled"}`}>{rate.is_active ? "Active" : "Disabled"}</span></td>
                                                    <td><div className="voucher-row-actions">
                                                        <button type="button" onClick={() => {
                                                            setEditingRate(rate);
                                                            setRateForm({
                                                                origin_zone_id: String(rate.origin_zone_id),
                                                                destination_zone_id: String(rate.destination_zone_id),
                                                                provider: rate.provider,
                                                                min_weight_kg: String(rate.min_weight_kg),
                                                                max_weight_kg: String(rate.max_weight_kg),
                                                                fee: String(rate.fee),
                                                                volumetric_divisor_cm3_per_kg: rate.volumetric_divisor_cm3_per_kg == null ? "" : String(rate.volumetric_divisor_cm3_per_kg),
                                                                is_provisional: Boolean(rate.is_provisional),
                                                                is_active: Boolean(rate.is_active),
                                                            });
                                                        }}>Edit</button>
                                                        <button type="button" onClick={() => void toggleRate(rate)}>{rate.is_active ? "Disable" : "Enable"}</button>
                                                        {rate.is_provisional && <button type="button" onClick={() => { setVerifyingRate(rate); setVerificationNote(""); }}>Verify</button>}
                                                    </div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    ))}
                    {zones.length === 0 && <div className="voucher-state">No shipping zones configured.</div>}
                </div>
            )}
        </section>
    );
}

export default ShippingZonesPanel;
