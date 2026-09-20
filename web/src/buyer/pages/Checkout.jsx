import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../shared/services/api";

function Checkout() {
	const navigate = useNavigate();
	const isLoggedIn = !!localStorage.getItem("token");
	const cart = JSON.parse(localStorage.getItem("cryma_cart") || "[]");
	const [error, setError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

	useEffect(() => {
		if (!isLoggedIn) navigate("/login", { replace: true, state: { from: "/checkout" } });
	}, [isLoggedIn, navigate]);

	if (!isLoggedIn) return null;

	const placeOrder = async () => {
		setSubmitting(true);
		setError("");
		try {
			const { data } = await api.post("/orders", { items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })) });
			localStorage.removeItem("cryma_cart");
			navigate(`/orders/${data.data.id}`);
		} catch (err) {
			setError(err.response?.data?.message || "Unable to place order.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="shop-page">
			<Link to="/cart">Back to bag</Link>
			<h1>Checkout</h1>
			{error && <p className="auth-notice auth-notice--error">{error}</p>}
			{cart.length === 0 ? <div className="shop-empty"><p>Your bag is empty.</p><Link to="/shop">Continue shopping</Link></div> : (
				<section className="shop-results"><p>{cart.length} item(s)</p><h2>Total: ₱{total.toLocaleString()}</h2><button type="button" className="auth-submit" onClick={placeOrder} disabled={submitting}>{submitting ? "Placing order..." : "Place order"}</button></section>
			)}
		</main>
	);
}

export default Checkout;
