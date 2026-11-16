import assert from "node:assert/strict";
import test from "node:test";
import { buildPickupDecisionPayload, canAssignPickup, needsPickupDecision } from "./pickupDecision.js";

test("pickup assignment requires logistics acceptance and an uncollected item", () => {
    assert.equal(canAssignPickup({ status: "PICKUP_REQUESTED" }), false);
    assert.equal(canAssignPickup({ status: "ACCEPTED_BY_LOGISTICS" }), true);
    assert.equal(canAssignPickup({ status: "ASSIGNED_TO_PICKUP_RIDER" }), true);
    assert.equal(canAssignPickup({ status: "ACCEPTED_BY_PICKUP_RIDER" }), true);
    assert.equal(canAssignPickup({ status: "ACCEPTED_BY_LOGISTICS", picked_up_at: "2026-11-17T10:00:00Z" }), false);
});

test("only pending pickup requests need an explicit logistics decision", () => {
    assert.equal(needsPickupDecision({ status: "PICKUP_REQUESTED" }), true);
    assert.equal(needsPickupDecision({ status: "PICKUP_REQUESTED", picked_up_at: "2026-11-17T10:00:00Z" }), false);
    assert.equal(needsPickupDecision({ status: "REJECTED_BY_LOGISTICS" }), false);
});

test("rejection requires a reason while acceptance omits it", () => {
    assert.equal(buildPickupDecisionPayload("rejected", "  "), null);
    assert.deepEqual(buildPickupDecisionPayload("rejected", "  Address is incomplete  "), {
        decision: "rejected",
        reason: "Address is incomplete",
    });
    assert.deepEqual(buildPickupDecisionPayload("accepted"), { decision: "accepted" });
});
