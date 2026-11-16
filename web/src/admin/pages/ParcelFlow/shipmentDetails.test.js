import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCompleteHubShipment } from "./shipmentDetails.js";

test("normalizes the complete item set and shipment metadata for the receipt flow", () => {
    const shipment = normalizeCompleteHubShipment({
        shipment_reference: "SHP-1",
        carrier_code: "flash_express",
        carrier_name: "Flash Express",
        tracking_reference: "TRACK-1",
        origin_hub: { id: 1, name: "Hub A", code: "A" },
        destination_hub: { id: 2, name: "Hub B", code: "B" },
        total_items: 1,
        items: [{ transfer_id: 7, delivery_id: 12, parcel_code: "PCL-12", status: "in_transit" }],
    });

    assert.equal(shipment.items.length, shipment.total_items);
    assert.equal(shipment.items[0].id, 7);
    assert.deepEqual(shipment.items[0].delivery, { id: 12, parcel_code: "PCL-12" });
    assert.deepEqual(shipment.items[0].from_hub, { id: 1, name: "Hub A", code: "A" });
    assert.deepEqual(shipment.items[0].to_hub, { id: 2, name: "Hub B", code: "B" });
    assert.equal(shipment.items[0].tracking_reference, "TRACK-1");
});

test("rejects incomplete or malformed shipment detail responses", () => {
    assert.throws(() => normalizeCompleteHubShipment({ total_items: 2, items: [{ transfer_id: 1 }] }), /complete shipment item list/i);
    assert.throws(() => normalizeCompleteHubShipment({ total_items: 0 }), /complete shipment item list/i);
});
