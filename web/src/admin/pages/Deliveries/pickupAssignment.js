export function preparePickupAssignment({
    selectedCourierId,
    existingCourierProfileId,
    scheduledAt,
    reason = "",
    includeExpectedCourierId = false,
    selectionMessage = "Select an eligible pickup rider.",
    scheduleMessage = "Choose a pickup date and time.",
}) {
    const courierProfileId = Number(selectedCourierId ?? existingCourierProfileId);
    if (!Number.isInteger(courierProfileId) || courierProfileId <= 0) {
        return { error: selectionMessage };
    }
    if (!scheduledAt) return { error: scheduleMessage };

    const normalizedReason = String(reason || "").trim();
    const hasExistingCourier =
        existingCourierProfileId !== null &&
        existingCourierProfileId !== undefined &&
        existingCourierProfileId !== "";
    if (
        hasExistingCourier &&
        Number(existingCourierProfileId) !== courierProfileId &&
        !normalizedReason
    ) {
        return { error: "Enter a reason to change the pickup rider." };
    }

    const payload = { courier_profile_id: courierProfileId, scheduled_at: scheduledAt };
    if (includeExpectedCourierId) {
        payload.expected_courier_profile_id = existingCourierProfileId ?? null;
    } else if (hasExistingCourier) {
        payload.expected_courier_profile_id = Number(existingCourierProfileId);
    }
    if (normalizedReason) payload.reason = normalizedReason;
    return { payload };
}
