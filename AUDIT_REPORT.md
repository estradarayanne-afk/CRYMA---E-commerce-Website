# CRYMA Marketplace — Phase 0 Project Audit

**Audit date:** 2026-10-21  
**Scope:** Current working tree in `web/` and `backend/`; source review, existing automated checks, and a limited public-page browser smoke check.  
**Change policy:** No application code, schema, or test files were modified for this audit. This report replaces the earlier partial audit draft.

## Executive summary

The checkout contains real buyer, seller, admin, and courier workflows; the earlier draft and implementation plan are stale in several areas. Seller chat, platform vouchers, courier pickup/delivery assignment, delivery event history, and delivery status transitions exist in the current source. Several important gaps remain:

1. Platform commission records are read by admin pages/reports, but no commission-generation/write path was found in application code; admin dashboard order and revenue KPIs are hard-coded to zero.
2. Platform sales/revenue reporting sums all orders in the date range, including cancelled orders.
3. GCash is selectable and recorded as a payment method, but there is no payment-status, gateway, payment-confirmation, or refund flow.
4. Checkout always records a zero shipping fee.
5. Buyers have no in-app complaint submission endpoint or self-service cancellation/return request flow, although admin complaint handling and failed-delivery return resolution exist.
6. Notifications are explicitly a placeholder; UI feedback and modal behavior are implemented independently across role pages.

No Critical-severity finding was established. Financial correctness and checkout policy are the highest risks. The source contains meaningful safeguards—role middleware, owner-scoped queries, server-side checkout price/stock revalidation, transactional stock updates, voucher revalidation/redemption, idempotent order submission, and expected-status checks in courier transitions—but the current tests do not replace authenticated browser/E2E testing.

## Audit context and project structure

- The workspace is a React/Vite single-page application in `web/` and a Laravel JSON API in `backend/`. Main role areas are `web/src/buyer`, `web/src/seller`, `web/src/admin`, `web/src/courier`, and `backend/app/Http/Controllers`.
- Installed frontend versions observed: React/React DOM 19.2.8, React Router 7.18.2, Vite 8.2.1. The backend reported Laravel Framework 13.25.0 and PHP 8.5.9; `composer.json` requires PHP `^8.3` and Laravel `^13.17`.
- Frontend scripts in `web/package.json`: `dev`, `build`, `lint`, `test` (`node --test`), `format`, and `preview`. Backend `composer.json` provides `test` (`php artisan test`) and `dev`.
- Automated tests are present in both projects. The frontend tests are Node utility/validation tests; the Laravel suite includes feature tests for registration, checkout integrity, vouchers, buyer/seller chat, delivery workflow, and account settings.
- Root-level project documentation is limited. `backend/README.md` and `web/README.md` are framework/template boilerplate. `FEATURE_IMPLEMENTATION_PLAN.md` and the prior `AUDIT_REPORT.md` contain statements contradicted by current code (for example, that voucher and courier workflows do not exist).
- The worktree was already substantially modified and contained many untracked files before this audit. Findings describe the files as they currently exist; no clean-branch/baseline comparison was possible. No credentials or `.env` values were inspected or included.

## Findings by proposed phase

### Phase 1: shared UI and feedback

#### UI-01 — Role workspaces use divergent layout and feedback patterns

- **Severity:** Medium
- **Affected role:** Buyer, seller, platform admin, courier
- **Files/components:** `web/src/styles/tokens.css`, `web/src/styles/globals.css`, `web/src/shared/styles/feedback.css`, `web/src/buyer/layouts/BuyerLayout.jsx`, `web/src/admin/layouts/AdminLayout.jsx`, `web/src/seller/layouts/SellerLayout.jsx`, `web/src/courier/layouts/CourierLayout.jsx`, `web/src/seller/pages/Inventory.jsx`
- **Confirmed problem and evidence:** Global color/spacing tokens and focus/reduced-motion rules exist, but the role shells and feature feedback are not one shared system. Buyer uses a storefront navbar and global toast; admin and seller render separate sidebars (seller imports admin CSS); courier uses a compact top header/nav. Feature pages supply their own notices and modal implementations. For example, seller inventory renders success feedback as an inline fixed `<div>` without a `role` or live-region announcement, while buyer feedback uses `role="status"`/`alert` and other pages use separate alert classes.
- **Expected behavior:** Actions should have consistent visible and assistive-technology feedback, and navigation, status wording, buttons, forms, tables, and modal behavior should be recognizable across workspaces.
- **Recommended fix:** Establish a small shared accessible feedback/dialog and status-label pattern first; align role layouts and common control states with existing tokens. Keep role-specific information architecture distinct where it is intentional.
- **Dependencies and regression risks:** Foundational; changes affect all role screens. Preserve current route access, mobile navigation, and role-specific tasks. Avoid replacing working feature behavior during visual unification.
- **Proposed phase:** Phase 1
- **Test needed:** Component tests for success/error announcement and dismissal; keyboard/screen-reader checks for shared dialog and navigation; responsive screenshots across buyer, seller, admin, and courier pages.

#### UI-02 — Modal interaction guarantees vary by page

