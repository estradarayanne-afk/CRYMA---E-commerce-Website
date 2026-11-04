import test from "node:test";
import assert from "node:assert/strict";
import {
    HubAssignmentChangedError,
    canSortHubParcel,
    canDispatchReturnTransfer,
    createSingleFlightGuard,
    createLatestRequestGuard,
    hubTransferProgress,
    hubStaffEventLabel,
    hubStaffQuery,
    parcelCodeMatches,
    parcelCodePayload,
    parcelScanPayload,
    pickupReceiptPayload,
    responseMessage,
    parseHubAssignmentResponse,
    parseHubStaffPageResponse,
} from "./hubStaffWorkspace.js";

test("parses the assignment response returned by the backend", () => {
    assert.deepEqual(parseHubAssignmentResponse({ success: true, data: { hub: { id: 7, name: "North Hub", code: "NH" } } }), { id: 7, name: "North Hub", code: "NH" });
    assert.throws(() => parseHubAssignmentResponse({ success: true, data: { hub: null } }), /assigned-hub response/);
});

test("parses paginator fields and server counts without trusting client hub state", () => {
    const parsed = parseHubStaffPageResponse({ success: true, hub: { id: 7, name: "North Hub", code: "NH" }, counts: { awaiting_sorting: 3 }, data: { data: [{ id: 4 }], current_page: 2, last_page: 4, per_page: 20, total: 71 } }, "7");
    assert.deepEqual(parsed.rows, [{ id: 4 }]);
    assert.deepEqual(parsed.pagination, { currentPage: 2, lastPage: 4, perPage: 20, total: 71 });
    assert.equal(parsed.counts.awaiting_sorting, 3);
});

test("fails closed when a response hub differs from the assigned hub", () => {
    assert.throws(() => parseHubStaffPageResponse({ success: true, hub: { id: 8 }, data: { data: [], current_page: 1, last_page: 1, per_page: 20, total: 0 } }, 7), HubAssignmentChangedError);
});

test("serializes filters without a hub override", () => {
    const query = hubStaffQuery({ status: "SORTED", parcel_code: " PCL 1 ", page: 2, hub_id: "must-not-be-sent" });
    assert.equal(query.includes("hub_id"), false);
    assert.equal(query, "?status=SORTED&parcel_code=PCL+1&page=2");
});

test("labels known handoff events and unknown legacy event types", () => {
    assert.equal(hubStaffEventLabel("transfer_hub_released"), "Hub Staff released parcel to the assigned Rider");
    assert.equal(hubStaffEventLabel("rider_transfer_collected"), "Assigned Rider confirmed collection");
    assert.equal(hubStaffEventLabel("future_legacy_event"), "Future Legacy Event");
    assert.equal(hubStaffEventLabel(null), "Unspecified activity");
});

test("lookup receipt payload uses only returned order and parcel identifiers", () => {
    assert.deepEqual(pickupReceiptPayload({ order_id: 14, parcel_code: "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST", receiving_hub: { id: 8 } }), { order_id: 14, parcel_code: "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST" });
    assert.deepEqual(parcelScanPayload("CRYMA-PCL-ABCDEFGHIJKLMNOPQRST", "AT_SORTING_CENTER"), { parcel_code: "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST", expected_status: "AT_SORTING_CENTER" });
});

test("parcel confirmation requires exact code and transfer state follows backend confirmations", () => {
    assert.equal(parcelCodeMatches(" cryma-pcl-ABCDEFGHIJKLMNOPQRST ", "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST"), true);
    assert.equal(parcelCodeMatches("CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA", "CRYMA-PCL-BBBBBBBBBBBBBBBBBBBB"), false);
    assert.equal(hubTransferProgress({ status: "assigned" }), "Awaiting Hub Staff release");
    assert.equal(hubTransferProgress({ status: "assigned", hub_released_at: "2026-11-04T01:00:00Z" }), "Awaiting Rider collection confirmation");
    assert.equal(hubTransferProgress({ status: "in_transit" }), "In transit");
});

test("scan confirmation cannot authorize sorting of a different or already sorted parcel", () => {
    const scanned = { parcel_code: "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST", status: "AT_SORTING_CENTER" };
    assert.equal(canSortHubParcel(scanned, scanned.parcel_code), true);
    assert.equal(canSortHubParcel(scanned, "CRYMA-PCL-AAAAAAAAAAAAAAAAAAAA"), false);
    assert.equal(canSortHubParcel({ ...scanned, status: "SORTED" }, scanned.parcel_code), false);
});

test("transfer action payload contains only parcel code and API errors prefer backend validation detail", () => {
    assert.deepEqual(parcelCodePayload("CRYMA-PCL-ABCDEFGHIJKLMNOPQRST"), { parcel_code: "CRYMA-PCL-ABCDEFGHIJKLMNOPQRST" });
    assert.equal(responseMessage({ response: { data: { errors: { parcel_code: ["Invalid parcel code."] }, message: "Validation failed." } } }), "Invalid parcel code.");
    assert.equal(responseMessage({ response: { data: { message: "Parcel is already received." } } }), "Parcel is already received.");
});

test("single-flight guard prevents duplicate mutation requests while one is pending", () => {
    const guard = createSingleFlightGuard();
    assert.equal(guard.tryAcquire(), true);
    assert.equal(guard.tryAcquire(), false);
    guard.release();
    assert.equal(guard.tryAcquire(), true);
    guard.release();
});

test("pickup lookup ignores stale responses after a newer code or input edit", () => {
    const requests = createLatestRequestGuard();
    const oldRequest = requests.begin();
    const newerRequest = requests.begin();
    assert.equal(requests.isCurrent(oldRequest), false);
    assert.equal(requests.isCurrent(newerRequest), true);
    requests.invalidate();
    assert.equal(requests.isCurrent(newerRequest), false);
});

test("Logistics dispatch UI remains available only for assigned return transfers", () => {
    assert.equal(canDispatchReturnTransfer({ return_shipment_id: 12, delivery_id: null, status: "assigned" }, "/logistics"), true);
    assert.equal(canDispatchReturnTransfer({ delivery_id: 12, return_shipment_id: null, status: "assigned" }, "/logistics"), false);
    assert.equal(canDispatchReturnTransfer({ return_shipment_id: 12, status: "assigned" }, "/admin"), false);
    assert.equal(canDispatchReturnTransfer({ return_shipment_id: 12, status: "in_transit" }, "/logistics"), false);
});
