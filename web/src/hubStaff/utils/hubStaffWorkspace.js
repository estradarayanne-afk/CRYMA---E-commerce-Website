const HUB_EVENT_LABELS = {
    transfer_hub_released: "Hub Staff released parcel to the assigned Rider",
    rider_transfer_collected: "Assigned Rider confirmed collection",
    hub_transfer_departed: "Transfer departed the origin hub",
    hub_transfer_arrived: "Transfer received at the destination hub",
    sorting_center_received: "Parcel received at hub",
    legacy_sorting_receipt_verified: "Legacy parcel receipt verified",
    parcel_scanned: "Parcel scanned at hub",
    sorted: "Parcel sorted",
};

export class HubAssignmentChangedError extends Error {
    constructor() {
        super("The assigned hub changed. Refreshing access details.");
        this.name = "HubAssignmentChangedError";
    }
}

export function parseHubAssignmentResponse(payload) {
    const hub = payload?.data?.hub;
    if (payload?.success !== true || !hub || hub.id == null || !hub.name || !hub.code) {
        throw new Error("The assigned-hub response is unavailable or incomplete.");
    }
    return { id: hub.id, name: hub.name, code: hub.code };
}

export function parseHubStaffPageResponse(payload, expectedHubId) {
    const page = payload?.data;
    const hub = payload?.hub;
    if (payload?.success !== true || !hub?.id || !page || !Array.isArray(page.data)) {
        throw new Error("The Hub Staff operations response is invalid.");
    }
    if (String(hub.id) !== String(expectedHubId)) throw new HubAssignmentChangedError();

    const currentPage = Number(page.current_page);
    const lastPage = Number(page.last_page);
    const perPage = Number(page.per_page);
    const total = Number(page.total);
    if (![currentPage, lastPage, perPage, total].every(Number.isFinite)) {
        throw new Error("The Hub Staff pagination response is invalid.");
    }

    return {
        hub: { id: hub.id, name: hub.name, code: hub.code },
        rows: page.data,
        pagination: { currentPage, lastPage, perPage, total },
        counts: payload.counts ?? null,
    };
}

export function hubStaffQuery(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (key === "hub_id") continue;
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            query.set(key, String(value).trim());
        }
    }
    return query.size ? `?${query.toString()}` : "";
}

export function hubStaffEventLabel(eventType) {
    if (HUB_EVENT_LABELS[eventType]) return HUB_EVENT_LABELS[eventType];
    const readable = String(eventType ?? "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    if (!readable) return "Unspecified activity";
    return readable.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function hubStaffEventTone(eventType) {
    if (["transfer_hub_released", "rider_transfer_collected", "hub_transfer_departed", "hub_transfer_arrived"].includes(eventType)) return "transfer";
    if (eventType === "sorted") return "complete";
    if (eventType === "parcel_scanned" || eventType === "sorting_center_received") return "active";
    return "neutral";
}

export function hubStaffErrorMessage(error) {
    return error?.response?.data?.message || error?.message || "The Hub Staff service is unavailable. Try again.";
}

export function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
}

export function responseMessage(error, fallback = "The Hub Staff operation could not be completed.") {
    const validation = Object.values(error?.response?.data?.errors ?? {}).flat()[0];
    return validation || error?.response?.data?.message || error?.message || fallback;
}

export function parcelCodeMatches(enteredCode, expectedCode) {
    return typeof enteredCode === "string"
        && typeof expectedCode === "string"
        && enteredCode.trim().toUpperCase() === expectedCode.trim().toUpperCase();
}

export function hubTransferProgress(transfer) {
    if (transfer?.status === "in_transit") return "In transit";
    if (transfer?.status === "arrived") return "Arrived";
    if (transfer?.status === "assigned" && transfer?.hub_released_at) return "Awaiting Rider collection confirmation";
    if (transfer?.status === "assigned") return "Awaiting Hub Staff release";
    return String(transfer?.status ?? "Unknown").replaceAll("_", " ");
}

export function canDispatchReturnTransfer(transfer, base) {
    return base === "/logistics"
        && transfer?.return_shipment_id != null
        && transfer?.delivery_id == null
        && transfer?.status === "assigned";
}

export function createSingleFlightGuard() {
    let pending = false;
    return {
        tryAcquire() {
            if (pending) return false;
            pending = true;
            return true;
        },
        release() {
            pending = false;
        },
    };
}

export function createLatestRequestGuard() {
    let sequence = 0;
    return {
        begin() {
            sequence += 1;
            return sequence;
        },
        isCurrent(requestId) {
            return requestId === sequence;
        },
        invalidate() {
            sequence += 1;
        },
    };
}

export function pickupReceiptPayload(lookup) {
    return { order_id: lookup.order_id, parcel_code: lookup.parcel_code };
}

export function parcelScanPayload(parcelCode, expectedStatus) {
    return { parcel_code: parcelCode, expected_status: expectedStatus };
}

export function parcelCodePayload(parcelCode) {
    return { parcel_code: parcelCode };
}

export function canSortHubParcel(parcel, scannedParcelCode) {
    return parcel?.status === "AT_SORTING_CENTER"
        && parcelCodeMatches(parcel?.parcel_code, scannedParcelCode);
}
