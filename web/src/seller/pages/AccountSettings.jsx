import { useEffect, useState } from "react";
import api from "../../shared/services/api";
import { formatStatusLabel } from "../../shared/utils/statusLabel";

function SellerAccountSettings() {
    const [user, setUser] = useState(null);
    const [profileForm, setProfileForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
    const [storeNameRequest, setStoreNameRequest] = useState({ currentName: "", requested_name: "", status: null, reason: "" });
    const [requestName, setRequestName] = useState("");
    const [savingStoreName, setSavingStoreName] = useState(false);
    const [storeNameMessage, setStoreNameMessage] = useState("");
    const [storeNameError, setStoreNameError] = useState("");
    const [passwordForm, setPasswordForm] = useState({ current_password: "", password: "", password_confirmation: "" });
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([api.get("/user"), api.get("/seller/storefront")]).then(([userResponse, storeResponse]) => {
            const u = userResponse.data.user;
            const store = storeResponse.data.data;
            setUser(u);
            setProfileForm({ first_name: u.first_name || "", last_name: u.last_name || "", email: u.email || "", phone: u.phone || "" });
            setStoreNameRequest({ currentName: store.name || "", requested_name: store.name_change_request?.requested_name || "", status: store.name_change_request?.status || null, reason: store.name_change_request?.reason || "" });
        }).catch(() => setError("Unable to load account information."))
          .finally(() => setLoading(false));
    }, []);

    const setP = (e) => setProfileForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    const setPw = (e) => setPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const saveProfile = async (e) => {
        e.preventDefault();
        setError(""); setProfileMsg(""); setSavingProfile(true);
        try {
            await api.patch("/account/profile", {
                first_name: profileForm.first_name,
                last_name: profileForm.last_name,
                phone: profileForm.phone || null,
            });
            const updated = { ...user, ...profileForm };
            setUser(updated);
            localStorage.setItem("user", JSON.stringify(updated));
            setProfileMsg("Profile updated successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to update profile.");
        } finally { setSavingProfile(false); }
    };

    const submitStoreNameRequest = async (event) => {
        event.preventDefault();
        setStoreNameError("");
        setStoreNameMessage("");
        setSavingStoreName(true);
        try {
            const { data } = await api.post("/seller/storefront/name-change-request", { requested_name: requestName });
            setStoreNameRequest((current) => ({ ...current, requested_name: data.data.requested_name, status: data.data.status, reason: "" }));
            setRequestName("");
            setStoreNameMessage(data.message || "Your request has been sent to an admin.");
        } catch (err) {
            const validation = err.response?.data?.errors?.requested_name?.[0];
            setStoreNameError(validation || err.response?.data?.message || "Unable to submit your store name request.");
        } finally { setSavingStoreName(false); }
    };
    const savePassword = async (e) => {
        e.preventDefault();
        setError(""); setPasswordMsg("");
        if (passwordForm.password !== passwordForm.password_confirmation) {
            setError("Passwords do not match."); return;
        }
        setSavingPassword(true);
        try {
            await api.patch("/account/password", passwordForm);
            setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
            setPasswordMsg("Password changed successfully.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to change password.");
        } finally { setSavingPassword(false); }
    };

    if (loading) return <div className="sl-page"><p style={{ color: "#718180" }}>Loading…</p></div>;

    const initials = `${profileForm.first_name?.[0] ?? ""}${profileForm.last_name?.[0] ?? ""}`.toUpperCase();

    return (
        <div className="sl-page sl-account-settings">
            <div className="sl-page-head">
                <div>
                    <div className="sl-eyebrow">PROFILE</div>
                    <h1 className="sl-h1">Account Settings</h1>
                    <p>Manage your seller profile and account security.</p>
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--crimson)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
                    {initials}
                </div>
            </div>

            {error && <div className="auth-notice auth-notice--error" style={{ marginBottom: 20 }}>{error}</div>}

            {/* PROFILE */}
            <div className="sl-card sl-account-card sl-account-profile-card">
                <div className="sl-panel-head">
                    <div><h3>Personal Information</h3><p>Update your seller profile details</p></div>
                </div>
                <form className="sl-account-form" onSubmit={saveProfile}>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label htmlFor="seller-first-name">First Name</label>
                            <input id="seller-first-name" name="first_name" value={profileForm.first_name} onChange={setP} maxLength={30} required />
                        </div>
                        <div className="sl-field">
                            <label htmlFor="seller-last-name">Last Name</label>
                            <input id="seller-last-name" name="last_name" value={profileForm.last_name} onChange={setP} maxLength={30} required />
                        </div>
                    </div>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label htmlFor="seller-account-email">Email Address</label>
                            <input id="seller-account-email" name="email" type="email" value={profileForm.email} readOnly aria-describedby="seller-email-help" />
                            <small id="seller-email-help">Email changes require a separate verification flow.</small>
                        </div>
                        <div className="sl-field">
                            <label htmlFor="seller-account-phone">Contact No.</label>
                            <input id="seller-account-phone" name="phone" type="tel" value={profileForm.phone} onChange={setP} maxLength={13} placeholder="+639XXXXXXXXX" />
                        </div>
                    </div>
                    {profileMsg && <div className="auth-notice auth-notice--success" style={{ marginBottom: 12 }}>{profileMsg}</div>}
                    <button className="sl-btn-primary" type="submit" disabled={savingProfile}>
                        {savingProfile ? "Saving…" : "Save Changes"}
                    </button>
                </form>
            </div>

            <div className="sl-card sl-account-card">
                <div className="sl-panel-head"><div><h3>Store name change</h3><p>Store name changes are optional and require admin approval.</p></div></div>
                <form className="sl-account-form" onSubmit={submitStoreNameRequest}>
                    <div className="sl-form-row">
                        <div className="sl-field"><label>Current store name</label><input value={storeNameRequest.currentName} readOnly /></div>
                        <div className="sl-field"><label htmlFor="seller-requested-store-name">Requested store name</label><input id="seller-requested-store-name" value={requestName} onChange={(event) => setRequestName(event.target.value)} maxLength={100} minLength={2} required disabled={savingStoreName || storeNameRequest.status === "pending"} placeholder="Enter a new store name" /></div>
                    </div>
                    {storeNameRequest.status === "pending" && <p role="status">Request pending admin review: <strong>{storeNameRequest.requested_name}</strong></p>}
                    {storeNameRequest.status === "rejected" && <p role="status">Your previous request for <strong>{storeNameRequest.requested_name}</strong> was rejected.{storeNameRequest.reason ? ` Reason: ${storeNameRequest.reason}` : ""} You can submit a new request.</p>}
                    {storeNameRequest.status === "approved" && <p role="status">Your store name change was approved.</p>}
                    {storeNameError && <div className="auth-notice auth-notice--error" role="alert">{storeNameError}</div>}
                    {storeNameMessage && <div className="auth-notice auth-notice--success" role="status">{storeNameMessage}</div>}
                    <button className="sl-btn-primary" type="submit" disabled={savingStoreName || storeNameRequest.status === "pending"}>{savingStoreName ? "Sending request…" : "Request name change"}</button>
                </form>
            </div>
            {/* PASSWORD */}
            <div className="sl-card sl-account-card sl-account-password-card">
                <div className="sl-panel-head">
                    <div><h3>Change Password</h3><p>Keep your account secure</p></div>
                </div>
                <form className="sl-account-form" onSubmit={savePassword}>
                    <div className="sl-field sl-account-current-password">
                        <label>Current Password</label>
                        <input name="current_password" type="password" value={passwordForm.current_password} onChange={setPw} maxLength={128} required />
                    </div>
                    <div className="sl-form-row">
                        <div className="sl-field">
                            <label>New Password</label>
                            <input name="password" type="password" value={passwordForm.password} onChange={setPw} minLength={8} maxLength={128} required />
                        </div>
                        <div className="sl-field">
                            <label>Confirm Password</label>
                            <input name="password_confirmation" type="password" value={passwordForm.password_confirmation} onChange={setPw} minLength={8} maxLength={128} required />
                        </div>
                    </div>
                    {passwordMsg && <div className="auth-notice auth-notice--success" style={{ marginBottom: 12 }}>{passwordMsg}</div>}
                    <button className="sl-btn-primary" type="submit" disabled={savingPassword}>
                        {savingPassword ? "Updating…" : "Change Password"}
                    </button>
                </form>
            </div>

            {/* ACCOUNT INFO */}
            <div className="sl-card sl-account-card sl-account-info-card">
                <div className="sl-panel-head">
                    <div><h3>Account Information</h3></div>
                </div>
                <div className="sl-account-info-grid">
                    {[
                        { label: "Role", value: "Seller" },
                        { label: "Status", value: formatStatusLabel(user?.status, "—") },
                        { label: "Email", value: user?.email ?? "—" },
                    ].map(({ label, value }) => (
                        <div className="sl-account-info-item" key={label}>
                            <p className="sl-account-info-label">{label}</p>
                            <p className="sl-account-info-value">{value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SellerAccountSettings;
