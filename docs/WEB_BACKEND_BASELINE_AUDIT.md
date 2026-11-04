# CRYMA Web + Laravel Baseline Audit

**Audit date:** 2026-11-03 (Asia/Manila)  
**Scope:** `web/` React/Vite and `backend/` Laravel only. Mobile projects were not inspected beyond identifying their directories, and were not modified.  
**Method:** Read source, routes, models, migrations, middleware, tests, configuration, and existing project audit docs; run the non-deployment local checks listed below. No source code or database migrations were changed. This document was newly created.

## Executive findings

- Repository baseline is clean: branch `main`, HEAD `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`, tracking `origin/main`. Before the audit, `git status --short --branch` showed only `## main...origin/main`; tracked working tree equals HEAD. No branch switch or Git mutation was made.
- The app has substantial implemented web workflows: role-gated buyer, seller, admin, rider/courier, and logistics screens; Laravel routes/controllers; transactional checkout; seller product/order APIs; parcel pickup, hub, delivery, proof, returns/refunds, COD, and settlement records. The presence of routes alone is not proof of every edge case; findings below qualify the evidence.
- Confirmed build baseline blocker: `npm run build` cannot resolve `qrcode.react` imported by `web/src/shared/components/ParcelQrCode.jsx`. It is declared in the manifest and lockfile, but `npm ls qrcode.react --depth=0` reports it absent from the installed local tree. No packages were installed.
- Lint fails with 19 errors and one warning. The Laravel suite runs but fails 24 of 179 tests (155 pass); failures cluster around outdated request assumptions for voucher claims and product weight as well as other areas. Treat the complete failure list as work to triage, not as proof each controller is defective.
- Sensitive/local artifacts: `backend/.env` and `backend/database/database.sqlite` exist but are untracked and ignored (contents not read or printed). `backend/storage/certs/ca.pem` is tracked; a CA certificate is not itself necessarily secret, but it belongs in repository review because it may be deployment material. `backend/vendor`, Laravel logs/cache, uploaded/private storage, `web/node_modules`, and `web/dist` are ignored local artifacts. No secret values were exposed.
- Project includes two earlier audits (`AUDIT_REPORT.md`, `CHAT_CUSTOMER_SERVICE_AUDIT.md`), a feature plan, root deployment/rehearsal files, and distinct web/backend projects. Earlier docs record prior feature work and test history; their dates/results are historical, not this baseline. Mobile contains `cryma-flutter-app-main` and `cryma-logistics-mobile-master`; preserve both. The Laravel backend also carries its own Vite/package manifest for Laravel assets, separate from the primary React app under `web/`.
- No P0 security/data-integrity issue was confirmed in this bounded source review. P1 items are the failing baseline checks and business-state complexity that needs focused reconciliation before feature work, not a claim that test failures are production incidents.

## Repository safety and project inventory

| Check | Observation |
|---|---|
| Root / Git | Root is the supplied CRYMA project. `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`, tracking `origin/main`; clean tracked tree at audit start. |
| App boundaries | Primary web client: `web/`; Laravel: `backend/`; mobile: `mobile/` (preserve). `backend/resources/js` and `backend/resources/css` are the Laravel/Vite asset scaffold and are distinct from React/Vite `web/`. |
| Existing docs | `AUDIT_REPORT.md`, `CHAT_CUSTOMER_SERVICE_AUDIT.md`, `FEATURE_IMPLEMENTATION_PLAN.md`, `web/README.md`, `backend/README.md`, mobile READMEs. Earlier docs record prior feature work and test history; their dates/results are historical, not this baseline. |
| Local dependency/config | `web/package.json` + lockfile; `backend/composer.json` + lockfile and `phpunit.xml`; Vite configs; `.env.example` files. Installed `web/node_modules` is missing a manifest-declared package. Backend PHPUnit config forces SQLite `:memory:` and array/sync test services. |
| Sensitive/local items | `backend/.env` exists, untracked/ignored. `backend/database/database.sqlite` exists, untracked/ignored. No contents queried. `backend/storage/certs/ca.pem` is tracked; assess whether deployment/public CA material belongs in source control. Private uploaded document/profile folders and logs are ignored. |
| Legacy/duplicate areas | Two separately named mobile trees are intentional preserve-only areas pending mobile work. Backend asset scaffold is not a duplicate React app. There is endpoint/UI overlap in finance/settlements, parcel-flow, and admin/logistics operations (details below), but no evidence that a second Laravel application is present. |
| Preservation | Do not delete/move/overwrite any existing project files; do not touch either mobile tree. The only intended new files are this report and the roadmap. |

