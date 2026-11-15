import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../shared/services/api";
import AuthShell from "../components/AuthShell";
import "./EmailVerification.css";

export default function EmailVerification() {
    const [params] = useSearchParams();
    const [email, setEmail] = useState(params.get("email") || "");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [verifiedRole, setVerifiedRole] = useState("");

    async function verifyEmail(event) {
        event.preventDefault();
        if (loading) return;

        if (!/^\d{6}$/.test(otp)) {
            setError("Enter the six-digit verification code from your email.");
            return;
        }

        setLoading(true);
        setError("");
        setNotice("");

        try {
            const response = await api.post("/verify-email", {
                email: email.trim().toLowerCase(),
                otp,
            });
            setVerifiedRole(response.data?.data?.role || "");
            setNotice(response.data?.message || "Your email has been verified.");
        } catch (requestError) {
            const validationErrors = requestError.response?.data?.errors || {};
            const firstValidationError = Object.values(validationErrors).flat()[0];
            setError(
                firstValidationError ||
                requestError.response?.data?.message ||
                "We could not verify this code. Please check it and try again."
            );
        } finally {
            setLoading(false);
        }
    }

    async function resendCode() {
        if (loading) return;
        setLoading(true);
        setError("");
        setNotice("");

        try {
            const response = await api.post("/resend-verification", {
                email: email.trim().toLowerCase(),
            });
            setOtp("");
            setNotice(response.data?.message || "If this account is pending verification, a new code has been sent.");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "We could not send a new verification code. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell>
            <section className="email-verification-page">
                <div className="email-verification-card">
                    <span className="email-verification-eyebrow">CRYMA ACCOUNT SECURITY</span>
                    <h1>{verifiedRole ? "Email verified" : "Verify your email"}</h1>
                    {verifiedRole ? (
                        <>
                            <p>{notice}</p>
                            {verifiedRole === "hub_staff" && (
                                <p className="email-verification-next-step">
                                    Your administrator must activate your Hub Staff access before you can sign in.
                                </p>
                            )}
                            <Link className="email-verification-submit" to="/login">Go to sign in</Link>
                        </>
                    ) : (
                        <>
                            <p>Enter the six-digit code sent to your email. The code expires after 10 minutes.</p>
                            {error && <div className="email-verification-alert is-error" role="alert">{error}</div>}
                            {notice && <div className="email-verification-alert" role="status">{notice}</div>}
                            <form onSubmit={verifyEmail}>
                                <div className="auth-field">
                                    <label htmlFor="verification-email">Email address</label>
                                    <input
                                        id="verification-email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="name@example.com"
                                    />
                                </div>
                                <div className="auth-field">
                                    <label htmlFor="verification-code">Six-digit code</label>
                                    <input
                                        id="verification-code"
                                        name="otp"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        pattern="[0-9]{6}"
                                        required
                                        value={otp}
                                        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="000000"
                                    />
                                </div>
                                <button className="email-verification-submit" type="submit" disabled={loading}>
                                    {loading ? "Verifying..." : "Verify email"}
                                </button>
                            </form>
                            <button
                                className="email-verification-resend"
                                type="button"
                                onClick={() => void resendCode()}
                                disabled={loading || !email.trim()}
                            >
                                {loading ? "Please wait..." : "Resend verification code"}
                            </button>
                        </>
                    )}
                    <div className="email-verification-footer">
                        Already verified? <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </section>
        </AuthShell>
    );
}
