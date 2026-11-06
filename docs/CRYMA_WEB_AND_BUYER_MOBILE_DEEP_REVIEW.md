# CRYMA Web and Buyer Mobile Deep Review

**Review date:** 6 November 2026  
**Scope:** Web React application (guest, buyer, seller, admin, logistics, hub staff), Laravel API route/controller contracts, and the buyer Flutter application. Courier/rider interfaces are explicitly deferred and were not audited in this review.  
**Method:** source-level review of route definitions, shared API clients, screen/service call sites, representative workflows and state handling, plus automated frontend control/link scan. No source code, backend, API, database, or mobile app files were changed for this review.

## Executive summary

CRYMA's web app has broad role coverage and its primary commerce and operations screens are built around Laravel endpoints. The shared web Axios client attaches the bearer token, resolves storage URLs, and handles expired sessions. Public shopping, buyer checkout/orders, seller inventory/orders, admin operations, logistics parcel flows, and hub-staff custody actions have corresponding backend route groups.

The main completion risk is not that the whole web app is disconnected. It is that some user-visible destinations imply functionality that does not exist, and the buyer Flutter app still contains demo-only features beside a real commerce integration. In particular, mobile chat, reviews, wishlist, notifications, and customer-support actions are hardcoded or local-only. This is a trust issue: some screens show fabricated records or success feedback without persisting anything.

**Assessment:** web core workflows are substantially API-backed, subject to role-account/live integration testing. The buyer mobile app is **partially connected**: sign-in, catalog, cart-to-checkout, orders, addresses, vouchers, and profile/password operations use the API; several secondary but prominent features do not. The current source and test suite cannot substantiate a claim that every workflow works end to end.

## 1. Architecture and route coverage

### Web

- `web/src/App.jsx` maps guest, buyer, seller, admin, logistics, hub-staff, and rider paths. This review covers guest through hub-staff only; courier/rider paths are out of scope. Role-gated routes use `ProtectedRoute`; hub-staff pages are lazy-loaded and use the assigned-hub backend boundary.
- `web/src/shared/services/api.js` sets the API base from `VITE_API_URL`, attaches the stored bearer token, rewrites relative `/storage/` URLs, and clears local auth on 401 responses.
- Feature pages call endpoints in `backend/routes/api.php`; representative in-scope coverage includes buyer catalog/cart/order/voucher/address/review/chat, seller product/order/voucher/storefront/chat/return/report, admin user/registration/finance/compliance/chat, logistics parcel/rider/report, and hub-staff scans/transfers.
- A JSX scan across `web/src` found no inert buttons and no empty or `#` anchors after the homepage's two dead social controls were removed. This is a source scan, not proof that every handler succeeds against production data.

### Buyer Flutter

- `mobile/cryma-flutter-app-main/lib/services/api_service.dart` centralizes API requests, JSON decoding, bearer-token storage, buyer-role enforcement, connectivity checks, image URL resolution, and API error handling. The default API is compile-time configurable through `API_BASE_URL` and otherwise points to `https://api.cryma.store`.
- `AppRouter` covers shopping, account, address, order, voucher, chat, review, notification, and help destinations. Several destinations are present but are demo/local screens rather than API-backed flows.

## 2. Web role and workflow review

| Audience | Source areas | Source-level connection and workflow status |
|---|---|---|
| Guest | `buyer/pages/Home`, `Categories`, `ProductDetails`, `Storefront`; `BuyerLayout`, `BuyerNavbar` | Public product/store endpoints and browse/search routes exist. Guest cart/favorite actions correctly gate sign-in where implemented. Product imagery depends on catalog data; one known bad seller upload was previously suppressed in the shared product card. |
| Buyer | `buyer/pages/Cart`, `Checkout`, `Orders`, `OrderDetails`, `Account`, `Reviews`, `Vouchers`, `Wishlist`, `Chat`; `BuyerNavbar` and chat widget | Core cart-to-checkout, order retrieval/cancel/receive/refund, address CRUD, voucher validation/claim, profile/password, reviews, and buyer chat have corresponding endpoint families. Cart and favorites are browser-local; buyer “notifications” are derived from order activity and a local read timestamp, not a dedicated notification feed. |
| Seller | `seller/pages/*`, `SellerLayout` | Inventory, storefront, vouchers, order lifecycle, pickup requests, returns, reports, earnings, notifications and seller chat use seller endpoints. Role shell and APIs are distinct. |
| Admin | `admin/pages/*`, `AdminLayout` | Dashboard, registration decisions, users, compliance, complaints, refund requests, finance, reports, platform settings, parcel flow, vouchers and customer service map to admin routes. High-risk actions generally use confirmations; they still require account-level workflow testing. |
| Logistics | `logistics/pages/*`, `LogisticsLayout` | Dashboard, rider management, pickup, receipt, parcel scan/sort/assignment, delivery monitoring and exports have logistics routes. The `/logistics/messages` route renders an explicit unavailable screen and has no logistics messaging endpoint; it is not linked in the sidebar. |
| Hub staff | `hubStaff/*` | The layout checks the active assigned hub and the API supplies hub-scoped parcels, receiving, transfers, scans, sorting, and activity. Backend middleware enforces the assignment; this is a sound boundary to preserve. |
| Courier/rider | Deferred | Not reviewed, per the clarified scope. |

