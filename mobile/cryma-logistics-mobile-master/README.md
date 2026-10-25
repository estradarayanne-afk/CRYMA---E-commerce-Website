# CRYMA Logistics Mobile App — Project Repository

Complete mobile application suite for CRYMA Logistics, featuring a Flutter rider app, REST API backend, and web-based admin panel.

**Current Phase**: Phase 1 — REST API Foundation ✅ COMPLETE

---

## Quick Start

### Prerequisites
- **Node.js 18+** (for API backend)
- **Flutter SDK 3.47.5+** (for mobile app, coming in Phase 2)
- **Android Studio** (for Android SDK, coming in Phase 2)

### Setup (5 minutes)

```bash
# 1. Navigate to API directory
cd logistics_api

# 2. Install dependencies
npm install

# 3. Create database and run migrations
npm run migrate

# 4. Seed development admin account
npm run seed

# 5. Start the development server
npm run dev
```

Expected output:
```
✓ Server running at http://localhost:3000
```

### Verify Installation

```bash
# Test the API health check
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Project Structure

```
cryma_logistics_mobile_app/
├── logistics_api/                 ← REST API Backend (Phase 1) ✅ COMPLETE
│   ├── src/
│   │   ├── config/               ← Environment & configuration
│   │   ├── database/             ← SQLite schema & migrations
│   │   ├── middleware/           ← Auth, CORS, error handling
│   │   ├── repositories/         ← Data access layer (5 repos)
│   │   ├── types/                ← TypeScript interfaces
│   │   ├── utils/                ← Utilities (logger, hashing, etc.)
│   │   ├── validators/           ← Input validation schemas
│   │   ├── __tests__/            ← Unit tests
│   │   ├── server.ts             ← Entry point
│   │   └── app.ts                ← Express setup
│   ├── .env                       ← Configuration
│   ├── package.json               ← Dependencies
│   ├── tsconfig.json              ← TypeScript config
│   └── README.md                  ← API documentation
│
├── logistics_flutter_app/         ← Mobile App (Phase 2) 🔄 TODO
│   └── [To be created]
│
├── tempdev/                       ← Admin Web Panel (Phase 3) 🔄 TODO
│   └── [To be created]
│
├── docs/                          ← Documentation (Phase 4) 🔄 TODO
│   └── [To be created]
│
├── INSTALLATION.md                ← Complete setup guide
├── PHASE_1_SUMMARY.md             ← Phase 1 details
├── FILE_MANIFEST.md               ← All files created
└── README.md                       ← This file
```

---

## Phase Status

| Phase | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | REST API Backend | ✅ COMPLETE | 43 files, TypeScript, SQLite, comprehensive validation |
| 2 | Flutter Mobile App | 🔄 PLANNED | To be created in next phase |
| 3 | Web Admin Panel | 🔄 PLANNED | HTML/JS/Node.js web UI |
| 4 | Documentation | 🔄 PLANNED | API docs, deployment guides |

---

## What's Included in Phase 1

### ✅ Backend Foundation
- **Express.js** REST API with TypeScript
- **SQLite** database with 8 tables and 16 indexes
- **Authentication** with JWT tokens
- **Password Hashing** with bcrypt (12 rounds)

### ✅ Data Layer
- **5 Repositories** with full CRUD operations
- **User Management** (riders, admins)
- **Order Tracking** (5-state delivery pipeline)
- **Reports & Citations** system
- **Messages & Conversations**
- **Audit Logging**

### ✅ Validation & Security
- **12+ validation rules** (names, emails, phones, passwords, TINs, etc.)
- **CORS** configuration
- **Helmet.js** security headers
- **Input validation** on all fields
- **File upload** restrictions (JPG/PNG, 5MB max)

### ✅ Error Handling & Logging
- **Standardized error responses** with 25+ error codes
- **Structured logging** with 4 log levels
- **Development vs production** error details

### ✅ Testing
- **20+ unit tests** for utilities and validators
- **Jest** test framework configured
- **TypeScript** type safety throughout

---

## Development Accounts

### Admin Account (Created by seed script)
```
Email: alphamain@cryma.com
Password: adminsirafpala
```

⚠️ **Development Only**: This account is only created during development seed. Production requires proper admin creation.

---

## API Overview

### Authentication Endpoints
```
POST   /api/auth/login              ← User login
POST   /api/auth/register           ← Rider registration
POST   /api/auth/logout             ← User logout
POST   /api/auth/refresh-token      ← Refresh JWT
```

### Rider Endpoints
```
GET    /api/riders/profile          ← Get profile
PUT    /api/riders/profile          ← Update profile
POST   /api/riders/license-photo    ← Upload license
```

### Order Endpoints
```
GET    /api/orders                  ← List orders
GET    /api/orders/:id              ← Get order
PUT    /api/orders/:id/status       ← Update status
```

### Admin Endpoints
```
GET    /api/admin/riders/pending           ← Pending registrations
PUT    /api/admin/riders/:id/approve       ← Approve registration
GET    /api/admin/riders                   ← All riders
GET    /api/admin/stats                    ← Dashboard stats
```

See `logistics_api/README.md` for complete API documentation.

---

## Validation Rules

| Field | Rules | Example |
|-------|-------|---------|
| **First/Last Name** | Max 50 chars, Unicode letters/spaces/hyphens/apostrophes only | José García-López |
| **Email** | Valid format, unique, max 100 chars | rider@example.com |
| **Phone** | Philippine format (09XXXXXXXXX or +639XXXXXXXXX) | 09123456789 |
| **Password** | Min 8, uppercase + lowercase + number | MyPass123 |
| **TIN** | Exactly 9 digits | 123456789 |
| **License Number** | Alphanumeric + dashes, max 50 chars | N01-23-456789 |
| **License Photo** | JPG/PNG only, max 5 MB | photo.jpg |

---

## Database Schema

### Tables (8 total)
- **users** — Rider and admin accounts with profiles
- **orders** — Delivery orders with status tracking
- **reports** — Rider citations and warnings
- **conversations** — Message threads
- **messages** — Individual messages
- **registration_approvals** — Approval history
- **license_update_requests** — License photo updates
- **audit_logs** — Admin action audit trail

See `logistics_api/src/database/schema.sql` for complete schema.

---

## Environment Configuration

Edit `logistics_api/.env` to customize:

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_PATH=./storage/db/cryma_logistics.db

# Authentication
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRY=24h

# File Storage
UPLOAD_DIR=./storage/uploads
UPLOAD_MAX_SIZE=5242880

# Admin Account (Dev Only)
ADMIN_EMAIL=alphamain@cryma.com
ADMIN_PASSWORD=adminsirafpala
```

