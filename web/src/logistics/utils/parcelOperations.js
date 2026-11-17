export function buildPickupDecisionPayload(decision, reason = "") {
    if (decision === "accepted") return { decision: "accepted" };
    if (decision !== "rejected") throw new Error("Choose an accepted or rejected pickup decision.");
    const normalizedReason = String(reason || "").trim();
    if (!normalizedReason) throw new Error("A reason is required to reject this pickup request.");
    return { decision: "rejected", reason: normalizedReason };
}

export function getFuturePickupSchedule(value, now = new Date()) {
    const scheduledAt = value ? new Date(value) : null;
    if (scheduledAt && !Number.isNaN(scheduledAt.getTime()) && scheduledAt > now) {
        return scheduledAt;
    }
    return new Date(now.getTime() + 30 * 60 * 1000);
}

export function buildThirdPartyShipmentPayload({
    deliveryIds,
    fromHubId,
    toHubId,
    carrierCode,
    carrierName,
    trackingReference,
    shipmentReference,
}) {
    const payload = {
        delivery_ids: deliveryIds.map(Number),
        from_hub_id: Number(fromHubId),
        to_hub_id: Number(toHubId),
        carrier_code: carrierCode,
        carrier_name: String(carrierName).trim(),
        tracking_reference: String(trackingReference).trim(),
    };
    const reference = String(shipmentReference || "").trim();
    if (reference) payload.shipment_reference = reference;
    return payload;
}

export function groupThirdPartyShipments(transfers) {
    const groups = new Map();
    (Array.isArray(transfers) ? transfers : []).forEach((transfer) => {
        if (transfer.transport_mode !== "third_party" || !transfer.shipment_reference) return;
        const rows = groups.get(transfer.shipment_reference) || [];
        rows.push(transfer);
        groups.set(transfer.shipment_reference, rows);
    });
    return [...groups.entries()].map(([shipmentReference, items]) => ({
        shipmentReference,
        items,
    }));
}

export function buildThirdPartyReceivePayload(transfers, verifiedParcelCodes) {
    return {
        items: transfers.map((transfer) => ({
            transfer_id: Number(transfer.id),
            parcel_code: String(verifiedParcelCodes[transfer.id] || "")
                .trim()
                .toUpperCase(),
        })),
    };
}

export function parcelCodeMatches(expectedCode, candidate) {
    return (
        typeof expectedCode === "string" &&
        typeof candidate === "string" &&
        expectedCode.trim().toUpperCase() === candidate.trim().toUpperCase()
    );
}

export function getTransferableDeliveries(deliveries, originHubId) {
    if (!originHubId || !Array.isArray(deliveries)) return [];
    return deliveries.filter(
        (delivery) =>
            delivery.requires_transfer === true &&
            Number(delivery.current_hub_id) === Number(originHubId)
    );
}
