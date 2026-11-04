import { createContext, useContext } from "react";

export const HubStaffWorkspaceContext = createContext(null);

export function useHubStaffWorkspace() {
    const context = useContext(HubStaffWorkspaceContext);
    if (!context) throw new Error("Hub Staff workspace context is unavailable.");
    return context;
}
