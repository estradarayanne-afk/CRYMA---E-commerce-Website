# CRYMA Web — Missing Features Requirements and Implementation Plan

**Status:** Planning only. No application code, schema, migrations, or existing records were changed for this plan.

**Scope:** React/Vite Web application and its Laravel API. The separate Flutter application is out of scope.

**Reviewed:** 2026-10-21.

## Verified current state

- **Cart and wishlist:** `web/src/shared/utils/buyerAccess.js` reads and writes both in `localStorage`; the helpers return empty state unless a buyer session exists. They do not synchronize across browsers or devices. Existing guest flows request sign-in for protected actions.
- **Checkout:** `backend/app/Http/Controllers/Api/BuyerOrderController.php` recalculates product prices from active database products, checks stock in a transaction, locks product rows, and restricts an order to one seller. It stores `shipping_fee = 0`. Payment method accepts `cash_on_delivery` or `gcash` and records the selection; no gateway settlement is present.
- **Courier:** courier registration creates a courier profile and vehicle, but current courier pages display an unavailable-workspace message. Routes, assignment/delivery records, tracking, and earnings logic are absent.
- **Vouchers:** no voucher routes, controller, model, or migration were found.
- **Buyer notifications:** no buyer notification routes or feature-specific persistence were found. Admin announcements are a separate feature and are not order/message notifications.
- **Seller messaging:** current seller chat page explains that messaging is unavailable. The existing conversation schema and routes implement buyer/admin support, not buyer/seller conversations.
- **Review replies:** sellers can view reviews for their products. The review schema stores buyer, product, order, rating, and comment; it has no seller reply data or endpoint.
- **Email and browser verification:** OTP generation, hashing, expiration, resend, verification, and throttled routes exist. Automated mail fakes verify that Laravel attempts to send; real mailbox delivery and full browser workflows have not been confirmed.
- **Existing functionality to preserve:** buyer/admin support chat, registration and administrator approval, buyer orders, seller order/product management, and product reviews are present. Do not merge support conversations with future seller conversations.

## Feature requirements and implementation plan

For all proposed mutations, enforce permissions and validation on the server. Frontend checks improve usability but are not authorization or financial controls. Use database transactions and constraints for invariants, and keep secrets in environment/configuration rather than source code.

### A. Courier and delivery

**Verified:** Courier accounts and vehicles can be registered and reviewed. There is no delivery assignment or courier API/workflow.

**Proposed first workflow:** An administrator manually assigns an eligible order to an approved courier. The courier sees only assigned deliveries and can make allowed status transitions. Buyer and seller see the order’s delivery status and timestamps. Keep existing seller order statuses and delivery statuses distinct. Do not add GPS or automatic dispatch.

- **Users/permissions:** Admin assigns/reassigns; an approved courier views and updates only their assignments; buyer sees their own order; seller sees only orders containing their products. No courier can select arbitrary orders or another courier’s delivery.
- **Screens:** Admin assignment panel and assignment confirmation; courier assigned-deliveries, delivery detail, history; buyer/seller order tracking timeline. Earnings UI waits for an approved earning/payout definition.
- **API candidates:** Admin list eligible orders and approved couriers; assign/reassign delivery; courier list/show/update delivery status; buyer/seller read-only delivery timeline. Names and payloads should be finalized with existing route conventions before implementation.
- **Data candidates:** Delivery/assignment record related to order, courier profile, assigning admin, status, timestamps, and an audit trail for reassignment/status changes. Avoid putting a courier ID directly on unrelated records unless the approved lifecycle supports it.
- **Validation/security:** Require approved/active courier; confirm order is eligible and not canceled/completed; restrict transitions; transactionally lock order/assignment during assignment; scope every query by role and owner; retain an audit trail.
- **Edge cases/tests:** Concurrent assignments, reassignment, suspended courier, canceled order, duplicate status request, invalid transition, order with multiple sellers, access to another courier’s order, and buyer/seller visibility.
- **Dependencies/decisions:** Confirm assignment is manual by admin; define eligibility point, reassignment rules, exact statuses and who may set them, delivery failure/return handling, proof-of-delivery requirements, service areas, and whether courier earnings are in scope. Define rates, deductions, and payout rules before showing earnings.

### B. Vouchers

**Verified:** No voucher backend exists.

