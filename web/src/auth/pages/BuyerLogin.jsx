import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../shared/services/api";
import AuthShell from "../components/AuthShell";
import "./BuyerLogin.css";

function Login({
    embedded = false,
    authOptions = {},
    onSwitchToRegister,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const from =
    authOptions.from ||
    location.state?.from ||
    "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        document.title = "Sign in | CRYMA";

        return () => {
            document.title = "CRYMA";
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError("");
        setLoading(true);

        try {
            const { data } = await api.post("/login", {
                email: email.trim(),
                password,
            });

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            const roleHome = {
                admin: "/admin/dashboard",
                seller: "/seller/dashboard",
                rider: "/courier/dashboard",
                buyer: from,
            };

            const destination = roleHome[data.user.role] || "/";

            window.dispatchEvent(
                new Event("cryma-close-auth")
            );

            navigate(destination, {
                replace: true,
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    (err.request
                        ? "The server is not reachable. Please start the backend and try again."
                        : "Login failed. Please check your email and password.")
            );
        } finally {
            setLoading(false);
        }
    };

    const content = (<main
        className={`buyer-login ${
            embedded ? "embedded" : ""
        }`}
    >

            {/* LOGIN PANEL */}
            <section className="buyer-login-form-section">
                <div className="buyer-login-form-wrap">
                    <Link to="/" className="buyer-login-back">
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M19 12H5" />
                            <path d="M12 19l-7-7 7-7" />
                        </svg>

                        Back to store
                    </Link>

                    <div className="buyer-login-heading">
                        <span className="buyer-login-mobile-logo">
                            C
                        </span>

                        <h1>Welcome back</h1>

                        <p>
                            Sign in to continue to your CRYMA account.
                        </p>
                    </div>

                    {/* NOTICE FROM OTHER PAGES */}
                    {location.state?.message && (
                        <div
                            className={`buyer-login-alert ${
                                location.state.type === "success"
                                    ? "buyer-login-alert-success"
                                    : "buyer-login-alert-info"
                            }`}
                        >
                            <span className="buyer-login-alert-icon">
                                {location.state.type === "success"
                                    ? "✓"
                                    : "i"}
                            </span>

                            <span>{location.state.message}</span>
                        </div>
                    )}

                    {/* LOGIN ERROR */}
                    {error && (
                        <div className="buyer-login-alert buyer-login-alert-error">
                            <span className="buyer-login-alert-icon">
                                !
                            </span>

                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        className="buyer-login-form"
                        onSubmit={handleSubmit}
                    >
                        {/* EMAIL */}
                        <div className="buyer-login-field">
                            <label htmlFor="email">
                                Email address
                            </label>

                            <div className="buyer-login-input-wrap">
                                <svg
                                    className="buyer-login-input-icon"
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="2"
                                    />
                                    <path d="m3 7 9 6 9-6" />
                                </svg>

                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    autoFocus
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="buyer-login-field">
                            <div className="buyer-login-field-top">
                                <label htmlFor="password">
                                    Password
                                </label>

                                <button
                                    type="button"
                                    className="buyer-login-forgot"
                                    onClick={() =>
                                        setError(
                                            "Password recovery is not available yet."
                                        )
                                    }
                                    disabled={loading}
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="buyer-login-input-wrap">
                                <svg
                                    className="buyer-login-input-icon"
                                    width="17"
                                    height="17"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect
                                        x="4"
                                        y="10"
                                        width="16"
                                        height="11"
                                        rx="2"
                                    />
                                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                                </svg>

                                <input
                                    id="password"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                />

                                <button
                                    type="button"
                                    className="buyer-login-eye"
                                    onClick={() =>
                                        setShowPassword(
                                            (value) => !value
                                        )
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <svg
                                            width="17"
                                            height="17"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M3 3l18 18" />
                                            <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                                            <path d="M9.88 4.24A9.6 9.6 0 0 1 12 4c7 0 11 8 11 8a17.5 17.5 0 0 1-3.02 3.98" />
                                            <path d="M6.61 6.61C3.93 8.15 1 12 1 12s4 8 11 8a10.9 10.9 0 0 0 4.39-.93" />
                                        </svg>
                                    ) : (
                                        <svg
                                            width="17"
                                            height="17"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                                            <circle
                                                cx="12"
                                                cy="12"
                                                r="3"
                                            />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            className="buyer-login-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="buyer-login-spinner" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign in</span>

                                    <svg
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M5 12h14" />
                                        <path d="m13 6 6 6-6 6" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="buyer-login-divider">
                        <span />
                        <small>NEW TO CRYMA?</small>
                        <span />
                    </div>

                    {embedded ? (
                        <button
                            type="button"
                            className="buyer-login-register"
                            onClick={onSwitchToRegister}
                        >
                            Create an account
                        </button>
                    ) : (
                        <Link
                            to="/register"
                            className="buyer-login-register"
                        >
                            Create an account
                        </Link>
                    )}

                    <p className="buyer-login-security">
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect
                                x="4"
                                y="10"
                                width="16"
                                height="11"
                                rx="2"
                            />
                            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>

                        Your account information is securely handled.
                    </p>
                </div>
            </section>
        </main>
    );
    return embedded ? content : <AuthShell>{content}</AuthShell>;
}

export default Login;
