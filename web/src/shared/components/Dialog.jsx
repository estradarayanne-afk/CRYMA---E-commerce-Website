import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Dialog.css";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

function Dialog({
    open,
    onClose,
    ariaLabel,
    ariaLabelledBy,
    className = "",
    overlayClassName = "",
    closeOnBackdrop = true,
    closeOnEscape = true,
    busy = false,
    children,
}) {
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return undefined;

        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const panel = panelRef.current;
        const firstFocusable = panel?.querySelector(FOCUSABLE_SELECTOR);
        (firstFocusable || panel)?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus instanceof HTMLElement && document.contains(previousFocus)) {
                previousFocus.focus();
            }
        };
    }, [open]);

    if (!open) return null;

    const handleKeyDown = (event) => {
        if (event.key === "Escape" && closeOnEscape && !busy) {
            event.stopPropagation();
            onCloseRef.current();
            return;
        }
        if (event.key !== "Tab") return;

        const panel = panelRef.current;
        const focusable = panel
            ? [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
                (element) => element.getAttribute("aria-hidden") !== "true",
            )
            : [];
        if (!focusable.length) {
            event.preventDefault();
            panel?.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
        }
    };

    return createPortal(
        <div
            className={`ui-dialog-overlay ${overlayClassName}`.trim()}
            onMouseDown={(event) => {
                if (closeOnBackdrop && !busy && event.target === event.currentTarget) {
                    onCloseRef.current();
                }
            }}
        >
            <section
                ref={panelRef}
                className={`ui-dialog-panel ${className}`.trim()}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
            >
                {children}
            </section>
        </div>,
        document.body,
    );
}

export default Dialog;
