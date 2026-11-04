export function logisticsReportParams(period, from, to) {
    return { period, ...(period === "custom" ? { from, to } : {}) };
}

export function logisticsExportKey(section) {
    if (section === "deliveries_created_by_current_status") return "parcels";
    if (section === "current_delivery_records_by_hub") return "hubs";
    if (section === "transfers_created_by_route_and_status") return "transfers";
    if (section === "events_recorded_by_type") return "events";
    throw new Error("Unsupported logistics report.");
}

export function unwrapLogisticsReport(response) {
    const data = response?.data?.data;
    if (response?.data?.success !== true || !data?.reports || !data?.period) {
        throw new Error("The reports response is invalid.");
    }
    return data;
}
