# CRYMA Phase 0B2 — Frontend Lint Cleanup and Production Bundle Review

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Frontend maintenance, isolated code splitting, and read-only dependency advisory review.  
**Baseline commit:** `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661` (`main`)

## 1. Repository safety and scope

At the start, the branch was `main` at the Phase 0B1 baseline commit. There were no staged changes. The working tree contained exactly the five modified backend test files from Phase 0B1, plus the untracked `docs/` directory with its four pre-existing reports. Those test changes and reports were preserved. No Git state was changed.

This phase added changes to 13 Web source files and this report. The five Phase 0B1 backend test edits remain as they were; no backend files were changed during Phase 0B2. No Flutter project, database, migration, environment file, package manifest, lockfile, or existing report was changed. The dependency tree was only queried; no dependency was installed, upgraded, removed, or fixed in Phase 0B2.

## 2. ESLint findings and resolutions

The starting `npm run lint` result reproduced **19 errors and 1 warning** (20 findings), matching Phase 0A. After the edits, `npm run lint` passes with **0 errors and 0 warnings**. No ESLint rule or configuration was disabled or weakened.

| Finding | Resolution |
|---|---|
| `Commission.jsx`: overview effect set loading and cleared the error synchronously. | The period-change event now starts the loading state and clears the error. Initial loading remains true. The effect only performs the cancellable request and updates state from request callbacks. |
| `Commission.jsx`: trend effect reset the selected chart point on period/data changes. | The selected point is now keyed to the current period and data object. A point from old data is not rendered, without a reset effect. |
| `Dashboard.jsx`: analytics effect set loading and cleared the error synchronously. | Period-change and refresh handlers now start loading and clear the error; request cancellation and response handling remain in the effect. |
| `Dashboard.jsx`: `getStatusLabel` had fallback statements after an unconditional formatter return. | Removed the unreachable duplicate fallback. The live behavior remains `Pending Approval` for pending and `formatStatusLabel` otherwise. |
| `SellerCompliance.jsx`: `getStatusLabel` had a local fallback after an unconditional formatter return. | Removed unreachable code. The existing shared formatter handles empty statuses with its `Unknown` fallback. |
| `DocumentCorrection.jsx`: malformed query links set error/loading in the effect. | Invalid-link messaging and loading are derived from the current query parameters. Valid request results are stored with their request key, so a prior token's response is hidden when the URL changes; late responses are still cancelled. Submission errors are also associated with the current request key. |
| Buyer seller chat widget: inactive/support selections synchronously cleared order state in an effect. | Order data is keyed to the currently active seller conversation and is only shown for an eligible open seller chat. Loading is derived while the active request key has no result; cancelled requests cannot replace newer results. |
| Buyer seller chat widget: location-state deep link synchronously opened the panel and called a state-changing helper from an effect. | The effect now translates the one-time router signal into the widget's existing `cryma-open-seller-chat` event. Its event handler performs the opening/loading actions, and the URL state is cleared with replace navigation. The listener is registered before the router-signal effect. |
| `Cart.jsx`: empty cart effect synchronously reset seller-status loading. | Loading is derived from current cart product IDs and the last checked key. A cart-change event resets the checked key; request completion marks the current key checked. Response cancellation remains intact. |
| `Categories.jsx`: query effect synchronously reset products, pagination, errors, and loading. | The visible result set and loading/error state are now derived from the current request identity (`requestKey` plus reload key). Previous-query products are hidden while the new request runs; success/error state updates remain in asynchronous callbacks and stale responses remain guarded by cancellation/version. |
| `Storefront.jsx`: slug effect synchronously reset loading, error, and selected category. | Store response state is keyed by slug, so old store data is hidden during a new slug request. Category selection is associated with the current router location key, preserving the reset when navigating between store pages. Request cancellation remains. Removed the unused `useMemo` import. |
| `Orders.jsx`: unused `useNavigate` import and value. | Removed both; no navigation behavior was attached to that value. |
| Seller chat: assistant state reset in an effect and greeting read product name omitted from dependencies. | Assistant draft/messages are derived from and keyed to conversation/product scope. A product name change updates the initial greeting when no assistant conversation exists but does not clear an existing draft or transcript. The remaining effect only syncs a ref and depends on its actual scope identifiers. Selection updates the ref before rendering to prevent an old assistant response from affecting a newly selected thread. |
| `Inventory.jsx`: five unused destructured media fields were intentionally omitted from serialized variants. | The payload builder now filters the known local-only media fields by key. It continues to exclude preview paths/URLs/types and `image` while retaining server variant fields and the separately submitted selected uploads/media IDs. |

