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
