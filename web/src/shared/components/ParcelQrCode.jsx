import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function ParcelQrCode({ value, label = "CRYMA parcel QR code", size = 128 }) {
    const container = useRef(null);
    if (!value) return null;

    const download = () => {
        const svg = container.current?.querySelector("svg");
        if (!svg) return;
        const source = new XMLSerializer().serializeToString(svg);
        const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `${value}.svg`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return <div className="parcel-qr-code" ref={container}>
        <QRCodeSVG value={value} size={size} level="M" includeMargin title={label} />
        <strong>{value}</strong>
        <button className="parcel-qr-download" type="button" onClick={download}>Download QR</button>
    </div>;
}
