import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft,
    Check,
    LockKeyhole,
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
import { getBuyerCartItemKey } from "../../../shared/utils/buyerProductActions";
import { normalizeBuyerAddress, validateBuyerAddress } from "../Account/addressValidation";
import { formatVoucherDiscount } from "../../../shared/utils/voucherPresentation";
import "./Checkout.css";

const SELECTED_CART_KEY = "cryma_selected_cart_ids";
const CHECKOUT_ITEMS_KEY = "cryma_checkout_item_ids";
const CHECKOUT_IDEMPOTENCY_KEY = "cryma_checkout_order_idempotency_key";
const blankAddress = {
    label: "home", recipient_name: "", phone: "", is_default: false,
    region: "", province: "", municipality: "", barangay: "", street: "",
    house_number: "", building_name: "", unit_number: "", postal_code: "",
};

function getCheckoutIdempotencyKey(fingerprint) {
    const storedValue = sessionStorage.getItem(CHECKOUT_IDEMPOTENCY_KEY);
    if (storedValue) {
        try {
            const existing = JSON.parse(storedValue);
            if (existing?.fingerprint === fingerprint && typeof existing.key === "string") {
                return existing.key;
            }
        } catch {
            // Replace keys created by the earlier unscoped format.
        }
    }

    const key = crypto.randomUUID();
    sessionStorage.setItem(CHECKOUT_IDEMPOTENCY_KEY, JSON.stringify({ fingerprint, key }));
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

    const paymentMethod = "cash_on_delivery";

    const [showConfirmModal, setShowConfirmModal] =
        useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [loadingVouchers, setLoadingVouchers] = useState(true);
    const [voucherCodeInput, setVoucherCodeInput] = useState("");
    const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
    const [voucherPreview, setVoucherPreview] = useState(null);
    const [voucherLoading, setVoucherLoading] = useState(false);
    const [claimingVoucherId, setClaimingVoucherId] = useState(null);
    const [voucherError, setVoucherError] = useState("");
    const [shippingVoucherCodeInput, setShippingVoucherCodeInput] = useState("");
    const [appliedShippingVoucherCode, setAppliedShippingVoucherCode] = useState("");
    const [shippingVoucherPreview, setShippingVoucherPreview] = useState(null);
    const [shippingVoucherLoading, setShippingVoucherLoading] = useState(false);
    const [shippingVoucherError, setShippingVoucherError] = useState("");
    const [shippingQuote, setShippingQuote] = useState(null);
    const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false);
    const [shippingQuoteError, setShippingQuoteError] = useState("");
    const voucherValidationSequence = useRef(0);
    const voucherCartFingerprint = useRef("");


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
            selectedSet.has(getBuyerCartItemKey(item)) ||
            (!item.variant_id && selectedSet.has(String(item.id)))
        );
    }, [cart, selectedIds]);
    const voucherCartKey = useMemo(
        () => selectedCartItems.map((item) => `${getBuyerCartItemKey(item)}:${item.quantity}:${item.price}:${item.category || ""}`).join("|"),
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

    const shippingFee = Number(shippingQuote?.shipping_fee || 0);

    const checkoutSubtotal = Number(voucherPreview?.subtotal ?? subtotal);
    const voucherDiscount = Number(voucherPreview?.discount_amount || 0);
    const shippingVoucherDiscount = Number(shippingVoucherPreview?.discount_amount || 0);
    const total = Math.max(0, checkoutSubtotal - voucherDiscount + shippingFee - shippingVoucherDiscount);

    useEffect(() => {
        if (!selectedSavedAddressId) return undefined;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            if (cancelled) return;
            setShippingQuoteLoading(true);
            setShippingQuoteError("");
            api.post("/buyer/shipping-quote", {
                address_id: Number(selectedSavedAddressId),
                items: selectedCartItems.map((item) => ({
                    product_id: Number(item.id),
                    ...(item.variant_id ? { variant_id: item.variant_id } : {}),
                    quantity: Number(item.quantity),
                })),
            })
                .then(({ data }) => {
                    if (!cancelled) setShippingQuote(data?.data || null);
                })
                .catch((requestError) => {
                    if (cancelled) return;
                    const errors = requestError.response?.data?.errors;
                    setShippingQuoteError(errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message || "Shipping is not configured for this address.");
                })
                .finally(() => {
                    if (!cancelled) setShippingQuoteLoading(false);
                });
        }, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [selectedSavedAddressId, selectedCartItems]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setAppliedShippingVoucherCode("");
            setShippingVoucherPreview(null);
            setShippingVoucherError("");
        }, 0);
        return () => window.clearTimeout(timer);
    }, [voucherCartKey]);

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
            items: selectedCartItems.map((item) => ({ product_id: item.id, ...(item.variant_id ? { variant_id: item.variant_id } : {}), quantity: Number(item.quantity) })),
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
                items: selectedCartItems.map((item) => ({ product_id: item.id, ...(item.variant_id ? { variant_id: item.variant_id } : {}), quantity: Number(item.quantity) })),
            });
            if (sequence !== voucherValidationSequence.current) return;
            const preview = data?.data;
            if (preview?.scope !== "product" || !preview?.voucher?.code || preview.discount_amount === undefined) {
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
        if (String(id) !== String(selectedSavedAddressId)) {
            setAppliedShippingVoucherCode("");
            setShippingVoucherPreview(null);
            setShippingVoucherError("");
            setShippingQuote(null);
            setShippingQuoteError("");
            setShippingQuoteLoading(Boolean(id));
        }
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
            setAppliedShippingVoucherCode("");
            setShippingVoucherPreview(null);
            setShippingQuote(null);
            setShippingQuoteError("");
            setShippingQuoteLoading(true);
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

    const eligibleVouchers = useMemo(() => vouchers.filter((voucher) => {
        if (voucher.scope === "shipping") return false;
        if (voucher.buyer_status !== "available") return false;
        if (voucher.voucher_seller_id && !sellerIds.includes(String(voucher.voucher_seller_id))) return false;
        const productIds = (voucher.product_ids || []).map(String);
        const categories = (voucher.categories || []).map((category) => String(category).trim().toLocaleLowerCase());
        const hasRestrictions = productIds.length > 0 || categories.length > 0;
        const eligibleItems = selectedCartItems.filter((item) => {
            if (voucher.voucher_seller_id && String(item.seller_id ?? item.seller?.id ?? item.seller) !== String(voucher.voucher_seller_id)) return false;
            if (!hasRestrictions) return true;
            const matchesProduct = productIds.includes(String(item.product_id ?? item.id));
            const matchesCategory = categories.includes(String(item.category || "").trim().toLocaleLowerCase());
            return matchesProduct || matchesCategory;
        });
        const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
        return eligibleItems.length > 0 && eligibleSubtotal >= Number(voucher.minimum_spend || 0);
    }), [vouchers, selectedCartItems, sellerIds]);

    const availableShippingVouchers = useMemo(() => vouchers.filter((voucher) =>
        voucher.scope === "shipping" &&
        voucher.buyer_status === "available"
    ), [vouchers]);
    const upcomingShippingVouchers = useMemo(() => vouchers.filter((voucher) =>
        voucher.scope === "shipping" &&
        voucher.buyer_status === "ineligible" &&
        voucher.buyer_status_reason === "This voucher is not available yet."
    ), [vouchers]);

    const claimVoucher = async (voucher, reportError = setVoucherError) => {
        if (claimingVoucherId || voucher.is_claimed) return;
        setClaimingVoucherId(voucher.id);
        setVoucherError("");
        try {
            await api.post(`/buyer/vouchers/${voucher.id}/claim`);
            setVouchers((current) => current.map((item) => item.id === voucher.id ? { ...item, is_claimed: true } : item));
            return true;
        } catch (requestError) {
            reportError(requestError.response?.data?.errors?.voucher?.[0] || requestError.response?.data?.message || "Unable to claim this voucher.");
            return false;
        } finally {
            setClaimingVoucherId(null);
        }
    };

    const applyShippingVoucherCode = async (rawCode) => {
        const code = String(rawCode || "").trim();
        if (!code) {
            setShippingVoucherError("Enter a shipping voucher code.");
            return;
        }
        if (!selectedSavedAddressId || !shippingQuote) {
            setShippingVoucherError(shippingQuoteError || "Choose an address with a configured shipping rate first.");
            return;
        }
        setShippingVoucherLoading(true);
        setShippingVoucherError("");
        try {
            const { data } = await api.post("/buyer/vouchers/validate", {
                code,
                address_id: Number(selectedSavedAddressId),
                items: selectedCartItems.map((item) => ({
                    product_id: item.id,
                    ...(item.variant_id ? { variant_id: item.variant_id } : {}),
                    quantity: Number(item.quantity),
                })),
            });
            const preview = data?.data;
            if (preview?.scope !== "shipping" || !preview?.voucher?.code || preview.discount_amount === undefined) {
                throw new Error("Shipping voucher validation response was incomplete.");
            }
            setAppliedShippingVoucherCode(preview.voucher.code);
            setShippingVoucherPreview(preview);
            setShippingVoucherCodeInput("");
        } catch (requestError) {
            const errors = requestError.response?.data?.errors;
            setShippingVoucherError(errors ? Object.values(errors).flat()[0] : requestError.response?.data?.message || requestError.message || "Unable to apply this shipping voucher.");
            setAppliedShippingVoucherCode("");
            setShippingVoucherPreview(null);
        } finally {
            setShippingVoucherLoading(false);
        }
    };

    const removeShippingVoucher = () => {
        setAppliedShippingVoucherCode("");
        setShippingVoucherPreview(null);
        setShippingVoucherError("");
    };

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

        const vacationItem = selectedCartItems.find((item) => item.seller_on_vacation === true);
        if (vacationItem) {
            setError("This seller is on vacation and is not accepting orders. Remove this item and try again when the seller returns.");
            return false;
        }

        if (appliedVoucherCode && (voucherLoading || !voucherPreview)) {
            setError(voucherError || "Wait for the selected voucher to finish validating, or remove it before placing your order.");
            return false;
        }
        if (appliedShippingVoucherCode && (shippingVoucherLoading || !shippingVoucherPreview)) {
            setError(shippingVoucherError || "Wait for the shipping voucher to finish validating, or remove it before placing your order.");
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
        if (shippingQuoteLoading || !shippingQuote) {
            setError(shippingQuoteError || "Wait for the shipping fee to load or choose another address.");
            return false;
        }

        if (paymentMethod !== "cash_on_delivery") {
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
            const requestFingerprint = JSON.stringify({
                address_id: Number(selectedSavedAddressId),
                payment_method: paymentMethod,
                items: selectedCartItems.map((item) => ({
                    product_id: Number(item.id),
                    variant_id: item.variant_id || null,
                    quantity: Number(item.quantity),
                })).sort((a, b) => `${a.product_id}:${a.variant_id || ""}`.localeCompare(`${b.product_id}:${b.variant_id || ""}`)),
                voucher_code: appliedVoucherCode || null,
                shipping_voucher_code: appliedShippingVoucherCode || null,
            });
            const idempotencyKey = getCheckoutIdempotencyKey(requestFingerprint);
            checkoutIdempotencyKey.current = idempotencyKey;

            const { data } = await api.post(
                "/orders",
                {
                    ...(selectedSavedAddressId ? { address_id: Number(selectedSavedAddressId) } : {}),
                    ...(appliedVoucherCode ? { voucher_code: appliedVoucherCode } : {}),
                    ...(appliedShippingVoucherCode ? { shipping_voucher_code: appliedShippingVoucherCode } : {}),
                    delivery_address:
                        deliveryAddress,

                    payment_method:
                        paymentMethod,

                    items: selectedCartItems.map(
                        (item) => ({
                            product_id: item.id,
                            ...(item.variant_id ? { variant_id: item.variant_id } : {}),
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
                    (item) => getBuyerCartItemKey(item)
                )
            );

            const remainingCart =
                cart.filter(
                    (item) =>
                        !checkedOutIds.has(getBuyerCartItemKey(item))
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

            const checkoutOrders = data?.data?.checkout_orders;
            navigate(checkoutOrders?.length > 1 ? "/orders" : `/orders/${orderId}`);
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
                        <LockKeyhole size={13} aria-hidden="true" />
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
                                        <span className="checkout-address-contact"><small>CONTACT</small><strong>{saved.phone || profile?.phone || "No contact number"}</strong></span>
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
                            overlayClassName="checkout-address-overlay"
                            busy={addressSaving}
                        >
                                <header>
                                    <div>
                                        <p className="checkout-eyebrow"><MapPin size={13} aria-hidden="true" /> DELIVERY DETAILS</p>
                                        <h2 id="checkout-address-modal-title">Add an address</h2>
                                        <p>Your current cart, selected items, and payment choice will stay unchanged.</p>
                                    </div>
                                    <button type="button" aria-label="Close address form" disabled={addressSaving} onClick={() => setShowAddressForm(false)}><X size={18} /></button>
                                </header>
                                <form onSubmit={saveAddressDuringCheckout} noValidate>
                                    <BuyerAddressForm address={addressDraft} errors={addressErrors} onChange={setAddressDraft} disabled={addressSaving} showDefault grouped lockRecipientDetails />
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

                                            {item.variant_name && <span className="checkout-item-category">{item.variant_name}</span>}

                                            <span className="checkout-item-quantity">
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
                        <span>Shipping ({shippingQuote?.parcels?.length || 0} seller parcels)</span>
                        <strong>{shippingQuoteLoading ? "Calculating…" : shippingQuote ? `₱${shippingFee.toLocaleString()}` : "Unavailable"}</strong>
                    </div>
                    {shippingQuote?.is_provisional && <p className="checkout-shipping-provisional" role="note">Estimated delivery fee — courier price has not been verified.</p>}
                    {shippingQuote?.parcels?.length > 1 && <div className="checkout-shipping-parcels">
                        {shippingQuote.parcels.map((parcel) => (
                            <div key={parcel.seller_id}>
                                <span>{parcel.origin_zone} → {parcel.destination_zone} · {parcel.seller_name}</span>
                                <strong>₱{Number(parcel.shipping_fee).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
                            </div>
                        ))}
                    </div>}
                    {shippingQuoteError && <p className="checkout-voucher-error" role="alert">{shippingQuoteError}</p>}

                    {voucherDiscount > 0 && (
                        <div className="checkout-summary-row checkout-voucher-discount-row">
                            <span>Product voucher discount</span>
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
                        {!appliedVoucherCode && eligibleVouchers.length > 0 && (
                            <div className="checkout-voucher-available">
                                <p className="checkout-voucher-status">Available for your selected items</p>
                                {eligibleVouchers.map((voucher) => (
                                    <button
                                        type="button"
                                        key={voucher.id}
                                        onClick={() => voucher.is_claimed ? applyVoucherCode(voucher.code) : void claimVoucher(voucher)}
                                        disabled={voucherLoading || submitting || claimingVoucherId !== null}
                                    >
                                        <span><strong>{voucher.code}</strong><small>{formatVoucherDiscount(voucher)}{voucher.seller_name ? ` · ${voucher.seller_name}` : ""}</small></span>
                                        <small>{claimingVoucherId === voucher.id ? "Claiming…" : voucher.is_claimed ? "Apply voucher" : "Claim voucher"}{Number(voucher.minimum_spend) > 0 ? ` · Min. ₱${Number(voucher.minimum_spend).toLocaleString()}` : ""}</small>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!loadingVouchers && !appliedVoucherCode && selectedCartItems.length > 0 && eligibleVouchers.length === 0 && (
                            <p className="checkout-voucher-status">No available vouchers apply to the items in this order.</p>
                        )}
                    </section>

                    <section className="checkout-voucher-box" aria-labelledby="checkout-shipping-voucher-title">
                        <div className="checkout-voucher-heading">
                            <Ticket size={16} />
                            <strong id="checkout-shipping-voucher-title">Free Shipping voucher</strong>
                        </div>
                        {appliedShippingVoucherCode && shippingVoucherPreview ? (
                            <div className="checkout-voucher-applied">
                                <div>
                                    <strong>{shippingVoucherPreview.voucher.code}</strong>
                                    <span>Saved ₱{Number(shippingVoucherPreview.discount_amount).toLocaleString()} on delivery</span>
                                </div>
                                <button type="button" onClick={removeShippingVoucher} disabled={submitting}>Remove</button>
                            </div>
                        ) : (
                            <form className="checkout-voucher-form" onSubmit={(event) => {
                                event.preventDefault();
                                applyShippingVoucherCode(shippingVoucherCodeInput);
                            }}>
                                <label className="checkout-voucher-label" htmlFor="checkout-shipping-voucher-code">Shipping voucher code</label>
                                <input
                                    id="checkout-shipping-voucher-code"
                                    value={shippingVoucherCodeInput}
                                    onChange={(event) => setShippingVoucherCodeInput(event.target.value)}
                                    placeholder="Enter shipping voucher code"
                                    maxLength={64}
                                    disabled={shippingVoucherLoading || submitting || !shippingQuote}
                                />
                                <button type="submit" disabled={shippingVoucherLoading || submitting || !shippingQuote}>
                                    {shippingVoucherLoading ? "Checking…" : "Apply"}
                                </button>
                            </form>
                        )}
                        {shippingVoucherError && <p className="checkout-voucher-error" role="alert">{shippingVoucherError}</p>}
                        {!appliedShippingVoucherCode && availableShippingVouchers.length > 0 && (
                            <div className="checkout-voucher-available">
                                <p className="checkout-voucher-status">Available for this delivery</p>
                                {availableShippingVouchers.map((voucher) => {
                                    const minimumSpend = Number(voucher.minimum_spend || 0);
                                    const remainingSpend = Math.max(0, minimumSpend - subtotal);
                                    return (
                                    <button
                                        type="button"
                                        key={voucher.id}
                                        onClick={async () => {
                                            if (!voucher.is_claimed && !(await claimVoucher(voucher, setShippingVoucherError))) return;
                                            if (remainingSpend > 0) {
                                                setShippingVoucherError(`Add ₱${remainingSpend.toLocaleString()} more to meet this voucher's minimum spend.`);
                                                return;
                                            }
                                            if (!selectedSavedAddressId || !shippingQuote) {
                                                setShippingVoucherError(shippingQuoteError || "Choose an address with a configured shipping rate to apply this voucher.");
                                                return;
                                            }
                                            await applyShippingVoucherCode(voucher.code);
                                        }}
                                        disabled={shippingVoucherLoading || submitting || claimingVoucherId !== null || (voucher.is_claimed && (!shippingQuote || !selectedSavedAddressId))}
                                    >
                                        <span><strong>{voucher.code}</strong><small>{formatVoucherDiscount(voucher)} off shipping</small></span>
                                        <small>{claimingVoucherId === voucher.id ? "Claiming…" : remainingSpend > 0 ? `Min. spend ₱${minimumSpend.toLocaleString()} · Add ₱${remainingSpend.toLocaleString()}` : voucher.is_claimed ? "Apply voucher" : "Claim voucher"}</small>
                                    </button>
                                    );
                                })}
                            </div>
                        )}
                        {!appliedShippingVoucherCode && upcomingShippingVouchers.length > 0 && (
                            <div className="checkout-voucher-available checkout-voucher-upcoming">
                                <p className="checkout-voucher-status">Upcoming shipping vouchers</p>
                                {upcomingShippingVouchers.map((voucher) => (
                                    <div className="checkout-voucher-upcoming-item" key={voucher.id}>
                                        <span><strong>{voucher.code}</strong><small>{formatVoucherDiscount(voucher)} off shipping</small></span>
                                        <small>
                                            Starts {voucher.starts_at
                                                ? new Date(voucher.starts_at).toLocaleDateString("en-PH", { dateStyle: "medium" })
                                                : "later"}
                                            {Number(voucher.minimum_spend) > 0 ? ` · Min. ₱${Number(voucher.minimum_spend).toLocaleString()}` : ""}
                                        </small>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loadingVouchers && !appliedShippingVoucherCode && availableShippingVouchers.length === 0 && upcomingShippingVouchers.length === 0 && (
                            <p className="checkout-voucher-status">No shipping vouchers are currently available.</p>
                        )}
                    </section>

                    {/* PAYMENT IS HERE */}
                    <div className="checkout-summary-payment">
                        <div className="checkout-summary-payment-heading">
                            <div>
                                <span>Payment method</span>
                                <strong className="checkout-payment-current">Cash on Delivery</strong>
                            </div>
                            <span className="checkout-payment-method-badge"><Check size={13} aria-hidden="true" /> Selected</span>
                        </div>
                        <p className="checkout-payment-hint">Pay when your order arrives at the delivery address.</p>
                    </div>

                    <div className="checkout-summary-total">
                        <div>
                            <span>Estimated total</span>
                            {(voucherPreview || shippingVoucherPreview) && <small>Product discounts apply to eligible items; shipping discounts cannot exceed the delivery fee.</small>}
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
                            shippingQuoteLoading ||
                            !shippingQuote ||
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
                                    Cash on Delivery
                                </strong>
                            </div>

                            {voucherPreview && (
                                <div>
                                    <span>Product voucher ({voucherPreview.voucher.code})</span>
                                    <strong>−₱{Number(voucherPreview.discount_amount).toLocaleString()}</strong>
                                </div>
                            )}
                            <div>
                                <span>Delivery fee</span>
                                <strong>{shippingQuoteLoading ? "Calculating…" : `₱${shippingFee.toLocaleString()}`}</strong>
                            </div>
                            {shippingVoucherPreview && (
                                <div>
                                    <span>Shipping voucher ({shippingVoucherPreview.voucher.code})</span>
                                    <strong>−₱{Number(shippingVoucherPreview.discount_amount).toLocaleString()}</strong>
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
