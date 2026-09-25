import { useEffect } from "react";
import { Link } from "react-router-dom";

function AddToCartModal({ product, onClose }) {
    useEffect(() => {
        if (!product) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [product, onClose]);

    if (!product) {
        return null;
    }

    const image =
        product.image ||
        product.image_url ||
        product.thumbnail ||
        null;

    const price = Number(product.price);

    return (
        <div
            className="buyer-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="buyer-cart-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-to-cart-title"
            >
                <button
                    type="button"
                    className="buyer-modal-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="buyer-cart-success-icon">
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                    >
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>

                <div className="buyer-cart-modal-heading">
                    <span>Added to cart</span>
                    <h2 id="add-to-cart-title">
                        Your item is ready to go.
                    </h2>
                </div>

                <div className="buyer-cart-modal-product">
                    <div className="buyer-cart-modal-image">
                        {image ? (
                            <img
                                src={image}
                                alt={product.name || "Product"}
                            />
                        ) : (
                            <span>CRYMA</span>
                        )}
                    </div>

                    <div className="buyer-cart-modal-details">
                        <h3>
                            {product.name || "Product"}
                        </h3>

                        <strong>
                            ₱
                            {Number.isFinite(price)
                                ? price.toLocaleString()
                                : "0"}
                        </strong>

                        <span>Quantity: 1</span>
                    </div>
                </div>

                <div className="buyer-cart-modal-actions">
                    <button
                        type="button"
                        className="buyer-modal-secondary"
                        onClick={onClose}
                    >
                        Continue Shopping
                    </button>

                    <Link
                        to="/cart"
                        className="buyer-modal-primary"
                        onClick={onClose}
                    >
                        View Cart
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default AddToCartModal;