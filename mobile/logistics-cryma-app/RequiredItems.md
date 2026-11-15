# CRYMA Logistics — Required Items & Setup Guide

This is the CRYMA Logistics Flutter app for Android.
Before running or building this project, make sure the following software is installed.

> **Note:** Instructions below apply to both **Windows** and **Ubuntu-based Linux** systems.
> OS-specific steps are labeled where they differ.

---

## Required Software

### 1. Flutter SDK
- Version: **3.47.5**
- Download: https://docs.flutter.dev/release/archive

**Ubuntu:**
```bash
sudo snap install flutter --classic
# or manually extract and add to PATH:
export PATH="$PATH:/path/to/flutter/bin"
# Add the above line to ~/.bashrc or ~/.zshrc to persist it
```

**Windows:**
- Download the zip, extract, and add `flutter\bin` to your system PATH via Environment Variables

Verify: `flutter --version`

---

### 2. Java Development Kit (JDK)
- Version: **25.0.3** — Android Studio bundled JDK recommended
- Java target compatibility: **21**

**Ubuntu:**
```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

**Windows:**
- Use the JDK bundled with Android Studio (recommended), or install from https://adoptium.net

Verify: `java -version`

---

### 3. Android Studio
- Required for Android SDK, emulator, and bundled JDK
- Download: https://developer.android.com/studio

**Ubuntu:**
```bash
sudo snap install android-studio --classic
# or download the .tar.gz, extract, and run bin/studio.sh
```

**Windows:**
- Run the `.exe` installer

After install on both systems:
- Open Android Studio → SDK Manager → install the Android SDK
- Set `ANDROID_HOME` environment variable if `flutter doctor` reports it missing

**Ubuntu:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
# Add both lines to ~/.bashrc or ~/.zshrc
```

---

### 4. Gradle
- Version: **9.7.1** — managed automatically via Gradle wrapper, no manual install needed
- Wrapper config: `android/gradle/wrapper/gradle-wrapper.properties`

---

### 5. Android Gradle Plugin (AGP)
- Version: **9.4.1** (declared in `android/settings.gradle`)

---

### 6. Kotlin
- Version: **2.3.20** (declared in `android/settings.gradle`)

---

## Environment Setup Steps

**Ubuntu:**
```bash
sudo apt update && sudo apt install git curl unzip xz-utils zip libglu1-mesa
git clone <repo-url> logistics_cryma_app   # or copy project folder
cd logistics_cryma_app
flutter pub get
flutter doctor                             # resolve any remaining issues
flutter build apk --debug
```

**Windows:**
1. Install Flutter 3.47.5 and add to PATH
2. Install Android Studio (includes JDK + Android SDK)
3. Run `flutter doctor` and resolve any issues
4. Run `flutter pub get` in the project root
5. Run `flutter build apk --debug`

---

## Key Config Notes

- `android/gradle.properties` has `kotlin.incremental=false` — this is intentional.
  It fixes a Kotlin incremental cache crash when the project and pub cache are on different drives (Windows-specific issue).
  **Do not remove this line** — it is harmless on Linux and prevents breakage on Windows.

- The SQLite database is versioned. Current version: **4**. Migrations are handled automatically via `onUpgrade` in `db_helper.dart`. Do not manually delete or modify the DB file on device during development unless you also `flutter clean`.

---

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

---

## Android Permissions Required

The following permissions are used by the app and must be present in `AndroidManifest.xml`:
- `CAMERA` — for license photo capture (image_picker) and QR scanning (mobile_scanner)
- `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` — for gallery photo selection (image_picker)

These are declared automatically by the plugins. If camera or gallery access fails on device, verify permissions are granted in Android Settings → Apps → CRYMA Logistics → Permissions.

---

## Accounts (Seeded on First Launch)

| Role | Email | Password |
|------|-------|----------|
| Super User | 111000111@alphamains.4evr | 100102005 |

Rider accounts are created via the registration screen and require Super User approval before login is permitted.

---

## Last Verified Build

- `flutter analyze`: 0 issues
- `flutter run -d <device>`: ✅ success — tested on TECNO CL7 (Android 15, API 35)
- Output APK: `build\app\outputs\flutter-apk\app-debug.apk`

---

## Project Location Note

Original project path (Windows): `C:\projects\logistics_cryma_app`
On a new system or path, always re-run `flutter pub get` before building.