- **Users/permissions:** Admin creates and disables vouchers; buyers can discover/apply eligible vouchers; checkout validates and redeems them. Sellers should not manage platform vouchers unless explicitly approved.
- **Screens:** Admin voucher list/create/edit/disable; buyer voucher list and checkout selection/code entry; checkout displays server-validated discount and reason when ineligible.
- **API candidates:** Admin CRUD/list; authenticated buyer list eligible vouchers or validate/quote a code; order submission accepts a code/identifier and returns the authoritative applied discount. A separate “validate” call is advisory; final validation and redemption must happen inside order creation.
- **Data candidates:** Voucher definition (code, type, value, active window, limits, eligibility rules); redemption record linked to voucher, buyer, and order. Preserve a snapshot of the applied discount on the order.
- **Validation/security:** Never trust a client-supplied discount or total. Lock the voucher during final redemption, enforce global and per-buyer limits, and use a unique redemption constraint where policy permits. Normalize codes and avoid leaking other users’ redemption history.
- **Edge cases/tests:** Expired/not-yet-active code, disabled code, threshold boundary, wrong seller/category, exhausted limit, repeat checkout, simultaneous last-use redemption, canceled/refunded order, rounding and discount cap.
- **Dependencies/decisions:** Approve fixed vs percentage discount, cap, minimum spend, eligible products/sellers, stacking, shipping inclusion, timezone, global/per-user limits, cancellation/refund restoration, code case rules, and whether vouchers are platform-funded or seller-funded.

### C. Notifications

**Verified:** No buyer event-notification API/persistence was found. Existing admin announcements are not a substitute.

- **Users/permissions:** Recipients see only their own notifications. Admin event access must follow existing role permissions. Email and in-app notification preferences should be treated separately.
- **Screens:** Notification list/panel with unread count, detail or destination link, mark-read and mark-all-read, pagination, loading/empty/error states. Preserve the current in-app viewing pattern.
- **API candidates:** List/paginate own notifications; mark one/all read; optionally delete/archive if retention policy requires it. Internal event listeners/services create notifications; do not expose an endpoint that lets clients create arbitrary notices.
- **Data candidates:** Laravel database notifications or a dedicated notification table, with recipient, event type, safe payload, read timestamp, and timestamps. Add event delivery/outbox tracking only if required for reliable asynchronous mail.
- **Validation/security:** Allowlist event types and payload fields; do not store secrets or unnecessary identity data; scope every read/update to recipient; escape rendered content; make handlers idempotent; notify only after committed business changes.
- **Edge cases/tests:** Duplicate event, deleted/disabled account, unread count pagination, concurrent mark-read, failed email while in-app notification succeeds, retry without duplicate notice, and unauthorized ID access.
- **Dependencies/decisions:** Approve event catalog and recipients (registration decisions, order state, messages, delivery, payment, vouchers), retention, read/archive behavior, email opt-in/mandatory notices, locale, and delivery retry policy.

### D. Seller messaging and review replies

**Verified:** Current conversations are buyer/admin support conversations (`buyer_id`, nullable `admin_id`). Seller chat has no endpoint. Reviews have no reply field/table.

- **Users/permissions:** Buyer starts a conversation with the seller of a product/order; that seller and buyer alone can read or message it. Admin moderation access requires an explicit policy. Seller may reply only to reviews for a product they own.
- **Screens:** Buyer product/order “Contact seller” entry and conversation history; seller conversation inbox and detail. Keep it visually and logically separate from CRYMA support. Review reply editor and displayed reply only if approved.
- **API candidates:** Create-or-return buyer/seller conversation with optional product/order context; list/show/send/mark-read scoped to participant; list seller reviews; create/update a permitted review reply. Keep `/buyer/chat/...` and `/admin/chat/...` support routes unchanged.
- **Data candidates:** Conversation participant relation for buyer and seller, context links, timestamps/read state; message records. For replies, either a reply table with review/seller/timestamps or columns on reviews if only one immutable/editable reply is approved.
- **Validation/security:** Verify the buyer/seller relationship to the product/order; approved active seller; both participants on every action; message size and whitespace rules; rate limits and abuse reporting; unique conversation key for the chosen context; seller ownership on reply create/update; no arbitrary sender IDs.
- **Edge cases/tests:** Product changes owner, archived product, multiple orders with one seller, repeated conversation creation, blocked/deactivated account, removed review, duplicate reply, edited reply, IDOR attempts, unread/read state, support chat remains unaffected.
- **Dependencies/decisions:** Decide whether messaging is product-based or order-based (or both), whether pre-purchase contact is allowed, conversation uniqueness, attachments, blocking/reporting/moderation, seller reply edit/delete policy, and reply notification behavior.

### E. Shipping

**Verified:** Order creation records a zero shipping charge. Checkout currently has no server-side rate calculation.

