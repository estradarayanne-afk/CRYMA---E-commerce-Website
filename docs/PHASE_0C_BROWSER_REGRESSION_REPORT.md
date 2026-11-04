# CRYMA Phase 0C — Web Browser Regression Report

**Date:** 2026-11-03 (Asia/Manila)  
**Scope:** Browser regression and local stability verification after Phases 0B1–0B3. No application, backend, dependency, database, environment, or mobile files were changed.  
**Baseline:** `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Repository safety

At the start and end of this phase, the branch remained `main` at the baseline commit. There were no staged changes. The existing Phase 0B1 backend test edits (five files), Phase 0B2 web source edits (thirteen files), Phase 0B3 lockfile edit, and previously untracked reports under `docs/` were present before this report and were preserved. No source file, package manifest, lockfile, `.env`, database, or Flutter file was changed during Phase 0C. This report is the only file added by this phase.

The checked-in lockfile records Axios `1.20.0` with transitive `follow-redirects` `1.16.2`, as intended in Phase 0B3. However, `npm ls` and `npm explain` against the current installed `web/node_modules` resolve Axios `1.19.0` and `follow-redirects` `1.16.0`. The installed tree is stale relative to the lockfile, so the current local dev bundle is not using the Phase 0B3 patched resolutions. No package installation was run in this regression phase. The three implementation reports for Phases 0B1, 0B2, and 0B3 were reviewed.

## 2. Browser testing capability and startup

- **Browser:** Chrome was available as a native Windows app. The browser automation host reported unavailable. The computer-use window initially allowed the local root page to be observed, then halted a later navigation because it could not establish the current browser URL with enough confidence to enforce its policy. No further UI actions were attempted after that stop.
- **Automation frameworks:** Repository search found no Playwright, Cypress, Selenium, WebDriver, or Puppeteer configuration/scripts. No framework or dependency was installed.
- **Frontend:** `npm run dev -- --host 127.0.0.1` started Vite 8.2.1 at `http://127.0.0.1:5173/`. It was started for this review; no tracked build output was written.
- **Backend:** The documented local setup uses the Vite proxy to `127.0.0.1:8000`. At startup that port was unavailable. `backend/vendor` and `backend/.env` were absent, and Docker was not installed, so Laravel could not be started from this checkout without adding dependencies/configuration or using an external service. No credentials or test accounts were available in the repository for safe use, and no account credentials were sought or entered.
- **API availability was intermittent:** The first browser load logged proxy connection refusals and received 502 responses for the featured-products request. Some later safe read-only GET probes through Vite received 200 JSON for `/api/products?per_page=1` and the detail endpoint of the returned product ID, while later Vite logs again showed `ECONNREFUSED 127.0.0.1:8000` for the home products request. The reason the local API port became briefly responsive was not established; this report does not claim that this phase started Laravel or that the API was stable. `/api/categories` returned 404, but source search found no frontend call to that endpoint: the category UI uses local category constants. No data was changed.

## 3. Browser regression results

Statuses use the requested meanings: **PASS** means the behavior was exercised successfully; **FAIL** means a reproducible application defect was found; **BLOCKED** means a dependency, account, service, or permission prevented the test; **NOT TESTED** means the test was intentionally not attempted.

### Guest experience

| Check | Status | Evidence / limitation |
|---|---|---|
| Guest landing page renders | **PASS** | Opened `http://127.0.0.1:5173/` in Chrome. The CRYMA title, hero heading, navigation, category cards, and page sections rendered; the page was not blank. This exercises the lazy guest home route sufficiently to confirm it loaded. Pixel-level CSS comparison was not performed. |
| Featured product data | **BLOCKED** | On the observed browser load, the page displayed its “couldn't load products” state because the Vite proxy could not reach port 8000 and the browser received 502. Later read-only API GETs returned 200 for the product list and a valid product detail, but the UI could not be reloaded/observed after the browser control stopped. |
| Logo navigation, category/product navigation, cart, favorites, login and registration navigation | **NOT TESTED** | The browser-control stop prevented further interaction. No sign-in, registration submission, cart mutation, or favorite mutation was attempted. |
| Direct `/shop` and product-detail UI routes; refresh on guest home | **BLOCKED** | The dev server returned the SPA HTML shell with HTTP 200 for `/`, `/shop`, and `/products/phase0c-smoke`. This only verifies Vite history fallback; React route rendering and refresh behavior were not confirmed in the browser. |

### Authentication, buyer, seller, admin, logistics, rider/courier, and messaging

