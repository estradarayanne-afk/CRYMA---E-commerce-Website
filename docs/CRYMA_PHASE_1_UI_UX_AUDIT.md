# CRYMA Premium Marketplace Redesign
## Phase 1: UI/UX Audit

**Scope:** read-only source audit of the Laravel API, React web client, CRYMA buyer Flutter application, and courier Flutter application.  
**Audit date:** 5 November 2026  
**Status:** no source code, API, database, or package files were changed as part of this audit.  
**Method:** inspected routes, layouts, representative screens, shared components, styles/tokens, app themes, and API service boundaries. This is a code-based audit; it does not claim browser/device screenshot validation or live-account usability testing.

## 1. Executive Summary

CRYMA already has a substantial role-based application rather than a single undifferentiated storefront. The web client separates public shopping, buyer, seller, admin, logistics, courier, and hub-staff routes. Shared foundations include global web tokens, a shared API client, role guards, buyer product/address components, feedback primitives, and a Flutter theme for the buyer app. This is a strong basis for an incremental redesign.

The main design problem is **fragmentation**. The web token palette and buyer Flutter theme use an older CRYMA palette (`#B21F3A`, `#7E1830`, `#EFA7B8`, `#FFF7F8`) rather than the requested palette (`#741F35`, `#A83F59`, `#E8BFC9`, `#FFF8F7`, `#F3ECEB`, `#292326`). Web roles have separate CSS systems; hub staff uses a distinctly teal/navy scheme, courier and logistics carry independent styles, and admin has a separate workspace system. The courier Flutter app has its own Material 3 theme and different form, button, and navigation defaults. Web base typography declares Inter with generic fallbacks, while buyer Flutter explicitly loads Poppins; the two type systems are not yet specified as one brand system.

The safest redesign start is the **shared visual foundation and one high-traffic vertical slice**, not a full role rewrite: first agree on semantic tokens and accessible component states, then migrate the public/buyer storefront shell and reusable product card. Keep routes, API calls, business logic, and role permissions intact. Use the existing `BuyerNavbar`, `BuyerLayout`, `ProductCard`, `BuyerAddressForm`, `Toast`, `Dialog`, and `AuthShell` as migration anchors. Once those are validated at mobile/tablet/desktop widths, apply the shared primitives to each operational workspace without flattening its task-specific information hierarchy.

### Highest-impact findings

| Priority | Finding | Evidence / impact |
|---|---|---|
| Critical | Brand tokens do not match the approved target palette and are not consistently used by every role. | `web/src/styles/tokens.css`, `mobile/cryma-flutter-app-main/lib/utils/colors.dart`, `web/src/hubStaff/components/HubStaffUI.css`; hard-coded role colors create drift. |
| High | Buyer, admin, seller, logistics, courier, and hub-staff workspaces have distinct layout and component conventions. | `BuyerLayout`, `AdminLayout`, `SellerLayout`, `LogisticsLayout`, `CourierLayout`, and `HubStaffLayout` each own navigation/header styles. |
| High | Dense operational data is often table-first; narrow screens need deliberate scanning/row-action behavior. | Logistics dashboard tables in `web/src/logistics/pages/Dashboard.jsx`; admin operational pages and hub-staff table/card transforms. |
| High | The two Flutter applications do not share a unified design configuration. | Buyer uses Poppins and CRYMA color constants; courier uses `AppConfig.appTheme()` with Material 3 defaults and separately declared colors/text styles. |
| Medium | Typography and spacing vary between bespoke CSS systems and inline component styles. | `tokens.css` is present, but hub-staff CSS contains literal hex values, courier styles have fallback literals, and admin/buyer/seller retain separate page styles. |
| Medium | Screen-level empty/loading/error patterns are uneven across roles. | Logistics and courier dashboards expose retry/error/empty states; some buyer screens and lazy route fallbacks use `null` or locally implemented states. |
| Medium | Web font delivery is not explicitly established by the global token declaration. | `--font-family-base` names Inter and system fallbacks; no global font import appears in `main.jsx` or token CSS. Confirm hosting/font loading during implementation. |

## 2. Existing Architecture

### Backend

- Laravel 13 / PHP 8.3 API, Sanctum authentication, role middleware, and feature tests are declared in `backend/composer.json`.
- `backend/routes/api.php` is the API contract map. It groups authenticated endpoints under `auth:sanctum` and `active`, then separates admin, seller, buyer, rider, logistics, and hub-staff operations by role. Public product and storefront routes are separate from authenticated shopping operations.
- Controllers own domain operations: examples include `backend/app/Http/Controllers/Api/BuyerOrderController.php`, `backend/app/Http/Controllers/Seller/ProductController.php`, `backend/app/Http/Controllers/Admin/DashboardController.php`, `backend/app/Http/Controllers/Logistics/DashboardController.php`, `backend/app/Http/Controllers/Courier/DeliveryController.php`, and `backend/app/Http/Controllers/Logistics/HubStaffParcelOperationsController.php`.
- **Redesign implication:** keep API schemas, route guards, roles, and workflows stable while changing presentation. A UI design phase should not require a database migration.

