import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import "./ConfirmationModal.css";

export default function ConfirmationModal({ open, title, description, confirmLabel = "Confirm action", tone = "default", busy = false, onConfirm, onCancel }) {
    const cancelRef = useRef(null);
    const confirmRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        cancelRef.current?.focus();
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !busy) onCancel();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, busy, onCancel]);

    if (!open) return null;
    const destructive = tone === "danger";

    return <div className="lw-confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
        <section className="lw-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="lw-confirm-title" aria-describedby="lw-confirm-description" onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus(); }
            else if (!event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus(); }
        }}>
            <span className={`lw-confirm-icon${destructive ? " lw-confirm-icon--danger" : ""}`} aria-hidden="true">
                {destructive ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </span>
            <h2 id="lw-confirm-title">{title}</h2>
            <p id="lw-confirm-description">{description}</p>
            <div className="lw-confirm-actions">
                <button ref={cancelRef} type="button" className="lw-confirm-cancel" onClick={onCancel} disabled={busy}>Cancel</button>
                <button ref={confirmRef} type="button" className={`lw-confirm-submit${destructive ? " lw-confirm-submit--danger" : ""}`} onClick={onConfirm} disabled={busy}>
                    {busy ? "Saving…" : confirmLabel}
                </button>
            </div>
        </section>
    </div>;
}
