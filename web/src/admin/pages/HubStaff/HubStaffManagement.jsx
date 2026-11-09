import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3, MapPinned, Plus, RefreshCw, Search, ShieldCheck, UserRound, X } from "lucide-react";
import api from "../../../shared/services/api";
import Dialog from "../../../shared/components/Dialog";
import "./HubStaffManagement.css";

const PAGE_SIZE = 12;

const EMPTY_FORM = {
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    hub_id: "",
};

const fullName = (staff) => [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(" ");
const hubLabel = (hub) => `${hub.name} · ${hub.code}`;

function HubPicker({ hubs, value, onChange, label, required = false, id }) {
    const selected = hubs.find((hub) => String(hub.id) === String(value));
    const [query, setQuery] = useState(selected ? hubLabel(selected) : "");

    return (
        <label className="hsm-field" htmlFor={id}>
            <span>{label}</span>
            <input
                id={id}
                list={`${id}-options`}
                value={selected ? hubLabel(selected) : query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    const hub = hubs.find((item) => hubLabel(item).toLocaleLowerCase() === event.target.value.trim().toLocaleLowerCase());
                    onChange(hub ? String(hub.id) : "");
                }}
                placeholder="Type a city, municipality, or hub code"
                autoComplete="off"
                required={required}
            />
            <datalist id={`${id}-options`}>
                {hubs.map((hub) => <option key={hub.id} value={hubLabel(hub)} />)}
            </datalist>
        </label>
    );
}

