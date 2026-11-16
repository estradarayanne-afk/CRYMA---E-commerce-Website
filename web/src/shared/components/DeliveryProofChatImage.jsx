import { useEffect, useState } from "react";
import api from "../services/api";

export default function DeliveryProofChatImage({ conversationId, proofId }) {
    const [imageUrl, setImageUrl] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        let objectUrl = "";

        api.get(`/seller/delivery-chats/${conversationId}/proofs/${proofId}`, {
            responseType: "blob",
        }).then(({ data }) => {
            objectUrl = URL.createObjectURL(data);
            if (cancelled) URL.revokeObjectURL(objectUrl);
            else setImageUrl(objectUrl);
        }).catch((requestError) => {
            if (!cancelled) {
                setError(requestError.response?.data?.message || "The delivery photo could not be loaded.");
            }
        });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [conversationId, proofId]);

    if (error) return <p className="delivery-proof-chat-error" role="alert">{error}</p>;
    if (!imageUrl) return <p className="delivery-proof-chat-loading" role="status">Loading delivery photo…</p>;

    return <a className="delivery-proof-chat-image" href={imageUrl} target="_blank" rel="noreferrer">
        <img src={imageUrl} alt="Proof of successful delivery" loading="lazy" />
    </a>;
}
