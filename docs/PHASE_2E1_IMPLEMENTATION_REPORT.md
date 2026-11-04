# CRYMA Phase 2E1 — Hub Staff Web Workspace Foundation

**Date:** 2026-11-04 (Asia/Manila)  
**Mode:** Web-only implementation of role-protected, read-only Hub Staff operational views. No Laravel/backend, database, dependency, Flutter/mobile, or Logistics page changes were made.

## 1. Existing architecture and API contracts

The Web application uses React Router route groups and the shared ProtectedRoute. That guard reads the existing token and user from local storage, sends missing sessions to /login, and redirects authenticated users whose role does not exactly match the route group to their own role home. The shared Axios client attaches the bearer token and handles 401 by clearing the local session and redirecting to login. Hub Staff reuses both mechanisms; no new login or public registration flow was added.

The backend contract was inspected before implementation:

| Request | Response fields used |
|---|---|
| GET /api/hub-staff/assignment | success, data.hub.id, data.hub.name, data.hub.code |
| GET /api/hub-staff/parcels | success, top-level hub, top-level counts (parcels_at_hub, awaiting_sorting, sorted, incoming_transfers), and Laravel paginator in data with rows (id, order_id, parcel_code, status, delivery_area, sorted_at, updated_at) |
| GET /api/hub-staff/incoming-transfers | success, top-level hub, paginator rows (id, status, departed_at, origin_hub, parcel) |
| GET /api/hub-staff/activity | success, top-level hub, paginator rows (id, event_type, previous_status, new_status, parcel_code, nullable actor name string, created_at) |

The backend routes require Hub Staff role and an active assigned hub. Parcel, transfer, and activity endpoints derive the hub from the authenticated account, reject a hub_id filter, and return hub-scoped records. Activity responses do not include a per-event hub field; the UI does not infer historical event location from current parcel custody.

## 2. Routes and workspace

Added a separate /hub-staff protected route group, redirecting its index to /hub-staff/overview:

- /hub-staff/overview
- /hub-staff/parcels
- /hub-staff/incoming-transfers
- /hub-staff/activity

The four pages and workspace layout are lazy-loaded. Hub Staff was added to the existing role-home mapping. The guard's exact role check now calls a small shared predicate, with unit coverage for Hub Staff success and denial of Buyer, Seller, Admin, Logistics, Rider, differently-cased, and missing roles.

The independent Hub Staff shell has a dark operations sidebar, assigned-hub identity, compact top bar, icon navigation, keyboard Escape handling, mobile drawer/backdrop, and sign-out using the existing /logout API and session cleanup. It omits Account/Profile because no compatible Hub Staff profile endpoint was found. Assignment response includes only hub ID/name/code; “Active assignment” reflects successful access through the backend's active-account/active-hub gates, not a fabricated response status.

The workspace requests GET /api/hub-staff/assignment before rendering nested operational pages. Loading and network errors have retry states. A 403 from the assignment request renders a restricted-access state without mounting the page outlet. The API client's existing 401 behavior handles expired sessions. Each page response is checked against the currently assigned hub ID before rows are accepted. Requests do not store or send a hub ID; the query builder explicitly strips hub_id. Async results are keyed to request parameters and ignored after a page unmounts, so old-filter results are not shown under new filters.

## 3. Implemented read-only pages

### Overview

Shows the assigned hub identity and the four server-provided, hub-wide counts from the parcels API. The counts are not calculated from the current page. It concurrently requests one parcel row, one transfer row, and five recent activity rows to obtain the backend paginator/count contract and recent events. It displays the five most recent returned events and links to the three operational read pages. A cross-hub response is rejected.

### Parcels

Displays a responsive table/card view of parcel code, order ID, operational status, delivery-area name, and recorded sorted timestamp. Filters match backend validation: status (AT_SORTING_CENTER or SORTED) and parcel_code; pagination uses page and per_page and honors returned Laravel paginator metadata. No address or financial fields, scan, receipt, sort, or other mutation actions are rendered.

### Incoming transfers

Displays backend-provided transfer ID, parcel code/status, origin hub, transfer status, and departure timestamp with pagination. The backend query explicitly excludes return shipments and only returns forward transfers in transit to the assigned hub. No dispatch or destination receipt action is offered.