- **Users/permissions:** Buyer supplies/chooses a valid delivery address and sees the server quote. Admin configuration (if rates are configurable) is admin-only. Seller/courier see only authorized delivery details.
- **Screens:** Checkout delivery-address selection and shipping quote/charge with clear unavailable/changed quote state; order summary and order detail show the persisted charge and any later adjustment policy.
- **API candidates:** Quote endpoint using a validated destination/cart, plus final order request referencing a quote or requesting authoritative recalculation. Final total and fee are always recomputed or validated server-side.
- **Data candidates:** Persist shipping fee and address snapshot (existing `shipping_fee` and `delivery_address` fields exist); optionally quote/rate version, service, and delivery record only after the rule is approved.
- **Validation/security:** Validate locality hierarchy against trusted source; do not trust client fee/total; protect address data; bind quotes to buyer/cart/destination and expire them if rates or cart change.
- **Edge cases/tests:** Unsupported area, changed address/cart, stale quote, zero-cost rule, rounding, canceled order, multi-seller restriction, and concurrent checkout.
- **Dependencies/decisions:** Approve service coverage, pricing basis (flat/zone/weight/distance/seller), who pays, free-shipping threshold, delivery partner, quote duration, taxes, and whether current zero charge is intentional. No rates should be invented in code or policy.

### F. GCash payments

**Verified:** Checkout accepts and stores `gcash`; this is not proof of successful payment. No confirmed gateway settlement or callback processing exists.

- **Users/permissions:** Buyer initiates payment through an approved provider; server verifies provider callbacks. Admin can inspect payment status under role authorization. Sellers/couriers must not mark an online payment settled.
- **Screens:** Checkout clearly explains the payment handoff; order/payment status and retry/cancel states; admin payment details only as operationally required. Do not show “paid” solely from frontend return navigation.
- **API candidates:** Server creates provider payment intent; authenticated buyer can view own payment status; unauthenticated provider webhook verifies signature and idempotently updates payment/order; reconciliation endpoint/job is staff-only.
- **Data candidates:** Payment transaction linked to order with provider reference, amount/currency, status, timestamps, sanitized provider response, and idempotency key. Store no card/wallet secret or raw credentials.
- **Validation/security:** Provider signature verification, amount/currency/order matching, replay protection, idempotent callbacks, state machine, request timeouts, secret management, audit logs, and no logging of credentials/payment secrets.
- **Edge cases/tests:** Declined, abandoned, delayed/duplicate/out-of-order webhook, invalid signature, amount mismatch, timeout, refund/chargeback, repeated payment attempt, order cancellation, provider outage.
- **Dependencies/decisions:** Select provider and merchant account, sandbox/production credentials, supported payment states, refund/void workflow, settlement reconciliation, fee handling, and when inventory is reserved/released. Keep COD available if approved; do not represent GCash as settled until verified.

### G. Cart and wishlist persistence

**Verified:** Buyer cart/wishlist are local browser data. The server revalidates products and stock at checkout, which must remain authoritative.

- **Users/permissions:** Guest browsing can remain local; authenticated buyers may synchronize across devices. No other role may read a buyer’s saved cart or wishlist.
- **Screens:** Existing cart/wishlist behavior plus sync/loading/error states, sign-in merge prompt, conflict feedback, and unavailable/archived product handling.
- **API candidates:** Authenticated buyer read/upsert/remove/clear cart lines and wishlist entries. Use batch operations with bounded item counts and quantities; never accept price snapshots as authoritative.
- **Data candidates:** Buyer-owned cart and cart item/product relation; buyer wishlist relation, ideally unique by buyer/product. Consider whether cart is one active cart or multiple named carts only if requested.
- **Validation/security:** Verify buyer ownership and product existence; re-read current price/status/stock for display and checkout; quantity limits; unique rows; CSRF/auth conventions; rate limits and transaction-safe merge.
- **Edge cases/tests:** Guest-to-account merge duplicates, stale local product, archived product, concurrent edits on two devices, logout/login as another user, cleared storage, stock changes, idempotent retry.
- **Dependencies/decisions:** Approve cross-device persistence, guest-cart merge rules, whether wishlist survives logout, cart retention/expiry, variant support (only if the product model supports variants), and conflict strategy.

### H. Email and end-to-end testing

**Verified:** OTP attempts are rate-limited and email is sent through Laravel. Existing tests fake mail. Real mailbox delivery and a complete browser run remain unverified.

