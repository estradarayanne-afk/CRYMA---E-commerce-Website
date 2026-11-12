# CRYMA Shopper App

This Flutter shopper app connects to the Laravel API in `backend`. From this
folder:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

For a physical Android phone, use the computer's LAN IPv4 address instead of
`10.0.2.2`. See [the mobile setup guide](../README.md) for backend startup,
device setup, checkout requirements, and troubleshooting.

## Push notifications (Android and iOS)

Push delivery requires a Firebase project configured for the mobile app and
Firebase Cloud Messaging. Supply the project's client configuration at build
time; these values identify the app and are not service-account credentials:

```powershell
flutter run `
  --dart-define=API_BASE_URL=http://10.0.2.2:8000 `
  --dart-define=FIREBASE_API_KEY=replace-with-firebase-api-key `
  --dart-define=FIREBASE_APP_ID=replace-with-firebase-app-id `
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=replace-with-firebase-sender-id `
  --dart-define=FIREBASE_PROJECT_ID=replace-with-firebase-project-id
```

On the backend, set `FIREBASE_PROJECT_ID` and `FIREBASE_CREDENTIALS` in
`backend/.env`. `FIREBASE_CREDENTIALS` must point to a service-account JSON
file stored outside the repository. Run a Laravel queue worker (`php artisan
queue:work`) so delivery updates can be sent. For iOS, configure APNs for the
Firebase app. Without these settings, the app continues to work, but push
notifications are disabled.

## Screen organization

Screens in `lib/screens` are grouped by feature: `auth/login`, `auth/signup`,
`onboarding`, `catalog`, `cart`, `orders`, `chat`, `account`, and `support`.
