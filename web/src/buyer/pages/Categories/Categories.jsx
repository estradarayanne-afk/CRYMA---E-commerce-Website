import { useEffect, useMemo, useState } from "react";
import {
    Check,
    ChevronDown,
    Filter,
    RotateCcw,
    SlidersHorizontal,
    Star,
    X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../../shared/services/api";
import ProductCard from "../../components/ProductCard.jsx/ProductCard";
import { CATEGORY_FILTERS } from "../../../shared/constants/categories";
import "./Categories.css";

function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filterOpen, setFilterOpen] = useState(false);

    const [draftFilters, setDraftFilters] = useState({
        category: searchParams.get("category") || "All",
        minPrice: searchParams.get("minPrice") || "",
        maxPrice: searchParams.get("maxPrice") || "",
        rating: searchParams.get("rating") || "0",
        stock: searchParams.get("stock") === "1",
    });

    useEffect(() => {
        let cancelled = false;

        const loadProducts = async () => {
            setLoading(true);

            try {
                const response = await api.get("/products", {
                    params: {
                        per_page: 100,
                    },
                });

                const payload = response.data;

                let items = [];

                if (Array.isArray(payload)) {
                    items = payload;
                } else if (Array.isArray(payload?.data?.data)) {
                    items = payload.data.data;
                } else if (Array.isArray(payload?.data)) {
                    items = payload.data;
                } else if (Array.isArray(payload?.products)) {
                    items = payload.products;
                }

                if (!cancelled) {
                    setProducts(items);
                }
            } catch (error) {
                console.error("Unable to load products:", error);

                if (!cancelled) {
                    setProducts([]);
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
    }, []);

    const category = searchParams.get("category") || "All";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "featured";
    const minPrice = searchParams.get("minPrice") || "";
    const maxPrice = searchParams.get("maxPrice") || "";
    const rating = Number(searchParams.get("rating") || 0);
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

        if (
            draftFilters.rating &&
            draftFilters.rating !== "0"
        ) {
            params.set("rating", draftFilters.rating);
        } else {
            params.delete("rating");
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
        params.delete("rating");
        params.delete("stock");

        setSearchParams(params);

        setDraftFilters({
            category: "All",
            minPrice: "",
            maxPrice: "",
            rating: "0",
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

        if (rating > 0) {
            result = result.filter(
                (product) =>
                    Number(product?.rating || 0) >= rating
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

        if (sort === "rating") {
            result.sort(
                (a, b) =>
                    Number(b?.rating || 0) -
                    Number(a?.rating || 0)
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
        rating,
        stockOnly,
        sort,
    ]);

    const activeFilterCount = [
        category !== "All",
        minPrice !== "",
        maxPrice !== "",
        rating > 0,
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

                    <h1>
                        Shop everything
                    </h1>

                    <p>
                        Find products, compare options,
                        and discover your next favorite.
                    </p>
                </div>
            </section>

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
                        onClick={() =>
                            setFilterOpen(true)
                        }
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

                        {rating > 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    updateParams({
                                        rating: "0",
                                    })
                                }
                            >
                                {rating}★ & up
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

                            <option value="rating">
                                Top Rated
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
                        <span>
                            {filteredProducts.length} PRODUCTS
                        </span>

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
                    <div className="shop-empty">
                        <div className="shop-loading-spinner" />

                        <p>
                            Loading products...
                        </p>
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
                                        window.dispatchEvent(
                                            new CustomEvent(
                                                "cryma-add-to-cart",
                                                {
                                                    detail: item,
                                                }
                                            )
                                        );
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

                            {/* RATING */}

                            <div className="shop-filter-section">

                                <div className="shop-filter-section-title">
                                    <strong>
                                        Rating
                                    </strong>
                                </div>

                                <div className="shop-rating-options">

                                    {[4, 3, 2].map(
                                        (value) => (
                                            <button
                                                type="button"
                                                key={value}
                                                className={
                                                    Number(
                                                        draftFilters.rating
                                                    ) ===
                                                    value
                                                        ? "active"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setDraftFilters(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,
                                                            rating:
                                                                String(
                                                                    value
                                                                ),
                                                        })
                                                    )
                                                }
                                            >
                                                <span className="rating-stars">
                                                    {Array.from(
                                                        {
                                                            length: 5,
                                                        }
                                                    ).map(
                                                        (
                                                            _,
                                                            index
                                                        ) => (
                                                            <Star
                                                                key={
                                                                    index
                                                                }
                                                                size={
                                                                    14
                                                                }
                                                                fill={
                                                                    index <
                                                                    value
                                                                        ? "currentColor"
                                                                        : "none"
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </span>

                                                <span>
                                                    {value}★
                                                    & up
                                                </span>

                                                {Number(
                                                    draftFilters.rating
                                                ) ===
                                                    value && (
                                                    <Check
                                                        size={
                                                            15
                                                        }
                                                    />
                                                )}
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        className={
                                            draftFilters.rating ===
                                            "0"
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setDraftFilters(
                                                (
                                                    current
                                                ) => ({
                                                    ...current,
                                                    rating:
                                                        "0",
                                                })
                                            )
                                        }
                                    >
                                        <span>
                                            Any rating
                                        </span>

                                        {draftFilters.rating ===
                                            "0" && (
                                            <Check
                                                size={15}
                                            />
                                        )}
                                    </button>

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