import { useCallback, useMemo, useState } from "react";
import { BadgeCheck, UserRound } from "lucide-react";
import { getHubStaffOutgoingTransfers, releaseOutgoingTransfer } from "../api";
import { useHubStaffWorkspace } from "../HubStaffWorkspaceContext";
import { useHubStaffPage } from "../useHubStaffPage";
import useHubStaffMutation from "../useHubStaffMutation";
import useHubStaffRecentActivity from "../useHubStaffRecentActivity";
import { formatDate, parcelCodeMatches, parcelCodePayload } from "../utils/hubStaffWorkspace";
import { PageHeading, Pagination, RecordTable, StatePanel, StatusBadge } from "../components/HubStaffUI";
import ParcelCodeCapture from "../components/ParcelCodeCapture";
import ConfirmationModal from "../components/HubStaffConfirmModal";
import Toast from "../../shared/components/Toast";
import HubStaffActivityPreview from "../components/HubStaffActivityPreview";
import "../components/HubStaffActions.css";

export default function OutgoingTransfers() {
    const { hub } = useHubStaffWorkspace();
    const [pageNumber, setPageNumber] = useState(1);
    const [selected, setSelected] = useState(null);
    const [code, setCode] = useState("");
    const [verifiedCode, setVerifiedCode] = useState("");
    const [actionError, setActionError] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [releaseResult, setReleaseResult] = useState(null);
    const actions = useHubStaffMutation();
    const recentActivity = useHubStaffRecentActivity();
    const loader = useCallback((hubId) => getHubStaffOutgoingTransfers({ page: pageNumber, per_page: 20 }, hubId), [pageNumber]);
    const result = useHubStaffPage(loader, "outgoing:" + pageNumber);
    const columns = useMemo(() => [
        { key: "id", label: "Transfer", render: (row) => <strong>#{row.id}</strong> },
        { key: "parcel", label: "Parcel", render: (row) => <span><span className="hs-reference">{row.parcel?.parcel_code || "Code unavailable"}</span><br/>Order #{row.parcel?.order_id || "—"}</span> },
        { key: "destination", label: "Destination hub", render: (row) => row.destination_hub?.name ? row.destination_hub.name + " (" + row.destination_hub.code + ")" : "Not recorded" },
        { key: "rider", label: "Assigned Rider", render: (row) => row.assigned_rider?.name ? <span className="hs-outgoing-rider"><UserRound size={15}/>{row.assigned_rider.name}</span> : "Rider unavailable" },
        { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status}/> },
        { key: "action", label: "Action", render: (row) => <button className="hs-button hs-button--secondary" type="button" disabled={actions.busy || !row.assigned_rider || !row.parcel?.parcel_code} onClick={() => { setSelected(row); setCode(""); setVerifiedCode(""); setActionError(""); setReleaseResult(null); }}>Record release</button> },
    ], [actions.busy]);

    const verifyParcel = (candidate) => {
        if (!selected) return;
        if (!parcelCodeMatches(candidate, selected.parcel?.parcel_code)) {
            setVerifiedCode("");
            setActionError("The scanned or entered parcel code does not match this outgoing transfer.");
            return;
        }
        const normalized = String(candidate).trim().toUpperCase();
        setCode(normalized);
        setVerifiedCode(normalized);
        setActionError("");
    };

    const confirmRelease = async () => {
        if (!selected || !verifiedCode || actions.busy) return;
        const completed = await actions.run(
            () => releaseOutgoingTransfer(selected.id, parcelCodePayload(verifiedCode)),
            "Hub Staff physical release was recorded. The transfer remains assigned until the Rider confirms collection.",
        );
        if (completed) {
            setReleaseResult(completed);
            setConfirmOpen(false);
            setSelected(null);
            setVerifiedCode("");
            result.retry();
            await recentActivity.refresh();
        }
    };

    return <>
        <PageHeading title="Outgoing handoffs" description="Record physical release of eligible forward transfers to their assigned Rider. Rider collection is confirmed separately by the Rider." action={<button className="hs-button hs-button--secondary" type="button" onClick={result.retry} disabled={result.loading}>Refresh</button>} />
        <p className="hs-operation-history-note">Only unreleased forward transfers from {hub.name} with an eligible assigned Rider and parcel still in origin custody are listed. Releasing a parcel does not dispatch it or mark it in transit.</p>
        {result.error && <div className="hs-inline-error" role="alert"><strong>Outgoing transfers could not be loaded.</strong><p>{result.errorMessage}</p><button className="hs-button hs-button--secondary" type="button" onClick={result.retry}>Retry</button></div>}
        {result.loading && !result.data ? <StatePanel kind="loading" title="Loading outgoing handoffs" busy><p>Checking transfers assigned to your hub.</p></StatePanel> : result.data && (result.data.rows.length ? <><RecordTable columns={columns} rows={result.data.rows} rowKey={(row) => row.id}/><Pagination pagination={result.data.pagination} busy={result.loading} onPageChange={setPageNumber}/></> : <StatePanel title="No outgoing handoffs awaiting release"><p>There are no eligible forward transfers awaiting Hub Staff release at this hub.</p></StatePanel>)}
        {selected && <section className="hs-operation-card hs-selected-transfer"><div className="hs-action-toolbar"><div><h2>Release transfer #{selected.id}</h2><p>{selected.origin_hub?.name || hub.name} to {selected.destination_hub?.name || "destination unavailable"} · <StatusBadge status={selected.status}/></p></div><button className="hs-button hs-button--secondary" type="button" disabled={actions.busy} onClick={() => setSelected(null)}>Close</button></div><div className="hs-confirm-summary"><dl><div><dt>Parcel</dt><dd className="hs-reference">{selected.parcel?.parcel_code}</dd></div><div><dt>Order</dt><dd>#{selected.parcel?.order_id}</dd></div><div><dt>Assigned Rider</dt><dd>{selected.assigned_rider?.name || "Not available"}</dd></div><div><dt>Transfer state</dt><dd><StatusBadge status={selected.status}/></dd></div></dl><p>This action records physical release at the origin hub only. The assigned Rider must independently confirm collection before the transfer becomes in transit.</p></div><ParcelCodeCapture code={code} onCodeChange={(value) => { setCode(value); setVerifiedCode(""); setActionError(""); }} onVerify={verifyParcel} submitLabel="Verify parcel code" busy={actions.busy} title="Scan parcel for physical release"/>{actionError && <p className="hs-inline-error" role="alert">{actionError}</p>}{verifiedCode && <div className="hs-scan-confirmed" role="status"><BadgeCheck size={17}/> Parcel code matches transfer #{selected.id}. The backend will verify custody again.</div>}{verifiedCode && <button className="hs-button hs-button--primary" type="button" disabled={actions.busy} onClick={() => setConfirmOpen(true)}>Confirm physical release</button>}</section>}
        {releaseResult && <section className="hs-operation-success" role="status"><BadgeCheck size={22}/><div><h3>Physical release recorded</h3><p>Transfer #{releaseResult.id} remains <StatusBadge status={releaseResult.status}/> and is awaiting Rider collection confirmation.</p><small>Release time: {formatDate(releaseResult.hub_released_at)} · Rider collection confirmed: {releaseResult.rider_collection_confirmed ? "Yes" : "No"}</small></div></section>}
        {releaseResult && <HubStaffActivityPreview {...recentActivity}/>}
        <ConfirmationModal open={confirmOpen} title="Confirm physical release?" description={selected ? "Confirm that parcel " + verifiedCode + " has been physically handed to " + (selected.assigned_rider?.name || "the assigned Rider") + " at " + hub.name + ". This records Hub Staff release only; the Rider must separately confirm collection." : ""} confirmLabel="Record release" busy={actions.busy} onCancel={() => setConfirmOpen(false)} onConfirm={() => void confirmRelease()} />
        <Toast message={actions.toast?.message} type={actions.toast?.type} onDismiss={actions.dismissToast}/>
    </>;
}