## 3. Production bundle investigation and changes

### Findings

- `App.jsx` statically imported all admin, buyer, seller, logistics, and courier pages at baseline. This causes shared initial chunks to include modules and styles for routes that are not currently visited.
- `Home.jsx` statically imported the large home-hero scene implementation. That scene already dynamically imported Three.js, so Three.js was a separate chunk, but the scene implementation itself was part of eager application code.
- `ParcelQrScanner.jsx` statically imported `html5-qrcode`. The scanner component is used only in logistics sorting and courier pickup/delivery workflows, often only after a user opens or reaches a scan action. Its dependency therefore contributed to the initial application chunk despite being unnecessary for most routes.
- Three.js is used only by `buyer/pages/Home/HomeHeroScene.jsx`, which dynamically imports `three` and `RoomEnvironment`. It remains a separate chunk and is not imported by other roles.
- The existing React Router route/guard structure can support lazy components. A broad conversion of every route to lazy imports would touch many routes and needs broader navigation and role-guard browser regression coverage; it was not attempted here.

### Isolated optimizations implemented

1. The guest `BuyerHome` route is now lazy-loaded in `App.jsx`, with a null Suspense fallback. Buyer-session redirect behavior and route path are unchanged. This defers the home page and its CSS for users visiting other routes.
2. `html5-qrcode` is dynamically imported when `ParcelQrScanner` mounts. It is not requested on non-scanner routes. Cleanup checks prevent a late import from starting a camera after unmount or after a manual parcel ID was already submitted. If the scanner bundle cannot load, the existing manual ID path remains and displays an explanatory error.

### Build comparison

The Phase 0B1 build reported a main JavaScript chunk of **1,541.15 kB** (407.64 kB gzip). The Phase 0B2 build reports:

| Output | Size | Gzip | Role |
|---|---:|---:|---|
| Main application JS | 1,147.35 kB | 292.41 kB | Remaining eager app/routes |
| `Home` JS | 25.99 kB | 8.20 kB | Lazy guest home route |
| Async scanner dependency chunk (`esm-…`) | 368.78 kB | 108.09 kB | `html5-qrcode`, loaded when scanner mounts |
| Three.js | 742.95 kB | 187.71 kB | Home hero scene, dynamically imported |
| Room environment | 2.13 kB | 0.93 kB | Home hero scene, dynamically imported |

The eager main JS chunk decreased by **393.80 kB (about 25.6%)**; gzip size decreased by **115.23 kB (about 28.3%)**. The QR scanner package is now outside the eager chunk. The build still reports the main application and Three.js chunks above Vite's 500 kB warning threshold. The combined CSS output remains large at approximately 964.95 kB uncompressed, with the lazy Home CSS separated at 89.79 kB. No warning threshold was changed.

**Recommendation:** consider staged route-level lazy loading for the remaining role workspaces, starting with logistics/courier pages that import the scanner and large administrative modules. Also review CSS import boundaries. Treat this as a separate, test-supported change because route guards, nested layouts, direct URLs, refresh behavior, and loading/error presentation must be checked together.

## 4. Dependency advisory investigation (read-only)

`npm audit --json` reported **13 vulnerable package nodes: 7 moderate and 6 high**. The production-only `npm audit --omit=dev --json` reported **2 high-severity package nodes**, both in the Axios request stack. Audit commands exited 1 because advisories were present; neither command changed files or packages.

