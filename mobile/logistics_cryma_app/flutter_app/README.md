# CRYMA Rider App

This Flutter app uses the Laravel courier API and requires an active, verified,
eligible rider account. From this folder:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

For a physical Android phone, replace `10.0.2.2` with the computer's LAN IPv4
address. The API base URL is the Laravel origin and must not include `/api`.
Rider login, pickup/delivery assignments, status changes, and proof-of-delivery
uploads use Laravel. The current mobile registration form is not sufficient
for the required Laravel rider-registration fields; register using the CRYMA
website.

See [the mobile setup guide](../../README.md) for backend startup, Android
device setup, APK builds, and troubleshooting.
