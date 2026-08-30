import { useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./AccountSettings.css";

function AccountSettings() {
    const [user, setUser] = useState(null);

    const [profileForm, setProfileForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
    });

    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [profileMessage, setProfileMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [error, setError] = useState("");
    const [confirmationModal, setConfirmationModal] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                setProfileLoading(true);
                setError("");

                const response = await api.get("/user");

                const currentUser = response.data.user;

                setUser(currentUser);

                setProfileForm({
                    first_name: currentUser.first_name || "",
                    last_name: currentUser.last_name || "",
                    email: currentUser.email || "",
                });

                localStorage.setItem(
                    "user",
                    JSON.stringify(currentUser)
                );
            } catch (err) {
                console.error(
                    "Failed to load account:",
                    err
                );

                setError(
                    "Unable to load account information."
                );
            } finally {
                setProfileLoading(false);
            }
        };

        loadUser();
    }, []);

    const handleProfileChange = (e) => {
        setProfileForm({
            ...profileForm,
            [e.target.name]: e.target.value,
        });
    };

    const handlePasswordChange = (e) => {
        setPasswordForm({
            ...passwordForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleProfileSubmit = (e) => {
        e.preventDefault();

        setConfirmationModal("profile");
    };

    const saveProfile = async () => {

        try {
            setProfileSaving(true);
            setProfileMessage("");
            setError("");

            const response = await api.patch(
                `/admin/users/${user.id}`,
                {
                    first_name: profileForm.first_name,
                    last_name: profileForm.last_name,
                    email: profileForm.email,
                }
            );

            const updatedUser =
                response.data.user ||
                response.data.data ||
                {
                    ...user,
                    ...profileForm,
                };

            setUser(updatedUser);

            localStorage.setItem(
                "user",
                JSON.stringify(updatedUser)
            );

            setProfileMessage(
                "Account information updated successfully."
            );
        } catch (err) {
            console.error(
                "Failed to update account:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to update account information."
            );
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordSubmit = (e) => {
        e.preventDefault();

        setPasswordMessage("");
        setError("");

        if (
            !passwordForm.current_password ||
            !passwordForm.password ||
            !passwordForm.password_confirmation
        ) {
            setError(
                "Please complete all password fields."
            );
            return;
        }

        setConfirmationModal("password");
    };

    const savePassword = async () => {

        if (
            passwordForm.password !==
            passwordForm.password_confirmation
        ) {
            setError(
                "New password and confirmation do not match."
            );
            return;
        }

        try {
            setPasswordSaving(true);

            await api.patch(
                `/admin/users/${user.id}/password`,
                passwordForm
            );

            setPasswordForm({
                current_password: "",
                password: "",
                password_confirmation: "",
            });

            setPasswordMessage(
                "Password changed successfully."
            );
        } catch (err) {
            console.error(
                "Failed to change password:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to change password."
            );
        } finally {
            setPasswordSaving(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="account-settings-page">
                <div className="account-settings-loading">
                    Loading account settings...
                </div>
            </div>
        );
    }

    const confirmAction = async () => {
        const action = confirmationModal;
        setConfirmationModal(null);

        if (action === "profile") {
            await saveProfile();
        } else if (action === "password") {
            await savePassword();
        }
    };

    return (
        <div className="account-settings-page">

            {/* PAGE HEADER */}

            <section className="account-page-header">
                <span className="account-eyebrow">
                    ADMIN ACCOUNT
                </span>

                <h1>Account Settings</h1>

                <p>
                    Manage your administrator profile and
                    account security.
                </p>
            </section>

            {/* ERROR */}

            {error && (
                <div className="account-error">
                    {error}
                </div>
            )}

            {/* PROFILE */}

            <section className="account-card">

                <div className="account-card-header">
                    <div>
                        <span className="account-section-label">
                            PROFILE
                        </span>

                        <h2>Personal Information</h2>

                        <p>
                            Update the information associated
                            with your administrator account.
                        </p>
                    </div>

                    <div className="account-avatar">
                        {profileForm.first_name?.[0] || ""}
                        {profileForm.last_name?.[0] || ""}
                    </div>
                </div>

                <form
                    className="account-form"
                    onSubmit={handleProfileSubmit}
                >

                    <div className="account-form-row">

                        <div className="account-field">
                            <label>First Name</label>

                            <input
                                type="text"
                                name="first_name"
                                value={profileForm.first_name}
                                onChange={handleProfileChange}
                                required
                            />
                        </div>

                        <div className="account-field">
                            <label>Last Name</label>

                            <input
                                type="text"
                                name="last_name"
                                value={profileForm.last_name}
                                onChange={handleProfileChange}
                                required
                            />
                        </div>

                    </div>

                    <div className="account-field">
                        <label>Email Address</label>

                        <input
                            type="email"
                            name="email"
                            value={profileForm.email}
                            onChange={handleProfileChange}
                            required
                        />
                    </div>

                    {profileMessage && (
                        <div className="account-success">
                            {profileMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="account-submit"
                        disabled={profileSaving}
                    >
                        {profileSaving
                            ? "Saving..."
                            : "Save Changes"}
                    </button>

                </form>

            </section>

            {/* SECURITY */}

            <section className="account-card">

                <div className="account-card-header">
                    <div>
                        <span className="account-section-label">
                            SECURITY
                        </span>

                        <h2>Change Password</h2>

                        <p>
                            Keep your administrator account
                            secure by using a strong password.
                        </p>
                    </div>
                </div>

                <form
                    className="account-form"
                    onSubmit={handlePasswordSubmit}
                >

                    <div className="account-field">
                        <label>Current Password</label>

                        <input
                            type="password"
                            name="current_password"
                            value={
                                passwordForm.current_password
                            }
                            onChange={handlePasswordChange}
                            placeholder="Enter current password"
                            required
                        />
                    </div>

                    <div className="account-form-row">

                        <div className="account-field">
                            <label>New Password</label>

                            <input
                                type="password"
                                name="password"
                                value={
                                    passwordForm.password
                                }
                                onChange={handlePasswordChange}
                                placeholder="Enter new password"
                                required
                            />
                        </div>

                        <div className="account-field">
                            <label>Confirm Password</label>

                            <input
                                type="password"
                                name="password_confirmation"
                                value={
                                    passwordForm.password_confirmation
                                }
                                onChange={handlePasswordChange}
                                placeholder="Confirm new password"
                                required
                            />
                        </div>

                    </div>

                    {passwordMessage && (
                        <div className="account-success">
                            {passwordMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="account-submit"
                        disabled={passwordSaving}
                    >
                        {passwordSaving
                            ? "Updating..."
                            : "Change Password"}
                    </button>

                </form>

            </section>

            {/* ACCOUNT INFORMATION */}

            <section className="account-card">

                <div className="account-card-header">
                    <div>
                        <span className="account-section-label">
                            ACCOUNT
                        </span>

                        <h2>Account Information</h2>

                        <p>
                            Information about your current
                            administrator access.
                        </p>
                    </div>
                </div>

                <div className="account-info-grid">

                    <div className="account-info-item">
                        <span>Role</span>
                        <strong>
                            Administrator
                        </strong>
                    </div>

                    <div className="account-info-item">
                        <span>Status</span>
                        <strong className="account-status">
                            Active
                        </strong>
                    </div>

                    <div className="account-info-item">
                        <span>Email</span>
                        <strong>
                            {user?.email || "—"}
                        </strong>
                    </div>

                </div>

            </section>

            {confirmationModal && (
                <div className="account-modal-overlay" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !profileSaving && !passwordSaving) {
                        setConfirmationModal(null);
                    }
                }}>
                    <div className="account-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="account-confirmation-title">
                        <div className="account-confirmation-icon">!</div>
                        <h2 id="account-confirmation-title">
                            {confirmationModal === "password" ? "Change password?" : "Save profile changes?"}
                        </h2>
                        <p>
                            {confirmationModal === "password"
                                ? "Your administrator password will be updated."
                                : "Your administrator profile information will be updated."}
                        </p>
                        <div className="account-confirmation-actions">
                            <button type="button" className="account-confirm-cancel" onClick={() => setConfirmationModal(null)}>Cancel</button>
                            <button type="button" className="account-confirm-action" onClick={confirmAction}>
                                {confirmationModal === "password" ? "Change Password" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AccountSettings;
