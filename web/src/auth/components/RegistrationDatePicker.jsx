import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createPortal } from "react-dom";
import "./RegistrationDatePicker.css";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EARLIEST_YEAR = 1900;

const toIsoDate = (year, month, day) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const formatDate = (value) => value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00.000Z`))
    : "";

function RegistrationDatePicker({ id, value, maxDate, minimumAge, onChange, errorMessage }) {
    const triggerRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const [year, month, day] = (value || maxDate).split("-").map(Number);
        return new Date(year, month - 1, day);
    });

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const [maxYear, maxMonth] = maxDate.split("-").map(Number);
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth() + 1;
    const monthOptions = MONTHS
        .map((label, index) => ({ label, value: index + 1 }))
        .filter((option) => year < maxYear || option.value <= maxMonth);
    const leadingDays = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [
        ...Array(leadingDays).fill(null),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
    const years = Array.from(
        { length: Math.max(0, maxYear - EARLIEST_YEAR + 1) },
        (_, index) => maxYear - index
    );
    const atEarliestMonth = year === EARLIEST_YEAR && month === 1;
    const atLatestMonth = year === maxYear && month === maxMonth;

    const changeMonth = (nextMonth) => {
        setVisibleMonth(new Date(year, nextMonth - 1, 1));
    };

    const changeYear = (nextYear) => {
        const nextMonth = nextYear === maxYear ? Math.min(month, maxMonth) : month;
        setVisibleMonth(new Date(nextYear, nextMonth - 1, 1));
    };

    const openCalendar = () => {
        const selectedDate = value && value <= maxDate ? value : maxDate;
        const [selectedYear, selectedMonth] = selectedDate.split("-").map(Number);
        setVisibleMonth(new Date(selectedYear, selectedMonth - 1, 1));
        setIsOpen((open) => !open);
    };

    const selectDate = (day) => {
        const date = toIsoDate(year, month, day);
        if (date > maxDate) return;
        onChange(date);
        setIsOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <div className="registration-date-picker">
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`registration-date-trigger ${errorMessage ? "has-error" : ""}`}
                onClick={openCalendar}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={`${id}-calendar`}
                aria-required="true"
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? `${id}-error` : `${id}-hint`}
            >
                <CalendarDays size={18} aria-hidden="true" />
                <span className={value ? "" : "registration-date-placeholder"}>
                    {value ? formatDate(value) : "Select your birthday"}
                </span>
                <ChevronDown className="registration-date-chevron" size={16} aria-hidden="true" />
            </button>
            <small className="registration-date-hint" id={`${id}-hint`}>
                Choose a date on or before {formatDate(maxDate)} ({minimumAge}+).
            </small>
            {errorMessage && (
                <small className="registration-field-error" id={`${id}-error`}>
                    {errorMessage}
                </small>
            )}
            {isOpen && createPortal(
                <div
                    className="registration-calendar-backdrop"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setIsOpen(false);
                            triggerRef.current?.focus();
                        }
                    }}
                >
                    <div
                        className="registration-calendar"
                        id={`${id}-calendar`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={`${id}-calendar-title`}
                    >
                        <div className="registration-calendar-heading">
                            <span className="registration-calendar-icon"><CalendarDays size={20} aria-hidden="true" /></span>
                            <div>
                                <h2 id={`${id}-calendar-title`}>Choose your birthday</h2>
                                <p>Age requirement: {minimumAge} years or older</p>
                            </div>
                            <button
                                type="button"
                                className="registration-calendar-close"
                                onClick={() => {
                                    setIsOpen(false);
                                    triggerRef.current?.focus();
                                }}
                                aria-label="Close calendar"
                            >
                                ×
                            </button>
                        </div>
                        <div className="registration-calendar-header">
                            <div className="registration-calendar-selects">
                                <label className="registration-calendar-select">
                                    <span className="sr-only">Month</span>
                                    <select
                                        value={month}
                                        onChange={(event) => changeMonth(Number(event.target.value))}
                                    >
                                        {monthOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="registration-calendar-select year">
                                    <span className="sr-only">Year</span>
                                    <select value={year} onChange={(event) => changeYear(Number(event.target.value))}>
                                        {years.map((option) => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                </label>
                            </div>
                            <div className="registration-calendar-nav">
                                <button
                                    type="button"
                                    onClick={() => setVisibleMonth(new Date(year, month - 2, 1))}
                                    disabled={atEarliestMonth}
                                    aria-label="Previous month"
                                >
                                    <ChevronLeft size={17} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVisibleMonth(new Date(year, month, 1))}
                                    disabled={atLatestMonth}
                                    aria-label="Next month"
                                >
                                    <ChevronRight size={17} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                        <div className="registration-calendar-grid" role="grid" aria-label={`${MONTHS[month - 1]} ${year}`}>
                            {WEEKDAYS.map((weekday) => (
                                <span className="registration-calendar-weekday" role="columnheader" key={weekday}>
                                    {weekday}
                                </span>
                            ))}
                            {days.map((day, index) => {
                                if (!day) return <span className="registration-calendar-empty" role="gridcell" key={`empty-${index}`} />;
                                const date = toIsoDate(year, month, day);
                                const disabled = date > maxDate;
                                const selected = date === value;
                                const latestEligible = date === maxDate;
                                return (
                                    <span role="gridcell" key={date}>
                                        <button
                                            type="button"
                                            className={`registration-calendar-day ${selected ? "selected" : ""} ${latestEligible ? "latest-eligible" : ""}`}
                                            onClick={() => selectDate(day)}
                                            disabled={disabled}
                                            aria-label={formatDate(date)}
                                            aria-pressed={selected}
                                        >
                                            {day}
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                        <p className="registration-calendar-note">
                            Choose a date on or before <strong>{formatDate(maxDate)}</strong> to register.
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default RegistrationDatePicker;
