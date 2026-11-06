import { useCallback, useEffect, useState } from "react";
import api from "../../shared/services/api";
import { logisticsExportKey, logisticsReportParams, unwrapLogisticsReport } from "../utils/logisticsReports.js";
import "./ParcelOperations.css";
import "./Reports.css";

const REPORTS = [
    { key: "deliveries_created_by_current_status", title: "Delivery records created by current status", note: "Period is based on delivery record creation; rows are grouped by each record's current status." },
    { key: "current_delivery_records_by_hub", title: "Current delivery records associated with hubs", note: "Current snapshot from each delivery's current_hub_id, including inactive hubs; not a verified physical stock count and not date-filtered." },
    { key: "transfers_created_by_route_and_status", title: "Transfers by route and current status", note: "Period is based on transfer creation. An arrived transfer is completed only after destination receipt." },
    { key: "events_recorded_by_type", title: "Recorded parcel events", note: "Period uses the event's recorded timestamp. Events with no actor remain included without an attributed name." },
];

export default function Reports() {
    const [period, setPeriod] = useState("last_7_days");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState("");
    const customRangeValid = period !== "custom" || (!!from && !!to && from <= to);
    const load = useCallback(async (signal) => {
        if (period === "custom" && (!from || !to || from > to)) {
            setLoading(false);
            setError(!from || !to ? "Choose both a start date and an end date for a custom range." : "The start date must be on or before the end date.");
            return;
        }
        setLoading(true); setError("");
        try {
            const params = logisticsReportParams(period, from, to);
            const response = await api.get("/logistics/dashboard", { params, signal });
            setData(unwrapLogisticsReport(response));
        } catch (err) {
            if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
                setData(null);
                setError(err.response?.data?.message || "Logistics reports could not be loaded.");
            }
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [period, from, to]);
    useEffect(() => { const controller = new AbortController(); const timer = window.setTimeout(() => void load(controller.signal), 0); return () => { window.clearTimeout(timer); controller.abort(); }; }, [load]);
    const exportCsv = async (report) => {
        if (period === "custom" && (!from || !to || from > to)) {
            setError(!from || !to ? "Choose both a start date and an end date before exporting." : "The start date must be on or before the end date.");
            return;
        }
        setExporting(report);
        try {
            const response = await api.get("/logistics/reports/export", { params: { report, ...logisticsReportParams(period, from, to) }, responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement("a"); anchor.href = url; anchor.download = `logistics-${report}-report.csv`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) { setError(err.response?.data?.message || "CSV export failed."); }
        finally { setExporting(""); }
    };
    const reports = data?.reports;
    return <section className="lo-page" aria-busy={loading}>
        <header className="lw-page-heading"><div><span className="lw-eyebrow">OPERATIONAL REPORTS</span><h1>Logistics reports</h1><p>Aggregates from delivery, transfer, and recorded parcel-event data.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></header>
        <section className="lo-panel lo-filter-panel"><h2>Reporting period</h2><div className="lo-report-filters"><label>Period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="today">Today</option><option value="last_7_days">Last 7 days</option><option value="last_30_days">Last 30 days</option><option value="custom">Custom range</option><option value="all">All available records</option></select></label>{period === "custom" && <><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></>}</div>{data && <p>Showing {data.period.from || "all available dates"}{data.period.to ? ` through ${data.period.to}` : ""}.</p>}</section>
        {error && <div className="lw-alert" role="alert">{error}<button type="button" onClick={() => void load()} disabled={loading}>Retry</button></div>}
        {loading && !reports && <p className="lw-empty" role="status">Loading reports…</p>}
        {loading && reports && <p className="lo-refresh-status" role="status">Updating reports; the previous results remain visible.</p>}
        {reports && customRangeValid && REPORTS.map(({ key, title, note }) => { const rows = reports[key] || []; const exportKey = logisticsExportKey(key); return <section className="lo-panel" key={key}><div className="lo-panel-heading"><div><h2>{title}</h2><p>{note}</p></div><button type="button" disabled={!!exporting || loading || !customRangeValid} onClick={() => void exportCsv(exportKey)}>{exporting ? "Exporting…" : "Export CSV"}</button></div>{rows.length ? <div className="lo-table-wrap"><table className="lo-table"><thead><tr>{key === "deliveries_created_by_current_status" ? <><th>Current status</th><th>Records created in period</th></> : key === "current_delivery_records_by_hub" ? <><th>Hub</th><th>State</th><th>Recorded associations</th></> : key === "transfers_created_by_route_and_status" ? <><th>Origin</th><th>Destination</th><th>Current status</th><th>Transfers created in period</th></> : <><th>Event type</th><th>Events in period</th></>}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.status || row.event_type || row.id}-${index}`}>{key === "deliveries_created_by_current_status" ? <><td>{row.status}</td><td>{row.total}</td></> : key === "current_delivery_records_by_hub" ? <><td>{row.name}</td><td>{row.is_active ? "Active" : "Inactive"}</td><td>{row.deliveries_count}</td></> : key === "transfers_created_by_route_and_status" ? <><td>{row.from_hub || "Unavailable"}</td><td>{row.to_hub || "Unavailable"}</td><td>{row.status}</td><td>{row.total}</td></> : <><td>{row.event_type}</td><td>{row.total}</td></>}</tr>)}</tbody></table></div> : <p className="lw-empty">No records match this report and period.</p>}</section>; })}
        {!loading && <p className="lw-footnote">Current data does not record a dedicated departure actor or departure event for return transfers. This limitation is not inferred or filled in by these reports.</p>}
    </section>;
}
