# CRYMA Logistics Mobile App — Installation & Setup

## Prerequisites

Before running this project, ensure you have the following installed:

### 1. Node.js & npm (for REST API backend)
- **Version**: Node.js 18+ (LTS recommended)
- **Download**: https://nodejs.org
- **Windows**: Download installer from nodejs.org and run it
- **Verification**: 
  ```powershell
  node --version
  npm --version
  ```

### 2. Flutter SDK (for mobile app)
- **Version**: Flutter 3.47.5+
- **Download**: https://flutter.dev/docs/get-started/install
- **Verification**: 
  ```bash
  flutter --version
  ```

### 3. Android Studio (for Android SDK)
- **Download**: https://developer.android.com/studio
- **Required for**: Android SDK, build tools, emulator

## Project Structure

```
cryma_logistics_mobile_app/
├── logistics_api/              ← REST API backend (Node.js, Express, TypeScript, SQLite)
├── logistics_flutter_app/      ← Mobile app (Flutter) [to be created]
├── tempdev/                    ← Admin web panel (Node.js, HTML, JS) [to be created]
└── docs/                       ← Documentation [to be created]
```

## Getting Started

### Phase 1: REST API Backend Setup

#### 1. Install Node.js Dependencies

```bash
cd logistics_api
npm install
```

This installs all dependencies including:
- Express.js (web framework)
- TypeScript (type safety)
- SQLite (database)
- bcrypt (password hashing)
- jsonwebtoken (JWT authentication)
- zod (input validation)

#### 2. Create Database and Run Migrations

```bash
npm run migrate
```

This creates the SQLite database at `./storage/db/cryma_logistics.db` with all tables, indexes, and constraints.

#### 3. Seed Development Admin Account

```bash
npm run seed
```

This creates the development admin account:
- **Email**: `alphamain@cryma.com`
- **Password**: `adminsirafpala`

**⚠️ Important**: This seed script only runs in development. The admin account is NOT automatically created in production.

#### 4. Run Development Server

```bash
npm run dev
```

Expected output:
```
INFO: Starting database migrations...
INFO: Database initialized at: ./storage/db/cryma_logistics.db
INFO: ✓ Server running at http://localhost:3000
```

The API will be available at `http://localhost:3000`

#### 5. Verify API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Running Tests (After Node.js Setup)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Format code
npm run format
```

## Configuration

Edit `logistics_api/.env` to customize settings:

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_PATH=./storage/db/cryma_logistics.db

# JWT
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRY=24h

# File Storage
UPLOAD_DIR=./storage/uploads
UPLOAD_MAX_SIZE=5242880

# Admin Account (Development Only)
ADMIN_EMAIL=alphamain@cryma.com
ADMIN_PASSWORD=adminsirafpala

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:8080

# Logging
LOG_LEVEL=debug

# API
API_BASE_URL=http://localhost:3000
```

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register rider
- `POST /api/auth/logout` — Logout
- `POST /api/auth/refresh-token` — Refresh JWT

### Riders
- `GET /api/riders/profile` — Get profile
- `PUT /api/riders/profile` — Update profile
- `POST /api/riders/license-photo` — Upload license photo
- `POST /api/riders/license-update-request` — Request license update

### Orders
- `GET /api/orders` — List orders
- `GET /api/orders/:id` — Get order detail
- `PUT /api/orders/:id/status` — Update status
- `POST /api/admin/orders` — Create (admin)
- `DELETE /api/admin/orders/:id` — Delete (admin)

### Admin
- `GET /api/admin/riders/pending` — Pending registrations
- `PUT /api/admin/riders/:id/approve` — Approve registration
- `PUT /api/admin/riders/:id/reject` — Reject registration
- `GET /api/admin/riders` — List all riders
- `GET /api/admin/stats` — Dashboard stats

See `logistics_api/README.md` for complete endpoint documentation.

## Database Schema

The SQLite database includes the following tables:

- **users** — Riders, admins with profiles, credentials, status
- **orders** — Delivery orders with status tracking
- **reports** — Rider warnings and citations
- **conversations** — Messages between riders and admin
- **messages** — Individual messages with type (normal/warning)
- **registration_approvals** — Track registration approval history
- **license_update_requests** — License photo update requests
- **audit_logs** — Admin action history

See `logistics_api/src/database/schema.sql` for complete schema.

## Troubleshooting

### Node.js not found
- Ensure Node.js is installed: https://nodejs.org
- Add Node.js to system PATH
- Restart terminal after installation

### Port 3000 already in use
Change `PORT` in `.env`:
```env
PORT=3001
```

### Database locked error
- Stop the server
- Delete `storage/db/cryma_logistics.db`
- Run migrations again: `npm run migrate`

### File upload errors
Create the uploads directory:
```bash
mkdir -p storage/uploads
```

### JWT secret not set
Generate a strong secret and set it in `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Production Deployment

1. **Use a real database** (PostgreSQL, MySQL) instead of SQLite
2. **Set strong JWT_SECRET** — generate random 32-byte hex string
3. **Set NODE_ENV=production**
4. **Configure CORS_ORIGIN** to your domain
5. **Use environment secrets management** (AWS Secrets Manager, etc.)
6. **Enable HTTPS** — use reverse proxy (nginx, etc.)
7. **Set up logging** — use centralized logging service
8. **Regular database backups**

## Next Steps

1. ✅ Install Node.js
2. ✅ Run `npm install`
3. ✅ Run `npm run migrate`
4. ✅ Run `npm run seed`
5. ✅ Run `npm run dev`
6. ⏭️ Build Flutter mobile app
7. ⏭️ Create web admin panel
8. ⏭️ Deploy to production

## Support

For API issues, check:
- `logistics_api/README.md` — API documentation
- `src/database/schema.sql` — Database schema
- Logs in console output

For database issues:
- Verify SQLite path in `.env`
- Check file permissions on `storage/` directory
- Ensure disk space available