## Web application inventory

Routing is in `web/src/App.jsx`; API client in `web/src/shared/services/api.js`; frontend role checks in `ProtectedRoute.jsx` plus buyer session utility. Backend API requests are credentialed through the shared client. Most page implementations fetch their actual data from role-scoped APIs; the route table should be read alongside `backend/routes/api.php`.

### Guest and authentication

- Public `/`, `/shop`, `/stores/:slug`, `/products/:id`; policy pages `/terms`, `/privacy`, `/delivery-and-payments`.
- Auth routes: `/login`, `/admin/login`, `/forgot-password`, `/reset-password`, `/register`, `/register/:role`, `/application/document-correction`. `/seller-register` redirects to `/register`.
- Registration choice and multi-step registration support buyer, seller, rider/Courier signup label, and logistics application paths; frontend validation and server validation both exist. Email OTP verification and correction-link application are server flows. Password recovery is implemented through API.
- Buyer protected: cart, checkout, orders/details, reviews, account/addresses, vouchers, wishlist, seller messaging, customer-support view. Public product/storefront is still guest-accessible.
- Notification UI includes shared toast, modal/dialog, auth modal; loading/error/empty states vary by page.

### Buyer

- Pages: Home, Categories/shop, Storefront, ProductDetails, Cart, Checkout, Orders, OrderDetails, Reviews, Account, Vouchers, Wishlist, Chat/support.
- Observed capabilities: product discovery, seller/store browsing, variant/media display, cart stored client-side, address CRUD, COD checkout with idempotency key, order list/detail/tracking projection, cancellation/refund request, received confirmation, voucher claim/validation, reviews, favorites, seller chat/support, account/password/profile.
- API use: public `/products`, `/products/{id}`, `/stores/{slug}`, public reviews; protected `/buyer/checkout-data`, `/buyer/addresses*`, `/buyer/vouchers*`, `/orders*`, `/products/{id}/reviews`, `/buyer/chat/*`, `/account/*`.
- Access: React buyer route guard and Laravel `auth:sanctum`, `active`, `role:buyer` for buyer APIs. Product/storefront endpoints are public.
- Incomplete boundaries: payment method is currently only `cash_on_delivery`; checkout is one seller per order (server rejects multiple sellers); no online payment gateway. Buyer chat and customer support are distinct routes/pages in current tree, but share underlying conversation/message model family. Formal complaints are administered, while a buyer complaint-create API was not found. Cancellation/refunds are status/approval workflows, not an integrated payment-provider reversal.

### Seller

- Pages: Dashboard, Inventory, Vouchers, Storefront, Orders, Logistics, Feedback/reviews, Reports, Returns, Chat, AccountSettings. `/seller/earnings` redirects to `/seller/reports?view=earnings`; `/seller/returns` is a page while return parcel receiving is also in the shared parcel-flow API.
- Observed capabilities: catalog CRUD/drafts/archive/restore and media/variants, storefront configuration/vacation mode/name, vouchers, order state handling, pickup request after READY_FOR_PICKUP, return visibility/receipt, reports/earnings, reviews, seller chat and a deterministic in-app assistant.
- APIs are grouped behind active seller role, including `/seller/products*`, `/seller/orders*`, `/seller/storefront*`, `/seller/vouchers*`, `/seller/earnings`, `/seller/reports`, `/seller/reviews`, `/seller/parcel-returns*`, `/seller/chat*`, notifications.
- Restrictions: seller ownership is established in controller queries; sellers cannot assign riders or directly transition hub/delivery operations. Parcel slip is a CRYMA label/order barcode, not a carrier-issued waybill (per earlier audit; code has no carrier integration identified).
- Overlap: earnings page is redirected to Reports with an earnings view; seller Logistics page concerns pickup requests and operational instructions while actual scheduling/assignment belongs to logistics/admin APIs.

