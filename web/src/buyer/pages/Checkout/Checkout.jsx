import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    MapPin,
    PackageCheck,
    Phone,
    ShoppingBag,
    X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import "./Checkout.css";

const SELECTED_CART_KEY = "cryma_selected_cart_ids";
const CHECKOUT_ITEMS_KEY = "cryma_checkout_item_ids";

function readLocalArray(key) {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(key) || "[]"
        );

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function Checkout() {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem("token");

    const [cart] = useState(() =>
        readLocalArray("cryma_cart")
    );

    const [selectedIds] = useState(() => {
        const checkoutItems = readLocalArray(
            CHECKOUT_ITEMS_KEY
        );

        if (checkoutItems.length > 0) {
            return checkoutItems;
        }

        return readLocalArray(
            SELECTED_CART_KEY
        );
    });

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] =
        useState(true);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [address, setAddress] = useState({
        house_number: "",
        building_name: "",
        unit_number: "",
        street: "",
        barangay: "",
        municipality: "",
        province: "",
        postal_code: "",
    });

    const [paymentMethod, setPaymentMethod] =
        useState("cash_on_delivery");

    const [showConfirmModal, setShowConfirmModal] =
        useState(false);

    const [notice] = useState("");

    /*
    |--------------------------------------------------------------------------
    | SELECTED CHECKOUT ITEMS
    |--------------------------------------------------------------------------
    */

    const selectedCartItems = useMemo(() => {
        const selectedSet = new Set(
            selectedIds.map(String)
        );

        return cart.filter((item) =>
            selectedSet.has(String(item.id))
        );
    }, [cart, selectedIds]);

    /*
    |--------------------------------------------------------------------------
    | TOTALS
    |--------------------------------------------------------------------------
    */

    const subtotal = useMemo(
        () =>
            selectedCartItems.reduce(
                (sum, item) =>
                    sum +
                    Number(item.price || 0) *
                        Number(item.quantity || 0),
                0
            ),
        [selectedCartItems]
    );

    const shippingFee = 0;

    const total = subtotal + shippingFee;

    const itemCount = selectedCartItems.reduce(
        (sum, item) =>
            sum + Number(item.quantity || 0),
        0
    );

    const hasInvalidSelectedStock = useMemo(
        () =>
            selectedCartItems.some(
                (item) =>
                    Number(item.quantity) < 1 ||
                    Number(item.quantity) > Number(item.stock)
            ),
        [selectedCartItems]
    );

    /*
    |--------------------------------------------------------------------------
    | LOGIN + CHECKOUT DATA
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login", {
                replace: true,
                state: {
                    from: "/checkout",
                },
            });

            return;
        }

        const loadCheckoutData = async () => {
            setLoadingProfile(true);
            setError("");

            try {
                const { data } = await api.get(
                    "/buyer/checkout-data"
                );

                const checkoutData =
                    data?.data || {};

                const savedAddress =
                    checkoutData.address;

                setProfile(
                    checkoutData.user || null
                );

                if (savedAddress) {
                    setAddress({
                        house_number:
                            savedAddress.house_number ||
                            "",
                        building_name:
                            savedAddress.building_name ||
                            "",
                        unit_number:
                            savedAddress.unit_number ||
                            "",
                        street:
                            savedAddress.street ||
                            "",
                        barangay:
                            savedAddress.barangay ||
                            "",
                        municipality:
                            savedAddress.municipality ||
                            "",
                        province:
                            savedAddress.province ||
                            "",
                        postal_code:
                            savedAddress.postal_code ||
                            "",
                    });
                }
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        "Unable to load your checkout information."
                );
            } finally {
                setLoadingProfile(false);
            }
        };

        loadCheckoutData();
    }, [isLoggedIn, navigate]);

    /*
    |--------------------------------------------------------------------------
    | KEEP CHECKOUT ITEMS IN SYNC
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const validIds = selectedCartItems.map(
            (item) => item.id
        );

        localStorage.setItem(
            CHECKOUT_ITEMS_KEY,
            JSON.stringify(validIds)
        );
    }, [selectedCartItems]);

    /*
    |--------------------------------------------------------------------------
    | ADDRESS
    |--------------------------------------------------------------------------
    */

    const updateAddress = (field, value) => {
        setAddress((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const formatAddress = () => {
        const parts = [
            address.house_number,
            address.building_name,
            address.unit_number,
            address.street,
            address.barangay,
            address.municipality,
            address.province,
            address.postal_code,
        ]
            .map((value) => value.trim())
            .filter(Boolean);

        return parts.join(", ");
    };

    /*
    |--------------------------------------------------------------------------
    | SELLER CHECK
    |--------------------------------------------------------------------------
    */

    const sellerIds = useMemo(() => {
        return [
            ...new Set(
                selectedCartItems
                    .map(
                        (item) =>
                            item.seller_id ??
                            item.seller?.id ??
                            item.seller
                    )
                    .filter(
                        (seller) =>
                            seller !== undefined &&
                            seller !== null &&
                            seller !== ""
                    )
                    .map(String)
            ),
        ];
    }, [selectedCartItems]);

    const hasMultipleSellers =
        sellerIds.length > 1;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    const validateCheckout = () => {
        setError("");

        if (selectedCartItems.length === 0) {
            setError(
                "Please select at least one item from your cart."
            );

            return false;
        }

        const deliveryAddress =
            formatAddress();

        if (!deliveryAddress) {
            setError(
                "Please provide your delivery address."
            );

            return false;
        }

        if (
            !address.barangay.trim() ||
            !address.municipality.trim() ||
            !address.province.trim()
        ) {
            setError(
                "Please complete your barangay, municipality, and province."
            );

            return false;
        }

        const invalidItem =
            selectedCartItems.find(
                (item) =>
                    Number(item.quantity) < 1 ||
                    Number(item.quantity) >
                        Number(item.stock)
            );

        if (invalidItem) {
            setError(
                `${invalidItem.name} has an invalid quantity or is no longer available.`
            );

            return false;
        }

        if (hasMultipleSellers) {
            setError(
                "Please checkout products from one seller at a time."
            );

            return false;
        }

        return true;
    };

    /*
    |--------------------------------------------------------------------------
    | OPEN CONFIRMATION
    |--------------------------------------------------------------------------
    */

    const requestPlaceOrder = () => {
        if (submitting) {
            return;
        }

        if (!validateCheckout()) {
            return;
        }

        setShowConfirmModal(true);
    };

    /*
    |--------------------------------------------------------------------------
    | PLACE ORDER
    |--------------------------------------------------------------------------
    */

    const placeOrder = async () => {
        if (submitting) {
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const deliveryAddress =
                formatAddress();

            const { data } = await api.post(
                "/orders",
                {
                    delivery_address:
                        deliveryAddress,

                    payment_method:
                        paymentMethod,

                    items: selectedCartItems.map(
                        (item) => ({
                            product_id: item.id,
                            quantity: Number(
                                item.quantity
                            ),
                        })
                    ),
                }
            );

            /*
            |--------------------------------------------------------------------------
            | REMOVE ONLY CHECKED OUT ITEMS
            |--------------------------------------------------------------------------
            */

            const checkedOutIds = new Set(
                selectedCartItems.map(
                    (item) => String(item.id)
                )
            );

            const remainingCart =
                cart.filter(
                    (item) =>
                        !checkedOutIds.has(
                            String(item.id)
                        )
                );

            localStorage.setItem(
                "cryma_cart",
                JSON.stringify(
                    remainingCart
                )
            );

            localStorage.setItem(
                SELECTED_CART_KEY,
                JSON.stringify([])
            );

            localStorage.setItem(
                CHECKOUT_ITEMS_KEY,
                JSON.stringify([])
            );

            window.dispatchEvent(
                new Event("cryma-cart-updated")
            );

            setShowConfirmModal(false);

            navigate(
                `/orders/${data.data.id}`
            );
        } catch (err) {
            setShowConfirmModal(false);

            setError(
                err.response?.data?.message ||
                    "Unable to place your order. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (!isLoggedIn) {
        return null;
    }

    if (loadingProfile) {
        return (
            <main className="checkout-page">
                <div className="checkout-loading">
                    <ShoppingBag size={22} />

                    <p>
                        Preparing your checkout...
                    </p>
                </div>
            </main>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NO SELECTED ITEMS
    |--------------------------------------------------------------------------
    */

    if (selectedCartItems.length === 0) {
        return (
            <main className="checkout-page">
                <Link
                    className="checkout-back"
                    to="/cart"
                >
                    <ArrowLeft size={15} />
                    Back to cart
                </Link>

                <div className="checkout-empty">
                    <div className="checkout-empty-icon">
                        <ShoppingBag size={25} />
                    </div>

                    <h2>
                        No items selected
                    </h2>

                    <p>
                        Select the products you want
                        to purchase from your cart first.
                    </p>

                    <Link
                        className="checkout-primary-link"
                        to="/cart"
                    >
                        Return to Cart
                    </Link>
                </div>
            </main>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | MAIN CHECKOUT
    |--------------------------------------------------------------------------
    */

    return (
        <main className="checkout-page">

            {/* BACK */}

            <Link
                className="checkout-back"
                to="/cart"
            >
                <ArrowLeft size={15} />
                Back to Cart
            </Link>

            {/* HEADER */}

            <header className="checkout-header">
                <div>
                    <p className="checkout-eyebrow">
                        SECURE CHECKOUT
                    </p>

                    <h1>
                        Complete your order
                    </h1>

                    <p>
                        Review your delivery details,
                        payment method, and selected
                        products before placing your order.
                    </p>
                </div>

                <div className="checkout-step-indicator">
                    <span className="active">
                        <Check size={13} />
                    </span>

                    <span>
                        Checkout
                    </span>
                </div>
            </header>

            {/* ERROR */}

            {error && (
                <div className="checkout-error">
                    {error}
                </div>
            )}

            {/* NOTICE */}

            {notice && (
                <div className="checkout-notice">
                    {notice}
                </div>
            )}

            <div className="checkout-layout">

                {/* LEFT */}

                <section className="checkout-main">

                    {/* DELIVERY */}

                    <div className="checkout-panel">

                        <div className="checkout-panel-heading">
                            <div className="checkout-heading-icon">
                                <MapPin size={17} />
                            </div>

                            <div>
                                <p className="checkout-eyebrow">
                                    DELIVERY
                                </p>

                                <h2>
                                    Delivery address
                                </h2>
                            </div>
                        </div>

                        {profile && (
                            <div className="checkout-contact">
                                <div>
                                    <strong>
                                        {profile.first_name}{" "}
                                        {profile.last_name}
                                    </strong>

                                    <span>
                                        <Phone size={12} />

                                        {profile.phone ||
                                            "No phone number"}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="checkout-form-grid">

                            <label>
                                House / Lot No.

                                <input
                                    type="text"
                                    value={
                                        address.house_number
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "house_number",
                                            event.target.value
                                        )
                                    }
                                    placeholder="e.g. 123"
                                />
                            </label>

                            <label>
                                Building

                                <input
                                    type="text"
                                    value={
                                        address.building_name
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "building_name",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Optional"
                                />
                            </label>

                            <label>
                                Unit / Floor

                                <input
                                    type="text"
                                    value={
                                        address.unit_number
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "unit_number",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Optional"
                                />
                            </label>

                            <label>
                                Street

                                <input
                                    type="text"
                                    value={
                                        address.street
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "street",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Street name"
                                />
                            </label>

                            <label>
                                Barangay

                                <input
                                    type="text"
                                    value={
                                        address.barangay
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "barangay",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Barangay"
                                />
                            </label>

                            <label>
                                Municipality / City

                                <input
                                    type="text"
                                    value={
                                        address.municipality
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "municipality",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Municipality / City"
                                />
                            </label>

                            <label>
                                Province

                                <input
                                    type="text"
                                    value={
                                        address.province
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "province",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Province"
                                />
                            </label>

                            <label>
                                Postal Code

                                <input
                                    type="text"
                                    value={
                                        address.postal_code
                                    }
                                    onChange={(event) =>
                                        updateAddress(
                                            "postal_code",
                                            event.target.value
                                        )
                                    }
                                    placeholder="Optional"
                                />
                            </label>

                        </div>
                    </div>


                    {/* ORDER REVIEW */}

                    <div className="checkout-panel checkout-review">

                        <div className="checkout-panel-heading">
                            <div className="checkout-heading-icon">
                                <PackageCheck size={17} />
                            </div>

                            <div>
                                <p className="checkout-eyebrow">
                                    YOUR ITEMS
                                </p>

                                <h2>
                                    Order review
                                </h2>
                            </div>
                        </div>

                        <div className="checkout-selected-label">
                            {selectedCartItems.length}{" "}
                            product
                            {selectedCartItems.length !==
                            1
                                ? "s"
                                : ""}{" "}
                            selected
                        </div>

                        <div className="checkout-items">

                            {selectedCartItems.map(
                                (item) => (
                                    <div
                                        className="checkout-item"
                                        key={item.id}
                                    >
                                        <div className="checkout-item-image">
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

                                        <div className="checkout-item-info">
                                            <strong>
                                                {item.name}
                                            </strong>

                                            {item.category && (
                                                <span className="checkout-item-category">
                                                    {
                                                        item.category
                                                    }
                                                </span>
                                            )}

                                            <span>
                                                Qty{" "}
                                                {
                                                    item.quantity
                                                }
                                            </span>
                                        </div>

                                        <b>
                                            ₱
                                            {(
                                                Number(
                                                    item.price
                                                ) *
                                                Number(
                                                    item.quantity
                                                )
                                            ).toLocaleString()}
                                        </b>
                                    </div>
                                )
                            )}

                        </div>
                    </div>

                </section>

                {/* SUMMARY */}

                <aside className="checkout-summary">
                    <p className="checkout-summary-eyebrow">
                        ORDER SUMMARY
                    </p>

                    <h2>Order Summary</h2>

                    <div className="checkout-summary-row">
                        <span>
                            Items ({selectedCartItems.length})
                        </span>

                        <strong>
                            ₱{subtotal.toLocaleString()}
                        </strong>
                    </div>

                    <div className="checkout-summary-row">
                        <span>Delivery</span>

                        <strong className="checkout-free">
                            FREE
                        </strong>
                    </div>

                    {/* PAYMENT IS HERE */}
                    <div className="checkout-summary-payment">
                        <div className="checkout-summary-payment-heading">
                            <span>Payment Method</span>
                            <span className="checkout-summary-change">
                                Change
                            </span>
                        </div>

                        <div className="checkout-payment-options checkout-payment-options-summary">
                            <label
                                className={`checkout-payment-option ${
                                    paymentMethod === "cash_on_delivery"
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    value="cash_on_delivery"
                                    checked={paymentMethod === "cash_on_delivery"}
                                    onChange={(event) =>
                                        setPaymentMethod(event.target.value)
                                    }
                                />

                                <span className="checkout-payment-radio">
                                    <strong>Cash on Delivery</strong>
                                    <small>
                                        Pay when your order arrives
                                    </small>
                                </span>
                            </label>

                            <label
                                className={`checkout-payment-option ${
                                    paymentMethod === "gcash"
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    value="gcash"
                                    checked={paymentMethod === "gcash"}
                                    onChange={(event) =>
                                        setPaymentMethod(event.target.value)
                                    }
                                />

                                <span className="checkout-payment-radio">
                                    <strong>GCash</strong>
                                    <small>
                                        Pay using your GCash account
                                    </small>
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="checkout-summary-total">
                        <span>Total</span>

                        <strong>
                            ₱{subtotal.toLocaleString()}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="checkout-place-order"
                        onClick={requestPlaceOrder}
                        disabled={
                            submitting ||
                            selectedCartItems.length === 0 ||
                            hasInvalidSelectedStock
                        }
                    >
                        {submitting ? "Placing Order..." : "Place Order"}
                    </button>

                    <p className="checkout-secure-note">
                        Your order details are reviewed before checkout.
                    </p>
                </aside>
            </div>

            {/* =====================================================
                PLACE ORDER CONFIRMATION MODAL
            ===================================================== */}

            {showConfirmModal && (
                <div
                    className="checkout-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="checkout-confirm-title"
                >
                    <div className="checkout-confirm-modal">

                        <button
                            type="button"
                            className="checkout-confirm-close"
                            onClick={() =>
                                setShowConfirmModal(
                                    false
                                )
                            }
                            disabled={submitting}
                            aria-label="Close confirmation"
                        >
                            <X size={17} />
                        </button>

                        <div className="checkout-confirm-icon">
                            <PackageCheck size={22} />
                        </div>

                        <h2 id="checkout-confirm-title">
                            Place this order?
                        </h2>

                        <p>
                            Please confirm that your
                            delivery details, selected items,
                            and payment method are correct.
                        </p>

                        <div className="checkout-confirm-summary">

                            <div>
                                <span>
                                    Items
                                </span>

                                <strong>
                                    {itemCount}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Payment
                                </span>

                                <strong>
                                    {paymentMethod ===
                                    "gcash"
                                        ? "GCash"
                                        : "Cash on Delivery"}
                                </strong>
                            </div>

                            <div className="total">
                                <span>
                                    Total
                                </span>

                                <strong>
                                    ₱
                                    {total.toLocaleString()}
                                </strong>
                            </div>

                        </div>

                        <div className="checkout-confirm-actions">

                            <button
                                type="button"
                                className="checkout-confirm-cancel"
                                onClick={() =>
                                    setShowConfirmModal(
                                        false
                                    )
                                }
                                disabled={submitting}
                            >
                                Review Again
                            </button>

                            <button
                                type="button"
                                className="checkout-confirm-place"
                                onClick={
                                    placeOrder
                                }
                                disabled={submitting}
                            >
                                {submitting
                                    ? "Placing..."
                                    : "Confirm Order"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

        </main>
    );
}

export default Checkout;