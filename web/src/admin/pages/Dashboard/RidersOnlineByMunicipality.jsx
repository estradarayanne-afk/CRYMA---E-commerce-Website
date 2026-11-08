import { useEffect, useState } from "react";
import api from "../../../shared/services/api";

const RidersOnlineByMunicipality = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRidersOnline = async () => {
        try {
            setError("");
            const response = await api.get("/admin/riders-online-by-municipality");
            if (response.data.success) {
                setData(response.data.data);
                setLastUpdated(new Date());
            } else {
                setError("Failed to load rider data");
            }
        } catch (err) {
            console.error("Failed to fetch riders online:", err);
            setError("Could not load rider online data. Try refreshing the dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRidersOnline();
        const interval = setInterval(fetchRidersOnline, 60000); // Auto-refresh every 60 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        const colors = {
            green: { background: "#DBEAFE", text: "#065F46", borderLeft: "#059669" },
            yellow: { background: "#FEF3C7", text: "#92400E", borderLeft: "#F59E0B" },
            red: { background: "#FEE2E2", text: "#991B1B", borderLeft: "#EF4444" },
        };
        return colors[status] || colors.red;
    };

    return (
        <article className="dashboard-panel">
            <div className="dashboard-panel-header">
                <div>
                    <span className="panel-eyebrow">LOGISTICS OPERATIONS</span>
                    <h2>Riders Online by Municipality</h2>
                    <p>Real-time count of available riders across service areas.</p>
                </div>
                <button
                    type="button"
                    className="panel-link"
                    onClick={fetchRidersOnline}
                    disabled={loading}
                    style={{ opacity: loading ? 0.5 : 1 }}
                >
                    ↻ Refresh
                </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
                {error && (
                    <div
                        style={{
                            padding: "1rem",
                            backgroundColor: "#FEE2E2",
                            color: "#991B1B",
                            borderRadius: "0.375rem",
                            marginBottom: "1rem",
                            fontSize: "0.875rem",
                        }}
                    >
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {loading && !data ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6B7280" }}>
                        Loading rider availability data...
                    </div>
                ) : data ? (
                    <>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "1.5rem",
                                paddingBottom: "1rem",
                                borderBottom: "1px solid #E5E7EB",
                            }}
                        >
                            <div>
                                <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                                    Total Online
                                </span>
                                <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1F2937" }}>
                                    {data.total_online || 0}
                                </div>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                                Last updated:{" "}
                                {lastUpdated
                                    ? lastUpdated.toLocaleTimeString()
                                    : "Never"}
                            </div>
                        </div>

                        {data.municipalities && data.municipalities.length > 0 ? (
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                {data.municipalities.map((item, idx) => {
                                    const colors = getStatusColor(item.status);
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "1rem",
                                                backgroundColor: colors.background,
                                                borderLeft: `4px solid ${colors.borderLeft}`,
                                                borderRadius: "0.375rem",
                                            }}
                                        >
                                            <span style={{ color: colors.text }}>
                                                <strong>{item.municipality}</strong>
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "1.25rem",
                                                    fontWeight: "bold",
                                                    color: colors.text,
                                                }}
                                            >
                                                {item.online_count} rider{item.online_count !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "2rem",
                                    color: "#6B7280",
                                    backgroundColor: "#F9FAFB",
                                    borderRadius: "0.375rem",
                                }}
                            >
                                No riders online at this time.
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </article>
    );
};

export default RidersOnlineByMunicipality;
