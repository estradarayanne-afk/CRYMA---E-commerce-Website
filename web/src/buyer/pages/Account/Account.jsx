import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Home, KeyRound, LogOut, Mail, Pencil, Phone, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import BuyerAddressForm from "../../components/BuyerAddressForm";
import { normalizeAccountMobile, validatePassword, validateProfile, validateProfileImage } from "./accountValidation";
import { normalizeBuyerAddress, validateBuyerAddress } from "./addressValidation";
import "./Account.css";

const blankAddress = {
    label: "home", recipient_name: "", phone: "", is_default: false,
    region: "", province: "", municipality: "", barangay: "", street: "",
    house_number: "", building_name: "", unit_number: "", postal_code: "",
};

function responseMessage(error, fallback) {
    const errors = error.response?.data?.errors;
    return errors ? Object.values(errors).flat()[0] : error.response?.data?.message || fallback;
}

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
    const [profile, setProfile] = useState(user || {});
    const [profileDraft, setProfileDraft] = useState({
        first_name: user?.first_name || "", middle_name: user?.middle_name || "",
        last_name: user?.last_name || "", phone: user?.phone || "",
    });
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileFeedback, setProfileFeedback] = useState("");
    const [profileError, setProfileError] = useState("");
    const [profileErrors, setProfileErrors] = useState({});
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState("");
    const [profileImagePreview, setProfileImagePreview] = useState("");
    const profileSubmitLock = useRef(false);
    const passwordSubmitLock = useRef(false);
    const profileImagePreviewRef = useRef(null);
    const profileImageUrlRef = useRef(null);
    const [passwordDraft, setPasswordDraft] = useState({ current_password: "", password: "", password_confirmation: "" });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordVisibility, setPasswordVisibility] = useState({
        current_password: false,
        password: false,
        password_confirmation: false,
    });
    const [addresses, setAddresses] = useState([]);
    const [addressDraft, setAddressDraft] = useState(blankAddress);
    const [addressEditingId, setAddressEditingId] = useState(null);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [addressDeleteTarget, setAddressDeleteTarget] = useState(null);
    const [addressLoading, setAddressLoading] = useState(true);
    const [addressSaving, setAddressSaving] = useState(false);
    const [addressActionSaving, setAddressActionSaving] = useState(false);
    const [addressErrors, setAddressErrors] = useState({});
    const [addressError, setAddressError] = useState("");
    const [addressFeedback, setAddressFeedback] = useState("");
    const addressSubmitLock = useRef(false);
    const addressActionLock = useRef(false);
    const [activeSection, setActiveSection] = useState("overview");

    const clearProfileImagePreview = useCallback(() => {
        if (profileImagePreviewRef.current) {
            URL.revokeObjectURL(profileImagePreviewRef.current);
            profileImagePreviewRef.current = null;
        }
        setProfileImagePreview("");
        setProfileImageFile(null);
    }, []);

    const closeProfileEdit = useCallback(() => {
        if (profileSubmitLock.current) return;
        setEditingProfile(false);
        setProfileError("");
        setProfileErrors({});
        clearProfileImagePreview();
    }, [clearProfileImagePreview]);

    useEffect(() => {
        if (!token || user?.role !== "buyer") return undefined;
        let cancelled = false;
        api.get("/buyer/addresses")
            .then(({ data }) => {
                if (!cancelled) {
                    const loadedAddresses = Array.isArray(data?.data) ? data.data : [];
                    setAddresses(loadedAddresses);
                    setAddressError("");
                }
            })
            .catch((error) => {
                if (!cancelled) setAddressError(responseMessage(error, "Unable to load saved addresses."));
            })
            .finally(() => {
                if (!cancelled) setAddressLoading(false);
            });
        return () => { cancelled = true; };
    }, [token, user?.role]);

    useEffect(() => {
        if (!token || user?.role !== "buyer") return undefined;
        let cancelled = false;
        api.get("/account/profile-image", { responseType: "blob" })
            .then(({ data }) => {
                if (!cancelled) {
                    const imageUrl = URL.createObjectURL(data);
                    profileImageUrlRef.current = imageUrl;
                    setProfileImageUrl(imageUrl);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
            if (profileImageUrlRef.current) {
                URL.revokeObjectURL(profileImageUrlRef.current);
                profileImageUrlRef.current = null;
            }
            if (profileImagePreviewRef.current) {
                URL.revokeObjectURL(profileImagePreviewRef.current);
                profileImagePreviewRef.current = null;
            }
        };
    }, [token, user?.role]);

    useEffect(() => {
        if (!showLogout) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape" && !loggingOut) {
                setShowLogout(false);
            }
        };

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [showLogout, loggingOut]);

    useEffect(() => {
        if (!editingProfile) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === "Escape" && !profileSaving) closeProfileEdit();
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [editingProfile, profileSaving, closeProfileEdit]);

    useEffect(() => {
        if (!addressModalOpen) return undefined;
        const closeOnEscape = (event) => {
            if (event.key === "Escape" && !addressSaving) setAddressModalOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [addressModalOpen, addressSaving]);

    if (!token || !user || user.role !== "buyer") {
        return <Navigate to="/login" replace />;
    }

    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    const initials =
        `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
    const displayName =
        [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ") || "Buyer";

    const startProfileEdit = () => {
        clearProfileImagePreview();
        setProfileDraft({
            first_name: profile.first_name || "",
            middle_name: profile.middle_name || "",
            last_name: profile.last_name || "",
            phone: profile.phone || "",
        });
        setActiveSection("profile");
        setEditingProfile(true);
        setProfileError("");
        setProfileErrors({});
        setProfileFeedback("");
    };

    const chooseProfileImage = (event) => {
        const file = event.target.files?.[0] || null;
        const imageError = validateProfileImage(file);
        if (imageError) {
            event.target.value = "";
            setProfileErrors((current) => ({ ...current, profile_image: imageError }));
            clearProfileImagePreview();
            return;
        }

        if (profileImagePreviewRef.current) {
            URL.revokeObjectURL(profileImagePreviewRef.current);
            profileImagePreviewRef.current = null;
        }
        setProfileErrors((current) => {
            return Object.fromEntries(
                Object.entries(current).filter(([field]) => field !== "profile_image")
            );
        });
        setProfileImageFile(file);
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            profileImagePreviewRef.current = previewUrl;
            setProfileImagePreview(previewUrl);
        } else {
            setProfileImagePreview("");
        }
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        if (profileSubmitLock.current) return;
        const validationErrors = validateProfile(profileDraft);
        if (Object.keys(validationErrors).length) {
            setProfileErrors(validationErrors);
            setProfileError("");
            return;
        }

        profileSubmitLock.current = true;
        setProfileSaving(true);
        setProfileError("");
        setProfileErrors({});
        setProfileFeedback("");
        try {
            const payload = new FormData();
            payload.append("first_name", profileDraft.first_name);
            payload.append("middle_name", profileDraft.middle_name);
            payload.append("last_name", profileDraft.last_name);
            payload.append("phone", normalizeAccountMobile(profileDraft.phone));
            if (profileImageFile) payload.append("profile_image", profileImageFile);
            payload.append("_method", "PATCH");
            const { data } = await api.post("/account/profile", payload);
            const next = { ...profile, ...data.data };
            setProfile(next);
            localStorage.setItem("user", JSON.stringify({ ...user, ...data.data }));
            window.dispatchEvent(new Event("cryma-user-updated"));
            if (profileImageFile && profileImagePreviewRef.current) {
                if (profileImageUrlRef.current) URL.revokeObjectURL(profileImageUrlRef.current);
                profileImageUrlRef.current = profileImagePreviewRef.current;
                setProfileImageUrl(profileImagePreviewRef.current);
                profileImagePreviewRef.current = null;
            }
            setProfileImagePreview("");
            setProfileImageFile(null);
            setEditingProfile(false);
            setProfileFeedback(data.message || "Your personal information was updated.");
        } catch (error) {
            const serverErrors = error.response?.data?.errors;
            if (serverErrors) {
                setProfileErrors(Object.fromEntries(
                    Object.entries(serverErrors).map(([field, messages]) => [field, messages[0]])
                ));
            } else {
                setProfileError(responseMessage(error, "Unable to update your profile."));
            }
        } finally {
            profileSubmitLock.current = false;
            setProfileSaving(false);
        }
    };

    const changePassword = async (event) => {
        event.preventDefault();
        if (passwordSubmitLock.current) return;
        const validationErrors = validatePassword(passwordDraft);
        if (Object.keys(validationErrors).length) {
            setPasswordErrors(validationErrors);
            setPasswordError("");
            return;
        }

        passwordSubmitLock.current = true;
        setPasswordSaving(true);
        setPasswordError("");
        setPasswordErrors({});
        setPasswordFeedback("");
        try {
            const { data } = await api.patch("/account/password", passwordDraft);
            setPasswordDraft({ current_password: "", password: "", password_confirmation: "" });
            setPasswordErrors({});
            setPasswordFeedback(data.message || "Password changed successfully.");
        } catch (error) {
            const serverErrors = error.response?.data?.errors;
            if (serverErrors) {
                setPasswordErrors(Object.fromEntries(
                    Object.entries(serverErrors).map(([field, messages]) => [field, messages[0]])
                ));
            } else if (error.response?.data?.message === "The current password is incorrect.") {
                setPasswordErrors({ current_password: error.response.data.message });
            } else {
                setPasswordError(responseMessage(error, "Unable to change your password."));
            }
        } finally {
            passwordSubmitLock.current = false;
            setPasswordSaving(false);
        }
    };

    const saveAddress = async (event) => {
        event.preventDefault();
        if (addressSubmitLock.current) return;
        const validationErrors = validateBuyerAddress(addressDraft);
        setAddressErrors(validationErrors);
        setAddressError("");
        setAddressFeedback("");
        if (Object.keys(validationErrors).length) return;

        addressSubmitLock.current = true;
        setAddressSaving(true);
        try {
            const payload = normalizeBuyerAddress(addressDraft);
            const response = addressEditingId
                ? await api.patch(`/buyer/addresses/${addressEditingId}`, payload)
                : await api.post("/buyer/addresses", payload);
            const savedAddress = response.data.data;
            setAddresses((current) => {
                const next = addressEditingId
                    ? current.map((item) => item.id === addressEditingId ? savedAddress : item)
                    : [savedAddress, ...current];
                return savedAddress.is_default
                    ? next.map((item) => ({ ...item, is_default: item.id === savedAddress.id }))
                    : next;
            });
            setAddressDraft(blankAddress); setAddressEditingId(null);
            setAddressModalOpen(false);
            setAddressErrors({});
            setAddressFeedback(response.data.message || "Address saved.");
        } catch (error) {
            const serverErrors = error.response?.data?.errors;
            if (serverErrors) {
                setAddressErrors(Object.fromEntries(
                    Object.entries(serverErrors).map(([field, messages]) => [field, messages[0]])
                ));
            } else {
                setAddressError(responseMessage(error, "Unable to save this address."));
            }
        } finally {
            addressSubmitLock.current = false;
            setAddressSaving(false);
        }
    };

    const removeAddress = async (address) => {
        if (addressActionLock.current) return;
        addressActionLock.current = true;
        setAddressActionSaving(true);
        setAddressError(""); setAddressFeedback("");
        try {
            const { data } = await api.delete(`/buyer/addresses/${address.id}`);
            setAddresses((current) => {
                const remaining = current.filter((item) => item.id !== address.id);
                if (!address.is_default || !remaining.length) return remaining;
                const replacement = remaining[0];
                return remaining.map((item) => ({ ...item, is_default: item.id === replacement.id }));
            });
            setAddressDeleteTarget(null);
            setAddressFeedback(data.message || "Address deleted.");
        } catch (error) {
            setAddressError(responseMessage(error, "Unable to delete this address."));
        } finally {
            addressActionLock.current = false;
            setAddressActionSaving(false);
        }
    };

    const editAddress = (address) => {
        setAddressDraft({ ...blankAddress, ...address, is_default: Boolean(address.is_default) });
        setAddressEditingId(address.id);
        setAddressModalOpen(true);
        setAddressErrors({});
        setAddressError("");
        setAddressFeedback("");
    };

    const addAddress = () => {
        setAddressDraft({
            ...blankAddress,
            recipient_name: displayName,
            phone: profile.phone || "",
            is_default: addresses.length === 0,
        });
        setAddressEditingId(null);
        setAddressModalOpen(true);
        setAddressErrors({});
        setAddressError("");
        setAddressFeedback("");
    };

    const setDefaultAddress = async (address) => {
        if (addressActionLock.current || address.is_default) return;
        addressActionLock.current = true;
        setAddressActionSaving(true);
        setAddressError("");
        setAddressFeedback("");
        try {
            const { data } = await api.patch(`/buyer/addresses/${address.id}/default`);
            setAddresses((current) => current.map((item) => ({
                ...item,
                is_default: item.id === data.data.id,
            })));
            setAddressFeedback(data.message || "Default address updated.");
        } catch (error) {
            setAddressError(responseMessage(error, "Unable to update your default address."));
        } finally {
            addressActionLock.current = false;
            setAddressActionSaving(false);
        }
    };

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
            localStorage.removeItem("cryma_wishlist");
            localStorage.removeItem("cryma_selected_cart_ids");
            localStorage.removeItem("cryma_checkout_item_ids");

            window.dispatchEvent(new Event("cryma-cart-updated"));
            window.dispatchEvent(new Event("cryma-wishlist-updated"));
            navigate("/login", { replace: true });
        }
    };

    return (
        <main className="account-page">
            <section className="account-container">
                <header className="account-hero">
                    <div className="account-avatar-large">
                        {profileImagePreview || profileImageUrl ? (
                            <img src={profileImagePreview || profileImageUrl} alt="Your profile" />
                        ) : initials}
                    </div>
                    <div className="account-hero-copy">
                        <p className="account-eyebrow">MY ACCOUNT</p>
                        <h1>{displayName}</h1>
                        <p>{profile.email || "Manage your CRYMA buyer account."}</p>
                    </div>
                    <button type="button" className="account-edit-button account-hero-edit" onClick={startProfileEdit}>
                        <Pencil size={15} />
                        Edit profile
                    </button>
                </header>

                <nav className="account-section-nav" aria-label="Account sections">
                    {[
                        { id: "overview", label: "Overview", icon: UserRound },
                        { id: "profile", label: "Profile", icon: Pencil },
                        { id: "addresses", label: "Addresses", icon: Home },
                        { id: "security", label: "Security", icon: KeyRound },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            aria-current={activeSection === id ? "page" : undefined}
                            className={activeSection === id ? "active" : ""}
                            onClick={() => setActiveSection(id)}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="account-section-content">
                    {activeSection === "overview" && (
                        <div className="account-overview-grid">
                            <section className="account-card">
                                <div className="account-card-heading">
                                    <div className="account-heading-icon"><UserRound size={17} /></div>
                                    <div><p className="account-eyebrow">YOUR PROFILE</p><h2>Personal information</h2></div>
                                    <button type="button" className="account-text-action" onClick={startProfileEdit}>
                                        Edit profile <Pencil size={14} />
                                    </button>
                                </div>
                                <div className="account-info-list">
                                    <div className="account-info-row">
                                        <div className="account-info-label"><UserRound size={15} /><span>Name</span></div>
                                        <strong>{displayName}</strong>
                                    </div>
                                    <div className="account-info-row">
                                        <div className="account-info-label"><Mail size={15} /><span>Email</span></div>
                                        <strong>{profile.email || "Not provided"}</strong>
                                    </div>
                                    <div className="account-info-row">
                                        <div className="account-info-label"><Phone size={15} /><span>Mobile number</span></div>
                                        <strong>{profile.phone || "Not provided"}</strong>
                                    </div>
                                </div>
                                {profileFeedback && <p className="account-form-success" role="status">{profileFeedback}</p>}
                            </section>

                            <section className="account-card account-overview-security">
                                <div className="account-card-heading">
                                    <div className="account-heading-icon"><ShieldCheck size={17} /></div>
                                    <div><p className="account-eyebrow">ACCOUNT STATUS</p><h2>Your CRYMA account</h2></div>
                                </div>
                                <div className="account-security-status">
                                    <span className="account-security-dot" />
                                    <div><strong>Active buyer account</strong><small>Signed in and ready to shop</small></div>
                                </div>
                                <button type="button" className="account-secondary-link" onClick={() => setActiveSection("security")}>
                                    <KeyRound size={15} /> Manage password
                                </button>
                            </section>
                        </div>
                    )}

                    {activeSection === "profile" && (
                        <section className="account-card">
                            <div className="account-card-heading">
                                <div className="account-heading-icon"><UserRound size={17} /></div>
                                <div><p className="account-eyebrow">PROFILE DETAILS</p><h2>Personal information</h2></div>
                                <button type="button" className="account-edit-button" onClick={startProfileEdit}>
                                    <Pencil size={15} /> Edit profile
                                </button>
                            </div>
                            <div className="account-info-list">
                                <div className="account-info-row"><div className="account-info-label"><UserRound size={15} /><span>Full name</span></div><strong>{displayName}</strong></div>
                                <div className="account-info-row"><div className="account-info-label"><Mail size={15} /><span>Email address</span></div><strong>{profile.email || "Not provided"}</strong></div>
                                <div className="account-info-row"><div className="account-info-label"><Phone size={15} /><span>Phone number</span></div><strong>{profile.phone || "Not provided"}</strong></div>
                                <div className="account-info-row"><div className="account-info-label"><ShieldCheck size={15} /><span>Account type</span></div><strong>Buyer</strong></div>
                            </div>
                            {profileFeedback && <p className="account-form-success" role="status">{profileFeedback}</p>}
                        </section>
                    )}

                    {activeSection === "addresses" && (
                        <section className="account-card account-address-card">
                            <div className="account-card-heading">
                                <div className="account-heading-icon"><Home size={17} /></div>
                                <div><p className="account-eyebrow">DELIVERY DETAILS</p><h2>Saved addresses</h2></div>
                                <button type="button" className="account-edit-button account-address-add" onClick={addAddress}>
                                    <Plus size={15} /> Add address
                                </button>
                            </div>
                            <p className="account-address-note">Manage the delivery addresses saved to your buyer account.</p>
                            {addressLoading ? (
                                <p className="account-address-note" role="status">Loading your saved addresses…</p>
                            ) : addresses.length ? (
                                <ul className="account-address-list">
                                    {addresses.map((address) => (
                                        <li key={address.id} className="account-address-item">
                                            <div className="account-address-details">
                                                <div className="account-address-card-title">
                                                    <strong>{address.label ? address.label[0].toUpperCase() + address.label.slice(1) : "Address"}</strong>
                                                    {address.is_default && <span className="account-address-default-badge">Default</span>}
                                                </div>
                                                <strong>{address.recipient_name || displayName}</strong>
                                                <span>{address.phone || profile.phone || "No contact number"}</span>
                                                <p>{[address.house_number, address.building_name, address.unit_number, address.street, address.barangay, address.municipality, address.province, address.region, address.postal_code].filter(Boolean).join(", ")}</p>
                                            </div>
                                            <div className="account-address-actions">
                                                {!address.is_default && <button type="button" disabled={addressActionSaving} onClick={() => setDefaultAddress(address)}><ShieldCheck size={14} /> Set as default</button>}
                                                <button type="button" onClick={() => editAddress(address)} aria-label="Edit address"><Pencil size={15} /> Edit</button>
                                                <button type="button" disabled={addressActionSaving} onClick={() => setAddressDeleteTarget(address)} aria-label="Delete address"><Trash2 size={15} /> Delete</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : !addressError ? <p className="account-address-note">No saved addresses yet. Add one to make checkout faster.</p> : null}
                            {addressError && <p className="account-form-error" role="alert">{addressError}</p>}
                            {addressFeedback && <p className="account-form-success" role="status">{addressFeedback}</p>}
                        </section>
                    )}

                    {addressModalOpen && (
                        <div className="account-profile-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !addressSaving) setAddressModalOpen(false); }}>
                            <section className="account-profile-modal account-address-modal" role="dialog" aria-modal="true" aria-labelledby="account-address-modal-title">
                                <header className="account-profile-modal-header">
                                    <div>
                                        <p className="account-eyebrow">DELIVERY DETAILS</p>
                                        <h2 id="account-address-modal-title">{addressEditingId ? "Edit address" : "Add a delivery address"}</h2>
                                        <p>Choose a supported Philippine location and enter the recipient details.</p>
                                    </div>
                                    <button type="button" className="account-modal-close" aria-label="Close address form" onClick={() => { if (!addressSaving) setAddressModalOpen(false); }}><X size={18} /></button>
                                </header>
                                <form className="account-address-modal-form" onSubmit={saveAddress} noValidate>
                                    <BuyerAddressForm address={addressDraft} errors={addressErrors} onChange={setAddressDraft} disabled={addressSaving} />
                                    {addressError && <p className="account-form-error" role="alert">{addressError}</p>}
                                    <div className="account-profile-modal-actions">
                                        <button type="button" className="account-cancel-button" disabled={addressSaving} onClick={() => setAddressModalOpen(false)}>Cancel</button>
                                        <button type="submit" className="account-save-button" disabled={addressSaving}>
                                            {addressSaving ? "Saving…" : addressEditingId ? "Save changes" : "Save address"}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>
                    )}

                    {addressDeleteTarget && (
                        <div className="account-modal-backdrop">
                            <section className="account-logout-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-address-title">
                                <div className="account-modal-icon"><Trash2 size={18} /></div>
                                <h3 id="delete-address-title">Delete this address?</h3>
                                <p>This removes it from your address book. Previously placed orders keep their delivery details.</p>
                                {addressError && <p className="account-form-error" role="alert">{addressError}</p>}
                                <div className="account-modal-actions">
                                    <button type="button" className="account-modal-cancel" disabled={addressActionSaving} onClick={() => { setAddressDeleteTarget(null); setAddressError(""); }}>Keep address</button>
                                    <button type="button" className="account-modal-confirm" disabled={addressActionSaving} onClick={() => removeAddress(addressDeleteTarget)}>{addressActionSaving ? "Deleting…" : "Delete address"}</button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeSection === "security" && (
                        <div className="account-security-layout">
                            <section className="account-card account-password-card">
                                <div className="account-card-heading">
                                    <div className="account-heading-icon"><KeyRound size={17} /></div>
                                    <div><p className="account-eyebrow">ACCOUNT SECURITY</p><h2>Change password</h2></div>
                                </div>
                                <p className="account-address-note">Choose a strong password you don't use elsewhere.</p>
                                <p className="account-password-policy">Password must contain 8–128 characters. There are no additional character-type requirements.</p>
                                <form className="account-form-grid" onSubmit={changePassword} noValidate>
                                    {[
                                        ["current_password", "Current password", "current-password"],
                                        ["password", "New password", "new-password"],
                                        ["password_confirmation", "Confirm new password", "new-password"],
                                    ].map(([field, label, autoComplete]) => (
                                        <label key={field}>
                                            {label}
                                            <span className="account-password-input">
                                                <input
                                                    id={`account-${field}`}
                                                    type={passwordVisibility[field] ? "text" : "password"}
                                                    required
                                                    maxLength={128}
                                                    autoComplete={autoComplete}
                                                    value={passwordDraft[field]}
                                                    aria-invalid={Boolean(passwordErrors[field])}
                                                    aria-describedby={passwordErrors[field] ? `account-${field}-error` : undefined}
                                                    disabled={passwordSaving}
                                                    onChange={(event) => {
                                                        setPasswordDraft((current) => ({ ...current, [field]: event.target.value }));
                                                        setPasswordErrors((current) => ({ ...current, [field]: "" }));
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    className="account-password-toggle"
                                                    aria-label={`${passwordVisibility[field] ? "Hide" : "Show"} ${label.toLowerCase()}`}
                                                    aria-pressed={passwordVisibility[field]}
                                                    onClick={() => setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }))}
                                                >
                                                    {passwordVisibility[field] ? <EyeOff size={17} /> : <Eye size={17} />}
                                                </button>
                                            </span>
                                            {passwordErrors[field] && <small className="account-field-error" id={`account-${field}-error`} role="alert">{passwordErrors[field]}</small>}
                                        </label>
                                    ))}
                                    {passwordError && <p className="account-form-error" role="alert">{passwordError}</p>}
                                    {passwordFeedback && <p className="account-form-success" role="status">{passwordFeedback}</p>}
                                    <div className="account-form-actions"><button type="submit" className="account-save-button" disabled={passwordSaving}>{passwordSaving ? "Updating…" : "Update password"}</button></div>
                                </form>
                            </section>
                            <section className="account-card account-actions-card">
                                <p className="account-eyebrow">SESSION</p>
                                <h2>Sign out</h2>
                                <p>End your current CRYMA session on this device.</p>
                                <button type="button" className="account-logout-button" onClick={() => setShowLogout(true)}><LogOut size={15} /> Log out</button>
                            </section>
                        </div>
                    )}

                </div>
            </section>

            {editingProfile && (
                <div
                    className="account-profile-modal-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !profileSaving) closeProfileEdit();
                    }}
                >
                    <section
                        className="account-profile-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-profile-modal-title"
                    >
                        <header className="account-profile-modal-header">
                            <div>
                                <p className="account-eyebrow">MY ACCOUNT</p>
                                <h2 id="account-profile-modal-title">Edit profile</h2>
                                <p>Update the personal details used for your buyer account.</p>
                            </div>
                            <button type="button" className="account-modal-close" onClick={closeProfileEdit} disabled={profileSaving} aria-label="Close profile editor">
                                <X size={20} />
                            </button>
                        </header>
                        <form className="account-profile-form" onSubmit={saveProfile} noValidate>
                            <div className="account-profile-image-control">
                                <div className="account-profile-image-preview">
                                    {profileImagePreview || profileImageUrl
                                        ? <img src={profileImagePreview || profileImageUrl} alt="Profile preview" />
                                        : initials}
                                </div>
                                <div className="account-profile-image-copy">
                                    <strong>Profile picture</strong>
                                    <span>JPG, PNG, or WebP · maximum 2 MB</span>
                                    <div className="account-image-actions">
                                        <label className="account-file-button">
                                            {profileImageFile ? "Choose a different photo" : "Choose photo"}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                aria-label="Choose profile picture"
                                                disabled={profileSaving}
                                                onChange={chooseProfileImage}
                                            />
                                        </label>
                                        {profileImageFile && (
                                            <button type="button" className="account-image-remove" onClick={clearProfileImagePreview} disabled={profileSaving}>
                                                Remove selection
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {profileErrors.profile_image && <p className="account-field-error" role="alert">{profileErrors.profile_image}</p>}
                            <div className="account-profile-fields">
                                {[
                                    ["first_name", "First name", "e.g. Ana María", true],
                                    ["middle_name", "Middle name or initial", "Optional", false],
                                    ["last_name", "Last name", "e.g. Dela Cruz", true],
                                    ["phone", "Mobile number", "09XXXXXXXXX or +639XXXXXXXXX", false],
                                ].map(([field, label, placeholder, required]) => (
                                    <label className={field === "phone" ? "account-profile-phone-field" : ""} key={field} htmlFor={`account-profile-${field}`}>
                                        {label}{required && <span aria-hidden="true"> *</span>}
                                        <input
                                            id={`account-profile-${field}`}
                                            type={field === "phone" ? "tel" : "text"}
                                            value={profileDraft[field]}
                                            placeholder={placeholder}
                                            required={required}
                                            maxLength={field === "phone" ? 20 : 30}
                                            autoComplete={{
                                                first_name: "given-name",
                                                middle_name: "additional-name",
                                                last_name: "family-name",
                                                phone: "tel",
                                            }[field]}
                                            aria-invalid={Boolean(profileErrors[field])}
                                            aria-describedby={profileErrors[field] ? `account-profile-${field}-error` : field === "phone" ? "account-profile-phone-help" : undefined}
                                            disabled={profileSaving}
                                            autoFocus={field === "first_name"}
                                            onChange={(event) => {
                                                setProfileDraft((current) => ({ ...current, [field]: event.target.value }));
                                                setProfileErrors((current) => ({ ...current, [field]: "" }));
                                                setProfileError("");
                                            }}
                                        />
                                        {field === "phone" && <small id="account-profile-phone-help">You can enter a local 09 number, a 9-digit subscriber number, or an international +63 number. Saved numbers use +63 format.</small>}
                                        {profileErrors[field] && <small className="account-field-error" id={`account-profile-${field}-error`} role="alert">{profileErrors[field]}</small>}
                                    </label>
                                ))}
                            </div>
                            {profileError && <p className="account-form-error" role="alert">{profileError}</p>}
                            <footer className="account-profile-modal-actions">
                                <button type="button" className="account-cancel-button" disabled={profileSaving} onClick={closeProfileEdit}>Cancel</button>
                                <button type="submit" className="account-save-button" disabled={profileSaving}>
                                    {profileSaving ? "Saving…" : "Save changes"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}

            {showLogout && (
                <div
                    className="account-modal-backdrop"
                    onClick={() => !loggingOut && setShowLogout(false)}
                >
                    <div
                        className="account-logout-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-logout-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="account-modal-icon">
                            <LogOut size={18} />
                        </div>

                        <h3 id="account-logout-title">Log out of CRYMA?</h3>
                        <p>
                            You'll need to sign in again to access your buyer
                            account.
                        </p>

                        <div className="account-modal-actions">
                            <button
                                type="button"
                                className="account-modal-cancel"
                                disabled={loggingOut}
                                autoFocus
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
