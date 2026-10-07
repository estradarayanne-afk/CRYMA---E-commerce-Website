import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Check,
    Minus,
    Plus,
    ShoppingBag,
    Trash2,
} from "lucide-react";
import {
    getBuyerCart,
    isBuyerSession,
    saveBuyerCart,
} from "../../../shared/utils/buyerAccess";

import "./Cart.css";

const SELECTED_CART_KEY = "cryma_selected_cart_ids";

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

function getKnownStock(item) {
    if (item?.stock === null || item?.stock === undefined || item.stock === "") {
        return null;
    }

    const stock = Number(item.stock);
    return Number.isFinite(stock) ? stock : null;
}

function readSelectedIds(cart) {
    try {
        const stored = JSON.parse(
            localStorage.getItem(SELECTED_CART_KEY) || "[]"
        );

        if (!Array.isArray(stored)) {
            return cart
                .filter((item) => {
                    const stock = getKnownStock(item);
                    return stock === null || stock > 0;
                })
                .map((item) => String(item.id));
        }

        const availableIds = new Set(
            cart
                .filter((item) => {
                    const stock = getKnownStock(item);
                    return stock === null || stock > 0;
                })
                .map((item) => String(item.id))
        );

        return stored
            .map(String)
            .filter((id) => availableIds.has(id));
    } catch {
        return cart
            .filter((item) => {
                const stock = getKnownStock(item);
                return stock === null || stock > 0;
            })
            .map((item) => String(item.id));
    }
}

