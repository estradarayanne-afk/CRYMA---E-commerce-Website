export const normalizeCompleteHubShipment = (detail) => {
    if (!detail || !Array.isArray(detail.items) || Number(detail.total_items) !== detail.items.length) {
        throw new Error("The complete shipment item list could not be loaded.");
    }

    return {
        ...detail,
        items: detail.items.map((item) => ({
            ...item,
            id: Number(item.transfer_id),
            delivery: { id: item.delivery_id, parcel_code: item.parcel_code },
            from_hub: detail.origin_hub,
            to_hub: detail.destination_hub,
            carrier_code: detail.carrier_code,
            carrier_name: detail.carrier_name,
            tracking_reference: detail.tracking_reference,
        })),
    };
};