- **Users/permissions:** Use test-only buyer/seller/rider accounts and an administrator account in an isolated environment; never use real customer identity data for test fixtures.
- **Screens/workflows:** Test registration by role, document upload, OTP receipt and verification, admin approval/rejection, login/access gates, seller workflows, buyer discovery/cart/checkout/orders/support, and the currently unavailable courier pages. Include responsive viewport checks.
- **API/config:** Configure a controlled SMTP sandbox/mailbox through local environment settings; keep credentials out of source and reports. Confirm Laravel’s active mailer and clear cached config after changing environment values when config is cached.
- **Data/security:** Use a disposable database and private test document storage; clean only test records/files after explicit fixture ownership is confirmed. Keep real mail recipients restricted to controlled mailboxes.
- **Tests:** Backend feature tests for auth/roles/ownership/payment callback/idempotency/validation; frontend unit/component tests for states and permissions; browser automation for real route interactions; separate sandbox webhook tests.
- **Edge cases:** Mail delay/bounce, resend, expiry, throttling, upload failure, approval pending, API timeout, duplicate click, stale cart, role switching, mobile overflow, and broken deep links.
- **Dependencies/decisions:** Provide a controlled mailbox, SMTP sandbox credentials, browser automation availability, admin test account, provider sandbox if GCash proceeds, and a safe disposable database configuration. A fake mail assertion proves only that Laravel attempted to send, not inbox delivery.

## Priority and recommended sequence

| Order | Work | Importance / risk | Dependencies and gate |
|---|---|---|---|
| 0 | Approve delivery, shipping, payment, voucher, messaging, and notification policies | Highest; prevents coding unsafe assumptions | Owner decisions below |
| 1 | Protect the live checkout path: define shipping rules; keep COD semantics clear; integrate and verify GCash only after provider approval | High financial risk; GCash is not settled today | Shipping policy, provider/merchant sandbox, payment state and refund rules |
| 2 | Add manual delivery assignment and status history | High operational importance; no dispatch exists | Approved status/eligibility rules, approved courier state, shipping coverage |
| 3 | Add in-app notifications from committed order, payment, delivery, approval, and message events | Broad user impact; depends on event definitions | Event/recipient catalog and notification retention policy |
| 4 | Add vouchers with transactional redemption | Financial risk; independent of courier but affects order totals | Discount, eligibility, funding, stacking, cancellation/refund rules |
| 5 | Add buyer/seller conversations and (if approved) review replies | Improves marketplace trust and communication | Participant model, moderation and reply policy |
| 6 | Add authenticated cart/wishlist synchronization with guest merge | Quality-of-life; checkout currently works with browser state | Persistence/retention and merge decisions |
| 7 | Run controlled-mailbox and browser end-to-end regression; repeat after each release | Release gate for real operational use | Test services, isolated data, browser availability |

**Complexity:** Payment integration, delivery lifecycle, and transactional voucher redemption are high; notification infrastructure and participant messaging are medium-high; cart/wishlist sync is medium. Email/browser QA is low-to-medium engineering effort but blocked on test environment access. These estimates are directional and should be revisited after provider and business decisions.

## Owner decisions required before implementation

- [ ] Is courier assignment manual by an administrator? Define eligible order statuses, reassignment, status transitions, failure/return, proof of delivery, coverage, and assignment audit.
- [ ] Are courier earnings required? If yes, define rates, deductions, payout schedule, dispute handling, and visibility.
- [ ] Define shipping coverage and rate calculation. Confirm whether zero shipping is intentional during the interim.
- [ ] Select/approve GCash payment provider and merchant account; define sandbox/production use, payment states, inventory reservation, refunds, and reconciliation.
- [ ] Define voucher discount types, funding, eligibility, stacking, limits, expiry timezone, cancellation/refund restoration, and code rules.
- [ ] Approve notification events, recipients, in-app retention, email policy, and retry/duplicate behavior.
- [ ] Decide seller messaging context (product, order, or both), pre-purchase contact, moderation/reporting, attachment policy, and conversation uniqueness.
- [ ] Decide if sellers may reply to reviews, whether replies can be edited/deleted, and how they are moderated.
- [ ] Approve cross-device cart/wishlist persistence, guest merge rules, retention, logout behavior, and conflict resolution.
- [ ] Provide controlled SMTP mailbox and sandbox credentials through secure local configuration, isolated database/storage, and an available browser test environment.

## Risks and blockers

- Enabling GCash as though it were paid, or displaying shipping promises/rates without an approved calculation, creates financial and consumer-trust risk.
- Courier delivery and earnings cannot be implemented correctly until assignment, status, coverage, proof, and payout rules are agreed.
- Voucher redemption can overspend discounts unless limits, ownership, and concurrency behavior are explicit and database-enforced.
- New notification and conversation tables require safe migrations and ownership tests; do not apply migrations to the working database during planning.
- Real email and full browser E2E claims require controlled services and test identities. Current automated mail fakes cannot establish delivery.

## Implementation gate

This document records requirements and options only. Do not add endpoints, schema, or workflows until the owner decisions above are approved. When approved, implement in small groups with focused migrations, ownership and transaction tests, and staged browser verification. Do not modify the Flutter application.
