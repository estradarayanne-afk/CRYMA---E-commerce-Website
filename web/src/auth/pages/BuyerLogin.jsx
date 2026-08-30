import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../shared/services/api";

function BuyerLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { data } = await api.post("/login", { email, password });
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            if (data.user.role === "seller") {
                navigate("/seller/dashboard", { replace: true });
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-root">
            {/* LEFT PANEL */}
            <div className="auth-left">
                <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                <div className="auth-left-body">
                    <h2>Welcome back.</h2>
                    <p>Sign in to discover thoughtful pieces for the way your days actually move.</p>
                </div>
                <span className="auth-left-copy">© 2026 Cryma</span>
            </div>

            {/* RIGHT FORM */}
            <div className="auth-right">
                <div className="auth-box">
                    <div className="auth-box-head">
                        <h1>Sign in</h1>
                        <p>Enter your credentials to continue</p>
                    </div>

                    {location.state?.message && <div className={`auth-notice ${location.state.type === "success" ? "auth-notice--success" : "auth-notice--info"}`}>{location.state.message}</div>}
                    {error && <div className="auth-notice auth-notice--error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="email">Email address</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                        </div>

                        <div className="auth-field">
                            <div className="auth-field-top">
                                <label htmlFor="password">Password</label>
                                <a href="/forgot-password" className="auth-link-sm">Forgot password?</a>
                            </div>
                            <div className="auth-pw-wrap">
                                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" />
                                <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide" : "Show"}>
                                    {showPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button className="auth-submit" type="submit" disabled={loading}>
                            {loading ? <span className="auth-spinner" /> : "Sign in"}
                        </button>
                    </form>

                    <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
                </div>
            </div>
        </div>
    );
}

export default BuyerLogin;
