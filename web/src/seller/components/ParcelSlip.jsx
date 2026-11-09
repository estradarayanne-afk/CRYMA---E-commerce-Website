import { getCode39Barcode } from "../utils/code39";
import { parseDeliveryAddress } from "../../shared/utils/deliveryAddress";
import ParcelQrCode from "../../shared/components/ParcelQrCode";
import "./ParcelSlip.css";

function Code39({ value }) {
    const barcode = getCode39Barcode(value);
    if (!barcode) return null;

    return (
        <svg
            className="sl-parcel-barcode"
            viewBox={`0 0 ${barcode.width} 34`}
            role="img"
            aria-label={`Code 39 barcode for CRYMA order ${value}`}
        >
            {barcode.bars.map((bar, index) => (
                <rect key={`${bar.x}-${index}`} x={bar.x} y="0" width={bar.width} height="30" fill="#171717" />
            ))}
        </svg>
    );
}

function ParcelSlip({ order }) {
    const parcelCode = order.delivery_progress?.parcel_code || order.delivery?.parcel_code;
    const orderDate = order.created_at
        ? new Date(order.created_at).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : "—";
    const buyerName = [
        order.buyer?.first_name,
        order.buyer?.middle_name,
        order.buyer?.last_name,
    ].filter(Boolean).join(" ") || "Buyer";
    const sellerName = order.seller?.business_name || order.seller?.name || "CRYMA Seller";
    const address = parseDeliveryAddress(order.delivery_address);
    const totalQuantity = (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0);
    const shipmentStatus = String(order.delivery?.status || order.status || "Processing")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const failedAttempts = (order.delivery_progress?.events || order.delivery?.events || [])
        .filter((event) => ["failed", "returned_after_max_delivery_attempts"].includes(event.event_type))
        .sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
    const recordedAttempts = Number(order.delivery_progress?.delivery_attempts ?? failedAttempts.length);
    const maximumAttempts = Number(order.delivery_progress?.max_delivery_attempts || 3);
    const attemptNumber = Math.min(recordedAttempts + (shipmentStatus === "Returned" ? 0 : 1), maximumAttempts);
    const lastFailedAttempt = failedAttempts[0];
    const isCashOnDelivery = order.payment_method === "cash_on_delivery";
    const codAmount = Number(order.total_amount || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <section className="sl-parcel-slip" aria-label={`CRYMA parcel slip for order ${order.id}`}>
            <header className="sl-parcel-slip-header">
                <div className="sl-parcel-slip-brand">
                    <p>CRYMA MARKETPLACE</p>
                    <h1>SHIPPING LABEL</h1>
                </div>
                <div className="sl-parcel-slip-order-ref">
                    <small>ORDER NUMBER</small>
                    <strong>#{order.id}</strong>
                </div>
            </header>

            <div className="sl-parcel-slip-meta">
                <div><span>ORDER DATE</span><strong>{orderDate}</strong></div>
                <div><span>SHIPMENT STATUS</span><strong>{shipmentStatus}</strong></div>
                <div><span>DELIVERY ATTEMPT</span><strong>{attemptNumber} of {maximumAttempts}</strong></div>
            </div>

            {lastFailedAttempt && (
                <section className="sl-parcel-slip-attempt-note">
                    <strong>PREVIOUS DELIVERY ATTEMPT</strong>
                    <span>
                        {lastFailedAttempt.created_at
                            ? new Date(lastFailedAttempt.created_at).toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                            })
                            : "Date not recorded"}
                        {lastFailedAttempt.reason ? ` · ${lastFailedAttempt.reason}` : ""}
                    </span>
                </section>
            )}

            <div className="sl-parcel-slip-parties">
                <section className="sl-parcel-ship-to">
                    <h2>SHIP TO</h2>
                    <strong>{address.recipient || buyerName}</strong>
                    <span>{address.contact ? `Contact: ${address.contact}` : `Buyer phone: ${order.buyer?.phone || "Not provided"}`}</span>
                    {address.label && <span className="sl-parcel-address-type">{address.label} address</span>}
                    <p className="sl-parcel-address-lines">{address.addressLines.length ? address.addressLines.map((line, index) => <span className="sl-parcel-address-line" key={`${line}-${index}`}>{line}</span>) : "Delivery address not provided"}</p>
                </section>
                <section className="sl-parcel-ship-from">
                    <h2>SHIP FROM</h2>
                    <strong>{sellerName}</strong>
                    {order.seller?.phone && <span>{order.seller.phone}</span>}
                </section>
            </div>

            <section className="sl-parcel-slip-items">
                <div className="sl-parcel-slip-items-title">
                    <h2>PARCEL CONTENTS</h2>
                    <span>{(order.items || []).length} line{(order.items || []).length === 1 ? "" : "s"} · {totalQuantity} unit{totalQuantity === 1 ? "" : "s"}</span>
                </div>
                <div className="sl-parcel-slip-items-head"><span>ITEM / VARIANT</span><span>QTY</span></div>
                {(order.items || []).map((item) => (
                    <div className="sl-parcel-slip-item" key={item.id}>
                        <span>
                            <strong>{item.product?.name || "Product"}</strong>
                            {item.variant_label && <small>{item.variant_label}</small>}
                        </span>
                        <strong>{item.quantity}</strong>
                    </div>
                ))}
            </section>

            <section className={`sl-parcel-slip-payment${isCashOnDelivery ? " sl-parcel-slip-payment--cod" : ""}`}>
                <div><span>PAYMENT</span><strong>{isCashOnDelivery ? "Cash on Delivery" : order.payment_method === "gcash" ? "GCash" : "Online payment"}</strong></div>
                {isCashOnDelivery && <div className="sl-parcel-slip-cod"><span>COLLECT FROM BUYER</span><strong>₱{codAmount}</strong></div>}
            </section>

            <div className="sl-parcel-slip-code">
                <div className="sl-parcel-slip-qr">
                    {parcelCode && <ParcelQrCode value={parcelCode} label={`QR code for parcel ${parcelCode}`} size={112} />}
                    <div><span>PARCEL ID</span><strong>{parcelCode || `ORDER-${order.id}`}</strong></div>
                </div>
                <div className="sl-parcel-slip-barcode">
                    <Code39 value={order.id} />
                    <span>ORDER #{order.id}</span>
                </div>
            </div>
        </section>
    );
}

export default ParcelSlip;