### Web frontend

- React 19, React Router 7, Vite 8, Axios, and Lucide icons are specified in `web/package.json`.
- `web/src/main.jsx` loads `styles/tokens.css` and `styles/globals.css`; `web/src/App.jsx` defines public/authenticated routes and role-specific layouts.
- `web/src/shared/services/api.js` is the shared HTTP boundary. `ProtectedRoute.jsx` performs client-side session/role redirection; the backend remains authoritative for access.
- Public/Buyer pages sit within `BuyerLayout`; role workspaces have separate layouts. Hub staff routes are lazy-loaded with a route loading state. Buyer home is lazy-loaded, while many other routes are imported eagerly.
- CSS is largely feature-local and imported by page/layout components. This keeps ownership close to features but makes design consistency dependent on shared tokens and migration discipline.

### Flutter applications

- `mobile/cryma-flutter-app-main` is the buyer app. It uses Material widgets, named routes through `AppRouter`, a central `ThemeData` in `lib/main.dart`, and `ApiService` for HTTP/session operations. `pubspec.yaml` declares Poppins assets, Provider, `go_router` (the inspected router uses `onGenerateRoute`/`MaterialPageRoute`), HTTP, preferences, and image picker.
- `mobile/cryma-logistics-mobile-master/flutter_app` is a separate courier/rider app. It uses Provider, service/repository-style API classes, token storage, and a `MainNavigationScreen` with an `IndexedStack` and bottom navigation. `AppConfig.appTheme()` owns a separate Material 3 palette and text theme. The inspected service layer includes `ApiClient`, `AuthService`, `OrderService`, and local persistence (`sqflite`).
- These are separate Flutter codebases with distinct dependency versions, navigation approaches, themes, and service designs. Share design tokens/documentation and component behavior first; do not force a shared code package as the first step.

### Existing reusable web UI and design foundations

- Brand/global: `web/src/styles/tokens.css`, `web/src/styles/globals.css`.
- Auth: `web/src/auth/components/AuthShell.jsx` and `AuthShell.css`; `PhilippineAddressFields.jsx`.
- Buyer: `BuyerNavbar`, `BuyerAddressForm`, `ProductCard`, `BuyerSellerChatWidget`, buyer `BuyerLayout`.
- Shared: `ProtectedRoute`, `Toast`, `Dialog`, `AuthModal`, `PolicyPage`, `ParcelQrCode`, `ParcelQrScanner`, `PrivateDeliveryProof`, and `shared/styles/feedback.css`.
- Logistics/operations: `ConfirmationModal`; courier `CourierConfirmModal`; hub-staff `HubStaffUI` state/table/form primitives, `HubStaffConfirmModal`, `ParcelCodeCapture`, and activity preview.
- Existing test files cover select utility/validation behavior, and Flutter test files cover some buyer flows/services. These are useful regression-test anchors, but this audit did not run tests.

## 3. Role-by-Role UI/UX Audit

Priority legend: **Critical** blocks brand/accessibility consistency or a key task; **High** materially affects comprehension, efficiency, or responsive use; **Medium** should be addressed in normal redesign iterations; **Low** is refinement.

### 3.1 Web Guest / Public storefront

**Existing assessment.** Guest users share the buyer shell. `/` renders the public home when there is no buyer session; public categories, product details, and store pages are routed through `BuyerLayout` in `web/src/App.jsx`. `Home.jsx` includes a dedicated `HomeHeroScene.jsx`, and `ProductCard.jsx` is the reusable product listing primitive. The shared header owns search, account entry, cart, activity, messages, and mobile behavior.

**Problems and recommendations.** The shared marketplace navigation is feature-rich, which can compete with discovery on the first visit. The hero scene introduces a custom visual surface that needs clear fallback and reduced-motion behavior in the full storefront context. Product information should follow a stable scan order (image, seller/category cue, name, price/current price, review evidence, and one primary action); avoid placing promotional labels and controls at equal visual weight. Guest entry points should preserve a clear browse path while making the value of creating an account legible.

**Recommended layout/components.** Keep `BuyerLayout` and `BuyerNavbar`; define a concise top navigation/search band, category discovery, one lead editorial/seasonal hero, curated collections, and a consistent responsive product grid. Keep the `ProductCard` contract and standardize its image ratio, title clamp, price stack, rating treatment, favorite control, focus state, and loading skeleton. Use `AuthModal` for sign-in prompts where already integrated, with full-page auth as a direct route.

