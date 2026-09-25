import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

function getSellerName(seller) {
    if (!seller) {
        return "";
    }

    if (typeof seller === "string") {
        return seller;
    }

    return (
        [
            seller.first_name,
            seller.middle_name,
            seller.last_name,
        ]
            .filter(Boolean)
            .join(" ") ||
        seller.name ||
        ""
    );
}

function Cart() {
    const navigate = useNavigate();
    const isLoggedIn = Boolean(localStorage.getItem("token"));

    const [cart, setCart] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("cryma_cart") || "[]"
            );
        } catch {
            return [];
        }
    });

    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login", {
                replace: true,
                state: { from: "/cart" },
            });
        }
    }, [isLoggedIn, navigate]);

    const saveCart = (nextCart) => {
        setCart(nextCart);
        localStorage.setItem(
            "cryma_cart",
            JSON.stringify(nextCart)
        );
    };

    const updateQuantity = (id, nextQuantity) => {
        const item = cart.find(
            (cartItem) => cartItem.id === id
        );

        if (!item) {
            return;
        }

        const stock = Number(item.stock || 0);

        if (stock <= 0) {
            setNotice(
                `${item.name} is currently out of stock.`
            );

            return;
        }

        const safeQuantity = Math.max(
            1,
            Math.min(
                Number(nextQuantity) || 1,
                stock
            )
        );

        if (Number(nextQuantity) > stock) {
            setNotice(
                `Only ${stock} item${
                    stock === 1 ? "" : "s"
                } of ${item.name} available.`
            );

            window.setTimeout(() => {
                setNotice("");
            }, 2500);
        }

        const nextCart = cart.map((cartItem) =>
            cartItem.id === id
                ? {
                      ...cartItem,
                      quantity: safeQuantity,
                  }
                : cartItem
        );

        saveCart(nextCart);
    };

    const removeItem = (id) => {
        const item = cart.find(
            (cartItem) => cartItem.id === id
        );

        const nextCart = cart.filter(
            (cartItem) => cartItem.id !== id
        );

        saveCart(nextCart);

        if (item) {
            setNotice(`${item.name} removed from your cart.`);

            window.setTimeout(() => {
                setNotice("");
            }, 2200);
        }
    };

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const price = Number(item.price || 0);
            const quantity = Number(item.quantity || 0);

            return sum + price * quantity;
        }, 0);
    }, [cart]);

    const itemCount = useMemo(() => {
        return cart.reduce(
            (count, item) =>
                count + Number(item.quantity || 0),
            0
        );
    }, [cart]);

    const hasInvalidStock = cart.some(
        (item) =>
            Number(item.stock || 0) <= 0 ||
            Number(item.quantity || 0) >
                Number(item.stock || 0)
    );

    const proceedToCheckout = () => {
        if (cart.length === 0) {
            return;
        }

        if (hasInvalidStock) {
            setNotice(
                "Please update the unavailable items before checkout."
            );

            window.setTimeout(() => {
                setNotice("");
            }, 2800);

            return;
        }

        navigate("/checkout");
    };

    if (!isLoggedIn) {
        return null;
    }

    return (
        <main className="shop-page cart-page">
            <Link
                className="buyer-back-link"
                to="/"
            >
                ← Back to homepage
            </Link>

            <header className="cart-header">
                <div>
                    <p className="shop-eyebrow">
                        YOUR CART
                    </p>

                    <h1>Shopping Cart</h1>

                    <p className="cart-header-description">
                        Review your selected products before
                        checkout.
                    </p>
                </div>

                {cart.length > 0 && (
                    <span>
                        {itemCount}{" "}
                        {itemCount === 1
                            ? "item"
                            : "items"}
                    </span>
                )}
            </header>

            {notice && (
                <div
                    className="cart-notice"
                    role="status"
                >
                    {notice}
                </div>
            )}

            {cart.length === 0 ? (
                <div className="shop-empty cart-empty">
                    <div className="cart-empty-icon">
                        <ShoppingBag size={25} />
                    </div>

                    <h2>Your cart is empty</h2>

                    <p>
                        Add products you want to purchase
                        and they will appear here.
                    </p>

                    <Link
                        className="cart-primary-link"
                        to="/shop"
                    >
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <div className="cart-layout">
                    <section className="cart-items">
                        <div className="cart-items-heading">
                            <h2>Selected Products</h2>

                            <Link to="/shop">
                                Continue shopping
                            </Link>
                        </div>

                        {cart.map((item) => {
                            const price = Number(
                                item.price || 0
                            );

                            const quantity = Number(
                                item.quantity || 1
                            );

                            const stock = Number(
                                item.stock || 0
                            );

                            const sellerName =
                                getSellerName(
                                    item.seller
                                );

                            const itemTotal =
                                price * quantity;

                            const unavailable =
                                stock <= 0;

                            return (
                                <article
                                    className={`cart-item ${
                                        unavailable
                                            ? "cart-item--unavailable"
                                            : ""
                                    }`}
                                    key={item.id}
                                >
                                    <div className="cart-item-image">
                                        {item.image ? (
                                            <img
                                                src={
                                                    item.image
                                                }
                                                alt={
                                                    item.name
                                                }
                                            />
                                        ) : (
                                            <span>
                                                {item.name
                                                    ?.charAt(
                                                        0
                                                    )
                                                    ?.toUpperCase() ||
                                                    "C"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="cart-item-info">
                                        {item.category && (
                                            <span>
                                                {
                                                    item.category
                                                }
                                            </span>
                                        )}

                                        <h2>
                                            {item.name ||
                                                "Unnamed product"}
                                        </h2>

                                        {sellerName && (
                                            <p>
                                                Sold by{" "}
                                                {
                                                    sellerName
                                                }
                                            </p>
                                        )}

                                        <div className="cart-item-stock">
                                            {unavailable ? (
                                                <strong className="cart-stock-out">
                                                    Out of stock
                                                </strong>
                                            ) : (
                                                <span>
                                                    {stock}{" "}
                                                    available
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            className="cart-remove"
                                            type="button"
                                            onClick={() =>
                                                removeItem(
                                                    item.id
                                                )
                                            }
                                        >
                                            <Trash2
                                                size={13}
                                            />
                                            Remove
                                        </button>
                                    </div>

                                    <div className="cart-item-controls">
                                        <strong className="cart-item-price">
                                            ₱
                                            {price.toLocaleString()}
                                        </strong>

                                        <div className="cart-quantity-control">
                                            <button
                                                type="button"
                                                aria-label={`Decrease quantity for ${item.name}`}
                                                disabled={
                                                    unavailable ||
                                                    quantity <=
                                                        1
                                                }
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.id,
                                                        quantity -
                                                            1
                                                    )
                                                }
                                            >
                                                <Minus
                                                    size={13}
                                                />
                                            </button>

                                            <span>
                                                {
                                                    quantity
                                                }
                                            </span>

                                            <button
                                                type="button"
                                                aria-label={`Increase quantity for ${item.name}`}
                                                disabled={
                                                    unavailable ||
                                                    quantity >=
                                                        stock
                                                }
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.id,
                                                        quantity +
                                                            1
                                                    )
                                                }
                                            >
                                                <Plus
                                                    size={13}
                                                />
                                            </button>
                                        </div>

                                        <strong className="cart-item-total">
                                            ₱
                                            {itemTotal.toLocaleString()}
                                        </strong>
                                    </div>
                                </article>
                            );
                        })}
                    </section>

                    <aside className="cart-summary">
                        <p className="shop-eyebrow">
                            ORDER SUMMARY
                        </p>

                        <h2>Order total</h2>

                        <div className="cart-summary-line">
                            <span>
                                Products ({itemCount})
                            </span>

                            <strong>
                                ₱
                                {subtotal.toLocaleString()}
                            </strong>
                        </div>

                        <div className="cart-summary-line">
                            <span>Delivery</span>

                            <span>
                                Calculated at checkout
                            </span>
                        </div>

                        <div className="cart-summary-total">
                            <span>Subtotal</span>

                            <strong>
                                ₱
                                {subtotal.toLocaleString()}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="cart-checkout"
                            onClick={
                                proceedToCheckout
                            }
                            disabled={hasInvalidStock}
                        >
                            <span>
                                {hasInvalidStock
                                    ? "Update Cart First"
                                    : "Proceed to Checkout"}
                            </span>

                            <span>→</span>
                        </button>

                        <Link
                            className="cart-summary-link"
                            to="/shop"
                        >
                            Add more items
                        </Link>
                    </aside>
                </div>
            )}
        </main>
    );
}

export default Cart;