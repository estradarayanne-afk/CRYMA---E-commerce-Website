import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/services/api";
import PrivateDeliveryProof from "../../shared/components/PrivateDeliveryProof";
import CourierConfirmModal from "../components/CourierConfirmModal";
import { validateDeliveryProof } from "../utils/deliveryProof";
import "../layouts/CourierPages.css";

function DeliveryDetails() {
    const { id } = useParams();
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [reason, setReason] = useState("");
    const [recipientName, setRecipientName] = useState("");
    const [photo, setPhoto] = useState(null);
    const [photoError, setPhotoError] = useState("");
    const [validationError, setValidationError] = useState("");
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [pendingStatus, setPendingStatus] = useState(null);
    const [confirmProof, setConfirmProof] = useState(false);
    const photoInput = useRef(null);
    const submittingProof = useRef(false);

    const photoSizeLabel = photo
        ? photo.size < 1024 * 1024
            ? `${Math.max(1, Math.round(photo.size / 1024))} KB`
            : `${(photo.size / (1024 * 1024)).toFixed(2)} MB`
        : "";

    useEffect(() => {
        if (!photo) return undefined;
        const previewUrl = URL.createObjectURL(photo);
        const frame = window.requestAnimationFrame(() => setPhotoPreview({ file: photo, url: previewUrl }));
        return () => {
            window.cancelAnimationFrame(frame);
            URL.revokeObjectURL(previewUrl);
        };
    }, [photo]);
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try { const { data } = await api.get(`/courier/deliveries/${id}`); setDelivery(data?.data || null); }
        catch (err) { setError(err.response?.data?.message || "Delivery details are unavailable."); }
        finally { setLoading(false); }
    }, [id]);
    useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

    const updateStatus = async (status) => {
        setSaving(true); setError(""); setNotice("");
        try {
            const { data } = await api.patch(`/courier/deliveries/${id}/status`, { status, expected_status: delivery.status, ...(status === "DELIVERY_FAILED" ? { reason } : {}) });
            setDelivery(data?.data || delivery); setNotice(data?.message || "Delivery updated."); setReason("");
        } catch (err) { setError(err.response?.data?.message || "Unable to update delivery status."); }
        finally { setSaving(false); }
    };

    const submitProof = (event) => {
        event.preventDefault();
        if (submittingProof.current || saving || isComplete) return;
        const proofError = validateDeliveryProof({ recipientName, photo });
        if (proofError) {
            setValidationError(proofError);
            return;
        }

        setConfirmProof(true);
    };

    const uploadProof = async () => {
        if (submittingProof.current || saving || isComplete) return;
        setConfirmProof(false);

        const body = new FormData();
        body.append("expected_status", delivery.status);
        body.append("recipient_full_name", recipientName.trim());
        body.append("photo", photo);
        setSaving(true);
        submittingProof.current = true;
        setError("");
        setValidationError("");
        setNotice("");
        setUploadProgress(0);
        try {
            const { data } = await api.post(`/courier/deliveries/${id}/proof`, body, {
                onUploadProgress: (eventProgress) => {
                    if (eventProgress.total) setUploadProgress(Math.round((eventProgress.loaded / eventProgress.total) * 100));
                },
            });
            setDelivery((current) => ({
                ...current,
                status: data.data.status,
                delivered_at: data.data.delivered_at,
                proof: data.data.proof,
            }));
            setNotice(data.message || "Proof recorded and delivery completed.");
            setPhoto(null);
            setRecipientName("");
            if (photoInput.current) photoInput.current.value = "";
        } catch (err) {
            const message = Object.values(err.response?.data?.errors || {}).flat()[0]
                || err.response?.data?.message
                || "Unable to upload proof of delivery. Check your connection and try again.";
            setError(message);
        } finally {
            submittingProof.current = false;
            setSaving(false);
        }
    };

    if (loading) return <section className="cw-state" role="status">Loading delivery…</section>;
    if (error && !delivery) return <section className="cw-state cw-error" role="alert"><h1>Delivery unavailable</h1><p>{error}</p><Link to="/courier/deliveries">Back to deliveries</Link></section>;
    if (!delivery) return null;

    const deliveryArea = delivery.delivery_area || delivery.deliveryArea;
    const nextAction = { ASSIGNED_TO_RIDER: ["OUT_FOR_DELIVERY"] }[delivery.status] || [];
    const canFail = delivery.status === "OUT_FOR_DELIVERY";
    const isComplete = ["DELIVERED", "COMPLETED"].includes(delivery.status);
    const statusLabel = delivery.status.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
    const items = delivery.order?.items || [];

    return <section className="cw-page">
        <Link className="cw-back-link" to="/courier/deliveries">← Assigned deliveries</Link>
        <header className="cw-page-heading"><div><span className="cw-eyebrow">ORDER #{delivery.order?.id}</span><h1>Delivery details</h1><p>Current status: <strong>{statusLabel}</strong>{deliveryArea?.name && <> · Area: <strong>{deliveryArea.name}</strong></>}</p></div><button type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="cw-alert" role="alert">{error}</div>}{notice && <div className="cw-notice" role="status">{notice}</div>}
        <div className="cw-detail-grid"><article className="cw-panel"><h2>Delivery address</h2><p className="cw-address">{delivery.order?.delivery_address || "Delivery address unavailable"}</p><h2>Items</h2><ul className="cw-items">{items.map((item) => <li key={item.id}><span>{item.product?.name || "Product"}</span><strong>× {item.quantity}</strong></li>)}</ul></article>
            <aside className="cw-panel"><h2>Update status</h2><p>Record only actions you have completed. Successful delivery requires the recipient’s full name and a delivery photo.</p>{canFail && <label className="cw-reason-label">If delivery cannot be completed, enter a reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} required /></label>}
                <div className="cw-actions">{nextAction.map((status) => <button className="cw-primary" key={status} type="button" disabled={saving} onClick={() => setPendingStatus(status)}>{saving ? "Saving…" : "Confirm parcel is out for delivery"}</button>)}{canFail && <button className="cw-danger" type="button" disabled={saving || !reason.trim()} onClick={() => setPendingStatus("DELIVERY_FAILED")}>{saving ? "Saving…" : "Report failed delivery"}</button>}</div>
                {canFail && <form className="cw-proof-form" onSubmit={(event) => void submitProof(event)}>
                    <h3>Complete delivery with proof</h3>
                    <p className="cw-proof-help">Both fields are required. Proof is stored securely and visible to authorized staff.</p>
                    <label>Recipient’s full name<input required maxLength={150} autoComplete="name" value={recipientName} aria-invalid={!!validationError && !recipientName.trim()} aria-describedby="recipient-proof-help proof-validation-error" onChange={(event) => { setRecipientName(event.target.value); setValidationError(""); }} /></label>
                    <span id="recipient-proof-help" className="cw-proof-help">Enter the name of the person who received the parcel.</span>
                    <label htmlFor="delivery-proof-photo">Delivery photo <span className="cw-proof-required">Required</span></label>
                    <input ref={photoInput} id="delivery-proof-photo" required={!photo} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="delivery-photo-help delivery-photo-error" aria-invalid={!!photoError} onChange={(event) => {
                        const selected = event.target.files?.[0] || null;
                        if (selected && !["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
                            setPhoto(null); setPhotoError("Choose a JPEG, PNG, or WebP image."); event.target.value = ""; return;
                        }
                        if (selected && selected.size > 5 * 1024 * 1024) {
                            setPhoto(null); setPhotoError("The delivery photo must be 5 MB or smaller."); event.target.value = ""; return;
                        }
                        setPhoto(selected); setPhotoError(""); setValidationError("");
                    }} />
                    <p id="delivery-photo-help" className="cw-proof-help">JPEG, PNG, or WebP. Maximum file size: 5 MB.</p>
                    {photoError && <p id="delivery-photo-error" className="cw-proof-field-error" role="alert">{photoError}</p>}
                    {photo && photoPreview?.file === photo && <div className="cw-photo-preview"><img src={photoPreview.url} alt={`Preview of ${photo.name}`} /><div className="cw-photo-meta"><strong>{photo.name}</strong><span>{photoSizeLabel}</span></div><div className="cw-photo-actions"><label className="cw-photo-replace" htmlFor="delivery-proof-photo">Replace photo</label><button type="button" className="cw-secondary" onClick={() => { setPhoto(null); setPhotoError(""); if (photoInput.current) photoInput.current.value = ""; }}>Remove photo</button></div></div>}
                    {validationError && <p id="proof-validation-error" className="cw-proof-field-error" role="alert">{validationError}</p>}
                    <button className="cw-primary" type="submit" disabled={saving || isComplete || !!photoError}>{saving ? `Uploading photo… ${uploadProgress}%` : "Upload proof and complete delivery"}</button>
                    {saving && <div className="cw-upload-progress" role="status" aria-live="polite"><progress max="100" value={uploadProgress} aria-label={`Photo upload ${uploadProgress}% complete`} /><span>{uploadProgress < 100 ? `Uploading proof… ${uploadProgress}%` : "Saving proof and completing delivery…"}</span></div>}
                </form>}
                {delivery.status === "DELIVERY_FAILED" && <p className="cw-failure-reason">This failed delivery is recorded. Contact Logistics for the authorized retry or return process.</p>}
                {isComplete && <div className="cw-completion" role="status"><strong>Delivery completed</strong><span>Proof was recorded successfully. The buyer may still confirm receipt in their order page.</span></div>}
            </aside>
        </div>
        <PrivateDeliveryProof proof={delivery.proof} basePath={`/courier/deliveries/${delivery.id}/proof`} />
        <article className="cw-panel cw-history"><h2>Delivery history</h2>{delivery.events?.length ? delivery.events.map((event) => <div className="cw-event" key={event.id}><span>{event.new_status.replaceAll("_", " ")}</span><time>{event.created_at ? new Date(event.created_at).toLocaleString("en-PH") : "Recorded"}</time>{event.reason && <p>{event.reason}</p>}</div>) : <p>No delivery events are recorded yet.</p>}</article>
        {pendingStatus && <CourierConfirmModal title={pendingStatus === "DELIVERY_FAILED" ? "Report failed delivery?" : "Mark parcel out for delivery?"} message={pendingStatus === "DELIVERY_FAILED" ? `This will record the delivery attempt as failed${reason.trim() ? `: ${reason.trim()}` : ""}.` : "Confirm the parcel is with you and you are starting the delivery attempt."} confirmLabel={pendingStatus === "DELIVERY_FAILED" ? "Report failed delivery" : "Start delivery"} danger={pendingStatus === "DELIVERY_FAILED"} loading={saving} onCancel={() => setPendingStatus(null)} onConfirm={() => { const status = pendingStatus; setPendingStatus(null); void updateStatus(status); }} />}
        {confirmProof && <CourierConfirmModal title="Complete this delivery?" message="The recipient name and delivery photo will be submitted as proof, and the delivery will be marked complete." confirmLabel="Submit proof and complete" loading={saving} onCancel={() => setConfirmProof(false)} onConfirm={() => void uploadProof()} />}
    </section>;
}
export default DeliveryDetails;