- **Severity:** Medium
- **Affected role:** Buyer, seller, platform admin
- **Files/components:** `web/src/shared/components/AuthModal.jsx`, `web/src/buyer/pages/Checkout/Checkout.jsx`, `web/src/buyer/pages/OrderDetails/OrderDetails.jsx`, `web/src/admin/pages/Vouchers/Vouchers.jsx`
- **Confirmed problem and evidence:** `AuthModal` implements focus capture/trapping, Escape close, and focus restoration. The checkout address/order dialogs declare `role="dialog"` and `aria-modal` but do not implement comparable focus management in the inspected component. Order receipt confirmation uses browser-native `window.confirm`; admin voucher dialogs have their own Escape handling. This is inconsistent rather than a general absence of modal semantics.
- **Expected behavior:** Every custom dialog should move and contain focus, restore focus on close, provide a consistent Escape/backdrop policy, and prevent accidental dismissal while saving. Confirmations should follow the same accessible pattern.
- **Recommended fix:** Reuse a shared dialog/confirmation primitive; retain the existing robust auth-modal behavior as a reference.
- **Dependencies and regression risks:** Depends on UI-01. Test form submission, loading locks, nested address entry, and mobile viewport behavior to avoid closing an in-flight checkout.
- **Proposed phase:** Phase 1
- **Test needed:** Keyboard-only tests for open, Tab/Shift+Tab, Escape, focus restoration, backdrop click, and disabled/in-flight close behavior.

#### UI-03 — Buyer notifications are a visible placeholder

- **Severity:** Medium
- **Affected role:** Buyer
- **Files/components/endpoints:** `web/src/buyer/components/BuyerNavbar/BuyerNavbar.jsx` notification dropdown; `backend/routes/api.php`
- **Confirmed problem and evidence:** The navbar exposes a Notifications bell, whose dropdown says notifications are not available yet. No buyer notification list/read API or notification persistence route is defined. It promises order, seller, delivery, and support updates without providing them.
- **Expected behavior:** A buyer can see timely order, seller-message, delivery, and support updates, with unread/read state and useful destinations; otherwise the control should not imply the feature is live.
- **Recommended fix:** Implement an authenticated recipient-scoped notification feed and event producers, or clearly defer/remove the live-looking control until that work is ready. Do not use announcements as a substitute for per-user order events.
- **Dependencies and regression risks:** Depends on canonical order/delivery/chat events and recipient scoping. Duplicate event delivery and notifications for the wrong account are primary risks.
- **Proposed phase:** Phase 1, with event wiring in Phases 2, 4, and 6
- **Test needed:** Feature tests for recipient isolation, unread counts, idempotent event creation, and state changes; UI tests for loading/empty/error/read states.

#### UI-04 — Typography tokens do not resolve to one declared font

- **Severity:** Low
- **Affected role:** All roles
- **Files/components:** `web/src/styles/tokens.css`, `web/src/styles/globals.css`, `web/index.html`
- **Confirmed problem and evidence:** The token root declares Inter, `body` overrides it with Poppins, and the inspected HTML/CSS has no font-face or font import. Both names can therefore fall back to an installed/system sans-serif, so the intended typeface is not reproducibly applied.
- **Expected behavior:** One documented typeface should be consistently available across environments.
- **Recommended fix:** Select one approved font and bundle it locally or explicitly adopt a system stack; make the token and body declarations agree.
- **Dependencies and regression risks:** Cosmetic but global; validate line wrapping, headings, and compact mobile tables/forms.
- **Proposed phase:** Phase 1
- **Test needed:** Build plus visual comparison at mobile and desktop widths with font loading verified.

### Phase 2: chat

#### CHAT-01 — Seller chat keeps only the first product as conversation context

- **Severity:** Medium
- **Affected role:** Buyer, seller
- **Files/components/endpoints:** `web/src/buyer/pages/ProductDetails/ProductDetails.jsx` Contact seller action; `web/src/buyer/pages/Chat/Chat.jsx`; `web/src/seller/pages/Chat.jsx`; `backend/app/Http/Controllers/Api/BuyerChatController.php::startSellerConversation`; `backend/database/migrations/2026_10_21_000006_add_seller_conversations.php`
- **Confirmed problem and evidence:** Product details sends a product ID when starting seller chat, and both chat UIs can display a product label. However, conversations are unique by buyer/seller pair, and the backend sets `product_id` only when creating a new conversation. Contacting the same seller about a different product reuses the existing conversation and leaves the original product context in place. The thread is not linked to an order.
- **Expected behavior:** A seller and buyer should be able to tell which product/order a discussion concerns, including when they discuss multiple products with the same seller.
- **Recommended fix:** Decide whether a conversation is per seller, product, or order; then model explicit topic/context (or support multiple context references) and provide an in-thread way to distinguish topics. Preserve support conversations as a separate type.
- **Dependencies and regression risks:** Requires API/data-model decision and potentially a migration. Do not split or merge historical conversations without a backfill/compatibility plan; protect buyer/seller participant scoping.
- **Proposed phase:** Phase 2
- **Test needed:** Buyer starts chats from two products by one seller; both buyer and seller see correct context; existing threads and support conversations remain accessible; cross-user conversation IDs remain inaccessible.

**Concern verdict:** The “generic Messenger” concern is only partly confirmed. The UI is a conventional inbox/thread layout, but buyer support and seller identities are separated and product context is displayed. The verified functional defect is stale/incomplete context after the first product, not that contextual marketplace chat is wholly absent.

### Phase 3: vouchers

#### VCH-01 — Voucher discovery is account/checkout-centered rather than shopping-centered

- **Severity:** Medium
- **Affected role:** Buyer
- **Files/components/endpoints:** `web/src/buyer/pages/Account/Account.jsx` Vouchers section; `web/src/buyer/pages/Account/VoucherPanel.jsx`; `web/src/buyer/pages/Checkout/Checkout.jsx`; `backend/routes/api.php` buyer voucher routes
- **Confirmed problem and evidence:** Buyers can view voucher cards under My Account and apply codes/select available vouchers in checkout. The account panel links eligible vouchers back to `/shop`, but there is no voucher discovery entry in the shopping/category storefront navigation.
- **Expected behavior:** Shopping-focused discovery should expose eligible offers before checkout; account can remain the place for a buyer’s saved/used voucher history.
- **Recommended fix:** Add a shopping-facing offers/vouchers entry or collection and link eligible products/categories to discovery; retain authoritative eligibility and discount calculation at checkout.
- **Dependencies and regression risks:** Depends on UI-01 conventions and product/category routing. Do not expose non-public or buyer-specific redemption information.
- **Proposed phase:** Phase 3
- **Test needed:** A buyer can discover an eligible offer from shopping pages, follow it to eligible products, and receive server-confirmed eligibility/discount at checkout.

