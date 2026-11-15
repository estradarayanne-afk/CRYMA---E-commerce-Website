# CRYMA Logistics App — Progress Log

## Project
Flutter logistics app for Android. Two account roles: **Rider** and **Super User**.

## Working Build Stack
- Flutter 3.47.5
- Java 25.0.3 (Android Studio bundled JDK)
- Gradle 9.7.1
- AGP 9.4.1
- Kotlin 2.3.20
- Java target: 21
- Project location: `C:\projects\logistics_cryma_app`

## Key Config Fixes Applied
- `android/gradle.properties`: `kotlin.incremental=false` — fixes Kotlin cross-drive incremental cache crash
- `android/app/build.gradle`: plugins block only, no manual Kotlin plugin, no ndkVersion
- `android/settings.gradle`: declarative plugins DSL with AGP 9.4.1, Kotlin 2.3.20, flutter-plugin-loader
- `android/gradle/wrapper/gradle-wrapper.properties`: Gradle 9.7.1

## Dependencies (pubspec.yaml)
| Package | Version | Purpose |
|---------|---------|---------|
| go_router | ^13.0.0 | Navigation/routing |
| provider | ^6.1.2 | State management |
| shared_preferences | ^2.2.3 | Persistent login session |
| cupertino_icons | ^1.0.6 | iOS-style icons |
| sqflite | ^2.3.3 | Local SQLite database |
| path | ^1.9.0 | DB path resolution |
| intl | ^0.19.0 | Date formatting |
| qr_flutter | ^4.1.0 | QR code generation (order delivery) |
| mobile_scanner | ^5.2.3 | QR code scanning (rider delivery confirmation) |
| image_picker | ^1.1.2 | License photo capture on registration/update |

## Architecture
- **Routing**: go_router with redirect guards (`lib/router.dart`)
- **State**: Provider — `AuthProvider` with `UserType` enum (rider, superUser)
- **Theme**: Centralized in `lib/theme.dart` — `CrymaColors`, `CrymaText`, `CrymaTheme`
- **Widgets**: Shared library at `lib/widgets/cryma_widgets.dart`
- **Database**: SQLite via sqflite — `DbHelper` singleton (version 4), services layer on top
- **Services**: `AuthService`, `OrderService`, `ReportService`, `ChatService`

## CRYMA Visual Identity
- Primary color: `0xFFA7193D` (burgundy)
- Dark burgundy: `0xFF7D1632`
- Pale pink surfaces: `0xFFF4DDE3`
- White content surfaces, blue-gray input fields `0xFFEAF1FC`
- Clean, modern, mobile-first layout

## Accounts
| Role | Email | Password |
|------|-------|----------|
| Super User | 111000111@alphamains.4evr | 100102005 |
| Rider | registered via app | set during registration |

- Super User is seeded on first DB creation, never appears in Rider list
- Riders register via the app — accounts start as `pending` until approved by Super User
- Pending riders cannot log in — login shows a popup dialog with the HR review message

## Routes
| Path | Screen |
|------|--------|
| /welcome | WelcomeScreen (initial route) |
| /login | LoginScreen |
| /register | RegisterScreen |
| /rider | RiderHomeScreen |
| /rider/deliveries | RiderDeliveriesScreen |
| /rider/deliveries/:id | DeliveryDetailScreen |
| /rider/messages | RiderMessagesScreen |
| /rider/messages/:id | RiderChatScreen |
| /rider/profile | RiderProfileScreen |
| /admin | AdminDashboardScreen |
| /admin/datasheet | AdminDataSheetScreen |
| /admin/riders | AdminRidersScreen |
| /admin/riders/:id | AdminRiderDetailScreen |
| /admin/riders/:id/citations | AdminCitationsScreen |
| /admin/orders | AdminOrdersScreen |
| /admin/orders/create | CreateOrderScreen |
| /admin/account-management | AccountManagementScreen |
| /admin/rider-requests | RiderRequestsScreen |

- Initial route: `/welcome`
- Logout redirects to: `/welcome`
- Role guards: Riders cannot access `/admin`, Super User cannot access `/rider`

