import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

const safeList = (response) => {
    const rows = response?.data?.data;
    if (!Array.isArray(rows)) throw new Error("Courier task response was invalid.");
    return rows;
};

export default function Dashboard() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { /* use a neutral greeting */ }
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = user?.first_name || "there";
    const [tasks, setTasks] = useState({ pickups: [], deliveries: [], pickupHistory: [], deliveryHistory: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [pickups, deliveries, pickupHistory, deliveryHistory] = await Promise.all([
                api.get("/courier/pickups"),
                api.get("/courier/deliveries"),
                api.get("/courier/pickup-history"),
                api.get("/courier/delivery-history"),
            ]);
            setTasks({
                pickups: safeList(pickups),
                deliveries: safeList(deliveries),
                pickupHistory: safeList(pickupHistory),
                deliveryHistory: safeList(deliveryHistory),
            });
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Courier overview is unavailable.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const completed = tasks.pickupHistory.length + tasks.deliveryHistory.filter((delivery) =>
        ["DELIVERED", "COMPLETED"].includes(delivery.status)).length;
    const failed = tasks.deliveryHistory.filter((delivery) => delivery.status === "DELIVERY_FAILED").length;
    const recent = [
        ...tasks.pickups.map((task) => ({ ...task, kind: "Pickup" })),
        ...tasks.deliveries.map((task) => ({ ...task, kind: "Delivery" })),
    ].slice(0, 5);

    return (
        <section className="cw-page">
            <header className="cw-page-heading">
                <div><span className="cw-eyebrow">COURIER WORKSPACE</span><h1>{greeting}, {firstName}</h1><p>Review assignments that need your attention and recent outcomes.</p></div>
                <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
            </header>
            {error && <div className="cw-alert" role="alert">{error}<button type="button" onClick={() => void load()} disabled={loading}>Try again</button></div>}
            <div className="cw-task-metrics" aria-busy={loading}>
                <Link to="/courier/pickups" className="cw-task-metric"><span>Assigned pickups</span><strong>{loading ? "—" : tasks.pickups.length}</strong></Link>
                <Link to="/courier/deliveries" className="cw-task-metric"><span>Active deliveries</span><strong>{loading ? "—" : tasks.deliveries.length}</strong></Link>
                <Link to="/courier/history" className="cw-task-metric"><span>Completed tasks</span><strong>{loading ? "—" : completed}</strong></Link>
                <Link to="/courier/history" className="cw-task-metric"><span>Failed deliveries</span><strong>{loading ? "—" : failed}</strong></Link>
            </div>
            {!loading && !error && recent.length === 0 && (
                <div className="cw-state"><strong>No courier tasks yet</strong><p>New pickup and delivery assignments will appear here.</p></div>
            )}
            {!loading && recent.length > 0 && <>
                <h2 className="cw-section-title">Current assignments</h2>
                <div className="cw-card-list">{recent.map((task) => (
                    <article className="cw-card" key={`${task.kind}-${task.id}`}>
                        <div><span className="cw-order-number">{task.kind} · Order #{task.order?.id}</span><h2>{String(task.status || "Unknown").replaceAll("_", " ")}</h2><p>{task.kind === "Pickup" ? task.order?.items?.map((item) => item.product?.name).filter(Boolean).join(", ") || "Order items" : task.order?.delivery_address || "Delivery address unavailable"}</p></div>
                        <Link className="cw-primary-link" to={task.kind === "Pickup" ? `/courier/pickups/${task.id}` : `/courier/deliveries/${task.id}`}>Open task</Link>
                    </article>
                ))}</div>
            </>}
            <div className="cw-state cw-muted"><strong>Delivery completion requires proof.</strong><p>Open an active delivery to record the recipient’s full name and delivery photo before marking it delivered.</p></div>
        </section>
    );
}
