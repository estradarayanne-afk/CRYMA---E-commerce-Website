# CRYMA Phase 2D1 — Hub-Scoped Parcel Operations

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Backend implementation and isolated test verification. No production migration, local application-database mutation, dependency update, Flutter/mobile edit, or browser verification was performed.  
**Branch/HEAD:** `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Summary

Implemented dedicated Hub Staff APIs for scoped parcel visibility, pickup QR lookup and receipt, destination transfer receipt, hub scan, sorting, and hub activity history. Hub Staff authorization resolves the active assigned hub on the server for every request; submitted hub IDs are rejected on Hub Staff writes and relevant reads. Existing Logistics and Admin routes remain under their existing role groups.

The implementation reuses the current parcel transitions through shared services. During regression verification, two compatibility issues in the shared paths were found and corrected: Logistics assignment events now record the post-sort `SORTED` state, and the Logistics transfer API retains its established 422 response for an incorrect destination while Hub Staff receives a non-disclosing 404.

## 2. API surface and authorization

All Hub Staff routes require Sanctum authentication, the exact `hub_staff` role, and the `assigned-active-hub` middleware. The resolver independently verifies active account status, the profile assignment, and active hub status. Controller queries are scoped by the server-resolved hub before serialization or mutation.

| Method and path | Purpose and scope |
|---|---|
| `GET /api/hub-staff/parcels` | Paginated current-hub parcels in sorting-center or sorted status; local counts and incoming forward-transfer count. Supports status/code filters; rejects `hub_id`. |
| `POST /api/hub-staff/incoming-pickups/lookup` | Exact QR/code lookup for a picked-up parcel eligible for initial receipt; returns only the assigned receiving hub and minimal parcel state. |
| `POST /api/hub-staff/receipts` | Initial pickup receipt. QR must identify the parcel belonging to the submitted order; server derives destination from staff assignment. |
| `GET /api/hub-staff/incoming-transfers` | Paginated in-transit forward transfers addressed to the assigned hub; return shipments are excluded. |
| `PATCH /api/hub-staff/transfers/{id}/receive` | QR-verified receipt only when the transfer destination is the assigned hub. |
| `POST /api/hub-staff/parcels/scan` | Record one scan event for a parcel currently at the assigned hub and in an expected state. Repeated scans are idempotent. |
| `PATCH /api/hub-staff/parcels/{parcelCode}/sort` | Sort an eligible scanned parcel at the assigned hub. Hub, area, and courier assignment inputs are prohibited. |
| `GET /api/hub-staff/activity` | Paginated history filtered by `delivery_events.hub_id` for the assigned hub; `hub_id` filter is rejected. |

No Hub Staff route was added to the global Logistics route group. Transfers can only be received, not created or dispatched. The APIs do not grant hub/area management, rider assignment, global reports/dashboard access, returns, COD, refunds, commissions, or settlements. Serialization is limited to operational parcel/status/hub/actor fields and does not include buyer/seller addresses or financial details.

The pickup model does not persist an intended destination hub before initial receipt. Accordingly, initial pickup lookup is a targeted QR lookup rather than a broad hub queue. The receiving destination is the authenticated staff member’s assigned hub, matching the existing Logistics receipt contract; the present schema cannot independently prove an upstream destination-hub assignment for that pickup.

## 3. Shared transitions, validation, and concurrency

- `ParcelReceivingService` now handles initial pickup receipt for both Hub Staff and Logistics. It verifies order, delivery QR, pickup assignment state, picked-up timestamp, lack of prior receipt, and absence of existing hub custody, then updates assignment, delivery, and order inside one transaction and writes the actor and hub on the receipt event.
- `HubTransferReceivingService` handles forward-delivery transfer receipt for Hub Staff and Logistics. It checks transfer state, QR-to-transfer parcel identity, destination, source custody, and order/delivery state before atomically marking arrival, moving custody, and recording a hub event. Hub Staff’s destination comes from their assignment; Logistics retains its request-selected destination behavior and response semantics. Return-transfer behavior remains on its existing Logistics path.
- `ParcelSortingService` shares the status transition for Admin/Logistics and Hub Staff. Hub Staff additionally requires a scan event at the current hub and verifies an existing delivery-area assignment is active and mapped to that hub. The Hub Staff operation never chooses an area or assigns a courier.
- Mutations use transactions and row locks. The scan/sort paths resolve the assigned user/profile/hub, identify the scoped parcel, lock the order before the delivery, then re-check current hub and status under lock. Duplicate receipt and out-of-order transitions are rejected; repeated scan is idempotent. Transfer receipt locks the transfer and parcel state before transition.

Focused feature tests cover sequential duplicate/replay rejection and failed-operation non-mutation. SQLite in-memory tests do not exercise simultaneous multi-connection races, so production-engine lock behavior still needs deployment-database verification.

## 4. Hub activity and historical backfill

Migration `2026_11_04_000002_add_hub_context_to_delivery_events.php` adds nullable `delivery_events.hub_id`, a foreign key to `logistics_hubs` with `nullOnDelete`, and a `(hub_id, created_at)` index. New initial-receipt, transfer-departure/arrival, scan, and sort events set `hub_id` explicitly at event time and retain the authenticated actor where the operation has one. Other existing event types remain nullable and are not assigned a hub implicitly.

`HubDeliveryEventBackfill` is idempotent and conservative:

- Transfer departure/arrival events are attributed from the referenced transfer’s source/destination only when the event reason contains that exact transfer reference.
- Initial receipt/legacy receipt/scan/sort events are attributed from current custody only when the delivery has no transfer history, so a later hub move cannot be mistaken for the historical hub.
- Uncertain hub events remain null. Non-hub events are not backfilled.

No dry-run or backfill was run against the local application database. The synthetic test fixture proves that the service attributes 3 provable events (2 transfer events and 1 initial receipt), leaves 1 uncertain hub event unknown, and makes no further changes on a second run. These are test-fixture counts, not counts for existing project data. The migration logs its actual counts when it is run in a separately authorized environment.

## 5. Phase 2C1 account verification correction

Review found that the original provisioning implementation set `email_verified_at` immediately, without proving control of the address. Provisioning now creates the account as pending and unverified, sends the existing registration OTP email, and leaves it pending if mail delivery fails so the existing resend flow can be used. The existing email verification endpoint establishes verification. Admin or explicitly capability-authorized Logistics can then activate the account, but activation requires verified email, a non-archived account, and a locked active hub assignment. The public registration allowlist remains unchanged and does not accept `hub_staff`.

## 6. Files changed for Phase 2D1

### Added

- `backend/app/Http/Controllers/Logistics/HubStaffParcelOperationsController.php`
- `backend/app/Services/HubDeliveryEventBackfill.php`
- `backend/app/Services/HubStaffHubResolver.php`
- `backend/app/Services/HubTransferReceivingService.php`
- `backend/app/Services/ParcelReceivingService.php`
- `backend/app/Services/ParcelSortingService.php`
- `backend/database/migrations/2026_11_04_000002_add_hub_context_to_delivery_events.php`
- `backend/tests/Feature/HubStaffParcelOperationsTest.php`
- `docs/PHASE_2D1_IMPLEMENTATION_REPORT.md`

### Modified or extended

- `backend/app/Http/Controllers/Admin/LogisticsController.php` — shared sorting transition, event-time hub context, and preserved sorted-to-assignment event semantics.
- `backend/app/Http/Controllers/Admin/HubStaffProvisioningController.php` — OTP verification and locked activation/reassignment checks; this was an untracked Phase 2C1 file before this phase.
- `backend/app/Http/Controllers/Logistics/ParcelFlowController.php` — shared forward transfer receipt path and source-hub attribution on departure.
- `backend/app/Http/Controllers/Logistics/ParcelOperationsController.php` — shared initial pickup receipt path.
- `backend/app/Http/Middleware/EnsureAssignedActiveHub.php` — delegates to the centralized assigned-active-hub resolver.
- `backend/app/Models/DeliveryEvent.php` — hub relationship and fillable event-time hub field.
- `backend/routes/api.php` — dedicated Hub Staff operation routes, separate from global Logistics routes.
- `backend/tests/Feature/HubStaffProvisioningTest.php` — verifies pending/unverified provisioning, OTP verification, activation, and lifecycle.

Files in the modified list already contained substantial uncommitted work from earlier phases. The current working tree also contains the earlier Phase 1B–1F and Phase 2C1 changes; this phase preserved them and did not stage or commit anything.

## 7. Verification

| Check | Result |
|---|---|
| Focused Hub Staff parcel/provisioning and Logistics regression tests, including the two corrected compatibility cases | **Pass:** 28 tests, 266 assertions. |
| Complete Laravel suite, `php artisan test --do-not-cache-result` | **Pass:** 209 tests, 1,699 assertions. Test configuration uses SQLite `:memory:`. |
| PHP syntax (`app`, `routes`, `database`, and `tests`) | **Pass:** 215 PHP files. |
| Route inspection, `php artisan route:list --path=hub-staff` | **Pass:** 23 related routes registered, including existing provisioning/assignment routes. |
| `git diff --check` | **Pass:** no whitespace errors; Git emitted existing CRLF/LF normalization warnings only. |
| Migration/runtime compatibility | SQLite migration path exercised by the test suite. MySQL, MariaDB, PostgreSQL, and SQL Server were not runtime-tested because those services were not available. The new event migration uses Laravel’s additive nullable FK/index APIs; the Phase 2C1 role migration has explicit PostgreSQL/SQL Server check-constraint handling and SQLite/MySQL/MariaDB enum alteration. |
| Production/local application database migration or backfill | **Not run.** |
| Browser verification | **Not run.** |

## 8. Repository and data preservation

Branch/HEAD remain `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`. No staged changes were present. Existing modified files and untracked Phase 1B–1F/2C1 work remained in the working tree; this report is the only new documentation file for this phase. `git diff --check` passed. No production or local application database mutation, migration, seeder, dependency change, Flutter/mobile change, Web workspace, or browser operation was performed.

## 9. Remaining limitations

- Initial pickup records do not have an intended hub assignment before receipt; the assigned staff hub is the receiving destination. If the business requires an upstream destination constraint, that needs an explicit pickup-to-hub data contract.
- Historical activity is incomplete wherever existing records cannot prove event-time hub identity. Those events remain unassigned.
- Multi-connection concurrency behavior and non-SQLite migration execution were not verified here.
- No Hub Staff Web workspace or outgoing transfer handoff was implemented. This phase stops before Phase 2D2 and Phase 2E.