#### VCH-02 — Canceled orders continue to consume voucher uses

- **Severity:** Medium
- **Affected role:** Buyer, platform admin
- **Files/components/endpoints:** `backend/app/Http/Controllers/Api/BuyerOrderController.php::store`; `backend/app/Http/Controllers/Admin/OrderController.php::updateStatus`; `backend/app/Support/VoucherDiscount.php::calculate`; `backend/database/migrations/2026_10_21_000005_create_buyer_vouchers.php`
- **Confirmed problem and evidence:** Checkout creates a redemption row in the same transaction as the order. Admin cancellation restores product stock but leaves the redemption row intact. Voucher eligibility counts all redemption rows for global and per-buyer limits, with no cancellation/refund exclusion or reversal path.
- **Expected behavior:** Voucher use after cancellation should follow an explicit cancellation policy and be reflected consistently in buyer limits and global quotas.
- **Recommended fix:** Agree whether cancellation releases a voucher use; if so, make redemption state/reversal transactional and retain an audit record rather than silently deleting financial history.
- **Dependencies and regression risks:** Depends on cancellation, payment, and refund policy (VCH/BUY-03). Must remain idempotent under repeated cancellation and concurrent redemption.
- **Proposed phase:** Phase 3, coordinated with Phase 4
- **Test needed:** Cancel a voucher order and verify the defined buyer/global quota behavior, stock restoration, redemption history, repeated cancellation, and concurrent last-use checkout.

**Verified voucher behavior:** Admin create/edit/status routes and UI exist. Buyer listing and validation routes exist. Final order creation recalculates the discount from current product prices and stock inside a transaction, locks the voucher, snapshots the discount on the order, and creates a redemption record. The current model represents platform-wide active vouchers plus redemption history; it has no separate buyer claim/wallet state. Whether vouchers should be claimed/owned individually is a product-policy question, not a confirmed defect.

### Phase 4: buyer shopping and checkout

#### BUY-01 — GCash is selectable without an in-app payment lifecycle

- **Severity:** High
- **Affected role:** Buyer, platform admin, seller
- **Files/components/endpoints:** `web/src/buyer/pages/Checkout/Checkout.jsx` payment options and order submission; `backend/app/Http/Controllers/Api/BuyerOrderController.php::store`; `backend/app/Models/Order.php`; `backend/routes/api.php`
- **Confirmed problem and evidence:** Checkout offers Cash on Delivery and GCash. The API accepts and stores `payment_method=gcash`, then creates a `pending` order. No payment status, payment-intent/transaction record, gateway callback, proof/confirmation flow, or payment/refund endpoint was found. The GCash label says it is selected for the order, not that payment was received.
- **Expected behavior:** Payment must either be completed and verifiably recorded before confirming a prepaid order, or be clearly defined as an external/manual process with explicit instructions, pending state, and reconciliation.
- **Recommended fix:** Confirm the intended GCash operating model. Add a server-authoritative payment lifecycle and idempotent callbacks/webhooks if using a gateway; otherwise expose clear manual instructions and an admin reconciliation state. Never treat method selection as settlement.
- **Dependencies and regression risks:** Business/provider decision required; affects order state, seller fulfillment, commission reporting, cancellation, refunds, and checkout copy.
- **Proposed phase:** Phase 4
- **Test needed:** Test successful, pending, declined, duplicate callback, amount mismatch, cancellation/refund, COD, and GCash paths; ensure seller fulfillment cannot advance a prepaid order contrary to policy.

#### BUY-02 — Every order has a zero shipping charge

- **Severity:** Medium
- **Affected role:** Buyer, platform admin, seller, courier
- **Files/components/endpoints:** `web/src/buyer/pages/Checkout/Checkout.jsx` `shippingFee`; `backend/app/Http/Controllers/Api/BuyerOrderController.php::store`; `backend/app/Http/Controllers/Admin/ReportController.php`
- **Confirmed problem and evidence:** Checkout sets `shippingFee` to zero and order creation persists `shipping_fee => 0`; no shipping-rate calculation/configuration was found. Delivery areas are configured for assignment, not price calculation.
- **Expected behavior:** The buyer sees the correct shipping amount before confirming; the server stores the authoritative amount and reports it consistently, or the UI explicitly states an approved free-shipping policy.
- **Recommended fix:** Define rate ownership, service-area rules, and free-shipping policy; calculate and validate shipping server-side and snapshot the rate on the order.
- **Dependencies and regression risks:** Depends on delivery-area/rate policy (Phase 6) and payment/discount arithmetic. Re-test minimum spend and voucher rules if shipping is included/excluded.
- **Proposed phase:** Phase 4, with rate configuration in Phase 6
- **Test needed:** Address/area rate boundaries, unavailable areas, free-shipping rules, voucher interaction, and server/client total agreement.

#### BUY-03 — Buyer support lacks self-service complaint, cancellation, and return requests

