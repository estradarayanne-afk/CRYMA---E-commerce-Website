# Havada Kadav
## CRYMA Logistics — Required Software & Open Integration Points

---

## Required Software

### 1. Node.js
- **Version**: 18 or higher (tested on v24)
- **Download**: https://nodejs.org/
- **Used by**: Backend API (`logistics_api/`), Admin Panel (`admin_panel/`)
- **Verify**: `node --version`

### 2. npm
- **Version**: Comes bundled with Node.js
- **Used by**: Installing dependencies for both server components
- **Verify**: `npm --version`

### 3. Flutter SDK
- **Version**: 3.10.0 or higher
- **Download**: https://docs.flutter.dev/get-started/install/windows
- **Used by**: Mobile app (`flutter_app/`)
- **Verify**: `flutter doctor`

### 4. Android Studio
- **Download**: https://developer.android.com/studio
- **Why**: Provides the Android SDK, emulator, and USB device drivers
- **Required components** (install inside Android Studio):
  - Android SDK (API level 33 or higher)
  - Android Emulator
  - Android SDK Platform-Tools (for `adb`)

### 5. Git
- **Download**: https://git-scm.com/
- **Used by**: Cloning and pushing the repository
- **Verify**: `git --version`

---

## Running the Project (Order Matters)

```
Step 1 — Install backend deps:   cd logistics_api   && npm install
Step 2 — Create database:        npm run migrate
Step 3 — Create admin account:   npm run seed
Step 4 — Start backend:          npm run dev          → runs on port 3000

Step 5 — Install panel deps:     cd admin_panel      && npm install
Step 6 — Start admin panel:      npm start            → runs on port 3001

Step 7 — Install Flutter deps:   cd flutter_app      && flutter pub get
Step 8 — Run mobile app:         flutter run          → Android emulator or USB device
```

---

## Open-Ended Connectors (API Integration Points)

These are the exact files and variables to change when connecting to a production database or external website.

---

### Connector 1 — Database Engine
**What it does**: Swaps the local SQLite file for a real production database (PostgreSQL, MySQL, etc.)

**File**: `logistics_api/src/database/db.ts`

```typescript
// CURRENT — SQLite file on disk
db = await open({
  filename: env.DATABASE_PATH,   // ← points to a local .db file
  driver: sqlite3.Database,
});

// TO CONNECT TO PRODUCTION DB — replace this entire block with:
// import { Pool } from 'pg';  (for PostgreSQL)
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Env variable to set**: `DATABASE_PATH` in `logistics_api/.env`
```env
# Current (SQLite)
DATABASE_PATH=./storage/db/cryma_logistics.db

# Production (example — PostgreSQL connection string)
DATABASE_URL=postgresql://user:password@host:5432/cryma_logistics
```

---

### Connector 2 — Database Schema
**What it does**: Defines all 9 tables. Run this against any database to set up the structure.

**File**: `logistics_api/src/database/schema.sql`

**Tables**:
| Table | Purpose |
|-------|---------|
| `users` | Riders and admin accounts |
| `orders` | Delivery orders with 5-stage status |
| `reports` | Rider citations and warnings |
| `conversations` | Admin-to-rider message threads |
| `messages` | Individual chat messages |
| `registration_approvals` | Approval workflow history |
| `license_update_requests` | License photo update requests |
| `audit_logs` | All admin action history |

To run against production DB: `npm run migrate` (after updating `DATABASE_PATH`/`DATABASE_URL`)

---

### Connector 3 — CORS Whitelist
**What it does**: Controls which external domains are allowed to call the API. Add your main website's domain here.

**File**: `logistics_api/src/middleware/cors.ts`

**Env variable**: `CORS_ORIGIN` in `logistics_api/.env`
```env
# Current (local only)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Add your website's domain:
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://www.crymalogistics.com,https://admin.crymalogistics.com
```

---

### Connector 4 — JWT Secret
**What it does**: Signs and verifies all auth tokens. The main website must use the same secret if it needs to verify rider tokens.

**File**: `logistics_api/src/config/env.ts` (line: `JWT_SECRET`)

**Env variable**: `JWT_SECRET` in `logistics_api/.env`
```env
# Current (insecure default — MUST change before production)
JWT_SECRET=your_jwt_secret_key_change_in_production

