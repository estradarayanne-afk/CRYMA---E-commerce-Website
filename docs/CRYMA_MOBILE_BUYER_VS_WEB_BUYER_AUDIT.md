# CRYMA Mobile Buyer vs. Web Buyer Audit

**Review date:** 6 November 2026  
**Scope:** source-level comparison of the React Web Buyer, Flutter Buyer, and Laravel API/backend contracts.  
**Code changes at audit time:** none; this report was initially prepared as a read-only audit.  
**Validation limit:** no live API account, production database, emulator, or device session was available for the audit. Findings establish what the code requests and how it handles responses; they do not certify successful runtime transactions.

## Executive assessment

The buyer mobile app has a real backend-connected commerce core: sign-in/session restore, public catalog and product detail, cart-to-checkout, COD order creation, order reads, addresses, vouchers, profile/password operations, and (in the current source) product review reads/writes and buyer-to-seller/admin chat. These use the Laravel API rather than an independent mobile backend.

Mobile is **not at feature parity with Web Buyer**. The largest gaps are order cancellation/refunds, full order/catalog pagination and filters, seller storefront pages, richer chat content/attachments, and persistent wishlist/notifications. There are also correctness issues that can block registration, show fabricated shipment/rider information, leave profile data stale after a successful update, and share one local cart across signed-in accounts.

**Release assessment:** the essential browse-to-COD-checkout path is connected in source, but mobile buyer should not be considered parity-complete. Fix the P0 items below and verify them against a staging API before claiming end-to-end readiness.

## 1. Feature comparison

