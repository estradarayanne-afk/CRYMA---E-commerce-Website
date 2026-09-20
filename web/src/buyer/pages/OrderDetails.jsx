import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../shared/services/api";

function OrderDetails() {
	const { id } = useParams();
	const [order, setOrder] = useState(null);
	const [error, setError] = useState("");
	useEffect(() => { api.get(`/orders/${id}`).then(({ data }) => setOrder(data.data)).catch(() => setError("Order not found.")); }, [id]);
	if (error) return <main className="shop-page"><div className="shop-empty"><h2>{error}</h2><Link to="/orders">Back to orders</Link></div></main>;
	if (!order) return <main className="shop-page"><div className="shop-empty"><p>Loading order...</p></div></main>;
	return <main className="shop-page"><Link to="/orders">Back to orders</Link><h1>Order #{order.id}</h1><p>Status: {order.status}</p><section className="shop-results">{order.items.map((item) => <div className="sl-list-row" key={item.id}><span>{item.product?.name || "Product"} x {item.quantity}</span><strong>₱{Number(item.subtotal).toLocaleString()}</strong></div>)}<h2>Total: ₱{Number(order.total_amount).toLocaleString()}</h2></section></main>;
}

export default OrderDetails;
