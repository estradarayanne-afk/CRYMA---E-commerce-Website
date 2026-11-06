import { useSearchParams } from "react-router-dom";
import { BadgeDollarSign, Landmark } from "lucide-react";
import Commission from "../Commission/Commission";
import Settlements from "../Settlements/Settlements";
import "./Finance.css";

export default function Finance() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeView = searchParams.get("view") === "settlements" ? "settlements" : "commission";

    return (
        <section className="admin-finance-page" aria-label="Commission and settlements">
            <header className="admin-finance-header">
                <div>
                    <span className="admin-finance-eyebrow">FINANCE OPERATIONS</span>
                    <h1>{activeView === "commission" ? "Commissions" : "Settlements"}</h1>
                    <p>{activeView === "commission" ? "Review seller fees and earnings recorded from completed orders." : "Reconcile courier remittances and record completed seller payouts."}</p>
                </div>
            </header>
            <div className="admin-finance-tabs" role="tablist" aria-label="Finance tools">
                <button
                    type="button"
                    role="tab"
                    id="finance-tab-commission"
                    aria-controls="admin-finance-panel"
                    aria-selected={activeView === "commission"}
                    className={activeView === "commission" ? "is-active" : ""}
                    onClick={() => setSearchParams({ view: "commission" })}
                >
                    <BadgeDollarSign size={16} /> Commission
                </button>
                <button
                    type="button"
                    role="tab"
                    id="finance-tab-settlements"
                    aria-controls="admin-finance-panel"
                    aria-selected={activeView === "settlements"}
                    className={activeView === "settlements" ? "is-active" : ""}
                    onClick={() => setSearchParams({ view: "settlements" })}
                >
                    <Landmark size={16} /> Settlements
                </button>
            </div>
            <div
                id="admin-finance-panel"
                className="admin-finance-panel"
                role="tabpanel"
                aria-labelledby={`finance-tab-${activeView}`}
            >
                {activeView === "commission" ? <Commission /> : <Settlements />}
            </div>
        </section>
    );
}