---

## Commands

### Setup & Database
```bash
npm install              # Install dependencies
npm run migrate         # Create database schema
npm run seed            # Seed admin account
```

### Development
```bash
npm run dev             # Start dev server (auto-reload)
npm run build           # Compile TypeScript
npm start               # Run production build
```

### Testing & Quality
```bash
npm test                # Run all tests
npm run test:watch     # Watch mode tests
npm run lint            # Run ESLint
npm run format          # Format with Prettier
```

---

## Troubleshooting

### Port 3000 already in use
```bash
# Change PORT in .env
PORT=3001

# Then restart the server
npm run dev
```

### Database errors
```bash
# Reset database
rm storage/db/cryma_logistics.db

# Recreate
npm run migrate
npm run seed
```

### "Node.js not found"
```bash
# Install from https://nodejs.org
# Then verify:
node --version
npm --version
```

### File upload errors
```bash
# Create uploads directory
mkdir -p storage/uploads
```

See `INSTALLATION.md` for more troubleshooting.

---

## Architecture

### Layered Architecture
```
Request
  ↓
Express Middleware (CORS, Auth, Validation)
  ↓
Route Handler / Controller (Phase 2)
  ↓
Service / Business Logic (Phase 2)
  ↓
Repository (Data Access)
  ↓
SQLite Database
```

### Design Patterns
- **Repository Pattern** — Database abstraction for easy switching
- **JWT Authentication** — Stateless, works with mobile apps
- **Zod Validation** — Type-safe, reusable schemas
- **Middleware Stack** — Layered security and error handling

---

## Security Features

✅ **Passwords**
- Hashed with bcrypt (12 rounds)
- Never stored in plaintext

✅ **Authentication**
- JWT tokens with 24-hour expiry
- Role-based access control

✅ **Authorization**
- Riders cannot access admin endpoints
- Admins cannot access rider-only operations

✅ **Input Validation**
- All inputs validated with Zod
- Client and server-side validation

✅ **File Uploads**
- Type validation (JPG/PNG only)
- Size limits (5 MB max)
- Private storage

✅ **Headers**
- Helmet.js security headers
- CORS properly configured

---

## Production Deployment

Before deploying to production:

1. **Generate strong JWT secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set environment variables**
   ```bash
   NODE_ENV=production
   JWT_SECRET=<generated-secret>
   DATABASE_PATH=/var/lib/cryma/db.sqlite
   ```

3. **Use production database**
   - Replace SQLite with PostgreSQL or MySQL
   - Update connection in `src/database/db.ts`

4. **Enable HTTPS**
   - Use reverse proxy (nginx)
   - Obtain SSL certificate

5. **Set up monitoring**
   - Centralized logging
   - Error tracking (Sentry, etc.)
   - Performance monitoring

See `INSTALLATION.md` for detailed deployment guide.

---

## Next Steps

1. ✅ **Phase 1 Complete** — API backend foundation ready
2. ⏳ **Phase 2** — Build Flutter mobile app
3. ⏳ **Phase 3** — Create web admin panel
4. ⏳ **Phase 4** — Documentation and deployment guides

---

## Key Files

| File | Purpose |
|------|---------|
| `INSTALLATION.md` | Complete setup and troubleshooting guide |
| `PHASE_1_SUMMARY.md` | Detailed Phase 1 implementation summary |
| `FILE_MANIFEST.md` | Complete file listing and statistics |
| `logistics_api/README.md` | API documentation and endpoints |
| `logistics_api/src/database/schema.sql` | Database schema |
| `logistics_api/.env` | Configuration |

---

## Support & Documentation

- **API Docs**: `logistics_api/README.md`
- **Setup Guide**: `INSTALLATION.md`
- **Implementation**: `PHASE_1_SUMMARY.md`
- **Files**: `FILE_MANIFEST.md`

---

## Technology Stack

### Backend (Phase 1)
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (production)
- **Auth**: JWT
- **Validation**: Zod
- **Testing**: Jest
- **Password Hashing**: bcrypt

### Mobile App (Phase 2)
- **Framework**: Flutter 3.47.5+
- **Language**: Dart
- **Database**: Local SQLite

### Admin Panel (Phase 3)
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Backend**: Node.js Express
- **Database**: Shared SQLite/PostgreSQL

---

## Contributors & License

**Project**: CRYMA Logistics Mobile App Suite

**License**: Proprietary — CRYMA Logistics

---

## Quick Reference

```bash
# Start development
cd logistics_api
npm install
npm run migrate
npm run seed
npm run dev

# Visit API
http://localhost:3000

# Run tests
npm test

# View API health
curl http://localhost:3000/health
```

---

**Last Updated**: 2024  
**Status**: Phase 1 ✅ Complete, Ready for Testing  
**Next Phase**: Phase 2 — Flutter Mobile App Development
