import { Link } from "react-router-dom";
import "./LogisticsPages.css";

export default function LogisticsUnavailable({ title }) {
    return (
        <section className="lw-page">
            <header className="lw-page-heading">
                <div>
                    <span className="lw-eyebrow">LOGISTICS WORKSPACE</span>
                    <h1>{title}</h1>
                    <p>This module is not available yet. No logistics action has been performed.</p>
                </div>
                <Link className="lw-page-action" to="/logistics/dashboard">Back to dashboard</Link>
            </header>
        </section>
    );
}
