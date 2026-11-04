import { useCallback, useMemo, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { getHubStaffIncomingTransfers, receiveIncomingTransfer } from "../api";
import { useHubStaffPage } from "../useHubStaffPage";
import { formatDate, parcelCodeMatches, parcelCodePayload } from "../utils/hubStaffWorkspace";
import { PageHeading, Pagination, RecordTable, StatePanel, StatusBadge } from "../components/HubStaffUI";
import ParcelCodeCapture from "../components/ParcelCodeCapture";
import ConfirmationModal from "../components/HubStaffConfirmModal";
import useHubStaffMutation from "../useHubStaffMutation";
import useHubStaffRecentActivity from "../useHubStaffRecentActivity";
import Toast from "../../shared/components/Toast";
import HubStaffActivityPreview from "../components/HubStaffActivityPreview";
import "../components/HubStaffActions.css";

export default function IncomingTransfers() {
    const [pageNumber, setPageNumber] = useState(1);
    const [selected, setSelected] = useState(null);
    const [code, setCode] = useState("");
    const [verifiedCode, setVerifiedCode] = useState("");
    const [actionError, setActionError] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const actions = useHubStaffMutation();
    const recentActivity = useHubStaffRecentActivity();
    const loader = useCallback((hubId) => getHubStaffIncomingTransfers({ page: pageNumber, per_page: 20 }, hubId), [pageNumber]);
    const result = useHubStaffPage(loader, `incoming:${pageNumber}`);
    const columns = useMemo(() => [
        { key: "id", label: "Transfer", render: (row) => <strong>#{row.id}</strong> },
        { key: "parcel", label: "Parcel", render: (row) => <span className="hs-reference">{row.parcel?.parcel_code || "Code unavailable"}</span> },
        { key: "origin", label: "Origin hub", render: (row) => row.origin_hub?.name ? `${row.origin_hub.name} (${row.origin_hub.code})` : "Not recorded" },
        { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status}/> },
        { key: "departed_at", label: "Departed", render: (row) => formatDate(row.departed_at) },
        { key: "action", label: "Action", render: (row) => <button className="hs-button hs-button--secondary" type="button" disabled={actions.busy} onClick={() => { setSelected(row); setCode(""); setVerifiedCode(""); setActionError(""); setReceipt(null); }}>Verify receipt</button> },
    ], [actions.busy]);
    const verifyTransferCode = (candidate) => {
        if (!selected) return;
        if (!parcelCodeMatches(candidate, selected.parcel?.parcel_code)) {
            setVerifiedCode("");
            setActionError("The scanned or entered parcel code does not match this transfer.");
            return;
        }
        setCode(String(candidate).trim().toUpperCase());
        setVerifiedCode(String(candidate).trim().toUpperCase());
        setActionError("");
    };
    const confirmReceipt = async () => {
        if (!selected || !verifiedCode || actions.busy) return;
        const completed = await actions.run(
            () => receiveIncomingTransfer(selected.id, parcelCodePayload(verifiedCode)),
            "Destination receipt was confirmed by the backend.",
        );
        if (completed) {
            setReceipt(completed);
            setConfirmOpen(false);
            setSelected(null);
            setVerifiedCode("");
            result.retry();
            await recentActivity.refresh();
        }
    };
    return <>
        <PageHeading title="Incoming transfers" description="QR-verify forward delivery transfers in transit to your assigned hub. Return shipments are excluded." action={<button className="hs-button hs-button--secondary" type="button" onClick={result.retry} disabled={result.loading}>Refresh</button>} />
        {result.error && <div className="hs-inline-error" role="alert"><strong>Incoming transfers could not be loaded.</strong><p>{result.errorMessage}</p><button className="hs-button hs-button--secondary" type="button" onClick={result.retry}>Retry</button></div>}
        {result.loading && !result.data ? <StatePanel kind="loading" title="Loading incoming transfers" busy><p>Checking transfers addressed to this hub.</p></StatePanel> : result.data && (result.data.rows.length ? <><RecordTable columns={columns} rows={result.data.rows} rowKey={(row) => row.id}/><Pagination pagination={result.data.pagination} busy={result.loading} onPageChange={setPageNumber}/></> : <StatePanel title="No incoming transfers"><p>There are no forward transfers currently in transit to this hub.</p></StatePanel>)}
        {receipt && <section className="hs-operation-success" role="status"><BadgeCheck size={22}/><div><h3>Destination receipt confirmed</h3><p>Transfer #{receipt.transfer_id} for parcel {receipt.parcel_code} was received at {receipt.hub?.name || "your assigned hub"}.</p><small>Backend transfer status: {receipt.status}</small></div></section>}
        {receipt && <HubStaffActivityPreview {...recentActivity}/>}
        {selected && <section className="hs-operation-card hs-selected-transfer"><div className="hs-action-toolbar"><div><h2>Verify incoming transfer #{selected.id}</h2><p>{selected.origin_hub?.name || "Origin not recorded"} to your assigned hub · <StatusBadge status={selected.status}/></p></div><button className="hs-button hs-button--secondary" type="button" disabled={actions.busy} onClick={() => setSelected(null)}>Close</button></div><div className="hs-confirm-summary"><dl><div><dt>Expected parcel</dt><dd className="hs-reference">{selected.parcel?.parcel_code || "Not available"}</dd></div><div><dt>Parcel status</dt><dd><StatusBadge status={selected.parcel?.status}/></dd></div><div><dt>Origin hub</dt><dd>{selected.origin_hub?.name || "Not recorded"}</dd></div><div><dt>Assigned destination</dt><dd>{result.data?.hub?.name} ({result.data?.hub?.code})</dd></div></dl></div><ParcelCodeCapture code={code} onCodeChange={(value) => { setCode(value); setVerifiedCode(""); setActionError(""); }} onVerify={verifyTransferCode} submitLabel="Verify parcel code" busy={actions.busy} title="Scan incoming transfer parcel"/>{actionError && <p className="hs-inline-error" role="alert">{actionError}</p>}{verifiedCode && <div className="hs-scan-confirmed" role="status"><BadgeCheck size={17}/> Parcel code matches this incoming transfer. Backend QR validation still applies.</div>}{verifiedCode && <button className="hs-button hs-button--primary" type="button" disabled={actions.busy} onClick={() => setConfirmOpen(true)}>Confirm destination receipt</button>}</section>}
        <ConfirmationModal open={confirmOpen} title="Confirm destination receipt?" description={selected ? "Confirm that parcel " + verifiedCode + " has physically arrived at " + (result.data?.hub?.name || "your assigned hub") + ". The backend will verify the transfer, QR code, and current custody." : ""} confirmLabel="Confirm receipt" busy={actions.busy} onCancel={() => setConfirmOpen(false)} onConfirm={() => void confirmReceipt()} />
        <Toast message={actions.toast?.message} type={actions.toast?.type} onDismiss={actions.dismissToast}/>
    </>;
}