**Responsive/accessibility.** `BuyerLayout.css` defines a five-item mobile tab bar at small widths; ensure content bottom padding accounts for it and it does not cover checkout/product actions. Test 320px through wide desktop, keyboard search, accessible names for icon-only controls, focus visibility, image alt text, zoom, and reduced-motion treatment for the hero.

**Priority:** High. Files: `web/src/App.jsx`, `web/src/buyer/layouts/BuyerLayout.jsx` / `.css`, `web/src/buyer/components/BuyerNavbar/BuyerNavbar.jsx` / `.css`, `web/src/buyer/pages/Home/Home.jsx` / `.css`, `HomeHeroScene.jsx`, and `web/src/buyer/components/ProductCard/ProductCard.jsx` / `.css`.

### 3.2 Web Buyer

**Existing assessment.** Authenticated buyer screens cover cart, checkout, orders/order details, reviews, account/address, vouchers, wishlist, and support/chat. `BuyerLayout` centralizes navigation, cart event handling, auth modal, toast, and chat widget. `BuyerNavbar` owns several interactive panels (cart, account, notifications, messages, mobile menu, logout) and fetches order activity/profile image/conversations. `BuyerAddressForm` and `ProductCard` are reusable features.

**Problems and recommendations.** The shell is doing substantial orchestration alongside navigation; the header’s many popovers create interaction-density and focus-management risk. Checkout and account are task-critical and should use strong section grouping, persistent cost/order summary where width allows, progressive form disclosure, clear validation, and explicit saving/error states. Orders need status hierarchy and a predictable distinction between status, next action, and timeline. Reduce repeated bespoke styling across Cart, Checkout, Orders, Account, Product Details, and Storefront by applying common page/container/card/form primitives.

**Recommended layout/components.** Retain current route/logic structure. Standardize buyer page heading, content width, section/card, price, status badge, form field, inline error/help, empty/loading/error panel, sticky summary, and confirmation patterns. Continue to use shared `Toast`, `Dialog`, `BuyerAddressForm`, and `BuyerNavbar`; extract only repeated presentation patterns after confirming their props/state boundaries. In the mobile web experience, prioritize bottom tabs and compact product/order cards over desktop tables.

**Priority:** High for navigation/checkout/order clarity; Medium for secondary account/review polish. Files: `web/src/buyer/pages/{Cart,Checkout,Orders,OrderDetails,ProductDetails,Account,Reviews,Vouchers,Wishlist,Chat}` and respective CSS, plus `BuyerLayout`, `BuyerNavbar`, and `BuyerAddressForm`.

### 3.3 Web Seller

**Existing assessment.** `SellerLayout.jsx` wraps a broad workspace: dashboard, inventory, orders, storefront, vouchers, logistics, feedback, reports, returns, chat, and account settings (routes in `web/src/App.jsx`). `SellerWorkspace.css` contains refinements for account/profile controls and uses some admin workspace classes. The seller dashboard is data-oriented, with other operational pages owning their own CSS.

**Problems and recommendations.** Seller workflows are different from buyer shopping: the seller needs action queues and business health, not consumer-style cards everywhere. Current CSS reuse from admin (`.al-root` patterns) means shell-level consistency is coupled to admin implementation. Inventory/order/report tables can become dense; define responsive row treatment and prioritize actions, status, product identity, stock, and financial summaries. Form-heavy product/storefront/voucher flows need consistent field help, validation, save state, and image preview controls.

**Recommended layout/components.** Preserve seller navigation and workflows, but give seller its own semantic shell tokens and shared workspace primitives (page heading/action, metric summary, queue, filter bar, responsive data list, form section, confirmation). A compact command-oriented dashboard should surface low-stock, unfulfilled orders, returns needing attention, and revenue summaries only where present in existing API data. Avoid a second product-card implementation if the existing buyer card does not fit seller management; use a distinct dense product row/list item that shares image/price/status primitives.

**Priority:** High for inventory/orders and form consistency; Medium for dashboard and secondary pages. Files: `web/src/seller/layouts/SellerLayout.jsx`, `web/src/seller/styles/SellerWorkspace.css`, and `web/src/seller/pages/{Dashboard,Inventory,Orders,Storefront,Vouchers,Logistics,Returns,Reports,Feedback,Chat,AccountSettings}.*`.

### 3.4 Web Admin

**Existing assessment.** `AdminLayout` and `AdminWorkspace.css` provide a workspace shell with sidebar, header, breadcrumb, system/date indicators, and a sign-out confirmation modal. Admin routes cover dashboard, registrations, users, vouchers, seller compliance, complaints, refunds, parcel flow, finance, reports, settings, account settings, and chat. The dashboard calls `/admin/dashboard`; role-protected routes are declared in `App.jsx`.

