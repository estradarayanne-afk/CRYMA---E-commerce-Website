import { useEffect, useState } from "react";
import api from "../../shared/services/api";

function SellerAccountSettings() {
    const [user, setUser] = useState(null);
    const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
    const [passwordForm, setPasswordForm] = useState({ current_password: "", password: "", password_confirmation: "" });
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/user").then((res) => {
            const u = res.data.user;
            setUser(u);
            setProfileForm({ first_name: u.first_name || "", last_name: u.last_name || "", email: u.email || "", phone: u.phone || "" });
        }).catch(() => setError("Unable to load account information."))
          .finally(() => setLoading(false));
    }, []);

    const setP = (e) => setProfileForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const setPw = (e) => setPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const saveProfile = async (e) => {
        e.preventDefault();
        setError(""); setProfileMsg(""); setSavingProfile(true);
        try {
            await api.patch(`/admin/users/${user.id}`, profileForm);
            const updated = { ...user, ...profileForm };
            setUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
            setProfileMsg("Profile updated successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to update profile.");
        } finally { setSavingProfile(false); }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        setError(""); setPasswordMsg("");
        if (passwordForm.password !== passwordForm.password_confirmation) {
            setError("Passwords do not match."); return;
        }
        setSavingPassword(true);
        try {
            await api.patch(`/admin/users/${user.id}/password`, passwordForm);
            setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
            setPasswordMsg("Password changed successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to change password.");
        } finally { setSavingPassword(false); }
    };

    if (loading) return <div className="sl-page"><p style={{ color: "#718180" }}>Loading…</p></div>;

    const initials = `${profileForm.first_name?.[0] ?? ""}${profileForm.last_name?.[0] ?? ""}`.toUpperCase();

    return (
        <div className="sl-page" style={{ maxWidth: 720 }}>
            <div className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">PROFILE</div>
                    <h1 className="sl-h1">Account Settings</h1>
                    <p>Manage your seller profile and account security.</p>
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                    {initials}
                </div>
            </div>

            {error && <div className="auth-notice auth-notice--error" style={{ marginBottom: 20 }}>{error}</div>}

            {/* PROFILE */}
            <div className="sl-card" style={{ marginBottom: 20 }}>
                <div className="sl-panel-head">
                    <div><h3>Personal Information</h3><p>Update your seller profile details</p></div>
                </div>
                <form onSubmit={saveProfile} style={{ padding: "20px 20px 24px" }}>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label>First Name</label>
                            <input name="first_name" value={profileForm.first_name} onChange={setP} required />
                        </div>
                        <div className="sl-field">
                            <label>Last Name</label>
                            <input name="last_name" value={profileForm.last_name} onChange={setP} required />
                        </div>
                    </div>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label>Email Address</label>
                            <input name="email" type="email" value={profileForm.email} onChange={setP} required />
                        </div>
                        <div className="sl-field">
                            <label>Contact No.</label>
                            <input name="phone" type="tel" value={profileForm.phone} onChange={setP} />
                        </div>
                    </div>
                    {profileMsg && <div className="auth-notice auth-notice--success" style={{ marginBottom: 12 }}>{profileMsg}</div>}
                    <button className="sl-btn-primary" type="submit" disabled={savingProfile}>
                        {savingProfile ? "Saving…" : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* PASSWORD */}
            <div className="sl-card" style={{ marginBottom: 20 }}>
                <div className="sl-panel-head">
                    <div><h3>Change Password</h3><p>Keep your account secure</p></div>
                </div>
                <form onSubmit={savePassword} style={{ padding: "20px 20px 24px" }}>
                    <div className="sl-field" style={{ marginBottom: 16 }}>
                        <label>Current Password</label>
                        <input name="current_password" type="password" value={passwordForm.current_password} onChange={setPw} required />
                    </div>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label>New Password</label>
                            <input name="password" type="password" value={passwordForm.password} onChange={setPw} required />
                        </div>
                        <div className="sl-field">
                            <label>Confirm Password</label>
                            <input name="password_confirmation" type="password" value={passwordForm.password_confirmation} onChange={setPw} required />
                        </div>
                    </div>
                    {passwordMsg && <div className="auth-notice auth-notice--success" style={{ marginBottom: 12 }}>{passwordMsg}</div>}
                    <button className="sl-btn-primary" type="submit" disabled={savingPassword}>
                        {savingPassword ? "Updating…" : "Change Password"}
                    </button>
                </form>
            </div>

            {/* ACCOUNT INFO */}
            <div className="sl-card">
                <div className="sl-panel-head">
                    <div><h3>Account Information</h3></div>
                </div>
                <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                    {[
                        { label: "Role", value: "Seller" },
                        { label: "Status", value: user?.status ?? "—" },
                        { label: "Email", value: user?.email ?? "—" },
                    ].map(({ label, value }) => (
                        <div key={label}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#718180", marginBottom: 4 }}>{label}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#2a3f3e" }}>{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SellerAccountSettings;
