# CRYMA Phase 0C-E2B — Local Backend Runtime Report

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Local runtime and read-only connection smoke tests. No application source, configuration, dependency manifest, database, or mobile project was changed.  
**Baseline:** `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Executive summary

**PASS:** Laravel started on `http://127.0.0.1:8000`; Vite started on `http://127.0.0.1:5173`; Laravel's health route returned 200 and reported `up` when requested as JSON; and a public read-only product-list GET succeeded both directly and through Vite's configured proxy. The backend log confirms Vite-proxied product requests reached Laravel. Both servers remain running for the next browser regression phase.

No authentication, checkout, order, messaging, payment, courier, or delivery operation was exercised. No database write, migration, seeder, or account change was performed. The SQLite file size and timestamp remained the same as recorded in Phase 0C-E2A.

## 2. Initial port and process inspection

- Branch/HEAD: `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`; no staged changes.
- Initial `netstat` inspection found no listener on ports 8000 or 5173.
- No existing Laravel server or Vite process belonging to this project was identified. Unrelated Node processes were left untouched.
- The readiness audit had already confirmed the required Laravel vendor tree, local `.env`, and SQLite configuration. No installation or configuration repair was needed.

## 3. Laravel server and health endpoint

Command: `php artisan serve --host=127.0.0.1 --port=8000` from `backend/`.

| Check | Status | Result |
|---|---|---|
| Server startup | **PASS** | Laravel reported `http://127.0.0.1:8000`. |
| `GET http://127.0.0.1:8000/up` | **PASS** | HTTP 200; content negotiation without an `Accept` header returned Laravel's HTML health view. |
| `GET http://127.0.0.1:8000/up` with `Accept: application/json` | **PASS** | HTTP 200, JSON status `up`. |
| Server logs | **PASS** | Health and product requests were logged; no startup or request errors were observed. |

The health response confirms Laravel is serving, not that the SQLite schema is current or all application workflows work.

## 4. Safe public API route and direct test

Route inspection found `GET|HEAD api/products` mapped to `App\Http\Controllers\Seller\ProductController@publicIndex`, with only the `api` middleware (no authentication middleware). The controller validates read filters, queries/paginates active public products, and returns a JSON resource envelope; inspection found no database write or business mutation in this path. It was therefore suitable for a read-only smoke request.

| Request | Status | Result |
|---|---|---|
| `GET http://127.0.0.1:8000/api/products?per_page=1` with `Accept: application/json` | **PASS** | HTTP 200, `application/json`; `success,data` response envelope and one result. Product fields were not printed. |

The request only read the existing catalog. It did not create or change records.

## 5. Vite status and proxy test

Command: `npm run dev -- --host 127.0.0.1` from `web/`.

| Check | Status | Result |
|---|---|---|
| Vite startup | **PASS** | Vite 8.2.1 ready at `http://127.0.0.1:5173`. |
| Existing proxy configuration | **PASS** | `/api` and `/storage` target `VITE_API_PROXY_TARGET`, default `http://127.0.0.1:8000`. Configuration was not changed. |
| `GET http://localhost:5173/api/products?per_page=1` with `Accept: application/json` | **PASS** | HTTP 200, JSON `success,data` envelope and one result. |
| Backend receipt | **PASS** | Laravel server output logged `/api/products` requests corresponding to direct and proxied checks. |
| Proxy errors | **PASS** | No Vite proxy errors were emitted during the tested request. |

Laravel CORS already allows the local Vite origins; the tested browser-facing request was served through Vite's same-origin proxy.

## 6. Data and repository safety

- No migrations, seeders, resets, writes, test-account creation, authenticated requests, or business workflow requests were performed.
- `backend/database/database.sqlite` remained 544,768 bytes with the same last-write timestamp recorded in Phase 0C-E2A. The database was not queried for schema or record contents in this phase beyond the public product GET.
- Both servers were not running before this phase and were started by this phase. They remain running for Phase 0C browser regression, as instructed.
- Final `netstat` confirmed listeners on 127.0.0.1 ports 8000 and 5173.
- Branch and HEAD remain unchanged. Existing Phase 0B1 test changes, Phase 0B2 web changes, Phase 0B3 lockfile diff, and prior reports remain preserved. `git diff --check` found no whitespace errors; Git printed the existing CRLF/LF normalization warnings.
- No tracked application files or package manifests were changed. This report is the only file intentionally added by Phase 0C-E2B.

## 7. Remaining limitations and next phase

The smoke test verifies Laravel startup, its health route, one public read-only API endpoint, and the Vite proxy. It does not validate browser rendering, authentication, authorization, database schema freshness, or business workflows. The previous Phase 0C browser regression should now be resumed in a supported browser session with the two local servers available, while continuing to avoid real accounts and mutating operations.
