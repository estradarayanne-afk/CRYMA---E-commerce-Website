import { useState } from "react";
import { Camera, Keyboard } from "lucide-react";
import ParcelQrScanner from "../../shared/components/ParcelQrScanner";

export default function ParcelCodeCapture({ label = "Parcel code", code, onCodeChange, onVerify, onScanned, submitLabel = "Verify parcel code", busy = false, title = "Scan parcel label" }) {
    const [cameraOpen, setCameraOpen] = useState(false);
    const handleScan = (value) => {
        onCodeChange(value);
        setCameraOpen(false);
        onScanned?.(value);
    };

    return <section className="hs-capture">
        <div className="hs-capture-heading"><Keyboard size={17} aria-hidden="true"/><strong>Scan or enter parcel code</strong><button className="hs-button hs-button--secondary" type="button" disabled={busy} onClick={() => setCameraOpen((open) => !open)}><Camera size={16}/>{cameraOpen ? "Close camera" : "Use camera"}</button></div>
        {cameraOpen && <div className="hs-capture-camera"><ParcelQrScanner title={title} onScan={handleScan} onClose={() => setCameraOpen(false)}/></div>}
        <form className="hs-capture-form" onSubmit={(event) => { event.preventDefault(); onVerify(code); }}>
            <label className="hs-field">{label}<input value={code} onChange={(event) => onCodeChange(event.target.value)} autoComplete="off" spellCheck="false" placeholder="CRYMA parcel code" /></label>
            <button className="hs-button hs-button--primary" type="submit" disabled={busy || !code.trim()}>{busy ? "Please wait..." : submitLabel}</button>
        </form>
        <p className="hs-capture-hint">Camera access needs permission and a secure browser context. Manual entry remains available if the camera cannot start.</p>
    </section>;
}