**Problems and recommendations.** Admin is information-dense and carries high-impact decisions; decorative polish must not reduce table readability or obscure risk/action status. Admin pages have separate page styles, with some flows using separate tabular structures. The header “Live system” treatment should communicate only actual health state and not imply monitoring where it is static. Mobile sidebar behavior exists but large grids/tables need an explicit narrow-screen plan; horizontal overflow without pinned identity/action columns can make reviews error-prone.

**Recommended layout/components.** Keep the established admin shell and build a tokenized admin workspace layer: data table with sort/filter/pagination states, detail drawer or focused detail page, status badge, audit context, high-risk confirmation, empty/loading/error states, and bulk/action toolbar. Keep risk-bearing actions visually distinct and ensure confirmations explain the target and consequence. Dashboard should support fast scanning with grouped operational/financial summaries rather than a flat set of equal cards.

**Priority:** High for tables, registration/compliance and finance/refund actions; Medium for shell/dashboard polish. Files: `web/src/admin/layouts/{AdminLayout.jsx,AdminLayout.css,AdminWorkspace.css}` and `web/src/admin/pages/{Dashboard,registrations,Users,Vouchers,SellerCompliance,Complaints,RefundRequests,ParcelFlow,Finance,Reports,Settings,AccountSettings,Chat}`.

### 3.5 Web Logistics / Hub operations

**Existing assessment.** Logistics has a dedicated workspace shell (`LogisticsLayout`) and dashboard (`pages/Dashboard.jsx`) with eleven linked operational metrics, hub overview, transfer table, parcel-event table, retry/error handling, and explanatory footnotes. `ParcelOperations` handles pickup receipt, incoming parcels, sorting, assignment, and monitoring sections. Parcel-flow screen is shared with admin through a `base` prop. A separate hub-staff workspace is also present and is intentionally scoped to an assigned hub; it verifies assignment before rendering, exposes six operational routes, and uses scanning, transfer, receiving, and activity patterns.

**Problems and recommendations.** The logistics dashboard tables expose many columns (including six in hub overview and five in parcel events); at mobile sizes this is not an efficient scan pattern. Operational terminology and status labels should be consistent across dashboard, parcel flow, hub staff, courier, and customer tracking, with role-specific detail but shared semantic status colors. Hub staff CSS hard-codes a teal/navy visual language (`HubStaffUI.css`) that diverges from brand tokens. `LogisticsLayout` and `HubStaffLayout` differ in shell and loading/assignment states.

**Recommended layout/components.** Use workflow-first queue tabs/sections, compact but readable tables at desktop, and labeled parcel cards with essential identity/status/next action at small widths. Keep scanner and custody actions prominent and distinct from low-risk navigation; show hub context persistently. Share semantic statuses, table, filter, callout, metric, empty/error/loading, and confirmation components while preserving separate role navigation and available actions. Keep the explicit hub assignment/access gate.

**Priority:** High for queue/table responsiveness and status language; Medium for visual consolidation. Files: `web/src/logistics/{layouts/LogisticsLayout.jsx,layouts/LogisticsLayout.css,pages/Dashboard.jsx,pages/ParcelOperations.jsx,pages/ParcelOperations.css,pages/Reports.jsx,pages/RiderManagement.jsx}` and `web/src/hubStaff/{HubStaffLayout.jsx,HubStaffLayout.css,components/HubStaffUI.jsx,components/HubStaffUI.css,components/ParcelCodeCapture.jsx,pages/Overview.jsx,pages/Parcels.jsx,pages/PickupReceiving.jsx,pages/IncomingTransfers.jsx,pages/OutgoingTransfers.jsx,pages/Activity.jsx}`.

### 3.6 Courier / Rider

**Existing assessment.** The web application also contains a role-protected courier workspace, in addition to the requested courier mobile app. Web `CourierLayout` has collapsible/mobile navigation, task dashboard, pickup/delivery details, parcel flow, history, earnings, chat, profile, and settings. The dashboard fetches pickups, deliveries, and histories; task cards link directly to task details. Delivery proof is part of the workflow. The separate Flutter courier app has a four-tab bottom navigation (`Home`, `Orders`, `Messages`, `Profile`), an order-centric home dashboard, and reusable stat/order/loading/error widgets.

**Problems and recommendations.** The two courier experiences have significantly different task models/navigation and visual systems. Flutter home uses a maroon banner, yellow/pink/teal metric cards, Poppins-like defaults via config, generic four-tab navigation, and order-focused screens; web courier is more workflow-specific with pickups, deliveries, hub transfers/returns, proof, earnings, and chat. Validate whether the mobile courier app is expected to support all currently exposed web tasks before UI parity work. The Flutter app has `MainNavigationScreen` as an older, compact shell and its order provider model differs conceptually from web pickup/delivery assignment tasks.

