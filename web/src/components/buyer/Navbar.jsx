import { Link, useNavigate } from "react-router-dom";
import {
    Search,
    ShoppingBag,
    Heart,
    UserRound,
} from "lucide-react";
import { useState } from "react";
import logo from "../../assets/CRYMA LOGO.png";

function Navbar() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const handleSearch = (event) => {
        event.preventDefault();

        const value = search.trim();

        if (!value) return;

        navigate(`/shop?search=${encodeURIComponent(value)}`);
    };

    return (
        <header className="buyer-navbar">
            <div className="buyer-navbar-inner">
                <Link to="/" className="buyer-brand" aria-label="Cryma home">
                    <img src={logo} alt="Cryma logo" />
                </Link>

                <nav className="buyer-nav-links">
                    <Link to="/">Home</Link>
                    <Link to="/shop">Shop</Link>
                    <Link to="/shop?category=featured">Featured</Link>
                    <Link to="/shop?category=deals">Deals</Link>
                </nav>

                <form className="buyer-search" onSubmit={handleSearch}>
                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </form>

                <div className="buyer-actions">
                    <button
                        type="button"
                        aria-label="Wishlist"
                        onClick={() => navigate("/wishlist")}
                    >
                        <Heart size={20} />
                    </button>

                    <button
                        type="button"
                        aria-label="Shopping bag"
                        onClick={() => navigate("/cart")}
                    >
                        <ShoppingBag size={20} />
                        <span className="cart-count">0</span>
                    </button>

                    <button
                        type="button"
                        aria-label="Account"
                        onClick={() => navigate("/account")}
                    >
                        <UserRound size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Navbar;