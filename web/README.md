# CRYMA Web Frontend

## Open the local site on a phone

The Vite development server listens on all network interfaces. Local API and
image requests are proxied through Vite to the Docker backend, so a phone can
use the same origin without a browser CORS exception.

1. Start the backend container and confirm its port mapping is `8000:10000`:

   ```powershell
   docker ps --filter name=cryma-backend
   ```

2. From the repository's `web` directory, install dependencies once if needed,
   then start Vite:

   ```powershell
   cd C:\Code\e-commerce\ecommerce-system\web
   npm ci
   npm run dev
   ```

3. Find the computer's Wi-Fi IPv4 address and open the Vite URL on a phone
   connected to the same Wi-Fi:

   ```powershell
   Get-NetIPAddress -AddressFamily IPv4 |
     Where-Object { $_.InterfaceAlias -match 'Wi-Fi' -and $_.IPAddress -notlike '169.254*' } |
     Select-Object -ExpandProperty IPAddress
   ```

   Replace `<computer-ip>` below with that address:

   ```text
   http://<computer-ip>:5173
   ```

   The computer's firewall must allow inbound TCP port `5173` on the trusted
   private network. The API proxy target defaults to `http://127.0.0.1:8000`;
   override it with `VITE_API_PROXY_TARGET` if the Docker API uses another
   local port.

The browser API URL is relative in development (`/api`), and Vite forwards
`/api` and `/storage` to the Docker backend. Product media URLs are relative
storage paths; the web client resolves these against the configured API origin
in production and the Vite proxy in development.

## Production on Cloudflare Pages

The deployed site is `https://cryma.store`; the public Laravel API is
`https://api.cryma.store`. Production builds default to this API origin, and
Cloudflare Pages can override it with this build environment variable for
Preview and Production:

```text
VITE_API_URL=https://api.cryma.store/api
```

Use an absolute HTTPS API URL. A loopback value from a local `.env` file is
ignored for production builds, and other non-HTTPS production API URLs fail
the build instead of silently falling back to same-origin HTML.

Set Laravel's production `APP_URL` to `https://api.cryma.store` so generated
URLs outside the relative product-media responses use HTTPS. Keep the frontend
and API domains in Laravel's CORS allow-list. Do not use a local IP or an
`http://` API URL in a production build.

Set these Laravel runtime values on the API host:

```text
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.cryma.store
FRONTEND_URL=https://cryma.store
```

Retain the existing `APP_KEY` and production `DB_*` settings. Laravel forces
generated URL schemes to HTTPS in production when `APP_URL` is HTTPS. Redeploy
the backend with these settings to fix the live API's current
`http://api.cryma.store` pagination URLs without trusting forwarded headers
from arbitrary clients. Email OTP additionally requires valid production SMTP
settings (`MAIL_MAILER=smtp`, host, port, credentials, and sender address).

The backend Docker image uses `/data/database.sqlite` by default to match the
existing `cryma-db` volume mounted at `/data`. Preserve that volume and the
existing `APP_KEY` when replacing the API container. Uploaded local-disk media
needs a separate persistent mount at `storage/app/public` or an object-storage
disk; the current public catalog has no uploaded product images to validate.

Cloudflare Pages should use `web` as its root directory, `npm run build` as its
build command, and `dist` as its output directory. Set
`VITE_API_URL=https://api.cryma.store/api`. If deploying with Wrangler, build
from `web` and deploy `dist` to the existing Pages project:

```powershell
cd C:\Code\e-commerce\ecommerce-system\web
$env:VITE_API_URL = "https://api.cryma.store/api"
npm ci
npm run build
npx wrangler pages deploy dist --project-name <your-pages-project>
```

The API host is external to this repository's Cloudflare Pages configuration.
Deploy the backend image through its current host's deployment process after
setting `APP_URL`, `FRONTEND_URL`, production database/storage persistence,
`APP_KEY`, and SMTP values there. Back up the current database and keep its
volume attached; do not substitute an empty database volume.

## API and deployment checks

Check the public API response and TLS certificate from PowerShell:

```powershell
curl.exe -i https://api.cryma.store/api/products
```

Check the local API through Vite after starting both services:

```powershell
curl.exe -i -H "Accept: application/json" http://localhost:5173/api/products
```

The response should be JSON. Product images use Laravel's public storage disk.
The backend Docker image creates `public/storage`; uploaded local-disk media
still needs persistent storage across container replacements. For durable
production media, configure an object-storage disk or a persistent volume for
`storage/app/public`.

Email OTP delivery requires a production SMTP/provider configuration. The
Laravel `log` mailer records messages in backend logs instead of delivering
email.
