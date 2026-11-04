import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./ParcelQrScanner.css";

export default function ParcelQrScanner({ onScan, onClose, title = "Scan parcel QR code" }) {
    const id = `parcel-qr-reader-${useId().replaceAll(":", "")}`;
    const callback = useRef(onScan);
    const scannerRef = useRef(null);
    const [manualCode, setManualCode] = useState("");
    const [error, setError] = useState("");
    const completed = useRef(false);

    useEffect(() => { callback.current = onScan; }, [onScan]);

    const submitDecoded = useCallback((rawValue) => {
        if (completed.current) return;
        completed.current = true;
        setError("");
        Promise.resolve().then(() => scannerRef.current?.clear()).catch(() => {}).finally(() => callback.current(rawValue.trim()));
    }, []);

    useEffect(() => {
        let active = true;
        let scanner = null;
        import("html5-qrcode")
            .then(({ Html5QrcodeScanner, Html5QrcodeSupportedFormats }) => {
                if (!active || completed.current) return;
                scanner = new Html5QrcodeScanner(id, {
                    fps: 10,
                    qrbox: { width: 230, height: 230 },
                    rememberLastUsedCamera: true,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                }, false);
                scannerRef.current = scanner;
                scanner.render((decodedText) => {
                    submitDecoded(decodedText);
                }, (scanError) => {
                    if (active && /notallowed|permission|notfound|notreadable|overconstrained|camera/i.test(String(scanError))) {
                        setError("Camera access is unavailable or was denied. Allow camera access, or enter the parcel ID manually.");
                    }
                });
            })
            .catch(() => {
                if (active) setError("The camera scanner could not load. Enter the parcel ID manually.");
            });
        return () => {
            active = false;
            scannerRef.current = null;
            if (scanner) void scanner.clear().catch(() => {});
        };
    }, [id, submitDecoded]);

    const submitManual = (event) => {
        event.preventDefault();
        const value = manualCode.trim();
        if (!value) { setError("Enter the parcel ID from its label."); return; }
        submitDecoded(value);
    };

    return <section className="parcel-qr-scanner" aria-label={title}>
        <header><h3>{title}</h3>{onClose && <button type="button" onClick={onClose}>Close scanner</button>}</header>
        <p>Scan the QR label with your camera, or enter its parcel ID manually.</p>
        <div id={id} className="parcel-qr-reader" />
        <form onSubmit={submitManual}>
            <label>Parcel ID<input value={manualCode} onChange={(event) => setManualCode(event.target.value)} autoComplete="off" /></label>
            <button type="submit">Look up parcel ID</button>
        </form>
        {error && <p role="alert">{error}</p>}
        <small>Camera access requires permission and a secure browser context (HTTPS or localhost).</small>
    </section>;
}