**Recommended layout/components.** For mobile, design around the rider’s next actionable task, delivery/pickup state, navigation/contact, proof capture, offline/connection state, and safe touch targets. Keep the bottom bar to stable top-level destinations; put task-specific actions on the detail screen. Standardize status/proof cards and confirmation/error states across web and mobile while keeping platform-native interaction patterns.

**Priority:** High for task-model and app-scope alignment; High for mobile task legibility/proof flows; Medium for cosmetic polish. Files: web `web/src/courier/{layouts/CourierLayout.jsx,layouts/CourierLayout.css,layouts/CourierPages.css,pages/Dashboard.jsx,pages/Pickups.jsx,pages/Deliveries.jsx,pages/DeliveryDetails.jsx,pages/PickupDetails.jsx,pages/ParcelFlow.jsx}`; Flutter `mobile/cryma-logistics-mobile-master/flutter_app/lib/{config/app_config.dart,screens/main_navigation_screen.dart,screens/home/home_screen.dart,screens/orders,providers/order_provider.dart,widgets}`.

### 3.7 Mobile Buyer

**Existing assessment.** The buyer Flutter app has a central `MaterialApp` theme, `AppColors`, Poppins font assets, and a large named-route screen set for browse/search/product detail, cart/checkout/payment, orders/tracking/reviews, chat, account, addresses, help, and policy. `HomeScreen` loads product data through `ApiService` and uses a five-item navigation pattern (home, categories, cart, orders, account). The inspected product detail starts with local fallback product data, then uses API/service layers for live data. `ApiService` handles JSON, auth token from SharedPreferences, image URL resolution, buyer role enforcement, and session restore.

**Problems and recommendations.** The app has a theme, but many screens implement their own `Container`, spacing, product models, and form presentation; shared theme standards may not fully govern screen-level decoration. Several routes/screens need consistent loading/error/empty states and stable image sizing across the marketplace. The requested target palette differs from `AppColors`, and a Poppins-only mobile experience will diverge from the web Inter base unless the brand explicitly adopts a paired type system. Verify text scaling, keyboard/safe-area behavior, and touch target size across registration, address, checkout, payment, and account flows.

**Recommended layout/components.** Retain `AppRouter`, `ApiService`, and screen boundaries. Establish a Flutter `ThemeData`/component layer for type scale, color roles, button variants, form fields, cards, sheets/dialogs, status badges, product tile, and state panels. Reuse the same semantic token names as web, mapping to platform-specific implementation. Focus first on home/product tile/product detail/cart/checkout, then order tracking/account forms.

**Priority:** High for theme alignment and commerce tasks; Medium for secondary support/account screens. Files: `mobile/cryma-flutter-app-main/lib/{main.dart,utils/colors.dart,navigation/app_router.dart,services/api_service.dart,screens/home_screen.dart,screens/categories_screen.dart,screens/search_screen.dart,screens/products_detail_screen.dart,screens/cart_screen.dart,screens/checkout_screen.dart,screens/my_orders_screen.dart,screens/order_details_screen.dart,screens/order_tracking_screen.dart,screens/account_screen.dart,screens/add_address_screen.dart}` and `pubspec.yaml` only if later font assets are intentionally changed.

## 4. Visual Problems and Recommendations

### Color and brand

- Current web/mobile buyer foundation: `#B21F3A` / `#7E1830` / `#4B1725`, pink accents `#EFA7B8` and `#F9DCE4`, near-white `#FFF7F8`. Requested palette values are different. Reconcile the canonical values before applying them so the web, buyer app, seller/admin/operations, and marketing assets agree.
- Hub staff currently uses teal (`#14877c`, `#126f69`) and navy/blue grays in `HubStaffUI.css`; seller/account and courier styles contain hard-coded crimson and pink values. Admin styles add their own workspace vocabulary. Replace literal values in stages with semantic roles (`brand`, `surface`, `text`, `border`, `success`, `warning`, `danger`, `info`) rather than mechanical hex substitution.
- Reserve saturated crimson for primary actions/important identity and use status colors consistently. Check contrast for text on floral pink, light backgrounds, and status badges.

### Typography

- Web token `--font-family-base` names Inter with system fallbacks, but global token loading alone does not load the Inter font. Verify `web/index.html`/font hosting before relying on Inter metrics. `AuthPages.css` includes Georgia for a display treatment, which should be an explicit exception or aligned with the chosen brand typography.
- Buyer Flutter loads Poppins assets and sets it as the theme family. Courier Flutter declares a separate text theme with generic Material defaults and no matching CRYMA font asset in its inspected `pubspec.yaml`.
- Define a cross-platform hierarchy using semantic names/weights and line heights; test long Philippine names, addresses, prices, and status labels at user-scaled font sizes.

### Spacing, shape, and elevation

