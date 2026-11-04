# CRYMA Phase 2D2 — Two-Step Outgoing Hub-to-Rider Handoff

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Backend implementation and isolated test verification. No production/local application database migration was run. No dependency, Flutter/mobile, or Web workspace changes were made.  
**Branch/HEAD:** `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Existing lifecycle found

Before this phase, Logistics created a forward `hub_transfers` row in `assigned` state and assigned a courier profile. Either of two existing routes could then change it directly to `in_transit`: Logistics `PATCH /api/logistics/hub-transfers/{id}/dispatch` and the assigned Rider’s `PATCH /api/courier/hub-transfers/{id}` with `status=in_transit`. The Logistics controller shared both paths through `markTransferInTransit`; it checked assignment state and parcel custody but had no Hub Staff release or Rider collection confirmation.

The same dispatch helper also handled return transfers. Destination receipt for forward deliveries was already QR-verified through the Phase 2D1 receiving service. `delivery_events` already supports actor and event-time hub fields from Phase 2D1.

## 2. Persistence and audit history

Migration `2026_11_04_000003_add_two_step_hub_transfer_confirmations.php` adds nullable fields to `hub_transfers`:

- `hub_released_by`, `hub_released_hub_id`, and `hub_released_at` identify the Hub Staff actor, origin hub, and release time.
- `rider_collected_by` and `rider_collected_at` identify the Rider user and confirmation time.

The migration is additive, has foreign keys, and adds an origin/release-time index. It does not backfill confirmations for legacy transfers. Its rollback refuses to discard any recorded confirmation history. `HubTransfer` exposes casts and actor/hub relationships for these fields.

The workflow records three distinct delivery events, each with actor and origin-hub context: `transfer_hub_released`, `rider_transfer_collected`, and `hub_transfer_departed`. The existing Phase 2D1 `hub_transfer_arrived` event records destination receipt. Release, collection, departure, and their events are committed in transactions; Rider collection and the transition to `in_transit` occur atomically.

## 3. New endpoints and authorization

### Hub Staff physical release

`POST /api/hub-staff/transfers/{id}/release` requires Sanctum authentication, exact `hub_staff` role, an active account, and the existing assigned-active-hub middleware. The service resolves and locks the staff assignment, then verifies:

- transfer is a forward delivery transfer in `assigned` state;
- transfer origin equals the authenticated staff member’s active assigned hub;
- a Rider is assigned and remains eligible under the existing `CourierEligibility` rules;
- supplied parcel code matches the transfer’s delivery, whose custody and order/delivery state still match the origin and transferable state.

The request cannot choose origin, destination, or courier profile. A valid release records the Hub Staff actor, origin hub, timestamp, and event but leaves transfer status `assigned`. Repeated release attempts return conflict and cannot replace the original actor/time.

### Assigned Rider collection confirmation

`POST /api/courier/hub-transfers/{id}/confirm-collection` is inside the existing authenticated, active Rider route group. It also rechecks the current user row and `CourierEligibility`, requires the rider’s own courier profile to be the transfer’s assigned profile, requires a valid matching Hub Staff release, and validates the parcel code and origin custody. Hub/destination/courier reassignment inputs are prohibited.

On success, the service stores the Rider actor and confirmation timestamp, records the collection event, marks the transfer `in_transit`, sets `departed_at`, and records departure, all in the same transaction. A wrong Rider, pre-release attempt, invalid QR, duplicate, cancelled/departed transfer, or invalid parcel state is rejected without partially updating the transfer.

## 4. Dispatch gate and legacy compatibility

Every application code path found that transitions a transfer to `in_transit` now uses `HubTransferHandoffService`:

- Logistics dispatch at `PATCH /api/logistics/hub-transfers/{id}/dispatch`.
- The existing Rider status update at `PATCH /api/courier/hub-transfers/{id}`.
- The new assigned-Rider collection endpoint.

For forward deliveries, the shared gate requires both confirmation actor/time pairs, a release hub matching `from_hub_id`, a matching release event, and a Rider collection actor matching the assigned courier profile’s user plus a matching collection event. The old Logistics and Rider status-update routes cannot create either confirmation and therefore cannot bypass the gate. The normal successful flow transitions at the new Rider confirmation endpoint; subsequent dispatch attempts are rejected because the transfer is already in transit.

Return transfers remain outside this forward-delivery gate and continue through their existing Logistics/Rider dispatch behavior. Existing legacy transfers already in `in_transit` or `arrived` retain their recorded state and remain receivable; no confirmation fields or actors are fabricated. New dispatch attempts for legacy `assigned` forward transfers without confirmations are rejected. Phase 2D1 destination QR receipt remains unchanged.

## 5. Tests and compatibility corrections

Added `HubTransferHandoffTest` with an end-to-end Logistics-created transfer flow through Hub Staff release, assigned Rider collection, departure, and destination QR receipt. It also covers cross-hub staff denial, missing/inactive staff assignment, ineligible or unrelated Riders, inactive Rider account, invalid QR, prohibited hub/courier payloads, dispatch before both confirmations, duplicate actions, cancellation, stable original actor/timestamp, and unchanged return-transfer dispatch.

Updated existing `LogisticsHubManagementTest` expectations to reflect the approved two-confirmation rule. Its historical in-transit fixture remains a legacy transfer with no fabricated confirmation fields and continues to test destination receipt. A newly assigned forward transfer is no longer allowed to dispatch directly.

## 6. Exact files changed for Phase 2D2

### Added

- `backend/app/Services/HubTransferHandoffService.php`
- `backend/database/migrations/2026_11_04_000003_add_two_step_hub_transfer_confirmations.php`
- `backend/tests/Feature/HubTransferHandoffTest.php`
- `docs/PHASE_2D2_IMPLEMENTATION_REPORT.md`

### Modified

- `backend/app/Http/Controllers/Logistics/HubStaffParcelOperationsController.php` — origin-hub release endpoint.
- `backend/app/Http/Controllers/Logistics/ParcelFlowController.php` — Rider confirmation endpoint and shared gated dispatch call for existing routes.
- `backend/app/Models/HubTransfer.php` — confirmation fields, timestamp casts, and relationships.
- `backend/routes/api.php` — protected Hub Staff release and Rider collection routes.
- `backend/tests/Feature/LogisticsHubManagementTest.php` — legacy receipt and gated-dispatch expectations.

No previous phase report or implementation was overwritten. The repository already had extensive uncommitted work; all of it remains unstaged and uncommitted.

## 7. Verification

| Check | Result |
|---|---|
| Focused handoff plus existing transfer/destination-receipt regressions | **Pass:** 9 tests, 218 assertions. |
| Complete Laravel suite, `php artisan test --do-not-cache-result` | **Pass:** 213 tests, 1,828 assertions. PHPUnit uses SQLite `:memory:`. |
| PHP syntax (`app`, `routes`, `database`, and `tests`) | **Pass:** 218 PHP files. |
| Route inspection | **Pass:** `route:list --path=hub-staff` shows 24 related routes including the release route; `route:list --path=courier/hub-transfers` shows the existing list/status routes and new collection route. |
| `git diff --check` | **Pass:** no whitespace errors. Git emitted existing CRLF/LF normalization warnings for unrelated, previously edited files. |
| Migration runtime | SQLite migration exercised by the isolated feature suite. MySQL, MariaDB, PostgreSQL, and SQL Server were not runtime-tested. |
| Browser/mobile verification | **Not run.** |

## 8. Safety and remaining limitations

Branch and HEAD remain `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`. No files were staged or committed. No application database or production database was migrated or changed; no seeder or dependency operation was run. Flutter projects, the Hub Staff Web workspace, and Rider mobile source were untouched.

The feature tests verify sequential duplicate requests and state integrity but do not run simultaneous multi-connection races. Database row-lock behavior therefore still requires verification on the actual deployment database engine. The forward dispatch gate is application-enforced through the shared service; direct database writes outside the application are outside this API control.

The existing Logistics Web interface was not changed in this backend-only phase. If it still presents a dispatch action for forward transfers, the API now returns a conflict until both confirmations are present; update that interface in its separately scoped Web phase.

This phase stops after Phase 2D2. No Hub Staff Web interface or other later phase was started.
