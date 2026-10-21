import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Info, X } from "lucide-react";
import "./Toast.css";

const TOAST_PRESENTATION = {
    success: { icon: Check, role: "status" },
    error: { icon: AlertCircle, role: "alert" },
    info: { icon: Info, role: "status" },
};

function Toast({ message, type = "success", duration = 4000, onDismiss }) {
    const onDismissRef = useRef(onDismiss);
    const presentation = TOAST_PRESENTATION[type] || TOAST_PRESENTATION.info;
    const Icon = presentation.icon;

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    useEffect(() => {
        if (duration <= 0) return undefined;
        const timeoutId = window.setTimeout(() => onDismissRef.current?.(), duration);
        return () => window.clearTimeout(timeoutId);
    }, [duration, message]);

    if (!message) return null;

    return createPortal(
        <div
            className={`ui-toast ui-toast-${type}`}
            role={presentation.role}
            aria-live={presentation.role === "alert" ? "assertive" : "polite"}
        >
            <Icon size={18} aria-hidden="true" />
            <span>{message}</span>
            <button type="button" onClick={() => onDismissRef.current?.()} aria-label="Dismiss notification">
                <X size={16} aria-hidden="true" />
            </button>
        </div>,
        document.body,
    );
}

export default Toast;
