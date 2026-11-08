import api from "../shared/services/api";
import {
    parseHubAssignmentResponse,
    parseHubStaffPageResponse,
    hubStaffQuery,
} from "./utils/hubStaffWorkspace";

export async function getHubStaffAssignment() {
    const { data } = await api.get("/hub-staff/assignment");
    return parseHubAssignmentResponse(data);
}

async function getPage(path, params, hubId) {
    const { data } = await api.get(`${path}${hubStaffQuery(params)}`);
    return parseHubStaffPageResponse(data, hubId);
}

export const getHubStaffParcels = (params, hubId) => getPage("/hub-staff/parcels", params, hubId);
export const getHubStaffIncomingTransfers = (params, hubId) => getPage("/hub-staff/incoming-transfers", params, hubId);
export const getHubStaffOutgoingTransfers = (params, hubId) => getPage("/hub-staff/outgoing-transfers", params, hubId);
export const getHubStaffActivity = (params, hubId) => getPage("/hub-staff/activity", params, hubId);

function unwrapResponse(payload) {
    if (payload?.success !== true || !payload.data) {
        throw new Error(payload?.message || "The Hub Staff operation response is invalid.");
    }
    return payload.data;
}

export async function lookupIncomingPickup(parcelCode) {
    const { data } = await api.post("/hub-staff/incoming-pickups/lookup", { parcel_code: parcelCode });
    return unwrapResponse(data);
}

export async function receiveIncomingPickup(payload) {
    const { data } = await api.post("/hub-staff/receipts", payload);
    return unwrapResponse(data);
}

export async function scanHubParcel(payload) {
    const { data } = await api.post("/hub-staff/parcels/scan", payload);
    return unwrapResponse(data);
}

export async function sortHubParcel(parcelCode, payload) {
    const { data } = await api.patch("/hub-staff/parcels/" + encodeURIComponent(parcelCode) + "/sort", payload);
    return unwrapResponse(data);
}

export async function receiveIncomingTransfer(id, payload) {
    const { data } = await api.patch("/hub-staff/transfers/" + id + "/receive", payload);
    return unwrapResponse(data);
}

export async function releaseOutgoingTransfer(id, payload) {
    const { data } = await api.post("/hub-staff/transfers/" + id + "/release", payload);
    return unwrapResponse(data);
}

export async function getDirectDeliveryNotices(params, hubId) {
    const { data } = await api.get(`/hub-staff/direct-deliveries${hubStaffQuery(params)}`);
    return data;
}
