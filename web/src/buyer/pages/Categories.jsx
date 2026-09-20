import { useMemo, useEffect, useState } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../shared/services/api";
import { CATEGORY_FILTERS } from "../../shared/constants/categories";

function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const openProduct = (product) => {
        if (!localStorage.getItem("token")) {
            navigate("/login", { state: { from: `/products/${product.id}` } });
            return;
        }

        navigate(`/products/${product.id}`);
    };

    useEffect(() => {
        api.get("/products", { params: { per_page: 100 } })
            .then(({ data }) => setProducts(data.data?.data ?? data.data ?? []))
            .finally(() => setLoading(false));
    }, []);

    const category =
        searchParams.get("category") || "All";

    const search =
        searchParams.get("search") || "";

    const sort =
        searchParams.get("sort") || "featured";

    const filteredProducts = useMemo(() => {
        let result = [...products];

        if (category !== "All") {
            result = result.filter(
                (product) =>
                    product.category.toLowerCase() ===
                    category.toLowerCase()
            );
        }

        if (search.trim()) {
            const keyword = search.toLowerCase();

            result = result.filter(
                (product) =>
                    product.name.toLowerCase().includes(keyword) ||
                    product.category.toLowerCase().includes(keyword)
            );
        }

        if (sort === "price-low") {
            result.sort((a, b) => a.price - b.price);
        }

        if (sort === "price-high") {
            result.sort((a, b) => b.price - a.price);
        }

        if (sort === "rating") {
            result.sort((a, b) => b.rating - a.rating);
        }

        return result;
    }, [products, category, search, sort]);

    const selectCategory = (value) => {
        const params = new URLSearchParams(searchParams);

        if (value === "All") {
            params.delete("category");
        } else {
            params.set("category", value);
        }

        setSearchParams(params);
    };

    const handleSearch = (event) => {
        event.preventDefault();

        const value = event.target.search.value.trim();

        const params = new URLSearchParams(searchParams);

        if (value) {
            params.set("search", value);
        } else {
            params.delete("search");
        }

        setSearchParams(params);
    };

    const handleSort = (event) => {
        const params = new URLSearchParams(searchParams);
        params.set("sort", event.target.value);
        setSearchParams(params);
    };

    return (
        <div className="shop-page">

            <section className="shop-header">
                <div>
                    <span className="shop-eyebrow">
                        CRYMA MARKETPLACE
                    </span>

                    <h1>
                        Shop everything
                    </h1>

                    <p>
                        Browse products from trusted sellers.
                        No account required to explore.
                    </p>
                </div>

                <form
                    className="shop-search"
                    onSubmit={handleSearch}
                >
                    <Search size={18} />

                    <input
                        name="search"
                        defaultValue={search}
                        placeholder="Search products..."
                    />

                    <button type="submit">
                        Search
                    </button>
                </form>
            </section>

            <section className="shop-toolbar">

                <div className="shop-categories">
                    {CATEGORY_FILTERS.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={
                                category === item
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                selectCategory(item)
                            }
                        >
                            {item}
                        </button>
                    ))}
                </div>

                <div className="shop-sort">
                    <SlidersHorizontal size={16} />

                    <select
                        value={sort}
                        onChange={handleSort}
                    >
                        <option value="featured">
                            Featured
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
                </div>

            </section>

            <section className="shop-results">

                <div className="shop-results-heading">
                    <div>
                        <span>
                            {filteredProducts.length} PRODUCTS
                        </span>

                        <h2>
                            {category === "All"
                                ? "All products"
                                : category}
                        </h2>
                    </div>

                    {search && (
                        <p>
                            Results for "{search}"
                        </p>
                    )}
                </div>

                {loading ? (
                    <div className="shop-empty"><p>Loading products...</p></div>
                ) : filteredProducts.length > 0 ? (
                    <div className="shop-product-grid">
                        {filteredProducts.map((product) => (
                            <article
                                key={product.id}
                                className="shop-product-card"
                                onClick={() => openProduct(product)}
                            >
                                <div className="shop-product-image">

                                    <img
                                        src={product.image || "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"}
                                        alt={product.name}
                                    />

                                    {product.discount && (
                                        <span>
                                            -{product.discount}%
                                        </span>
                                    )}

                                </div>

                                <div className="shop-product-body">

                                    <small>
                                        {product.category}
                                    </small>

                                    <h3>
                                        {product.name}
                                    </h3>

                                    <div className="shop-rating">
                                        <Star
                                            size={13}
                                            fill="currentColor"
                                        />

                                        <strong>
                                            {product.rating}
                                        </strong>

                                        <span>
                                            ({product.reviews})
                                        </span>
                                    </div>

                                    <div className="shop-price">
                                        <strong>
                                            ₱
                                            {Number(product.price).toLocaleString()}
                                        </strong>

                                        {product.oldPrice && (
                                            <del>
                                                ₱
                                                {product.oldPrice.toLocaleString()}
                                            </del>
                                        )}
                                    </div>

                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="shop-empty">
                        <h2>
                            No products found
                        </h2>

                        <p>
                            Try another search or category.
                        </p>
                    </div>
                )}

            </section>

        </div>
    );
}

export default Categories;