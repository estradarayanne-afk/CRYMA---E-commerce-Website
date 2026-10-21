import { getCode39Barcode } from "../utils/code39";
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

    return (
        <section className="sl-parcel-slip" aria-label={`CRYMA parcel slip for order ${order.id}`}>
            <header className="sl-parcel-slip-header">
                <div>
                    <p>CRYMA MARKETPLACE</p>
                    <h1>PARCEL SLIP</h1>
                </div>
                <strong>ORDER #{order.id}</strong>
            </header>

            <div className="sl-parcel-slip-parties">
                <section>
                    <h2>SHIP FROM</h2>
                    <strong>{sellerName}</strong>
                    {order.seller?.name && order.seller.name !== sellerName && <span>{order.seller.name}</span>}
                    <span>{order.seller?.phone || "Seller phone not provided"}</span>
                    <span>{order.seller?.email || "Seller email not provided"}</span>
                </section>
                <section>
                    <h2>SHIP TO</h2>
                    <strong>{buyerName}</strong>
                    <span>{order.buyer?.phone || "Buyer phone not provided"}</span>
                    <p>{order.delivery_address || "Delivery address not provided"}</p>
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
