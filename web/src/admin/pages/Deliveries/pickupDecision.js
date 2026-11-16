const ASSIGNABLE_PICKUP_STATUSES = [
    "ACCEPTED_BY_LOGISTICS",
    "ASSIGNED_TO_PICKUP_RIDER",
    "ACCEPTED_BY_PICKUP_RIDER",
];

export const canAssignPickup = (row) =>
    !row.picked_up_at && ASSIGNABLE_PICKUP_STATUSES.includes(row.status);

export const needsPickupDecision = (row) =>
    !row.picked_up_at && row.status === "PICKUP_REQUESTED";

export const buildPickupDecisionPayload = (decision, reason = "") => {
    if (decision === "accepted") return { decision };
    if (decision === "rejected" && typeof reason === "string" && reason.trim()) {
        return { decision, reason: reason.trim() };
    }
    return null;
};
