import { useCallback, useRef, useState } from "react";
import { BadgeCheck, PackageCheck } from "lucide-react";
import { lookupIncomingPickup, receiveIncomingPickup } from "../api";
import { useHubStaffWorkspace } from "../HubStaffWorkspaceContext";
import useHubStaffMutation from "../useHubStaffMutation";
import useHubStaffRecentActivity from "../useHubStaffRecentActivity";
import { createLatestRequestGuard, pickupReceiptPayload, responseMessage } from "../utils/hubStaffWorkspace";
import { PageHeading, StatePanel, StatusBadge } from "../components/HubStaffUI";
import ParcelCodeCapture from "../components/ParcelCodeCapture";
import ConfirmationModal from "../components/HubStaffConfirmModal";
import HubStaffActivityPreview from "../components/HubStaffActivityPreview";
import Toast from "../../shared/components/Toast";
import "../components/HubStaffActions.css";

export default function PickupReceiving() {
    const { hub, refreshAssignment } = useHubStaffWorkspace();
    const [parcelCode, setParcelCode] = useState("");
    const [lookup, setLookup] = useState(null);
    const [lookupError, setLookupError] = useState("");
    const [lookupLoading, setLookupLoading] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const lookupRequests = useRef(createLatestRequestGuard());
    const actions = useHubStaffMutation();
    const recentActivity = useHubStaffRecentActivity();

    const verifyCode = useCallback(async (candidate = parcelCode) => {
        const code = String(candidate || "").trim().toUpperCase();
        if (!code) return;
        const requestId = lookupRequests.current.begin();
        setParcelCode(code);
        setLookup(null);
        setReceipt(null);
        setLookupError("");
        setLookupLoading(true);
        try {
            const result = await lookupIncomingPickup(code);
            if (!lookupRequests.current.isCurrent(requestId)) return;
            if (result.eligible_for_receipt !== true || String(result.receiving_hub?.id) !== String(hub.id)) {
                throw new Error("This parcel is not eligible for receipt at your assigned hub.");
            }
            setLookup(result);
        } catch (error) {
            if (!lookupRequests.current.isCurrent(requestId)) return;
            setLookupError(responseMessage(error, "The parcel could not be verified for receiving."));
            if (error?.response?.status === 403) refreshAssignment();
        } finally {
            if (lookupRequests.current.isCurrent(requestId)) setLookupLoading(false);
        }
    }, [hub.id, parcelCode, refreshAssignment]);

    const confirmReceipt = async () => {
        if (!lookup || actions.busy) return;
        const completed = await actions.run(
            () => receiveIncomingPickup(pickupReceiptPayload(lookup)),
            "Parcel receipt was confirmed by the backend.",
        );
        if (completed) {
            setReceipt(completed);
            setLookup(null);
            setConfirmOpen(false);
            setParcelCode("");
            await recentActivity.refresh();
        }
    };

    return <>
        <PageHeading title="Pickup receiving" description="Verify a parcel label, review its assigned receiving hub, then explicitly confirm physical receipt." />
        <section className="hs-operation-card">
            <div className="hs-operation-intro"><span className="hs-operation-icon"><PackageCheck size={22}/></span><div><h2>Receive an incoming pickup</h2><p>The lookup checks eligibility only. Custody changes only after you confirm and the backend accepts the receipt.</p></div></div>
            <ParcelCodeCapture
                code={parcelCode}
                onCodeChange={(value) => { lookupRequests.current.invalidate(); setParcelCode(value); setLookup(null); setReceipt(null); setLookupError(""); setLookupLoading(false); }}
                onVerify={verifyCode}
                onScanned={(value) => void verifyCode(value)}
                submitLabel={lookupLoading ? "Checking parcel..." : "Look up parcel"}
                busy={lookupLoading || actions.busy}
                title="Scan incoming pickup label"
            />
            {lookupError && <p className="hs-inline-error" role="alert">{lookupError}</p>}
            {lookupLoading && <StatePanel kind="loading" title="Checking parcel eligibility" busy><p>Confirming the parcel with the Hub Staff receiving endpoint.</p></StatePanel>}
            {lookup && <section className="hs-confirm-summary" aria-live="polite"><div className="hs-confirm-summary-head"><BadgeCheck size={19}/><h3>Review before receiving</h3></div><dl><div><dt>Parcel code</dt><dd className="hs-reference">{lookup.parcel_code}</dd></div><div><dt>Order</dt><dd>#{lookup.order_id}</dd></div><div><dt>Current parcel status</dt><dd><StatusBadge status={lookup.status}/></dd></div><div><dt>Receiving hub</dt><dd>{lookup.receiving_hub?.name} ({lookup.receiving_hub?.code})</dd></div></dl><p>The destination is fixed by your active Hub Staff assignment.</p><button className="hs-button hs-button--primary" type="button" disabled={actions.busy} onClick={() => setConfirmOpen(true)}>Confirm physical receipt</button></section>}
            {receipt && <section className="hs-operation-success" role="status"><BadgeCheck size={22}/><div><h3>Receipt confirmed</h3><p>Parcel {receipt.parcel_code} was received at {receipt.hub?.name || hub.name}. Backend status: <StatusBadge status={receipt.status}/></p><small>Pickup status: {receipt.pickup_status}</small></div></section>}
            {receipt && <HubStaffActivityPreview {...recentActivity}/>}
        </section>
        <ConfirmationModal open={confirmOpen} title="Confirm physical receipt?" description={lookup ? "Confirm that parcel " + lookup.parcel_code + " has physically arrived at " + hub.name + ". The backend will validate custody and record the receipt." : ""} confirmLabel="Confirm receipt" busy={actions.busy} onCancel={() => setConfirmOpen(false)} onConfirm={() => void confirmReceipt()} />
        <Toast message={actions.toast?.message} type={actions.toast?.type} onDismiss={actions.dismissToast}/>
    </>;
}
