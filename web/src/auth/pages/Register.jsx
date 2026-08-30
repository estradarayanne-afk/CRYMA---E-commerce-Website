import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../shared/services/api";

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", email: "", phone: "", role: "buyer", password: "", password_confirmation: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});

    const set = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setErrors((p) => ({ ...p, [e.target.name]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setErrors({}); setLoading(true);
        try {
            await api.post("/register", form);
            navigate("/buyer-login", { state: { message: "Registration submitted! Please wait for admin approval before signing in." } });
        } catch (err) {
            if (err.response?.status === 422) setErrors(err.response.data.errors || {});
            else setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const f = (name) => ({ name, value: form[name], onChange: set });

    return (
        <div className="auth-root auth-root--wide">
            {/* LEFT PANEL */}
            <div className="auth-left">
                <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                <div className="auth-left-body">
                    <h2>Join CRYMA.</h2>
                    <p>Create your account and discover thoughtful pieces for everyday living.</p>
                </div>
                <span className="auth-left-copy">© 2026 Cryma</span>
            </div>

            {/* RIGHT FORM */}
            <div className="auth-right">
                <div className="auth-box auth-box--wide">
                    <div className="auth-box-head">
                        <h1>Create account</h1>
                        <p>Fill in your details to get started</p>
                    </div>

                    {error && <div className="auth-notice auth-notice--error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* NAME ROW */}
                        <div className="auth-row">
                            <div className="auth-field">
                                <label>First name</label>
                                <input type="text" placeholder="Juan" required autoComplete="given-name" {...f("first_name")} />
                                {errors.first_name && <span className="auth-err">{errors.first_name[0]}</span>}
                            </div>
                            <div className="auth-field">
                                <label>Middle name <span className="auth-opt">(optional)</span></label>
                                <input type="text" placeholder="Santos" autoComplete="additional-name" {...f("middle_name")} />
                            </div>
                            <div className="auth-field">
                                <label>Last name</label>
                                <input type="text" placeholder="Dela Cruz" required autoComplete="family-name" {...f("last_name")} />
                                {errors.last_name && <span className="auth-err">{errors.last_name[0]}</span>}
                            </div>
                        </div>

                        {/* EMAIL & PHONE */}
                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Email address</label>
                                <input type="email" placeholder="you@example.com" required autoComplete="email" {...f("email")} />
                                {errors.email && <span className="auth-err">{errors.email[0]}</span>}
                            </div>
                            <div className="auth-field">
                                <label>Phone <span className="auth-opt">(optional)</span></label>
                                <input type="tel" placeholder="+63 912 345 6789" autoComplete="tel" {...f("phone")} />
                            </div>
                        </div>

                        {/* ROLE */}
                        <div className="auth-field">
                            <label>I want to join as</label>
                            <div className="auth-roles">
                                {["buyer", "seller", "rider"].map((r) => (
                                    <label key={r} className={`auth-role${form.role === r ? " active" : ""}`}>
                                        <input type="radio" name="role" value={r} checked={form.role === r} onChange={set} />
                                        <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* PASSWORD */}
                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Password</label>
                                <div className="auth-pw-wrap">
                                    <input type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" required autoComplete="new-password" {...f("password")} />
                                    <button type="button" className="auth-eye" onClick={() => setShowPassword((v) => !v)}>
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && <span className="auth-err">{errors.password[0]}</span>}
                            </div>
                            <div className="auth-field">
                                <label>Confirm password</label>
                                <div className="auth-pw-wrap">
                                    <input type={showPassword ? "text" : "password"} placeholder="Repeat password" required autoComplete="new-password" {...f("password_confirmation")} />
                                </div>
                            </div>
                        </div>

                        <button className="auth-submit" type="submit" disabled={loading}>
                            {loading ? <span className="auth-spinner" /> : "Create account"}
                        </button>
                    </form>

                    <p className="auth-switch">Already have an account? <Link to="/buyer-login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}

export default Register;
