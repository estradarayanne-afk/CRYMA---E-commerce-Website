import { useEffect, useState } from "react";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

export default function Profile() {
    const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", phone: "" });
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        api.get("/user")
            .then(({ data }) => {
                if (!active) return;
                setUser(data.user);
                setForm({
                    first_name: data.user.first_name || "",
                    middle_name: data.user.middle_name || "",
                    last_name: data.user.last_name || "",
                    phone: data.user.phone || "",
                });
            })
            .catch((err) => { if (active) setError(err.response?.data?.message || "Unable to load your profile."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const { data } = await api.patch("/account/profile", form);
            setUser((current) => ({ ...current, ...data.data }));
            const cached = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem("user", JSON.stringify({ ...cached, ...data.data }));
            setNotice(data.message || "Profile updated successfully.");
        } catch (err) {
            setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat()[0] || "Unable to update your profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <section className="cw-state" role="status">Loading profile…</section>;

    return <section className="cw-page">
        <header className="cw-page-heading"><div><span className="cw-eyebrow">YOUR ACCOUNT</span><h1>Courier profile</h1><p>Update your permitted personal contact details.</p></div></header>
        {error && <div className="cw-alert" role="alert">{error}</div>}
        {notice && <div className="cw-notice" role="status">{notice}</div>}
        {user && <div className="cw-account-grid">
            <form className="cw-panel cw-account-form" onSubmit={save}>
                <h2>Personal details</h2>
                <label>First name<input required maxLength={30} value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></label>
                <label>Middle name<input maxLength={30} value={form.middle_name} onChange={(event) => setForm((current) => ({ ...current, middle_name: event.target.value }))} /></label>
                <label>Last name<input required maxLength={30} value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></label>
                <label>Contact number<input type="tel" maxLength={13} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
                <button className="cw-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
            </form>
            <aside className="cw-panel">
                <h2>Account and courier eligibility</h2>
                <dl className="cw-account-info">
                    <dt>Email</dt><dd>{user.email}</dd>
                    <dt>Role</dt><dd>Courier / Rider</dd>
                    <dt>Account status</dt><dd>{user.status}</dd>
                    <dt>Email verification</dt><dd>{user.email_verified_at ? "Verified" : "Not verified"}</dd>
                </dl>
                <p className="cw-muted">Role, account status, and approval eligibility are managed through the authorized review process and cannot be changed here.</p>
            </aside>
        </div>}
    </section>;
}
