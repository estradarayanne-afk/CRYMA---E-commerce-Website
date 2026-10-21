import { useState } from "react";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

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
            const { data } = await api.patch("/account/password", form);
            setNotice(data.message || "Password changed successfully.");
            setForm(EMPTY_FORM);
        } catch (err) {
            setError(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat()[0] || "Unable to change password.");
        } finally {
            setSaving(false);
        }
    };

    return <section className="cw-page">
        <header className="cw-page-heading"><div><span className="cw-eyebrow">ACCOUNT SECURITY</span><h1>Settings</h1><p>Change the password for your courier account.</p></div></header>
        {error && <div className="cw-alert" role="alert">{error}</div>}
        {notice && <div className="cw-notice" role="status">{notice}</div>}
        <form className="cw-panel cw-account-form cw-account-password" onSubmit={submit}>
            <h2>Change password</h2>
            <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={form.current_password} onChange={(event) => setForm((current) => ({ ...current, current_password: event.target.value }))} /></label>
            <label>New password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password_confirmation} onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} /></label>
            <p className="cw-muted">Changing your password revokes other active access tokens. This current session remains available.</p>
            <button className="cw-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
        </form>
    </section>;
}
