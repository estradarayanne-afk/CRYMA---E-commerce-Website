import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Cart() {
	const navigate = useNavigate();
	const isLoggedIn = !!localStorage.getItem("token");
	const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cryma_cart") || "[]"));

	useEffect(() => {
		if (!isLoggedIn) navigate("/login", { replace: true, state: { from: "/cart" } });
	}, [isLoggedIn, navigate]);

	if (!isLoggedIn) return null;

	const update = (id, quantity) => {
		const next = cart.map((item) => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item);
		setCart(next);
		localStorage.setItem("cryma_cart", JSON.stringify(next));
	};

	const remove = (id) => {
		const next = cart.filter((item) => item.id !== id);
		setCart(next);
		localStorage.setItem("cryma_cart", JSON.stringify(next));
	};

	const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

	return (
		<main className="shop-page cart-page">
			<Link className="buyer-back-link" to="/">← Back to homepage</Link>
			<header className="cart-header"><div><p className="shop-eyebrow">YOUR SELECTION</p><h1>Your bag</h1></div>{cart.length > 0 && <span>{cart.length} {cart.length === 1 ? "item" : "items"}</span>}</header>
			{cart.length === 0 ? <div className="shop-empty cart-empty"><p>Your bag is waiting for something good.</p><Link className="cart-primary-link" to="/shop">Explore the shop</Link></div> : (
				<div className="cart-layout">
				<section className="cart-items">
					{cart.map((item) => (
						<div className="cart-item" key={item.id}>
							<img src={item.image || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=240&q=80"} alt={item.name} />
							<div className="cart-item-info"><span>{item.category || "Cryma selection"}</span><h2>{item.name}</h2><p>{item.seller ? `Sold by ${item.seller.first_name} ${item.seller.last_name}` : "Selected from the Cryma marketplace"}</p><button className="cart-remove" type="button" onClick={() => remove(item.id)}>Remove</button></div>
							<div className="cart-item-controls"><strong>₱{Number(item.price).toLocaleString()}</strong><label>Qty <input aria-label={`Quantity for ${item.name}`} type="number" min="1" value={item.quantity} onChange={(event) => update(item.id, Number(event.target.value))} /></label><b>₱{(Number(item.price) * item.quantity).toLocaleString()}</b></div>
						</div>
					))}
				</section>
				<aside className="cart-summary"><p className="shop-eyebrow">ORDER SUMMARY</p><h2>Ready when you are.</h2><div className="cart-summary-line"><span>Subtotal</span><strong>₱{total.toLocaleString()}</strong></div><div className="cart-summary-line"><span>Delivery</span><span>Calculated at checkout</span></div><div className="cart-summary-total"><span>Total</span><strong>₱{total.toLocaleString()}</strong></div><button type="button" className="cart-checkout" onClick={() => navigate("/checkout")}>Proceed to checkout <span>→</span></button><Link className="cart-summary-link" to="/shop">Add more items</Link></aside>
				</div>
			)}
		</main>
	);
}

export default Cart;
