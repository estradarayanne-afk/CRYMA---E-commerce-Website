import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import "./CourierConfirmModal.css";

export default function CourierConfirmModal({ title, message, confirmLabel = "Confirm", cancelLabel = "Go back", danger = false, loading = false, onConfirm, onCancel }) {
    const cancelRef = useRef(null);
    useEffect(() => {
        cancelRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onCancel();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [loading, onCancel]);

    return <div className="cw-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }}>
        <section className="cw-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="cw-confirm-title" aria-describedby="cw-confirm-message">
            <div className={`cw-confirm-icon${danger ? " is-danger" : ""}`}>{danger ? <AlertTriangle size={23} aria-hidden="true" /> : <CheckCircle2 size={23} aria-hidden="true" />}</div>
            <h2 id="cw-confirm-title">{title}</h2>
            <p id="cw-confirm-message">{message}</p>
            <div className="cw-confirm-actions">
                <button ref={cancelRef} type="button" className="cw-confirm-cancel" onClick={onCancel} disabled={loading}>{cancelLabel}</button>
                <button type="button" className={`cw-confirm-submit${danger ? " is-danger" : ""}`} onClick={onConfirm} disabled={loading}>{loading ? "Please wait…" : confirmLabel}</button>
            </div>
        </section>
    </div>;
}
