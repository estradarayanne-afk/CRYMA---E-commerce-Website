import "./LogisticsPages.css";

export default function LogisticsUnavailable({ title }) {
    return (
        <section className="lw-unavailable" role="status">
            <span className="lw-eyebrow">LOGISTICS WORKSPACE</span>
            <h1>{title}</h1>
            <p>This module is not available yet. No logistics action has been performed.</p>
        </section>
    );
}
