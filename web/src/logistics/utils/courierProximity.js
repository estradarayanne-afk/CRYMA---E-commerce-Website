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
