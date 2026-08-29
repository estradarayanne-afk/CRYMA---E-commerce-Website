import { ArrowRight, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductCard from "../../components/buyer/ProductCard";

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
];

const categories = [
    {
        name: "Fashion",
        image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=500&q=80",
    },
    {
        name: "Electronics",
        image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=500&q=80",
    },
    {
        name: "Beauty",
        image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=500&q=80",
    },
    {
        name: "Home",
        image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=500&q=80",
    },
];

function Home() {
    const navigate = useNavigate();

    return (
        <div className="buyer-home">
            <section className="buyer-hero">
                <div className="buyer-hero-content">
                    <span className="hero-eyebrow">
                        THE CRYMA MARKETPLACE
                    </span>

                    <h1>
                        Find things
                        <br />
                        you'll love.
                    </h1>

                    <p>
                        Discover products from trusted sellers,
                        curated for everyday life.
                    </p>

                    <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate("/shop")}
                    >
                        Shop Now
                        <ArrowRight size={17} />
                    </button>
                </div>

                <div className="buyer-hero-image">
                    <img
                        src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=85"
                        alt="CRYMA shopping collection"
                    />
                </div>
            </section>

            <section className="buyer-features">
                <div>
                    <Truck size={21} />
                    <div>
                        <strong>Reliable Delivery</strong>
                        <span>Fast delivery from trusted sellers</span>
                    </div>
                </div>

                <div>
                    <ShieldCheck size={21} />
                    <div>
                        <strong>Secure Shopping</strong>
                        <span>Your transactions are protected</span>
                    </div>
                </div>

                <div>
                    <RotateCcw size={21} />
                    <div>
                        <strong>Easy Returns</strong>
                        <span>Shop confidently with buyer protection</span>
                    </div>
                </div>
            </section>

            <section className="buyer-section">
                <div className="section-heading">
                    <div>
                        <span>EXPLORE</span>
                        <h2>Shop by category</h2>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/shop")}
                    >
                        View all
                        <ArrowRight size={15} />
                    </button>
                </div>

                <div className="category-grid">
                    {categories.map((category) => (
                        <button
                            type="button"
                            className="category-card"
                            key={category.name}
                            onClick={() =>
                                navigate(
                                    `/shop?category=${encodeURIComponent(
                                        category.name
                                    )}`
                                )
                            }
                        >
                            <img
                                src={category.image}
                                alt={category.name}
                            />

                            <span>{category.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="buyer-section">
                <div className="section-heading">
                    <div>
                        <span>CURATED FOR YOU</span>
                        <h2>Featured products</h2>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/shop")}
                    >
                        View all
                        <ArrowRight size={15} />
                    </button>
                </div>

                <div className="product-grid">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            product={product}
                        />
                    ))}
                </div>
            </section>

            <section className="buyer-promo">
                <div>
                    <span>CRYMA PICKS</span>

                    <h2>
                        Better finds.
                        <br />
                        Better shopping.
                    </h2>

                    <p>
                        Discover new products and independent sellers
                        worth knowing.
                    </p>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() => navigate("/shop")}
                    >
                        Explore CRYMA
                        <ArrowRight size={16} />
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Home;