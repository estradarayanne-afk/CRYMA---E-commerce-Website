import { Heart, ShoppingCart } from "lucide-react";

function ProductCard({
    product,
    saved = false,
    onSave,
    onAddToCart,
    onOpen,
}) {
    const price = Number(product?.price || 0);
    const stock = Number(product?.stock || 0);

    const sellerName =
        typeof product?.seller === "string"
            ? product.seller
            : product?.seller?.name || "";

    return (
        <article className="buyer-product-card">
            <button
                type="button"
                className="buyer-product-image-button"
                onClick={() => onOpen?.(product)}
                aria-label={`View ${product?.name || "product"}`}
            >
                <div className="buyer-product-image">
                    {product?.image ? (
                        <img
                            src={product.image}
                            alt={product.name}
                        />
                    ) : (
                        <span>
                            {product?.name?.charAt(0)?.toUpperCase() ||
                                "C"}
                        </span>
                    )}
                </div>
            </button>

            <button
                type="button"
                className={`buyer-product-save ${
                    saved ? "saved" : ""
                }`}
                onClick={() => onSave?.(product)}
                aria-label={
                    saved
                        ? `Remove ${product.name} from wishlist`
                        : `Add ${product.name} to wishlist`
                }
            >
                <Heart
                    size={16}
                    fill={saved ? "currentColor" : "none"}
                />
            </button>

            <div className="buyer-product-content">
                {product?.category && (
                    <span className="buyer-product-category">
                        {product.category}
                    </span>
                )}

                <button
                    type="button"
                    className="buyer-product-name"
                    onClick={() => onOpen?.(product)}
                >
                    {product?.name || "Unnamed product"}
                </button>

                <strong className="buyer-product-price">
                    ₱{price.toLocaleString()}
                </strong>

                <div className="buyer-product-meta">
                    {sellerName && (
                        <span className="buyer-product-seller">
                            {sellerName}
                        </span>
                    )}

                    <span className="buyer-product-stock">
                        {stock > 0
                            ? `${stock} available`
                            : "Out of stock"}
                    </span>
                </div>

                <button
                    type="button"
                    className="buyer-product-add"
                    disabled={stock <= 0}
                    onClick={() => onAddToCart?.(product)}
                >
                    <ShoppingCart size={15} />

                    {stock > 0 ? "Add to Cart" : "Out of Stock"}
                </button>
            </div>
        </article>
    );
}

export default ProductCard;