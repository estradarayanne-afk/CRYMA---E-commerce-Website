
import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Settings.css";

function Settings() {
    const [activeTab, setActiveTab] = useState("announcements");

    const [announcements, setAnnouncements] = useState([]);
    const [policies, setPolicies] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [announcementForm, setAnnouncementForm] = useState({
        title: "",
        message: "",
    });

    const [policyForm, setPolicyForm] = useState({
        title: "",
        content: "",
    });

    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [editingPolicy, setEditingPolicy] = useState(null);

    const [submitting, setSubmitting] = useState(false);
    const [confirmationModal, setConfirmationModal] = useState(null);

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [announcementResponse, policyResponse] =
                await Promise.all([
                    api.get("/admin/settings/announcements"),
                    api.get("/admin/settings/policies"),
                ]);

            setAnnouncements(
                announcementResponse.data.data || []
            );

            setPolicies(
                policyResponse.data.data || []
            );
        } catch (err) {
            console.error("Failed to load settings:", err);
            setError("Unable to load platform settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadSettings();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [loadSettings]);

    /*
    |--------------------------------------------------------------------------
    | ANNOUNCEMENTS
    |--------------------------------------------------------------------------
    */

    const handleAnnouncementSubmit = (e) => {
        e.preventDefault();

        if (
            !announcementForm.title.trim() ||
            !announcementForm.message.trim()
        ) {
            return;
        }

        setConfirmationModal({
            type: "announcement",
            action: editingAnnouncement ? "save" : "publish",
        });
    };

    const saveAnnouncement = async () => {

        try {
            setSubmitting(true);
            setError("");

            if (editingAnnouncement) {
                await api.patch(
                    `/admin/settings/announcements/${editingAnnouncement.id}`,
                    announcementForm
                );

                setEditingAnnouncement(null);
            } else {
                await api.post(
                    "/admin/settings/announcements",
                    announcementForm
                );
            }

            setAnnouncementForm({
                title: "",
                message: "",
            });

            await loadSettings();
        } catch (err) {
            console.error(
                "Failed to save announcement:",
                err
            );

            setError(
                editingAnnouncement
                    ? "Unable to update announcement."
                    : "Unable to publish announcement."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditAnnouncement = (announcement) => {
        setEditingAnnouncement(announcement);

        setAnnouncementForm({
            title: announcement.title,
            message: announcement.message,
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleCancelAnnouncementEdit = () => {
        setEditingAnnouncement(null);

        setAnnouncementForm({
            title: "",
            message: "",
        });
    };

    const handleDeleteAnnouncement = (id) => {
        setConfirmationModal({
            type: "announcement",
            action: "delete",
            id,
        });
    };

    const deleteAnnouncement = async (id) => {

        try {
            setError("");

            await api.delete(
                `/admin/settings/announcements/${id}`
            );

            if (
                editingAnnouncement &&
                editingAnnouncement.id === id
            ) {
                handleCancelAnnouncementEdit();
            }

            await loadSettings();
        } catch (err) {
            console.error(
                "Failed to delete announcement:",
                err
            );

            setError(
                "Unable to delete announcement."
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | PLATFORM POLICIES
    |--------------------------------------------------------------------------
    */

    const handlePolicySubmit = (e) => {
        e.preventDefault();

        if (
            !policyForm.title.trim() ||
            !policyForm.content.trim()
        ) {
            return;
        }

        setConfirmationModal({
            type: "policy",
            action: editingPolicy ? "save" : "publish",
        });
    };

    const savePolicy = async () => {

        try {
            setSubmitting(true);
            setError("");

            if (editingPolicy) {
                await api.patch(
                    `/admin/settings/policies/${editingPolicy.id}`,
                    policyForm
                );

                setEditingPolicy(null);
            } else {
                await api.post(
                    "/admin/settings/policies",
                    policyForm
                );
            }

            setPolicyForm({
                title: "",
                content: "",
            });

            await loadSettings();
        } catch (err) {
            console.error(
                "Failed to save policy:",
                err
            );

            setError(
                editingPolicy
                    ? "Unable to update platform policy."
                    : "Unable to publish platform policy."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditPolicy = (policy) => {
        setEditingPolicy(policy);

        setPolicyForm({
            title: policy.title,
            content: policy.content,
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleCancelPolicyEdit = () => {
        setEditingPolicy(null);

        setPolicyForm({
            title: "",
            content: "",
        });
    };

    const handleDeletePolicy = (id) => {
        setConfirmationModal({
            type: "policy",
            action: "delete",
            id,
        });
    };

    const deletePolicy = async (id) => {

        try {
            setError("");

            await api.delete(
                `/admin/settings/policies/${id}`
            );

            if (
                editingPolicy &&
                editingPolicy.id === id
            ) {
                handleCancelPolicyEdit();
            }

            await loadSettings();
        } catch (err) {
            console.error(
                "Failed to delete policy:",
                err
            );

            setError(
                "Unable to delete platform policy."
            );
        }
    };

    const confirmAction = async () => {
        if (!confirmationModal) return;

        const { type, action, id } = confirmationModal;
        setConfirmationModal(null);

        if (type === "announcement") {
            if (action === "delete") {
                await deleteAnnouncement(id);
            } else {
                await saveAnnouncement();
            }
            return;
        }

        if (action === "delete") {
            await deletePolicy(id);
        } else {
            await savePolicy();
        }
    };

    const getConfirmationCopy = () => {
        const isDelete = confirmationModal?.action === "delete";
        const label = confirmationModal?.type === "policy"
            ? "platform policy"
            : "announcement";

        return {
            title: isDelete ? `Delete ${label}?` : `${confirmationModal?.action === "publish" ? "Publish" : "Save"} ${label}?`,
            message: isDelete
                ? `This ${label} will be permanently removed.`
                : `Are you sure you want to ${confirmationModal?.action === "publish" ? "publish" : "save changes to"} this ${label}?`,
            confirmLabel: isDelete ? "Delete" : confirmationModal?.action === "publish" ? "Publish" : "Save Changes",
        };
    };

    return (
        <div className="settings-page">

            {/* PAGE HEADER */}

            <section className="settings-page-header">
                <div>
                    <span className="settings-eyebrow">
                        CRYMA PLATFORM
                    </span>

                    <h1>Platform Settings</h1>

                    <p>
                        Manage announcements and platform
                        policies shown across CRYMA.
                    </p>
                </div>
            </section>

            {/* ERROR */}

            {error && (
                <div className="settings-error">
                    {error}
                </div>
            )}

            {/* TABS */}

            <section className="settings-panel">

                <div className="settings-tabs">

                    <button
                        type="button"
                        className={
                            activeTab === "announcements"
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setActiveTab("announcements");
                            setError("");
                        }}
                    >
                        Announcements
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "policies"
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setActiveTab("policies");
                            setError("");
                        }}
                    >
                        Platform Policies
                    </button>

                </div>

                {/* =====================================================
                    ANNOUNCEMENTS
                    ===================================================== */}

                {activeTab === "announcements" && (
                    <div className="settings-content">

                        <div className="settings-section-header">
                            <div>

                                <span>
                                    COMMUNICATION
                                </span>

                                <h2>
                                    {editingAnnouncement
                                        ? "Edit Announcement"
                                        : "Post Announcement"}
                                </h2>

                                <p>
                                    {editingAnnouncement
                                        ? "Update the selected announcement."
                                        : "Publish important updates and notices to the CRYMA platform."}
                                </p>

                            </div>
                        </div>

                        <form
                            className="settings-form"
                            onSubmit={
                                handleAnnouncementSubmit
                            }
                        >

                            <div className="form-field">

                                <label>
                                    Announcement Title
                                </label>

                                <input
                                    type="text"
                                    value={
                                        announcementForm.title
                                    }
                                    onChange={(e) =>
                                        setAnnouncementForm({
                                            ...announcementForm,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="Enter announcement title"
                                />

                            </div>

                            <div className="form-field">

                                <label>
                                    Message
                                </label>

                                <textarea
                                    value={
                                        announcementForm.message
                                    }
                                    onChange={(e) =>
                                        setAnnouncementForm({
                                            ...announcementForm,
                                            message: e.target.value,
                                        })
                                    }
                                    placeholder="Write your announcement..."
                                    rows="5"
                                />

                            </div>

                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="settings-submit"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? editingAnnouncement
                                            ? "Saving..."
                                            : "Publishing..."
                                        : editingAnnouncement
                                            ? "Save Changes"
                                            : "Publish Announcement"}
                                </button>

                                {editingAnnouncement && (
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={
                                            handleCancelAnnouncementEdit
                                        }
                                    >
                                        Cancel
                                    </button>
                                )}

                            </div>

                        </form>

                        <div className="settings-list-section">

                            <div className="settings-list-header">

                                <h3>
                                    Published Announcements
                                </h3>

                                <span>
                                    {announcements.length}
                                </span>

                            </div>

                            {loading ? (
                                <div className="settings-empty">
                                    Loading announcements...
                                </div>
                            ) : announcements.length === 0 ? (
                                <div className="settings-empty">
                                    No announcements published yet.
                                </div>
                            ) : (
                                <div className="settings-list">

                                    {announcements.map(
                                        (announcement) => (
                                            <article
                                                className="settings-item"
                                                key={
                                                    announcement.id
                                                }
                                            >

                                                <div>

                                                    <h4>
                                                        {
                                                            announcement.title
                                                        }
                                                    </h4>

                                                    <p>
                                                        {
                                                            announcement.message
                                                        }
                                                    </p>

                                                </div>

                                                <div className="settings-actions">

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() =>
                                                            handleEditAnnouncement(
                                                                announcement
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleDeleteAnnouncement(
                                                                announcement.id
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </article>
                                        )
                                    )}

                                </div>
                            )}

                        </div>

                    </div>
                )}

                {/* =====================================================
                    PLATFORM POLICIES
                    ===================================================== */}

                {activeTab === "policies" && (
                    <div className="settings-content">

                        <div className="settings-section-header">

                            <div>

                                <span>
                                    PLATFORM GOVERNANCE
                                </span>

                                <h2>
                                    {editingPolicy
                                        ? "Edit Platform Policy"
                                        : "Update Platform Policy"}
                                </h2>

                                <p>
                                    {editingPolicy
                                        ? "Update the selected platform policy."
                                        : "Maintain the rules and guidelines that govern CRYMA."}
                                </p>

                            </div>

                        </div>

                        <form
                            className="settings-form"
                            onSubmit={
                                handlePolicySubmit
                            }
                        >

                            <div className="form-field">

                                <label>
                                    Policy Title
                                </label>

                                <input
                                    type="text"
                                    value={
                                        policyForm.title
                                    }
                                    onChange={(e) =>
                                        setPolicyForm({
                                            ...policyForm,
                                            title: e.target.value,
                                        })
                                    }
                                    placeholder="Enter policy title"
                                />

                            </div>

                            <div className="form-field">

                                <label>
                                    Policy Content
                                </label>

                                <textarea
                                    value={
                                        policyForm.content
                                    }
                                    onChange={(e) =>
                                        setPolicyForm({
                                            ...policyForm,
                                            content: e.target.value,
                                        })
                                    }
                                    placeholder="Write the platform policy..."
                                    rows="7"
                                />

                            </div>

                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="settings-submit"
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? editingPolicy
                                            ? "Saving..."
                                            : "Publishing..."
                                        : editingPolicy
                                            ? "Save Changes"
                                            : "Publish Policy"}
                                </button>

                                {editingPolicy && (
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={
                                            handleCancelPolicyEdit
                                        }
                                    >
                                        Cancel
                                    </button>
                                )}

                            </div>

                        </form>

                        <div className="settings-list-section">

                            <div className="settings-list-header">

                                <h3>
                                    Platform Policies
                                </h3>

                                <span>
                                    {policies.length}
                                </span>

                            </div>

                            {loading ? (
                                <div className="settings-empty">
                                    Loading policies...
                                </div>
                            ) : policies.length === 0 ? (
                                <div className="settings-empty">
                                    No platform policies yet.
                                </div>
                            ) : (
                                <div className="settings-list">

                                    {policies.map(
                                        (policy) => (
                                            <article
                                                className="settings-item"
                                                key={
                                                    policy.id
                                                }
                                            >

                                                <div>

                                                    <h4>
                                                        {
                                                            policy.title
                                                        }
                                                    </h4>

                                                    <p>
                                                        {
                                                            policy.content
                                                        }
                                                    </p>

                                                </div>

                                                <div className="settings-actions">

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() =>
                                                            handleEditPolicy(
                                                                policy
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleDeletePolicy(
                                                                policy.id
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            </article>
                                        )
                                    )}

                                </div>
                            )}

                        </div>

                    </div>
                )}

            </section>

            {confirmationModal && (() => {
                const copy = getConfirmationCopy();

                return (
                    <div className="settings-modal-overlay" onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !submitting) {
                            setConfirmationModal(null);
                        }
                    }}>
                        <div className="settings-confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="settings-confirmation-title">
                            <div className={`settings-confirmation-icon ${confirmationModal.action === "delete" ? "danger" : ""}`}>!</div>
                            <h2 id="settings-confirmation-title">{copy.title}</h2>
                            <p>{copy.message}</p>
                            <div className="settings-confirmation-actions">
                                <button type="button" className="settings-confirm-cancel" disabled={submitting} onClick={() => setConfirmationModal(null)}>Cancel</button>
                                <button type="button" className={`settings-confirm-action ${confirmationModal.action === "delete" ? "danger" : ""}`} disabled={submitting} onClick={confirmAction}>{submitting ? "Processing..." : copy.confirmLabel}</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

export default Settings;

