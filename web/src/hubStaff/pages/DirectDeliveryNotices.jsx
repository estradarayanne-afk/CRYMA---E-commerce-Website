import { useCallback, useEffect, useState } from "react";
import { Truck, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { getDirectDeliveryNotices } from "../api";
import { useHubStaffWorkspace } from "../HubStaffWorkspaceContext";
import { formatDate } from "../utils/hubStaffWorkspace";
import { PageHeading, StatePanel } from "../components/HubStaffUI";

export default function DirectDeliveryNotices() {
    const { hub } = useHubStaffWorkspace();
    const [noticesData, setNoticesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchDirectDeliveries = useCallback(async () => {
        try {
            setError("");
            const response = await getDirectDeliveryNotices(
                { page: 1, per_page: 50 },
                hub.id
            );
            setNoticesData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to load direct deliveries:", err);
            setError("Direct delivery notices could not be loaded. Try refreshing.");
        } finally {
            setLoading(false);
        }
    }, [hub.id]);

    useEffect(() => {
        fetchDirectDeliveries();
        const interval = setInterval(fetchDirectDeliveries, 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchDirectDeliveries]);

    const getStatusColor = (status) => {
        const statusMap = {
            "OUT_FOR_DELIVERY": "pending",
            "DELIVERED": "success",
            "COMPLETED": "success",
            "DELIVERY_FAILED": "error",
        };
        return statusMap[status] || "pending";
    };

    const getStatusLabel = (status) => {
        const labels = {
            "OUT_FOR_DELIVERY": "Out for Delivery",
            "DELIVERED": "Delivered",
            "COMPLETED": "Completed",
            "DELIVERY_FAILED": "Failed",
            "ASSIGNED_TO_RIDER": "Assigned",
        };
        return labels[status] || status;
    };

    const getRequestStatusBadge = (requestStatus) => {
        const badges = {
            "pending": { label: "Pending", icon: Clock, color: "#F59E0B" },
            "accepted": { label: "Accepted", icon: CheckCircle2, color: "#10B981" },
            "rejected": { label: "Rejected", icon: AlertCircle, color: "#EF4444" },
        };
        return badges[requestStatus] || { label: requestStatus, icon: Truck, color: "#6B7280" };
    };

    return (
        <>
            <PageHeading
                eyebrow="Direct Delivery Tracking"
                title="Direct Delivery Notices"
                description="Track direct deliveries assigned to riders for commission accountability."
            />

            {error && (
                <div className="hs-inline-error" role="alert">
                    <strong>Could not load direct deliveries.</strong>
                    <p>{error}</p>
                    <button
                        className="hs-button hs-button--secondary"
                        type="button"
                        onClick={fetchDirectDeliveries}
                    >
                        Retry
                    </button>
                </div>
            )}

            {loading && !noticesData ? (
                <StatePanel kind="loading" title="Loading direct deliveries" busy>
                    <p>Retrieving direct delivery notices for your hub.</p>
                </StatePanel>
            ) : noticesData && noticesData.data?.length ? (
                <div className="hs-content-stack">
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: "#F3F4F6",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                    }}>
                        <span>
                            <strong>{noticesData.data.length}</strong> direct deliveries
                        </span>
                        <span style={{ color: "#6B7280" }}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    </div>

                    <div style={{ display: "grid", gap: "1rem" }}>
                        {noticesData.data.map((notice) => {
                            const statusBadge = getRequestStatusBadge(
                                notice.delivery_requests?.[0]?.status || "pending"
                            );
                            const StatusIcon = statusBadge.icon;

                            return (
                                <div
                                    key={notice.id}
                                    style={{
                                        border: "1px solid #E5E7EB",
                                        borderRadius: "0.5rem",
                                        padding: "1rem",
                                        backgroundColor: "#FFFFFF",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: "1rem",
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        {/* Rider & Order Info */}
                                        <div>
                                            <div style={{ marginBottom: "0.5rem" }}>
                                                <label style={{
                                                    display: "block",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "600",
                                                    color: "#6B7280",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    Rider
                                                </label>
                                                <strong style={{ fontSize: "1.1rem" }}>
                                                    {notice.rider?.name || "Unknown Rider"}
                                                </strong>
                                            </div>
                                            <div>
                                                <label style={{
                                                    display: "block",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "600",
                                                    color: "#6B7280",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    Order ID
                                                </label>
                                                <span>#{notice.order_id}</span>
                                            </div>
                                        </div>

                                        {/* Buyer & Location */}
                                        <div>
                                            <div style={{ marginBottom: "0.5rem" }}>
                                                <label style={{
                                                    display: "block",
                                                    fontSize: "0.75rem",
                                                    fontWeight: "600",
                                                    color: "#6B7280",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                }}>
                                                    Buyer Location
                                                </label>
                                                <strong style={{ fontSize: "1rem" }}>
                                                    {notice.buyer_location || "Unknown"}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timestamps & Status */}
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr 1fr",
                                            gap: "1rem",
                                            borderTop: "1px solid #E5E7EB",
                                            paddingTop: "1rem",
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: "0.25rem",
                                            }}>
                                                Direct Choice Time
                                            </label>
                                            <span style={{ fontSize: "0.875rem" }}>
                                                {formatDate(notice.direct_choice_timestamp)}
                                            </span>
                                        </div>
                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: "0.25rem",
                                            }}>
                                                Commission Amount
                                            </label>
                                            <strong>
                                                ₱{notice.commission_amount?.toLocaleString() || "0.00"}
                                            </strong>
                                        </div>
                                        <div>
                                            <label style={{
                                                display: "block",
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: "0.25rem",
                                            }}>
                                                Status
                                            </label>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    padding: "0.25rem 0.75rem",
                                                    backgroundColor:
                                                        getStatusColor(notice.confirmation_status) === "success"
                                                            ? "#DBEAFE"
                                                            : getStatusColor(notice.confirmation_status) === "error"
                                                            ? "#FEE2E2"
                                                            : "#FEF3C7",
                                                    color:
                                                        getStatusColor(notice.confirmation_status) === "success"
                                                            ? "#1E40AF"
                                                            : getStatusColor(notice.confirmation_status) === "error"
                                                            ? "#991B1B"
                                                            : "#92400E",
                                                    borderRadius: "0.25rem",
                                                    fontSize: "0.875rem",
                                                    fontWeight: "500",
                                                }}
                                            >
                                                {getStatusLabel(notice.confirmation_status)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Request History */}
                                    {notice.delivery_requests?.length > 0 && (
                                        <div style={{ marginTop: "1rem" }}>
                                            <label style={{
                                                display: "block",
                                                fontSize: "0.75rem",
                                                fontWeight: "600",
                                                color: "#6B7280",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.5px",
                                                marginBottom: "0.5rem",
                                            }}>
                                                Request History
                                            </label>
                                            <div style={{ display: "grid", gap: "0.5rem" }}>
                                                {notice.delivery_requests.map((req, idx) => {
                                                    const reqBadge = getRequestStatusBadge(req.status);
                                                    const ReqIcon = reqBadge.icon;
                                                    return (
                                                        <div
                                                            key={idx}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.5rem",
                                                                fontSize: "0.875rem",
                                                                padding: "0.5rem",
                                                                backgroundColor: "#F9FAFB",
                                                                borderRadius: "0.25rem",
                                                            }}
                                                        >
                                                            <ReqIcon
                                                                size={16}
                                                                color={reqBadge.color}
                                                            />
                                                            <span>
                                                                Request <strong>{reqBadge.label}</strong> on{" "}
                                                                {formatDate(req.created_at)}
                                                            </span>
                                                            {req.expires_at && (
                                                                <span style={{ color: "#6B7280" }}>
                                                                    (expires {formatDate(req.expires_at)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : !loading ? (
                <StatePanel kind="empty" title="No direct deliveries">
                    <p>No direct delivery notices for your hub at this time.</p>
                </StatePanel>
            ) : null}
        </>
    );
}
