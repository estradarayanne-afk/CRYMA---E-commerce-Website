import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    Check,
    ChevronDown,
    Filter,
    RefreshCw,
    RotateCcw,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard/ProductCard";
import { CATEGORY_FILTERS } from "../../../shared/constants/categories";
import { LANDING_VISUALS } from "../../../shared/constants/landingVisuals";
import "./Categories.css";

function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [filterOpen, setFilterOpen] = useState(false);

    const [draftFilters, setDraftFilters] = useState({
        category: searchParams.get("category") || "All",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        stock: searchParams.get("stock") === "1",
    });

    useEffect(() => {
        let cancelled = false;

        const loadProducts = async () => {
            setLoading(true);
            setLoadError(false);

            try {
                const response = await api.get("/products", {
                    params: {
                        per_page: 100,
                        page: 1,
                    },
                });

                const payload = response.data;
                const pageData = payload?.data;
                const getItems = (value) => Array.isArray(value)
                    ? value
                    : Array.isArray(value?.data?.data)
                        ? value.data.data
                        : Array.isArray(value?.data)
                            ? value.data
                            : Array.isArray(value?.products)
                                ? value.products
                                : [];
                const items = getItems(payload);
                const pages = Math.max(1, Number(pageData?.last_page) || 1);

                for (let page = 2; page <= pages; page += 1) {
                    if (cancelled) break;
                    const nextResponse = await api.get("/products", {
                        params: { per_page: 100, page },
                    });
                    items.push(...getItems(nextResponse.data));
                }

                if (!cancelled) {
                    setProducts(items);
                }
            } catch (error) {
                console.error("Unable to load products:", error);

                if (!cancelled) {
                    setProducts([]);
                    setLoadError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const category = searchParams.get("category") || "All";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "featured";
    const minPrice = searchParams.get("minPrice") || "";
    const maxPrice = searchParams.get("maxPrice") || "";
    const stockOnly = searchParams.get("stock") === "1";

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

    const openProduct = (product) => {
        navigate(`/products/${product.id}`);
    };

    const handleSort = (event) => {
        updateParams({
            sort: event.target.value,
        });
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
            result = result.filter(
                (product) =>
                    product?.category?.toLowerCase() ===
                    category.toLowerCase()
            );
        }

        if (search.trim()) {
            const keyword = search.toLowerCase().trim();

            result = result.filter((product) => {
                const name =
                    product?.name?.toLowerCase() || "";

                const productCategory =
                    product?.category?.toLowerCase() || "";

                const seller =
                    typeof product?.seller === "string"
                        ? product.seller.toLowerCase()
                        : product?.seller?.name?.toLowerCase() || "";

                return (
                    name.includes(keyword) ||
                    productCategory.includes(keyword) ||
                    seller.includes(keyword)
                );
            });
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
            ? "All products"
            : category;

    return (
        <div className="shop-page">

            {/* HEADER */}

            <section className="shop-header">
                <div className="shop-header-copy">
                    <span className="shop-eyebrow">
                        CRYMA MARKETPLACE
                    </span>

                    <h1>Explore Products</h1>
                    <p>Find what you need from trusted sellers on CRYMA.</p>
                </div>
                <div className="shop-header-visual">
                    <img src={LANDING_VISUALS.hero.src} alt={LANDING_VISUALS.hero.alt} />
                    <span>Find your next favorite</span>
                </div>
            </section>

            <nav className="shop-category-nav" aria-label="Shop by category">
                {CATEGORY_FILTERS.map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={category === item ? "active" : ""}
                        aria-pressed={category === item}
                        onClick={() => updateParams({ category: item })}
                    >
                        {item === "All" ? "All Products" : item}
                    </button>
                ))}
            </nav>

            {/* SHOP CONTROLS */}

            <section className="shop-controls">

                <div className="shop-filter-group">

                    <button
                        type="button"
                        className={`shop-filter-button ${
                            activeFilterCount > 0
                                ? "has-filters"
                                : ""
                        }`}
                        onClick={() => {
                            setDraftFilters({
                                category,
                                minPrice,
                                maxPrice,
                                stock: stockOnly,
                            });
                            setFilterOpen(true);
                        }}
                    >
                        <Filter size={16} />

                        <span>
                            Filters
                        </span>

                        {activeFilterCount > 0 && (
                            <b>
                                {activeFilterCount}
                            </b>
                        )}
                    </button>

                    <div className="shop-active-filters">

                        {category !== "All" && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        category: "All",
                                    })
                                }
                            >
                                {category}
                                <X size={12} />
                            </button>
                        )}

                        {minPrice !== "" && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        minPrice: "",
                                    })
                                }
                            >
                                Min ₱{Number(minPrice).toLocaleString()}
                                <X size={12} />
                            </button>
                        )}

                        {maxPrice !== "" && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        maxPrice: "",
                                    })
                                }
                            >
                                Max ₱{Number(maxPrice).toLocaleString()}
                                <X size={12} />
                            </button>
                        )}

                        {stockOnly && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        stock: false,
                                    })
                                }
                            >
                                In Stock
                                <X size={12} />
                            </button>
                        )}

                    </div>
                </div>

                <p className="shop-result-count" aria-live="polite">
                    {loading ? "Loading products" : loadError ? "Products unavailable" : `${filteredProducts.length} products`}
                </p>

                <div className="shop-sort-control">
                    <span>
                        Sort by
                    </span>

                    <div className="shop-sort-select">
                        <SlidersHorizontal size={15} />

                        <select
                            value={sort}
                            onChange={handleSort}
                        >
                            <option value="featured">
                                Featured
                            </option>

                            <option value="newest">
                                Newest
                            </option>

                            <option value="price-low">
                                Price: Low to High
                            </option>

                            <option value="price-high">
                                Price: High to Low
                            </option>
                        </select>

                        <ChevronDown size={14} />
                    </div>
                </div>

            </section>

            {/* RESULTS */}

            <section className="shop-results">

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
                    <div className="shop-product-grid">

                        {filteredProducts.map(
                            (product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onOpen={openProduct}
                                    onAddToCart={(item) => {
                                        const event = new CustomEvent(
                                                "cryma-add-to-cart",
                                                { detail: item, cancelable: true }
                                            );
                                        window.dispatchEvent(event);
                                        return !event.defaultPrevented;
                                    }}
                                />
                            )
                        )}

                    </div>
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

            {/* FILTER DRAWER */}

            {filterOpen && (
                <div
                    className="shop-filter-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setFilterOpen(false);
                        }
                    }}
                >
                    <aside className="shop-filter-drawer">

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
                                onClick={() =>
                                    setFilterOpen(false)
                                }
                                aria-label="Close filters"
                            >
                                <X size={20} />
                            </button>

                        </div>

                        <div className="shop-filter-content">

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
                                Show{" "}
                                {
                                    filteredProducts.length
                                }{" "}
                                Products
                            </button>

                        </div>

                    </aside>
                </div>
            )}

        </div>
    );
}

export default Categories;
