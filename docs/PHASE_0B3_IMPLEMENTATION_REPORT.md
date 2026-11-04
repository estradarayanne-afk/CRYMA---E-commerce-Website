# CRYMA Phase 0B3 — Production Dependency Security Remediation

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Narrow production dependency remediation. No application source or backend files changed.  
**Baseline commit:** `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661` (`main`)

## 1. Initial repository state

The branch was `main` at the baseline commit above. No staged changes were present. Existing working-tree changes were the five backend feature-test files from Phase 0B1 and thirteen frontend source files from Phase 0B2. The untracked `docs/` directory contained the five existing audit and implementation reports. These changes and reports were preserved.

The declared dependency was `axios: ^1.19.0`; the lockfile and installed tree resolved Axios `1.19.0` and transitive `follow-redirects` `1.16.0`. The follow-redirects range declared by Axios was `^1.16.0`. The existing Axios declaration admits later 1.x releases, including 1.20.0.

## 2. Vulnerabilities verified

The current pre-update `npm audit --json` reported 13 package nodes (7 moderate, 6 high). The pre-update `npm audit --omit=dev --json` reported two high-severity production dependency nodes:

### Axios 1.19.0

The audited package range was `1.0.0–1.19.0`; the advisories below identify versions below `1.20.0` as affected. The registry confirmed Axios `1.20.0` is available and the first release outside these ranges. It is within the existing `^1.19.0` declaration.

