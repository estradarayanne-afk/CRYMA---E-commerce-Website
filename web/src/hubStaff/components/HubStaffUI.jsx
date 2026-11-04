import { formatStatusLabel } from "../../shared/utils/statusLabel";
import "./HubStaffUI.css";

export function PageHeading({ eyebrow = "Hub operations", title, description, action }) {
    return <div className="hs-page-heading"><div><p className="hs-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="hs-page-description">{description}</p>}</div>{action && <div className="hs-heading-action">{action}</div>}</div>;
}

export function StatePanel({ kind = "empty", title, children, onRetry, busy = false }) {
    return <section className={`hs-state hs-state--${kind}`} role={kind === "error" || kind === "restricted" ? "alert" : "status"}>
        <span className={`hs-state-mark${busy ? " hs-spinner" : ""}`} aria-hidden="true" />
        <h2>{title}</h2><div>{children}</div>
        {onRetry && <button type="button" className="hs-button hs-button--secondary" onClick={onRetry}>Try again</button>}
    </section>;
}

export function StatusBadge({ status }) {
    const normalized = String(status ?? "").toLowerCase();
    const tone = normalized === "sorted" || normalized === "arrived" ? "complete" : normalized === "in_transit" ? "moving" : normalized === "assigned" || normalized === "at_sorting_center" ? "active" : "neutral";
    return <span className={`hs-badge hs-badge--${tone}`}>{formatStatusLabel(status)}</span>;
}

export function Pagination({ pagination, onPageChange, busy = false }) {
    if (!pagination || pagination.lastPage <= 1) return null;
    return <div className="hs-pagination" aria-label="Pagination"><span>Page {pagination.currentPage} of {pagination.lastPage} · {pagination.total} records</span><div>
        <button className="hs-button hs-button--secondary" type="button" disabled={busy || pagination.currentPage <= 1} onClick={() => onPageChange(pagination.currentPage - 1)}>Previous</button>
        <button className="hs-button hs-button--secondary" type="button" disabled={busy || pagination.currentPage >= pagination.lastPage} onClick={() => onPageChange(pagination.currentPage + 1)}>Next</button>
    </div></div>;
}

export function RecordTable({ columns, rows, rowKey }) {
    return <div className="hs-table-wrap"><table className="hs-table"><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={rowKey(row) ?? index}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>)}</tbody></table></div>;
}