- **Severity:** Medium
- **Affected role:** Buyer, platform admin, seller
- **Files/components/endpoints:** `web/src/buyer/pages/OrderDetails/OrderDetails.jsx`; `backend/routes/api.php` buyer order routes and admin complaint routes; `backend/app/Http/Controllers/Admin/ComplaintController.php`
- **Confirmed problem and evidence:** Buyer order APIs provide read, create, and confirm-received operations, but no buyer cancellation, complaint creation, or return/refund request route was found. Complaint routes are admin-only list/show/status/resolve. An admin complaint screen exists, but the app has no in-app buyer path to submit a case.
- **Expected behavior:** Buyers can request help/cancellation/return within defined status and time windows; administrators can act on cases submitted through the product, with an audit trail.
- **Recommended fix:** Define eligibility windows, seller/admin responsibility, evidence and refund policy, then add a buyer-scoped request workflow and corresponding admin queue. Keep dispute data separate from support chat.
- **Dependencies and regression risks:** Depends on payment settlement, delivery status, stock restoration, and voucher reversal rules. Prevent duplicate requests and unauthorized order access.
- **Proposed phase:** Phase 4, with admin handling in Phase 5 and parcel return in Phase 6
- **Test needed:** Buyer owns order vs another buyer; allowed/blocked statuses; duplicate/canceled requests; seller/admin visibility; stock, payment, and voucher side effects.

#### BUY-04 — Cart and wishlist are browser-local

- **Severity:** Low
- **Affected role:** Buyer
- **Files/components:** `web/src/shared/utils/buyerAccess.js`, `web/src/buyer/pages/Cart/Cart.jsx`, `web/src/buyer/pages/Wishlist/Wishlist.jsx`
- **Confirmed problem and evidence:** Cart and wishlist state are stored in `localStorage`, not in buyer-scoped API resources; state does not synchronize across devices/browsers.
- **Expected behavior:** If cross-device continuity is a product requirement, signed-in buyers should retain cart and saved products across sessions/devices.
- **Recommended fix:** Confirm whether local-only behavior is intentional. If not, add buyer-owned server persistence and a deterministic merge policy for local items.
- **Dependencies and regression risks:** Requires data ownership and merge/conflict policy; avoid losing local cart contents during login or sync failures.
- **Proposed phase:** Phase 4
- **Test needed:** Login/logout, multiple devices, stale/removed products, inventory changes, and offline/retry merge behavior.

**Verified shopping safeguards:** The storefront exposes product/category discovery, product details, cart, checkout, wishlist, order history/details, and tracking. Order creation re-reads active products and prices, checks stock, locks and decrements stock transactionally, enforces one seller per order, uses an idempotency key, and scopes buyer order reads by `buyer_id`. One-seller-per-order is an explicit current constraint; whether a mixed-vendor cart should become a split checkout is a product decision.

### Phase 5: seller and platform admin

#### OPS-01 — Commission records are displayed but not generated by the order workflow

- **Severity:** High
- **Affected role:** Platform admin, seller
- **Files/components/endpoints:** `backend/app/Models/Commission.php`; `backend/app/Http/Controllers/Admin/CommissionController.php`; `backend/app/Http/Controllers/Admin/ReportController.php`; `backend/app/Http/Controllers/Api/BuyerOrderController.php::store`; `backend/routes/api.php` `/admin/commissions`
- **Confirmed problem and evidence:** Commission pages/reports read the `commissions` table, and API routes only list/show commissions. A search of application code found no commission creation/write path in order placement, status transitions, or an event/listener. Unless records are populated outside the application, new orders will not produce commission/seller-earnings records.
- **Expected behavior:** Each eligible order should create exactly one auditable commission/earnings record under the agreed basis and lifecycle; cancellations/refunds should be reconciled.
- **Recommended fix:** Define commission rate, calculation basis, and recognition point; create the record transactionally or through an idempotent post-commit workflow with a unique order constraint and reversal handling.
- **Dependencies and regression risks:** Depends on payment settlement and cancellation/return policy (BUY-01/03). Incorrect commission basis affects seller balances and platform financial statements.
- **Proposed phase:** Phase 5, after Phase 4 financial policy
- **Test needed:** Commission on qualifying order, duplicate event, canceled/refunded order, rounding, rate changes, and agreement between order, seller report, admin report, and commission detail.

#### OPS-02 — Admin dashboard order and revenue KPIs are hard-coded to zero

- **Severity:** High
- **Affected role:** Platform admin
- **Files/components/endpoints:** `backend/app/Http/Controllers/Admin/DashboardController.php::index`; `web/src/admin/pages/Dashboard/Dashboard.jsx`
- **Confirmed problem and evidence:** The dashboard controller calculates user counts but returns literal `0` for both `total_orders` and `total_revenue`, regardless of database contents.
- **Expected behavior:** Dashboard order/revenue figures should reflect the same defined financial and order-status rules used by reports.
- **Recommended fix:** Replace constants with server-side aggregates using the canonical status/payment rules; expose unavailable values as unavailable rather than success-shaped zero if schema or data is unavailable.
- **Dependencies and regression risks:** Depends on OPS-01 and BUY-01 financial definitions. Keep KPI periods and cancellation/refund treatment consistent with reports.
- **Proposed phase:** Phase 5
- **Test needed:** Seed known active, cancelled, and completed orders/commissions and assert dashboard values match the documented policy.

#### OPS-03 — Platform sales/revenue includes cancelled orders

