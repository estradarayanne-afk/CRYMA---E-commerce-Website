import { useCallback, useState } from "react";
import { getHubStaffActivity } from "./api";
import { useHubStaffWorkspace } from "./HubStaffWorkspaceContext";
import { responseMessage } from "./utils/hubStaffWorkspace";

export default function useHubStaffRecentActivity() {
    const { hub } = useHubStaffWorkspace();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await getHubStaffActivity({ page: 1, per_page: 5 }, hub.id);
            setEvents(result.rows);
            return true;
        } catch (requestError) {
            setError(responseMessage(requestError, "Recent hub activity could not be refreshed."));
            return false;
        } finally {
            setLoading(false);
        }
    }, [hub.id]);

    return { events, loading, error, refresh };
}
