import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function SellerChatRedirect() {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const conversationId = new URLSearchParams(location.search).get("conversation");
        navigate("/shop", {
            replace: true,
            state: {
                openSellerChatConversationId: conversationId || null,
                openSellerChatRequest: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
        });
    }, [location.search, navigate]);

    return <div className="buyer-seller-chat-route-loading" role="status">Opening seller messages…</div>;
}

export default SellerChatRedirect;