- **Severity:** High
- **Affected role:** Platform admin
- **Files/components/endpoints:** `backend/app/Http/Controllers/Admin/ReportController.php::index`; `web/src/admin/pages/Reports/Reports.jsx`
- **Confirmed problem and evidence:** The report query filters orders only by `created_at`; `total_orders`, `total_sales`, `total_shipping`, `total_revenue`, and daily trends sum all matching records without excluding `CANCELLED` orders. Admin order management can cancel an order.
- **Expected behavior:** Financial aggregates should follow an explicit recognized/captured/refunded policy and not count canceled orders as realized revenue.
- **Recommended fix:** Centralize a status/payment-aware financial query and distinguish gross order value, captured payments, refunds, and net revenue rather than labeling a broad sum “revenue.”
- **Dependencies and regression risks:** Depends on payment, cancellation, returns, and commission semantics. Historical dashboard totals will change; document the accounting definition.
- **Proposed phase:** Phase 5
- **Test needed:** Report period containing pending, completed, cancelled, and refunded orders; assert each metric and trend uses the defined inclusion rules.

#### OPS-04 — Seller Logistics page is an informational duplicate, not a fulfillment workspace

- **Severity:** Medium
- **Affected role:** Seller
- **Files/components/endpoints:** `web/src/seller/pages/Logistics.jsx`; `web/src/seller/pages/Orders.jsx`; admin logistics routes in `backend/routes/api.php`
- **Confirmed problem and evidence:** Seller Logistics fetches `/seller/orders`, repeats order/status information, and explicitly says carrier assignment, pickup scheduling, and shipment tracking are not connected to that workspace. Seller order preparation is available elsewhere; pickup/delivery assignment is admin-managed.
- **Expected behavior:** Seller-facing fulfillment should clearly show what sellers can action, the authoritative status, and the next responsible actor; duplicate pages should not imply seller control of admin dispatch.
- **Recommended fix:** Either make this a seller-facing fulfillment/tracking view sourced from delivery progress, or remove/rename the redundant page and keep status actions in Orders.
- **Dependencies and regression risks:** Depends on the shared status model and delivery projection. Preserve seller ownership filtering and avoid exposing another seller’s order items.
- **Proposed phase:** Phase 5, coordinated with Phase 6
- **Test needed:** Seller sees only orders containing their items; status and delivery timeline match buyer/admin views; only permitted seller transitions are actionable.

#### OPS-05 — Admin role edits can bypass seller approval requirements

- **Severity:** High
- **Affected role:** Platform admin, seller, buyer
- **Files/components/endpoints:** `backend/app/Http/Controllers/Admin/RegistrationController.php::updateUser`; `backend/app/Http/Controllers/Admin/RegistrationController.php::updateStatus`; `backend/app/Http/Controllers/Admin/SellerComplianceController.php::approve`; `backend/routes/api.php` `/admin/users/{id}`
- **Confirmed problem and evidence:** `updateUser` accepts `role=seller` and directly updates the user without requiring email verification, approved seller documents, or an inactive/pending state. The separate seller approval and activation paths enforce verification/document requirements. An active buyer can therefore be changed to seller through the admin user-update endpoint and satisfy seller route role checks without going through compliance.
- **Expected behavior:** Any transition into seller role should require the same verification/document approval and activation gates as seller registration, unless there is an explicitly audited override.
- **Recommended fix:** Disallow role mutation from general user edit, or centralize role-change eligibility checks and require an explicit, audited admin override with an appropriate non-active state.
- **Dependencies and regression risks:** Coordinate with admin user-management requirements and existing migration/legacy accounts. Ensure legitimate seller role corrections remain possible through the audited approval path.
- **Proposed phase:** Phase 5
- **Test needed:** Attempt buyer-to-seller and rider-to-seller role changes with missing/unapproved documents, unverified email, and active status; assert the transition is rejected or requires the approved override path.

#### OPS-06 — Seller compliance rejection reason is not persisted

- **Severity:** Medium
- **Affected role:** Platform admin, seller
- **Files/components/endpoints:** `web/src/admin/pages/SellerCompliance/SellerCompliance.jsx::confirmReject`; `backend/app/Http/Controllers/Admin/SellerComplianceController.php::reject`; `backend/app/Models/SellerProfile.php`
- **Confirmed problem and evidence:** The UI requires and submits `rejection_reason`. The controller validates it, changes the user's status to `rejected`, and returns the reason in the immediate response, but does not save it to the seller profile or another persisted record. The seller cannot rely on the reason being available after refresh.
- **Expected behavior:** Rejection rationale should remain attached to the compliance decision and be available to authorized admins and the affected seller.
- **Recommended fix:** Add a durable decision/reason record (including actor and timestamp) or persist the latest reason on the seller profile; expose it with appropriate authorization and support resubmission history.
- **Dependencies and regression risks:** Requires schema/API design and privacy decisions for seller-facing visibility. Preserve historical reasons when a seller resubmits.
- **Proposed phase:** Phase 5
- **Test needed:** Reject a seller, reload the compliance record, and verify the reason and actor/time remain; verify an unrelated seller cannot view it.

### Phase 6: logistics

#### LOG-01 — “Returned” records a failed-delivery resolution, not a customer return/refund workflow

- **Severity:** Medium
- **Affected role:** Buyer, platform admin, seller, courier
- **Files/components/endpoints:** `backend/app/Http/Controllers/Admin/DeliveryController.php::resolve`; `backend/app/Support/OrderDeliveryProjection.php`; `web/src/admin/pages/Deliveries/Deliveries.jsx`; `web/src/buyer/pages/OrderDetails/OrderDetails.jsx`
- **Confirmed problem and evidence:** The admin resolution endpoint accepts only `RETURNED` and only when the delivery is `DELIVERY_FAILED`; it updates order/delivery status and writes an event. It does not create a buyer return request, record return-to-seller custody, update inventory, or trigger/record a refund. Buyer tracking displays return/failure states but has no corresponding request flow.
- **Expected behavior:** Failed delivery return-to-seller and buyer-initiated product return/refund should be distinct workflows with custody, decision, payment, inventory, and audit states.
- **Recommended fix:** Keep the current failed-delivery resolution narrowly named; design reverse logistics and customer returns separately after defining responsibility, proof, restocking, and refund rules.
- **Dependencies and regression risks:** Depends on BUY-01/03 and delivery state policy. Do not reuse `RETURNED` for multiple meanings without a migration/compatibility plan.
- **Proposed phase:** Phase 6
- **Test needed:** Failed delivery return, buyer return request, return-to-seller custody, refund/reversal, restock decision, duplicate action, and status visibility by each role.

