import { useSyncExternalStore } from "react";
import {
    getActiveApiRequestCount,
    subscribeToApiActivity,
} from "../services/apiActivity";
import "./GlobalNetworkLoadingIndicator.css";

export default function GlobalNetworkLoadingIndicator() {
    const activeRequests = useSyncExternalStore(
        subscribeToApiActivity,
        getActiveApiRequestCount,
        () => 0,
    );
    const visible = activeRequests > 0;

    return (
        <div
            className={`global-network-loading${visible ? " is-visible" : ""}`}
            role={visible ? "status" : undefined}
            aria-label={visible ? "Loading CRYMA" : undefined}
            aria-hidden={!visible}
        >
            <span className="global-network-loading__badge">
                <span className="global-network-loading__mark">
                    <span className="global-network-loading__glow" />
                    <span className="global-network-loading__satellite" />
                    <img src="/cryma-favicon.png" alt="" />
                    <span className="global-network-loading__shine" />
                </span>
                <span className="global-network-loading__label">Loading CRYMA</span>
                <span className="global-network-loading__track"><span /></span>
            </span>
        </div>
    );
}
