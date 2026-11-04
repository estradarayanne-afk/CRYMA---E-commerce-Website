# CRYMA Phase 2C1 — Hub Staff Provisioning Foundation

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Backend implementation. No Web workspace, Flutter project, production database, environment file, or package dependency was changed.  
**Branch/HEAD:** `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Summary

Implemented the backend foundation for a dedicated `hub_staff` role, a single-hub assignment, Admin provisioning, and explicitly authorized Logistics provisioning. The public registration role allowlist remains unchanged and rejects `hub_staff`. Hub Staff has no global Logistics route access and this phase does not add dashboard or parcel-operation APIs.

The existing uncommitted Phase 1B–1F work and other prior changes were preserved. This phase did not stage or commit changes.

## 2. Role, assignment, and audit schema

New migration: `backend/database/migrations/2026_11_04_000001_add_hub_staff_role_and_assignment.php`.

- Adds `hub_staff` to the existing role values without removing Admin, Seller, Buyer, Rider, or Logistics.
- Creates `hub_staff_profiles` with a unique `user_id`, required `hub_id` FK, assignment actor, and assignment timestamp. The unique user key enforces at most one assignment per account; provisioning validates an active hub and checks it again under lock.
- Adds an opt-in `can_manage_hub_staff` capability to `logistics_profiles`, default false, with the latest grant/revoke actor and timestamps.
- Creates `hub_staff_audit_events` to preserve every staff creation, reassignment, suspension, and Logistics capability grant/revoke with actor and relevant hub IDs.
- Migration rollback refuses to remove the role while Hub Staff accounts exist and refuses to discard audit history.

`User`, `LogisticsHub`, and `LogisticsProfile` now expose or store the associated relationships/capability. New models are `HubStaffProfile` and `HubStaffAuditEvent`.

### Database compatibility

The project config declares SQLite, MySQL, MariaDB, PostgreSQL, and SQL Server connections. Role changes use Laravel schema alteration on SQLite/MySQL/MariaDB. PostgreSQL and SQL Server paths explicitly replace the role check constraint while preserving the existing allowed values plus `hub_staff`. The full feature suite exercised migration creation on SQLite. The other database engines were reviewed against the installed Laravel schema grammars but were not runtime-tested because those database services are not available in this task. No production migration was run.

Existing `deliveries.current_hub_id`, `delivery_areas.hub_id`, `return_shipments.current_hub_id`, and `hub_transfers` remain the parcel custody source of truth; no parcel-hub join table was added.

## 3. Authorization and account lifecycle

- Public `POST /api/register` still accepts only buyer, seller, rider, and logistics. `hub_staff` is explicitly rejected by validation.
- Admin can create, view, reassign, list, and suspend Hub Staff through Admin-only routes.
- Logistics can use the same staff-management operations only when an Admin has explicitly granted the capability. Capability is false by default. The Logistics manager middleware also requires an active Logistics account through the existing route middleware stack.
- Only Admin can grant or revoke the capability. The controller verifies the target is a Logistics account with a Logistics profile; granting requires the target account to be active and not archived. Logistics cannot access those Admin endpoints.
- New Hub Staff accounts are created active, email-verified, password-hashed, and assigned to one active hub in one transaction. This is controlled provisioning, not public signup.
- Suspension uses the existing `status` lifecycle, revokes Sanctum tokens, and writes an audit event. The existing Admin status endpoint can reactivate provisioned accounts; Hub Staff does not require public applicant documents.
- `EnsureAssignedActiveHub` fails closed for a non-active account, wrong role, missing profile/hub, or inactive assigned hub. It is applied to `GET /api/hub-staff/assignment`. Future parcel-operation endpoints should use this resolver/middleware and must derive authorization from the authenticated assignment, not client `hub_id` input.
- `EnsureHubStaffProvisioningCapability` protects the Logistics provisioning routes. Both middleware aliases are registered in `backend/bootstrap/app.php`.
- The Admin generic user update endpoint remains unable to grant Hub Staff or elevate a Hub Staff user into Logistics. Hub Staff provisioning is not part of its role-edit flow.

## 4. API contract

All routes are under existing Sanctum authentication and active-account middleware.

| Method and path | Authority | Action |
|---|---|---|
| `GET /api/admin/hub-staff` | Admin | List Hub Staff accounts and assignments. |
| `POST /api/admin/hub-staff` | Admin | Create active account and assign active hub. |
| `GET /api/admin/hub-staff/{id}` | Admin | View account, assignment, and audit events. |
| `PATCH /api/admin/hub-staff/{id}/hub` | Admin | Reassign to an active hub and record history. |
| `PATCH /api/admin/hub-staff/{id}/suspend` | Admin | Suspend account, revoke tokens, and record history. |
| `PUT /api/admin/logistics-users/{id}/hub-staff-capability` | Admin | Grant opt-in capability to an active Logistics account. |
| `DELETE /api/admin/logistics-users/{id}/hub-staff-capability` | Admin | Revoke capability and record history. |
| `GET /api/logistics/hub-staff` | Active, capability-authorized Logistics | List Hub Staff accounts. |
| `POST /api/logistics/hub-staff` | Active, capability-authorized Logistics | Create and assign Hub Staff. |
| `GET /api/logistics/hub-staff/{id}` | Active, capability-authorized Logistics | View account, assignment, and audit events. |
| `PATCH /api/logistics/hub-staff/{id}/hub` | Active, capability-authorized Logistics | Reassign to an active hub. |
| `PATCH /api/logistics/hub-staff/{id}/suspend` | Active, capability-authorized Logistics | Suspend and revoke tokens. |
| `GET /api/hub-staff/assignment` | Active Hub Staff with active assignment | Return only the authenticated user's assigned hub identity. |

Provisioning responses serialize an explicit account allowlist; password hashes, tokens, and document details are not returned.

## 5. Files changed in this phase

Modified:

- `backend/app/Http/Controllers/Admin/RegistrationController.php` — Hub Staff appears in Admin user management and uses existing activation checks without public-applicant documents.
- `backend/app/Models/User.php` — Hub Staff profile relationship.
- `backend/app/Models/LogisticsHub.php` — Hub Staff profile relationship.
- `backend/app/Models/LogisticsProfile.php` — capability fields and casts.
- `backend/bootstrap/app.php` — middleware aliases.
- `backend/routes/api.php` — protected provisioning, capability, and assignment routes.

Added:

- `backend/app/Http/Controllers/Admin/HubStaffProvisioningController.php`
- `backend/app/Http/Middleware/EnsureAssignedActiveHub.php`
- `backend/app/Http/Middleware/EnsureHubStaffProvisioningCapability.php`
- `backend/app/Models/HubStaffAuditEvent.php`
- `backend/app/Models/HubStaffProfile.php`
- `backend/database/migrations/2026_11_04_000001_add_hub_staff_role_and_assignment.php`
- `backend/tests/Feature/HubStaffProvisioningTest.php`
- `docs/PHASE_2C1_IMPLEMENTATION_REPORT.md` (this report)

Several modified files above also contained pre-existing uncommitted work; this phase preserved those changes and added only the Hub Staff-related edits described here. No Web, Flutter, dependency, environment, or production database file was changed.

## 6. Verification

| Check | Result |
|---|---|
| Focused `php artisan test --filter=HubStaffProvisioningTest` | **Pass:** 11 tests, 72 assertions. |
| Full `php artisan test --do-not-cache-result` | **Pass:** 200 tests, 1,598 assertions. PHPUnit uses SQLite `:memory:`. |
| PHP syntax (`app`, `routes`, `database`) | **Pass:** 179 PHP files. |
| New feature test syntax | **Pass.** |
| `php artisan route:list --path=hub-staff` | **Pass:** 13 expected routes registered. |
| `git diff --check` | **Pass:** no whitespace errors. Git printed line-ending normalization warnings for existing edited files. |
| Production migration / seeder | **Not run.** |
| Browser verification | **Not run; no Hub Staff UI was built in this phase.** |

Coverage includes public registration rejection, password hashing/response privacy, Admin provisioning and account lifecycle, authorized vs. ordinary Logistics, Admin-only capability grants/revokes, audit records, active/inactive/missing assignment checks, nonexistent/inactive hub rejection, unique profile enforcement, and separation from existing Logistics/Admin and Seller/Buyer/Rider authorization.

## 7. Repository preservation and limitations

The branch and HEAD remain `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`; no staged changes were present. Existing Phase 1B–1F source/test/report changes remain in the working tree. The only additional files from Phase 2C1 are the seven backend files and this report listed above.

The implementation intentionally stops before Hub Staff dashboard, parcel receiving/sorting, outbound handoff, or Web account-management UI. The existing global Logistics operations remain unchanged. Before Phase 2D, add scoped parcel operations and cross-hub authorization tests; do not reuse global Logistics data endpoints for Hub Staff.

