import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../shared/services/api";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85";

function ProductDetails() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!localStorage.getItem("token")) {
			navigate("/login", { replace: true, state: { from: `/products/${id}` } });
			return;
		}

		api.get(`/products/${id}`)
			.then(({ data }) => setProduct(data.data))
			.catch(() => setError("This product is no longer available."))
			.finally(() => setLoading(false));
	}, [id, navigate]);

	if (!localStorage.getItem("token")) return null;
	if (loading) return <div className="shop-empty"><p>Loading product...</p></div>;
	if (error || !product) return <div className="shop-empty"><h2>{error || "Product not found."}</h2><Link to="/shop">Back to shop</Link></div>;

	const addToCart = (redirectToCheckout = false) => {
		const cart = JSON.parse(localStorage.getItem("cryma_cart") || "[]");
		const existing = cart.find((item) => item.id === product.id);
		if (existing) existing.quantity += 1;
		else cart.push({ ...product, quantity: 1 });
		localStorage.setItem("cryma_cart", JSON.stringify(cart));
		navigate(redirectToCheckout ? "/checkout" : "/cart");
	};

	const buyNow = () => {
		addToCart(true);
	};

	return (
		<main className="shop-page">
			<Link className="buyer-back-link" to="/">← Back to homepage</Link>
			<section className="shop-product-card product-detail-card">
				<div className="shop-product-image">
					<img src={product.image || FALLBACK_IMAGE} alt={product.name} />
				</div>
				<div className="shop-product-body">
					<small>{product.category}</small>
					<h1>{product.name}</h1>
					<p>{product.description || "A product from a verified seller on Cryma."}</p>
					<div className="shop-price"><strong>₱{Number(product.price).toLocaleString()}</strong></div>
					<p>{product.stock > 0 ? `${product.stock} available` : "Out of stock"}</p>
					{product.seller && <p>Sold by {product.seller.first_name} {product.seller.last_name}</p>}
					<div className="product-actions">
						<button type="button" className="auth-submit" onClick={addToCart} disabled={product.stock < 1}>Add to cart</button>
						<button type="button" className="auth-submit product-buy-now" onClick={buyNow} disabled={product.stock < 1}>Buy now</button>
					</div>
				</div>
			</section>
		</main>
	);
}

export default ProductDetails;
