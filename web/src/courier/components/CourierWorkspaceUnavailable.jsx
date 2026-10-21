import { Link } from "react-router-dom";
import "./CourierWorkspaceUnavailable.css";

function CourierWorkspaceUnavailable({ title }) {
    return (
        <main className="courier-unavailable-page">
            <section className="courier-unavailable-card" role="status">
                <span className="courier-unavailable-eyebrow">CRYMA COURIER</span>
                <h1>{title}</h1>
                <p>
                    This courier feature is not included in the current delivery workflow.
                </p>
                <Link to="/" className="courier-unavailable-link">Return to CRYMA</Link>
            </section>
        </main>
    );
}

export default CourierWorkspaceUnavailable;