| Package | Installed version; directness | Severity / affected range | Runtime area; fix information |
|---|---|---|---|
| `axios` | 1.19.0; direct dependency | High package severity; 12 advisories, aggregate range 1.0.0–1.19.0 (individual advisories affect versions below 1.20.0) | Production browser API client, imported by `shared/services/api.js`. `npm audit` reports a fix available. Some listed issues concern Node adapters; browser applicability differs by adapter, but the package is shipped and used at runtime. |
| `follow-redirects` | 1.16.0; transitive via Axios | High; `>=1.16.0 <1.16.1` and `>=1.16.0 <=1.16.1` | Production dependency path through Axios. `npm audit` reports a fix available. |
| `brace-expansion` | 5.0.9; transitive via `minimatch` and ESLint | High; affected below 5.0.12 / below 5.0.11 for the listed recursion/DoS advisories | Development lint/tooling only. `npm audit` reports a fix available. |
| `source-map-js` | 1.2.1; transitive through `postcss` → Vite | High; `>=1.0.0 <1.2.2` | Development build tooling. `npm audit` reports a fix available. |
| `vite` | 8.2.1; direct dev dependency | High package severity; advisories affect `>=8.2.0 <=8.2.3` | Development server/build tooling, not runtime app dependency. `npm audit` reports a fix available. |
| `zod` | 4.4.3; transitive via `eslint-plugin-react-hooks` | High; below 4.6.6 | Development lint tooling only. `npm audit` reports a fix available. |
| `@eslint-community/eslint-utils` | 4.10.1; transitive via ESLint | Moderate; audit attributes the finding to the ESLint dependency tree | Development lint tooling. No automatic compatible fix reported. |
| `@eslint/config-array` | 0.23.5; transitive via ESLint | Moderate; associated with vulnerable `minimatch` in the tree | Development lint tooling. No automatic compatible fix reported. |
| `minimatch` | 10.2.6; transitive via ESLint/config-array | Moderate; below 11.0.1 | Development lint tooling. No automatic compatible fix reported for the current dependency tree. |
| `eslint` | 10.8.1; direct dev dependency | Moderate; audit range `0.7.1–2.0.0-rc.1` or `>=4.1.0`, through its dependency tree | Development lint tooling. No automatic compatible fix reported. |
| `@eslint/js` | 10.0.1; direct dev dependency | Moderate; `>=10.0.1` | Development lint configuration. npm's suggested fix is 9.39.5 and marked a major-version change; do not apply without compatibility review. |
| `eslint-config-prettier` | 10.1.8; direct dev dependency | Moderate; audit reports through ESLint | Development lint configuration. npm suggests 6.15.0 as a major-version change; do not apply without compatibility review. |
| `eslint-plugin-react-refresh` | 0.5.4; direct dev dependency | Moderate; audit reports through ESLint | Development lint tooling. No automatic compatible fix reported. |

**Priority recommendation:** address Axios and `follow-redirects` first because they are production dependency nodes and both are reported by the production-only audit. Review the advisories against the browser adapters and request patterns actually used, then update within supported major ranges and rerun the frontend suite/build. Handle the remaining development-only findings in a dependency maintenance change; verify ESLint peer compatibility before changing the ESLint stack, and avoid npm's suggested major downgrades unless intentional. No fix was applied in Phase 0B2.

## 5. Verification and limitations

| Check | Result |
|---|---|
| `npm run lint` | **Pass:** 0 errors, 0 warnings; compared with 19 errors and 1 warning initially. |
| `npm test` | **Pass:** 48 tests. Existing Node tests cover helper-level cart actions, chat widget eligibility/unread behavior, message merging/drafts, and other UI utilities. |
| Production build | **Pass:** emitted to `C:\Users\ciara\AppData\Local\Temp\cryma-phase0b2-final-20261103`; Vite's >500 kB warning remains as described above. Existing `web/dist` was not used as output. |
| PHP tests | **Not rerun:** backend files were untouched during Phase 0B2. The five backend test modifications from Phase 0B1 were preserved. |
| Browser/component E2E | **Not run:** the configured frontend test command is Node's test runner; no React rendering or browser E2E harness is configured in `web/package.json`. Therefore direct URL refresh, role guards, router deep-link event handling, camera permission, and visual loading behavior were build/lint reviewed but not browser-smoke-tested. |
| Dependency audit | **Read-only audit pass completed:** full audit found 13 package nodes; production-only audit found 2. Both exit with status 1 because advisories remain. |
| `git diff --check` | **Pass:** no whitespace errors. Git emitted expected line-ending normalization warnings for CRLF/LF working-copy files. |

## 6. Exact Phase 0B2 files changed

- `web/src/App.jsx`
- `web/src/admin/pages/Commission/Commission.jsx`
- `web/src/admin/pages/Dashboard/Dashboard.jsx`
- `web/src/admin/pages/SellerCompliance/SellerCompliance.jsx`
- `web/src/auth/pages/DocumentCorrection.jsx`
- `web/src/buyer/components/BuyerSellerChatWidget/BuyerSellerChatWidget.jsx`
- `web/src/buyer/pages/Cart/Cart.jsx`
- `web/src/buyer/pages/Categories/Categories.jsx`
- `web/src/buyer/pages/Orders/Orders.jsx`
- `web/src/buyer/pages/Storefront.jsx`
- `web/src/seller/pages/Chat.jsx`
- `web/src/seller/pages/Inventory.jsx`
- `web/src/shared/components/ParcelQrScanner.jsx`
- `docs/PHASE_0B2_IMPLEMENTATION_REPORT.md` (new)

The five modified backend test files shown in final `git status` are pre-existing Phase 0B1 work and were preserved, not edited in Phase 0B2. `web/package.json`, `web/package-lock.json`, backend application code, database files, migrations, Flutter projects, and prior reports remain unchanged.
