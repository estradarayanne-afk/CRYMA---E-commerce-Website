import { useState } from "react";
import { LogOut, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import "./Account.css";

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function Account() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const user = getStoredUser();

    const [loggingOut, setLoggingOut] = useState(false);
    const [showLogout, setShowLogout] = useState(false);

    if (!token || !user || user.role !== "buyer") {
        return <Navigate to="/login" replace />;
    }

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Buyer";
    const initials =
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";

    const handleLogout = async () => {
        if (loggingOut) return;

        setLoggingOut(true);

        try {
            await api.post("/logout");
        } catch {
            // Clear local session even if the API request fails.
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("cryma_cart");
            localStorage.removeItem("cryma_selected_cart_ids");
            localStorage.removeItem("cryma_checkout_item_ids");

            window.dispatchEvent(new Event("cryma-cart-updated"));
            navigate("/login", { replace: true });
        }
    };

    return (
        <main className="account-page">
            <section className="account-container">
                <header className="account-hero">
                    <div className="account-avatar-large">
                        {initials}
                    </div>

                    <div className="account-hero-copy">
                        <p className="account-eyebrow">MY ACCOUNT</p>
                        <h1>{fullName}</h1>
                        <p>
                            Manage your personal information and account
                            settings.
                        </p>
                    </div>

                    <span className="account-active-badge">
                        <span />
                        Active
                    </span>
                </header>

                <div className="account-content">
                    <section className="account-card">
                        <div className="account-card-heading">
                            <div className="account-heading-icon">
                                <UserRound size={16} />
                            </div>

                            <div>
                                <p className="account-eyebrow">
                                    PROFILE DETAILS
                                </p>
                                <h2>Personal information</h2>
                            </div>
                        </div>

                        <div className="account-info-list">
                            <div className="account-info-row">
                                <div className="account-info-label">
                                    <UserRound size={14} />
                                    <span>Full name</span>
                                </div>
                                <strong>{fullName}</strong>
                            </div>

                            <div className="account-info-row">
                                <div className="account-info-label">
                                    <Mail size={14} />
                                    <span>Email address</span>
                                </div>
                                <strong>{user.email || "Not provided"}</strong>
                            </div>

                            <div className="account-info-row">
                                <div className="account-info-label">
                                    <Phone size={14} />
                                    <span>Phone number</span>
                                </div>
                                <strong>{user.phone || "Not provided"}</strong>
                            </div>

                            <div className="account-info-row">
                                <div className="account-info-label">
                                    <ShieldCheck size={14} />
                                    <span>Account type</span>
                                </div>
                                <strong>Buyer</strong>
                            </div>
                        </div>
                    </section>

                    <aside className="account-side">
                        <section className="account-card account-security-card">
                            <div className="account-card-heading">
                                <div className="account-heading-icon">
                                    <ShieldCheck size={16} />
                                </div>

                                <div>
                                    <p className="account-eyebrow">
                                        ACCOUNT SECURITY
                                    </p>
                                    <h2>Your account</h2>
                                </div>
                            </div>

                            <p className="account-security-text">
                                Your account is currently signed in and ready
                                for shopping.
                            </p>

                            <div className="account-security-status">
                                <span className="account-security-dot" />
                                <div>
                                    <strong>Account active</strong>
                                    <small>Buyer account</small>
                                </div>
                            </div>
                        </section>

                        <section className="account-card account-actions-card">
                            <p className="account-eyebrow">SESSION</p>
                            <h2>Sign out</h2>
                            <p>
                                End your current CRYMA session on this device.
                            </p>

                            <button
                                type="button"
                                className="account-logout-button"
                                onClick={() => setShowLogout(true)}
                            >
                                <LogOut size={15} />
                                Log out
                            </button>
                        </section>
                    </aside>
                </div>
            </section>

            {showLogout && (
                <div
                    className="account-modal-backdrop"
                    onClick={() => !loggingOut && setShowLogout(false)}
                >
                    <div
                        className="account-logout-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="account-modal-icon">
                            <LogOut size={18} />
                        </div>

                        <h3>Log out of CRYMA?</h3>
                        <p>
                            You'll need to sign in again to access your buyer
                            account.
                        </p>

                        <div className="account-modal-actions">
                            <button
                                type="button"
                                className="account-modal-cancel"
                                disabled={loggingOut}
                                onClick={() => setShowLogout(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="account-modal-confirm"
                                disabled={loggingOut}
                                onClick={handleLogout}
                            >
                                {loggingOut ? "Signing out..." : "Log out"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Account;