export default function HubStaffManagement({ base = "/admin" }) {
    const [staff, setStaff] = useState([]);
    const [hubs, setHubs] = useState([]);
    const [logisticsManagers, setLogisticsManagers] = useState([]);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [hubFilter, setHubFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: PAGE_SIZE, total: 0 });
    const [summary, setSummary] = useState({ active: 0, pending: 0, suspended: 0, unassigned_hubs: 0 });
    const [form, setForm] = useState(EMPTY_FORM);
    const [hubChoices, setHubChoices] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const requests = [
                api.get(`${base}/hub-staff`, {
                    params: {
                        page,
                        per_page: PAGE_SIZE,
                        search: debouncedSearch || undefined,
                        status: statusFilter,
                        hub_id: hubFilter || undefined,
                    },
                }),
                api.get(`${base}/hubs`),
            ];
            if (base === "/admin") requests.push(api.get("/admin/hub-staff/logistics-managers"));
            const [staffResponse, hubsResponse, managersResponse] = await Promise.all(requests);
            const staffPage = staffResponse.data?.data;
            const staffRows = staffPage?.data;
            const hubRows = hubsResponse.data?.data;
            if (!Array.isArray(staffRows) || !Array.isArray(hubRows) || !Number.isInteger(staffPage?.current_page)) {
                throw new Error("The Hub Staff or hub directory response was incomplete.");
            }
            setStaff(staffRows);
            setPagination({
                current_page: staffPage.current_page,
                last_page: staffPage.last_page,
                per_page: staffPage.per_page,
                total: staffPage.total,
            });
            setSummary(staffResponse.data?.meta?.summary || { active: 0, pending: 0, suspended: 0, unassigned_hubs: 0 });
            setHubs(hubRows.filter((hub) => hub.is_active));
            setLogisticsManagers(Array.isArray(managersResponse?.data?.data) ? managersResponse.data.data : []);
        } catch (loadError) {
            setError(loadError.response?.data?.message || loadError.message || "Hub Staff records could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [base, debouncedSearch, hubFilter, page, statusFilter]);

    useEffect(() => {
        const timer = window.setTimeout(() => void load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [search]);

    const run = async (action, successMessage) => {
        if (saving) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const response = await action();
            setNotice(response?.data?.message || successMessage);
            await load();
            return true;
        } catch (actionError) {
            const validationError = Object.values(actionError.response?.data?.errors || {}).flat()[0];
            setError(validationError || actionError.response?.data?.message || "The Hub Staff update could not be completed.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const createStaff = async (event) => {
        event.preventDefault();
        if (!form.hub_id || saving) return;
        const created = await run(
            () => api.post(`${base}/hub-staff`, { ...form, hub_id: Number(form.hub_id) }),
            "Hub Staff account created. Email verification is required before activation.",
        );
        if (created) {
            setForm(EMPTY_FORM);
            setCreateOpen(false);
        }
    };

    const filteredStaff = staff;
    const counts = summary;
    return (
        <main className="hsm-page">
            <header className="hsm-header">
                <div>
                    <span className="hsm-eyebrow">NETWORK ACCESS</span>
                    <h1>Hub Staff management</h1>
                    <p>Create a staff account, assign it to one hub, then activate access after email verification.</p>
                </div>
                <button type="button" className="hsm-secondary-button" onClick={() => void load()} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "hsm-spinning" : ""} /> Refresh
                </button>
            </header>

            {error && <div className="hsm-alert hsm-alert--error" role="alert">{error}</div>}
            {notice && <div className="hsm-alert hsm-alert--success" role="status">{notice}</div>}

            <section className="hsm-readiness" aria-label="Hub Staff summary">
                <article><span><ShieldCheck size={17} /> Active accounts</span><strong>{counts.active.toLocaleString()}</strong><small>Verified and enabled</small></article>
                <article><span><Clock3 size={17} /> Awaiting verification</span><strong>{counts.pending.toLocaleString()}</strong><small>Cannot enter hub operations yet</small></article>
                <article><span><UserRound size={17} /> Suspended</span><strong>{counts.suspended.toLocaleString()}</strong><small>Access is disabled</small></article>
                <article><span><MapPinned size={17} /> Hubs without active staff</span><strong>{counts.unassignedHubs.toLocaleString()}</strong><small>Among {hubs.length.toLocaleString()} active LGU nodes</small></article>
            </section>

            <section className="hsm-card">
                <div className="hsm-card-heading">
                    <div><h2>Staff accounts</h2><p>Each account is restricted to its assigned active hub.</p></div>
                    <button type="button" className="hsm-primary-button" onClick={() => setCreateOpen(true)} disabled={hubs.length === 0}>
                        <Plus size={16} /> Create Hub Staff
                    </button>
                </div>

                {hubs.length === 0 && <div className="hsm-alert hsm-alert--warning" role="status">No active hubs are available. Enable or create a hub before assigning staff.</div>}

                <div className="hsm-toolbar">
                    <label className="hsm-search"><Search size={17} /><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, phone, hub, or PSGC" aria-label="Search Hub Staff accounts" /></label>
                    <label className="hsm-filter"><span>Status</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option></select></label>
                    <label className="hsm-filter"><span>Hub</span><select value={hubFilter} onChange={(event) => { setHubFilter(event.target.value); setPage(1); }}><option value="">All hubs</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hubLabel(hub)}</option>)}</select></label>
                    <span className="hsm-result-count">{pagination.total.toLocaleString()} account{pagination.total === 1 ? "" : "s"}</span>
                </div>

                {loading ? <div className="hsm-empty" role="status">Loading Hub Staff accounts…</div>
                    : filteredStaff.length === 0 ? <div className="hsm-empty"><UserRound size={25} /><strong>{pagination.total ? "No accounts on this page" : "No Hub Staff accounts found"}</strong><span>{pagination.total ? "Try going to the previous page." : debouncedSearch || statusFilter !== "all" || hubFilter ? "Try changing the search or filters." : "Create an account and assign it to a hub to get started."}</span></div>
                        : <div className="hsm-list">{filteredStaff.map((person) => {
                            const selectedHubId = hubChoices[person.id] ?? String(person.hub?.id || "");
                            const changedHub = selectedHubId !== String(person.hub?.id || "");
                            const verified = Boolean(person.email_verified_at);
                            return <article className="hsm-staff-card" key={person.id}>
                                <div className="hsm-person">
                                    <span className="hsm-avatar" aria-hidden="true">{(person.first_name?.[0] || "H") + (person.last_name?.[0] || "S")}</span>
                                    <div><strong>{fullName(person)}</strong><span>{person.email}</span>{person.phone && <small>{person.phone}</small>}</div>
                                </div>
                                <div className="hsm-assignment">
                                    <span className={`hsm-status hsm-status--${person.status}`}>{person.status === "active" ? "Active" : person.status === "pending" ? "Pending" : "Suspended"}</span>
                                    <span className={`hsm-verification${verified ? " is-verified" : ""}`}>{verified ? <Check size={13} /> : <Clock3 size={13} />}{verified ? "Email verified" : "Email not verified"}</span>
                                    <small>Current hub</small>
                                    <strong>{person.hub ? `${person.hub.name} · ${person.hub.code}` : "No hub assigned"}</strong>
                                    {person.hub?.location_label && <span className="hsm-location">{person.hub.location_label}</span>}
                                    {person.hub && !person.hub.address && <span className="hsm-location-warning">Physical hub address still needs confirmation.</span>}
                                </div>
                                <div className="hsm-staff-actions">
                                    <HubPicker hubs={hubs} id={`staff-${person.id}-hub`} label="Move to another hub" value={selectedHubId} onChange={(hub_id) => setHubChoices({ ...hubChoices, [person.id]: hub_id })} />
                                    {changedHub && <button type="button" className="hsm-secondary-button" disabled={saving || !selectedHubId} onClick={() => void run(() => api.patch(`${base}/hub-staff/${person.id}/hub`, { hub_id: Number(selectedHubId) }), "Hub assignment updated.")}>Save assignment</button>}
                                    {!verified && person.status === "pending" && <button type="button" className="hsm-secondary-button" disabled={saving} onClick={() => void run(() => api.post("/resend-verification", { email: person.email }), "If this account is pending verification, a new code has been emailed.")}>Resend verification code</button>}
                                    {person.status === "pending" && <button type="button" className="hsm-primary-button" disabled={saving || !verified || !person.hub?.is_active} title={!verified ? "Email verification is required first." : !person.hub?.is_active ? "Assign this staff member to an active hub first." : ""} onClick={() => void run(() => api.patch(`${base}/hub-staff/${person.id}/activate`), "Hub Staff account activated.")}>Activate access</button>}
                                    {person.status === "active" && <button type="button" className="hsm-danger-button" disabled={saving} onClick={() => {
                                        if (window.confirm(`Suspend Hub Staff access for ${fullName(person)}? They will be signed out of active sessions.`)) {
                                            void run(() => api.patch(`${base}/hub-staff/${person.id}/suspend`), "Hub Staff access suspended.");
                                        }
                                    }}>Suspend access</button>}
                                    {person.status === "suspended" && <button type="button" className="hsm-primary-button" disabled={saving || !verified || !person.hub?.is_active} title={!verified ? "Email verification is required first." : !person.hub?.is_active ? "Assign this staff member to an active hub first." : ""} onClick={() => void run(() => api.patch(`${base}/hub-staff/${person.id}/activate`), "Hub Staff account activated.")}>Reactivate access</button>}
                                </div>
                            </article>;
                        })}</div>}

                {!loading && pagination.total > 0 && <footer className="hsm-pagination">
                    <span>Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong>–<strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total.toLocaleString()}</strong> accounts</span>
                    <div>
                        <button type="button" className="hsm-secondary-button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || pagination.current_page <= 1} aria-label="Previous page"><ChevronLeft size={16} /> Previous</button>
                        <span>Page {pagination.current_page} of {pagination.last_page}</span>
                        <button type="button" className="hsm-secondary-button" onClick={() => setPage((current) => Math.min(pagination.last_page, current + 1))} disabled={loading || pagination.current_page >= pagination.last_page} aria-label="Next page">Next <ChevronRight size={16} /></button>
                    </div>
                </footer>}
            </section>

            {base === "/admin" && <section className="hsm-card hsm-capability-card">
                <div className="hsm-card-heading">
                    <div><h2>Logistics staff permissions</h2><p>Only grant this capability to trusted Logistics managers who need to provision Hub Staff.</p></div>
                    <span className="hsm-capability-count">{logisticsManagers.filter((manager) => manager.can_manage_hub_staff && manager.status === "active").length} authorized</span>
                </div>
                {logisticsManagers.length === 0 ? <div className="hsm-empty"><strong>No Logistics accounts found</strong><span>Active Logistics accounts can be authorized here.</span></div> : <div className="hsm-manager-list">
                    {logisticsManagers.map((manager) => (
                        <article className="hsm-manager-row" key={manager.id}>
                            <div><strong>{manager.first_name} {manager.last_name}</strong><span>{manager.email}</span></div>
                            <span className={`hsm-status hsm-status--${manager.status}`}>{manager.status}</span>
                            <button
                                type="button"
                                className={manager.can_manage_hub_staff ? "hsm-danger-button" : "hsm-secondary-button"}
                                disabled={saving || (manager.status !== "active" && !manager.can_manage_hub_staff)}
                                onClick={() => void run(
                                    () => manager.can_manage_hub_staff
                                        ? api.delete(`/admin/logistics-users/${manager.id}/hub-staff-capability`)
                                        : api.put(`/admin/logistics-users/${manager.id}/hub-staff-capability`),
                                    manager.can_manage_hub_staff ? "Hub Staff provisioning access revoked." : "Hub Staff provisioning access granted.",
                                ).then((succeeded) => {
                                    if (succeeded) setLogisticsManagers((current) => current.map((item) => item.id === manager.id
                                        ? { ...item, can_manage_hub_staff: !manager.can_manage_hub_staff }
                                        : item));
                                })}
                            >
                                {manager.can_manage_hub_staff ? "Revoke access" : "Grant provisioning access"}
                            </button>
                        </article>
                    ))}
                </div>}
            </section>}

            <Dialog
                open={createOpen}
                onClose={() => {
                    if (!saving) {
                        setCreateOpen(false);
                        setError("");
                    }
                }}
                ariaLabelledBy="hsm-create-title"
                className="hsm-dialog"
                busy={saving}
            >
                <header className="hsm-dialog-header">
                    <div>
                        <span className="hsm-eyebrow">NETWORK ACCESS</span>
                        <h2 id="hsm-create-title">Create Hub Staff account</h2>
                        <p>We will email a verification code. The account stays pending until verified and activated.</p>
                    </div>
                    <button type="button" className="hsm-icon-button" onClick={() => { setCreateOpen(false); setError(""); }} disabled={saving} aria-label="Close form"><X size={19} /></button>
                </header>
                {error && <div className="hsm-alert hsm-alert--error" role="alert">{error}</div>}
                <form className="hsm-create-form" onSubmit={(event) => void createStaff(event)}>
                    <div className="hsm-form-grid">
                        <label className="hsm-field"><span>First name</span><input required maxLength={100} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} autoComplete="given-name" /></label>
                        <label className="hsm-field"><span>Middle name <small>Optional</small></span><input maxLength={100} value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} autoComplete="additional-name" /></label>
                        <label className="hsm-field"><span>Last name</span><input required maxLength={100} value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} autoComplete="family-name" /></label>
                        <label className="hsm-field"><span>Email</span><input required type="email" maxLength={255} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
                        <label className="hsm-field"><span>Phone <small>Optional</small></span><input type="tel" maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" /></label>
                        <HubPicker hubs={hubs} id="create-staff-hub" label="Assigned hub" required value={form.hub_id} onChange={(hub_id) => setForm({ ...form, hub_id })} />
                        <label className="hsm-field"><span>Temporary password</span><input required type="password" minLength={8} maxLength={128} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /></label>
                        <label className="hsm-field"><span>Confirm temporary password</span><input required type="password" minLength={8} maxLength={128} value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} autoComplete="new-password" /></label>
                    </div>
                    <div className="hsm-form-footer">
                        <span>Use a temporary password and ask the staff member to update it after signing in.</span>
                        <button type="submit" className="hsm-primary-button" disabled={saving || !form.hub_id}>{saving ? "Creating…" : "Create account and send code"}</button>
                    </div>
                </form>
            </Dialog>
        </main>
    );
}
