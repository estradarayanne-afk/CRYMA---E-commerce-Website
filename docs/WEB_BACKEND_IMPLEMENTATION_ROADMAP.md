# CRYMA Web + Backend Implementation Roadmap

**Basis:** `docs/WEB_BACKEND_BASELINE_AUDIT.md`, current source at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`. This is a proposed sequence, not authorization to execute future application changes. Keep both Flutter project trees untouched throughout these web/backend phases.

## Sequencing principles

- First restore a reproducible, understood baseline, because lint/build/tests currently fail.
- Establish role, status, signup, and ownership rules before changing money or fulfillment flows.
- Preserve transaction/idempotency and order snapshots while fixing test contracts.
- Complete buyer and seller flows before admin and logistics surfaces that depend on them.
- A separate Hub Operator or Courier Company role is a product/security decision; do not infer it from the current `logistics` or `rider` roles.
- Each phase should review the working tree and existing diffs first; never reset or overwrite unrelated work. This roadmap assumes the audit documents already exist and that future changes are specifically authorized.

## Phase 0 — Repository safety and reproducible baseline

**Objective:** Make repository provenance and checks reproducible before feature work.  
**Roles:** Engineering/maintainers; no end-user feature change.  
**Likely files/modules:** `.gitignore`, `backend/storage/certs/ca.pem` provenance/policy, `web/package.json` + lockfile/install environment, ESLint findings in `web/src`, `backend/tests/**`, CI workflows under `.github/`. Do not modify `.env`, local DB, upload files, or mobile trees.  
**Dependencies:** Audit review; package registry/network availability and CI runner configuration.  
**Risks:** A package install/lock update can change the dependency graph; test corrections can mask real contract defects; ignore cleanup can accidentally affect shared files.  
**Required tests:** `npm ci` only in an approved maintenance implementation turn; npm test/lint/build; PHP syntax; `php artisan test`; route:list; verify no generated/local secret files staged.  
**Completion criteria:** Clean reproducible web install; QR dependency resolves; lint is green or explicit accepted exceptions are documented; backend failures each classified and suite green; cert provenance disposition documented; no tracked application output/local secrets introduced.

## Phase 1 — Authentication, signup, roles, and permissions

**Objective:** Agree and enforce account lifecycle, role labels, approval and access policy across UI and API.  
**Roles:** Guest, Buyer, Seller, Admin, Logistics, Rider/Courier; Hub Operator and Courier Company explicitly out of scope until approved.  
**Likely files/modules:** `web/src/App.jsx`, `web/src/auth/**`, `web/src/shared/components/ProtectedRoute.jsx`; `backend/routes/api.php`, `AuthController`, `RegistrationController`, `EmailVerificationController`, `EnsureRole`, `EnsureActiveAccount`, `Admin/RegistrationController`, `Logistics/RiderManagementController`, user/profile migrations/models, registration/access feature tests.  
**Dependencies:** Phase 0; business decision for approval rules and any new role.  
**Risks:** Lockout/privilege escalation, role-label mismatch, changed legacy logins, applicant documents and email OTP delivery. Do not add a role without migration/backfill/access matrix.  
**Required tests:** Registration validation by role, OTP expiry/attempts, pending/active/suspended/archive access, role matrix API 401/403/ownership tests, admin approve/reject/correction, rider eligibility, frontend route redirect tests.  
**Completion criteria:** One documented lifecycle per role; frontend and backend guards agree; approval and status transitions tested; no Hub Operator/company role unless separately specified and approved.

## Phase 2 — Order and financial data consistency

**Objective:** Stabilize order snapshots, inventory, vouchers, cancellation/refunds, COD, commission and payout state machine.  
**Roles:** Buyer, Seller, Rider, Logistics, Admin/Finance.  
**Likely files/modules:** `BuyerOrderController`, `Seller/OrderController`, `OrderObserver`, `OrderDeliveryProjection`, `VoucherDiscount`, `Admin/OrderController`, `RefundRequestController`, `SettlementController`, `Courier/DeliveryController`, order/product/voucher/refund/delivery/COD/commission migrations/models, integrity and settlement tests.  
**Dependencies:** Phase 0 and Phase 1; finance decisions on refund funding and seller recovery.  
**Risks:** Stock duplication, voucher double-use, inconsistent state projection, concurrent checkout/refund, manual cash movement mismatch; schema changes require backup/forward migration and data reconciliation plan.  
**Required tests:** Idempotent concurrent checkout; stock/variant rollback; voucher claim/limit/race; cancellation state/stock restore; delivery completion; COD exact/short/over cash; open/refunded return gate; payout idempotency and refund after paid; decimal/cents boundaries.  
**Completion criteria:** State transition table agreed; every state mutation transactional and auditable; test contracts reflect approved behavior; no payout/remit status implies external money movement unless confirmed.

## Phase 3 — Buyer Web

**Objective:** Deliver a reliable guest-to-order buyer experience using the validated backend contract.  
**Roles:** Guest and Buyer.  
**Likely files/modules:** `web/src/buyer/**`, `web/src/shared/**`, `web/src/auth/**`; `Api/ProductController`, `Api/BuyerOrderController`, `BuyerVoucherController`, `ReviewController`, `AccountController`, buyer chat/refund controllers.  
**Dependencies:** Phases 0–2.  
**Risks:** Cart/browser state drift, address privacy, stale stock/prices, COD-only/multi-seller limits, mislabeled support/complaint actions.  
**Required tests:** Catalog/store/product guest access; cart variants and stock; checkout error/idempotency; address owner isolation; voucher claim/redeem; order timeline/cancel/receive/refund; responsive and keyboard/manual checkout.  
**Completion criteria:** End-to-end buyer flow accurately describes COD and one-seller constraints; errors recover cleanly; no buyer can access another account’s order/address/chat/proof.

## Phase 4 — Seller Web

**Objective:** Finish seller catalog, storefront, fulfillment handoff, buyer communication and finance-facing views.  
**Roles:** Seller, with buyer-visible catalog impacts.  
**Likely files/modules:** `web/src/seller/**`, seller layouts/components; `Seller/ProductController`, `StorefrontController`, `OrderController`, `VoucherController`, `EarningsController`, `ReportController`, chat/review/return APIs and models.  
**Dependencies:** Phases 0–3.  
**Risks:** Seller ownership boundaries, media storage/size limits, product compliance, status transitions and treating CRYMA parcel slip as a carrier waybill.  
**Required tests:** Seller-owned CRUD/media/variants/drafts; public visibility and compliance review; vacation mode; order status; pickup request; return receipt; reports/earnings reconciliation; seller chat isolation.  
**Completion criteria:** Seller can manage eligible listings and process own orders to pickup request; no courier assignment powers; financial amounts reconcile with approved order snapshots; carrier claims remain accurate.

## Phase 5 — Admin Web

**Objective:** Provide safe, consistent oversight for accounts, compliance, disputes, refunds, policy, finance and reporting.  
**Roles:** Admin.  
**Likely files/modules:** `web/src/admin/**`, `AdminLayout`; `Admin/RegistrationController`, `DocumentController`, `SellerComplianceController`, `ComplaintController`, `RefundRequestController`, `SettlementController`, `CommissionController`, `VoucherController`, `ReportController`, `PlatformSettingsController`.  
**Dependencies:** Phases 0–2; seller/buyer flows (3–4) for operational data.  
**Risks:** Broad admin authority, PII/document access, destructive status changes and manual settlement semantics.  
**Required tests:** Admin role required; decision/status transitions; document privacy; audit attribution; refund/commission/COD invariants; empty/large data pagination; UI confirmation for irreversible decisions.  
**Completion criteria:** Admin navigation maps to canonical APIs; finance and complaint decisions are traceable; sensitive documents are authorized and protected; aliases are retained only for documented compatibility.

## Phase 6 — Logistics Web

**Objective:** Make pickup, scanning, sorting, rider assignment, monitoring and return operations coherent across logistics and admin roles.  
**Roles:** Logistics, Admin, Rider.  
**Likely files/modules:** `web/src/logistics/**`, admin parcel flow, `web/src/courier/**`; `Admin/LogisticsController`, `Logistics/ParcelOperationsController`, `Logistics/ParcelFlowController`, `Logistics/RiderManagementController`, `Courier/PickupController`, delivery/proof controllers, delivery/pickup/hub/event/area migrations and tests.  
**Dependencies:** Phases 0–2 and seller pickup handoff in Phase 4.  
**Risks:** Duplicate admin/logistics endpoints, area eligibility, transition races, proof privacy, stale/legacy parcel records.  
**Required tests:** Assignment/area/document eligibility; scan idempotency; pickup scheduled/collected; hub receive/sort; transfer departure/arrival; final delivery/proof; failure/return; access matrix by actor.  
**Completion criteria:** One documented state machine and clear owner for each transition; duplicate paths are intentionally shared or consolidated with compatibility tests; buyer tracking projection matches operations events.

## Phase 7 — Hub Operator workflow (conditional)

**Objective:** Decide whether hub work remains part of Logistics or becomes a separately permissioned role; implement only after the role is approved.  
**Roles:** Logistics today; proposed Hub Operator only if authorized.  
**Likely files/modules:** `User` role/profile model and migration if approved; `EnsureRole`; registration/admin approval; `ParcelFlowController`, logistics routes, `web/src/logistics/**`, dedicated route/layout/permissions tests.  
**Dependencies:** Phase 1 role decision and Phase 6 state machine.  
**Risks:** Privilege expansion or lockout when splitting logistics permissions; historical user migration and multi-hub assignment.  
**Required tests:** Cross-role matrix; hub-scoped read/write isolation; transfer and receipt boundaries; legacy logistics compatibility; migration/backfill rehearsal on disposable copy.  
**Completion criteria:** Approved role definition and hub ownership model, least-privilege API/UI, backward-compatible migration plan, all scoped transition tests green. If not approved, document that existing Logistics role owns hub tasks and close without a new role.

## Phase 8 — Courier Company support (conditional)

**Objective:** Define whether organizations can manage multiple riders and assignments; do not build absent business behavior without approval.  
**Roles:** Proposed Courier Company / Company Manager plus Rider, Admin and Logistics.  
**Likely files/modules:** New company/profile/relationship schema, invite and approval flows, assignment/eligibility services, route guards, courier management UI, settlement and audit records. Exact files depend on approved design.  
**Dependencies:** Phase 1 approval; Phase 2 financial responsibility decisions; Phase 6 assignment model.  
**Risks:** Multi-tenant data leakage, rider ownership conflict, duplicate assignments, company liability/settlement and document privacy.  
**Required tests:** Company/rider tenant isolation, invite/revoke, approval/status, assignment eligibility, concurrent assignment, audit logs, company role access denial to unrelated operations.  
**Completion criteria:** Explicit approved operating model and least-privilege boundary; migration/backfill/recovery plan; company-scoped APIs/UI and comprehensive isolation tests. Otherwise mark unsupported and do not add code.

## Phase 9 — Web-wide regression and integration

**Objective:** Certify complete web/backend journeys after role-specific work.  
**Roles:** All supported roles.  
**Likely files/modules:** CI configuration, web tests, Laravel feature tests, browser test harness/docs, deployment environment documentation; no mobile files.  
**Dependencies:** Phases 0–6 and any approved conditional phase.  
**Risks:** Environment-only failures mistaken for application issues; test secrets/data leakage; unstable external SMTP/storage services.  
**Required tests:** `npm ci`, `npm test`, lint, production build; PHP syntax, full Laravel suite, route:list; browser journeys across buyer, seller, admin, logistics and rider; staging SMTP/storage/API integration; authorization matrix and financial reconciliation.  
**Completion criteria:** Green reproducible CI; critical journeys pass from guest signup through fulfillment and after-sale outcome; no unauthorized role access; deployment settings and operational scheduler/storage/email are verified; all residual limitations accepted and documented.

## Recommended next implementation phase

Start with **Phase 0: reproducible baseline triage**. First resolve why the locked QR package is absent from the installed dependency tree and triage all 19 ESLint errors and 24 Laravel test failures. This gives a trustworthy gate before any authentication, data-integrity, or user-facing implementation. No package installation, code fix, migration, or feature change is authorized by this audit document itself.