| Feature | Web Buyer | Mobile Buyer | Backend connection and parity finding |
|---|---|---|---|
| Sign-in, session, logout | Login/session through shared web API client and buyer route guard | `ApiService.login`, `restoreBuyerSession`, `logout` | Both use `/api/login`, `/api/user`, `/api/logout` and bearer authentication. Mobile checks the buyer role. Mobile logout removes auth keys but leaves its local cart; see account isolation issue. |
| Registration and email verification | Registration and OTP flow | Registration, valid-ID upload, OTP verification/resend | Same API family, but Flutter currently sends policy versions `1.0`; backend currently requires Terms `1.3` and Privacy `1.1`, so registration is rejected by the current validation configuration. Mobile also maps province to region and sends postal code `0000`. |
| Catalog/home | API-backed product cards and curated sections; web home loads a larger selection | API-backed home product list and local category navigation | `GET /api/products` is connected. Flutter discards paginator metadata and only requests search/category, so it cannot provide the same result depth, server-side filters, or pagination. |
| Search/category | Search, category, price/availability filters, sorting, and paginated results | Search/category API query; local sort in result screen | Search/category work against API; price bounds, stock filters, server-side sorting, and load-more parity are absent. Static recent/popular searches are local UI suggestions. |
| Product detail and reviews | Product detail, review list, seller/store links, cart/favorite actions | Product detail and review read/write are API-backed | `GET /api/products/{id}` and `/api/products/{id}/reviews`; `POST /api/products/{id}/reviews`. Product detail favorite and share controls currently have empty callbacks. |
| Seller storefront | Public `/stores/:slug` page with seller products/profile | No corresponding storefront route/screen | Mobile may show seller information and start a conversation, but has no equivalent public store browsing page. |
| Cart | Browser-local cart; logout clears buyer cart/wishlist | SharedPreferences cart | Both are local rather than server carts; checkout revalidates items on backend. Flutter cart key is global to the device and is not cleared on logout, unlike web. |
| Checkout | Address, voucher validation, order summary and COD submission | Address, voucher validation, order summary and COD submission | Both use checkout-data/address/voucher/order API contracts. Backend currently permits `cash_on_delivery`; both clients align. Server remains authoritative for stock, price, seller, voucher, and totals. |
| Orders list | Search, status/date/sort filters, pagination, cancel action | API-backed list with fixed status tabs and view action | Mobile fetches only the first API page, has no search/date/sort/cancel UI, and maps cancelled orders to a status without a corresponding tab. Backend already has cancellation route. |
| Order detail | Items, status/delivery timeline, cancel, confirm receipt, refund request/status | API-backed item/detail view and confirm received; review action | Mobile lacks cancel and refund flows although backend routes exist. Separate mobile tracking screen shows hardcoded carrier, tracking ID, events, and rider. |
| Delivery tracking | Order detail shows actual projected delivery/events from order API | Dedicated tracking page accepts an order ID but displays sample static data | `GET /api/orders/{id}` returns delivery projection/events; mobile tracking screen does not use it and has a nonfunctional rider chat path. |
| Addresses | API-backed address CRUD/default, checkout address management | API-backed address CRUD/default and checkout | Same buyer address API family. Registration uses a separate hardcoded location source and incorrect field mapping. |
| Vouchers | Browse/claim/validate; checkout validates against item/variant keys | Browse/claim/validate; checkout validates | Both use buyer voucher endpoints. Backend revalidates eligible products, variants, stock, seller, dates, limits and discount; no material business-rule divergence found in source. |
| Wishlist/favorites | `localStorage` persistence on web; not server-synced | Home favorite state is in-memory; wishlist screen is unavailable/placeholder | Neither platform has a buyer wishlist endpoint. Mobile does not persist equivalent to web and should clearly communicate device-local/unavailable behavior until a shared backend contract exists. |
| Reviews | Web review submission tied to completed order; public product reviews | Mobile review list and submission connected | Backend checks buyer/order/product eligibility and duplicates. Mobile currently defaults to 5 stars and requires a comment; web requires an explicit rating selection and allows an empty comment. |
| Buyer/seller support chat | Conversations, text, product context, order context, attachments/downloads, read state | Authenticated conversation list/show, text send/read, start seller conversation | Same buyer chat API family. Mobile supports core text chat but not attachment upload/download, order context, or web-equivalent shared-product presentation. |
| Notifications/order activity | Navbar derives order activity and local read time; no full buyer notification feed | Notification page is an honest unavailable state; category icon still shows a sample badge | No dedicated buyer notification API exists. Web’s activity view is not a full notification service; mobile’s badge implies unread content it cannot load. |
| Account/profile/password | Profile update, image upload/display, password update | Profile update and password update | Profile update endpoint is called, but mobile reads the wrong response key and does not refresh cached user. Mobile profile image editing is absent. Password endpoint is connected. |
| Help/support | Buyer support chat; help content/links | Help center and customer service entry points | Chat can use real buyer chat. Verify static help text against backend policy: mobile help currently says orders can be cancelled within 24 hours, while eligibility is controlled by backend order-state rules and not that fixed statement. |

## 2. Critical and high-priority findings

### P0 — Registration is incompatible with current policy versions

- Flutter sends `terms_version: 1.0` and `privacy_version: 1.0` in `mobile/cryma-flutter-app-main/lib/screens/register_account_screen.dart:110-129`.
- Current backend config is Terms `1.3`, Privacy `1.1` in `backend/config/policies.php:3-5`.
- `RegistrationController` validates exact equality to configured versions at `backend/app/Http/Controllers/Api/RegistrationController.php:68-70`; with this repository configuration, the mobile request fails validation.
- The same Flutter payload maps `region` from the selected province and hardcodes postal code `0000` (`register_account_screen.dart:119-125`). The backend persists the submitted location fields (`RegistrationController.php`, address assignment in the registration transaction), so those values can create inaccurate account addresses even after policy versions are corrected.
- Flutter registration location options originate from local data in `register_address_screen.dart`, not a location API, despite the screen’s API-based wording.

**Fix:** have the app receive the active policy versions from a backend contract or a single versioned shared configuration; submit the actual region/province hierarchy and a valid postal code; add a request/validation integration check for the current contract.

### P0 — Tracking page fabricates shipment and rider details