- Web `tokens.css` already defines spacing steps (4–48px), radii (8/14/20px), and shadow levels. Reuse these rather than introducing another scale; the requested soft-premium direction may favor restrained shadows and fewer nested rounded cards.
- Role-local CSS uses other radii (8/9/10/13/14px and `.65rem`/`.9rem`/`1rem`) and shadows. Document mapping rules, then consolidate shared components while leaving role layout grids specific.
- Improve alignment by defining page max-width, header-to-content spacing, form grid widths, and consistent section headings per workspace type.

### Hierarchy, density, and product presentation

- Buyer discovery should privilege product imagery, price, seller trust, and a single clear action. Lock image aspect ratios and card content behavior so mixed product data does not produce uneven rows.
- Admin/logistics/seller screens need density controls: meaningful grouping, visible filters, stable identity columns, legible status, predictable row actions, and focused mobile cards. Avoid translating every table into an unstructured stack.
- Keep metrics meaningful and contextual; do not style every statistic with equal visual prominence. Pair numbers with label, period/context, and a route or explanation when useful.

### Components, motion, and accessibility

- Existing global CSS provides focus-visible outlines and reduced-motion overrides. Keep these guarantees when role styles are migrated; avoid focus suppression and ensure custom menus/dialogs trap/restore focus, support Escape, announce states, and expose labels.
- Icon-only actions in header/toolbars need accessible labels and sufficiently large hit areas. Validate color contrast, 200% zoom, keyboard-only operation, screen-reader form errors, semantic table headings, and reduced motion.
- Avoid redundant decoration where product imagery, category art, cards, badges, and hero scene all compete. Use animation to explain state/transition, not as ambient motion.
- Standardize loading skeletons/spinners, empty states with next-step guidance, recoverable error/retry states, success feedback, and destructive confirmation patterns. Use the shared `Toast`, `Dialog`, and existing role confirmation modals as the starting point.

## 5. Shared Design System Recommendations

Keep one semantic design specification with separate web CSS variables and Flutter `ThemeData` mappings. Begin by agreeing values and behavior, not by merging implementations.

| System area | Recommendation |
|---|---|
| Brand colors | Set primary/deep/rose/accent to approved `#741F35`, `#A83F59`, `#E8BFC9`; surfaces `#FFF8F7` and `#F3ECEB`; primary text `#292326`. Define accessible on-color pairs and semantic success/warning/danger/info separately. |
| Typography | Decide whether Poppins is display and Inter is UI, or use one family consistently. Define display, page title, section title, body, label, caption, numeric KPI, and monospace reference roles with weights/line heights. Load fonts explicitly on web and preserve platform scaling on mobile. |
| Spacing | Retain the existing 4px base progression and map layout gaps to documented steps. Define page gutters, section spacing, form field gap, and compact dense-table spacing separately. |
| Radius | Standardize control, card, modal, and pill radii. Keep dense data surfaces less rounded than marketing/product cards. |
| Shadows | Use a restrained elevation ladder: base surface, hover/floating popover, modal. Prefer borders and spacing to nested shadows. |
| Buttons | Define primary, secondary, tertiary, destructive, icon-only, loading, disabled, and full-width mobile behavior. Establish min height and focus/pressed states. |
| Inputs | Standardize labels, required state, hint, prefix/suffix, validation, disabled/read-only, focus, and error announcement. Use platform-native fields in Flutter with equivalent semantics. |
| Cards | Separate product tile, metric card, form/section panel, task card, and status summary patterns. Share primitives but do not force identical content layouts across roles. |
| Tables/lists | Define desktop table structure, filters, pagination, sorting, action column, empty/loading/error states; define mobile labeled cards or prioritized columns for each workflow. |
| Modals/drawers | Standardize overlay, width, heading/body/actions, close/Escape behavior, focus return, scroll handling, and destructive variant. Use drawers for inspectable low-risk details, confirmation dialogs for irreversible actions. |
| Navigation | Keep role-specific destinations and labels; unify active/focus states, icon sizing, shell spacing, mobile menu/backdrop behavior, account menu behavior, and current-location indication. |
| Status badges | Create one semantic status map for order, parcel custody, rider, payment, and application statuses. Reuse colors and labels across buyer tracking and staff workspaces; do not rely on color alone. |
| Toast/feedback | Use existing web `Toast` as the web baseline; align duration, placement, dismiss affordance, announcements, and severity across clients. Persistent actionable errors should use inline/state panels, not transient toasts. |
| Breakpoints | Use content-driven breakpoints, then normalize existing web boundaries (buyer 600/700/900px; auth 480/900px; courier 720px; hub staff 640/900px). Specify compact/tablet/desktop behavior per component and test boundary widths. Flutter should use layout constraints rather than matching CSS pixel values. |

**Standardize first:** tokens, type scale, buttons/fields, page headings, state panels, status badges, cards, dialog/toast, table and mobile list patterns. Keep distinct buyer, seller, admin, logistics, hub-staff, and courier navigation shells.