### Admin

- Pages: Dashboard, Registrations, Users, Vouchers, Seller Compliance, Complaints, Refund Requests, Finance, ParcelFlow, Reports, Settings/policies/announcements, AccountSettings, Chat. `/admin/settlements` and `/admin/commission` redirect into Finance query views.
- Observed capabilities: applicant/doc approval, user status and email release, seller compliance/product review, order/refund/complaint/support, voucher, commission/COD/payout, parcel/hub/delivery management, reports and platform policy/announcement CRUD.
- APIs under `/admin/*` use active admin middleware. Route aliases include `/admin/delivery-queue` and `/admin/logistics` to same `LogisticsController::queue`; admin and logistics roles both expose parcel-flow/hub-transfer endpoints. Treat duplicated surfaces as role overlap and verify intended ownership before changing.
- Limitation: role gate only guarantees admin access; no fine-grained admin permission/policy objects were found in the inspected backend. This may be intentional single-admin design, but document before adding staff roles.

### Logistics

- Pages: Dashboard, RiderManagement, ParcelOperations reused for pickups/incoming/sorting/assignment/monitoring/reports, ParcelFlow, profile/settings. Messages intentionally renders `LogisticsUnavailable`; `/logistics/account` redirects to profile.
- APIs include hubs, area-to-hub mapping, transfers/returns, dashboard/operations, area/rider management, pickup assignment, sorting receipt/scanning/sort-and-assign, delivery assignment/resolution, rider document/approval, profile/password.
- This is a real backend role (`logistics`) and a role-specific web workspace. It is the closest existing implementation to a Hub Operator; there is no distinct `hub_operator` role, account/profile, or `role:hub_operator` route.
- Placeholder/incomplete: Logistics Messages is an explicit unavailable screen. Screen routes for reports exist through shared ParcelOperations, but verify actual backend completeness and permission boundaries before describing it as an independent reporting capability.

### Rider / current Courier signup label

- Routes use `/courier/*`, layout Courier, guard role `rider`; screens: Dashboard, Pickups/details, Deliveries/details, ParcelFlow, History, Earnings, Chat, Profile, Settings.
- APIs provide pickup/delivery lists/statuses, history, proof upload/view, return shipments, hub transfers. Courier eligibility requires active verified rider, approved valid ID/OR-CR/driver-license documents, vehicle and (when applicable) active delivery area; management APIs approve/reject applications/documents.
- Courier Chat component exists, but no rider-scoped chat route was found in `api.php`; its exact runtime behavior needs signed-in/manual verification. Courier earnings screen exists; confirm API-backed earnings source before treating it as settlement-grade financial data.
- There is no courier-company/company-manager role or organization model. Rider accounts are individual user/profile records.

### Reusable frontend / validation / state

- Shared: API axios service, `ProtectedRoute`, toast, Dialog, auth modal, private proof viewer, QR scanner/code, styles/utilities. Role workspaces have dedicated layouts/nav.
- State is mostly component-level React state; buyer cart/wishlist use browser persistence, server is source for orders and role data. No global Redux/Zustand-style store was found.
- Validation: registration and several domain forms have frontend helpers/tests and Laravel request validation; backend remains authority. Error feedback uses shared toast and inline page errors, not one universal form abstraction.
- Automated frontend tests are Node built-in tests around utility/form behavior; they do not render all pages or exercise a live browser/API session.

## Laravel implementation inventory

