import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Search,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import api from "../../../shared/services/api";

import "./Orders.css";

const ORDERS_PER_PAGE = 10;

const STATUS_OPTIONS = [
    { value: "", label: "All Orders" },
    { value: "pending", label: "Pending" },
    { value: "placed", label: "Placed" },
    { value: "confirmed", label: "Confirmed" },
    { value: "preparing", label: "Preparing" },
    {
        value: "ready_for_pickup",
        label: "Ready for Pickup",
    },
    {
        value: "picked_up",
        label: "Picked Up",
    },
    {
        value: "at_sorting_center",
        label: "At Sorting Center",
    },
    {
        value: "sorted",
        label: "Sorted",
    },
    {
        value: "assigned_to_rider",
        label: "Assigned to Rider",
    },
    {
        value: "out_for_delivery",
        label: "Out for Delivery",
    },
    {
        value: "delivered",
        label: "Delivered",
    },
    {
        value: "completed",
        label: "Completed",
    },
    {
        value: "delivery_failed",
        label: "Delivery Failed",
    },
    {
        value: "returned",
        label: "Returned",
    },
];

const DATE_PRESETS = [
    { value: "", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "7", label: "Last 7 Days" },
    { value: "30", label: "Last 30 Days" },
    { value: "month", label: "This Month" },
    { value: "last_month", label: "Last Month" },
    { value: "custom", label: "Custom Range" },
];

const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "highest", label: "Highest Amount" },
    { value: "lowest", label: "Lowest Amount" },
];

