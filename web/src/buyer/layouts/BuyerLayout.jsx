import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Grid2X2, House, Package, Search, ShoppingCart, UserRound } from "lucide-react";
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
    const location = useLocation();
    const buyerSession = isBuyerSession();

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
                const message = result.reason === "seller_on_vacation"
                    ? "This seller is on vacation and is not accepting orders."
                    : result.reason === "insufficient_stock"
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

            <nav className="buyer-mobile-tab-bar" aria-label="Mobile shopping navigation">
                {buyerSession ? (
                    <NavLink to="/orders" className={({ isActive }) => `buyer-mobile-tab${isActive ? " active" : ""}`}>
                        <Package size={20} aria-hidden="true" /><span>Orders</span>
                    </NavLink>
                ) : (
                    <NavLink to="/" end className={({ isActive }) => `buyer-mobile-tab${isActive ? " active" : ""}`}>
                        <House size={20} aria-hidden="true" /><span>Home</span>
                    </NavLink>
                )}
                <NavLink to="/shop" className={({ isActive }) => `buyer-mobile-tab${isActive && location.pathname === "/shop" ? " active" : ""}`}>
                    <Grid2X2 size={20} aria-hidden="true" /><span>Categories</span>
                </NavLink>
                <button type="button" className="buyer-mobile-tab" onClick={() => window.dispatchEvent(new Event("cryma-open-mobile-search"))}>
                    <Search size={20} aria-hidden="true" /><span>Search</span>
                </button>
                <NavLink to="/cart" className={({ isActive }) => `buyer-mobile-tab${isActive ? " active" : ""}`}>
                    <ShoppingCart size={20} aria-hidden="true" /><span>Cart</span>
                </NavLink>
                <NavLink to="/account" className={({ isActive }) => `buyer-mobile-tab${isActive ? " active" : ""}`}>
                    <UserRound size={20} aria-hidden="true" /><span>Account</span>
                </NavLink>
            </nav>

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