## 3. Web issues and risks

### High priority

1. **Buyer favorites are not server-synced.** `shared/utils/buyerAccess.js`, `buyerProductActions.js`, and `buyer/pages/Wishlist/Wishlist.jsx` persist IDs in browser `localStorage`. The web experience calls it a buyer wishlist, but there is no buyer wishlist API in the current Laravel route map. It will not follow the buyer across browsers/devices and can be cleared independently of the account.
2. **Order activity is not a full notification service.** `BuyerNavbar.jsx` builds a local order-activity view from the buyer's order data and local read timestamp. It is useful as order tracking, but should not be mistaken for persisted, multi-event buyer notifications. The backend exposes seller notifications, not a general buyer notification API.

### Medium priority

4. **Role design foundations are fragmented.** Web roles use separate shells and substantial feature-local CSS, including literal colors and distinct spacing/status treatments. Global tokens exist but do not ensure visual consistency. Prior Phase 1 audit details the relevant role-shell and token files.
5. **Dense operations need real responsive QA.** Admin, seller, logistics and hub-staff pages include wide tables and action-heavy forms. Source CSS includes responsive rules, but table scanning, action reachability, keyboard order, 200% zoom, and mobile row/card behavior have not been validated in a live browser for each role.
6. **Some operational status vocabularies are lifecycle-sensitive.** Order, parcel, transfer, pickup and delivery states are shown across buyer/seller/admin/logistics/hub-staff. Keep mappings aligned with controller transitions; UI labels alone should not collapse distinct backend states.

## 4. Buyer Flutter backend-connection matrix

| Workflow | Current implementation | Assessment |
|---|---|---|
| Login/session/role | `ApiService.login`, `restoreBuyerSession`, `logout`; token/user in SharedPreferences; `/api/login`, `/api/user`, `/api/logout` | Connected. Buyer role is checked. Runtime token expiry/network behavior still needs device testing. |
| Registration/email OTP/password reset | Multipart registration, `/api/register`, `/api/verify-email`, `/api/resend-verification`, `/api/forgot-password` | Connected in service/screens; request/response behavior was not exercised against a live account. |
| Catalog/search/product detail | `/api/products`, `/api/products/{id}`; image URL resolution | Connected. Category navigation/filter data is partly static UI configuration. Missing product images can fall back to a headphone asset. |
| Cart | `CartStore` stores cart in SharedPreferences | Local-only by design; checkout submits product/variant IDs and quantities to the backend. Validate price/stock changes at checkout and state restoration after app restart. |
| Checkout/order | `/api/buyer/checkout-data`, `/api/orders`, idempotency key; orders/details/confirm-received use `/api/orders*` | Connected. The UI and current Laravel validation use cash-on-delivery only; this is aligned today, but is not multi-method payment support. |
| Addresses | `/api/buyer/addresses` CRUD/default | Connected in address book and checkout. Registration address uses local static province/city/barangay data, while the account address screen has a separate PSGC integration; keep those data sources consistent. |
| Vouchers | `/api/buyer/vouchers`, claim and validate routes | Connected in voucher and checkout screens. |
| Profile/password | `/api/account/profile`, `/api/account/password` | Connected for JSON profile/password operations. Mobile profile image editing is not implemented. |
| Product reviews | Backend has public `GET /api/products/{id}/reviews` and buyer `POST /api/products/{id}/reviews`; mobile does not call either | Not connected. Mobile detail screen has an empty review list, “all reviews” and “my reviews” are hardcoded, and submit shows success without making a request. |
| Seller chat/support chat | Backend buyer chat endpoints exist and are used by web | Not connected in Flutter. Mobile chat list/conversations are hardcoded; sending only mutates in-memory state. |
| Wishlist/favorites | No buyer wishlist API is present | Mobile wishlist is a hardcoded list and is not tied to the signed-in buyer or catalog. |
| Notifications | No buyer notification API is present | Mobile notification screen uses sample records and local-only read flags. |
| Customer support | No mobile support service integration; buyer chat API exists but mobile does not use it | Live Chat leads into demo chat; email/call/FAQ options have empty callbacks and the contact details are hardcoded. |

## 5. Highest-impact buyer mobile findings

### Critical: fake success or fabricated customer data

