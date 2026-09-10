import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../../shared/services/api";

function AdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();
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
            if (data.user.role !== "admin") {
                setError("This login is for administrators only.");
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/admin/dashboard", { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-root">
            {/* LEFT PANEL */}
            <div className="auth-left auth-left--admin">
                <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                <div className="auth-left-body">
                    <h2>Admin Portal</h2>
                    <p>Manage and monitor the CRYMA platform from one place.</p>
                </div>
                <span className="auth-left-copy">© 2026 Cryma · Admin access only</span>
            </div>

            {/* RIGHT FORM */}
            <div className="auth-right">
                <div className="auth-box">
                    <div className="auth-box-head">
                        <h1>Admin sign in</h1>
                        <p>Access the CRYMA admin dashboard</p>
                    </div>

                    {location.state?.message && <div className={`auth-notice ${location.state.type === "success" ? "auth-notice--success" : "auth-notice--info"}`}>{location.state.message}</div>}
                    {error && <div className="auth-notice auth-notice--error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="email">Email address</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@cryma.com" required autoComplete="email" />
                        </div>

                        <div className="auth-field">
                            <label htmlFor="password">Password</label>
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

                    <p className="auth-switch">Not an admin? <Link to="/buyer-login">Go to store login</Link></p>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;
