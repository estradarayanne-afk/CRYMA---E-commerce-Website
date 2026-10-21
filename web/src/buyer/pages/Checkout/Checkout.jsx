import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    Check,
    MapPin,
    PackageCheck,
    Plus,
    ShoppingBag,
    Ticket,
    X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import api from "../../../shared/services/api";
import BuyerAddressForm from "../../components/BuyerAddressForm";
import Dialog from "../../../shared/components/Dialog";
import {
    getBuyerCart,
    isBuyerSession,
    saveBuyerCart,
} from "../../../shared/utils/buyerAccess";
import { normalizeBuyerAddress, validateBuyerAddress } from "../Account/addressValidation";
import { calculateVoucherTotal, formatVoucherDiscount } from "../../../shared/utils/voucherPresentation";
import "./Checkout.css";

const SELECTED_CART_KEY = "cryma_selected_cart_ids";
const CHECKOUT_ITEMS_KEY = "cryma_checkout_item_ids";
const CHECKOUT_IDEMPOTENCY_KEY = "cryma_checkout_order_idempotency_key";
const blankAddress = {
    label: "home", recipient_name: "", phone: "", is_default: false,
    region: "", province: "", municipality: "", barangay: "", street: "",
    house_number: "", building_name: "", unit_number: "", postal_code: "",
};