## 6. Web and Mobile Improvements

### Web sequence

1. Audit the web font load and token usage; publish canonical semantic tokens and compare them against the approved palette.
2. Upgrade shared feedback, dialog, button/input, badges, and layout primitives with accessible interaction behavior.
3. Migrate public/buyer shell, discovery cards, product detail, cart, and checkout as one coherent slice.
4. Migrate operational shell patterns by role: seller, admin, logistics/hub staff, and web courier. Keep navigation and permissions unchanged.
5. Convert dense table flows into responsive data presentation with explicit desktop/tablet/mobile rules.

### Mobile sequence

1. Agree on shared token/type names and role-specific font choice; map them into buyer and courier app themes independently.
2. Buyer: home/category/product card/product detail, then cart/checkout/payment and order tracking; finally account/support.
3. Courier: establish the mobile task scope, then prioritize task list/detail, proof capture, failure resolution, offline/loading states, and profile/settings.
4. Validate on small and large phones, safe areas, keyboard-visible forms, dynamic text scaling, touch targets, poor connectivity, and device permission-denial flows.

### Validation requirements for implementation phases

- Add/extend component tests for focus/keyboard, disabled/loading/error states, aria labels, state announcements, and responsive variants.
- Preserve existing web unit tests and Flutter service/widget tests; add route smoke tests for each role’s landing and an essential task flow.
- Use visual regression captures at defined viewport/device sizes and compare meaningful states (empty, populated, loading, error, long content, validation error, modal open).
- Test authenticated and unauthenticated routing against existing roles; verify no design migration changes API payloads, permissions, or workflows.
- For forms, cover keyboard order, inline errors, screen-reader association, browser autofill, Flutter text scaling, and network retry behavior.

## 7. Prioritized Implementation Roadmap

| Phase | Work | Scope / exit criteria | Regression safeguards |
|---|---|---|---|
| 0. Design contract | Confirm target palette, type pairing, semantic status map, spacing/radius/elevation, breakpoints, and role-specific density principles. | Token sheet plus component states and representative role wireframes approved. | No code/API changes. Contrast checks before color lock. |
| 1. Shared foundation (Web) | Update semantic variables and global type/focus rules; standardize button, input, card, badge, toast, dialog, state panel, and responsive table/list primitives. | Shared primitives demonstrated in buyer and one operational screen; tokens documented. | Component tests; keyboard/a11y review; visual captures at 360/768/1280+ widths. |
| 2. Buyer marketplace (Web) | Migrate BuyerLayout/Navbar, home, ProductCard, product detail, cart, checkout, account/order basics. | Public-to-checkout path feels cohesive; mobile nav and page state layouts are complete. | Route smoke tests; existing cart/checkout/product utility tests; guest/buyer role checks. |
| 3. Buyer commerce (Flutter) | Map tokens into ThemeData; migrate home/category/product/cart/checkout/order tracking. | Stable shopping and order flow with consistent loading/error/empty states. | Flutter widget/service tests, text scaling, small device and safe-area review. |
| 4. Seller workspace (Web) | Apply shared shell/metrics/forms/tables to inventory, orders, product/storefront management, returns, and reports. | Seller tasks retain current actions and high information efficiency. | Existing workflow tests; upload/form validation; mobile table/list review. |
| 5. Operations (Web) | Apply semantic statuses and shared data/confirmation patterns to admin, logistics, hub staff, and courier web. | Role-specific dashboards and queues share visual grammar while preserving distinct permissions and navigation. | Role route matrix; high-risk action confirmation tests; queue/table responsive captures. |
| 6. Courier mobile | Resolve feature-scope differences, then align courier Flutter task flows and theme. | Rider can reach and complete assigned work, proof, and exception paths with clear offline/network feedback. | Provider/API tests, permission denial, network interruption, camera/image proof test, device-size review. |
| 7. Consolidation | Remove obsolete duplicate styles only after adoption; document tokens/components and ownership. | No unused legacy styling or divergent copies remain; accessibility and visual QA complete. | Full web/mobile regression suite; no backend/API/schema changes without separate approval. |

This sequence deliberately standardizes shared primitives before broad page rewrites and keeps web and mobile implementations independently testable.

## 8. Risks and Compatibility Considerations

