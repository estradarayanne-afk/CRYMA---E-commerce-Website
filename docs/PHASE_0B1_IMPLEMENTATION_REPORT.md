# CRYMA Phase 0B1 — Dependency Restoration and Backend Test Contract Corrections

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Limited dependency restoration and test-only corrections. No application source, Flutter project, database records, migrations, or Git state were changed.  
**Baseline commit:** `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661` (`main`)

## 1. Safety and scope

Before work, `main` was at the baseline commit and had no tracked or staged changes. The three existing untracked documents in `docs/`—`PHASE_0A_BASELINE_TRIAGE.md`, `WEB_BACKEND_BASELINE_AUDIT.md`, and `WEB_BACKEND_IMPLEMENTATION_ROADMAP.md`—were preserved. No branch changes, destructive Git commands, database writes, or migrations were performed. No Flutter files were accessed for modification.

The only tracked-file edits are the five backend feature-test files listed in §3. This report is the only new file. `web/package.json` and `web/package-lock.json` are unchanged. `npm ci` recreated the ignored local `web/node_modules` dependency tree from the existing lockfile; no package versions were changed.

## 2. Frontend dependency restoration

The existing manifest and lockfile already declared `qrcode.react` version `4.2.0`; the local dependency tree was missing it. After approval for registry access, `npm ci` completed successfully, adding 170 packages. `npm ls qrcode.react --depth=0` now resolves `qrcode.react@4.2.0`.

`npm ci` reported **13 dependency audit advisories: 7 moderate and 6 high**. No audit fix or package upgrade was run. These advisories are dependency risk to triage separately; this phase did not determine exploitability or change dependency versions.

The Vite production build passed after writing output to the new temporary directory `C:\Users\ciara\AppData\Local\Temp\cryma-phase0b1-build-20261103`, leaving the existing ignored `web/dist` output alone. Build output included a warning that the minified JavaScript chunks exceed 500 kB (largest application chunk approximately 1.54 MB; Three.js chunk approximately 743 kB). This is a bundle-size warning, not a build failure.

## 3. Backend test-contract corrections

Only test fixtures and assertions were changed; no application behavior was modified.

| Test file | Correction |
|---|---|
| `backend/tests/Feature/SellerProductInventoryTest.php` | Seller fixtures now create a valid `SellerProfile` with a registered business line. Complete listing payloads include the required `weight_kg`. The variant fixture uses an accepted business category. This exposed the actual cause of multipart update/media-limit failures: those requests were rejected by the registered-business-line guard before media validation. Existing tests now reach and verify the intended variant, retained-media, replacement, and media-count behavior. Temporary diagnostic response dumps were removed. |
| `backend/tests/Feature/BuyerVoucherCheckoutTest.php` | Successful preview and checkout cases claim vouchers through the buyer claim endpoint before use. Added a specific unclaimed-voucher rejection test. The global/per-buyer-limit case claims for eligible buyers before the global redemption limit is reached, matching the claim endpoint's own contract. |
| `backend/tests/Feature/AdminVoucherManagementTest.php` | Successful checkout/redemption cases claim vouchers. Scheduled and expired vouchers are first claimed while valid, then their dates are moved to the target states; both eligible buyers claim the limited voucher before its single global redemption is consumed. This allows checkout tests to reach and verify time/usage rules rather than failing earlier at the claim guard. |
| `backend/tests/Feature/DeliveryProofTest.php` | Valid COD proof includes the exact collected amount. Added missing, under- and over-collection assertions. The controller returns HTTP 422 with its specified message for these contract failures, so the tests assert that response rather than expecting a Laravel field-validation error that the controller does not produce. |
| `backend/tests/Feature/BuyerSellerChatTest.php` | Inbox unread-count assertions now select the intended conversation by ID instead of relying on `data.0`, since the buyer inbox also creates a support thread. Tests preserve and assert the existing behavior where an assistant responds even when no active admin is available, and where a seller chat and a support chat both appear in the buyer inbox. |

## 4. Verification results

| Check | Result |
|---|---|
| Focused backend tests for seller inventory, vouchers, admin vouchers, delivery proof, and buyer/seller chat | **Pass:** 42 tests, 343 assertions. |
| Full Laravel suite: `php artisan test --do-not-cache-result` | **Pass:** 180 tests, 1,382 assertions. Test configuration uses SQLite `:memory:`; the local project database was not modified. |
| Frontend tests: `npm test` | **Pass:** 48 tests. |
| Frontend production build | **Pass**, emitted to the temporary directory described above; large-chunk warning remains. |
| PHP syntax (`app`, `routes`, `database`) | **Pass:** 173 PHP files. |
| Laravel route registration | **Pass:** 192 routes registered by `php artisan route:list --except-vendor --json`. |
| `npm ls qrcode.react --depth=0` | **Pass:** resolves `4.2.0`. |
| `git diff --check` | **Pass:** no whitespace errors. Git emitted line-ending normalization warnings for edited PHP tests (working copy uses CRLF; Git will normalize to LF when touched). |
| Frontend lint | **Not run in this phase.** The prior Phase 0A report recorded 19 errors and 1 warning; no lint cleanup was authorized here. |
| Package audit remediation | **Not run.** No upgrades or audit fixes were applied. |

## 5. Final repository state

The branch remains `main` at the same HEAD commit. Changed tracked files are exactly:

- `backend/tests/Feature/AdminVoucherManagementTest.php`
- `backend/tests/Feature/BuyerSellerChatTest.php`
- `backend/tests/Feature/BuyerVoucherCheckoutTest.php`
- `backend/tests/Feature/DeliveryProofTest.php`
- `backend/tests/Feature/SellerProductInventoryTest.php`

The new report is `docs/PHASE_0B1_IMPLEMENTATION_REPORT.md`. The three pre-existing untracked docs remain preserved. No application source, package manifest/lockfile, database, mobile project, or Git metadata was modified. The local ignored dependency tree is now restored.

## 6. Follow-up

The immediate dependency-resolution blocker is cleared, and the backend suite passes with fixtures aligned to the current API contracts. Next, handle the separately authorized application work in its own phase: review and prioritize the lint findings, decide whether/how to address the large bundle warning, and triage the 13 dependency advisories without applying automatic upgrades. The support assistant's offline behavior is now explicitly covered by tests and remains unchanged.
