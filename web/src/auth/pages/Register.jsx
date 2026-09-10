import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../shared/services/api";
import { PROVINCES, MUNICIPALITIES, BARANGAYS } from "./addressData";

const LINES_OF_BUSINESS = ["Clothing & Apparel", "Electronics", "Food & Beverages", "Health & Beauty", "Home & Living", "Sports & Outdoors", "Books & Stationery", "Toys & Hobbies", "Automotive", "Other"];

const EMPTY = {
    last_name: "", first_name: "", middle_initial: "",
    sex: "", email: "", phone: "", birthday: "",
    province: "", municipality: "", barangay: "",
    street: "", house_number: "",
    business_name: "", line_of_business: "",
    password: "", password_confirmation: "",
    role: "seller",
};

function calcAge(birthday) {
    if (!birthday) return "";
    const today = new Date();
    const dob = new Date(birthday);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : "";
}

function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [validId, setValidId] = useState(null);
    const [businessPermit, setBusinessPermit] = useState(null);
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const municipalities = MUNICIPALITIES[form.province] || [];
    const barangays = BARANGAYS[form.municipality] || [];
    const age = calcAge(form.birthday);

    useEffect(() => {
        if (form.province) setForm((f) => ({ ...f, municipality: "", barangay: "" }));
    }, [form.province]);

    useEffect(() => {
        if (form.municipality) setForm((f) => ({ ...f, barangay: "" }));
    }, [form.municipality]);

    const set = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        setErrors((f) => ({ ...f, [name]: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setErrors({}); setLoading(true);
        try {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => data.append(k, v));
            if (validId) data.append("valid_id", validId);
            if (businessPermit) data.append("business_permit", businessPermit);
            await api.post("/register", data, { headers: { "Content-Type": "multipart/form-data" } });
            setSubmitted(true);
        } catch (err) {
            if (err.response?.status === 422) setErrors(err.response.data.errors || {});
            else setError(err.response?.data?.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="auth-root auth-root--wide" style={{ alignItems: "stretch" }}>
                <div className="auth-left" style={{ minHeight: "100vh" }}>
                    <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                    <div className="auth-left-body">
                        <h2>You're registered.</h2>
                        <p>Your application has been submitted and is under review.</p>
                    </div>
                    <span className="auth-left-copy">© 2026 Cryma</span>
                </div>
                <div className="auth-right">
                    <div className="auth-box" style={{ textAlign: "center" }}>
                        <div style={{
                            width: 72, height: 72, borderRadius: "50%",
                            background: "#e9f6ef", display: "flex",
                            alignItems: "center", justifyContent: "center",
                            margin: "0 auto 24px",
                        }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#27724d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f1f20", marginBottom: 10, letterSpacing: "-.02em" }}>Registration Submitted!</h1>
                        <p style={{ fontSize: 13, color: "#718180", lineHeight: 1.8, marginBottom: 32, maxWidth: 340, margin: "0 auto 32px" }}>
                            Your application is now under review. Once approved, you'll receive a confirmation at your registered email address.
                        </p>
                        <button className="auth-submit" onClick={() => navigate("/buyer-login")}>Go to Login</button>
                        <p style={{ marginTop: 16, fontSize: 12, color: "#9aa8a6" }}>This usually takes 1–2 business days.</p>
                    </div>
                </div>
            </div>
        );
    }

    const err = (name) => errors[name] && <span className="auth-err">{errors[name][0]}</span>;

    return (
        <div className="auth-root auth-root--wide" style={{ alignItems: "stretch" }}>
            <div className="auth-left">
                <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                <div className="auth-left-body">
                    <h2>Sell on CRYMA.</h2>
                    <p>Register your seller account and start reaching thousands of customers.</p>
                </div>
                <span className="auth-left-copy">© 2026 Cryma</span>
            </div>

            <div className="auth-right" style={{ alignItems: "flex-start", paddingTop: 40, paddingBottom: 40 }}>
                <div className="auth-box auth-box--wide">
                    <div className="auth-box-head">
                        <h1>Seller Registration</h1>
                        <p>Fill in all required fields to apply as a seller</p>
                    </div>

                    {error && <div className="auth-notice auth-notice--error">{error}</div>}

                    <form onSubmit={handleSubmit} className="auth-form">

                        {/* ── PERSONAL INFO ── */}
                        <div style={sectionStyle}>Personal Information</div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Last Name *</label>
                                <input name="last_name" value={form.last_name} onChange={set} placeholder="Dela Cruz" required />
                                {err("last_name")}
                            </div>
                            <div className="auth-field">
                                <label>First Name *</label>
                                <input name="first_name" value={form.first_name} onChange={set} placeholder="Juan" required />
                                {err("first_name")}
                            </div>
                            <div className="auth-field">
                                <label>Middle Initial <span className="auth-opt">(optional)</span></label>
                                <input name="middle_initial" value={form.middle_initial} onChange={set} placeholder="S." maxLength={3} />
                            </div>
                        </div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Sex *</label>
                                <select name="sex" value={form.sex} onChange={set} required>
                                    <option value="">Select sex</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                                {err("sex")}
                            </div>
                            <div className="auth-field">
                                <label>Birthday *</label>
                                <input name="birthday" type="date" value={form.birthday} onChange={set} required max={new Date().toISOString().split("T")[0]} />
                                {err("birthday")}
                            </div>
                            <div className="auth-field">
                                <label>Age</label>
                                <input value={age} readOnly placeholder="Auto-generated" style={{ background: "#f5f8f8", color: "#718180" }} />
                            </div>
                        </div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Email Address *</label>
                                <input name="email" type="email" value={form.email} onChange={set} placeholder="you@example.com" required />
                                {err("email")}
                            </div>
                            <div className="auth-field">
                                <label>Contact No. *</label>
                                <input name="phone" type="tel" value={form.phone} onChange={set} placeholder="+63 912 345 6789" required />
                                {err("phone")}
                            </div>
                        </div>

                        {/* ── ADDRESS ── */}
                        <div style={sectionStyle}>Address</div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Province *</label>
                                <select name="province" value={form.province} onChange={set} required>
                                    <option value="">Select province</option>
                                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                                </select>
                                {err("province")}
                            </div>
                            <div className="auth-field">
                                <label>Municipality / City *</label>
                                <select name="municipality" value={form.municipality} onChange={set} required disabled={!form.province}>
                                    <option value="">Select municipality</option>
                                    {municipalities.map((m) => <option key={m}>{m}</option>)}
                                </select>
                                {err("municipality")}
                            </div>
                            <div className="auth-field">
                                <label>Barangay *</label>
                                <select name="barangay" value={form.barangay} onChange={set} required disabled={!form.municipality}>
                                    <option value="">Select barangay</option>
                                    {barangays.map((b) => <option key={b}>{b}</option>)}
                                    {form.municipality && barangays.length === 0 && <option value={form.municipality + " Proper"}>{form.municipality} Proper</option>}
                                </select>
                                {err("barangay")}
                            </div>
                        </div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Street / Subdivision <span className="auth-opt">(optional)</span></label>
                                <input name="street" value={form.street} onChange={set} placeholder="e.g. Mabini St." />
                            </div>
                            <div className="auth-field">
                                <label>House / Unit No. <span className="auth-opt">(optional)</span></label>
                                <input name="house_number" value={form.house_number} onChange={set} placeholder="e.g. 123" />
                            </div>
                        </div>

                        {/* ── BUSINESS INFO ── */}
                        <div style={sectionStyle}>Business Information</div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Business Name <span className="auth-opt">(optional)</span></label>
                                <input name="business_name" value={form.business_name} onChange={set} placeholder="e.g. Juan's Store" />
                                {err("business_name")}
                            </div>
                            <div className="auth-field">
                                <label>Line of Business <span className="auth-opt">(optional)</span></label>
                                <select name="line_of_business" value={form.line_of_business} onChange={set}>
                                    <option value="">Select category</option>
                                    {LINES_OF_BUSINESS.map((l) => <option key={l}>{l}</option>)}
                                </select>
                                {err("line_of_business")}
                            </div>
                        </div>

                        {/* ── DOCUMENTS ── */}
                        <div style={sectionStyle}>Documents</div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Upload Valid ID *</label>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setValidId(e.target.files[0])} required />
                                <span className="auth-opt">JPG, PNG or PDF · max 5MB</span>
                                {err("valid_id")}
                            </div>
                            <div className="auth-field">
                                <label>Upload Business Permit <span className="auth-opt">(optional)</span></label>
                                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => setBusinessPermit(e.target.files[0])} />
                                <span className="auth-opt">JPG, PNG or PDF · max 5MB</span>
                                {err("business_permit")}
                            </div>
                        </div>

                        {/* ── PASSWORD ── */}
                        <div style={sectionStyle}>Account Security</div>

                        <div className="auth-row">
                            <div className="auth-field">
                                <label>Password *</label>
                                <div className="auth-pw-wrap">
                                    <input name="password" type={showPw ? "text" : "password"} value={form.password} onChange={set} placeholder="Min. 8 characters" required />
                                    <button type="button" className="auth-eye" onClick={() => setShowPw((v) => !v)}>
                                        {showPw
                                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        }
                                    </button>
                                </div>
                                {err("password")}
                            </div>
                            <div className="auth-field">
                                <label>Confirm Password *</label>
                                <div className="auth-pw-wrap">
                                    <input name="password_confirmation" type={showPw ? "text" : "password"} value={form.password_confirmation} onChange={set} placeholder="Repeat password" required />
                                </div>
                            </div>
                        </div>

                        <button className="auth-submit" type="submit" disabled={loading}>
                            {loading ? <span className="auth-spinner" /> : "Submit Registration"}
                        </button>
                    </form>

                    <p className="auth-switch">Already have an account? <Link to="/buyer-login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}

const sectionStyle = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "#638177",
    paddingBottom: 4,
    borderBottom: "1px solid #e0e8e7",
    marginTop: 4,
};

export default Register;
