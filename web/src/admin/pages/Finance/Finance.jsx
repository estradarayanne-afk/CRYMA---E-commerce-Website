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
            <div className="admin-finance-tabs" role="group" aria-label="Finance tools">
                <button
                    type="button"
                    aria-pressed={activeView === "commission"}
                    className={activeView === "commission" ? "is-active" : ""}
                    onClick={() => setSearchParams({ view: "commission" })}
                >
                    <BadgeDollarSign size={16} /> Commission
                </button>
                <button
                    type="button"
                    aria-pressed={activeView === "settlements"}
                    className={activeView === "settlements" ? "is-active" : ""}
                    onClick={() => setSearchParams({ view: "settlements" })}
                >
                    <Landmark size={16} /> Settlements
                </button>
            </div>
            <div
                id="admin-finance-panel"
                className="admin-finance-panel"
            >
                {activeView === "commission" ? <Commission /> : <Settlements />}
            </div>
        </section>
    );
}
