import { useCallback, useMemo, useState } from "react";
import { getHubStaffParcels } from "../api";
import { scanHubParcel, sortHubParcel } from "../api";
import { useHubStaffPage } from "../useHubStaffPage";
import { canSortHubParcel, formatDate, parcelCodeMatches, parcelScanPayload } from "../utils/hubStaffWorkspace";
import { PageHeading, Pagination, RecordTable, StatePanel, StatusBadge } from "../components/HubStaffUI";
import ParcelCodeCapture from "../components/ParcelCodeCapture";
import ConfirmationModal from "../components/HubStaffConfirmModal";
import useHubStaffMutation from "../useHubStaffMutation";
import useHubStaffRecentActivity from "../useHubStaffRecentActivity";
import Toast from "../../shared/components/Toast";
import HubStaffActivityPreview from "../components/HubStaffActivityPreview";
import "../components/HubStaffActions.css";

export default function Parcels() {
    const [status, setStatus] = useState("");
    const [codeInput, setCodeInput] = useState("");
    const [filters, setFilters] = useState({ status: "", parcel_code: "" });
    const [pageNumber, setPageNumber] = useState(1);
    const [selectedParcel, setSelectedParcel] = useState(null);
    const [parcelCode, setParcelCode] = useState("");
    const [scanResult, setScanResult] = useState(null);
    const [actionError, setActionError] = useState("");
    const [sortConfirmOpen, setSortConfirmOpen] = useState(false);
    const actions = useHubStaffMutation();
    const recentActivity = useHubStaffRecentActivity();
    const key = `${filters.status}|${filters.parcel_code}|${pageNumber}`;
    const loader = useCallback((hubId) => getHubStaffParcels({ ...filters, page: pageNumber, per_page: 20 }, hubId), [filters, pageNumber]);
    const result = useHubStaffPage(loader, key);
    const columns = useMemo(() => [
        { key: "parcel", label: "Parcel", render: (row) => <span className="hs-reference">{row.parcel_code || "Code unavailable"}</span> },
        { key: "order_id", label: "Order", render: (row) => <span>#{row.order_id ?? "—"}</span> },
        { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status}/> },
        { key: "area", label: "Delivery area", render: (row) => row.delivery_area?.name || "Not assigned" },
        { key: "sorted_at", label: "Sorted", render: (row) => formatDate(row.sorted_at) },
        { key: "actions", label: "Operations", render: (row) => <button type="button" className="hs-button hs-button--secondary" disabled={actions.busy} onClick={() => { setSelectedParcel(row); setParcelCode(""); setScanResult(null); setActionError(""); }}>Scan parcel</button> },
    ], [actions.busy]);
    const applyFilters = (event) => { event.preventDefault(); setPageNumber(1); setFilters({ status, parcel_code: codeInput.trim() }); };
    const recordScan = async (candidate) => {
        if (!selectedParcel || actions.busy) return;
        const code = String(candidate || "").trim().toUpperCase();
        if (!parcelCodeMatches(code, selectedParcel.parcel_code)) { setActionError("The scanned or entered code does not match the selected parcel."); return; }
        setActionError("");
        const verified = await actions.run(
            () => scanHubParcel(parcelScanPayload(code, selectedParcel.status)),
            "The backend confirmed the parcel scan.",
        );
        if (verified) {
            setScanResult(verified);
            setParcelCode(verified.parcel_code);
            result.retry();
            await recentActivity.refresh();
        }
    };
    const confirmSort = async () => {
        if (!canSortHubParcel(scanResult, selectedParcel?.parcel_code) || actions.busy) return;
        const sorted = await actions.run(
            () => sortHubParcel(scanResult.parcel_code, { expected_status: "AT_SORTING_CENTER" }),
            "The backend confirmed parcel sorting.",
        );
        if (sorted) {
            setScanResult(sorted);
            setSortConfirmOpen(false);
            result.retry();
            await recentActivity.refresh();
        }
    };

    return <>
        <PageHeading title="Parcels" description="Review parcels at your assigned hub, record a backend-verified scan, and sort eligible parcels." action={<button className="hs-button hs-button--secondary" type="button" onClick={result.retry} disabled={result.loading}>Refresh</button>} />
        <form className="hs-filter-bar" onSubmit={applyFilters}>
            <label className="hs-field">Operational status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All available statuses</option><option value="AT_SORTING_CENTER">Awaiting sorting</option><option value="SORTED">Sorted</option></select></label>
            <label className="hs-field">Parcel code<input value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Search parcel code" /></label>
            <button className="hs-button hs-button--primary" type="submit">Apply filters</button>
        </form>
        {result.error && <div className="hs-inline-error" role="alert"><strong>Parcels could not be loaded.</strong><p>{result.errorMessage}</p><button className="hs-button hs-button--secondary" type="button" onClick={result.retry}>Retry</button></div>}
        {result.loading && !result.data ? <StatePanel kind="loading" title="Loading parcels" busy><p>Showing parcels assigned to this hub only.</p></StatePanel> : result.data && (result.data.rows.length ? <><RecordTable columns={columns} rows={result.data.rows} rowKey={(row) => row.id}/><Pagination pagination={result.data.pagination} busy={result.loading} onPageChange={setPageNumber}/></> : <StatePanel title="No parcels found"><p>Try changing the status or parcel-code filter, or check again later.</p></StatePanel>)}
        {selectedParcel && <section className="hs-operation-card hs-selected-transfer"><div className="hs-action-toolbar"><div><h2>Parcel operation</h2><p>{selectedParcel.parcel_code} · Order #{selectedParcel.order_id} · <StatusBadge status={scanResult?.status || selectedParcel.status}/></p></div><button className="hs-button hs-button--secondary" type="button" disabled={actions.busy} onClick={() => { setSelectedParcel(null); setScanResult(null); setActionError(""); }}>Close</button></div><ParcelCodeCapture code={parcelCode} onCodeChange={(value) => { setParcelCode(value); setActionError(""); }} onVerify={recordScan} submitLabel={actions.busy ? "Recording scan..." : "Record verified scan"} busy={actions.busy} title="Scan selected parcel" />{actionError && <p className="hs-inline-error" role="alert">{actionError}</p>}{scanResult && <div className="hs-scan-confirmed" role="status"><StatusBadge status={scanResult.status}/> Backend scan event recorded at {scanResult.current_hub?.name || "your assigned hub"}.</div>}{canSortHubParcel(scanResult, selectedParcel.parcel_code) && <button className="hs-button hs-button--primary" type="button" disabled={actions.busy} onClick={() => setSortConfirmOpen(true)}>Sort parcel</button>}{scanResult?.status === "SORTED" && <p className="hs-operation-history-note">This parcel is already sorted. No further Hub Staff sorting action is available.</p>}</section>}
        {scanResult && <HubStaffActivityPreview {...recentActivity}/>}
        <ConfirmationModal open={sortConfirmOpen} title="Confirm parcel sorting?" description={scanResult ? "Confirm sorting parcel " + scanResult.parcel_code + " at " + (scanResult.current_hub?.name || "your assigned hub") + ". The backend will recheck the scan, parcel status, custody, and delivery-area mapping." : ""} confirmLabel="Confirm sorting" busy={actions.busy} onCancel={() => setSortConfirmOpen(false)} onConfirm={() => void confirmSort()} />
        <Toast message={actions.toast?.message} type={actions.toast?.type} onDismiss={actions.dismissToast}/>
    </>;
}