#### LOG-02 — Courier earnings and chat routes are unavailable placeholders and not in courier navigation

- **Severity:** Low
- **Affected role:** Courier
- **Files/components:** `web/src/App.jsx` courier routes; `web/src/courier/layouts/CourierLayout.jsx`; `web/src/courier/pages/Earnings.jsx`; `web/src/courier/pages/Chat.jsx`; `web/src/courier/components/CourierWorkspaceUnavailable.jsx`
- **Confirmed problem and evidence:** `/courier/earnings` and `/courier/chat` are routed to unavailable-workspace placeholders, and the courier navigation lists only overview, pickups, deliveries, and history. No earnings or courier-chat API was found.
- **Expected behavior:** If courier earnings or messages are in scope, the pages should be discoverable and backed by authoritative data; otherwise avoid exposing dormant routes.
- **Recommended fix:** Confirm scope; implement payout rules/messaging as separate work or remove unused routes until planned.
- **Dependencies and regression risks:** Earnings depends on commission/payment and delivery compensation policy. Messaging needs role/recipient isolation.
- **Proposed phase:** Phase 6
- **Test needed:** Route discoverability and authorization; if implemented, payout reconciliation and courier-to-party message access tests.

**Verified logistics behavior:** Admin can configure delivery areas, assign eligible riders to seller pickups, process sorting/assignment, reassign with reasons, and resolve failed deliveries. Courier APIs scope records to the active/eligible courier profile and enforce expected-state transitions under transaction locks; delivery events record actor and status history. Buyer order projections expose delivery events/statuses. These are covered by `backend/tests/Feature/DeliveryWorkflowTest.php`. GPS tracking and delivery notifications are explicitly outside the present UI workflow.

### Phase 7: regression and release readiness

#### REL-01 — Production JavaScript is a single oversized chunk

- **Severity:** Medium
- **Affected role:** All roles
- **Files/components:** `web/src/App.jsx`; `web/vite.config.js`
- **Confirmed problem and evidence:** Production build succeeds but emits an 809.65 kB minified JavaScript chunk, above Vite’s 500 kB warning threshold. All role pages are statically imported from the root app.
- **Expected behavior:** Initial public storefront load should not require downloading every admin/seller/courier page.
- **Recommended fix:** Split role/workspace routes with lazy imports and verify shared dependencies and loading boundaries; avoid raising the warning threshold as a substitute for measurement.
- **Dependencies and regression risks:** Could change route loading, error boundaries, and authentication redirects. Confirm direct-route refresh and deployment fallback.
- **Proposed phase:** Phase 7
- **Test needed:** Build chunk report, route-load smoke tests, direct deep links, and representative mobile network performance.

#### REL-02 — Automated suite does not cover rendered role workflows

- **Severity:** Medium
- **Affected role:** All roles
- **Files/tests:** `web/package.json`; `web/src/**/*.test.js`; `backend/tests/Feature`
- **Confirmed problem and evidence:** Current frontend tests use `node --test` for pure utility/validation logic; no browser/component E2E suite is configured. Backend feature tests cover important API behavior but do not establish rendered navigation, dialogs, responsive layouts, or end-to-end role workflows.
- **Expected behavior:** Release checks should cover representative buyer checkout/chat/vouchers, seller fulfillment, admin approvals/finance, and courier pickup/delivery from rendered UI through API.
- **Recommended fix:** Add a small role-flow browser suite after the shared UI/API contracts stabilize; keep backend feature tests for authorization and financial invariants.
- **Dependencies and regression risks:** Requires deterministic test data and isolated database/environment. Never use production credentials or real payment services in tests.
- **Proposed phase:** Phase 7
- **Test needed:** Browser tests for key buyer checkout, seller status update, admin assignment/complaint, and courier transition flows at desktop and mobile widths.

#### REL-03 — Project documentation does not describe the current implementation

- **Severity:** Low
- **Affected role:** Engineering and operations
- **Files:** `FEATURE_IMPLEMENTATION_PLAN.md`, `AUDIT_REPORT.md`, `backend/README.md`, `web/README.md`
- **Confirmed problem and evidence:** The feature plan states that voucher routes/models/migrations and courier assignment/delivery APIs are absent, but those features exist in the current source. The prior audit describes auth-modal focus management as unverified, while the current `AuthModal` implements focus containment/restoration. Both project READMEs remain generic starter text.
- **Expected behavior:** Setup, architecture, current workflows, policy constraints, and known gaps should match the checked-out code.
- **Recommended fix:** Reconcile the plan/audit against current source and replace boilerplate setup documentation with tested local setup, environment prerequisites, migrations, scripts, and role workflow notes. Do not copy or publish environment secrets.
- **Dependencies and regression risks:** Documentation-only; ensure instructions do not imply that migrations were applied to a live database or that untested external services work.
- **Proposed phase:** Phase 7
- **Test needed:** Follow setup instructions in a clean local environment and verify every documented command and workflow.

## Shared-component dependency map

