import { useCallback, useEffect, useState } from "react";
import { HubAssignmentChangedError, hubStaffErrorMessage } from "./utils/hubStaffWorkspace";
import { useHubStaffWorkspace } from "./HubStaffWorkspaceContext";

export function useHubStaffPage(loader, key) {
    const { hub, refreshAssignment } = useHubStaffWorkspace();
    const [reload, setReload] = useState(0);
    const [snapshot, setSnapshot] = useState(null);
    const requestKey = `${key}::${reload}`;
    const current = snapshot?.key === requestKey ? snapshot : null;
    const retry = useCallback(() => {
        if (current?.status === "error" && (current.error instanceof HubAssignmentChangedError || current.error?.response?.status === 403)) {
            refreshAssignment();
            return;
        }
        setReload((value) => value + 1);
    }, [current, refreshAssignment]);

    useEffect(() => {
        let active = true;
        loader(hub.id).then((value) => {
            if (active) setSnapshot({ key: requestKey, status: "ready", value });
        }).catch((requestError) => {
            if (!active) return;
            setSnapshot({ key: requestKey, status: "error", error: requestError });
        });
        return () => { active = false; };
    }, [hub.id, loader, refreshAssignment, requestKey]);

    return { data: current?.status === "ready" ? current.value : null, loading: !current, error: current?.status === "error" ? current.error : null, retry, errorMessage: current?.status === "error" ? hubStaffErrorMessage(current.error) : null };
}

