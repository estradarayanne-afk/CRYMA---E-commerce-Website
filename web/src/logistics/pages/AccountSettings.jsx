import { useState } from "react";
import api from "../../shared/services/api";
import "./AccountPages.css";

const EMPTY_FORM = { current_password: "", password: "", password_confirmation: "" };

export default function AccountSettings() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const { data } = await api.patch("/logistics/account/password", form);
            setNotice(data?.message || "Password updated.");
            setForm(EMPTY_FORM);
        } catch (err) {
            setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat()[0] || "Unable to update password.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="la-page">
            <header className="lw-page-heading"><div><span className="lw-eyebrow">SECURITY</span><h1>Account Settings</h1><p>Manage the password used to access your Logistics account.</p></div></header>
            {error && <div className="lw-alert" role="alert">{error}</div>}
            {notice && <div className="lr-notice" role="status">{notice}</div>}
            <form className="la-card la-password-form" onSubmit={submit}>
                <h2>Change password</h2>
                <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={form.current_password} onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))} /></label>
                <label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
                <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password_confirmation} onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} /></label>
                <p className="la-muted">Changing your password revokes other active personal access tokens. This session remains available.</p>
                <button className="la-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
            </form>
        </section>
    );
}
