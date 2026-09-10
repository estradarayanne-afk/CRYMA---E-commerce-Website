import { useState } from "react";

const SHIPMENTS = [
    { id: "ORD-1040", customer: "Ben Cruz", address: "45 Rizal Ave, Quezon City", product: "Contour Shoulder Bag", courier: "J&T Express", tracking: "JT-20260610-001", status: "ready_for_pickup", scheduled: "2026-06-11" },
    { id: "ORD-1039", customer: "Carla Tan", address: "78 Bonifacio St, Makati", product: "Everyday Overshirt", courier: "LBC", tracking: "LBC-20260609-002", status: "picked_up", scheduled: "2026-06-09" },
    { id: "ORD-1038", customer: "Dan Lim", address: "9 Aguinaldo Blvd, Pasig", product: "Merino Crew Neck", courier: "Ninja Van", tracking: "NV-20260608-003", status: "in_transit", scheduled: "2026-06-08" },
    { id: "ORD-1037", customer: "Eva Santos", address: "22 Luna St, Taguig", product: "Tailored Blazer", courier: "GrabExpress", tracking: "GE-20260607-004", status: "delivered", scheduled: "2026-06-07" },
];

const STATUS_LABEL = { ready_for_pickup: "Ready for Pickup", picked_up: "Picked Up", in_transit: "In Transit", delivered: "Delivered" };
const STATUS_COLOR = { ready_for_pickup: "#98751d", picked_up: "#48647a", in_transit: "#176b68", delivered: "#27724d" };
const STATUS_BG    = { ready_for_pickup: "#fff7df", picked_up: "#eef3f8", in_transit: "#e9f3f2", delivered: "#e9f6ef" };
const FLOW = ["ready_for_pickup", "picked_up", "in_transit", "delivered"];

const COURIERS = ["J&T Express", "LBC", "Ninja Van", "GrabExpress", "Flash Express"];

