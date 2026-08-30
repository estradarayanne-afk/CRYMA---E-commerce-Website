import { useMemo } from "react";
import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

const products = [
    {
        id: 1,
        name: "Minimal Everyday Backpack",
        category: "Bags",
        price: 1299,
        oldPrice: 1599,
        discount: 19,
        rating: 4.8,
        reviews: 124,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 2,
        name: "Classic White Sneakers",
        category: "Footwear",
        price: 1899,
        oldPrice: 2299,
        discount: 17,
        rating: 4.9,
        reviews: 89,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 3,
        name: "Modern Wireless Headphones",
        category: "Electronics",
        price: 2499,
        rating: 4.7,
        reviews: 211,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 4,
        name: "Everyday Cotton Shirt",
        category: "Fashion",
        price: 699,
        oldPrice: 899,
        discount: 22,
        rating: 4.6,
        reviews: 76,
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 5,
        name: "Premium Skincare Set",
        category: "Beauty",
        price: 1099,
        oldPrice: 1399,
        discount: 21,
        rating: 4.8,
        reviews: 143,
        image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 6,
        name: "Modern Home Lamp",
        category: "Home",
        price: 899,
        oldPrice: 1199,
        discount: 25,
        rating: 4.7,
        reviews: 58,
        image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 7,
        name: "Canvas Casual Shoes",
        category: "Footwear",
        price: 1299,
        rating: 4.5,
        reviews: 92,
        image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=700&q=80",
    },
    {
        id: 8,
        name: "Minimal Desk Organizer",
        category: "Home",
        price: 499,
        oldPrice: 699,
        discount: 29,
        rating: 4.6,
        reviews: 41,
        image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=700&q=80",
    },
];

const categories = [
    "All",
    "Fashion",
    "Electronics",
    "Beauty",
    "Home",
    "Bags",
    "Footwear",
];

function Categories() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

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
    }, [category, search, sort]);

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
                    {categories.map((item) => (
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

                {filteredProducts.length > 0 ? (
                    <div className="shop-product-grid">
                        {filteredProducts.map((product) => (
                            <article
                                key={product.id}
                                className="shop-product-card"
                                onClick={() =>
                                    navigate(
                                        `/product/${product.id}`
                                    )
                                }
                            >
                                <div className="shop-product-image">

                                    <img
                                        src={product.image}
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
                                            {product.price.toLocaleString()}
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