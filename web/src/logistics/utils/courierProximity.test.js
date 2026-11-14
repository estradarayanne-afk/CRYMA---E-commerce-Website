import test from "node:test";
import assert from "node:assert/strict";
import { sortCouriersByHubDistance } from "./courierProximity.js";

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
