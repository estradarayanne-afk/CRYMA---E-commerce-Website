const distanceFromHub = (courier, hubId) => {
    if (hubId == null) return null;
    const distance = courier.hub_proximity?.[String(hubId)]?.distance_km;
    return typeof distance === "number" && Number.isFinite(distance) ? distance : null;
};

export function sortCouriersByHubDistance(couriers, hubId) {
    if (hubId == null) return couriers;

    return [...couriers].sort((first, second) => {
        const firstDistance = distanceFromHub(first, hubId);
        const secondDistance = distanceFromHub(second, hubId);
        if (firstDistance == null && secondDistance != null) return 1;
        if (firstDistance != null && secondDistance == null) return -1;
        if (firstDistance != null && secondDistance != null && firstDistance !== secondDistance) return firstDistance - secondDistance;
        return Number(first.id) - Number(second.id);
    });
}

export function recommendCouriersForDelivery(couriers, hubId) {
    const distanceRank = new Map(sortCouriersByHubDistance(couriers, hubId).map((courier, index) => [courier.id, index]));

    return [...couriers].sort((first, second) => {
        const availabilityDifference = Number(second.is_available === true) - Number(first.is_available === true);
        if (availabilityDifference) return availabilityDifference;

        const firstWorkload = Number.isFinite(Number(first.active_delivery_count)) ? Number(first.active_delivery_count) : 0;
        const secondWorkload = Number.isFinite(Number(second.active_delivery_count)) ? Number(second.active_delivery_count) : 0;
        if (firstWorkload !== secondWorkload) return firstWorkload - secondWorkload;

        return (distanceRank.get(first.id) ?? 0) - (distanceRank.get(second.id) ?? 0);
    });
}
