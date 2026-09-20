import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";

function Orders() {
	const [orders, setOrders] = useState([]);
	const [error, setError] = useState("");

	useEffect(() => { api.get("/orders").then(({ data }) => setOrders(data.data || [])).catch(() => setError("Unable to load orders.")); }, []);

	return <main className="shop-page"><h1>My orders</h1>{error && <p className="auth-notice auth-notice--error">{error}</p>}{orders.length === 0 ? <div className="shop-empty"><p>No orders yet.</p><Link to="/shop">Start shopping</Link></div> : <section className="shop-results">{orders.map((order) => <Link className="sl-list-row" to={`/orders/${order.id}`} key={order.id}><span>Order #{order.id}</span><span>{order.status}</span><strong>₱{Number(order.total_amount).toLocaleString()}</strong></Link>)}</section>}</main>;
}

export default Orders;
