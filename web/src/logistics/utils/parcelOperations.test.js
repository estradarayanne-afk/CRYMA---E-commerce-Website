import test from "node:test";
import assert from "node:assert/strict";
import {
    buildPickupDecisionPayload,
    buildThirdPartyReceivePayload,
    buildThirdPartyShipmentPayload,
    groupThirdPartyShipments,
    parcelCodeMatches,
} from "./parcelOperations.js";

test("pickup decisions use the API payload and require a rejection reason", () => {
    assert.deepEqual(buildPickupDecisionPayload("accepted"), { decision: "accepted" });
    assert.deepEqual(buildPickupDecisionPayload("rejected", "  Seller unavailable  "), {
        decision: "rejected",
        reason: "Seller unavailable",
    });
    assert.throws(() => buildPickupDecisionPayload("rejected", "  "), /reason is required/);
});

test("bulk third-party transfer payload matches the backend field names", () => {
    assert.deepEqual(
        buildThirdPartyShipmentPayload({
            deliveryIds: ["11", "12"],
            fromHubId: "2",
            toHubId: "3",
            carrierCode: "flash_express",
            carrierName: " Flash Express ",
            trackingReference: " FX-123 ",
            shipmentReference: " CRYMA-123 ",
        }),
        {
            delivery_ids: [11, 12],
            from_hub_id: 2,
            to_hub_id: 3,
            carrier_code: "flash_express",
            carrier_name: "Flash Express",
            tracking_reference: "FX-123",
            shipment_reference: "CRYMA-123",
        }
    );
});

test("third-party shipment grouping excludes legacy transfers and preserves all items", () => {
    const grouped = groupThirdPartyShipments([
        { id: 1, shipment_reference: "S-1", transport_mode: "third_party" },
        { id: 2, shipment_reference: "S-1", transport_mode: "third_party" },
        { id: 3, shipment_reference: null, transport_mode: "third_party" },
        { id: 4, shipment_reference: "S-2", transport_mode: "courier" },
    ]);

    assert.deepEqual(grouped, [
        {
            shipmentReference: "S-1",
            items: [
                { id: 1, shipment_reference: "S-1", transport_mode: "third_party" },
                { id: 2, shipment_reference: "S-1", transport_mode: "third_party" },
            ],
        },
    ]);
});

test("bulk receive payload includes a verified parcel code for every transfer", () => {
    const payload = buildThirdPartyReceivePayload([{ id: 11 }, { id: 12 }], {
        11: " cryma-pcl-123 ",
        12: "CRYMA-PCL-456",
    });
    assert.deepEqual(payload, {
        items: [
            { transfer_id: 11, parcel_code: "CRYMA-PCL-123" },
            { transfer_id: 12, parcel_code: "CRYMA-PCL-456" },
        ],
    });
    assert.equal(parcelCodeMatches("CRYMA-PCL-123", " cryma-pcl-123 "), true);
    assert.equal(parcelCodeMatches("CRYMA-PCL-123", "CRYMA-PCL-999"), false);
});