## Database Schema (SQLite — version 4)
- `users` — id, email, password, role, full_name, phone, vehicle_type, license_number, rider_id, license_photo_path, license_photo_pending, account_status, created_at
- `orders` — id, order_id, item_name, item_description, sender, recipient, pickup_location, destination, status, assigned_rider_id, is_dummy, qr_code, created_at, updated_at
- `reports` — id, rider_id, reason, description, status, order_id, created_by, created_at
- `conversations` — id, rider_id, title, created_at
- `messages` — id, conversation_id, sender_id, sender_name, body, message_type, created_at

### DB Migration History
- v1 → v2: Added `qr_code TEXT` to `orders`
- v2 → v3: Added `license_photo_path TEXT` and `account_status TEXT DEFAULT 'active'` to `users`
- v3 → v4: Added `license_photo_pending TEXT` to `users`

## Enums (lib/database/app_constants.dart)
- `UserRole`: rider, superUser
- `OrderStatus`: forPickUp, onTransit, atSortingCenter, outForDelivery, delivered
- `ReportStatus`: active, resolved
- `MessageType`: normal, warningNotice

## Feature Summary

### Rider Registration & Approval Flow
1. Rider fills out registration form including a **required rectangular license photo** (camera or gallery)
2. Account saved with `account_status = 'pending'`
3. Rider cannot log in until approved — login shows popup: *"CRYMA Logistics' Human Resources Team is currently reviewing your account registration. Please be patient. We will get back to you within 24 Hours."*
4. Super User sees badge count on "Rider Requests" dashboard card
5. Super User reviews license photo, approves (sets `active`) or rejects (deletes account)

### License Photo Update Flow
1. Rider goes to Profile → Vehicle & License
2. Current approved license photo is displayed
3. Rider taps "Update License Photo" → camera opens → new photo submitted as `license_photo_pending`
4. "Update Pending Review" badge shown over photo; update button hidden while pending
5. Super User sees request in Rider Requests → License Updates tab
6. Side-by-side current vs new photo comparison shown
7. Approve: `license_photo_pending` copied to `license_photo_path`, pending cleared
8. Reject: `license_photo_pending` cleared, current photo unchanged

### QR Code Delivery Confirmation
- When Super User creates an order, a QR code is generated with payload: `Item delivered Alpha to Omega|<ORDER_ID>`
- QR code displayed in a dialog after creation — intended to be printed and attached to parcel
- When Rider taps "Mark as Delivered" on an order in `outForDelivery` status, the QR scanner opens
- Rider must scan the correct parcel QR code to confirm delivery
- Wrong QR shows error dialog with Try Again / Cancel options
- Torch toggle available in scanner

### Rider Home Screen
- Stat cards: For Pick Up, Active, Delivered — all tappable
- Tapping opens a receipt-style bottom sheet listing orders in that category
- Each row navigates to the order detail screen
- Delivered count fetched separately via `getDeliveredOrdersForRider`

### Profile Screen (Rider)
- Edit Profile (name, phone)
- Vehicle & License (shows license photo, update request flow)
- Change Password (current password verification)
- Notifications (warning notices from chat)
- Help & FAQ (7 expandable accordion items)
- About CRYMA (placeholder)

### Warning Notice Workflow
1. Super User → Riders → select Rider → View Citations
2. Add citation (reason + description)
3. Send Warning Notice (custom or default message)
4. Message appears in Rider's chat as WARNING NOTICE from "SMgr Ruffles"
5. Rider can reply — reply saved to DB, persists across restarts

### Admin Dashboard
- Overview stats: Total Riders, Taking Orders, Being Delivered, With Warnings
- Management nav cards with red badge on "Rider Requests" when pending count > 0
- Badge count = pending registrations + pending license update requests

