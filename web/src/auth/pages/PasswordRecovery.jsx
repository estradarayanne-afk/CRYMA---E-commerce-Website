import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../shared/services/api";
import AuthShell from "../components/AuthShell";
import "./BuyerLogin.css";
import "./PasswordRecovery.css";

export default function PasswordRecovery({ reset = false }) {
    const [params] = useSearchParams();
    const [email, setEmail] = useState(params.get("email") || "");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const clearFieldError = (field) => {
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
        setError("");
    };

    async function submit(event) {
        event.preventDefault();
        if (loading) return;

        const form = event.currentTarget;
        const emailInput = form.elements.namedItem("email");
        const nextErrors = {};

        if (emailInput.validity.valueMissing) {
            nextErrors.email = "Enter your email address.";
        } else if (emailInput.validity.typeMismatch) {
            nextErrors.email = "Enter a valid email address.";
        }

        if (reset) {
            const passwordInput = form.elements.namedItem("password");
            const confirmationInput = form.elements.namedItem("password_confirmation");

            if (passwordInput.validity.valueMissing) {
                nextErrors.password = "Enter a new password.";
            } else if (passwordInput.validity.tooShort) {
                nextErrors.password = "Use at least 8 characters.";
            }

            if (confirmationInput.validity.valueMissing) {
                nextErrors.password_confirmation = "Confirm your new password.";
            } else if (password !== confirmation) {
                nextErrors.password_confirmation = "The passwords do not match.";
            }

            if (!params.get("token")) {
                setFieldErrors({});
                setError("This reset link is incomplete or expired. Request a new one to continue.");
                return;
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            setError("");
            const firstInvalidField = Object.keys(nextErrors)[0];
            form.elements.namedItem(firstInvalidField).focus();
            return;
        }

        setLoading(true);
        setFieldErrors({});
        setError("");
        setMessage("");

        try {
            if (reset) {
                await api.post("/reset-password", {
                    token: params.get("token"),
                    email: email.trim(),
                    password,
                    password_confirmation: confirmation,
                });
                setMessage("Your password has been updated. You can now sign in with your new password.");
            } else {
                const { data } = await api.post("/forgot-password", { email: email.trim() });
                setMessage(data.message);
            }
        } catch (requestError) {
            const validationErrors = requestError.response?.data?.errors || {};
            const getFieldMessage = (messages) =>
                Array.isArray(messages) ? messages[0] : messages;
            const nextFieldErrors = {
                email: getFieldMessage(validationErrors.email),
                password: getFieldMessage(validationErrors.password),
                password_confirmation: getFieldMessage(validationErrors.password_confirmation),
            };
            const hasFieldErrors = Object.values(nextFieldErrors).some(Boolean);

            if (hasFieldErrors) {
                setFieldErrors(nextFieldErrors);
            } else {
                setError(
                    requestError.response?.data?.message ||
                    "We could not process this request. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthShell>
            <main className="buyer-login password-recovery">
                <section className="buyer-login-form-section">
                    <div className="buyer-login-form-wrap">
                        <Link to="/login" className="buyer-login-back">
                            <span aria-hidden="true">←</span> Back to sign in
                        </Link>

                        {message ? (
                            <section className="recovery-complete" role="status" aria-live="polite">
                                <span className="recovery-complete-icon" aria-hidden="true">✓</span>
                                <span className="buyer-login-kicker">CRYMA ACCOUNT SECURITY</span>
                                <h1>{reset ? "Password updated" : "Check your inbox"}</h1>
                                <p>{message}</p>
                                {!reset && (
                                    <div className="recovery-privacy-note">
                                        For your privacy, this confirmation is the same whether or not an account uses this email.
                                    </div>
                                )}
                                <Link to="/login" className="buyer-login-submit recovery-return-link">
                                    Return to sign in <span aria-hidden="true">→</span>
                                </Link>
                            </section>
                        ) : (
                            <>
                                <div className="buyer-login-heading">
                                    <span className="buyer-login-kicker">CRYMA ACCOUNT SECURITY</span>
                                    <h1>{reset ? "Choose a new password" : "Reset your password"}</h1>
                                    <p>
                                        {reset
                                            ? "Create a new password to get back into your CRYMA account."
                                            : "Enter your account email and we’ll send instructions if it matches an account."}
                                    </p>
                                </div>

                                {error && (
                                    <div className="buyer-login-alert buyer-login-alert-error" role="alert" aria-live="assertive">
                                        <span className="buyer-login-alert-icon" aria-hidden="true">!</span>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <form className="buyer-login-form" onSubmit={submit} noValidate>
                                    <div className="buyer-login-field">
                                        <label htmlFor="recovery-email">Email address</label>
                                        <div className="buyer-login-input-wrap">
                                            <input
                                                id="recovery-email"
                                                name="email"
                                                type="email"
                                                maxLength={254}
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                required
                                                value={email}
                                                onChange={(event) => {
                                                    setEmail(event.target.value);
                                                    clearFieldError("email");
                                                }}
                                                disabled={loading}
                                                aria-invalid={Boolean(fieldErrors.email)}
                                                aria-describedby={fieldErrors.email ? "recovery-email-error" : undefined}
                                            />
                                        </div>
                                        {fieldErrors.email && (
                                            <small id="recovery-email-error" className="buyer-login-field-error">{fieldErrors.email}</small>
                                        )}
                                    </div>

                                    {reset && (
                                        <>
                                            <div className="buyer-login-field">
                                                <label htmlFor="new-password">New password</label>
                                                <div className="buyer-login-input-wrap">
                                                    <input
                                                        id="new-password"
                                                        name="password"
                                                        type={showPassword ? "text" : "password"}
                                                        minLength={8}
                                                        maxLength={128}
                                                        autoComplete="new-password"
                                                        placeholder="At least 8 characters"
                                                        required
                                                        value={password}
                                                        onChange={(event) => {
                                                            setPassword(event.target.value);
                                                            setFieldErrors((current) => ({
                                                                ...current,
                                                                password: undefined,
                                                                password_confirmation: undefined,
                                                            }));
                                                            setError("");
                                                        }}
                                                        disabled={loading}
                                                        aria-invalid={Boolean(fieldErrors.password)}
                                                        aria-describedby={fieldErrors.password ? "recovery-password-error" : "recovery-password-hint"}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="buyer-login-eye recovery-password-toggle"
                                                        onClick={() => setShowPassword((current) => !current)}
                                                        aria-label={showPassword ? "Hide new password" : "Show new password"}
                                                        aria-pressed={showPassword}
                                                        disabled={loading}
                                                    >
                                                        {showPassword ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                                <small id="recovery-password-hint" className="recovery-password-hint">Use at least 8 characters.</small>
                                                {fieldErrors.password && (
                                                    <small id="recovery-password-error" className="buyer-login-field-error">{fieldErrors.password}</small>
                                                )}
                                            </div>

                                            <div className="buyer-login-field">
                                                <label htmlFor="confirm-password">Confirm new password</label>
                                                <div className="buyer-login-input-wrap">
                                                    <input
                                                        id="confirm-password"
                                                        name="password_confirmation"
                                                        type={showConfirmation ? "text" : "password"}
                                                        maxLength={128}
                                                        autoComplete="new-password"
                                                        placeholder="Re-enter your new password"
                                                        required
                                                        value={confirmation}
                                                        onChange={(event) => {
                                                            setConfirmation(event.target.value);
                                                            clearFieldError("password_confirmation");
                                                        }}
                                                        disabled={loading}
                                                        aria-invalid={Boolean(fieldErrors.password_confirmation)}
                                                        aria-describedby={fieldErrors.password_confirmation ? "recovery-confirmation-error" : undefined}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="buyer-login-eye recovery-password-toggle"
                                                        onClick={() => setShowConfirmation((current) => !current)}
                                                        aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"}
                                                        aria-pressed={showConfirmation}
                                                        disabled={loading}
                                                    >
                                                        {showConfirmation ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                                {fieldErrors.password_confirmation && (
                                                    <small id="recovery-confirmation-error" className="buyer-login-field-error">{fieldErrors.password_confirmation}</small>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    <button type="submit" className="buyer-login-submit" disabled={loading} aria-busy={loading}>
                                        {loading ? (
                                            <>
                                                <span className="buyer-login-spinner" />
                                                <span>{reset ? "Updating password..." : "Sending instructions..."}</span>
                                            </>
                                        ) : (
                                            <span>{reset ? "Reset password" : "Send reset instructions"}</span>
                                        )}
                                    </button>
                                </form>

                                {!reset && (
                                    <p className="recovery-privacy-note">
                                        For your privacy, we won’t tell anyone whether an email address is registered.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </main>
        </AuthShell>
    );
}
