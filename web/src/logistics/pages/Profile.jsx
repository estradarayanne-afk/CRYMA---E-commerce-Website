import { useEffect, useState } from "react";
import api from "../../shared/services/api";
import "./AccountPages.css";

const EMPTY_FORM = { first_name: "", middle_name: "", last_name: "", phone: "" };

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        api.get("/logistics/profile")
            .then(({ data }) => {
                if (!active) return;
                const next = data?.data;
                setProfile(next);
                setForm({
                    first_name: next?.first_name || "",
                    middle_name: next?.middle_name || "",
                    last_name: next?.last_name || "",
                    phone: next?.phone || "",
                });
            })
            .catch((err) => {
                if (active) setError(err.response?.data?.message || "Unable to load your profile.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const { data } = await api.patch("/logistics/profile", form);
            const updated = { ...profile, ...data?.data };
            setProfile(updated);
            const cached = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...cached, ...data?.data }));
            window.dispatchEvent(new Event("logistics-profile-updated"));
            setNotice(data?.message || "Profile updated.");
        } catch (err) {
            setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat()[0] || "Unable to update your profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <section className="lw-empty" role="status">Loading profile…</section>;

    return (
        <section className="la-page">
            <header className="lw-page-heading"><div><span className="lw-eyebrow">YOUR ACCOUNT</span><h1>Profile</h1><p>View and update your personal contact details.</p></div></header>
            {error && <div className="lw-alert" role="alert">{error}</div>}
            {notice && <div className="lr-notice" role="status">{notice}</div>}
            {profile && <div className="la-grid">
                <form className="la-card" onSubmit={save}>
                    <h2>Personal details</h2>
                    <label>First name<input name="first_name" required maxLength={30} value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></label>
                    <label>Middle name<input name="middle_name" maxLength={30} value={form.middle_name} onChange={(event) => setForm((current) => ({ ...current, middle_name: event.target.value }))} /></label>
                    <label>Last name<input name="last_name" required maxLength={30} value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></label>
                    <label>Contact number<input name="phone" type="tel" maxLength={13} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                    <button className="la-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
                </form>
                <aside className="la-card">
                    <h2>Account information</h2>
                    <dl className="la-info">
                        <dt>Email</dt><dd>{profile.email}</dd>
                        <dt>Role</dt><dd>Logistics / Sorting Center</dd>
                        <dt>Account status</dt><dd>{profile.status}</dd>
                        <dt>Email verification</dt><dd>{profile.email_verified_at ? "Verified" : "Not verified"}</dd>
                        {profile.business_name && <><dt>Business name</dt><dd>{profile.business_name}</dd></>}
                    </dl>
                    <h3>Registered address</h3>
                    {(profile.addresses || []).length === 0 ? <p className="la-muted">No address is recorded.</p> : profile.addresses.map((address, index) => (
                        <p className="la-address" key={index}>{[address.house_number, address.street, address.building_name, address.unit_number, address.barangay, address.municipality, address.province, address.region, address.postal_code].filter(Boolean).join(", ")}</p>
                    ))}
                    <p className="la-muted">Email and registered address are shown for reference; their change flows require verification and are not enabled here.</p>
                </aside>
            </div>}
        </section>
    );
}