```text
Phase 1 foundations (fix these first)
  tokens.css + globals.css
       ├── shared accessible Toast / Alert
       ├── shared Dialog / Confirmation
       ├── common Button / Form / Table / status-label conventions
       └── role shells
            ├── buyer: BuyerLayout + BuyerNavbar
            ├── seller/admin: SellerLayout + AdminLayout + shared workspace styles
            └── courier: CourierLayout + CourierPages styles
                 │
                 ├── Phase 2 chat UI (depends on contextual conversation contract)
                 ├── Phase 3 voucher discovery/feedback (depends on eligibility policy)
                 └── Phase 4 checkout/order UI (depends on payment + shipping + return policy)
                              │
                              ├── Phase 5 admin KPIs, commissions, complaints
                              └── Phase 6 delivery/return/recipient notifications
                                          │
                                          └── Phase 7 role-flow regression + release
```

Recommended first shared surfaces: `web/src/styles/tokens.css`, `web/src/styles/globals.css`, `web/src/shared/styles/feedback.css`, then the buyer/admin/seller/courier layouts and a shared Toast/Dialog implementation. Keep API ownership, order status, payment, and delivery invariants server-authoritative; shared UI must not become a replacement for server validation.

## Specific concern verdicts

| Concern | Audit verdict |
|---|---|
| Generic Messenger-like chat | Partly confirmed. Inbox/thread layout is conventional; seller and support identities plus product labels exist. Product context becomes stale when the same buyer contacts the same seller about another product, and there is no order context. |
| Vouchers under My Account | Confirmed. Account listing and checkout application both work in source; shopping navigation has no voucher discovery entry. |
| Inconsistent page patterns | Confirmed. Role shells, styles, toast/alert semantics, modals, and status-label rendering are independently implemented. Shared color/spacing tokens and some accessible patterns do exist. |
| Missing/unclear popups or action results | Not a blanket failure. Checkout, seller, admin, and buyer pages have loading/error/success states, but behavior and accessibility differ; inventory toast lacks a live-region role and several custom dialogs do not share auth-modal keyboard handling. |
| Inconsistent role navigation/statuses | Confirmed at the UI level: buyer storefront navigation, admin/seller sidebars, and courier top navigation differ; status label formatting is duplicated and courier/admin pages often display raw underscore-replaced status values. API transition safeguards exist. |
| Shopping/delivery workflow gaps | Confirmed in payment settlement, shipping calculation, buyer complaint/cancel/return requests, commission generation/reporting, and notifications. Core pickup/sorting/delivery assignment and courier transitions are present. |

## Authorization, data integrity, and validation observations

- Protected API routes are grouped under `auth:sanctum` and `active`; buyer, seller, admin, and rider route groups apply role middleware. The route-list check confirmed representative buyer voucher, seller order, admin complaint/report, and courier delivery routes.
- Inspected ownership checks scope buyer orders/addresses/chat to the authenticated buyer, seller orders/chat to seller-owned items/conversations, and courier delivery/pickup records to the authenticated courier profile. Admin access is role-gated.
- Checkout validates input, recalculates product prices from active database rows, checks/decrements stock under transaction locks, restricts an order to one seller, revalidates a voucher at submission, stores voucher discount/redemption data, and detects duplicate checkout requests.
- Seller order updates and courier pickup/delivery updates enforce allowed status transitions; courier updates compare expected status and write delivery events.
- These are source-level observations, not a complete security assessment. No credentialed API fuzzing, live payment callback testing, external-mail delivery test, or production database migration was performed.

## Validation performed

| Command/action | Result |
|---|---|
| `npm run build --prefix web` | Passed. Vite 8.2.1 produced a 809.65 kB minified JS chunk and emitted the >500 kB chunk warning. |
| `npm run lint --prefix web` | Passed with no ESLint errors. |
| `npm test --prefix web` | Passed: 30 tests, 0 failures. |
| `Set-Location backend; php artisan test` | Passed: 99 tests, 763 assertions. PHPUnit used the in-memory SQLite test configuration from `backend/phpunit.xml`. |
| `Set-Location backend; php artisan route:list --path=api -v` | Passed. Representative admin, buyer, seller, and courier routes were present with their middleware. |
| `Set-Location backend; php artisan --version` / `php -v` | Laravel Framework 13.25.0; PHP 8.5.9. |
| `npm run dev --prefix web -- --host 127.0.0.1` + browser smoke | Public storefront rendered at a narrow mobile viewport; screenshot inspected. `GET /api/products` failed with `ERR_CONNECTION_REFUSED` because the Laravel API was not running. Direct `/admin/deliveries` navigation redirected to `/login`. No role credentials were used; authenticated buyer, seller, admin, and courier screens were not visually inspected. |

No secrets are included in this report. Build/lint/test results apply to the current working tree, which contained pre-existing changes. The frontend browser smoke confirms only the public shell at the inspected viewport; it does not establish API-backed shopping or visual correctness for authenticated roles.

## Highest-risk findings

1. **OPS-01 / OPS-02 / OPS-03:** Platform commission accounting is not connected to order creation, dashboard KPIs are literal zeroes, and admin revenue includes canceled orders.
2. **BUY-01:** GCash can be selected and an order placed without an in-app payment lifecycle or settlement state.
3. **BUY-02:** Shipping is always zero regardless of delivery area.
4. **BUY-03 / LOG-01:** Buyer complaint/cancellation/return requests are absent; failed-delivery return status is not a customer refund or reverse-logistics workflow.
5. **UI-03:** Buyer order, delivery, seller, and support notifications are still a visible placeholder.

## Phase 1 implementation record

Phase 1 was approved and implemented without changing backend behavior or later-phase workflows.