# Production — generate a real secret:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=a1b2c3d4e5f6...  (64-char hex string)
```

---

### Connector 5 — API Base URL (Flutter App)
**What it does**: The mobile app's single point for pointing at the backend. Change this to reach any server — local, LAN, or production.

**File**: `flutter_app/lib/config/app_config.dart`

```dart
// Current (LAN IP for physical device testing)
static String apiBaseUrl = 'http://192.168.1.7:3000';

// Android Emulator
static String apiBaseUrl = 'http://10.0.2.2:3000';

// Production website
static String apiBaseUrl = 'https://api.crymalogistics.com';
```

---

### Connector 6 — Admin Panel Backend Proxy
**What it does**: The admin panel proxies all `/api/*` requests to the backend. Change `BACKEND_HOST` and `BACKEND_PORT` to point at a remote server.

**File**: `admin_panel/server.js`

```javascript
// Current (local machine)
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3000;

// Production — change to your server's IP or domain
const BACKEND_HOST = 'api.crymalogistics.com';
const BACKEND_PORT = 443;  // HTTPS
```

**Env variable**: `BACKEND_API_URL` in `admin_panel/.env`
```env
# Current
BACKEND_API_URL=http://127.0.0.1:3000

# Production
BACKEND_API_URL=https://api.crymalogistics.com
```

---

### Connector 7 — File Storage (License Photos)
**What it does**: Where uploaded license photos are stored. Currently a local folder. For production, replace with S3, Cloudinary, or your server's storage.

**File**: `logistics_api/src/utils/fileStorage.ts` (the `ensureUploadsDir()` and upload logic)

**Env variable**: `UPLOAD_DIR` in `logistics_api/.env`
```env
# Current (local folder)
UPLOAD_DIR=./storage/uploads

# Production server path
UPLOAD_DIR=/var/www/cryma/uploads

# Or replace the multer storage engine in:
# logistics_api/src/routes/auth.routes.ts
# — swap diskStorage for an S3 multer adapter
```

---

### Connector 8 — Server Host & Port
**What it does**: Where the backend binds. Change `HOST` from `127.0.0.1` to `0.0.0.0` to accept connections from outside the local machine.

**Env variable**: `HOST` and `PORT` in `logistics_api/.env`
```env
# Current (local only)
HOST=127.0.0.1
PORT=3000

# Production (accept all connections — use behind a reverse proxy like nginx)
HOST=0.0.0.0
PORT=3000
```

---

### Connector 9 — Address Data Source (PSGC API)
**What it does**: Philippine address dropdowns (region → province → municipality → barangay) fetch from a free public API. If the main website has its own address database, swap the URLs here.

**File**: `logistics_api/src/services/address.service.ts`

```typescript
// Current (public PSGC API)
const BASE_URL = 'https://psgc.gitlab.io/api';

// Replace with your own endpoint if needed:
const BASE_URL = 'https://api.crymalogistics.com/address';
```

---

## Summary Table

| # | Connector | File | Env Variable |
|---|-----------|------|--------------|
| 1 | Database engine | `logistics_api/src/database/db.ts` | `DATABASE_PATH` |
| 2 | Database schema | `logistics_api/src/database/schema.sql` | — |
| 3 | CORS whitelist | `logistics_api/src/middleware/cors.ts` | `CORS_ORIGIN` |
| 4 | JWT secret | `logistics_api/src/config/env.ts` | `JWT_SECRET` |
| 5 | Flutter API URL | `flutter_app/lib/config/app_config.dart` | hardcoded |
| 6 | Admin panel proxy | `admin_panel/server.js` | `BACKEND_API_URL` |
| 7 | File storage | `logistics_api/src/utils/fileStorage.ts` | `UPLOAD_DIR` |
| 8 | Server host/port | `logistics_api/src/server.ts` | `HOST`, `PORT` |
| 9 | Address data | `logistics_api/src/services/address.service.ts` | — |

---

## All Environment Variables (logistics_api/.env)

```env
NODE_ENV=development
PORT=3000
HOST=127.0.0.1
DATABASE_PATH=./storage/db/cryma_logistics.db
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRY=24h
UPLOAD_DIR=./storage/uploads
UPLOAD_MAX_SIZE=5242880
ADMIN_EMAIL=111000111@alphamains.4evr
ADMIN_PASSWORD=100102005
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
LOG_LEVEL=debug
API_BASE_URL=http://localhost:3000
```

---

*Generated for CRYMA Logistics Mobile App — github.com/rafael0120rmo-commits/cryma-logistics-mobile*