| Role / workflow | Status | Notes |
|---|---|---|
| Buyer login/logout, route guards, persistence and protected-route refresh | **NOT TESTED** | No safely available test account; no authentication attempted. |
| Seller login and seller dashboard/inventory/orders/chat | **NOT TESTED** | No account; no real inventory or order changes attempted. |
| Admin login and dashboards, compliance, vouchers, finance, route guards | **NOT TESTED** | No account; no administrative or financial actions attempted. |
| Logistics login, hubs, pickup/sorting/assignment workflows | **NOT TESTED** | No account; no parcel operations attempted. |
| Rider/Courier login, pickup/delivery and proof workflows | **NOT TESTED** | No account; no parcel operations attempted. |
| Buyer/seller chat, assistant, drafts, conversation switching and router-state deep link | **NOT TESTED** | No authenticated session or safe test conversation was available. |
| Checkout, payment, COD, order creation or delivery | **NOT TESTED** | Real transactions and operations were out of scope; no test account/data was available. |

## 4. Console and network observations

- **Confirmed environment failure on initial page load:** Vite logged `ECONNREFUSED 127.0.0.1:8000` while proxying `/api/products?per_page=50`; the frontend logged an Axios 502 for product loading. The initial loading state later became the page's friendly product-error state. Since the documented local API service was unavailable at that time, this is not classified as a confirmed application defect.
- **Read-only API probes later in the session:** product list and a valid product-detail request returned HTTP 200 with JSON; `/api/categories` returned 404 but is not called by the frontend code inspected. No response body containing user or secret data was included in the audit.
- **Warnings observed:** Three.js reported that `PCFSoftShadowMap` has been removed and that `THREE.Clock` is deprecated. The landing page continued to render. They are library deprecation warnings, not confirmed regressions caused by Phase 0B2/0B3.
- **Not observable:** Browser DevTools network waterfall and console could not be inspected after computer-use stopped. CORS, auth headers, asset-level failures, duplicate requests, and scanner import/camera behavior therefore remain unverified. No browser assertion is made for those items.

## 5. Lazy loading and QR scanner

- **Guest home lazy loading:** **PASS (limited).** The local root route rendered the home content in Chrome after Vite started. This confirms the lazy component could load on that route; it does not verify chunk timing, CSS network requests, direct-route refresh, or retry behavior after a simulated chunk failure.
- **QR scanner import and camera lifecycle:** **NOT TESTED.** The scanner routes require authenticated logistics/rider context, and the browser session could not continue. Camera permission was not requested. Manual parcel ID entry and cleanup on route exit were not exercised.

## 6. Defects and severity

**No reproducible application UI defect was confirmed in the browser coverage completed.** The initial product error coincided with a local API proxy connection refusal. Later read-only product API checks succeeded intermittently, but the page could not be re-observed after the browser-control interruption. The `/api/categories` 404 was not matched to a frontend request and is not reported as a defect. The Three.js warnings are recorded as low-priority maintenance observations only.

**P1 operational/security risk (confirmed):** the installed frontend dependency tree is behind the patched lockfile (Axios `1.19.0`, follow-redirects `1.16.0` versus locked `1.20.0` and `1.16.2`). This means the local dev/test environment is not exercising the patched resolutions and a build from the current installed tree could bundle the older Axios. The regression scope prohibited package installation, so the tree was left unchanged; restore it from the existing lockfile in a separately authorized dependency-restoration step. This is dependency drift, not a confirmed UI defect.

The key remaining functional risk is unverified behavior in authenticated workspaces and API-dependent workflows, not evidence that those workflows are broken.

## 7. Verification performed

| Check | Status | Result |
|---|---|---|
| `npm test` | **PASS** | 48 tests passed, 0 failed. |
| `npm run lint` | **PASS** | Completed with no lint errors or warnings. |
| Vite SPA shell requests | **PASS (limited)** | HTTP 200 HTML for `/`, `/shop`, and `/products/phase0c-smoke`; this is not a React browser-route assertion. |
| Product list/detail API smoke GET | **BLOCKED / intermittent** | Some read-only requests returned HTTP 200 JSON for the product list and a valid product detail, but Vite logs also showed later proxy connection refusals. No stable backend API baseline was established. No mutations. |
| Installed Axios dependency verification | **FAIL (environment drift)** | `npm ls` / `npm explain`: Axios `1.19.0` → follow-redirects `1.16.0`; lockfile entries are `1.20.0` → `1.16.2`. No installation or lockfile change was made in Phase 0C. |
| Laravel test suite / PHP syntax / route list | **NOT RUN** | No backend source changed. Backend dependencies/configuration were unavailable for a local Laravel start; Phase 0B1's 180 tests/1,382 assertions remain the prior recorded result, not a Phase 0C rerun. |
| Production build | **NOT RUN** | No source files were changed in Phase 0C; the Phase 0B3 report records the prior successful build. |
| Database / migrations / seeders | **NOT RUN** | No database operation was performed. |

## 8. Final repository state and recommendations

The branch remains `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`; the pre-existing staged/unstaged/untracked work was preserved. Phase 0C changed no application source, backend, dependencies, environment, database, or Flutter files. The only new file is this report.

To complete the remaining browser checks, provide a supported browser-control session and a local API service configured with safe synthetic test data and authorized role accounts. Then repeat direct-route/refresh checks and exercise each role without performing real payments or parcel operations. The scanner should be tested only with an explicitly safe camera permission context and non-production parcel IDs.