| Advisory | Affected range | Finding |
|---|---|---|
| [GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8) | `>=1.7.0 <1.20.0` | Prototype-pollution gadget in the fetch adapter. |
| [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g) | `>=1.0.0 <1.20.0` | Inherited `Object.prototype.method` can influence the default instance's method. |
| [GHSA-c29m-xwm3-cm6r](https://github.com/advisories/GHSA-c29m-xwm3-cm6r) | `>=1.16.1 <1.20.0` | ReDoS in `fromDataURI` in Node. |
| [GHSA-mghh-pgcx-3jjj](https://github.com/advisories/GHSA-mghh-pgcx-3jjj) | `>=1.15.0 <1.20.0` | ReDoS in proxy host normalization in Node. |
| [GHSA-x97p-jq2g-jp4f](https://github.com/advisories/GHSA-x97p-jq2g-jp4f) | `>=1.15.1 <1.20.0` | Prototype-pollution gadget in `toFormData` options. |
| [GHSA-3pq3-5fj3-cg6v](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) | `>=1.13.0 <1.20.0` | HTTP/2 adapter can bypass configured DNS/proxy controls. |
| [GHSA-542g-h47m-68v8](https://github.com/advisories/GHSA-542g-h47m-68v8) | `>=1.13.0 <1.20.0` | Denial of service in HTTP/2 session initialization. |
| [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32) | `>=1.0.0 <1.20.0` | Header injection through inherited headers after a minimal interceptor. |
| [GHSA-4hqw-qxg8-jxx2](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) | `>=1.12.0 <1.20.0` | Fetch-adapter header injection involving inherited FormData methods. |
| [GHSA-m8m8-qj5v-23w3](https://github.com/advisories/GHSA-m8m8-qj5v-23w3) | `>=1.15.2 <1.20.0` | Node HTTP adapter socket hijack gadget. |
| [GHSA-44g4-m2mj-wpvx](https://github.com/advisories/GHSA-44g4-m2mj-wpvx) | `>=1.15.0 <1.20.0` | CIDR `NO_PROXY` exclusion handling bypass in Node. |
| [GHSA-r4gj-5m52-g5wh](https://github.com/advisories/GHSA-r4gj-5m52-g5wh) | `>=1.17.0 <1.20.0` | Fetch adapter does not enforce `maxRedirects: 0`. |

CRYMA imports Axios through `src/shared/services/api.js`. The client uses Axios's default adapter list (`xhr`, `http`, `fetch`) and does not select an adapter. In the browser, XHR is available and is selected before the Node HTTP or fetch adapters. Therefore the Node HTTP/proxy/HTTP2 findings and the `follow-redirects` implementation are not exercised by the current browser client; the explicit fetch-adapter issues are also not selected by this client. The audit still correctly reports the dependency nodes in the production dependency graph, and the default-instance/object and FormData-related advisories warrant updating the shipped Axios package.

The request client has a fixed base URL calculation, `Accept: application/json`, a request interceptor that reads the existing token and adds `Authorization: Bearer …`, and a response interceptor that resolves storage URLs, skips Blob bodies, and clears the session/redirects on applicable 401 responses. No custom Axios timeout, `AbortSignal`, `CancelToken`, `withCredentials`, or XSRF configuration was found. Application upload flows use `FormData`; no project code directly imports Axios elsewhere or forces the Node adapter.

### follow-redirects 1.16.0

The registry's current release is `1.16.2`. The three audited advisories were:

- [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8): `>=1.16.0 <1.16.1`, array-form headers can bypass cross-origin credential stripping.
- [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c): `>=1.16.0 <1.16.1`, sensitive-header regex escaping can expose credential headers.
- [GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p): `>=1.16.0 <=1.16.1`, cross-realm header arrays can allow credentials to follow redirects.

The `1.16.2` release is within the existing `^1.16.0` transitive range. No direct dependency or override was needed.

## 3. Remediation applied

The smallest compatible patched resolutions were selected:

| Package | Before | After | Compatibility basis |
|---|---:|---:|---|
| Axios | 1.19.0 | 1.20.0 | Minor update within `package.json` range `^1.19.0`; registry metadata confirms Axios 1.20.0 still depends on `follow-redirects ^1.16.0`. |
| follow-redirects | 1.16.0 | 1.16.2 | Transitive patch update within Axios's existing `^1.16.0` range. |

Npm updated only the two corresponding resolution entries in `web/package-lock.json`, including their tarball integrity metadata. `web/package.json` is unchanged, and no override or direct follow-redirects dependency was added. The explicit npm resolver command briefly rewrote the root manifest/lock declaration to `^1.20.0`; because the verified existing `^1.19.0` range already admits Axios 1.20.0, that root declaration was restored to its original value. The final lockfile root declaration matches `package.json`.

## 4. Security audit after remediation

| Audit | Before | After |
|---|---|---|
| Full `npm audit --json` | 13 package nodes: 7 moderate, 6 high | 11 package nodes: 7 moderate, 4 high. Axios and follow-redirects no longer appear. The command exits 1 because development advisories remain. |
| Production-only `npm audit --omit=dev --json` | 2 high package nodes: Axios and follow-redirects | **0 vulnerabilities** (info 0, low 0, moderate 0, high 0, critical 0); exits 0. |

Remaining findings are development-only: moderate `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/js`, `eslint`, `eslint-config-prettier`, `eslint-plugin-react-refresh`, and `minimatch`; high `brace-expansion`, `source-map-js`, `vite`, and `zod`. These were not changed because Phase 0B3 is limited to production dependencies. Some npm remediation suggestions for the ESLint stack require major-version downgrades; they remain for a separately reviewed development-dependency phase. The project is **not** vulnerability-free overall.

## 5. Verification

| Check | Result |
|---|---|
| `npm ls axios follow-redirects` | **Pass:** Axios `1.20.0` → `follow-redirects 1.16.2`. |
| `npm explain axios` / `npm explain follow-redirects` | **Pass:** Axios remains a direct root dependency; follow-redirects remains transitive through Axios. |
| Production-only audit | **Pass:** zero vulnerable production dependency nodes. |
| Full dependency audit | **Findings remain:** 11 development-only package nodes (7 moderate, 4 high); exit 1 is expected from npm audit. |
| `npm run lint` | **Pass:** 0 errors, 0 warnings. |
| `npm test` | **Pass:** 48 tests. |
| Production build | **Pass:** output at `C:\Users\ciara\AppData\Local\Temp\cryma-phase0b3-build-20261103`. The existing Vite >500 kB chunk warning remains from the previously documented bundle sizes. |
| Axios API client review | Base URL, auth headers, interceptors, upload usage, and response/error handling are unchanged. No configured timeout, request cancellation token, credentials, or XSRF behavior was found. The build and tests passed with the upgraded package. |
| Backend tests | **Not rerun:** no backend files changed in Phase 0B3. The preserved Phase 0B1 result was 180 passing tests and 1,382 assertions. |
| `git diff --check` | **Pass:** no whitespace errors; existing line-ending normalization warnings remain for previously modified files. |

No runtime API call integration test or browser E2E was available in the configured frontend suite. Package compatibility was verified through the dependency tree, lint, unit tests, and production build; the Axios API client source was unchanged.

## 6. Final repository state

Only `web/package-lock.json` was modified for dependency resolution. `docs/PHASE_0B3_IMPLEMENTATION_REPORT.md` is the only new report. The five Phase 0B1 backend test changes, thirteen Phase 0B2 frontend source changes, and five earlier reports remain preserved. The branch remains `main` at the same HEAD. No backend source/test, database, migration, environment, Flutter, or unrelated dependency files were changed. The ignored local `node_modules` tree now matches the patched lockfile.