- Laravel 13 app with Sanctum tokens, API route groups and `EnsureActiveAccount`/`EnsureRole`. Registration/login routes are throttled. `User` has buyer/seller/courier/logistics profiles; role is a user field. No policy classes were located; authorization is middleware plus controller ownership checks.
- Models/migrations cover users, documents/profiles/addresses, products/media/variants, orders/items, vouchers/claims/redemptions, chats/messages, complaints/reviews, deliveries/pickups/areas/hubs/events/transfers, delivery proofs, refunds/returns, COD, commissions, announcements/policies, notifications and email release.
- Transaction use and row locks appear in checkout, cancellation/receipt/refund, vouchers, registration/approval, address defaulting, logistics assignment/status flows, settlement and refunds. Order checkout enforces one seller, snapshots item price/weight/variant, checks active seller/product, stock and vacation mode, decrements stock, records voucher and creates order/commission/delivery-related rows; it uses integer cents and a per-buyer idempotency key/request hash.
- Backend controllers are separated by Api/Admin/Seller/Logistics/Courier namespaces. Some logistics business operations are implemented in `Admin\LogisticsController` and shared via separate admin/logistics routes; `Logistics\ParcelFlowController` adds hub/transfer/return operations.
- Refund requests are moderated by admins; optional return shipment is recorded and tracked. Marking refund as repaid requires the return to reach seller; if seller commission was already paid, code adds a reconciliation note stating seller recovery must be handled separately.
- COD collection and seller commissions use separate rows. Remittance requires exact expected/collected amount and captured reference. Payout requires order COMPLETED, COD remitted for COD orders, no open refund, and positive balance; however this is recorded as a manual payout method/reference, not integrated transfer.
- Scheduler defines `products:purge-archived --days=60` daily at 02:00; deployment must run Laravel scheduler. No queued listeners/jobs or broadcast events were identified in the inspected app; notifications use Laravel notification/mail mechanisms, with sync/local config relevant to deployment.
- Tests include registration, accounts, products, orders/vouchers, chat, role/access, logistics, deliveries/proof, courier, refunds/settlements-related paths. The suite currently does not pass as a whole.

## Role and permissions matrix

| Role | Registration / approval | Status and Web access | API permissions / responsibilities | Limits / existence |
|---|---|---|---|---|
| Guest | No account required for public catalog/policies. | Public landing/shop/store/product/policies; auth/register pages. | Public catalog/store/reviews and throttled auth/application endpoints. | Cannot access protected buyer/order actions. |
| Buyer | `/register/buyer`; email OTP. No manual admin approval evidenced for buyer. | Active status required by protected APIs; buyer web area. | Buyer-scoped addresses, vouchers, orders, reviews, chats, profile. Ownership-scoped orders/addresses/conversations. | COD only, one seller/order; buyer complaint create endpoint not found. |
| Seller | `/register/seller`; OTP plus business documents/review and admin registration/document approval. Seller-compliance review is a later seller/product process. | Pending/inactive applicants cannot use active seller endpoints; after approval/active status seller workspace. | Own products/storefront/orders/vouchers/reviews/reports/chat/returns. | No carrier integration; pickup is requested/scheduled by operations. |
| Admin | No public admin self-registration evidenced; seeded/provisioned accounts. | Active admin via `/admin/login` and admin protected web. | Broad `role:admin` management APIs. | Coarse role, no fine-grained policies found. |
| Logistics | `/register/logistics`; email verification and application documents (valid ID, business permit per frontend rule); reviewed through admin registration/doc process. | Active logistics role; own workspace. | Hubs, delivery areas, riders, pickup/sort/assignment/monitoring/transfers/returns. | No separate hub-operator role; message page unavailable. |
| Rider (`Courier` signup label) | `/register/rider` or UI's Courier label; OTP, rider/vehicle details and documents; logistics rider approval/document review. | Active and verified, approved documents, vehicle, and eligible area for assignment. | Own pickup/delivery/transfer/return actions and proof; rider role. | Individual courier only; no company manager. Eligibility is stricter than just status active. |
| Hub Operator | No separate registration or role discovered. | A logistics user may perform hub functions. | Same `logistics` APIs for hub/transfer/parcel operations. | Treat as a future distinct role only if business approves; do not assume distinct permissions. |
| Courier Company / Company Manager | None discovered. | No web workspace or account status model. | No organization/company-scoped API. | Unsupported in current source; future design/approval required. |

## End-to-end workflow trace