- **Brand contrast:** requested floral pink and warm white are light surfaces; do not use them as small-text backgrounds with low-contrast rose text. Validate all foreground/background pairs, including disabled and status states.
- **Font metrics:** changing font family alters line breaks, card heights, table density, and button width. Load and test fonts before locking layout dimensions.
- **CSS coupling:** seller styles reuse admin workspace selectors and courier/logistics import admin workspace CSS. Tokenize these shared dependencies before removing old classes to avoid layout regressions.
- **Role workflow preservation:** keep React Router paths, `ProtectedRoute`, Laravel middleware, API clients, payloads, and operation sequences unchanged during a visual migration. Client-side role guards are presentation/navigation; backend authorization remains security authority.
- **Operational clarity:** parcel/order statuses may be lifecycle-specific. Standardize labels/colors only after mapping the existing status enums and transitions; never collapse states based only on visual similarity.
- **Mobile scope parity:** courier mobile and web expose different navigation/task models. Confirm product scope before attempting UI parity; preserve current service/API boundaries.
- **Responsive tables:** table-to-card transformations can hide comparison context or action controls. Define the fields/actions retained on mobile for each entity.
- **Accessibility regressions:** custom menus, dialogs, mobile nav backdrops, sticky summaries, icon buttons, and scanner/proof controls need keyboard, screen-reader, touch, zoom, and reduced-motion checks.
- **Asset dependencies:** the buyer Flutter app declares Poppins font assets and image directories; check actual asset availability and image fallback behavior before adjusting manifests or ratios.
- **Historical legacy app:** the courier app is in `mobile/cryma-logistics-mobile-master/flutter_app`, alongside admin-panel and API directories. Confirm which subprojects are actively shipped before large design investment.

## 9. Files and Components Likely to Be Affected

**Shared web foundation:**

- `web/src/styles/tokens.css`, `web/src/styles/globals.css`, `web/src/main.jsx`
- `web/src/shared/components/{Toast,Dialog,AuthModal,ProtectedRoute}.jsx` and matching CSS
- `web/src/shared/styles/feedback.css`

**Web public and buyer:**

- `web/src/App.jsx`
- `web/src/buyer/layouts/BuyerLayout.jsx` / `.css`
- `web/src/buyer/components/BuyerNavbar/BuyerNavbar.jsx` / `.css`
- `web/src/buyer/components/ProductCard/ProductCard.jsx` / `.css`
- `web/src/buyer/components/BuyerAddressForm.jsx` / `.css`
- `web/src/buyer/pages/{Home,Categories,ProductDetails,Cart,Checkout,Orders,OrderDetails,Account,Reviews,Vouchers,Wishlist,Storefront,Chat}` and corresponding styles

**Seller and operations web:**

- `web/src/seller/layouts/SellerLayout.jsx`, `web/src/seller/styles/SellerWorkspace.css`, seller page components/styles.
- `web/src/admin/layouts/{AdminLayout.jsx,AdminLayout.css,AdminWorkspace.css}` and admin page components/styles.
- `web/src/logistics/layouts/LogisticsLayout.jsx` / `.css`, logistics dashboard/operations/report/rider pages.
- `web/src/hubStaff/HubStaffLayout.jsx` / `.css`, `components/HubStaffUI.jsx` / `.css`, workflow pages, `ParcelCodeCapture.jsx`.
- `web/src/courier/layouts/CourierLayout.jsx`, `CourierPages.css`, courier task pages, `CourierConfirmModal`.

**Buyer Flutter:**

- `mobile/cryma-flutter-app-main/lib/main.dart`, `utils/colors.dart`, `navigation/app_router.dart`, `services/api_service.dart`.
- Commerce screens in `mobile/cryma-flutter-app-main/lib/screens/` (home, categories/search, product details, cart/checkout/payment, orders/tracking, account/address).
- `mobile/cryma-flutter-app-main/pubspec.yaml` only if font asset declarations change.

**Courier Flutter:**

- `mobile/cryma-logistics-mobile-master/flutter_app/lib/config/app_config.dart`, `app/app.dart`, `screens/main_navigation_screen.dart`, home/orders/profile screens, `widgets/`, and `pubspec.yaml` only if the design requires an intentional font/theme asset change.

**Backend/API files:** no backend files are expected for a presentation-only redesign. `backend/routes/api.php` and corresponding controllers are reference points for preserving the current route, role, status, and data contracts.

## 10. Final Assessment and Safest Starting Point

CRYMA has useful architecture to support a premium redesign: route separation by role, central web tokens, a central buyer Flutter theme, multiple reusable shopping/feedback/operations components, and API boundaries that can remain stable. The experience does not yet read as one coordinated marketplace because its palette, typography, shell conventions, spacing, status treatment, and responsive data patterns diverge across roles and between Flutter apps.

**Safest starting point:** agree and document the semantic design tokens and accessibility rules, then pilot them in the web buyer shell plus `ProductCard` and one full commerce path (product detail → cart → checkout). This uses mature existing reusable components, exercises both discovery and forms, and can be validated without changing backend/API behavior. In parallel, map the same tokens into the buyer Flutter `ThemeData`; keep courier, admin, seller, logistics, and hub-staff UI unchanged until the shared primitives and buyer pilot are stable. Then migrate role by role, with workflow-specific responsive patterns and regression checks at each phase.