function Orders() {
    const [searchParams, setSearchParams] =
        useSearchParams();

    const [orders, setOrders] = useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [pagination, setPagination] =
        useState({
            currentPage: 1,
            lastPage: 1,
            total: 0,
            from: 0,
            to: 0,
        });

    const [searchInput, setSearchInput] =
        useState(
            searchParams.get("search") || ""
        );

    const [statusInput, setStatusInput] =
        useState(
            searchParams.get("status") || ""
        );

    const [datePreset, setDatePreset] =
        useState(
            searchParams.get("date") || ""
        );

    const [dateFrom, setDateFrom] =
        useState(
            searchParams.get("date_from") || ""
        );

    const [dateTo, setDateTo] =
        useState(
            searchParams.get("date_to") || ""
        );

    const [sortInput, setSortInput] =
        useState(
            searchParams.get("sort") ||
                "newest"
        );

    const [filtersOpen, setFiltersOpen] =
        useState(false);

    const currentPage =
        Number(
            searchParams.get("page") || 1
        );

    const formatCurrency = (amount) => {
        return `₱${Number(
            amount || 0
        ).toLocaleString()}`;
    };

    const getStatusLabel = (status) => {
        const normalized =
            String(status || "")
                .toLowerCase();

        const match =
            STATUS_OPTIONS.find(
                (option) =>
                    option.value ===
                    normalized
            );

        if (match) {
            return match.label;
        }

        return normalized
            ? normalized
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (letter) =>
                      letter.toUpperCase()
                  )
            : "Unknown";
    };

    const getStatusClass = (status) => {
        const normalized =
            String(status || "")
                .toLowerCase()
                .replaceAll("_", "-");

        if (
            [
                "delivered",
                "completed",
            ].includes(normalized)
        ) {
            return "status-success";
        }

        if (
            [
                "delivery-failed",
                "returned",
            ].includes(normalized)
        ) {
            return "status-danger";
        }

        if (
            [
                "out-for-delivery",
                "assigned-to-rider",
                "picked-up",
                "sorted",
                "at-sorting-center",
            ].includes(normalized)
        ) {
            return "status-shipping";
        }

        if (
            [
                "confirmed",
                "preparing",
                "ready-for-pickup",
            ].includes(normalized)
        ) {
            return "status-progress";
        }

        return "status-pending";
    };

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Date unavailable";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString(
            "en-PH",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );
    };

    const getProductPreview = (order) => {
        const items = Array.isArray(
            order?.items
        )
            ? order.items
            : [];

        if (!items.length) {
            return {
                name: "Order items",
                quantity: 0,
                image: "",
                extra: 0,
            };
        }

        const firstItem = items[0];

        const product =
            firstItem?.product || {};

        return {
            name:
                product?.name ||
                "Product",
            quantity:
                Number(
                    firstItem?.quantity || 0
                ),
            image:
                product?.image || "",
            extra:
                Math.max(
                    items.length - 1,
                    0
                ),
        };
    };

    const getDateRange = (
        preset
    ) => {
        if (!preset) {
            return {
                from: "",
                to: "",
            };
        }

        const today =
            new Date();

        const formatInputDate = (
            date
        ) => {
            const year =
                date.getFullYear();

            const month =
                String(
                    date.getMonth() + 1
                ).padStart(2, "0");

            const day =
                String(
                    date.getDate()
                ).padStart(2, "0");

            return `${year}-${month}-${day}`;
        };

        if (preset === "custom") {
            return {
                from: dateFrom,
                to: dateTo,
            };
        }

        if (preset === "today") {
            const value =
                formatInputDate(today);

            return {
                from: value,
                to: value,
            };
        }

        if (
            preset === "month"
        ) {
            const firstDay =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );

            return {
                from:
                    formatInputDate(
                        firstDay
                    ),
                to:
                    formatInputDate(
                        today
                    ),
            };
        }

        if (
            preset === "last_month"
        ) {
            const firstDay =
                new Date(
                    today.getFullYear(),
                    today.getMonth() - 1,
                    1
                );

            const lastDay =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    0
                );

            return {
                from:
                    formatInputDate(
                        firstDay
                    ),
                to:
                    formatInputDate(
                        lastDay
                    ),
            };
        }

        const days =
            Number(preset);

        if (!Number.isNaN(days)) {
            const fromDate =
                new Date(today);

            fromDate.setDate(
                fromDate.getDate() -
                    days +
                    1
            );

            return {
                from:
                    formatInputDate(
                        fromDate
                    ),
                to:
                    formatInputDate(
                        today
                    ),
            };
        }

        return {
            from: "",
            to: "",
        };
    };

    const fetchOrders = useCallback(
        async () => {
            setLoading(true);
            setError("");

            try {
                const params = {
                    page: currentPage,
                    per_page:
                        ORDERS_PER_PAGE,
                    sort:
                        searchParams.get(
                            "sort"
                        ) || "newest",
                };

                const search =
                    searchParams.get(
                        "search"
                    );

                const status =
                    searchParams.get(
                        "status"
                    );

                const dateFromParam =
                    searchParams.get(
                        "date_from"
                    );

                const dateToParam =
                    searchParams.get(
                        "date_to"
                    );

                if (search) {
                    params.search =
                        search;
                }

                if (status) {
                    params.status =
                        status;
                }

                if (dateFromParam) {
                    params.date_from =
                        dateFromParam;
                }

                if (dateToParam) {
                    params.date_to =
                        dateToParam;
                }

                const response =
                    await api.get(
                        "/orders",
                        {
                            params,
                        }
                    );

                const payload =
                    response?.data;

                const paginated =
                    payload?.data;

                const items =
                    Array.isArray(
                        paginated?.data
                    )
                        ? paginated.data
                        : Array.isArray(
                              paginated
                          )
                        ? paginated
                        : [];

                setOrders(items);

                setPagination({
                    currentPage:
                        Number(
                            paginated?.current_page ||
                                currentPage
                        ),
                    lastPage:
                        Number(
                            paginated?.last_page ||
                                1
                        ),
                    total:
                        Number(
                            paginated?.total ||
                                items.length
                        ),
                    from:
                        Number(
                            paginated?.from ||
                                (items.length
                                    ? 1
                                    : 0)
                        ),
                    to:
                        Number(
                            paginated?.to ||
                                items.length
                        ),
                });
            } catch (requestError) {
                console.error(
                    "Orders API error:",
                    requestError
                );

                setOrders([]);

                setError(
                    requestError
                        ?.response
                        ?.data
                        ?.message ||
                        "Unable to load your orders. Please try again."
                );
            } finally {
                setLoading(false);
            }
        },
        [currentPage, searchParams]
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchOrders();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchOrders]);

    const applyFilters =
        (event) => {
            event?.preventDefault();

            const params =
                new URLSearchParams();

            const search =
                searchInput.trim();

            if (search) {
                params.set(
                    "search",
                    search
                );
            }

            if (statusInput) {
                params.set(
                    "status",
                    statusInput
                );
            }

            const range =
                getDateRange(
                    datePreset
                );

            if (range.from) {
                params.set(
                    "date_from",
                    range.from
                );
            }

            if (range.to) {
                params.set(
                    "date_to",
                    range.to
                );
            }

            if (sortInput) {
                params.set(
                    "sort",
                    sortInput
                );
            }

            params.set("page", "1");

            setSearchParams(
                params
            );

            setFiltersOpen(false);
        };

    const clearFilters =
        () => {
            setSearchInput("");
            setStatusInput("");
            setDatePreset("");
            setDateFrom("");
            setDateTo("");
            setSortInput("newest");

            setSearchParams({});
            setFiltersOpen(false);
        };

    const goToPage =
        (page) => {
            if (
                page < 1 ||
                page >
                    pagination.lastPage ||
                page ===
                    pagination.currentPage
            ) {
                return;
            }

            const params =
                new URLSearchParams(
                    searchParams
                );

            params.set(
                "page",
                String(page)
            );

            setSearchParams(params);

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        };

    const hasActiveFilters =
        Boolean(
            searchParams.get(
                "search"
            ) ||
                searchParams.get(
                    "status"
                ) ||
                searchParams.get(
                    "date_from"
                ) ||
                searchParams.get(
                    "date_to"
                ) ||
                searchParams.get(
                    "sort"
                )
        );

    return (
        <main className="orders-page">
            <header className="orders-header">
                <div>
                    <span className="orders-eyebrow">
                        PURCHASE HISTORY
                    </span>

                    <h1>My Orders</h1>

                    <p>
                        Track and manage
                        your CRYMA
                        purchases.
                    </p>
                </div>

                {pagination.total >
                    0 && (
                    <div className="orders-count">
                        <strong>
                            {
                                pagination.total
                            }
                        </strong>
                        <span>
                            total orders
                        </span>
                    </div>
                )}
            </header>

            <section className="orders-tools">
                <form
                    className="orders-search"
                    onSubmit={
                        applyFilters
                    }
                >
                    <Search
                        size={17}
                    />

                    <input
                        type="search"
                        value={
                            searchInput
                        }
                        onChange={(event) =>
                            setSearchInput(
                                event.target
                                    .value
                            )
                        }
                        placeholder="Search by product or order number..."
                    />

                    {searchInput && (
                        <button
                            type="button"
                            className="orders-search-clear"
                            onClick={() =>
                                setSearchInput(
                                    ""
                                )
                            }
                            aria-label="Clear search"
                        >
                            <X
                                size={15}
                            />
                        </button>
                    )}

                    <button
                        type="submit"
                        className="orders-search-button"
                    >
                        Search
                    </button>
                </form>

                <button
                    type="button"
                    className={`orders-filter-button ${
                        filtersOpen
                            ? "active"
                            : ""
                    }`}
                    onClick={() =>
                        setFiltersOpen(
                            (current) =>
                                !current
                        )
                    }
                >
                    <SlidersHorizontal
                        size={16}
                    />
                    Filters
                </button>
            </section>

            {filtersOpen && (
                <section className="orders-filter-panel">
                    <div className="orders-filter-heading">
                        <div>
                            <span>
                                REFINE ORDERS
                            </span>

                            <h2>
                                Find a specific
                                order
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setFiltersOpen(
                                    false
                                )
                            }
                            aria-label="Close filters"
                        >
                            <X
                                size={18}
                            />
                        </button>
                    </div>

                    <form
                        className="orders-filter-grid"
                        onSubmit={
                            applyFilters
                        }
                    >
                        <label>
                            <span>
                                Status
                            </span>

                            <select
                                value={
                                    statusInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStatusInput(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {STATUS_OPTIONS.map(
                                    (
                                        option
                                    ) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label>
                            <span>
                                Date
                            </span>

                            <select
                                value={
                                    datePreset
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDatePreset(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {DATE_PRESETS.map(
                                    (
                                        option
                                    ) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <label>
                            <span>
                                Sort by
                            </span>

                            <select
                                value={
                                    sortInput
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSortInput(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {SORT_OPTIONS.map(
                                    (
                                        option
                                    ) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        {datePreset ===
                            "custom" && (
                            <>
                                <label>
                                    <span>
                                        From
                                    </span>

                                    <div className="orders-date-input">
                                        <CalendarDays
                                            size={
                                                15
                                            }
                                        />

                                        <input
                                            type="date"
                                            value={
                                                dateFrom
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setDateFrom(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </label>

                                <label>
                                    <span>
                                        To
                                    </span>

                                    <div className="orders-date-input">
                                        <CalendarDays
                                            size={
                                                15
                                            }
                                        />

                                        <input
                                            type="date"
                                            value={
                                                dateTo
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setDateTo(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </label>
                            </>
                        )}

                        <div className="orders-filter-actions">
                            <button
                                type="button"
                                className="orders-clear-button"
                                onClick={
                                    clearFilters
                                }
                            >
                                Clear
                            </button>

                            <button
                                type="submit"
                                className="orders-apply-button"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {hasActiveFilters && (
                <div className="orders-active-filters">
                    <span>
                        Filters applied
                    </span>

                    {searchParams.get(
                        "search"
                    ) && (
                        <button
                            type="button"
                            onClick={() => {
                                const params =
                                    new URLSearchParams(
                                        searchParams
                                    );

                                params.delete(
                                    "search"
                                );
                                params.set(
                                    "page",
                                    "1"
                                );

                                setSearchInput(
                                    ""
                                );
                                setSearchParams(
                                    params
                                );
                            }}
                        >
                            Search:{" "}
                            {searchParams.get(
                                "search"
                            )}
                            <X
                                size={12}
                            />
                        </button>
                    )}

                    {searchParams.get(
                        "status"
                    ) && (
                        <button
                            type="button"
                            onClick={() => {
                                const params =
                                    new URLSearchParams(
                                        searchParams
                                    );

                                params.delete(
                                    "status"
                                );
                                params.set(
                                    "page",
                                    "1"
                                );

                                setStatusInput(
                                    ""
                                );
                                setSearchParams(
                                    params
                                );
                            }}
                        >
                            {
                                getStatusLabel(
                                    searchParams.get(
                                        "status"
                                    )
                                )
                            }
                            <X
                                size={12}
                            />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={
                            clearFilters
                        }
                    >
                        Clear all
                    </button>
                </div>
            )}

            {loading ? (
                <section className="orders-state">
                    <div className="orders-spinner" />

                    <h2>
                        Loading orders...
                    </h2>

                    <p>
                        Please wait while
                        we get your
                        purchases.
                    </p>
                </section>
            ) : error ? (
                <section className="orders-state orders-state-error">
                    <div className="orders-state-icon">
                        !
                    </div>

                    <h2>
                        We couldn't load
                        your orders
                    </h2>

                    <p>
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={
                            fetchOrders
                        }
                    >
                        Try Again
                    </button>
                </section>
            ) : orders.length ===
              0 ? (
                <section className="orders-state">
                    <div className="orders-empty-icon">
                        <Search
                            size={24}
                        />
                    </div>

                    <h2>
                        {hasActiveFilters
                            ? "No matching orders"
                            : "You haven't placed any orders yet."}
                    </h2>

                    <p>
                        {hasActiveFilters
                            ? "Try changing your search or filters."
                            : "Your purchases will appear here once you place an order."}
                    </p>

                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                        >
                            Clear Filters
                        </button>
                    ) : (
                        <Link to="/shop">
                            Browse Products
                        </Link>
                    )}
                </section>
            ) : (
                <>
                    <section className="orders-list">
                        <div className="orders-list-heading">
                            <div>
                                <h2>
                                    Your
                                    orders
                                </h2>

                                <p>
                                    Showing{" "}
                                    {
                                        pagination.from
                                    }
                                    –
                                    {
                                        pagination.to
                                    }{" "}
                                    of{" "}
                                    {
                                        pagination.total
                                    }
                                </p>
                            </div>
                        </div>

                        {orders.map(
                            (order) => {
                                const preview =
                                    getProductPreview(
                                        order
                                    );

                                return (
                                    <article
                                        className="order-card"
                                        key={
                                            order.id
                                        }
                                    >
                                        <div className="order-card-top">
                                            <div>
                                                <span className="order-number">
                                                    ORDER #
                                                    {
                                                        order.id
                                                    }
                                                </span>

                                                <span className="order-date">
                                                    {formatDate(
                                                        order.created_at
                                                    )}
                                                </span>
                                            </div>

                                            <span
                                                className={`order-status ${getStatusClass(
                                                    order.status
                                                )}`}
                                            >
                                                {getStatusLabel(
                                                    order.status
                                                )}
                                            </span>
                                        </div>

                                        <div className="order-card-main">
                                            <div className="order-product">
                                                <div className="order-product-image">
                                                    {preview.image ? (
                                                        <img
                                                            src={
                                                                preview.image
                                                            }
                                                            alt={
                                                                preview.name
                                                            }
                                                        />
                                                    ) : (
                                                        <span>
                                                            {preview.name
                                                                ?.charAt(
                                                                    0
                                                                )
                                                                ?.toUpperCase() ||
                                                                "C"}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="order-product-info">
                                                    <strong>
                                                        {
                                                            preview.name
                                                        }
                                                    </strong>

                                                    <span>
                                                        Qty:{" "}
                                                        {
                                                            preview.quantity
                                                        }

                                                        {preview.extra >
                                                            0 &&
                                                            ` + ${preview.extra} more item${
                                                                preview.extra >
                                                                1
                                                                    ? "s"
                                                                    : ""
                                                            }`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="order-total">
                                                <span>
                                                    Total
                                                </span>

                                                <strong>
                                                    {formatCurrency(
                                                        order.total_amount
                                                    )}
                                                </strong>
                                            </div>

                                            <Link
                                                className="order-view-button"
                                                to={`/orders/${order.id}`}
                                            >
                                                View Details
                                                <ChevronRight
                                                    size={
                                                        15
                                                    }
                                                />
                                            </Link>
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </section>

                    {pagination.lastPage >
                        1 && (
                        <nav
                            className="orders-pagination"
                            aria-label="Orders pagination"
                        >
                            <button
                                type="button"
                                disabled={
                                    pagination.currentPage <=
                                    1
                                }
                                onClick={() =>
                                    goToPage(
                                        pagination.currentPage -
                                            1
                                    )
                                }
                            >
                                <ChevronLeft
                                    size={15}
                                />
                                Previous
                            </button>

                            <div className="orders-page-numbers">
                                {Array.from(
                                    {
                                        length:
                                            pagination.lastPage,
                                    },
                                    (
                                        _,
                                        index
                                    ) =>
                                        index +
                                        1
                                )
                                    .filter(
                                        (
                                            page
                                        ) =>
                                            page ===
                                                1 ||
                                            page ===
                                                pagination.lastPage ||
                                            Math.abs(
                                                page -
                                                    pagination.currentPage
                                            ) <=
                                                1
                                    )
                                    .map(
                                        (
                                            page,
                                            index,
                                            pages
                                        ) => {
                                            const previous =
                                                pages[
                                                    index -
                                                        1
                                                ];

                                            const showEllipsis =
                                                previous &&
                                                page -
                                                    previous >
                                                    1;

                                            return (
                                                <span
                                                    key={
                                                        page
                                                    }
                                                    className="orders-page-number-wrap"
                                                >
                                                    {showEllipsis && (
                                                        <span className="orders-page-ellipsis">
                                                            ...
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className={
                                                            page ===
                                                            pagination.currentPage
                                                                ? "active"
                                                                : ""
                                                        }
                                                        onClick={() =>
                                                            goToPage(
                                                                page
                                                            )
                                                        }
                                                    >
                                                        {
                                                            page
                                                        }
                                                    </button>
                                                </span>
                                            );
                                        }
                                    )}
                            </div>

                            <button
                                type="button"
                                disabled={
                                    pagination.currentPage >=
                                    pagination.lastPage
                                }
                                onClick={() =>
                                    goToPage(
                                        pagination.currentPage +
                                            1
                                    )
                                }
                            >
                                Next
                                <ChevronRight
                                    size={15}
                                />
                            </button>
                        </nav>
                    )}
                </>
            )}
        </main>
    );
}

export default Orders;