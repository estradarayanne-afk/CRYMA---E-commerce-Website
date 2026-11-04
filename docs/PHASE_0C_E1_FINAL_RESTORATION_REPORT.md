# CRYMA Phase 0C-E1-F — Final Dependency Restoration Report

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Dependency restoration from the existing lockfile and frontend verification. No application source or dependency manifest was edited.  
**Baseline:** `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Initial state

Before installation, branch/HEAD were `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`, with no staged changes. The pre-existing Phase 0B1 backend test edits, Phase 0B2 web source edits, Phase 0B3 lockfile update, and Phase 0A–0C reports were preserved.

`web/package.json` declared Axios `^1.19.0`; the existing lockfile root declaration matched and resolved Axios `1.20.0` and transitive `follow-redirects` `1.16.2`. `web/node_modules` existed but was empty, so `npm ci` could safely recreate that ignored dependency directory. No package versions or dependency declarations were changed.

## 2. Isolated cache and network approval

A dedicated cache was created at:

```text
C:\Users\ciara\AppData\Local\Temp\cryma-npm-cache
```

It is outside the repository and passed a write check. The restricted sandbox had previously denied registry socket access; the requested installation was approved to run outside that boundary. The default npm cache was not reused or repaired.

## 3. Installation result

Command executed exactly once from `web/`:

```text
npm ci --cache "C:\Users\ciara\AppData\Local\Temp\cryma-npm-cache"
```

**PASS.** npm added 170 packages and audited 171 packages. It reported 11 total dependency advisories (7 moderate, 4 high); these are development dependency findings and remain outside this restoration task. No manifest or lockfile changes resulted.

## 4. Dependency verification and quality checks

| Check | Result |
|---|---|
| `npm ls axios follow-redirects` | **PASS:** Axios `1.20.0` → `follow-redirects` `1.16.2`. |
| `npm explain axios` | **PASS:** Axios is the direct root dependency, resolved at `1.20.0` within `^1.19.0`. |
| `npm explain follow-redirects` | **PASS:** remains transitive through Axios, resolved at `1.16.2`. |
| `npm audit --omit=dev` | **PASS:** found 0 production vulnerabilities. Ran with the isolated cache and approved network access. |
| `npm run lint` | **PASS:** exit 0, no errors or warnings. |
| `npm test` | **PASS:** 48 tests passed, 0 failed. |

## 5. Production build

**PASS.** The configured Vite production build completed successfully to a new directory outside the repository:

```text
C:\Users\ciara\AppData\Local\Temp\cryma-phase0c-e1-build-20261103
```

Vite transformed 2,070 modules. The existing chunk-size warning remains for minified chunks above 500 kB. Reported larger assets were:

| Asset | Size | Gzip |
|---|---:|---:|
| Main JavaScript | 1,150.17 kB | 293.16 kB |
| Three.js JavaScript | 742.95 kB | 187.71 kB |
| Async scanner dependency | 368.78 kB | 108.09 kB |
| Main CSS | 875.16 kB | 144.22 kB |
| Lazy Home CSS | 89.79 kB | 17.80 kB |

The warning is not a build failure. No code splitting or style changes were made in this phase.

## 6. Final repository safety

After installation and verification, `git status`, `git diff --check`, and `git diff -- web/package.json web/package-lock.json` were run.

- Branch and HEAD remain `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`; there are no staged changes.
- `git diff --check` passed. Git printed existing line-ending normalization warnings for previously edited files.
- `web/package.json` has no diff. The only package-file diff is the pre-existing Phase 0B3 lockfile resolution changing Axios `1.19.0` to `1.20.0` and follow-redirects `1.16.0` to `1.16.2`.
- The Phase 0B1 backend test edits and Phase 0B2 web source edits remain present and preserved. No backend, database, environment, Flutter/mobile, or application source file was changed during Phase 0C-E1-F.
- This report is the only file intentionally added by this phase. `web/node_modules` now resolves the expected lockfile versions. The temporary cache remains at the path above and was not deleted.

## 7. Remaining issues

The local install and production build are restored. The full npm audit still reports 11 development dependency advisories (7 moderate, 4 high), and the Vite large-chunk warning remains. Neither was changed as part of this dependency restoration phase.
