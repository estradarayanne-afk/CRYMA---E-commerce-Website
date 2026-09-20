import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../../shared/services/api";

function ProductDetails() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [product, setProduct] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [activeTab, setActiveTab] = useState("Description");

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
		if (existing) existing.quantity += quantity;
		else cart.push({ ...product, quantity });
		localStorage.setItem("cryma_cart", JSON.stringify(cart));
		navigate(redirectToCheckout ? "/checkout" : "/cart");
	};

	const buyNow = () => {
		addToCart(true);
	};

	const gallery = product.image ? [product.image] : [null];
	const sellerName = product.seller ? `${product.seller.first_name} ${product.seller.last_name}` : "Verified marketplace seller";
	const oldPrice = Math.round(Number(product.price) * 1.32);

	return (
		<main className="product-page">
			<div className="product-breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/shop">{product.category}</Link><span>/</span><strong>{product.name}</strong></div>
			<section className="product-detail-layout">
				<div className="product-gallery">
					<div className="product-thumbnails">
						{gallery.map((image, index) => (
							<button type="button" className={`product-thumbnail${index === 0 ? " active" : ""}`} key={image || "placeholder"} aria-label={`View image ${index + 1}`}>
								{image ? <img src={image} alt="" /> : <span>CRYMA</span>}
							</button>
						))}
					</div>
					<div className="product-main-image">
						{product.image ? <img src={product.image} alt={product.name} /> : <div className="product-detail-placeholder"><strong>CRYMA</strong><span>Image unavailable</span></div>}
					</div>
				</div>

				<div className="product-detail-info">
					<div className="product-detail-heading"><h1>{product.name}</h1><button type="button" aria-label="Save product">♡</button></div>
					<div className="product-detail-rating"><span>★★★★★</span><strong>4.8</strong><span>|</span><span>1,243 reviews</span><span>|</span><span>5.2K sold</span></div>
					<div className="product-detail-price"><strong>₱{Number(product.price).toLocaleString()}</strong><del>₱{oldPrice.toLocaleString()}</del><span>-17%</span><small>You save ₱{Math.max(0, oldPrice - Number(product.price)).toLocaleString()}!</small></div>
					<div className="product-option"><label>Color: <span>Awesome Navy</span></label><div><button type="button" className="selected">Awesome Navy</button><button type="button">Awesome Iceblue</button><button type="button">Awesome Lilac</button></div></div>
					<div className="product-option"><label>Storage: <span>128GB</span></label><div><button type="button" className="selected">128GB</button><button type="button">256GB</button></div></div>
					<div className="product-quantity"><label>Quantity</label><div><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity((value) => Math.min(product.stock || value + 1, value + 1))}>+</button></div><span>{product.stock > 0 ? `${product.stock} pieces available` : "Out of stock"}</span></div>
					<div className="product-actions"><button type="button" className="product-add-button" onClick={() => addToCart(false)} disabled={product.stock < 1}>Add to Cart</button><button type="button" className="product-buy-button" onClick={buyNow} disabled={product.stock < 1}>Buy Now</button></div>
					<div className="product-seller-card"><div className="seller-avatar">{sellerName.slice(0, 2).toUpperCase()}</div><div><strong>{sellerName}</strong><span>⭐ 4.9 &nbsp;|&nbsp; 15.3K sales</span></div><button type="button">View Shop</button></div>
				</div>
			</section>

			<section className="product-detail-tabs">
				<nav>{["Description", "Specs", "Reviews (1,243)"].map((tab) => <button type="button" key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
				<div>{activeTab === "Description" ? <p>{product.description || "A thoughtfully selected product from a verified Cryma marketplace seller."}</p> : activeTab === "Specs" ? <p>Product category: {product.category}. Stock status: {product.stock > 0 ? "Available" : "Out of stock"}.</p> : <p>Customer reviews will appear here as buyers share their experience.</p>}</div>
			</section>
		</main>
	);
}

export default ProductDetails;