- `mobile/cryma-flutter-app-main/lib/screens/order_tracking_screen.dart:21-70` hardcodes J&T Express, tracking number `1234567890`, a delivered/in-transit timeline, locations, and rider identity/phone. `orderId` is accepted but those values are not derived from it.
- The “Chat with Rider” action routes to a generic conversation without a conversation ID; the conversation screen requires a selected real conversation. The buyer chat API has no rider messaging route.
- The backend order endpoint already projects real delivery and event data (`BuyerOrderController::show`, `backend/app/Http/Controllers/Api/BuyerOrderController.php:174-180` and route `GET /api/orders/{id}` in `backend/routes/api.php`).

**Fix:** bind tracking to the order-detail API’s delivery projection/events and show an explicit unavailable state when tracking data is absent. Remove the rider identity/chat affordance unless a rider contact contract exists. Link tracking from the actual order detail flow.

### P1 — Mobile omits cancellation and refund workflows available on Web Buyer

- Backend exposes `POST /api/orders/{id}/cancel`, `POST /api/orders/{id}/confirm-received`, and `POST /api/orders/{id}/refund-requests` in `backend/routes/api.php:240-242`.
- Web order list/detail exposes cancellation and refund request/status (`web/src/buyer/pages/Orders/Orders.jsx`, `web/src/buyer/pages/OrderDetails/OrderDetails.jsx:357-374,464-480,875-900`).
- Flutter API service exposes order list/detail and confirm-received, but no cancel/refund methods (`mobile/cryma-flutter-app-main/lib/services/api_service.dart`, `getBuyerOrders`, `getBuyerOrder`, `confirmOrderReceived`). `MyOrdersScreen` only loads rows and opens details; `OrderDetailsScreen` confirms receipt/reviews but has no cancellation or refund UI.

**Fix:** implement mobile API methods matching existing routes and use server responses/eligibility as authoritative. Mirror web’s cancellation eligibility, refund request amount/reason validation, and request status display; do not invent client-only eligibility rules.

### P1 — One device cart is shared across buyer accounts

- `CartStore` stores all cart contents under one global `cryma_cart_items` key (`mobile/cryma-flutter-app-main/lib/services/cart_store.dart:5-17`).
- `ApiService.logout()` removes token and user keys only (`mobile/cryma-flutter-app-main/lib/services/api_service.dart:129-142`); it does not clear or scope the cart.
- Web logout explicitly clears its local cart/wishlist (`web/src/buyer/pages/Account/Account.jsx:437-442`; also buyer navbar logout flow).

**Impact:** a second person signing in on the same device can see or check out the previous account’s cart.  
**Fix:** scope the local cart key to the authenticated buyer ID and clear/switch safely on logout/account change, while retaining anonymous cart behavior deliberately if desired.

### P1 — Profile update succeeds but cached mobile profile stays stale

- `EditProfileScreen._handleSave()` PATCHes `/api/account/profile` then reads `response['user']` (`mobile/cryma-flutter-app-main/lib/screens/edit_profile_screen.dart:57-80`).
- `AccountController::updateProfile()` responds with `data`, not `user` (`backend/app/Http/Controllers/Api/AccountController.php:81-85`).
- The API write can succeed and the UI reports success, while SharedPreferences still contains the old user shown elsewhere in the account screen.

**Fix:** consume `response['data']`, update the cached session profile, and refresh any dependent account UI from that canonical result.

### P1 — Mobile silently loses older orders and products

- Backend orders paginate at 10 rows (`BuyerOrderController.php:163-170`); the products endpoint uses pagination as well.
- `ApiService.getBuyerOrders()` and `getProducts()` extract only `data.data` and return rows, discarding current/last page and links (`mobile/cryma-flutter-app-main/lib/services/api_service.dart:162-180`, and the order-list method later in the file).
- Web order/catalog pages retain pagination/filter state; mobile has no load-more path.

**Fix:** return a typed paginated result from the mobile service, add next-page/load-more behavior, and retain search/filter/sort query parameters where the backend supports them.

## 3. API and business-logic trace

### Correctly aligned source paths