- **UI-01 — Partially addressed:** Added shared accessible toast/dialog primitives, connected buyer toasts and seller inventory feedback to them, made seller API validation messages visible and associated with their fields, and aligned the global type stack. Role-specific navigation and the broader button/table/status conventions remain intentionally distinct or outstanding.
- **UI-02 — Addressed for audited dialogs:** Added focus placement/trapping/restoration, Escape and backdrop handling, scroll locking, in-flight dismissal guards, portal placement, and viewport-bounded scrolling. Reused the dialog for authentication, checkout address/order confirmation, order receipt confirmation, seller inventory, and admin voucher dialogs.
- **UI-03 — Not implemented:** Notification persistence and event delivery remain outside this approved Phase 1 scope.
- **UI-04 — Addressed:** Global typography now uses one system font stack.

The implementation changed files under `web/src/shared/components/`, `web/src/styles/`, `web/src/auth/components/`, and the buyer, seller, and admin call sites described above. The worktree had substantial pre-existing edits; those changes were preserved and not staged or reverted.

### Phase 1 verification

| Command/action | Result |
|---|---|
| `Set-Location web; npm run lint` | Passed after correcting two new ref lint findings. |
| `Set-Location web; npm test` | Passed: 30 tests, 0 failures. |
| `Set-Location web; npm run build` | Passed. The generated minified JavaScript chunk is 812.93 kB and retains the existing >500 kB warning (Phase 0 baseline: 809.65 kB). |
| Browser smoke via local Vite | Verified the public storefront, authentication dialog focus containment/Escape close, and toast announcement/dismissal. Checked wide and narrow browser viewport layouts; a toast width overflow found during the check was corrected and rechecked. No authenticated seller/admin screens or backend-dependent workflows were visually tested. |
| Backend tests | Not run; Phase 1 changed no backend files or API behavior. |

Phase 0 remains the original audit baseline. Phase 1 is complete and awaits review; Phases 2–7 have not been started.

## Seller inventory usability extension

The seller inventory improvement was separately authorized after Phase 1. Scope stayed within product listing and its directly related buyer-facing media and sale-price display; seller orders, chat, dashboards, admin, and logistics workflows were not changed.

- Reworked the inventory listing and editor for clearer product information, optional store-unique SKU, regular and discounted prices, stock, listing status, media previews/removal, empty/loading/error feedback, and action confirmation.
- Added persistent product photo/video records and seller-owned CRUD validation. Product edits retain selected media and reject media-count, file-size, and aggregate-upload-limit violations.
- Published product media and discounted prices in buyer product data, displayed a multi-image/video gallery and sale pricing, and applied the discounted price to order and voucher server calculations.
- Media uploads are deliberately capped at 1.5 MB per file and 6 MB total per save to remain below the inspected local PHP defaults (`upload_max_filesize=2M`, `post_max_size=8M`). Deployments should confirm their PHP limits; raising the app upload caps requires matching server configuration.
- Ran `php artisan storage:link` locally so uploaded public media URLs resolve. A deployment must also create Laravel's public storage link.

### Inventory extension verification

| Command/action | Result |
|---|---|
| `Set-Location web; npm run lint` | Passed. |
| `Set-Location web; npm test` | Passed: 32 tests, 0 failures. |
| `Set-Location web; npm run build` | Passed. Minified JavaScript chunk is 830.23 kB and retains the >500 kB warning; no broad bundle refactor was attempted. |
| `Set-Location backend; php artisan test` | Passed: 107 tests, 806 assertions. Phase 0 baseline was 99 tests, 763 assertions. |
| Targeted seller inventory, buyer voucher, and checkout tests | Passed: 6, 9, and 13 tests respectively. |
| PHP syntax checks for changed backend files | Passed. |
| Authenticated browser verification | Not performed; seller inventory and media upload flows still need manual visual verification in a signed-in seller session. |

This extension does not start Phase 2 or any later audit phase.

## Seller parcel preparation and printable slip

The seller order workflow already supports `CONFIRMED → PREPARING → READY_FOR_PICKUP`. Its earlier “Print Waybill” action only invoked the browser's generic print command, so it did not produce a parcel label. That action is now a dedicated CRYMA parcel slip, shown while an order is being prepared.

- The 100 × 150 mm print layout includes the CRYMA order ID, seller/business contact, buyer name and delivery address, item names and quantities, payment method, and a Code 39 barcode encoding the internal numeric order ID.
- Seller contact fields are returned only on seller-owned order responses. The slip intentionally does not invent a seller return address; the current seller profile has no address field.
- This is **not** a carrier-issued waybill: there is no carrier integration, carrier tracking number, shipping fee, or carrier barcode. The barcode identifies only the CRYMA order.
- The Orders detail view now shows a packing guide while confirmed/preparing and clarifies that “Ready for Pickup” is the order status only. It does not maintain a separate packing state and does not expose pickup assignment or shipment tracking as seller-workspace features.

### Parcel slip verification

| Command/action | Result |
|---|---|
| `Set-Location web; npm run lint` | Passed. |
| `Set-Location web; npm test` | Passed: 34 tests, 0 failures, including Code 39 barcode tests. |
| `Set-Location web; npm run build` | Passed. Minified JavaScript chunk is 833.05 kB; the existing >500 kB warning remains. |
| `Set-Location backend; php artisan test` | Passed: 107 tests, 808 assertions. |
| Seller order API response test | Passed; verifies seller business/contact data appears in the authenticated seller order response. |
| Print preview in an authenticated seller browser session | Not performed; manually verify the 100 × 150 mm print size and label fit before using with a physical printer. |

Carrier-issued waybills, seller return-address management, and carrier pickup/shipping configuration remain future work requiring explicit carrier and logistics requirements.
