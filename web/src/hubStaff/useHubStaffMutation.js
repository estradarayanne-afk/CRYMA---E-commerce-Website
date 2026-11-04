import { useCallback, useRef, useState } from "react";
import { createSingleFlightGuard, responseMessage } from "./utils/hubStaffWorkspace";
import { useHubStaffWorkspace } from "./HubStaffWorkspaceContext";

export default function useHubStaffMutation() {
    const { refreshAssignment } = useHubStaffWorkspace();
    const inFlight = useRef(createSingleFlightGuard());
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState(null);

    const run = useCallback(async (operation, successMessage) => {
        if (!inFlight.current.tryAcquire()) return null;
        setBusy(true);
        setToast(null);
        try {
            const result = await operation();
            setToast({ type: "success", message: successMessage });
            return result;
        } catch (error) {
            setToast({ type: "error", message: responseMessage(error) });
            if (error?.response?.status === 403) refreshAssignment();
            return null;
        } finally {
            inFlight.current.release();
            setBusy(false);
        }
    }, [refreshAssignment]);

    const dismissToast = useCallback(() => setToast(null), []);
    return { run, busy, toast, dismissToast };
}
