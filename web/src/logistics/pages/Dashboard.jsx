import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, PackageCheck, Boxes, Truck, CircleCheck, TriangleAlert } from "lucide-react";
import api from "../../shared/services/api";
import "./LogisticsPages.css";

const METRICS = [
    { key: "pickups_awaiting_assignment", label: "Pickups awaiting assignment", icon: ClipboardList, to: "/logistics/pickups" },
    { key: "incoming_parcels", label: "Incoming parcels", icon: PackageCheck, to: "/logistics/incoming-parcels" },
    { key: "parcels_awaiting_sorting", label: "Parcels awaiting sorting", icon: Boxes, to: "/logistics/sorting" },
    { key: "parcels_ready_for_dispatch", label: "Ready for dispatch", icon: Truck, to: "/logistics/delivery-assignment" },
    { key: "deliveries_in_progress", label: "Deliveries in progress", icon: Truck, to: "/logistics/delivery-monitoring" },
    { key: "completed_deliveries", label: "Completed deliveries", icon: CircleCheck, to: "/logistics/delivery-monitoring" },
    { key: "failed_deliveries", label: "Failed deliveries", icon: TriangleAlert, to: "/logistics/delivery-monitoring" },
];

const isMetricPayload = (data) => data?.success === true
    && data.data
    && METRICS.every(({ key }) => Number.isSafeInteger(data.data[key]) && data.data[key] >= 0);

export default function Dashboard() {
    const [firstName] = useState(() => {
        try { return JSON.parse(localStorage.getItem("user") || "null")?.first_name || "there"; }
        catch { return "there"; }
    });
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const { data } = await api.get("/logistics/dashboard");
            if (!isMetricPayload(data)) throw new Error("The logistics dashboard returned an invalid response.");
            setCounts(data.data);
        } catch (err) {
            setCounts(null);
            setError(err.response?.data?.message || err.message || "The logistics dashboard is unavailable.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    const hasActivity = counts && METRICS.some(({ key }) => Number(counts[key]) > 0);
    const hour = Number(new Intl.DateTimeFormat("en-PH", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Manila" }).format(new Date()));
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const today = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: "Asia/Manila" }).format(new Date());

    return (
        <section className="lw-page">
            <header className="lw-page-heading">
                <div><span className="lw-eyebrow">{today}</span><h1>{greeting}, {firstName}</h1><p>Here’s your logistics overview. Select a count to open its work queue.</p></div>
                <button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
            </header>
            {error && <div className="lw-alert" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} disabled={loading}>Retry</button></div>}
            {!error && !loading && counts && !hasActivity && <div className="lw-empty" role="status">No logistics activity is currently recorded.</div>}
            <div className="lw-metrics" aria-busy={loading}>
                {METRICS.map(({ key, label, icon: Icon, to }) => (
                    <Link className="lw-metric" key={key} to={to} aria-label={`${label}: ${loading ? "loading" : counts ? counts[key] : "unavailable"}. Open ${label.toLowerCase()} queue`}>
                        <span className="lw-metric-icon"><Icon size={19} aria-hidden="true" /></span>
                        <span>{label}</span>
                        <strong>{loading ? "—" : counts ? counts[key] : "Unavailable"}</strong>
                        <span className="lw-metric-link">Open queue <span aria-hidden="true">→</span></span>
                    </Link>
                ))}
            </div>
            <p className="lw-footnote">Pickups awaiting assignment are derived from seller orders marked ready for pickup.</p>
        </section>
    );
}
