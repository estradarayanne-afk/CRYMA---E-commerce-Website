import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, Boxes, Clock3, Handshake, LayoutDashboard, LogOut, Menu, Package, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import api from "../shared/services/api";
import { getHubStaffAssignment } from "./api";
import { HubStaffWorkspaceContext } from "./HubStaffWorkspaceContext";
import { hubStaffErrorMessage } from "./utils/hubStaffWorkspace";
import { StatePanel } from "./components/HubStaffUI";
import "./components/HubStaffOverview.css";
import "./HubStaffLayout.css";

const NAV = [
    { to: "/hub-staff/overview", label: "Overview", icon: LayoutDashboard },
    { to: "/hub-staff/parcels", label: "Parcels", icon: Package },
    { to: "/hub-staff/pickup-receiving", label: "Pickup receiving", icon: PackageCheck },
    { to: "/hub-staff/incoming-transfers", label: "Incoming transfers", icon: Truck },
    { to: "/hub-staff/outgoing-transfers", label: "Outgoing handoffs", icon: Handshake },
    { to: "/hub-staff/activity", label: "Activity history", icon: Activity },
];

const TITLES = Object.fromEntries(NAV.map(({ to, label }) => [to, label]));

export default function HubStaffLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [assignmentResult, setAssignmentResult] = useState(null);
    const [retry, setRetry] = useState(0);
    const [navOpen, setNavOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        let active = true;
        getHubStaffAssignment().then((assignment) => {
            if (!active) return;
            setAssignmentResult({ key: retry, status: "ready", hub: assignment });
        }).catch((error) => {
            if (!active) return;
            setAssignmentResult({ key: retry, status: error?.response?.status === 403 ? "restricted" : "error", error });
        });
        return () => { active = false; };
    }, [retry]);

    useEffect(() => {
        if (!navOpen) return undefined;
        const onKeyDown = (event) => { if (event.key === "Escape") setNavOpen(false); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [navOpen]);

    const refreshAssignment = useCallback(() => {
        setRetry((value) => value + 1);
    }, []);
    const assignmentState = assignmentResult?.key === retry ? assignmentResult : { status: "loading" };
    const hub = assignmentState.hub;
    const context = useMemo(() => ({ hub, refreshAssignment }), [hub, refreshAssignment]);

    const logout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        let failed = false;
        try { await api.post("/logout"); } catch { failed = true; }
        finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login", { replace: true, state: { message: failed ? "Signed out locally. Server sign-out could not be confirmed." : "You have been signed out.", type: failed ? "error" : "success" } });
        }
    };

    if (assignmentState.status === "loading") return <div className="hs-gate"><StatePanel kind="loading" title="Checking hub assignment" busy><p>Confirming your active Hub Staff access…</p></StatePanel></div>;
    if (assignmentState.status === "restricted") return <div className="hs-gate"><StatePanel kind="restricted" title="Hub access is restricted"><p>Your account does not have an active hub assignment. Contact an administrator for assistance.</p></StatePanel></div>;
    if (assignmentState.status === "error") return <div className="hs-gate"><StatePanel kind="error" title="Could not verify your hub"><p>{hubStaffErrorMessage(assignmentState.error)}</p><button type="button" className="hs-button hs-button--secondary" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={15} /> Retry</button></StatePanel></div>;

    return <HubStaffWorkspaceContext.Provider value={context}>
        <div className={`hs-shell${navOpen ? " hs-shell--nav-open" : ""}`}>
            <aside className="hs-sidebar" aria-label="Hub Staff navigation">
                <div className="hs-brand"><img src="/cryma-favicon.png" alt="" /><span><strong>CRYMA</strong><small>Hub operations</small></span><span className="hs-brand-mark"><Boxes size={17} /></span></div>
                <div className="hs-hub-card"><span className="hs-hub-dot"/><div><small>Assigned hub</small><strong>{hub.name}</strong><span>{hub.code}</span></div></div>
                <p className="hs-nav-caption">WORKSPACE</p>
                <nav className="hs-nav" aria-label="Hub Staff workspace">
                    {NAV.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end onClick={() => setNavOpen(false)} className={({ isActive }) => isActive ? "is-active" : ""}><Icon size={18} aria-hidden="true"/><span>{label}</span></NavLink>)}
                </nav>
                <div className="hs-sidebar-bottom"><div className="hs-account"><span className="hs-account-avatar" aria-hidden="true">HS</span><div><strong>Hub Staff</strong><small>Active assignment</small></div></div><button type="button" className="hs-signout" onClick={() => void logout()} disabled={loggingOut}><LogOut size={17} aria-hidden="true"/>{loggingOut ? "Signing out…" : "Sign out"}</button></div>
            </aside>
            {navOpen && <button className="hs-backdrop" type="button" onClick={() => setNavOpen(false)} aria-label="Close navigation"/>}
            <div className="hs-main">
                <header className="hs-topbar"><button className="hs-menu-toggle" type="button" onClick={() => setNavOpen((open) => !open)} aria-expanded={navOpen} aria-label={navOpen ? "Close navigation" : "Open navigation"}>{navOpen ? <X/> : <Menu/>}</button><div className="hs-crumb"><span>Hub Staff</span><span>/</span><strong>{TITLES[location.pathname] || "Workspace"}</strong></div><div className="hs-topbar-meta"><span className="hs-online"><i/>Hub assignment verified</span><span><Clock3 size={15}/>{new Date().toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" })}</span></div></header>
                <main className="hs-main-content"><Outlet/></main>
            </div>
        </div>
    </HubStaffWorkspaceContext.Provider>;
}
