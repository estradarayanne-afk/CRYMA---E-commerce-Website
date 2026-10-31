import { getCode39Barcode } from "../utils/code39";
import { parseDeliveryAddress } from "../../shared/utils/deliveryAddress";
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
    const buyerName = [
        order.buyer?.first_name,
        order.buyer?.middle_name,
        order.buyer?.last_name,
    ].filter(Boolean).join(" ") || "Buyer";
    const sellerName = order.seller?.business_name || order.seller?.name || "CRYMA Seller";
    const address = parseDeliveryAddress(order.delivery_address);

    return (
        <section className="sl-parcel-slip" aria-label={`CRYMA parcel slip for order ${order.id}`}>
            <header className="sl-parcel-slip-header">
                <div>
                    <p>CRYMA MARKETPLACE · SELLER COPY</p>
                    <h1>PACKING SLIP</h1>
                </div>
                <strong><small>ORDER NUMBER</small>#{order.id}</strong>
            </header>

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
                <h2>CONTENTS</h2>
                <div className="sl-parcel-slip-items-head"><span>ITEM</span><span>QTY</span></div>
                {(order.items || []).map((item) => (
                    <div className="sl-parcel-slip-item" key={item.id}>
                        <span>{item.product?.name || "Product"}</span>
                        <strong>{item.quantity}</strong>
                    </div>
                ))}
            </section>

            <div className="sl-parcel-slip-payment">
                <span>PAYMENT</span>
                <strong>{order.payment_method === "gcash" ? "GCash" : "Cash on Delivery"}</strong>
            </div>

            <div className="sl-parcel-slip-code">
                <Code39 value={order.id} />
                <strong>CRYMA ORDER #{order.id}</strong>
            </div>
            <footer>Internal CRYMA order reference only. Not a carrier-issued waybill.</footer>
        </section>
    );
}

export default ParcelSlip;