- **Authentication:** Flutter stores bearer token/user after `/api/login`, verifies role, restores via `/api/user`, and calls `/api/logout`; the shared web API client also attaches auth and handles expired sessions.
- **Catalog:** Flutter `getProducts()` calls `GET /api/products`; product detail calls `GET /api/products/{id}`. These are the public catalog routes.
- **Checkout:** both clients submit item IDs/variant IDs/quantities, address, payment method, voucher data, and idempotency information to order creation. Backend recalculates price/stock and applies eligibility in the transaction. Both currently select COD, matching `BuyerOrderController` validation (`payment_method` currently only `cash_on_delivery`).
- **Addresses and vouchers:** Flutter calls buyer address CRUD/default and voucher list/claim/validate endpoints. Backend validates voucher eligibility and checkout items, so client-displayed totals are previews rather than authority.
- **Reviews:** mobile now uses public `GET /api/products/{id}/reviews` and authenticated `POST /api/products/{id}/reviews` (`api_service.dart:191-215`). Backend requires a valid completed buyer order containing the product and rejects duplicate reviews (`ReviewController::store`, `backend/app/Http/Controllers/Api/ReviewController.php:90-105,160-185`).
- **Chat:** mobile’s current service uses buyer conversation list/show/send/read and start-seller routes. These are backend-backed text conversations; richer web attachment/order-context behavior is not yet represented in mobile.

### Business-logic mismatches and misleading content

1. **Review input:** `RateFeedbackScreen` initializes `_rating = 5` and blocks blank comments (`rate_feedback_screen.dart:13-20,50-62`). Backend comment is nullable (`ReviewController.php:95-105`) and web lets the buyer choose a rating explicitly. Set rating initially unselected and make comment optional to match backend/web.
2. **Cancellation help text:** `help_center_screen.dart` says an order can be cancelled within 24 hours. Backend cancellation is based on current order state/eligibility; a fixed window in help can mislead users. Derive eligibility from server response and update help copy to match the actual controller rule.
3. **Order status coverage:** `MyOrdersScreen._orderFromJson()` maps `CANCELLED` and `DELIVERY_FAILED` to `Cancelled`, but tabs contain no Cancelled filter (`my_orders_screen.dart:40-51,94-105`). Those orders appear only under All. Add status coverage or a status filter.
4. **Idempotency persistence:** Flutter creates an idempotency key for checkout, but it is held in screen/session state; Web persists its key in `sessionStorage`. If the mobile process exits after a timeout but before learning whether the server committed, retrying can create a second intent with a new key. Persist the pending key until a definitive response/order lookup.
5. **Registration address hierarchy:** `region` is populated from `province`, and postal code is fabricated. The backend’s valid fields and persisted address should be checked against correct Philippine location IDs/names.

## 4. Other incomplete or missing mobile behavior

- **Dead product controls:** product detail favorite and share buttons have empty callbacks (`mobile/cryma-flutter-app-main/lib/screens/products_detail_screen.dart:635,645`). Either connect them to actual platform/local behavior or remove/disable them with clear feedback.
- **Storefront discovery:** Web Buyer can open seller stores; mobile has no equivalent screen/route.
- **Chat parity:** Web supports attachments and file downloads, order context, and product sharing. Mobile is text-only and does not expose equivalent content/actions. Both should continue using backend authorization for conversation ownership.
- **Favorites:** there is no buyer wishlist endpoint in Laravel. Web persists IDs in browser local storage; mobile favorites on the home view are not durable. Do not imply account-level cross-device sync until backend support exists.
- **Notification badge:** there is no buyer notifications API. Web navbar derives order activity from orders and a local read timestamp; mobile notification screen is unavailable, but `CategoriesScreen` still displays a hardcoded badge. Remove the false unread count or connect it to a real source.
- **Customer support:** buyer chat can be connected; email/phone/FAQ actions should only be exposed when they have confirmed destinations. No backend notification/support feed should be implied.
- **Large catalogs:** mobile home/search currently loads one page; product lists can look complete while older results are unreachable.
- **Images:** verify all product image fallbacks remain neutral and never substitute another product’s image when API image is unavailable.

