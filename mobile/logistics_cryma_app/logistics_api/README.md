# CRYMA Logistics API

REST API backend for CRYMA Logistics mobile application.

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd logistics_api
npm install
```

### Configuration

Copy `.env.example` to `.env` and update values if needed:

```bash
cp .env.example .env
```

Default development configuration:
- **Admin Email**: `alphamain@cryma.com`
- **Admin Password**: `adminsirafpala`
- **Database**: SQLite at `./storage/db/cryma_logistics.db`
- **API Port**: `3000`

### Database Setup

Run migrations to create database schema:

```bash
npm run migrate
```

Seed development admin account:

```bash
npm run seed
```

### Running the Server

**Development (with auto-reload):**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` — User login
- `POST /api/auth/register` — Rider registration
- `POST /api/auth/logout` — User logout
- `POST /api/auth/refresh-token` — Refresh JWT token

### Riders
- `GET /api/riders/profile` — Get current rider profile
- `PUT /api/riders/profile` — Update rider profile
- `POST /api/riders/license-photo` — Upload license photo
- `POST /api/riders/license-update-request` — Submit license photo update request

### Orders
- `GET /api/orders` — List rider's orders
- `GET /api/orders/:id` — Get order detail
- `PUT /api/orders/:id/status` — Update order status
- `POST /api/admin/orders` — Create order (admin only)
- `DELETE /api/admin/orders/:id` — Delete order (admin only)

### Messages
- `GET /api/riders/messages` — List conversations
- `GET /api/riders/messages/:id` — Get messages in conversation
- `POST /api/riders/messages/send` — Send message

### Admin
- `GET /api/admin/riders/pending` — List pending registrations
- `PUT /api/admin/riders/:id/approve` — Approve registration
- `PUT /api/admin/riders/:id/reject` — Reject registration
- `GET /api/admin/riders/:id/license-updates` — List pending license updates
- `PUT /api/admin/riders/:id/license-approve` — Approve license update
- `PUT /api/admin/riders/:id/license-reject` — Reject license update
- `GET /api/admin/riders` — List all riders
- `GET /api/admin/stats` — Get dashboard statistics

## Project Structure

```
src/
├── config/              # Environment and app configuration
├── database/            # Database initialization and migrations
├── middleware/          # Express middleware
├── repositories/        # Data access layer
├── types/               # TypeScript interfaces and types
├── utils/               # Utility functions
├── validators/          # Input validation schemas
├── app.ts               # Express app setup
└── server.ts            # Server entry point
```

## Validation Rules

- **Names**: Max 50 chars, Unicode letters/spaces/hyphens/apostrophes only
- **Email**: Valid format, max 100 chars, must be unique
- **Phone**: Philippine format (+639XXXXXXXXX or 09XXXXXXXXX)
- **Password**: Min 8 chars, must include uppercase, lowercase, and number
- **TIN**: Exactly 9 digits
- **License Number**: Alphanumeric + dashes, max 50 chars
- **License Photo**: JPG/PNG only, max 5 MB

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Code Formatting

```bash
npm run format
```

## Error Handling

API returns standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint"
  }
}
```

## File Storage

License photos and other uploads are stored in `./storage/uploads/`.

Files are private and only accessible through authenticated API endpoints.

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 24-hour expiry
- CORS configured for development
- Helmet.js security headers enabled
- Input validation on all endpoints
- Database foreign keys enabled

## Database

Using SQLite for local development.

To use a different database in production, replace the database module while maintaining the repository interface.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Configure CORS_ORIGIN appropriately
4. Use PostgreSQL or MySQL instead of SQLite
5. Set up proper logging and monitoring
6. Use environment secrets management

## License

Proprietary — CRYMA Logistics
