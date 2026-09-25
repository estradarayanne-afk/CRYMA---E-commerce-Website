import { Outlet } from "react-router-dom";
import BuyerNavbar from "../components/BuyerNavbar/BuyerNavbar";

function BuyerLayout() {
    return (
        <div className="buyer-global-shell">
            <BuyerNavbar />

            <main className="buyer-global-main">
                <Outlet />
            </main>
        </div>
    );
}

export default BuyerLayout;