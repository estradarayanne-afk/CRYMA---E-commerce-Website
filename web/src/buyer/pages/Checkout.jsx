import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    CreditCard,
    MapPin,
    PackageCheck,
    Phone,
    ShoppingBag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../shared/services/api";

function Checkout() {
    const navigate = useNavigate();
    const isLoggedIn = !!localStorage.getItem("token");

    const [cart, setCart] = useState(() =>
        JSON.parse(localStorage.getItem("cryma_cart") || "[]")
    );

    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
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

    const subtotal = useMemo(
        () =>
            cart.reduce(
                (sum, item) =>
                    sum + Number(item.price || 0) * Number(item.quantity || 0),
                0
            ),
        [cart]
    );

    const shippingFee = 0;

    const total = subtotal + shippingFee;

    const itemCount = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
    );

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/login", {
                replace: true,
                state: { from: "/checkout" },
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

                const checkoutData = data?.data || {};
                const savedAddress = checkoutData.address;

                setProfile(checkoutData.user || null);

                if (savedAddress) {
                    setAddress({
                        house_number: savedAddress.house_number || "",
                        building_name: savedAddress.building_name || "",
                        unit_number: savedAddress.unit_number || "",
                        street: savedAddress.street || "",
                        barangay: savedAddress.barangay || "",
                        municipality:
                            savedAddress.municipality || "",
                        province: savedAddress.province || "",
                        postal_code:
                            savedAddress.postal_code || "",
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

    const placeOrder = async () => {
        setError("");

        const deliveryAddress = formatAddress();

        if (!deliveryAddress) {
            setError("Please provide your delivery address.");
            return;
        }

        if (
            !address.barangay.trim() ||
            !address.municipality.trim() ||
            !address.province.trim()
        ) {
            setError(
                "Please complete your barangay, municipality, and province."
            );
            return;
        }

        const invalidItem = cart.find(
            (item) =>
                Number(item.quantity) < 1 ||
                Number(item.quantity) > Number(item.stock)
        );

        if (invalidItem) {
            setError(
                `${invalidItem.name} has an invalid quantity or is no longer available.`
            );
            return;
        }

        setSubmitting(true);

        try {
            const { data } = await api.post("/orders", {
                delivery_address: deliveryAddress,
                payment_method: paymentMethod,
                items: cart.map((item) => ({
                    product_id: item.id,
                    quantity: Number(item.quantity),
                })),
            });

            localStorage.removeItem("cryma_cart");
            setCart([]);

            navigate(`/orders/${data.data.id}`);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to place your order. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!isLoggedIn) {
        return null;
    }

    if (loadingProfile) {
        return (
            <main className="shop-page checkout-page">
                <div className="checkout-loading">
                    <ShoppingBag size={22} />
                    <p>Preparing your checkout...</p>
                </div>
            </main>
        );
    }

    if (cart.length === 0) {
        return (
            <main className="shop-page checkout-page">
                <Link className="checkout-back" to="/shop">
                    <ArrowLeft size={15} />
                    Continue shopping
                </Link>

                <div className="shop-empty checkout-empty">
                    <div className="checkout-empty-icon">
                        <ShoppingBag size={25} />
                    </div>

                    <h2>Your cart is empty</h2>
                    <p>Add some products before checking out.</p>

                    <Link
                        className="checkout-primary-link"
                        to="/shop"
                    >
                        Browse products
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="shop-page checkout-page">
            <Link className="checkout-back" to="/cart">
                <ArrowLeft size={15} />
                Back to cart
            </Link>

            <header className="checkout-header">
                <div>
                    <p className="shop-eyebrow">SECURE CHECKOUT</p>
                    <h1>Complete your order</h1>
                    <p>
                        Review your delivery details and payment method
                        before placing your order.
                    </p>
                </div>

                <div className="checkout-step-indicator">
                    <span className="active">
                        <Check size={13} />
                    </span>
                    <span>Checkout</span>
                </div>
            </header>

            {error && (
                <div className="checkout-error">
                    {error}
                </div>
            )}

            <div className="checkout-layout">
                <section className="checkout-main">
                    <div className="checkout-panel">
                        <div className="checkout-panel-heading">
                            <div className="checkout-heading-icon">
                                <MapPin size={17} />
                            </div>

                            <div>
                                <p className="shop-eyebrow">
                                    DELIVERY
                                </p>
                                <h2>Delivery address</h2>
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
                                    value={address.house_number}
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
                                    value={address.building_name}
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
                                    value={address.unit_number}
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
                                    value={address.street}
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
                                    value={address.barangay}
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
                                    value={address.municipality}
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
                                    value={address.province}
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
                                    value={address.postal_code}
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

                    <div className="checkout-panel">
                        <div className="checkout-panel-heading">
                            <div className="checkout-heading-icon">
                                <CreditCard size={17} />
                            </div>

                            <div>
                                <p className="shop-eyebrow">
                                    PAYMENT
                                </p>
                                <h2>Payment method</h2>
                            </div>
                        </div>

                        <div className="checkout-payment-options">
                            <label
                                className={`checkout-payment-option ${
                                    paymentMethod ===
                                    "cash_on_delivery"
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment_method"
                                    value="cash_on_delivery"
                                    checked={
                                        paymentMethod ===
                                        "cash_on_delivery"
                                    }
                                    onChange={(event) =>
                                        setPaymentMethod(
                                            event.target.value
                                        )
                                    }
                                />

                                <div>
                                    <strong>
                                        Cash on Delivery
                                    </strong>
                                    <span>
                                        Pay when your order arrives.
                                    </span>
                                </div>

                                {paymentMethod ===
                                    "cash_on_delivery" && (
                                    <Check size={16} />
                                )}
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
                                    name="payment_method"
                                    value="gcash"
                                    checked={
                                        paymentMethod === "gcash"
                                    }
                                    onChange={(event) =>
                                        setPaymentMethod(
                                            event.target.value
                                        )
                                    }
                                />

                                <div>
                                    <strong>GCash</strong>
                                    <span>
                                        Selected as the payment
                                        method for this order.
                                    </span>
                                </div>

                                {paymentMethod === "gcash" && (
                                    <Check size={16} />
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="checkout-panel checkout-review">
                        <div className="checkout-panel-heading">
                            <div className="checkout-heading-icon">
                                <PackageCheck size={17} />
                            </div>

                            <div>
                                <p className="shop-eyebrow">
                                    YOUR ITEMS
                                </p>
                                <h2>Order review</h2>
                            </div>
                        </div>

                        <div className="checkout-items">
                            {cart.map((item) => (
                                <div
                                    className="checkout-item"
                                    key={item.id}
                                >
                                    <div className="checkout-item-image">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                            />
                                        ) : (
                                            <span>
                                                {item.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ||
                                                    "C"}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <strong>{item.name}</strong>
                                        <span>
                                            Qty {item.quantity}
                                        </span>
                                    </div>

                                    <b>
                                        ₱
                                        {(
                                            Number(item.price) *
                                            Number(item.quantity)
                                        ).toLocaleString()}
                                    </b>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <aside className="checkout-summary">
                    <p className="shop-eyebrow">
                        ORDER SUMMARY
                    </p>

                    <h2>Almost there.</h2>

                    <div className="checkout-summary-row">
                        <span>
                            Items ({itemCount})
                        </span>
                        <strong>
                            ₱{subtotal.toLocaleString()}
                        </strong>
                    </div>

                    <div className="checkout-summary-row">
                        <span>Delivery</span>
                        <strong>
                            {shippingFee === 0
                                ? "Free"
                                : `₱${shippingFee.toLocaleString()}`}
                        </strong>
                    </div>

                    <div className="checkout-summary-total">
                        <span>Total</span>
                        <strong>
                            ₱{total.toLocaleString()}
                        </strong>
                    </div>

                    <div className="checkout-summary-method">
                        <span>Payment</span>
                        <strong>
                            {paymentMethod === "gcash"
                                ? "GCash"
                                : "Cash on Delivery"}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className="checkout-place-order"
                        onClick={placeOrder}
                        disabled={submitting}
                    >
                        {submitting
                            ? "Placing order..."
                            : "Place Order"}
                    </button>

                    <p className="checkout-secure-note">
                        Your order will be created only after all
                        required checkout details are completed.
                    </p>
                </aside>
            </div>
        </main>
    );
}

export default Checkout;