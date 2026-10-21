import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../shared/services/api";
import "../layouts/CourierPages.css";

export default function Dashboard() {
    const [counts, setCounts] = useState({ pickups: 0, deliveries: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        Promise.all([api.get("/courier/pickups"), api.get("/courier/deliveries")]).then(([pickups, deliveries]) => {
            if (active) setCounts({ pickups: pickups.data?.data?.length || 0, deliveries: deliveries.data?.data?.length || 0 });
        }).catch((err) => { if (active) setError(err.response?.data?.message || "Courier overview is unavailable."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);
    return <section className="cw-page"><span className="cw-eyebrow">COURIER WORKSPACE</span><h1 className="cw-dashboard-title">Logistics overview</h1><p className="cw-intro">Your pickup and delivery assignments from the CRYMA logistics workflow.</p>{error && <div className="cw-alert" role="alert">{error}</div>}<div className="cw-summary"><span>Active seller pickups</span><strong>{loading ? "—" : counts.pickups}</strong><Link to="/courier/pickups">View pickups</Link></div><div className="cw-summary"><span>Active buyer deliveries</span><strong>{loading ? "—" : counts.deliveries}</strong><Link to="/courier/deliveries">View deliveries</Link></div><div className="cw-state cw-muted"><strong>Updates are recorded against each parcel with an actor and timestamp.</strong><p>GPS tracking and delivery notifications are not part of the current workflow.</p></div></section>;
}