function Logistics() {
    const [shipments, setShipments] = useState(SHIPMENTS);
    const [scheduleModal, setScheduleModal] = useState(null);
    const [scheduleForm, setScheduleForm] = useState({ courier: "J&T Express", date: "" });
    const [selected, setSelected] = useState(null);

    const advance = (id) => {
        setShipments((prev) => prev.map((s) => {
            if (s.id !== id) return s;
            const idx = FLOW.indexOf(s.status);
            return idx < FLOW.length - 1 ? { ...s, status: FLOW[idx + 1] } : s;
        }));
        setSelected((s) => {
            if (!s || s.id !== id) return s;
            const idx = FLOW.indexOf(s.status);
            return idx < FLOW.length - 1 ? { ...s, status: FLOW[idx + 1] } : s;
        });
    };

    const handleSchedule = () => {
        if (!scheduleModal) return;
        setShipments((prev) => prev.map((s) =>
            s.id === scheduleModal.id ? { ...s, courier: scheduleForm.courier, scheduled: scheduleForm.date, status: "ready_for_pickup" } : s
        ));
        setScheduleModal(null);
    };

    return (
        <div className="sl-page">
            <div className="sl-page-head">
                <div><div className="sl-eyebrow">SHIPPING & DELIVERY</div><h1 className="sl-h1">Logistics</h1><p>Schedule pickups, track shipments, and confirm deliveries.</p></div>
            </div>

            <div className={`sl-orders-layout${selected ? " has-detail" : ""}`}>
                {/* SHIPMENT LIST */}
                <div className="sl-card sl-orders-list">
                    <div className="sl-table-wrap">
                        <table className="sl-table">
                            <thead>
                                <tr><th>Order</th><th>Customer</th><th>Courier</th><th>Tracking No.</th><th>Pickup Date</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {shipments.map((s) => (
                                    <tr key={s.id} className={selected?.id === s.id ? "sl-row-active" : ""} onClick={() => setSelected(s)} style={{ cursor: "pointer" }}>
                                        <td><strong>{s.id}</strong></td>
                                        <td>{s.customer}</td>
                                        <td>{s.courier}</td>
                                        <td><code style={{ fontSize: 11 }}>{s.tracking}</code></td>
                                        <td>{s.scheduled}</td>
                                        <td>
                                            <span className="sl-badge" style={{ color: STATUS_COLOR[s.status], background: STATUS_BG[s.status] }}>
                                                {STATUS_LABEL[s.status]}
                                            </span>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="sl-row-actions">
                                                <button className="sl-btn-sm" onClick={() => { setScheduleForm({ courier: s.courier, date: s.scheduled }); setScheduleModal(s); }}>
                                                    Schedule
                                                </button>
                                                {s.status !== "delivered" && (
                                                    <button className="sl-btn-sm sl-btn-sm--ghost" onClick={() => advance(s.id)}>
                                                        Advance
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SHIPMENT DETAIL */}
                {selected && (
                    <div className="sl-card sl-order-detail">
                        <div className="sl-detail-head">
                            <div>
                                <h3>{selected.id}</h3>
                                <span className="sl-badge" style={{ color: STATUS_COLOR[selected.status], background: STATUS_BG[selected.status] }}>
                                    {STATUS_LABEL[selected.status]}
                                </span>
                            </div>
                            <button className="sl-modal-close" onClick={() => setSelected(null)}>✕</button>
                        </div>

                        {/* TRACKING TIMELINE */}
                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Shipment Timeline</p>
                            <div className="sl-timeline">
                                {FLOW.map((step, i) => {
                                    const idx = FLOW.indexOf(selected.status);
                                    const done = i <= idx;
                                    return (
                                        <div className={`sl-timeline-step${done ? " done" : ""}`} key={step}>
                                            <div className="sl-timeline-dot" />
                                            {i < FLOW.length - 1 && <div className="sl-timeline-line" />}
                                            <span>{STATUS_LABEL[step]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Courier</p>
                            <p className="sl-detail-val"><strong>{selected.courier}</strong></p>
                            <p className="sl-detail-val">Tracking: <code>{selected.tracking}</code></p>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Delivery Address</p>
                            <p className="sl-detail-val">{selected.address}</p>
                        </div>

                        <div className="sl-detail-section">
                            <p className="sl-detail-label">Item</p>
                            <p className="sl-detail-val">{selected.product}</p>
                        </div>

                        {selected.status === "delivered" && (
                            <div className="sl-detail-section">
                                <div className="sl-delivered-notice">
                                    ✅ Order delivered. Customer has received this package.
                                </div>
                            </div>
                        )}

                        <div className="sl-detail-actions">
                            {selected.status !== "delivered" && (
                                <button className="sl-btn-primary" onClick={() => advance(selected.id)}>
                                    {{ ready_for_pickup: "Mark Picked Up", picked_up: "Mark In Transit", in_transit: "Confirm Delivery" }[selected.status]}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* SCHEDULE MODAL */}
            {scheduleModal && (
                <div className="sl-overlay" onClick={() => setScheduleModal(null)}>
                    <div className="sl-modal sl-modal--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="sl-modal-head">
                            <h3>Schedule Courier Pickup</h3>
                            <button className="sl-modal-close" onClick={() => setScheduleModal(null)}>✕</button>
                        </div>
                        <div className="sl-modal-body">
                            <p style={{ fontSize: 13, color: "#4a6462", marginBottom: 20 }}>
                                Order <strong>{scheduleModal.id}</strong> — {scheduleModal.customer}
                            </p>
                            <div className="sl-field">
                                <label>Courier</label>
                                <select value={scheduleForm.courier} onChange={(e) => setScheduleForm((f) => ({ ...f, courier: e.target.value }))}>
                                    {COURIERS.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="sl-field" style={{ marginTop: 16 }}>
                                <label>Pickup Date</label>
                                <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>
                        <div className="sl-modal-foot">
                            <button className="sl-btn-ghost" onClick={() => setScheduleModal(null)}>Cancel</button>
                            <button className="sl-btn-primary" onClick={handleSchedule}>Confirm Schedule</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Logistics;
