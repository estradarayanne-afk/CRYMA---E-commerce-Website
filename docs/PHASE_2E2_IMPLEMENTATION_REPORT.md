# CRYMA Phase 2E2 — Hub Staff Operations UI and Logistics Transfer Integration

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Hub Staff operational Web UI plus one minimal Hub Staff-scoped read endpoint and Logistics transfer status integration. No dependency, Flutter/mobile, or application database changes were made.  
**Branch/HEAD:** `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Summary and API gap

The Phase 2E1 workspace had read-only parcel, incoming-transfer, and activity views. The backend already exposed the Hub Staff lookup, receive, scan, sort, incoming-transfer receipt, and physical-release actions. It did **not** expose a dedicated list of forward transfers that were still assigned at the authenticated staff member’s origin hub and awaiting physical release. The only existing transfer list was the global Logistics parcel-flow endpoint, which is not appropriate for Hub Staff.

Added `GET /api/hub-staff/outgoing-transfers`, protected by Sanctum, active-account, exact `hub_staff` role, and assigned-active-hub middleware. It derives the hub from the authenticated user, rejects `hub_id`, and paginates only forward transfers from that hub that remain assigned, unreleased, not collected, in eligible parcel custody, and have an eligible assigned Rider. Return transfers and other hubs are excluded. Its response contains only transfer state, origin/destination hub identity, parcel code/order ID/status, and the assigned Rider’s ID/name. It does not serialize addresses or financial data. No table or migration was added.

## 2. Hub Staff operations

The separate `/hub-staff` workspace now includes **Pickup receiving**, **Parcels**, **Incoming transfers**, and **Outgoing handoffs** navigation. Existing role protection and assignment loading remain in place. Operational requests use Hub Staff endpoints only; the frontend does not submit a selected hub ID. Each action has a single-flight guard, explicit confirmation where it changes custody/state, pending/disabled UI, and reports success only after the API returns a successful response. A 403 refreshes the assignment gate. Existing shared API handling clears expired sessions on 401.

### Pickup receiving

The camera/manual code capture calls `POST /api/hub-staff/incoming-pickups/lookup` with `{parcel_code}`. Lookup only validates and displays the backend’s `order_id`, `parcel_code`, `status`, `receiving_hub`, and `eligible_for_receipt`; it does not receive automatically. The page checks that the returned receiving hub is the current assignment, then asks for explicit physical-receipt confirmation. `POST /api/hub-staff/receipts` sends only `{order_id, parcel_code}`. The receipt success panel and activity refresh appear only after backend confirmation.

### Incoming forward transfers

The page uses the existing paginated `GET /api/hub-staff/incoming-transfers` response (`id`, status, departure time, origin hub, parcel) and `PATCH /api/hub-staff/transfers/{id}/receive` with `{parcel_code}`. The user selects a listed transfer, scans or types its code, sees a match confirmation and transfer summary, then explicitly confirms destination receipt. Destination is never submitted by the client. After confirmed receipt, the page refreshes the list and recent activity. The backend list excludes return shipments.

### Parcel scan and sorting

The Parcels page uses the existing scoped parcel list, with backend status/code filters and paginator metadata. A selected parcel’s scanned or typed code must match the row before the page calls `POST /api/hub-staff/parcels/scan` with `{parcel_code, expected_status}`. A scanner result by itself is not treated as a backend scan. Sorting is offered only after the scan endpoint confirms the same parcel in `AT_SORTING_CENTER`; the explicit confirmation calls `PATCH /api/hub-staff/parcels/{parcelCode}/sort` with `{expected_status:"AT_SORTING_CENTER"}`. No area or Rider selection is present. Confirmed operations refresh parcels and activity.

### Outgoing physical release

The new scoped outgoing list shows transfer, parcel/order reference, destination, and assigned Rider identity. The code must match the listed parcel before an explicit physical-release confirmation. `POST /api/hub-staff/transfers/{id}/release` sends only `{parcel_code}`. On backend success, the UI displays the backend transfer status, release time, and Rider-collection confirmation flag. The status remains `assigned`; release does not imply in-transit. The page does not expose dispatch or Rider collection confirmation. After success it refreshes outgoing transfers and activity.

All three scan-enabled flows reuse the existing lazy-loaded `ParcelQrScanner`, with its manual entry fallback and camera error/permission guidance. Camera text is only input to the separate backend action/confirmation; the scanner does not authorize or mutate a parcel by itself.

## 3. Logistics transfer integration

Updated `web/src/admin/pages/ParcelFlow/ParcelFlow.jsx`. The forward-transfer dispatch button and its call to the old Logistics dispatch endpoint are no longer rendered for forward transfers. The Logistics view identifies **Awaiting Hub Staff release**, **Awaiting Rider collection confirmation**, **In transit**, and **Arrived**. Hub Staff release and Rider collection actor/timestamp details are shown only when present in the response. Return-transfer dispatch remains available in the Logistics variant and keeps its existing backend path; Admin behavior is not expanded.

`ParcelFlowController::operations()` now eager-loads the release and collection users and emits the minimal display aliases `hub_release_actor` and `rider_collection_actor` (ID and first/last name), alongside the existing transfer fields `hub_released_at` and `rider_collected_at`. These are read-only serialization additions; no handoff rules or schema changed in this phase.

## 4. Files changed in Phase 2E2

### Backend

- Modified `backend/routes/api.php` — registers the scoped outgoing-transfer list under existing Hub Staff authorization middleware.
- Modified `backend/app/Http/Controllers/Logistics/HubStaffParcelOperationsController.php` — scoped, paginated outgoing-transfer query and minimal serializer.
- Modified `backend/app/Http/Controllers/Logistics/ParcelFlowController.php` — exposes the two handoff actor display aliases in Logistics operations data.
- Added `backend/tests/Feature/HubStaffOutgoingTransfersTest.php` — scope, eligibility, pagination/privacy, hub-filter rejection, denied access, and Logistics serialization coverage.

### Web

- Modified `web/src/App.jsx` — adds lazy Hub Staff pickup-receiving and outgoing-handoff routes.
- Modified `web/src/hubStaff/HubStaffLayout.jsx` — adds those pages to Hub Staff navigation.
- Modified `web/src/hubStaff/api.js` — adds scoped list and operation API wrappers.
- Modified `web/src/hubStaff/utils/hubStaffWorkspace.js` and `.test.js` — operation payload/state/error/single-flight helpers and focused helper tests.
- Added `web/src/hubStaff/useHubStaffMutation.js` and `useHubStaffRecentActivity.js` — shared guarded mutation/toast and post-success activity refresh behavior.
- Added `web/src/hubStaff/components/ParcelCodeCapture.jsx`, `HubStaffConfirmModal.jsx`, `HubStaffActions.css`, and `HubStaffActivityPreview.jsx`.
- Added `web/src/hubStaff/pages/PickupReceiving.jsx` and `OutgoingTransfers.jsx`.
- Modified `web/src/hubStaff/pages/Parcels.jsx` and `IncomingTransfers.jsx` — adds explicit scan/confirm/operation flows.
- Modified `web/src/admin/pages/ParcelFlow/ParcelFlow.jsx` — forward-transfer progress and return-only dispatch.

- Added `docs/PHASE_2E2_IMPLEMENTATION_REPORT.md`.

## 5. Verification

| Check | Result |
|---|---|
| Focused outgoing-list backend tests | **Pass:** 3 tests, 20 assertions. |
| Complete Laravel suite, `php artisan test --do-not-cache-result` | **Pass:** 216 tests, 1,848 assertions. PHPUnit uses its configured SQLite in-memory database. |
| Frontend tests, `npm test` | **Pass:** 63 tests, 0 failures. Added pure utility/contract tests for operation payloads, scan/sort eligibility, API error mapping, duplicate-request guard, transfer progress, and return-only dispatch. |
| ESLint, `npm run lint` | **Pass:** exit 0, no errors or warnings. |
| Production build | **Pass:** Vite transformed 2,097 modules; output at `%TEMP%\\cryma-phase2e2-build-final2`, outside the repository. Existing >500 kB warning remains: main JS 1,121.71 kB, Three.js 742.95 kB; main CSS 884.56 kB. Vite also notes external `outDir` is not emptied automatically. |
| PHP syntax | **Pass:** no syntax errors in the modified controller, routes, and new focused backend test. |
| Route inspection | **Pass:** `GET api/hub-staff/outgoing-transfers` is registered with Sanctum, active-account, `EnsureRole:hub_staff`, and `EnsureAssignedActiveHub` middleware. |
| `git diff --check` | **Pass:** no whitespace errors. Git emitted line-ending normalization warnings on pre-existing CRLF/LF files. |

The frontend test runner is Node’s built-in runner and does not render React components. Tests therefore cover pure role/API/state helpers and contracts rather than actual click/modal/camera rendering. No authenticated browser session or live Hub Staff API workflow was exercised. Camera permissions, viewport behavior, scanner hardware, and end-to-end backend integration remain unverified.

## 6. Preservation and remaining limits

The branch and HEAD remain `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`; nothing was staged or committed. The Phase 1B–1F, 2C1, 2D1, 2D2, and 2E1 working-tree changes and reports were preserved. No dependency manifest/lockfile, Flutter/mobile file, database file, migration, or local application database was changed in Phase 2E2. No migration or seeder was run. The full pre-existing uncommitted work remains visible in Git status.

The Logistics component requiring the Phase 2E2 correction was `web/src/admin/pages/ParcelFlow/ParcelFlow.jsx`, mounted for the Logistics Parcel Flow route under `/logistics/parcel-flow` (and shared with the Admin Parcel Flow route). It now keeps the dispatch action only for assigned return transfers.

This phase does not implement a Rider Web experience. Rider collection remains an independent Rider API action. The outgoing list is a snapshot: a transfer or Rider can become ineligible after list retrieval, so the release endpoint’s transactional checks remain authoritative and errors are shown without success UI.
