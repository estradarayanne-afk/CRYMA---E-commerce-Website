import { useEffect, useState } from "react";
import api from "../services/api";
import "./PrivateDeliveryProof.css";

function ProofAsset({ basePath, kind, label, proofName }) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => () => {
        if (url) URL.revokeObjectURL(url);
    }, [url]);

    const toggle = async () => {
        if (url) {
            setUrl("");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const { data } = await api.get(`${basePath}/${kind}`, { responseType: "blob" });
            setUrl(URL.createObjectURL(data));
        } catch (requestError) {
            setError(requestError.response?.data?.message || `Unable to load the delivery ${label.toLowerCase()}.`);
        } finally {
            setLoading(false);
        }
    };

    return <div className="proof-asset">
        <button type="button" onClick={() => void toggle()} disabled={loading} aria-expanded={!!url}>
            {loading ? "Loading…" : url ? `Hide ${label.toLowerCase()}` : `View ${label.toLowerCase()}`}
        </button>
        {error && <span role="alert">{error}</span>}
        {url && <img src={url} alt={`${label} proof for ${proofName || "recipient"}`} />}
    </div>;
}

export default function PrivateDeliveryProof({ proof, basePath }) {
    if (!proof) return null;

    return <section className="private-delivery-proof" aria-labelledby={`delivery-proof-title-${proof.delivery_id || basePath}`}>
        <div className="private-delivery-proof__heading"><div><span className="private-delivery-proof__eyebrow">DELIVERY RECORD</span><h3 id={`delivery-proof-title-${proof.delivery_id || basePath}`}>Proof of delivery</h3></div><span className="private-delivery-proof__badge">Photo and recipient recorded</span></div>
        <dl className="private-delivery-proof__details">
            <div><dt>Recipient</dt><dd>{proof.recipient_full_name || "Name unavailable"}</dd></div>
            <div><dt>Recorded</dt><dd>{proof.captured_at ? new Date(proof.captured_at).toLocaleString("en-PH") : "Timestamp unavailable"}</dd></div>
        </dl>
        <div className="private-delivery-proof__assets">
            <ProofAsset basePath={basePath} kind="photo" label="Delivery photo" proofName={proof.recipient_full_name} />
        </div>
    </section>;
}