## 5. Recommended remediation roadmap

### P0 — Correctness and trust

1. Fix registration policy-version payload and location/postal data; verify current Terms/Privacy acceptance contract.
2. Remove fabricated tracking timeline, carrier, tracking number, rider identity, and rider chat; render only backend-provided order delivery events.
3. Fix profile response handling so a successful update refreshes the cached user.
4. Scope/clear cart by buyer account to prevent cross-account data leakage.

### P1 — Essential Web Buyer parity

1. Add mobile cancellation and refund request/status using existing API routes and server eligibility.
2. Add paginated orders/products and web-supported query options (search/status/date/sort/category/price/stock where endpoint supports them).
3. Complete order tracking from order details and expose backend events/status consistently.
4. Align review rating/comment validation with Web Buyer and backend.
5. Remove dead share/favorite controls or implement them honestly; remove false notification badge.
6. Update help content so cancellation guidance matches backend eligibility.

### P2 — Secondary parity and polish

1. Add seller storefront browsing on mobile.
2. Add chat attachments, product sharing, and order-context actions supported by the existing chat routes.
3. Decide and document wishlist persistence. For cross-device parity, add an authenticated backend contract in a separately approved backend phase; until then, label the behavior as local-only.
4. Add a real buyer notification contract if a notification feed is required. Align web/mobile once it exists.

## 6. Verification and limitations

- Reviewed source routes, service calls, payload creation, backend request validation, screen state handling, and local persistence paths.
- No application source was modified and no tests were run because this task requested an initial read-only review.
- No live credentials, device/emulator, or staging endpoint was used. API availability, real response shapes under deployed data, image delivery, checkout transactions, and device lifecycle behavior remain unverified.
- The backend and web app are treated as the feature/business-rule references for this comparison; a source-level match does not prove production deployment is running the same revision/config.

## Final parity verdict

Mobile Buyer is **partially integrated** and supports a meaningful API-backed purchase flow, but it is **not feature-parity complete** with Web Buyer. Registration incompatibility, sample order tracking, stale account cache, and cross-account cart storage should be corrected before release. Order cancellation/refunds and pagination are the clearest essential parity gaps because the required backend endpoints already exist. Wishlist and full notifications require product/backend decisions because neither has an account-scoped buyer API today.

## Remediation implementation review — 6 November 2026

The recommendations above have since been implemented in the buyer Flutter client, with one public read-only Laravel policy-version endpoint added so registration can submit the versions currently required by server validation. No schema or migration changes were made.

- Registration now fetches the active Terms and Privacy versions and uses PSGC region/province/city/barangay data plus the entered postal code instead of fabricated policy versions and address values.
- Product and order lists now retain pagination metadata and support server-side catalog filters and order search/date/sort queries. Order detail exposes backend-authorized cancellation/refund actions, and tracking reads the order delivery projection/events instead of sample carrier/rider data.
- Favorites persist locally like Web Buyer and are explicitly device-local; cart storage is scoped to the buyer account and cleared on logout. The false notification badge was removed; the mobile activity screen uses real recent orders and does not claim a dedicated notification feed.
- Storefront browsing, review-input parity, product sharing, order-aware chat, support image upload/download, and profile-image editing are connected to existing API capabilities. Profile changes and an optional image now submit in one request.
- The existing buyer Flutter test suite passed (**14 tests**), the touched Dart files passed `dart analyze` with no errors (style/deprecation infos remain), and `backend/routes/api.php` passed PHP syntax validation.
- A full Android debug build completed successfully (`flutter build apk --debug`).

Wishlist synchronization, a full buyer notification feed, and a signed-in buyer's complete review-history listing remain unavailable because the backend has no corresponding buyer contracts. Local favorites, product-scoped review lists, and order-derived activity are the current honest behavior. Live staging-account and device checks are still required to verify deployed API behavior and media delivery; therefore this source-level remediation does not claim production end-to-end certification or complete feature parity.