| Workflow | Frontend → API → backend/data | State, controls, and audit result |
|---|---|---|
| A. Buyer register/login | Register/BuyerLogin → `POST /register`, `/verify-email`, `/login` → Registration, EmailVerification, Auth controllers; users, OTP fields, profiles/addresses/documents. | Rate limits on auth; validation + OTP, active-account login behavior and Sanctum token. Implemented; delivery of email depends on runtime mail configuration. |
| B. Seller signup/review/login | Register seller/correction link → register/verify; admin registrations/documents approve/reject/correction; login → same auth endpoints. | Status and role are reviewed; transactional user/profile/docs creation and approval logic. Implemented in code, but actual SMTP/config and admin operational signoff are deployment-dependent. |
| C. Browse/cart/checkout | Catalog/product detail/cart/checkout → public catalog then `GET /buyer/checkout-data`, `POST /orders` → ProductController, BuyerOrderController; Product, Order, OrderItem, voucher/redemption, stock. | COD only; one seller; idempotency; product locks, price/variant/stock snapshots, voucher claim. Implemented. Build blocker means frontend production bundle not currently reproducible from local installed dependencies. |
| D. Seller processing/packing | Seller Orders → `/seller/orders`, `/seller/orders/{id}/status` → Seller OrderController; Order/items, delivery projection/events. | Supports CONFIRMED → PREPARING → READY_FOR_PICKUP (earlier audit and UI/controller path). Order ownership scoped. Parcel slip is not a carrier waybill. Implemented. |
| E. Pickup request/assignment | Seller Logistics/Orders → `/seller/orders/{id}/pickup-request`; admin/logistics pickup-assignment API → SellerOrderController and Admin LogisticsController; PickupAssignment, Delivery, events, rider profile. | Seller requests only after ready; operations require schedule and eligible courier/area, transaction/locks. Implemented with operational assignment outside seller role. |
| F. Rider collection | Courier Pickups/details/status → `/courier/pickups*` → Courier PickupController; pickup assignment/delivery/events/order projection. | Rider ownership/eligibility and transition validation in controller; collection recorded. Implemented; tests exist. |
| G. Hub receive/sort | Logistics incoming/sorting → `/logistics/orders/{id}/sorting-receipt`, `/scan`, `/sort-and-assign` → ParcelOperations/Admin Logistics; Delivery/events/current hub/order projection. | Scan, receive, sorting and assignment exist with role checks. Legacy receipt route also exists. Implemented, but duplicate legacy/current transition surfaces require regression checks. |
| H. Hub transfer | Logistics ParcelFlow → `/logistics/hub-transfers`, rider `/courier/hub-transfers*` → ParcelFlowController; HubTransfer, Delivery/ReturnShipment, hubs/events. | Logistics creates transfer; rider updates status/depart/arrival; source validates state and logs events. Implemented; distinct hub operator role absent. |
| I. Final-mile assignment/delivery | Logistics assignment UI → `/logistics/orders/{id}/delivery-assignment`; rider Deliveries/status/proof → `/courier/deliveries*` → Admin Logistics, Courier Delivery/Proof controllers; Delivery, DeliveryProof/events. | Eligibility, ownership, status transition, proof handling. Implemented. Proof/status must be tested as a combined flow; web component exists. |
| J. Buyer tracking/receipt | Orders/OrderDetails → `/orders`, `/orders/{id}`, `/orders/{id}/confirm-received`; BuyerOrderController and `OrderDeliveryProjection`; Order, Delivery/events/proof. | Buyer-scoped reads; receipt transaction requires allowed completed delivery state and records buyer confirmation/completion. Implemented. |
| K. Cancel/failure/returns/refunds | Buyer order cancel/refund create → `/orders/{id}/cancel`, `/refund-requests`; admin refund update; rider/logistics return endpoints; BuyerOrder, Admin RefundRequest, Delivery controllers. | Cancellation locked and state-gated; return is optional per refund decision, courier/hub/seller receipt state; manual refund record, no gateway reversal. Payout reconciliation after already-paid seller is manual. Implemented in pieces; integrated full-path coverage should be strengthened. |
| L. COD/remit/commission/settlement | Rider delivery/COD path; Admin Finance → `/admin/settlements/cod`, `/remit`, `/payouts`, `/pay`, commissions → Settlement/Commission; CodCollection, Commission, RefundRequest. | Exact cash match + remittance reference; commission available only after completion/remittance/open refund resolution; manual payout reference. Implemented as bookkeeping/manual reconciliation, not banking/payment processing. |

