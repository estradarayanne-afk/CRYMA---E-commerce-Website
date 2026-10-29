# CRYMA Mobile Apps

There are two separate Flutter apps in this folder:

- Shopper: `cryma-flutter-app-main`
- Rider: `cryma-logistics-mobile-master/flutter_app`

Both apps use the Laravel API in `backend`. The API origin is configured with
`API_BASE_URL` (the host and port only; do not add `/api`).

## Start the web/API backend

In PowerShell, start Laravel from the repository root:

```powershell
cd C:\Code\e-commerce\ecommerce-system\backend
php artisan serve --host=0.0.0.0 --port=8000
```

The local database and Laravel environment must be configured first. Keep this
terminal running while using either mobile app. Run the web frontend separately
if you also want to open the website.

## Run on an Android emulator

Install dependencies once for each app:

```powershell
cd C:\Code\e-commerce\ecommerce-system\mobile\cryma-flutter-app-main
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

In another terminal, launch the rider app:

```powershell
cd C:\Code\e-commerce\ecommerce-system\mobile\cryma-logistics-mobile-master\flutter_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

`10.0.2.2` is the Android emulator's address for services running on the
development computer.

## Run on a physical Android phone

1. Connect the phone and computer to the same trusted Wi-Fi network.
2. Run `ipconfig` on the computer and find its IPv4 address on that network.
3. Keep Laravel listening on `0.0.0.0:8000`; allow the development server
   through the computer's firewall on the private network if prompted.
4. Enable Developer Options and USB debugging on the phone, then connect it
   with USB. Confirm the debugging prompt on the phone.
5. From each app's folder, run `flutter devices` to find the device, then run:

```powershell
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<computer-ip>:8000
```

For example, replace `<computer-ip>` with the IPv4 address reported by
`ipconfig`. Do not use `localhost` or `127.0.0.1` on the phone; those addresses
refer to the phone itself.

To create an installable Android debug APK instead:

```powershell
flutter build apk --debug --dart-define=API_BASE_URL=http://<computer-ip>:8000
```

The APK is written to that app's `build\app\outputs\flutter-apk\` folder. Copy
it to the Android phone and open it to install. For a release build or
production use, configure an HTTPS API origin; the apps currently permit
cleartext HTTP for local development only.

## Connected workflows and account requirements

- The shopper app signs in through Laravel, loads the public product catalog
  and product details, stores its cart on the device, submits checkout to the
  authenticated buyer-order API, and loads buyer order history/details.
- Shopper checkout requires a buyer account with a saved delivery address.
  Orders are priced and validated by Laravel; checkout sends the API's
  required idempotency key.
- The rider app signs in through Laravel and reads its courier pickup and
  delivery assignments. Pickup status updates and delivery proof (recipient
  name plus a camera photo) are submitted to the courier API.
- Rider access is limited to active, verified rider accounts with approved
  required documents and an eligible vehicle. A buyer or seller account cannot
  log in to the rider app.
- The rider app's legacy registration form does not collect all fields and
  verification documents required by the current Laravel registration API.
  Create/verify the rider account through the CRYMA website; the mobile app
  will not create a fake offline account.
- Some secondary shopper screens (such as chat, wishlist, and parts of profile
  management) remain local/demo UI and are not represented as connected API
  features.

## Troubleshooting

- `flutter devices` should show the emulator or phone before running.
- If Android builds request SDK licenses, run `flutter doctor --android-licenses`
  and accept the licenses, then rerun `flutter doctor`.
- This environment's APK builds are blocked because Android NDK
  `28.2.13676358` is missing and its command-line installer crashes. Install
  NDK (Side by side) version `28.2.13676358` from Android Studio's
  **Tools > SDK Manager > SDK Tools > Show Package Details**, then rerun the
  Flutter command.
- If requests time out, confirm Laravel is running, the phone/emulator can
  reach the computer, the selected `API_BASE_URL` is correct, and the firewall
  permits port `8000`.
- A physical phone needs the computer's current LAN IP; this can change when
  reconnecting to Wi-Fi.
