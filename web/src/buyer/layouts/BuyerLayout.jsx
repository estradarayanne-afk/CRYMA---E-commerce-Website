import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import BuyerNavbar from "../components/BuyerNavbar/BuyerNavbar";
import AuthModal from "../../shared/components/AuthModal";
import Toast from "../../shared/components/Toast";
import {
    getBuyerCart,
    isBuyerSession,
    saveBuyerCart,
} from "../../shared/utils/buyerAccess";
import { addProductToCart } from "../../shared/utils/buyerProductActions";
import BuyerSellerChatWidget from "../components/BuyerSellerChatWidget/BuyerSellerChatWidget";
import "./BuyerLayout.css";

function BuyerLayout() {
    const [toast, setToast] = useState(null);
    const toastIdRef = useRef(0);

    useEffect(() => {
        const notify = (detail) => {
            setToast({
                id: ++toastIdRef.current,
                message: detail?.message || "Done",
                type: detail?.type === "error" ? "error" : "success",
            });
        };
        const handleToast = (event) => notify(event.detail);
        const addToCart = (event) => {
            if (!isBuyerSession() || !event.detail?.id) return;
            const product = event.detail;
            const result = addProductToCart(getBuyerCart(), product);
            if (!result.success) {
                const message = result.reason === "insufficient_stock"
                    ? `Only ${result.stock} item${result.stock === 1 ? "" : "s"} available.`
                    : "Unable to add this item to your cart.";
                notify({ message, type: "error" });
                event.preventDefault();
                return;
            }
            if (!saveBuyerCart(result.cart)) {
                notify({ message: "Unable to save your cart. Please try again.", type: "error" });
                event.preventDefault();
                return;
            }
            // ProductCard owns the success toast after this event is accepted.
        };
        window.addEventListener("cryma-toast", handleToast);
        window.addEventListener("cryma-add-to-cart", addToCart);
        return () => {
            window.removeEventListener("cryma-toast", handleToast);
            window.removeEventListener("cryma-add-to-cart", addToCart);
        };
    }, []);

    return (
        <div className="buyer-global-shell">
            <BuyerNavbar />

            <AuthModal />

            <main className="buyer-global-main">
                <Outlet />
            </main>

            <BuyerSellerChatWidget />

            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default BuyerLayout;
