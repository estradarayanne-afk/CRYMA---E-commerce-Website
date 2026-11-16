import test from "node:test";
import assert from "node:assert/strict";
import { preparePickupAssignment } from "./pickupAssignment.js";

const scheduledAt = "2026-11-18T10:00";

test("single pickup assignment submits the selected existing courier by default", () => {
    const result = preparePickupAssignment({
        selectedCourierId: undefined,
        existingCourierProfileId: 42,
        scheduledAt,
        includeExpectedCourierId: true,
    });

    assert.deepEqual(result, {
        payload: {
            courier_profile_id: 42,
            scheduled_at: scheduledAt,
            expected_courier_profile_id: 42,
        },
    });
});

test("batch pickup assignment submits its preselected courier without requiring a change reason", () => {
    const result = preparePickupAssignment({
        selectedCourierId: undefined,
        existingCourierProfileId: 73,
        scheduledAt,
        selectionMessage: "Select an eligible pickup rider for the batch.",
        scheduleMessage: "Choose a pickup date and time for the batch.",
    });

    assert.deepEqual(result, {
        payload: {
            courier_profile_id: 73,
            scheduled_at: scheduledAt,
            expected_courier_profile_id: 73,
        },
    });
});

test("changing an existing pickup courier still requires a reason", () => {
    const result = preparePickupAssignment({
        selectedCourierId: "99",
        existingCourierProfileId: 42,
        scheduledAt,
    });

    assert.equal(result.error, "Enter a reason to change the pickup rider.");
});

test("pickup assignment retains validation for missing courier or schedule", () => {
    assert.equal(
        preparePickupAssignment({ scheduledAt }).error,
        "Select an eligible pickup rider."
    );
    assert.equal(
        preparePickupAssignment({ selectedCourierId: 42 }).error,
        "Choose a pickup date and time."
    );
});
