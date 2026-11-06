import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    Check,
    Filter,
    RefreshCw,
    RotateCcw,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard/ProductCard";
import { CATEGORY_FILTERS } from "../../../shared/constants/categories";
import { isBuyerSession } from "../../../shared/utils/buyerAccess";
import {
    matchesProductCategory,
    matchesProductSearch,
} from "../../../shared/utils/productDiscovery";
import "./Categories.css";

const SORT_OPTIONS = [
    { value: "featured", label: "Recommended" },
    { value: "newest", label: "Newest arrivals" },
    { value: "price-low", label: "Price: low to high" },
    { value: "price-high", label: "Price: high to low" },
];

function getBuyerGreetingName() {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const firstName = user?.first_name || user?.firstName || user?.name?.split(" ")[0] || user?.username;
        return typeof firstName === "string" && firstName.trim() ? firstName.trim() : "";
    } catch {
        return "";
    }
}

function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();
    const buyerSession = isBuyerSession();
    const greetingName = buyerSession ? getBuyerGreetingName() : "";

    const [storedProducts, setProducts] = useState([]);
    const [storedLoading, setLoading] = useState(true);
    const [storedLoadingMore, setLoadingMore] = useState(false);
    const [storedLoadError, setLoadError] = useState(false);
    const [storedLoadMoreError, setLoadMoreError] = useState(false);
    const [storedHasMore, setHasMore] = useState(false);
    const [storedCurrentPage, setCurrentPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [loadedQueryIdentity, setLoadedQueryIdentity] = useState(null);

    const [filterOpen, setFilterOpen] = useState(false);
    const loadMoreRef = useRef(null);
    const filterToggleRef = useRef(null);
    const filterPanelRef = useRef(null);
    const filterCloseRef = useRef(null);
    const resultsRef = useRef(null);
    const loadMoreInFlightRef = useRef(false);
    const requestVersionRef = useRef(0);
    const readyQueryRef = useRef("");

    const category = searchParams.get("category") || "All";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "featured";
    const minPrice = searchParams.get("minPrice") || "";
    const maxPrice = searchParams.get("maxPrice") || "";
    const stockOnly = searchParams.get("stock") === "1";
    const requestKey = useMemo(() => JSON.stringify({
        per_page: 20,
        category: category === "All" ? undefined : category,
        search: search.trim() || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        stock: stockOnly ? 1 : undefined,
        sort,
    }), [category, search, sort, minPrice, maxPrice, stockOnly]);
    const requestIdentity = JSON.stringify([requestKey, reloadKey]);
    const isCurrentQueryLoaded = loadedQueryIdentity === requestIdentity;
    const products = useMemo(() => (
        isCurrentQueryLoaded ? storedProducts : []
    ), [isCurrentQueryLoaded, storedProducts]);
    const loading = !isCurrentQueryLoaded || storedLoading;
    const loadingMore = isCurrentQueryLoaded && storedLoadingMore;
    const loadError = isCurrentQueryLoaded && storedLoadError;
    const loadMoreError = isCurrentQueryLoaded && storedLoadMoreError;
    const hasMore = isCurrentQueryLoaded && storedHasMore;
    const currentPage = isCurrentQueryLoaded ? storedCurrentPage : 1;
    const [draftFilters, setDraftFilters] = useState({
        category: searchParams.get("category") || "All",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        stock: searchParams.get("stock") === "1",
    });

    useEffect(() => {
        if (!filterOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        const mobileQuery = window.matchMedia("(max-width: 900px)");
        const filterToggle = filterToggleRef.current;
        const syncScrollLock = () => {
            document.body.style.overflow = mobileQuery.matches ? "hidden" : previousOverflow;
            if (mobileQuery.matches) filterCloseRef.current?.focus();
        };
        syncScrollLock();
        mobileQuery.addEventListener("change", syncScrollLock);

        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setFilterOpen(false);
                return;
            }

            if (event.key !== "Tab" || !mobileQuery.matches) return;
            const focusable = [...(filterPanelRef.current?.querySelectorAll(
                "button:not([disabled]), input:not([disabled]), select:not([disabled])"
            ) || [])];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            mobileQuery.removeEventListener("change", syncScrollLock);
            document.removeEventListener("keydown", closeOnEscape);
            if (mobileQuery.matches) filterToggle?.focus();
        };
    }, [filterOpen]);

    useEffect(() => {
        let cancelled = false;
        const requestVersion = ++requestVersionRef.current;
        readyQueryRef.current = "";
        loadMoreInFlightRef.current = false;

        api.get("/products", { params: { ...JSON.parse(requestKey), page: 1 } })
            .then(({ data }) => {
                if (cancelled || requestVersion !== requestVersionRef.current) return;
                const pageData = data?.data;
                const items = Array.isArray(pageData?.data)
                    ? pageData.data
                    : Array.isArray(data?.data)
                        ? data.data
                        : Array.isArray(data?.products)
                            ? data.products
                            : [];
                const loadedPage = Math.max(1, Number(pageData?.current_page) || 1);
                const lastPage = Math.max(1, Number(pageData?.last_page) || 1);
                setProducts(items);
                setCurrentPage(loadedPage);
                setHasMore(loadedPage < lastPage);
                setLoadingMore(false);
                setLoadError(false);
                setLoadMoreError(false);
                readyQueryRef.current = requestKey;
            })
            .catch((error) => {
                console.error("Unable to load products:", error);
                if (!cancelled && requestVersion === requestVersionRef.current) {
                    setProducts([]);
                    setCurrentPage(1);
                    setHasMore(false);
                    setLoadingMore(false);
                    setLoadMoreError(false);
                    setLoadError(true);
                }
            })
            .finally(() => {
                if (!cancelled && requestVersion === requestVersionRef.current) {
                    setLoading(false);
                    setLoadedQueryIdentity(requestIdentity);
                }
            });

        return () => { cancelled = true; };
    }, [reloadKey, requestIdentity, requestKey]);

    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel || !isCurrentQueryLoaded || !hasMore || loading || loadingMore || loadError || loadMoreError || readyQueryRef.current !== requestKey) return undefined;

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting || loadMoreInFlightRef.current) return;
            const requestVersion = requestVersionRef.current;
            const nextPage = currentPage + 1;
            loadMoreInFlightRef.current = true;
            setLoadingMore(true);

            api.get("/products", { params: { ...JSON.parse(requestKey), page: nextPage } })
                .then(({ data }) => {
                    if (requestVersion !== requestVersionRef.current) return;
                    const pageData = data?.data;
                    const items = Array.isArray(pageData?.data)
                        ? pageData.data
                        : Array.isArray(data?.data)
                            ? data.data
                            : Array.isArray(data?.products)
                                ? data.products
                                : [];
                    const loadedPage = Math.max(nextPage, Number(pageData?.current_page) || nextPage);
                    const lastPage = Math.max(loadedPage, Number(pageData?.last_page) || loadedPage);
                    setProducts((current) => {
                        const existingIds = new Set(current.map((product) => String(product.id)));
                        return [...current, ...items.filter((product) => !existingIds.has(String(product.id)))];
                    });
                    setCurrentPage(loadedPage);
                    setHasMore(loadedPage < lastPage);
                    setLoadMoreError(false);
                })
                .catch((error) => {
                    console.error("Unable to load more products:", error);
                    if (requestVersion === requestVersionRef.current) setLoadMoreError(true);
                })
                .finally(() => {
                    if (requestVersion === requestVersionRef.current) {
                        loadMoreInFlightRef.current = false;
                        setLoadingMore(false);
                    }
                });
        }, { rootMargin: "640px 0px" });

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [requestKey, requestIdentity, currentPage, hasMore, loading, loadingMore, loadError, loadMoreError, reloadKey, isCurrentQueryLoaded]);

    const updateParams = (updates = {}) => {
        const params = new URLSearchParams(searchParams);

        Object.entries(updates).forEach(([key, value]) => {
            if (
                value === undefined ||
                value === null ||
                value === "" ||
                value === false ||
                value === "All" ||
                value === "0" ||
                value === "featured"
            ) {
                params.delete(key);
            } else {
                params.set(key, String(value));
            }
        });

        setSearchParams(params);
    };

    const handleSort = (value) => {
        updateParams({ sort: value });
    };

    const handleRefreshProducts = () => {
        setReloadKey((value) => value + 1);
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams);

        if (
            draftFilters.category &&
            draftFilters.category !== "All"
        ) {
            params.set("category", draftFilters.category);
        } else {
            params.delete("category");
        }

        if (draftFilters.minPrice) {
            params.set("minPrice", draftFilters.minPrice);
        } else {
            params.delete("minPrice");
        }

        if (draftFilters.maxPrice) {
            params.set("maxPrice", draftFilters.maxPrice);
        } else {
            params.delete("maxPrice");
        }

        if (draftFilters.stock) {
            params.set("stock", "1");
        } else {
            params.delete("stock");
        }

        setSearchParams(params);
        setFilterOpen(false);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams);

        params.delete("category");
        params.delete("minPrice");
        params.delete("maxPrice");
        params.delete("stock");
        params.delete("sort");

        setSearchParams(params);

        setDraftFilters({
            category: "All",
            minPrice: "",
            maxPrice: "",
            stock: false,
        });
    };

    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (category !== "All") {
            result = result.filter((product) => matchesProductCategory(product, category));
        }

        if (search.trim()) {
            result = result.filter((product) => matchesProductSearch(product, search));
        }

        if (minPrice !== "") {
            result = result.filter(
                (product) =>
                    Number(product?.price || 0) >=
                    Number(minPrice)
            );
        }

        if (maxPrice !== "") {
            result = result.filter(
                (product) =>
                    Number(product?.price || 0) <=
                    Number(maxPrice)
            );
        }

        if (stockOnly) {
            result = result.filter(
                (product) =>
                    Number(product?.stock || 0) > 0
            );
        }

        if (sort === "price-low") {
            result.sort(
                (a, b) =>
                    Number(a?.price || 0) -
                    Number(b?.price || 0)
            );
        }

        if (sort === "price-high") {
            result.sort(
                (a, b) =>
                    Number(b?.price || 0) -
                    Number(a?.price || 0)
            );
        }

        if (sort === "newest") {
            result.sort((a, b) => {
                const dateA = new Date(
                    a?.created_at || 0
                ).getTime();

                const dateB = new Date(
                    b?.created_at || 0
                ).getTime();

                if (dateA && dateB) {
                    return dateB - dateA;
                }

                return (
                    Number(b?.id || 0) -
                    Number(a?.id || 0)
                );
            });
        }

        return result;
    }, [
        products,
        category,
        search,
        minPrice,
        maxPrice,
        stockOnly,
        sort,
    ]);

    const activeFilterCount = [
        category !== "All",
        minPrice !== "",
        maxPrice !== "",
        stockOnly,
    ].filter(Boolean).length;

    const categoryTitle =
        category === "All"
            ? "Showing all products"
            : `Showing: ${category}`;

    return (
        <div className="shop-page">

            {/* HEADER */}

            <section className="shop-header">
                <div className="shop-header-copy">
                    <span className="shop-eyebrow">
                        CRYMA MARKETPLACE
                    </span>

                    <span className="shop-welcome-badge"><span aria-hidden="true">👋</span> {buyerSession ? `Welcome back${greetingName ? `, ${greetingName}` : ""}!` : "Welcome to CRYMA"}</span>
                    <h1>{buyerSession ? "Good finds start here." : "Welcome to the marketplace."}</h1>
                    <p>Discover independent sellers, everyday favorites, and new finds across CRYMA.</p>
                </div>
            </section>

            <div className="shop-category-nav-shell">
                <div className="shop-category-heading">
                    <span>MAKE IT YOURS</span>
                    <strong>Browse by category</strong>
                </div>
                <nav className="shop-category-nav" aria-label="Shop by category">
                    {CATEGORY_FILTERS.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={category === item ? "active" : ""}
                            aria-pressed={category === item}
                            onClick={() => {
                                if (filterOpen) setDraftFilters((current) => ({ ...current, category: item }));
                                updateParams({ category: item });
                            }}
                        >
                            {item === "All" ? "All Products" : item}
                        </button>
                    ))}
                </nav>
            </div>

            {/* SHOP CONTROLS */}

            <section className="shop-controls">

                <div className="shop-filter-group">

                            <button
                                type="button"
                                ref={filterToggleRef}
                                className={`shop-filter-button ${activeFilterCount > 0 ? "has-filters" : ""}`}
                                aria-label={activeFilterCount ? `Filters and sort, ${activeFilterCount} active` : "Open filters and sort"}
                                aria-expanded={filterOpen}
                                aria-controls="shop-filter-panel"
                        onClick={() => {
                            if (!filterOpen) {
                                setDraftFilters({
                                    category,
                                    minPrice,
                                    maxPrice,
                                    stock: stockOnly,
                                });
                            }
                            setFilterOpen((open) => !open);
                        }}
                    >
                        <span className="shop-filter-symbol"><SlidersHorizontal size={16} aria-hidden="true" /></span>
                        <span className="shop-filter-copy"><b>Filters &amp; Sort</b><small>Refine your results</small></span>

                        {activeFilterCount > 0 && (
                            <b>
                                {activeFilterCount}
                            </b>
                        )}
                    </button>

                    <button
                        type="button"
                        className="shop-refresh-button"
                        onClick={handleRefreshProducts}
                        disabled={loading}
                        aria-label="Refresh products"
                        title="Refresh products"
                    >
                        <RefreshCw size={15} className={loading ? "is-spinning" : ""} aria-hidden="true" />
                    </button>

                    <div className="shop-active-filters">

                        {category !== "All" && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (filterOpen) setDraftFilters((current) => ({ ...current, category: "All" }));
                                    updateParams({ category: "All" });
                                }}
                            >
                                {category}
                                <X size={12} />
                            </button>
                        )}

                        {minPrice !== "" && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (filterOpen) setDraftFilters((current) => ({ ...current, minPrice: "" }));
                                    updateParams({ minPrice: "" });
                                }}
                            >
                                Min ₱{Number(minPrice).toLocaleString()}
                                <X size={12} />
                            </button>
                        )}

                        {maxPrice !== "" && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (filterOpen) setDraftFilters((current) => ({ ...current, maxPrice: "" }));
                                    updateParams({ maxPrice: "" });
                                }}
                            >
                                Max ₱{Number(maxPrice).toLocaleString()}
                                <X size={12} />
                            </button>
                        )}

                        {stockOnly && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (filterOpen) setDraftFilters((current) => ({ ...current, stock: false }));
                                    updateParams({ stock: false });
                                }}
                            >
                                In Stock
                                <X size={12} />
                            </button>
                        )}

                    </div>
                </div>

            </section>

            <div className={`shop-results-layout${filterOpen ? " filters-open" : ""}`}>

            {filterOpen && (
                <>
                    <button type="button" className="shop-filter-backdrop" aria-label="Close filters" onClick={() => setFilterOpen(false)} />
                    <aside className="shop-filter-drawer" id="shop-filter-panel" ref={filterPanelRef} aria-label="Product filters">

                        <div className="shop-filter-header">

                            <div>
                                <span>
                                    REFINE RESULTS
                                </span>

                                <h2>
                                    Filters
                                </h2>
                            </div>

                            <button
                                type="button"
                                ref={filterCloseRef}
                                onClick={() =>
                                    setFilterOpen(false)
                                }
                                aria-label="Close filters"
                            >
                                <X size={20} />
                            </button>

                        </div>

                        <div className="shop-filter-content">

                            <div className="shop-filter-section shop-filter-sort-row">
                                <label htmlFor="shop-sort-select">Sort by</label>
                                <select id="shop-sort-select" value={sort} onChange={(event) => handleSort(event.target.value)}>
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* CATEGORY */}

                            <div className="shop-filter-section">

                                <div className="shop-filter-section-title">
                                    <strong>
                                        Category
                                    </strong>
                                </div>

                                <div className="shop-category-options">

                                    {CATEGORY_FILTERS.map(
                                        (item) => (
                                            <button
                                                key={item}
                                                type="button"
                                                className={
                                                    draftFilters.category ===
                                                    item
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setDraftFilters(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,
                                                            category:
                                                                item,
                                                        })
                                                    )
                                                }
                                            >
                                                <span>
                                                    {item}
                                                </span>

                                                {draftFilters.category ===
                                                    item && (
                                                    <Check
                                                        size={
                                                            15
                                                        }
                                                    />
                                                )}
                                            </button>
                                        )
                                    )}

                                </div>

                            </div>

                            {/* PRICE */}

                            <div className="shop-filter-section">

                                <div className="shop-filter-section-title">
                                    <strong>
                                        Price Range
                                    </strong>

                                    <span>
                                        ₱
                                    </span>
                                </div>

                                <div className="shop-price-inputs">

                                    <label>
                                        <span>
                                            Min
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={
                                                draftFilters.minPrice
                                            }
                                            onChange={(event) =>
                                                setDraftFilters(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,
                                                        minPrice:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                        />
                                    </label>

                                    <span className="shop-price-divider">
                                        —
                                    </span>

                                    <label>
                                        <span>
                                            Max
                                        </span>

                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Any"
                                            value={
                                                draftFilters.maxPrice
                                            }
                                            onChange={(event) =>
                                                setDraftFilters(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,
                                                        maxPrice:
                                                            event
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                        />
                                    </label>

                                </div>

                            </div>

                            {/* STOCK */}

                            <div className="shop-filter-section">

                                <div className="shop-filter-stock-row">

                                    <div>
                                        <strong>
                                            In Stock Only
                                        </strong>

                                        <span>
                                            Hide products
                                            that are sold out
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className={`shop-toggle ${
                                            draftFilters.stock
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setDraftFilters(
                                                (
                                                    current
                                                ) => ({
                                                    ...current,
                                                    stock:
                                                        !current.stock,
                                                })
                                            )
                                        }
                                        aria-label="Toggle in stock only"
                                    >
                                        <span />
                                    </button>

                                </div>

                            </div>

                        </div>

                        <div className="shop-filter-footer">

                            <button
                                type="button"
                                className="shop-clear-button"
                                onClick={
                                    handleClearFilters
                                }
                            >
                                Clear All
                            </button>

                            <button
                                type="button"
                                className="shop-apply-button"
                                onClick={
                                    handleApplyFilters
                                }
                            >
                                Apply filters
                            </button>

                        </div>

                    </aside>
                </>
            )}



            {/* RESULTS */}

            <section className="shop-results" ref={resultsRef}>

                <div className="shop-results-heading">

                    <div>
                        <h2>
                            {categoryTitle}
                        </h2>
                    </div>

                    {search && (
                        <p>
                            Search results for{" "}
                            <strong>
                                "{search}"
                            </strong>
                        </p>
                    )}

                </div>

                {loading ? (
                    <div className="shop-product-grid shop-skeleton-grid" aria-label="Loading products" aria-busy="true">
                        {Array.from({ length: 12 }, (_, index) => (
                            <div className="shop-skeleton-card" key={index}>
                                <div className="shop-skeleton-image" />
                                <div className="shop-skeleton-copy"><span /><span /><span /></div>
                            </div>
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="shop-empty shop-error-state" role="alert">
                        <div className="shop-empty-icon"><AlertCircle size={24} /></div>
                        <h2>Unable to load products</h2>
                        <p>Please check your connection and try again.</p>
                        <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
                            <RefreshCw size={14} /> Try again
                        </button>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <>
                        <div className="shop-product-grid">
                            {filteredProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onAddToCart={(item) => {
                                        const event = new CustomEvent("cryma-add-to-cart", { detail: item, cancelable: true });
                                        window.dispatchEvent(event);
                                        return !event.defaultPrevented;
                                    }}
                                />
                            ))}
                        </div>
                        {loadingMore && (
                            <div className="shop-product-grid shop-skeleton-grid shop-load-more-skeletons" aria-label="Loading more products" aria-busy="true">
                                {Array.from({ length: 5 }, (_, index) => (
                                    <div className="shop-skeleton-card" key={index}>
                                        <div className="shop-skeleton-image" />
                                        <div className="shop-skeleton-copy"><span /><span /><span /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {loadMoreError && (
                            <div className="shop-load-more-error" role="alert">
                                <span>We couldn’t load the next set of finds.</span>
                                <button type="button" onClick={() => setLoadMoreError(false)}>Try again</button>
                            </div>
                        )}
                        <div className="shop-scroll-sentinel" ref={loadMoreRef} aria-hidden="true" />
                    </>
                ) : (
                    <div className="shop-empty">

                        <div className="shop-empty-icon">
                            <Filter size={24} />
                        </div>

                        <h2>
                            No products found
                        </h2>

                        <p>
                            Try changing your search
                            or filters.
                        </p>

                        <button
                            type="button"
                            onClick={handleClearFilters}
                        >
                            <RotateCcw size={14} />
                            Clear filters
                        </button>

                    </div>
                )}

            </section>

            </div>
        </div>
    );
}

export default Categories;
