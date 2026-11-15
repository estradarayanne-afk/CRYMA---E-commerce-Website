import test from "node:test";
import assert from "node:assert/strict";
import { recommendCouriersForDelivery, sortCouriersByHubDistance } from "./courierProximity.js";

test("ranks fresh hub distances nearest-first and retains riders without live locations", () => {
    const couriers = [
        { id: 4, hub_proximity: { 12: { state: "stale", distance_km: null } } },
        { id: 3, hub_proximity: { 12: { state: "far", distance_km: 3.2 } } },
        { id: 2, hub_proximity: { 12: { state: "nearby", distance_km: 1.1 } } },
        { id: 1 },
    ];

    const ranked = sortCouriersByHubDistance(couriers, 12);

    assert.deepEqual(ranked.map((courier) => courier.id), [2, 3, 1, 4]);
    assert.deepEqual(couriers.map((courier) => courier.id), [4, 3, 2, 1]);
});

test("preserves courier order when no hub is selected", () => {
    const couriers = [{ id: 2 }, { id: 1 }];

    assert.equal(sortCouriersByHubDistance(couriers, null), couriers);
});

test("recommends available couriers with lighter workloads before using hub distance", () => {
    const couriers = [
        { id: 1, is_available: false, active_delivery_count: 0, hub_proximity: { 12: { distance_km: 0.5 } } },
        { id: 2, is_available: true, active_delivery_count: 3, hub_proximity: { 12: { distance_km: 1 } } },
        { id: 3, is_available: true, active_delivery_count: 1, hub_proximity: { 12: { distance_km: 3 } } },
        { id: 4, is_available: true, active_delivery_count: 1, hub_proximity: { 12: { distance_km: 0.2 } } },
    ];

    assert.deepEqual(recommendCouriersForDelivery(couriers, 12).map((courier) => courier.id), [4, 3, 2, 1]);
});
