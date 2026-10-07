import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Outlet } from "react-router-dom";
import BuyerNavbar from "../components/BuyerNavbar/BuyerNavbar";
import AuthModal from "../../shared/components/AuthModal";
import {
    getBuyerCart,
    isBuyerSession,
    saveBuyerCart,
} from "../../shared/utils/buyerAccess";
import "./BuyerLayout.css";

function BuyerLayout() {
    const [toast, setToast] = useState("");

    useEffect(() => {
        let timeoutId;
        const notify = (event) => {
            setToast(event.detail?.message || "Done");
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => setToast(""), 2800);
        };
        const addToCart = (event) => {
            if (!isBuyerSession() || !event.detail?.id) return;
            const product = event.detail;
            const cart = getBuyerCart();
            const existing = cart.find((item) => String(item.id) === String(product.id));
            const nextQuantity = Number(existing?.quantity || 0) + 1;
            const rawStock = product.stock ?? existing?.stock;
            const stock = rawStock === "" || rawStock === null || rawStock === undefined
                ? null
                : Number(rawStock);
            if (Number.isFinite(stock) && nextQuantity > stock) {
                notify({ detail: { message: `Only ${stock} item${stock === 1 ? "" : "s"} available.` } });
                event.preventDefault();
                return;
            }
            if (existing) existing.quantity = nextQuantity;
            else cart.push({ ...product, quantity: 1 });
            saveBuyerCart(cart);
            notify({ detail: { message: "Added to Cart" } });
        };
        window.addEventListener("cryma-toast", notify);
        window.addEventListener("cryma-add-to-cart", addToCart);
        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener("cryma-toast", notify);
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

            {toast && (
                <div className="buyer-toast" role="status" aria-live="polite">
                    <Check size={16} />
                    <span>{toast}</span>
                    <button type="button" onClick={() => setToast("")} aria-label="Dismiss notification">
                        <X size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default BuyerLayout;
