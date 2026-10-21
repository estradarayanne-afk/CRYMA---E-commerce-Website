import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../shared/services/api";
import AuthShell from "../components/AuthShell";
import "./BuyerLogin.css";

export default function PasswordRecovery({ reset = false }) {
    const [params] = useSearchParams();
    const [email, setEmail] = useState(params.get("email") || "");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");
        setMessage("");
        try {
            if (reset) {
                await api.post("/reset-password", {
                    token: params.get("token"), email: email.trim(), password,
                    password_confirmation: confirmation,
                });
                setMessage("Password reset successfully. You can now sign in.");
            } else {
                const { data } = await api.post("/forgot-password", { email: email.trim() });
                setMessage(data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || "We could not process this request. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return <AuthShell><main className="buyer-login"><section className="buyer-login-form-section"><div className="buyer-login-form-wrap">
        <Link to="/login" className="buyer-login-back">Back to sign in</Link>
        <div className="buyer-login-heading"><h1>{reset ? "Choose a new password" : "Reset your password"}</h1><p>{reset ? "Enter a new password for your CRYMA account." : "If your email matches an account, we’ll send reset instructions."}</p></div>
        {message && <p role="status" className="buyer-login-alert buyer-login-alert-success">{message}</p>}
        {error && <p role="alert" className="buyer-login-alert buyer-login-alert-error">{error}</p>}
        <form className="buyer-login-form" onSubmit={submit}>
            <div className="buyer-login-field"><label htmlFor="recovery-email">Email address</label><input id="recovery-email" type="email" maxLength={254} autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading || reset} /></div>
            {reset && <><div className="buyer-login-field"><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} /></div><div className="buyer-login-field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading} /></div></>}
            <button type="submit" className="buyer-login-submit" disabled={loading}>{loading ? "Please wait…" : reset ? "Reset password" : "Send reset instructions"}</button>
        </form>
    </div></section></main></AuthShell>;
}