function getCheckoutIdempotencyKey() {
    const existingKey = sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY);
    if (existingKey) return existingKey;

    const key = crypto.randomUUID();
    sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, key);
    return key;
}

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
    const isLoggedIn = isBuyerSession();

    const [cart, setCart] = useState(getBuyerCart);

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
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState("");
    const [loadingProfile, setLoadingProfile] =
        useState(true);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressDraft, setAddressDraft] = useState(blankAddress);
    const [addressSaving, setAddressSaving] = useState(false);
    const [addressErrors, setAddressErrors] = useState({});
    const [addressSaveError, setAddressSaveError] = useState("");
    const addressSubmitLock = useRef(false);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const submissionLock = useRef(false);
    const checkoutIdempotencyKey = useRef(null);

    const [paymentMethod, setPaymentMethod] =
        useState("cash_on_delivery");
    const [paymentOptionsOpen, setPaymentOptionsOpen] = useState(false);

    const [showConfirmModal, setShowConfirmModal] =
        useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(true);
    const [voucherCodeInput, setVoucherCodeInput] = useState("");
    const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
    const [voucherPreview, setVoucherPreview] = useState(null);
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [voucherError, setVoucherError] = useState("");
    const voucherValidationSequence = useRef(0);
    const voucherCartFingerprint = useRef("");

    const [notice] = useState("");

    useEffect(() => {
        const syncCart = () => setCart(getBuyerCart());
        window.addEventListener("cryma-cart-updated", syncCart);
        window.addEventListener("storage", syncCart);
        return () => {
            window.removeEventListener("cryma-cart-updated", syncCart);
            window.removeEventListener("storage", syncCart);
        };
    }, []);

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
    const voucherCartKey = useMemo(
        () => selectedCartItems.map((item) => `${item.id}:${item.quantity}:${item.price}:${item.category || ""}`).join("|"),
        [selectedCartItems]
    );

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
                        Number(item.quantity || 1),
                0
            ),
        [selectedCartItems]
    );

    const shippingFee = 0;

    const checkoutSubtotal = Number(voucherPreview?.subtotal ?? subtotal);
    const voucherDiscount = Number(voucherPreview?.discount_amount || 0);
    const total = calculateVoucherTotal(checkoutSubtotal, shippingFee, voucherDiscount);

    useEffect(() => {
        if (!isLoggedIn) return undefined;
        let cancelled = false;
        api.get("/buyer/vouchers")
            .then(({ data }) => {
                if (!cancelled) setVouchers(Array.isArray(data?.data) ? data.data : []);
            })
            .catch(() => {
                if (!cancelled) setVoucherError("Unable to load vouchers. You can still enter a voucher code.");
            })
            .finally(() => {
                if (!cancelled) setLoadingVouchers(false);
            });
        return () => { cancelled = true; };
    }, [isLoggedIn]);

    useEffect(() => {
        if (!appliedVoucherCode || voucherCartFingerprint.current === voucherCartKey) return undefined;
        let cancelled = false;
        const sequence = ++voucherValidationSequence.current;
        setVoucherLoading(true);
        setVoucherPreview(null);
        setVoucherError("");
        api.post("/buyer/vouchers/validate", {
            code: appliedVoucherCode,
            items: selectedCartItems.map((item) => ({ product_id: item.id, quantity: Number(item.quantity) })),
        })
            .then(({ data }) => {
                if (cancelled || sequence !== voucherValidationSequence.current) return;
                setVoucherPreview(data?.data || null);
                voucherCartFingerprint.current = voucherCartKey;
            })
            .catch((requestError) => {
                if (!cancelled && sequence === voucherValidationSequence.current) {
                    const errors = requestError.response?.data?.errors;
                    setVoucherError(errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message || "This voucher is no longer eligible for your cart.");
                }
            })
            .finally(() => {
                if (!cancelled && sequence === voucherValidationSequence.current) setVoucherLoading(false);
            });
        return () => { cancelled = true; };
    }, [appliedVoucherCode, selectedCartItems, voucherCartKey]);

    const applyVoucherCode = async (rawCode) => {
        const code = String(rawCode || "").trim();
        if (!code) {
            setVoucherError("Enter a voucher code.");
            return;
        }
        if (selectedCartItems.length === 0) {
            setVoucherError("Add items to your order before applying a voucher.");
            return;
        }
        const sequence = ++voucherValidationSequence.current;
        setVoucherLoading(true);
        setVoucherError("");
        setVoucherPreview(null);
        try {
            const { data } = await api.post("/buyer/vouchers/validate", {
                code,
                items: selectedCartItems.map((item) => ({ product_id: item.id, quantity: Number(item.quantity) })),
            });
            if (sequence !== voucherValidationSequence.current) return;
            const preview = data?.data;
            if (!preview?.voucher?.code || preview.discount_amount === undefined) {
                throw new Error("Voucher validation response was incomplete.");
            }
            setAppliedVoucherCode(preview.voucher.code);
            setVoucherPreview(preview);
            voucherCartFingerprint.current = voucherCartKey;
            setVoucherCodeInput("");
        } catch (requestError) {
            if (sequence === voucherValidationSequence.current) {
                const errors = requestError.response?.data?.errors;
                setVoucherError(errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message || requestError.message || "Unable to apply this voucher.");
                setAppliedVoucherCode("");
            }
        } finally {
            if (sequence === voucherValidationSequence.current) setVoucherLoading(false);
        }
    };

    const removeVoucher = () => {
        voucherValidationSequence.current += 1;
        voucherCartFingerprint.current = "";
        setAppliedVoucherCode("");
        setVoucherPreview(null);
        setVoucherError("");
        setVoucherLoading(false);
    };

    const itemCount = selectedCartItems.reduce(
        (sum, item) =>
            sum + Number(item.quantity || 1),
        0
    );

    const hasInvalidSelectedStock = useMemo(
        () =>
            selectedCartItems.some(
                (item) =>
                    Number(item.quantity || 1) < 1 ||
                    (item.stock !== null && item.stock !== undefined && item.stock !== "" &&
                        Number(item.quantity || 1) > Number(item.stock))
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
                const savedAddressesPayload = Array.isArray(checkoutData.addresses)
                    ? checkoutData.addresses
                    : savedAddress ? [savedAddress] : [];
                setSavedAddresses(savedAddressesPayload);

                setProfile(
                    checkoutData.user || null
                );

                const preferredAddress = savedAddressesPayload.find((item) => item.is_default) || savedAddress || savedAddressesPayload[0];
                setSelectedSavedAddressId(preferredAddress ? String(preferredAddress.id) : "");
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

    const selectSavedAddress = (id) => {
        setSelectedSavedAddressId(id);
    };

    const startAddingAddress = () => {
        setAddressDraft({
            ...blankAddress,
            recipient_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
            phone: profile?.phone || "",
            is_default: savedAddresses.length === 0,
        });
        setAddressErrors({});
        setAddressSaveError("");
        setShowAddressForm(true);
    };

    const saveAddressDuringCheckout = async (event) => {
        event.preventDefault();
        if (addressSubmitLock.current) return;
        const validationErrors = validateBuyerAddress(addressDraft);
        setAddressErrors(validationErrors);
        setAddressSaveError("");
        if (Object.keys(validationErrors).length) return;

        addressSubmitLock.current = true;
        setAddressSaving(true);
        try {
            const { data } = await api.post("/buyer/addresses", normalizeBuyerAddress(addressDraft));
            const savedAddress = data.data;
            setSavedAddresses((current) => {
                const next = savedAddress.is_default
                    ? current.map((item) => ({ ...item, is_default: false }))
                    : current;
                return [savedAddress, ...next];
            });
            setSelectedSavedAddressId(String(savedAddress.id));
            setShowAddressForm(false);
            setAddressErrors({});
        } catch (requestError) {
            const serverErrors = requestError.response?.data?.errors;
            if (serverErrors) {
                setAddressErrors(Object.fromEntries(
                    Object.entries(serverErrors).map(([field, messages]) => [field, messages[0]])
                ));
            } else {
                setAddressSaveError(
                    requestError.response?.data?.message || "Unable to save this address. Please try again."
                );
            }
        } finally {
            addressSubmitLock.current = false;
            setAddressSaving(false);
        }
    };

    const formatAddress = () => {
        const selected = savedAddresses.find((item) => String(item.id) === String(selectedSavedAddressId));
        if (!selected) return "";
        const parts = [
            selected.house_number,
            selected.building_name,
            selected.unit_number,
            selected.street,
            selected.barangay,
            selected.municipality,
            selected.province,
            selected.region,
            selected.postal_code,
        ]
            .map((value) => String(value || "").trim())
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

        if (appliedVoucherCode && (voucherLoading || !voucherPreview)) {
            setError(voucherError || "Wait for the selected voucher to finish validating, or remove it before placing your order.");
            return false;
        }

        const selectedAddress = savedAddresses.find(
            (item) => String(item.id) === String(selectedSavedAddressId)
        );
        if (!selectedAddress) {
            setError("Choose a saved delivery address or add a new one.");
            return false;
        }
        if (!selectedAddress.barangay || !selectedAddress.municipality || !selectedAddress.province) {
            setError("This saved address is incomplete. Edit it in My Account or add a complete address.");
            return false;
        }

        if (!["cash_on_delivery", "gcash"].includes(paymentMethod)) {
            setError("Please select one of the available payment methods.");
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
        if (submissionLock.current || submitting) {
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
        if (submissionLock.current || submitting) {
            return;
        }

        if (!validateCheckout()) {
            setShowConfirmModal(false);
            return;
        }

        submissionLock.current = true;
        setSubmitting(true);
        setError("");

        try {
            const deliveryAddress =
                formatAddress();
            const idempotencyKey = checkoutIdempotencyKey.current || getCheckoutIdempotencyKey();
            checkoutIdempotencyKey.current = idempotencyKey;

            const { data } = await api.post(
                "/orders",
                {
                    ...(selectedSavedAddressId ? { address_id: Number(selectedSavedAddressId) } : {}),
                    ...(appliedVoucherCode ? { voucher_code: appliedVoucherCode } : {}),
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
                },
                {
                    headers: {
                        "Idempotency-Key": idempotencyKey,
                    },
                }
            );

            const orderId = data?.data?.id;
            if (!orderId) {
                throw new Error("Order confirmation was not received. Your cart has been kept.");
            }

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

            if (saveBuyerCart(remainingCart)) {
                setCart(remainingCart);
            }

            localStorage.setItem(
                SELECTED_CART_KEY,
                JSON.stringify([])
            );

            localStorage.setItem(
                CHECKOUT_ITEMS_KEY,
                JSON.stringify([])
            );

            sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY);
            checkoutIdempotencyKey.current = null;

            setShowConfirmModal(false);

            navigate(
                `/orders/${orderId}`
            );
        } catch (err) {
            setShowConfirmModal(false);

            if (err.response?.status && err.response.status < 500) {
                sessionStorage.removeItem(CHECKOUT_IDEMPOTENCY_KEY);
                checkoutIdempotencyKey.current = null;
            }

            const validationErrors = err.response?.data?.errors;
            const firstValidationError = validationErrors ? Object.values(validationErrors).flat()[0] : "";
            if (validationErrors?.voucher_code) {
                setVoucherError(validationErrors.voucher_code[0]);
                setAppliedVoucherCode("");
                setVoucherPreview(null);
                voucherCartFingerprint.current = "";
            }
            setError(
                firstValidationError ||
                    err.response?.data?.message ||
                    err.message ||
                    "Unable to place your order. Please try again."
            );
        } finally {
            submissionLock.current = false;
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
                <div className="checkout-error" role="alert" aria-live="assertive">
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

                        <div className="checkout-address-list" role="radiogroup" aria-label="Saved delivery addresses">
                            {savedAddresses.map((saved) => (
                                <label
                                    key={saved.id}
                                    className={`checkout-address-option ${String(saved.id) === String(selectedSavedAddressId) ? "selected" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="saved-address"
                                        value={saved.id}
                                        checked={String(saved.id) === String(selectedSavedAddressId)}
                                        onChange={() => selectSavedAddress(String(saved.id))}
                                    />
                                    <span className="checkout-address-option-content">
                                        <span className="checkout-address-option-heading">
                                            <strong>{saved.label ? saved.label[0].toUpperCase() + saved.label.slice(1) : "Address"}</strong>
                                            {saved.is_default && <small>Default</small>}
                                        </span>
                                        <strong>{saved.recipient_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")}</strong>
                                        <span>{saved.phone || profile?.phone || "No contact number"}</span>
                                        <span>{[saved.house_number, saved.building_name, saved.unit_number, saved.street, saved.barangay, saved.municipality, saved.province, saved.region, saved.postal_code].filter(Boolean).join(", ")}</span>
                                    </span>
                                </label>
                            ))}
                        </div>

                        {!savedAddresses.length && (
                            <p className="checkout-address-empty">Add a delivery address to continue. Your cart and checkout selections will be kept.</p>
                        )}

                        <button type="button" className="checkout-add-address" onClick={startAddingAddress}>
                            <Plus size={16} /> Add a new address
                        </button>
                    </div>

                    {showAddressForm && (
                        <Dialog
                            open={showAddressForm}
                            onClose={() => setShowAddressForm(false)}
                            ariaLabelledBy="checkout-address-modal-title"
                            className="checkout-address-modal"
                            busy={addressSaving}
                        >
                                <header>
                                    <div>
                                        <p className="checkout-eyebrow">DELIVERY DETAILS</p>
                                        <h2 id="checkout-address-modal-title">Add an address</h2>
                                        <p>Your current cart, selected items, and payment choice will stay unchanged.</p>
                                    </div>
                                    <button type="button" aria-label="Close address form" disabled={addressSaving} onClick={() => setShowAddressForm(false)}><X size={18} /></button>
                                </header>
                                <form onSubmit={saveAddressDuringCheckout} noValidate>
                                    <BuyerAddressForm address={addressDraft} errors={addressErrors} onChange={setAddressDraft} disabled={addressSaving} showDefault />
                                    {addressSaveError && <p className="checkout-error" role="alert">{addressSaveError}</p>}
                                    <div className="checkout-address-modal-actions">
                                        <button type="button" className="checkout-address-cancel" disabled={addressSaving} onClick={() => setShowAddressForm(false)}>Cancel</button>
                                        <button type="submit" className="checkout-address-save" disabled={addressSaving}>{addressSaving ? "Saving…" : "Save and select address"}</button>
                                    </div>
                                </form>
                        </Dialog>
                    )}


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
                    <h2>Order Summary</h2>

                    <div className="checkout-summary-row">
                        <span>Estimated subtotal ({selectedCartItems.length} products)</span>

                        <strong>₱{checkoutSubtotal.toLocaleString()}</strong>
                    </div>

                    <div className="checkout-summary-row">
                        <span>Delivery fee</span>

                        <strong className="checkout-free">
                            ₱{shippingFee.toLocaleString()}
                        </strong>
                    </div>

                    {voucherDiscount > 0 && (
                        <div className="checkout-summary-row checkout-voucher-discount-row">
                            <span>Voucher discount</span>
                            <strong>−₱{voucherDiscount.toLocaleString()}</strong>
                        </div>
                    )}

                    <section className="checkout-voucher-box" aria-labelledby="checkout-voucher-title">
                        <div className="checkout-voucher-heading">
                            <Ticket size={16} />
                            <strong id="checkout-voucher-title">Vouchers</strong>
                        </div>
                        {appliedVoucherCode && voucherPreview ? (
                            <div className="checkout-voucher-applied">
                                <div>
                                    <strong>{voucherPreview.voucher.code}</strong>
                                    <span>Saved ₱{Number(voucherPreview.discount_amount).toLocaleString()}</span>
                                </div>
                                <button type="button" onClick={removeVoucher} disabled={submitting}>Remove</button>
                            </div>
                        ) : (
                            <form
                                className="checkout-voucher-form"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    applyVoucherCode(voucherCodeInput);
                                }}
                            >
                                <label className="checkout-voucher-label" htmlFor="checkout-voucher-code">Voucher code</label>
                                <input
                                    id="checkout-voucher-code"
                                    value={voucherCodeInput}
                                    onChange={(event) => setVoucherCodeInput(event.target.value)}
                                    placeholder="Enter voucher code"
                                    maxLength={64}
                                    disabled={voucherLoading || submitting}
                                />
                                <button type="submit" disabled={voucherLoading || submitting}>
                                    {voucherLoading ? "Checking…" : "Apply"}
                                </button>
                            </form>
                        )}
                        {voucherError && <p className="checkout-voucher-error" role="alert">{voucherError}</p>}
                        {voucherLoading && <p className="checkout-voucher-status" role="status">Checking voucher eligibility…</p>}
                        {loadingVouchers && <p className="checkout-voucher-status" role="status">Loading available vouchers…</p>}
                        {!appliedVoucherCode && vouchers.filter((voucher) => voucher.buyer_status === "available").length > 0 && (
                            <div className="checkout-voucher-available">
                                {vouchers.filter((voucher) => voucher.buyer_status === "available").map((voucher) => (
                                    <button
                                        type="button"
                                        key={voucher.id}
                                        onClick={() => applyVoucherCode(voucher.code)}
                                        disabled={voucherLoading || submitting}
                                    >
                                        <span><strong>{voucher.code}</strong><small>{formatVoucherDiscount(voucher)}</small></span>
                                        <small>{Number(voucher.minimum_spend) > 0 ? `Min. ₱${Number(voucher.minimum_spend).toLocaleString()}` : "Use voucher"}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!loadingVouchers && vouchers.length > 0 && vouchers.every((voucher) => voucher.buyer_status !== "available") && (
                            <p className="checkout-voucher-status">There are no currently available vouchers for this account.</p>
                        )}
                    </section>

                    {/* PAYMENT IS HERE */}
                    <div className="checkout-summary-payment">
                        <div className="checkout-summary-payment-heading">
                            <div>
                                <span>Payment Method</span>
                                {!paymentOptionsOpen && (
                                    <small className="checkout-payment-current">
                                        {paymentMethod === "gcash" ? "GCash" : "Cash on Delivery"}
                                    </small>
                                )}
                            </div>
                            <button
                                type="button"
                                className="checkout-summary-change"
                                aria-expanded={paymentOptionsOpen}
                                onClick={() => setPaymentOptionsOpen((open) => !open)}
                            >
                                {paymentOptionsOpen ? "Done" : "Change"}
                            </button>
                        </div>

                        {paymentOptionsOpen && <div className="checkout-payment-options checkout-payment-options-summary">
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
                                    onChange={(event) => {
                                        setPaymentMethod(event.target.value);
                                        setPaymentOptionsOpen(false);
                                    }}
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
                                    onChange={(event) => {
                                        setPaymentMethod(event.target.value);
                                        setPaymentOptionsOpen(false);
                                    }}
                                />

                                <span className="checkout-payment-radio">
                                    <strong>GCash</strong>
                                    <small>
                                        GCash selected for this order
                                    </small>
                                </span>
                            </label>
                        </div>}
                    </div>

                    <div className="checkout-summary-total">
                        <div>
                            <span>Estimated total</span>
                            {voucherPreview && <small>Discount is applied to eligible merchandise only.</small>}
                        </div>

                        <strong>
                            ₱{total.toLocaleString()}
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
                        CRYMA checks current prices and stock when you place your order.
                    </p>
                </aside>
            </div>

            {/* =====================================================
                PLACE ORDER CONFIRMATION MODAL
            ===================================================== */}

            {showConfirmModal && (
                <Dialog
                    open={showConfirmModal}
                    onClose={() => setShowConfirmModal(false)}
                    ariaLabelledBy="checkout-confirm-title"
                    className="checkout-confirm-modal"
                    overlayClassName="checkout-confirm-overlay"
                    busy={submitting}
                >

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

                            {voucherPreview && (
                                <div>
                                    <span>Voucher ({voucherPreview.voucher.code})</span>
                                    <strong>−₱{Number(voucherPreview.discount_amount).toLocaleString()}</strong>
                                </div>
                            )}

                            <div className="total">
                                <span>Estimated total</span>

                                <strong>
                                    ₱{total.toLocaleString()}
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

                </Dialog>
            )}

        </main>
    );
}

export default Checkout;
