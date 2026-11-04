# CRYMA Phase 2A — Hub Staff Architecture Audit

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Read-only architecture audit. No application source, tests, dependencies, database, migrations, environment files, or mobile projects were changed.  
**Baseline:** `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## Executive summary

CRYMA has a distinct `logistics` role and a distinct Logistics Web workspace, but no Hub Staff role, hub assignment for users, or Hub Staff workspace. Hubs are attached to delivery areas, deliveries, return shipments, and transfers. Existing Logistics users can operate across hubs; the relevant APIs accept hub identifiers from the request or return all-hub data. A Hub Staff workspace cannot safely reuse those endpoints by adding only a frontend role guard.

The current parcel model already supports hub custody, QR-verified initial receiving, sorting, and hub-to-hub transfer. The principal missing foundation is **who is assigned to which hub and how every staff read/write is constrained to that assignment**. A separate backend role, controlled account provisioning, an explicit user-to-hub assignment, and hub-scoped endpoints must precede the new Web workspace.

This audit recommends Hub Staff as a backend-provisioned, single-hub role, with no public self-registration. Logistics retains global hub/area configuration, cross-hub monitoring and transfer coordination, rider assignment, and global reports. Riders remain in their current Rider role and mobile implementation; no Rider Web expansion is proposed.

## A. Current architecture

### Authentication, roles, and account lifecycle

- `users.role` is a database enum/string, not a role/permission framework. The initial role list is `admin`, `seller`, `buyer`, and `rider`; migration `backend/database/migrations/2026_10_21_000004_add_logistics_role_and_profile_table.php` adds `logistics` and creates `logistics_profiles`.
- `backend/app/Http/Middleware/EnsureRole.php` performs an exact role comparison. `EnsureActiveAccount` independently requires `status === 'active'`. API route groups apply Sanctum authentication, active-account validation, and a role middleware. These backend checks are the authorization boundary.
- `backend/app/Http/Controllers/Api/RegistrationController.php` allows public registration as buyer, seller, rider, or logistics. Logistics applicants provide business details and documents; new accounts remain pending. `backend/app/Http/Controllers/Admin/RegistrationController.php` approves eligible pending registrations after email verification and required document approval.
- The admin user update endpoint does not currently allow changing a user into Logistics through ordinary profile editing. The Logistics role is expected to come through its approved applicant workflow. There is no equivalent Hub Staff provisioning or approval path.
- `web/src/shared/components/ProtectedRoute.jsx` uses the locally stored session role to redirect between role areas. This is a UI navigation guard and is not API authorization. The backend must enforce every Hub Staff restriction independently.

### Hub, parcel, and history data

- `logistics_hubs` stores name, code, address, and active state. `delivery_areas.hub_id` associates an area with a hub. `deliveries.current_hub_id` records the parcel's current hub. `return_shipments.current_hub_id` records a return's current hub.
- `hub_transfers` records source hub, destination hub, shipment, courier, assigning user, transfer state, timestamps, and note. These relationships support custody transitions without a new parcel-hub join table.
- `users` has no hub foreign key or hub-staff profile. `LogisticsProfile` has user identity/business fields but no hub assignment. `LogisticsHub` currently relates to current deliveries and inbound/outbound transfers.
- `delivery_events` records delivery, actor, event type, prior/new delivery status, courier changes, reason, and timestamp. It does not have a `hub_id`. Some receipt event text names a hub, but text is not a reliable foreign-key history for filtering or audit.
- Existing migrations seed a central hub, map existing areas to it, and associate certain sorting-state deliveries with it. No database inspection or migration execution was performed in this audit.

### Parcel workflow and current authorization

- `Logistics\ParcelOperationsController::confirmSortingReceipt` validates a parcel QR code against its order, pickup assignment, and statuses; inside a transaction it records the selected active `hub_id`, updates delivery/order/assignment state, and writes a receipt event. The API is Logistics-only. The hub comes from the request because Logistics is global; it is not derived from a staff assignment.
- `Admin\LogisticsController` provides the global pickup/operations queue, scan, resolve-and-scan, and sort-and-assign behavior. It validates parcel/order state and courier/area eligibility. Those actions are available to Admin and/or Logistics under their respective route groups.
- `Logistics\ParcelFlowController` provides all-hub operations data, hub and area management, transfers, return operations, and transfer receiving. Transfer creation checks current custody, active destination, shipment state, destination-area mapping for forward parcels, courier eligibility, duplicate active transfer prevention, and uses transactions/row locks. Transfer receipt validates an in-transit transfer and updates custody to its destination.
- `Logistics\DashboardController` aggregates global parcel counts, all hubs, all-hub transfers, recent events, and reports/export. Hub context shown for an old delivery event is derived from the delivery's **current** hub, not necessarily the hub where the event occurred.

### Web workspaces

- `web/src/App.jsx` mounts separate Admin, Buyer, Seller, Rider (`rider` role, `/courier`), and Logistics (`logistics` role, `/logistics`) route groups. There is no Hub Staff route group.
- `web/src/logistics/LogisticsLayout.jsx` owns Logistics navigation. Existing Logistics pages include dashboard, pickups, incoming parcels, sorting, parcel flow, delivery assignment/monitoring, reports, rider management, profile, and settings. This is the global operations workspace.
- `web/src/admin/pages/ParcelFlow/ParcelFlow.jsx` is shared by Admin and Logistics through a configurable base path. It includes broad parcel-flow/transfer functionality and the hub/area management UI. Sharing the visual component does not make its data safe for a one-hub user.
- `web/src/logistics/pages/ParcelOperations.jsx` is a useful interaction reference for operational queues and scanning. It invokes global pickup, incoming, sorting, delivery assignment/monitoring endpoints and uses the shared QR scanner.
- `web/src/shared/components/ParcelQrScanner.jsx` supports camera scanning and manual parcel-code entry. It is reusable UI; a scanned code is input, not proof of authorization.
- Existing logistics and hub-management screens contain loading, error, empty, success/notice, and confirmation states. They can inform new Hub Staff UX, but should not be copied together with global data access.

## B. Reusable components and likely modules

| Existing module | Reuse value | Boundary/limitation |
|---|---|---|
| `web/src/shared/components/ParcelQrScanner.jsx` | Camera and manual code capture. | Backend must bind the authenticated staff account to its hub and authorize the parcel operation; QR possession grants no access. |
| `web/src/logistics/pages/ParcelOperations.jsx` | Queue layout, scanner integration, operation feedback patterns. | Calls broad Logistics endpoints and mixes pickup/final-mile functions; use only as a UX reference or extract carefully after scoped APIs exist. |
| `web/src/admin/pages/ParcelFlow/ParcelFlow.jsx` | Parcel and transfer display patterns shared by Admin/Logistics. | Uses broad parcel-flow API and has global transfer/configuration operations; not a Hub Staff page as-is. |
| `web/src/admin/pages/ParcelFlow/HubAreaManagement.jsx` | Hub and area CRUD/mapping pattern for Logistics administrators. | Hub Staff must not gain hub creation, hub activation, or area remapping privileges. |
| `web/src/logistics/LogisticsLayout.jsx` | Layout/accessibility/sidebar conventions. | Create a separate Hub Staff layout and navigation; keep Logistics global routes isolated. |
| `web/src/shared/components/ProtectedRoute.jsx` | Add a role-home redirect and route guard for the Hub Staff UX. | Frontend-only; API middleware/authorization must be authoritative. |
| `backend/app/Models/Delivery.php`, `LogisticsHub.php`, `HubTransfer.php`, `ReturnShipment.php`, `DeliveryEvent.php` | Current custody, transfer, and audit entities. | Add explicit account assignment and authorization scopes; do not trust client-supplied hub IDs. |
| `backend/app/Http/Controllers/Logistics/ParcelOperationsController.php` | Existing QR-verified receiving state transition and transaction. | Add a Hub Staff-specific path that derives the assigned hub, then reuses a domain operation only after server authorization. |
| `backend/app/Http/Controllers/Logistics/ParcelFlowController.php` | Existing transfer state machine and validation. | Preserve global Logistics use; expose only narrowly scoped staff actions, if policy approves them. |
| `backend/app/Http/Controllers/Admin/LogisticsController.php` | Existing scanning/sorting/assignment validation. | Do not expose global queue, rider assignment, or cross-hub reads to Hub Staff. |

## C. Requirements: confirmed gaps vs. design recommendations

### Confirmed gaps in the current source

1. There is no `hub_staff` role in the user enum, public registration allowlist, admin registration lifecycle, middleware route groups, or frontend route map.
2. There is no user-to-hub assignment relationship. Current logistics profiles have no `hub_id`.
3. No hub-scoped Hub Staff API routes or controllers exist.
4. Current operational APIs are Logistics/Admin-only and global. They do not apply an authenticated user's assigned-hub constraint.
5. Initial receiving accepts a request `hub_id`; that is suitable for a global Logistics operator but insufficient for one-hub staff authorization.
6. The Logistics dashboard and report/export APIs aggregate across hubs. The parcel-flow API returns hub lists, all areas, transfers, returns, parcels, and eligible couriers across hubs. The Logistics operations queue also contains broad order/pickup data.
7. The Web app has no separate Hub Staff layout, routes, navigation, or page set.
8. Delivery-event history cannot be reliably grouped by the hub where each historical event occurred because `delivery_events` has no hub foreign key; current hub is mutable.
9. No evidence establishes that Hub Staff can or should perform cash, COD, refunds, seller settlement, final-mile assignment, or rider management. These should not be exposed by inference from existing Logistics screens.

### Recommendations requiring product confirmation

- Define whether Hub Staff may only receive/sort/hand parcels to a preassigned transfer courier, or may create/dispatch outbound transfers. The current transfer model assigns a courier at transfer creation; a hub operator role should not silently inherit cross-hub destination and rider-selection powers.
- Define which hub-scoped transfer information is visible to origin and destination staff and whether receipt must use QR plus transfer ID, parcel code, or both.
- Decide whether history must preserve the hub at event time. If yes, add structured hub context to events or a hub-operation record; do not parse the reason string.
- Decide whether returns are in the initial scope. Return shipments use a separate state model and currently share some global transfer APIs; they need explicit receive/dispatch rules.
- Keep Hub Staff provisioning Admin-only, with assignment changes audited and protected from self-service, unless a later product decision establishes a different authority.

## D. Security risks and required checks

No confirmed current role bypass was established by this architecture review: the existing Logistics endpoints require an active authenticated Logistics account, and Admin routes have their own role group. The following risks arise if Hub Staff is added without corresponding backend isolation.

| Risk | Affected current surface | Required control for Hub Staff |
|---|---|---|
| Cross-hub data disclosure | `GET /logistics/parcel-flow`, `/logistics/operations`, `/logistics/dashboard`, `/logistics/reports/export` | Never return these global serializers to Hub Staff. New queries must be scoped in SQL by the server-resolved assigned hub, including nested relations, counts, exports, and pagination. |
| Client-controlled hub assignment | `confirmSortingReceipt`, global return receipt, transfer receive/dispatch/create | Resolve hub assignment from authenticated user. Reject request hub IDs that conflict or omit them where server derivation is possible. For incoming transfer, require `to_hub_id` equals assigned hub; for origin handoff, require `from_hub_id` equals it. |
| IDOR via parcel/order/transfer IDs or QR codes | scan, resolve-and-scan, sort, receive, transfer IDs | Load target through a hub-scoped query and perform authorization again inside the transaction/row lock. Return consistent 404/403 behavior without disclosing cross-hub record details. |
| Privilege creep into global operations | hub CRUD, area mapping, courier-area membership, pickup assignment, rider management, delivery assignment, global reports | Do not mount these Logistics routes for Hub Staff. Define a dedicated allowlist of staff operations. |
| Sensitive data overexposure | global queue/parcel-flow nested buyer/seller, address, refund, and order data | Return minimal operational fields. Exclude customer addresses, refund amounts, finance, seller settlement, and unrelated courier/profile data unless a specific task requires them. |
| Incorrect historical hub attribution | `DashboardController` recent events uses `delivery.currentHub` | Store structured hub-at-event-time context before offering hub activity history or per-hub event reports. |
| Assignment changes without traceability | future admin provisioning/reassignment | Admin-only assignment with active-hub validation, transaction, audit event, and protection against account role/profile mismatch. |
| Inactive or unassigned account | `EnsureActiveAccount`; future hub-staff role | Require active account and valid active assigned hub on every Hub Staff request; fail closed if assignment is missing or hub is inactive. |

Required authorization tests should include cross-hub reads and writes (including guessed IDs and valid QR codes from another hub), unassigned staff, inactive account, inactive hub, transfer origin vs. destination, duplicate receipt, repeated/out-of-order actions, and concurrent duplicate scans. Existing Logistics and Admin behavior must remain covered separately.

## E. Database impact

**A schema change is required** for a dedicated role and its one-hub assignment under the current architecture.

- Add a `hub_staff` value to the `users.role` enum using a forward migration compatible with the repository's supported database engines. Existing enum alteration migrations show this repository uses enum changes, but portability and rollback with live accounts must be considered.
- Recommended additive `hub_staff_profiles` table: unique `user_id` FK, required `hub_id` FK, timestamps, and optional assignment metadata only if the product requires it. A unique user key encodes the intended single-hub assignment. Use an active hub when provisioning; do not rely on nullable `delivery_areas.hub_id` conventions.
- Add `User::hubStaffProfile()` and `LogisticsHub::hubStaffProfiles()` relationships plus a single authorization service/policy/helper that resolves an active assigned hub. Avoid duplicating ad hoc `where hub_id` checks across controllers.
- Public registration should not offer `hub_staff`. Provision or invite via a restricted Admin workflow, activate only under the approved account lifecycle, and record assignment/reassignment history.
- Existing `deliveries.current_hub_id`, `delivery_areas.hub_id`, `hub_transfers.from_hub_id/to_hub_id`, and `return_shipments.current_hub_id` already model current custody and transfer. No additional parcel-to-hub assignment is needed for the basic workflow.
- If hub-specific historical event reporting is required, add nullable `hub_id` to `delivery_events` (or a dedicated hub operation table) with a migration/backfill strategy. Backfill from event-time hub cannot be reliably inferred from current hub or free-text reason, so historical values may remain null/unknown.
- No database reads, writes, migration execution, or schema updates were performed for this audit.

## F. Dependency-aware implementation plan

### Phase 2B — Product rules and authorization/data design

- **Objective:** Confirm one-hub assignment, provisioning authority, supported operations, transfer handoff semantics, return scope, and event-history expectations.
- **Roles:** Admin, Logistics, proposed Hub Staff.
- **Likely modules:** `RegistrationController`, Admin registration/user management, `User`, `LogisticsHub`, `HubTransfer`, `DeliveryEvent`, role middleware, API routes.
- **Dependencies:** Product decisions above; supported database engines and migration constraints.
- **Risks:** Ambiguous role responsibilities can grant cross-hub or financial privileges accidentally.
- **Required tests:** A written permission matrix and endpoint allowlist; migration compatibility plan.
- **Completion:** Approved role lifecycle and operation matrix with no implicit Logistics inheritance.

### Phase 2C — Role, assignment, and controlled provisioning

- **Objective:** Add `hub_staff`, single-hub assignment, model relationship, active-hub validation, and Admin-controlled provisioning/reassignment with auditability. Exclude public signup.
- **Roles:** Admin, Hub Staff.
- **Likely modules:** additive migration under `backend/database/migrations`, `User`, `LogisticsHub`, dedicated profile model, `EnsureRole` route usage, Admin registration/user management/controller/request validation/tests.
- **Dependencies:** Phase 2B decisions.
- **Risks:** Existing database engine enum behavior, rollback after account creation, role/profile inconsistency, assigning inactive/deleted hubs.
- **Required tests:** Role allowlist; public signup rejects Hub Staff; Admin provisioning and reassignment; uniqueness; missing/inactive hub; account status; authorization denial.
- **Completion:** Every active Hub Staff account has exactly one valid assigned hub; no public self-registration path exists.

### Phase 2D — Hub-scoped backend access and parcel operations

- **Objective:** Build minimal hub-scoped queue, receipt, sorting, hub parcel history, and approved outgoing handoff APIs. Centralize authorization and scope SQL queries before serialization and mutation.
- **Roles:** Hub Staff; existing Logistics/Admin behavior retained.
- **Likely modules:** new Hub Staff controller/service/policy and request validators; `routes/api.php`; `ParcelOperationsController`, `ParcelFlowController`, `Admin\LogisticsController` only for reusable domain logic; event/history model/schema if approved.
- **Dependencies:** Phase 2C and approved operation matrix.
- **Risks:** IDOR, QR replay, concurrent scans, state/order mismatch, stale transfer custody, overbroad nested serialization, history misattribution.
- **Required tests:** Same-hub success; cross-hub denial for every read/write; unassigned/inactive user and hub; transfer source/destination rules; invalid/mismatched QR; duplicate and out-of-order receipt; transaction/concurrency behavior; existing Logistics/Admin regression.
- **Completion:** Hub Staff cannot access another hub by changing IDs, codes, filters, or request payloads; all state changes are atomic and auditable.

### Phase 2E — Separate Hub Staff Web workspace

- **Objective:** Add a separate Hub Staff layout, navigation, protected routes, dashboard, receiving/scan, current-hub parcels, sorting, and permitted handoff screens.
- **Roles:** Hub Staff; Admin/Logistics navigation unaffected.
- **Likely modules:** `web/src/App.jsx`, `ProtectedRoute.jsx`, a new Hub Staff layout/pages, shared scanner, shared API client, small reusable UI pieces.
- **Dependencies:** Stable scoped API contracts from Phase 2D.
- **Risks:** Mistaking client role guards for authorization; stale queues after scans; scanner cleanup/manual fallback; accidental reuse of global Logistics page/API calls.
- **Required tests:** Role redirect/deep links, loading/error/empty/success states, stale-response and repeated-submit handling, scanner/manual code flow, API contract tests, direct URL authorization; browser checks.
- **Completion:** Separate `/hub-staff` workspace (or approved path), with no global Logistics pages or data endpoints exposed.

### Phase 2F — Security, workflow, and regression verification

- **Objective:** Verify complete receiving-to-sorting-to-outbound-handoff workflow and preserve global operations.
- **Roles:** Hub Staff, Logistics, Admin; rider mobile contract unchanged.
- **Likely modules:** Hub Staff backend/web tests, existing `LogisticsOperationsTest.php`, dashboard/report tests, API route checks, browser regression documentation.
- **Dependencies:** Phases 2C–2E.
- **Risks:** Regression to Logistics transfer coordination, event semantics, or mobile APIs.
- **Required tests:** Full backend suite; frontend lint/tests/build; cross-hub authorization matrix; browser workflow with non-production test data; confirm Flutter trees untouched.
- **Completion:** Approved acceptance criteria pass; Admin/Logistics global permissions still work; Hub Staff isolation is proven; no Rider Web scope has been added.

## G. Repository safety and audit limits

At audit start, branch/HEAD were `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`, with no staged changes. The pre-existing modified files were:

```text
backend/app/Http/Controllers/Admin/LogisticsController.php
backend/app/Http/Controllers/Courier/DeliveryController.php
backend/app/Http/Controllers/Courier/PickupController.php
backend/app/Http/Controllers/Logistics/DashboardController.php
backend/app/Http/Controllers/Logistics/ParcelFlowController.php
backend/app/Http/Controllers/Logistics/ParcelOperationsController.php
backend/app/Models/Delivery.php
backend/app/Models/HubTransfer.php
backend/app/Models/LogisticsHub.php
backend/routes/api.php
backend/tests/Feature/AdminVoucherManagementTest.php
backend/tests/Feature/BuyerSellerChatTest.php
backend/tests/Feature/BuyerVoucherCheckoutTest.php
backend/tests/Feature/DeliveryProofTest.php
backend/tests/Feature/DeliveryWorkflowTest.php
backend/tests/Feature/LogisticsOperationsTest.php
backend/tests/Feature/SellerProductInventoryTest.php
web/package-lock.json
web/src/App.jsx
web/src/admin/pages/Commission/Commission.jsx
web/src/admin/pages/Dashboard/Dashboard.jsx
web/src/admin/pages/Deliveries/Deliveries.jsx
web/src/admin/pages/ParcelFlow/ParcelFlow.jsx
web/src/admin/pages/SellerCompliance/SellerCompliance.jsx
web/src/auth/pages/DocumentCorrection.jsx
web/src/buyer/components/BuyerSellerChatWidget/BuyerSellerChatWidget.jsx
web/src/buyer/pages/Cart/Cart.jsx
web/src/buyer/pages/Categories/Categories.jsx
web/src/buyer/pages/Orders/Orders.jsx
web/src/buyer/pages/Storefront.jsx
web/src/courier/pages/ParcelFlow.jsx
web/src/logistics/pages/Dashboard.jsx
web/src/logistics/pages/ParcelOperations.jsx
web/src/seller/pages/Chat.jsx
web/src/seller/pages/Inventory.jsx
web/src/shared/components/ParcelQrScanner.jsx
```

Pre-existing untracked paths included backend tests `LogisticsDashboardReportsTest.php` and `LogisticsHubManagementTest.php`, the `docs/` directory with earlier phase reports, and Web hub/report additions under `web/src/admin/pages/ParcelFlow/`, `web/src/logistics/`, and `web/src/logistics/utils/`. All were treated as user-owned and preserved.

This report is the only file intentionally created by Phase 2A. Git branch, HEAD, and status were rechecked after writing; no application, test, dependency, database, environment, or Flutter file was changed. No tests or migrations were run because this phase is an architecture audit and the working tree contains broad in-progress user changes. Findings describe the inspected source, including those existing uncommitted Phase 1D/1E modules; this audit does not claim those changes are committed or validated.

