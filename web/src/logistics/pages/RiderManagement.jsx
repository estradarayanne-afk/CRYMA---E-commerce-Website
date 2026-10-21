import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../shared/services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import "./RiderManagement.css";

const REQUIRED_DOCUMENTS = ["valid_id", "or_cr", "drivers_license"];
const DOCUMENT_LABELS = {
    valid_id: "Government ID",
    or_cr: "Vehicle OR/CR",
    drivers_license: "Driver's license",
};

const applicantName = (rider) => [rider.first_name, rider.middle_name, rider.last_name]
    .filter(Boolean)
    .join(" ");

export default function RiderManagement() {
    const [riders, setRiders] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [rejectionReasons, setRejectionReasons] = useState({});
    const [documentRejectionReasons, setDocumentRejectionReasons] = useState({});
    const [pendingAction, setPendingAction] = useState(null);
    const actionLocked = useRef(false);
    const cancelConfirmation = useCallback(() => setPendingAction(null), []);

    const load = useCallback(async (requestedPage = 1) => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get(`/logistics/riders?page=${requestedPage}`);
            setRiders(data?.data?.data || []);
            setPage(data?.data?.current_page || 1);
            setLastPage(data?.data?.last_page || 1);
        } catch (err) {
            setError(err.response?.data?.message || "Courier applications are unavailable.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(1), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const runAction = async (key, path, payload, successMessage, onSuccess) => {
        setSaving(key);
        setError("");
        setNotice("");
        try {
            const { data } = await api.patch(path, payload);
            setNotice(data?.message || successMessage);
            if (onSuccess) onSuccess(data);
            else await load(page);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to update the courier application.");
        } finally {
            setSaving("");
        }
    };

    const requestConfirmation = (title, description, run, tone = "default", confirmLabel = "Confirm action") => {
        setError("");
        setPendingAction({ title, description, run, tone, confirmLabel });
    };

    const confirmAction = () => {
        if (!pendingAction || actionLocked.current || saving) return;
        actionLocked.current = true;
        const { run } = pendingAction;
        setPendingAction(null);
        Promise.resolve(run()).finally(() => { actionLocked.current = false; });
    };

    const updateDocument = (riderId, documentId, action, riderLabel, documentLabel) => {
        const reason = (documentRejectionReasons[documentId] || "").trim();
        if (action === "reject" && !reason) {
            setError("Add a reason before rejecting this document.");
            return;
        }
        requestConfirmation(
            action === "approve" ? "Approve this document?" : "Reject this document?",
            `${documentLabel} for ${riderLabel} will be marked ${action === "approve" ? "approved" : `rejected. Reason: ${reason}`}.`,
            () => runAction(
                `document-${documentId}`,
                `/logistics/riders/${riderId}/documents/${documentId}/${action}`,
                action === "reject" ? { rejection_reason: reason } : {},
                `Document ${action}d.`,
                ({ data }) => setRiders((current) => current.map((rider) => rider.id !== riderId
                    ? rider
                    : { ...rider, documents: rider.documents.map((document) => document.id === documentId ? data : document) })),
            ),
            action === "reject" ? "danger" : "default",
            action === "approve" ? "Approve document" : "Reject document",
        );
    };

    const reviewApplication = (rider, action) => {
        const reason = (rejectionReasons[rider.id] || "").trim();
        if (action === "reject" && !reason) {
            setError("Add a reason before rejecting this application.");
            return;
        }
        const riderLabel = applicantName(rider);
        requestConfirmation(
            action === "approve" ? "Approve this courier application?" : "Reject this courier application?",
            action === "approve"
                ? `${riderLabel} will be approved as a courier after the review checks are complete.`
                : `${riderLabel} will be rejected. Reason: ${reason}`,
            () => runAction(
                `rider-${rider.id}`,
                `/logistics/riders/${rider.id}/${action}`,
                action === "reject" ? { rejection_reason: reason } : {},
                `Courier application ${action}d.`,
                () => setRiders((current) => current.filter((item) => item.id !== rider.id)),
            ),
            action === "reject" ? "danger" : "default",
            action === "approve" ? "Approve application" : "Reject application",
        );
    };

    const openDocument = async (riderId, document) => {
        setError("");
        try {
            const { data } = await api.get(
                `/logistics/riders/${riderId}/documents/${document.id}`,
                { responseType: "blob" },
            );
            const url = URL.createObjectURL(data);
            const opened = window.open(url, "_blank");
            if (!opened) {
                URL.revokeObjectURL(url);
                setError("Allow pop-ups to view the submitted document.");
                return;
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            setError(err.response?.data?.message || "Unable to open this document.");
        }
    };

    return (
        <section className="lr-page">
            <header className="lw-page-heading">
                <div>
                    <span className="lw-eyebrow">APPLICATION REVIEW</span>
                    <h1>Rider Management</h1>
                    <p>Review courier eligibility documents before approving an application.</p>
                </div>
                <button type="button" onClick={() => void load(page)} disabled={loading}>
                    {loading ? "Refreshing…" : "Refresh"}
                </button>
            </header>

            {error && <div className="lw-alert" role="alert">{error}</div>}
            {notice && <div className="lr-notice" role="status">{notice}</div>}
            {loading ? (
                <div className="lw-empty" role="status">Loading pending courier applications…</div>
            ) : riders.length === 0 ? (
                <div className="lw-empty" role="status">There are no pending courier applications.</div>
            ) : (
                <div className="lr-list">
                    {riders.map((rider) => {
                        const documents = rider.documents || [];
                        const allDocumentsApproved = REQUIRED_DOCUMENTS.every((type) =>
                            documents.some((document) => document.document_type === type && document.status === "approved"));
                        const vehicle = rider.courier_profile?.vehicles?.[0];

                        return (
                            <article className="lr-card" key={rider.id}>
                                <header className="lr-card-header">
                                    <div>
                                        <h2>{applicantName(rider)}</h2>
                                        <p>{rider.email} · {rider.phone || "No phone provided"}</p>
                                    </div>
                                    <span className={`lr-badge ${rider.email_verified_at ? "lr-badge--verified" : ""}`}>
                                        {rider.email_verified_at ? "Email verified" : "Email not verified"}
                                    </span>
                                </header>

                                <div className="lr-details">
                                    <span><strong>Vehicle:</strong> {vehicle ? `${vehicle.vehicle_type} · ${vehicle.plate_number}` : "Not provided"}</span>
                                    <span><strong>Address:</strong> {rider.addresses?.[0]
                                        ? [rider.addresses[0].barangay, rider.addresses[0].municipality, rider.addresses[0].province].filter(Boolean).join(", ")
                                        : "Not provided"}</span>
                                </div>

                                <section className="lr-documents" aria-label={`Documents for ${applicantName(rider)}`}>
                                    <h3>Submitted documents</h3>
                                    {REQUIRED_DOCUMENTS.map((type) => {
                                        const document = documents.find((item) => item.document_type === type);
                                        return (
                                            <div className="lr-document" key={type}>
                                                <div className="lr-document-info">
                                                    <strong>{DOCUMENT_LABELS[type]}</strong>
                                                    <span>{document ? `${document.original_file_name} · ${document.status}` : "Not submitted"}</span>
                                                    {document?.rejection_reason && <small>Reason: {document.rejection_reason}</small>}
                                                </div>
                                                {document && (
                                                    <div className="lr-document-actions">
                                                        <button type="button" className="lr-secondary" onClick={() => void openDocument(rider.id, document)}>View</button>
                                                        {document.status === "pending" && <>
                                                            <button type="button" className="lr-secondary" disabled={!!saving} onClick={() => updateDocument(rider.id, document.id, "approve", applicantName(rider), DOCUMENT_LABELS[type])}>
                                                                {saving === `document-${document.id}` ? "Saving…" : "Approve"}
                                                            </button>
                                                            <input
                                                                aria-label={`Rejection reason for ${DOCUMENT_LABELS[type]}`}
                                                                value={documentRejectionReasons[document.id] || ""}
                                                                onChange={(event) => setDocumentRejectionReasons((current) => ({ ...current, [document.id]: event.target.value }))}
                                                                placeholder="Document rejection reason"
                                                                maxLength={500}
                                                            />
                                                            <button type="button" className="lr-danger" disabled={!!saving || !documentRejectionReasons[document.id]?.trim()} onClick={() => updateDocument(rider.id, document.id, "reject", applicantName(rider), DOCUMENT_LABELS[type])}>Reject document</button>
                                                        </>}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </section>

                                <footer className="lr-review-actions">
                                    <button
                                        type="button"
                                        className="lr-primary"
                                        disabled={!!saving || !rider.email_verified_at || !allDocumentsApproved}
                                        onClick={() => reviewApplication(rider, "approve")}
                                    >
                                        {saving === `rider-${rider.id}` ? "Saving…" : "Approve application"}
                                    </button>
                                    <label>
                                        Rejection reason
                                        <textarea
                                            value={rejectionReasons[rider.id] || ""}
                                            onChange={(event) => setRejectionReasons((current) => ({ ...current, [rider.id]: event.target.value }))}
                                            maxLength={500}
                                            rows={2}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        className="lr-danger"
                                        disabled={!!saving || !rejectionReasons[rider.id]?.trim()}
                                        onClick={() => reviewApplication(rider, "reject")}
                                    >
                                        Reject application
                                    </button>
                                    {(!rider.email_verified_at || !allDocumentsApproved) && (
                                        <small className="lr-hint">Approval requires verified email and approval of all three documents.</small>
                                    )}
                                </footer>
                            </article>
                        );
                    })}
                </div>
            )}

            {lastPage > 1 && (
                <nav className="lr-pagination" aria-label="Courier application pages">
                    <button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)}>Previous</button>
                    <span>Page {page} of {lastPage}</span>
                    <button type="button" disabled={loading || page >= lastPage} onClick={() => void load(page + 1)}>Next</button>
                </nav>
            )}
            <ConfirmationModal open={!!pendingAction} title={pendingAction?.title} description={pendingAction?.description} confirmLabel={pendingAction?.confirmLabel} tone={pendingAction?.tone} busy={!!saving} onCancel={cancelConfirmation} onConfirm={confirmAction} />
        </section>
    );
}
