import { Link, Navigate } from "react-router-dom";

function Account() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || user.role !== "buyer") return <Navigate to="/login" replace />;

    const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();

    return (
        <main className="shop-page account-page">
            <Link className="buyer-back-link" to="/">← Back to home</Link>
            <header className="account-header">
                <div className="account-avatar">{initials || "U"}</div>
                <div>
                    <p className="shop-eyebrow">MY ACCOUNT</p>
                    <h1>{user.first_name} {user.last_name}</h1>
                    <p className="account-welcome">Manage your profile, orders, and shopping bag.</p>
                </div>
            </header>
            <section className="account-grid">
                <div className="account-panel">
                    <div className="account-panel-heading"><div><p className="shop-eyebrow">PROFILE DETAILS</p><h2>Personal information</h2></div><span className="account-status">Active</span></div>
                    <dl className="account-details">
                        <div><dt>Full name</dt><dd>{user.first_name} {user.last_name}</dd></div>
                        <div><dt>Email address</dt><dd>{user.email}</dd></div>
                        <div><dt>Phone number</dt><dd>{user.phone || "Not provided"}</dd></div>
                        <div><dt>Account type</dt><dd>Buyer</dd></div>
                    </dl>
                </div>
                <div className="account-panel account-panel--actions">
                    <p className="shop-eyebrow">SHOPPING</p>
                    <h2>Keep browsing</h2>
                    <p>Pick up where you left off or check the status of a recent purchase.</p>
                    <div className="account-links">
                        <Link to="/cart"><span>Bag</span><strong>Open your cart →</strong></Link>
                        <Link to="/orders"><span>Orders</span><strong>View order history →</strong></Link>
                        <Link to="/shop"><span>Discover</span><strong>Continue shopping →</strong></Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Account;