## Prioritized risks and confirmed gaps

No P0 is asserted: this review did not confirm a critical exploit or data corruption path. The following are evidence-based and need triage.

| Priority | Evidence / actual behavior | Why it matters | Suggested correction and dependencies | Coverage |
|---|---|---|---|---|
| P1 | `web/src/shared/components/ParcelQrCode.jsx` imports `qrcode.react`; package is in `web/package.json` and lockfile but absent in installed node_modules (`npm ls` empty); build fails resolving it. | Local production build cannot be produced from current installed tree, so deployment readiness is unverified. | Reconcile dependency installation against lockfile (no package change assumed yet); clean CI `npm ci` in a controlled future phase, then build. Avoid installing packages in audit. | No test addresses bundler module resolution. |
| P1 | `web` lint exits 1: 19 errors, 1 warning. Confirmed visible errors include `Commission.jsx` synchronous state-setting effects and unused destructured media fields in `seller/pages/Inventory.jsx`; additional findings exist in other files. | Quality gate is red; errors may hide defects and prevent CI acceptance. | Review all lint output and fix in role-scoped batches with focused regression checks. | Node utility tests do not cover all components. |
| P1 | Backend `php artisan test`: 179 tests, 155 pass, 24 fail. Failures include voucher checkout fixtures receiving “Claim this voucher…” 422 and product fixtures receiving required `weight_kg` 422; other failures span chat/inventory/registration etc. | Regression baseline is not green; intended contract vs outdated tests is unclear. | Triage each failing assertion against current product contract; update either tests or implementation only after product behavior is confirmed. Do not mass-disable tests. | Coverage exists but failing. |
| P1 | Settlement/refund controllers explicitly preserve manual operational gap: after commission paid, refund note says CRYMA-funded repayment and seller recovery must be reconciled separately (`Admin/RefundRequestController.php`); payout/remittance are reference records only (`Admin/SettlementController.php`). | Real cash movement/recovery depends on off-system operations; reports can diverge from actual cash if reconciliation is not controlled. | Define accounting ledger/roles/reconciliation evidence and refund funding policy before integrating payment providers or changing payout statuses. Requires finance approval and migration/recovery design. | Feature tests cover states but not actual external money movement. |
| P2 | `/logistics/messages` renders `LogisticsUnavailable`; Courier Chat screen exists without a rider chat API group in `routes/api.php`. | Screens may imply communication capability unavailable or fail at runtime. | Either label/remove entry only after product decision, or specify scoped messaging API/ownership. Verify Courier Chat's exact current behavior manually. | No end-to-end browser check. |
| P2 | `/admin/settlements` and `/admin/commission` redirect to Finance views; `/seller/earnings` redirects to Reports earnings view. Admin `/admin/delivery-queue` and `/admin/logistics` map to same queue; admin/logistics have overlapping parcel-flow/hub and assignment APIs. | Navigation/API duplication increases support and authorization regression risk. | Keep canonical destinations and document distinct role capabilities; consolidate only after checking links/contracts/tests. | Route list confirms aliases; no test confirms navigation consistency. |
| P2 | Complaint UI/API found only for admin; no buyer complaint-create/list route in buyer routes/controller inventory. | Buyers cannot initiate the formal complaint record through the inspected web/API, although support messaging/refund paths exist. | Confirm intended dispute flow; add buyer-owned submission only in a later approved feature phase with authorization, evidence privacy, and status tracking. | Admin complaint tests exist; buyer submission absent. |
| P2 | Buyer checkout accepts only COD and rejects multi-seller cart in `BuyerOrderController::store`. | Product/checkout experience is intentionally narrower than general marketplace checkout. | Treat online payments and multi-seller order splitting as separate product decisions; preserve item, voucher, delivery and settlement invariants. | `OrderCheckoutIntegrityTest` covers existing contract. |
| P2 | `backend/storage/certs/ca.pem` is tracked; `backend/.env` and DB file exist locally (ignored). | Tracked deployment/config artifacts merit secret and provenance review; local env/database files need continued exclusion. | Review tracked cert origin and repository policy; rotate only if key material is later found (no key values were inspected). Keep secrets in deployment secret store. | Git/file metadata only. |
| P3 | `web/src/admin/pages/Commission/Commission.jsx` has state-effect lint violations; large production chunks (~1.15 MB JS and ~965 KB CSS reported before resolution failure) trigger Vite >500 kB warning. | Performance/maintainability concern, not a verified functional defect. | Code split large workspaces and reduce effect-driven cascading state updates with page regression coverage. | Build did emit size report before final resolution error; no performance testing. |

