# CRYMA Admin Panel

A web-based admin panel for managing rider registrations in the CRYMA Logistics system.

## Features

- **Secure Admin Login**: JWT-based authentication with development seed account
- **Dashboard**: View statistics (pending, active, total riders)
- **Pending Riders List**: Browse pending registrations with search and filtering
- **Rider Details**: View comprehensive rider information including vehicle and license details
- **License Photo Preview**: Display uploaded license photos
- **Approval Workflow**: Approve or reject pending registrations with audit logging
- **API Proxy**: Seamless communication with backend API without CORS issues

## Prerequisites

- Node.js 14+
- Backend API running on `http://localhost:3000`

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
BACKEND_API_URL=http://localhost:3000
ADMIN_PORT=3001
ADMIN_HOST=localhost
```

## Running

```bash
npm start
```

The admin panel will be available at `http://localhost:3001`

## Demo Credentials

- **Email**: alphamain@cryma.com
- **Password**: adminsirafpala

## File Structure

```
admin_panel/
├── server.js                 # Express server with API proxy
├── package.json              # Dependencies
├── .env.example              # Environment config template
└── public/
    ├── index.html            # Login page
    ├── dashboard.html        # Statistics dashboard
    ├── riders.html           # Pending riders list
    ├── rider-detail.html     # Rider details view
    ├── js/
    │   ├── api.js            # API client
    │   └── app.js            # Shared utilities
    └── css/
        └── style.css         # Responsive styling
```

## API Endpoints

The admin panel proxies the following backend endpoints:

- `POST /api/auth/login` - Admin login
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/riders/pending` - List pending riders
- `GET /api/admin/riders/:riderId` - Get rider details
- `POST /api/admin/riders/:riderId/approve` - Approve rider
- `POST /api/admin/riders/:riderId/reject` - Reject rider
- `GET /api/uploads/:filename` - License photo proxy

## Token Management

The JWT token is stored in `localStorage` as `adminToken` and automatically:
- Sent in the `Authorization` header for all API requests
- Cleared on 401/403 responses (redirects to login)
- Persists across page refreshes

## Development

For development with auto-reload:

```bash
npm install --save-dev nodemon
npm run dev
```

## Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+
