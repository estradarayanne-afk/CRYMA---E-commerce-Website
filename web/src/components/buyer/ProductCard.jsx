import { Heart, Star } from "lucide-react";

function ProductCard({ product }) {
    return (
        <article className="product-card">
            <div className="product-image-container">
                <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                />

                {product.discount && (
                    <span className="product-discount">
                        -{product.discount}%
                    </span>
                )}

                <button
                    type="button"
                    className="product-wishlist"
                    aria-label={`Add ${product.name} to wishlist`}
                >
                    <Heart size={17} />
                </button>
            </div>

            <div className="product-card-body">
                <span className="product-category">
                    {product.category}
                </span>

                <h3>{product.name}</h3>

                <div className="product-rating">
                    <Star size={14} fill="currentColor" />

                    <span>{product.rating}</span>

                    <span className="product-reviews">
                        ({product.reviews})
                    </span>
                </div>

                <div className="product-price-row">
                    <strong>
                        ₱{product.price.toLocaleString()}
                    </strong>

                    {product.oldPrice && (
                        <span className="product-old-price">
                            ₱{product.oldPrice.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

export default ProductCard;