function Cart() {
    const navigate = useNavigate();
    const hasBuyerAccess = isBuyerSession();
    const [cart, setCart] = useState(getBuyerCart);
    const [selectedIds, setSelectedIds] = useState(() =>
        readSelectedIds(getBuyerCart())
    );
    const [notice, setNotice] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const syncCart = () => setCart(getBuyerCart());
        window.addEventListener("cryma-cart-updated", syncCart);
        window.addEventListener("storage", syncCart);
        return () => {
            window.removeEventListener("cryma-cart-updated", syncCart);
            window.removeEventListener("storage", syncCart);
        };
    }, []);

    useEffect(() => {
        const availableIds = new Set(
            cart
                .filter((item) => {
                    const stock = getKnownStock(item);
                    return stock === null || stock > 0;
                })
                .map((item) => String(item.id))
        );
        const validSelectedIds = selectedIds.filter((id) => availableIds.has(String(id)));
        localStorage.setItem(SELECTED_CART_KEY, JSON.stringify(validSelectedIds));
    }, [cart, selectedIds]);

    const saveCart = (nextCart) => {
        if (!saveBuyerCart(nextCart)) return;
        setCart(nextCart);
    };

    const showNotice = (message, duration = 2400) => {
        setNotice(message);

        window.setTimeout(() => {
            setNotice("");
        }, duration);
    };

    const updateQuantity = (id, nextQuantity) => {
        const item = cart.find(
            (cartItem) => String(cartItem.id) === String(id)
        );

        if (!item) {
            return;
        }

        const stock = getKnownStock(item);

        if (stock !== null && stock <= 0) {
            showNotice(
                `${item.name} is currently out of stock.`
            );

            return;
        }

        const numericQuantity = Number(nextQuantity);

        if (
            !Number.isFinite(numericQuantity) ||
            numericQuantity < 1
        ) {
            return;
        }

        const safeQuantity = stock === null
            ? Math.max(Math.floor(numericQuantity), 1)
            : Math.min(Math.max(Math.floor(numericQuantity), 1), stock);

        if (stock !== null && numericQuantity > stock) {
            showNotice(
                `Only ${stock} item${
                    stock === 1 ? "" : "s"
                } of ${item.name} available.`
            );
        }

        const nextCart = cart.map((cartItem) =>
            String(cartItem.id) === String(id)
                ? {
                      ...cartItem,
                      quantity: safeQuantity,
                  }
                : cartItem
        );

        saveCart(nextCart);
    };

    const handleQuantityInput = (id, value) => {
        if (value === "") {
            return;
        }

        updateQuantity(id, value);
    };

    const toggleItem = (id) => {
        const idKey = String(id);
        const availableIds = new Set(availableCartIds);
        setSelectedIds((current) =>
            current.filter((selectedId) => availableIds.has(String(selectedId))).includes(idKey)
                ? current.filter((selectedId) => String(selectedId) !== idKey && availableIds.has(String(selectedId)))
                : [...current.filter((selectedId) => availableIds.has(String(selectedId))), idKey]
        );
    };

    const availableCartIds = cart
        .filter((item) => {
            const stock = getKnownStock(item);
            return stock === null || stock > 0;
        })
        .map((item) => String(item.id));

    const allSelected =
        availableCartIds.length > 0 &&
        availableCartIds.every((id) =>
            selectedIds.includes(id)
        );

    const someSelected =
        availableCartIds.some((id) =>
            selectedIds.includes(id)
        );

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds([]);
            return;
        }

        setSelectedIds(availableCartIds);
    };

    const requestRemoveItem = (item) => {
        setDeleteTarget({ items: [item], bulk: false });
    };

    const confirmRemoveItem = () => {
        if (!deleteTarget?.items?.length) {
            return;
        }

        const removedIds = new Set(deleteTarget.items.map((item) => String(item.id)));

        const nextCart = cart.filter(
            (cartItem) => !removedIds.has(String(cartItem.id))
        );

        saveCart(nextCart);

        setSelectedIds((current) =>
            current.filter((selectedId) => !removedIds.has(String(selectedId)))
        );

        showNotice(deleteTarget.bulk
            ? `${removedIds.size} selected item${removedIds.size === 1 ? "" : "s"} removed from your cart.`
            : `${deleteTarget.items[0].name} removed from your cart.`);

        setDeleteTarget(null);
    };

    const cancelRemoveItem = () => {
        setDeleteTarget(null);
    };

    const selectedItems = useMemo(() => {
        const selectedSet = new Set(selectedIds.map(String));
        return cart.filter((item) => selectedSet.has(String(item.id)));
    }, [cart, selectedIds]);

    const requestRemoveSelected = () => {
        if (selectedItems.length) {
            setDeleteTarget({ items: selectedItems, bulk: true });
        }
    };

    const selectedItemCount = useMemo(() => {
        return selectedItems.reduce(
            (count, item) =>
                count + Number(item.quantity || 1),
            0
        );
    }, [selectedItems]);

    const selectedSubtotal = useMemo(() => {
        return selectedItems.reduce((sum, item) => {
            const price = Number(item.price || 0);
            const quantity = Number(item.quantity || 1);

            return sum + price * quantity;
        }, 0);
    }, [selectedItems]);

    const totalItemCount = useMemo(() => {
        return cart.reduce(
            (count, item) =>
                count + Number(item.quantity || 1),
            0
        );
    }, [cart]);

    const hasInvalidSelectedStock = selectedItems.some(
        (item) => {
            const stock = getKnownStock(item);
            const quantity = Number(item.quantity || 1);
            return quantity < 1 || (stock !== null && (stock <= 0 || quantity > stock));
        }
    );

    const proceedToCheckout = () => {
        if (selectedItems.length === 0) {
            showNotice(
                "Please select at least one product."
            );

            return;
        }

        if (hasInvalidSelectedStock) {
            showNotice(
                "Please update the unavailable items before checkout."
            );

            return;
        }

        /*
         * Store the exact products selected for checkout.
         * Checkout can use this list so unselected cart
         * products are not included.
         */
        localStorage.setItem(
            "cryma_checkout_item_ids",
            JSON.stringify(
                selectedItems.map((item) => item.id)
            )
        );

        navigate("/checkout");
    };

    if (!hasBuyerAccess) {
        return null;
    }

    return (
        <main className="cart-page">
            <header className="cart-page-header">
                <div>
                    <p className="cart-eyebrow">
                        YOUR CART
                    </p>

                    <h1>Shopping Cart</h1>

                    <p className="cart-header-description">
                        Select the products you want to
                        purchase and adjust your quantity
                        before checkout.
                    </p>
                </div>

                {cart.length > 0 && (
                    <div className="cart-header-count">
                        {totalItemCount}{" "}
                        {totalItemCount === 1
                            ? "item"
                            : "items"}
                    </div>
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
                <div className="cart-empty">
                    <div className="cart-empty-icon">
                        <ShoppingBag size={25} />
                    </div>

                    <h2>Your cart is empty</h2>

                    <p>
                        Looks like you haven't added anything yet.
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
                    <section className="cart-main">
                        <div className="cart-select-bar">
                            <label className="cart-select-all">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={(element) => {
                                        if (element) {
                                            element.indeterminate =
                                                !allSelected &&
                                                someSelected;
                                        }
                                    }}
                                    onChange={
                                        toggleSelectAll
                                    }
                                />

                                <span className="cart-checkbox">
                                    <Check size={13} />
                                </span>

                                <strong>
                                    Select All
                                </strong>
                            </label>

                            <span>
                                {selectedItems.length} of{" "}
                                {cart.length} products
                                selected
                            </span>
                            {selectedItems.length > 0 && (
                                <button
                                    type="button"
                                    className="cart-delete-selected"
                                    onClick={requestRemoveSelected}
                                >
                                    <Trash2 size={14} />
                                    Delete selected
                                </button>
                            )}
                        </div>

                        <div className="cart-items-heading">
                            <div>
                                <h2>
                                    Cart Items
                                </h2>

                                <p>
                                    Choose the products
                                    you want to buy.
                                </p>
                            </div>

                            <Link to="/shop">
                                Continue shopping
                            </Link>
                        </div>

                        <div className="cart-items">
                            {cart.map((item) => {
                                const price = Number(
                                    item.price || 0
                                );

                                const quantity = Number(
                                    item.quantity || 1
                                );

                                const stock = getKnownStock(item);

                                const sellerName =
                                    getSellerName(
                                        item.seller
                                    );

                                const itemTotal =
                                    price * quantity;

                                const unavailable =
                                    stock !== null && stock <= 0;

                                const selected =
                                    selectedIds.includes(
                                        String(item.id)
                                    );
                                const itemImage = [item.image, item.image_url, item.thumbnail, item.displayImage]
                                    .find((value) => typeof value === "string" && value.trim());
                                const variant = item.variant_name || item.variant?.name || (typeof item.variant === "string" ? item.variant : "");

                                return (
                                    <article
                                        className={`cart-item ${
                                            selected
                                                ? "cart-item--selected"
                                                : ""
                                        } ${
                                            unavailable
                                                ? "cart-item--unavailable"
                                                : ""
                                        }`}
                                        key={item.id}
                                    >
                                        <label className="cart-item-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selected
                                                }
                                                disabled={
                                                    unavailable
                                                }
                                                onChange={() =>
                                                    toggleItem(
                                                        item.id
                                                    )
                                                }
                                            />

                                            <span className="cart-checkbox">
                                                <Check
                                                    size={
                                                        13
                                                    }
                                                />
                                            </span>
                                        </label>

                                        <div className="cart-item-image">
                                            {itemImage ? (
                                                <img
                                                    src={itemImage}
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
                                                <span className="cart-item-category">
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

                                            {variant && (
                                                <p className="cart-item-variant">{variant}</p>
                                            )}

                                            {stock !== null && <div className="cart-item-stock">
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
                                            </div>}

                                            <button
                                                className="cart-remove"
                                                type="button"
                                                onClick={() =>
                                                    requestRemoveItem(item)
                                                }
                                            >
                                                <Trash2
                                                    size={
                                                        13
                                                    }
                                                />
                                                Remove
                                            </button>
                                        </div>

                                        <div className="cart-item-controls">
                                            <div className="cart-item-unit-price">
                                                ₱
                                                {price.toLocaleString()}
                                            </div>

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
                                                        size={
                                                            14
                                                        }
                                                    />
                                                </button>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={
                                                        stock === null ? undefined : stock
                                                    }
                                                    value={
                                                        quantity
                                                    }
                                                    disabled={
                                                        unavailable
                                                    }
                                                    aria-label={`Quantity for ${item.name}`}
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        handleQuantityInput(
                                                            item.id,
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    aria-label={`Increase quantity for ${item.name}`}
                                                    disabled={
                                                        unavailable ||
                                                        (stock !== null && quantity >= stock)
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
                                                        size={
                                                            14
                                                        }
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
                        </div>
                    </section>

                    <aside className="cart-summary">
                        <p className="cart-eyebrow">
                            ORDER SUMMARY
                        </p>

                        <h2>Order Summary</h2>

                        <div className="cart-summary-line">
                            <span>Subtotal ({selectedItemCount} items)</span>
                            <strong>₱{selectedSubtotal.toLocaleString()}</strong>
                        </div>

                        <div className="cart-summary-line">
                            <span>Shipping</span>
                            <span>Calculated at checkout</span>
                        </div>

                        <div className="cart-summary-total">
                            <span>Total</span>

                            <strong>
                                ₱
                                {selectedSubtotal.toLocaleString()}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="cart-checkout"
                            onClick={
                                proceedToCheckout
                            }
                            disabled={
                                selectedItems.length ===
                                    0 ||
                                hasInvalidSelectedStock
                            }
                        >
                            <span>
                                {selectedItems.length ===
                                0
                                    ? "Select Products"
                                    : hasInvalidSelectedStock
                                    ? "Update Cart First"
                                    : "Proceed to Checkout"}
                            </span>

                            <span>→</span>
                        </button>

                        <p className="cart-summary-note">
                            Only your selected products
                            will be prepared for checkout.
                        </p>
                    </aside>
                </div>
            )}

            {deleteTarget && (
                <div
                    className="cart-delete-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cart-delete-title"
                >
                    <div className="cart-delete-modal">
                        <div className="cart-delete-icon">
                            <Trash2 size={21} />
                        </div>

                        <h2 id="cart-delete-title">
                            {deleteTarget.bulk ? "Remove selected items?" : "Remove this item?"}
                        </h2>

                        <p>
                            {deleteTarget.bulk ? (
                                <>Are you sure you want to remove <strong>{deleteTarget.items.length} selected items</strong> from your cart?</>
                            ) : (
                                <>Are you sure you want to remove <strong>{deleteTarget.items[0].name}</strong> from your cart?</>
                            )}
                        </p>

                        <div className="cart-delete-actions">
                            <button
                                type="button"
                                className="cart-delete-cancel"
                                onClick={cancelRemoveItem}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="cart-delete-confirm"
                                onClick={confirmRemoveItem}
                            >
                                {deleteTarget.bulk ? "Remove Selected" : "Remove Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Cart;
