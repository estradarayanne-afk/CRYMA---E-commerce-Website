import { Search } from "lucide-react";
import "./AdminSearchField.css";

function AdminSearchField({
    ariaLabel,
    className = "",
    clearClassName = "",
    onChange,
    onClear,
    placeholder,
    value,
    ...inputProps
}) {
    return (
        <div className={`admin-search-field ${className}`.trim()}>
            <span className="admin-search-field__icon" aria-hidden="true">
                <Search size={15} strokeWidth={1.8} />
            </span>
            <input
                {...inputProps}
                type="search"
                aria-label={ariaLabel || placeholder || "Search"}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            {onClear && value && (
                <button
                    type="button"
                    className={`admin-search-field__clear ${clearClassName}`.trim()}
                    aria-label={`Clear ${ariaLabel || "search"}`}
                    onClick={onClear}
                >
                    ×
                </button>
            )}
        </div>
    );
}

export default AdminSearchField;