- `mobile/cryma-flutter-app-main/lib/screens/rate_feedback_screen.dart`: `_handleSubmit` displays “Review submitted successfully!” without calling the existing review endpoint. This can cause a customer to believe a review is recorded when it is lost.
- `screens/chat_list_screen.dart` and `screens/chat_conversation_screen.dart`: sample stores/conversations/messages are embedded in source; send only appends to local widget state. They are not actual customer conversations.
- `screens/notification_screen.dart`: sample order/voucher/message/security events are shown as customer notifications, and read state is in memory only.
- `screens/wishlist_screen.dart`, `screens/my_reviews_screen.dart`, `screens/all_reviews_screen.dart`: sample records are hardcoded, not loaded from the API or the user's account.
- `screens/customer_service_screen.dart`: Email Support, Call Us, and FAQs use empty callbacks. The displayed email and phone number are hardcoded; confirm they are official before presenting them. Live Chat opens the demo chat list.

### High: interaction and catalog fidelity

- `screens/cart_screen.dart`: the visible “Edit” action has an empty callback. Quantity and selection controls work, but this advertised action does nothing.
- `screens/home_screen.dart` and `screens/products_detail_screen.dart`: absent/invalid catalog images may use `assets/image/headphones.jpg`, which can show an unrelated product image. Use a neutral placeholder instead of substituting a different product asset.
- `screens/products_detail_screen.dart`: live product data is loaded by ID, but the initial model contains a specific headphone sample and the review section remains empty. Ensure no initial/failure state displays sample product information as if it came from the API.
- Registration and address entry maintain separate local address datasets/integrations; this risks inconsistent or stale Philippine location choices.

### Medium: design and accessibility

- Buyer Flutter uses its own `AppColors`/Poppins theme and differs from the newer web semantic palette and Inter/Poppins pairing. Product and account screens also include locally styled surfaces, so theme-level changes do not guarantee consistent controls.
- Several sample screens use `GestureDetector` on text/container elements where a Material button/list tile would provide better focus, semantics and touch feedback. Check text scaling, TalkBack/VoiceOver labels, keyboard-visible forms, and large device font settings.
- The app has an API error model and explicit loading/error paths in commerce screens, but local/demo screens can make loading/empty/error-state conventions look complete without being data-driven.

## 6. Prioritized implementation backlog

1. **P0 — Remove false success/sample content:** connect review submission to `POST /products/{productId}/reviews`; load review lists from `GET /products/{productId}/reviews`; remove or clearly label demo chat, wishlist, reviews and notification data; do not report success before persistence.
2. **P0 — Make support choices honest and usable:** connect Live Chat to the existing buyer chat API; wire official email/phone/FAQ destinations or remove/disable those controls until their destinations are confirmed.
3. **P1 — Fix inert interactions and product-image fallback:** wire cart Edit to selection/removal mode or remove it; use a neutral missing-image placeholder in buyer Flutter.
4. **P1 — Choose persistence for favorites/notifications:** either add authorized backend contracts in a separately approved backend/API phase or explicitly present them as device-local. Align web and mobile behavior so sign-in does not imply cross-device persistence.
5. **P2 — Align design and responsive/accessibility rules:** map Flutter and role-specific web shells to agreed semantic tokens, standardize feedback and empty/error states, and run role-specific responsive/accessibility review.
6. **P2 — Build automated integration coverage:** add API contract tests for Flutter service endpoints/response shapes, component/widget tests for no-network and retry flows, and route smoke tests per in-scope role. Existing web tests mostly cover pure utilities rather than full route workflows.

## 7. Verification performed and limits

- `web`: existing Node test suite passed (64 tests); ESLint passed; production build had passed in the immediately preceding homepage refinement. These checks validate the current bundle and unit utilities, not live backend behavior.
- A code-level JSX scan found no inert web buttons or empty/hash anchors at the time of review.
- Flutter `flutter test` was started, but the runner emitted no output for over a minute and was stopped; its result is **inconclusive**, not a pass.
- No role credentials, live browser surface, emulator/device session, or production API test account was available. Therefore I did not validate authenticated web pages visually, submit real orders/reviews, test image uploads, or confirm external API availability. Do not treat code inspection as production end-to-end certification.

## Final assessment

The in-scope web application has a strong API-backed operational core and broad role route coverage, but buyer wishlist/notifications are not server-synced. The buyer Flutter app's essential shopping path is connected, but its secondary feature set is not production-ready: several screens present mock customer content or claim a write succeeded without persisting it.

The safest next work is to resolve the buyer Flutter P0 items, then run authenticated browser checks for each in-scope web role and real-device buyer flow tests against a staging backend. Courier/rider review can be scheduled as a later phase. Do not declare every interface functional until those checks pass.