## File Map
```
lib/
  main.dart                         — Entry point, DB init, AuthProvider, CrymaTheme
  router.dart                       — go_router, redirect/role guards, all routes
  theme.dart                        — CrymaColors, CrymaText, CrymaTheme
  database/
    app_constants.dart              — Enums: UserRole, OrderStatus, ReportStatus, MessageType
    db_helper.dart                  — SQLite singleton v4, migrations, super user seed
  models/
    delivery.dart                   — Legacy stub (unused)
    rider.dart                      — Legacy stub (unused)
  providers/
    auth_provider.dart              — AuthProvider, UserType enum, login/logout/tryAutoLogin/refreshUser
  services/
    auth_service.dart               — UserModel, login, isAccountPending, registerRider,
                                      getAllRiders, getPendingRiders, approveRider, rejectRider,
                                      getRiderById, getUserById, updateProfile, updatePassword,
                                      updateCredentials, deleteRider, getTotalRiders,
                                      submitLicenseUpdateRequest, getRidersWithPendingLicenseUpdate,
                                      approveLicenseUpdate, rejectLicenseUpdate
    order_service.dart              — OrderModel, getAllOrders, getOrdersForRider,
                                      getDeliveredOrdersForRider, getAvailableOrders,
                                      getOrderByOrderId, createOrder, updateStatus,
                                      assignRider, deleteOrder, countActiveDeliveries,
                                      countRidersTakingOrders, generateOrderId, generateQrCode
    report_service.dart             — ReportModel, createReport, getReportsForRider,
                                      countActiveReportsForRider, resolveReport, deleteReport,
                                      countRidersWithActiveReports
    chat_service.dart               — ConversationModel, MessageModel, getConversationsForRider,
                                      getMessages, createConversation, sendMessage,
                                      sendWarningNotice, getWarningNoticesForRider
  widgets/
    cryma_widgets.dart              — CrymaLogo, StatusBadge, OrderCard, SectionHeader,
                                      ProfileMenuTile, ConversationTile, StatCard,
                                      EmptyState, AppBottomNav
    app_bottom_nav.dart             — re-exports AppBottomNav
    status_badge.dart               — re-exports StatusBadge
  screens/
    auth/
      welcome_screen.dart           — Logo, "Deliver with Confidence", Get Started + Login
      login_screen.dart             — Email/password, pending account popup dialog
      register_screen.dart          — Rider registration with required license photo capture
    rider/
      rider_home_screen.dart        — Tappable stat cards, receipt bottom sheets, order lists
      deliveries_screen.dart        — Filter chips, OrderCard list
      delivery_detail_screen.dart   — Status banner, order info, QR scan gate before delivered
      messages_screen.dart          — Conversation list (WARNING NOTICE highlighted)
      chat_screen.dart              — Message bubbles, warning notice styled card, reply input
      profile_screen.dart           — Avatar, role badge, license photo, settings menu, logout
      qr_scanner_screen.dart        — Full-screen QR scanner with torch toggle, frame overlay
    admin/
      admin_dashboard_screen.dart   — Stats overview, management nav cards with badge
      admin_data_sheet_screen.dart  — 4 live stat cards
      riders_screen.dart            — Rider list, search, sort, report count badges
      rider_detail_screen.dart      — Rider info, edit credentials, send warning, delete
      citations_screen.dart         — Report list, add/resolve/delete citations
      orders_screen.dart            — Order list, search, filter, assign/update/delete
      create_order_screen.dart      — Order form, QR code dialog shown after creation
      account_management_screen.dart — Super user credential management
      rider_requests_screen.dart    — Two tabs: Registration requests + License update requests
```

## Known Issues / Notes
- `models/delivery.dart` and `models/rider.dart` are unused legacy stubs
- VS Code may show a cosmetic red underline on `RegisterScreen` in router.dart — stale IDE cache, not a real error. `flutter analyze` = 0 issues.
- `mobile_scanner` KGP warning in build output — cosmetic only, does not affect build

## Last Verified Build
- `flutter analyze`: 0 issues
- `flutter run -d <TECNO CL7>`: ✅ success, app running on device

## Status
✅ Phase 1 — Project inspection
✅ Phase 2 — Architecture plan
✅ Phase 3 — Full redesign + burgundy theme + SQLite backend + all screens
✅ Phase 4 — Missing admin screens created, sorting_hub removed, analyze clean
✅ Phase 5 — PROGRESS.md updated
✅ Phase 6 — Profile screen functionality, home screen stat cards + delivered counter
✅ Phase 7 — QR code generation (admin) + QR scanner gate (rider) for delivery confirmation
✅ Phase 8 — Rider registration approval flow + license photo capture + pending login popup
✅ Phase 9 — License photo update request flow + admin License Updates tab
