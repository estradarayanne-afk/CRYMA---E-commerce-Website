import { Outlet } from "react-router-dom";
import Navbar from "../components/buyer/Navbar";
import "../styles/buyer.css";

function BuyerLayout() {
    return (
        <div className="buyer-layout">
            <Navbar />

            <main className="buyer-main">
                <Outlet />
            </main>

            <footer className="buyer-footer">
                <div className="buyer-footer-inner">
                    <div>
                        <h2>CRYMA</h2>
                        <p>
                            Discover products from trusted sellers in one
                            simple marketplace.
                        </p>
                    </div>

                    <div className="footer-links">
                        <span>Shop</span>
                        <span>About</span>
                        <span>Help Center</span>
                        <span>Terms</span>
                    </div>

                    <p className="footer-copy">
                        © {new Date().getFullYear()} CRYMA. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default BuyerLayout;