## Duplication, placeholders, and overlap

- **Finance aliases:** `/admin/settlements` and `/admin/commission` redirect into `/admin/finance?view=...`; `/seller/earnings` redirects to `/seller/reports?view=earnings`. These are compatibility URLs, not independent screens.
- **Parcel queue alias:** `/api/admin/delivery-queue` and `/api/admin/logistics` call the same queue action. Admin and Logistics have separate route prefixes to some shared Admin controller methods, while a Logistics ParcelFlow controller handles hub/transfer functionality. Preserve role scoping when consolidating.
- **Courier labels:** signup UI says Courier in places while persisted role and route guard are `rider`; app path/layout calls Courier. This is current label/implementation mapping, not a second role.
- **Support vs seller chat:** buyer support route and seller chat route coexist, but both use conversation/message concepts; an earlier audit describes the same underlying conversation records. Keep seller visibility scoped; do not merge or expose support threads casually.
- **Placeholders:** Logistics Messages has explicit unavailable page. Courier Chat is not established as a functioning backend chat from current route inventory. No other page was called a placeholder solely based on appearance.
- **Separate projects:** `backend/` Vite scaffold and `web/` React/Vite are separate responsibilities. Nested mobile projects are preserve-only, not audited for features here.

## Test and build baseline (executed 2026-11-03)

| Check | Result |
|---|---|
| Frontend tests (`cd web; npm test`) | **Pass:** 48 tests, 0 failures. Utility/validation tests only. |
| Frontend lint (`npm run lint`) | **Fail:** 19 errors, 1 warning. Main identified examples above; full run output contained other violations. |
| Frontend production build (`npm run build`) | **Fail:** module resolution error for `qrcode.react` from `ParcelQrCode.jsx`; chunk-size warnings also emitted. Package declared/locked but absent locally. |
| PHP syntax (`php -l` over `backend/app`, `routes`, `database`) | **Pass:** 173 PHP files. |
| Laravel suite (`php artisan test`) | **Fail:** 179 tests; 155 pass, 24 fail, 1,207 assertions. Several failures indicate stale fixture/request assumptions; all failures require triage. PHPUnit config used SQLite `:memory:` and did not run migrations against the project SQLite file. |
| Route validation (`php artisan route:list --except-vendor --json`) | **Pass:** route registry constructed. Output was large; auth, buyer/seller/admin/logistics/rider groups registered with active/role middleware as expected. |
| Database migration/records | Not run or changed. |
| Browser smoke / live services | Not run. No claim that live email, deployed endpoints, media storage, or authenticated page rendering was verified. |
| Dependency install/upgrade | Not run. |
| Audit-generated ignored output | The requested production build wrote its normal ignored files under `web/dist`; PHPUnit/Laravel updated ignored cache/test artifacts. No tracked application file changed. These ignored outputs were left in place. |

## Evidence boundaries

- This is a source and local-baseline audit, not a penetration test, production database review, reconciliation, or browser end-to-end certification.
- No secret values or personal records were read or printed. Presence/tracking/ignore metadata was used only to identify sensitive-file risk.
- Feature existence is based on routes plus relevant UI/controller/model inspection, but a fully operational workflow also depends on runtime configuration and manual operations.
- No migrations were run. Laravel automated tests used their configured in-memory database.
- No application source code was changed. The two deliverables are the only intended tracked file additions; checks also wrote ignored build/test artifacts noted above.