### Activity history

Displays event label, parcel code when present, actor name when recorded, status transition when supplied, and recorded timestamp. The event filter uses the backend event_type parameter; pagination follows returned paginator metadata. Known release, Rider collection, departure, receipt, scan, and sorting event types have distinct readable labels/tone. Unknown or missing types are handled without assuming an actor or event-time hub. A hub filter is never submitted.

## 4. Files changed for Phase 2E1

### Modified

- web/src/App.jsx — lazy imports and the separate Hub Staff protected route group.
- web/src/shared/components/ProtectedRoute.jsx — exact role comparison delegates to the shared predicate.

### Added

- web/src/shared/utils/roleAccess.js
- web/src/shared/utils/roleAccess.test.js
- web/src/hubStaff/api.js
- web/src/hubStaff/HubStaffLayout.jsx
- web/src/hubStaff/HubStaffLayout.css
- web/src/hubStaff/HubStaffWorkspaceContext.jsx
- web/src/hubStaff/useHubStaffPage.js
- web/src/hubStaff/components/HubStaffUI.jsx
- web/src/hubStaff/components/HubStaffUI.css
- web/src/hubStaff/components/HubStaffOverview.css
- web/src/hubStaff/pages/Overview.jsx
- web/src/hubStaff/pages/Parcels.jsx
- web/src/hubStaff/pages/IncomingTransfers.jsx
- web/src/hubStaff/pages/Activity.jsx
- web/src/hubStaff/utils/hubStaffWorkspace.js
- web/src/hubStaff/utils/hubStaffWorkspace.test.js
- docs/PHASE_2E1_IMPLEMENTATION_REPORT.md

No backend files, migrations, package manifests/lockfiles, Flutter files, or Logistics page files were changed in this phase.

## 5. Logistics compatibility item for Phase 2E2

The unmodified Logistics transfer action is in web/src/admin/pages/ParcelFlow/ParcelFlow.jsx. Its Logistics variant shows the dispatch action when base === '/logistics' and transfer status is assigned, and calls PATCH /api/logistics/hub-transfers/{id}/dispatch. The Phase 2D2 backend now rejects forward-transfer dispatch until Hub Staff release and Rider collection confirmations exist. Update that Logistics UI in Phase 2E2; it was intentionally left unchanged here.

## 6. Verification

| Check | Result |
|---|---|
| Frontend tests (npm test) | **Pass:** 57 tests, 57 passed, 0 failed. Five new utility/contract tests cover assignment parsing, pagination/count parsing, cross-hub mismatch rejection, omission of hub_id, and event-label fallback. One role predicate test covers exact Hub Staff route authorization versus other roles. |
| ESLint (npm run lint) | **Pass:** exit 0, no errors or warnings. |
| Production build (npm run build -- --outDir temporary external directory) | **Pass:** Vite transformed 2,089 modules. Output was placed outside the repository. Existing large-chunk warning remains (main JavaScript about 1,119.66 kB; Three.js about 742.95 kB); this is not a build failure. Vite also noted that the external output directory is not emptied automatically. |
| git diff --check | **Pass:** no whitespace errors. Git printed line-ending normalization warnings for pre-existing modified files. |
| Backend tests | **Not run:** this phase made no backend changes. |
| Browser/API integration verification | **Not run.** No authenticated browser session was exercised; React route rendering, mobile drawer behavior, live account assignment, and live API error states remain unverified. |

## 7. Limitations and preserved state

The configured test runner is Node's built-in test runner and does not render React components. The added tests verify the role predicate and API response/query utility behavior but do not prove browser redirect behavior or end-to-end data rendering. Those require authenticated browser regression and an active Hub Staff test account.

The workspace deliberately stops at read-only operations. QR scanning, pickup receipt, transfer receipt, sorting, release, Rider collection, dispatch, assignment, hub/area management, and global Logistics data are not implemented or exposed.

Branch remains main at e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661; no files were staged or committed. All pre-existing modified files, untracked documentation, and earlier phase work were preserved. No dependency installation/update, database operation, backend edit, or mobile edit occurred. The temporary production build output is outside the repository.
