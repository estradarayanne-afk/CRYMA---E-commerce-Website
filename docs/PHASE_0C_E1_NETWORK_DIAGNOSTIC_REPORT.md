# CRYMA Phase 0C-E1-N — npm Registry and Windows Network Diagnostics

**Date:** 2026-11-03 (Asia/Manila)  
**Mode:** Read-only diagnosis. No dependency installation, project-source edits, configuration changes, or security-setting changes were made.  
**Baseline:** `main` at `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.

## 1. Original errors

The earlier Phase 0C-E1 `npm ci` failed with `EPERM` unlinking the Rolldown native binding in `web/node_modules`. After the user manually stopped CRYMA Vite PID 13240, the single Phase 0C-E1-R retry failed with `EACCES` fetching `https://registry.npmjs.org/follow-redirects/-/follow-redirects-1.16.2.tgz`.

This phase did not retry installation. The original recorded fetch error had a blank socket failure reason; later diagnostics identified a sandbox networking boundary and a separate npm cache access restriction.

## 2. Repository and dependency state

- Branch/HEAD: `main` / `e3fcb400296b1f2d33ea7c0e8c9e4ea27ce54661`.
- Existing Phase 0B1 backend-test edits, Phase 0B2 web-source edits, Phase 0B3 lockfile update, and Phase 0A–0C reports were preserved.
- `web/package.json` declares Axios `^1.19.0`; the root lock declaration matches. `web/package-lock.json` resolves Axios `1.20.0` and `follow-redirects` `1.16.2`. No package manifest or lockfile change occurred in this phase.
- `web/node_modules` exists but is empty. Axios, follow-redirects, Vite, and the Rolldown native binding are absent. `npm ls axios follow-redirects --depth=1` reports an empty tree and exits 1. This is consistent with an incomplete dependency tree after the failed `npm ci`; no package repair was attempted.
- Node: `v24.17.0`; npm: `11.13.0`.

## 3. Sanitized npm configuration

| Setting | Observed value |
|---|---|
| Registry | `https://registry.npmjs.org` |
| `proxy` / `https-proxy` | Not configured in npm |
| `strict-ssl` | `true` |
| npm auth entries in project, user, and global npm config files | None detected; values were not printed |
| npm auth-related environment variables | None detected; values were not printed |
| npm cache | `C:\Users\ciara\AppData\Local\npm-cache` |

No npm configuration was changed. No full `.npmrc` contents or credentials were printed.

## 4. DNS, registry, and TLS diagnostics

Sandboxed network checks failed: npm ping and npm view returned `EACCES` socket errors, `nslookup registry.npmjs.org` received no response from the configured DNS server, and the HTTPS request failed with a socket access-permission error. This is consistent with the sandbox denying network sockets; these failures alone do not establish a Windows host DNS or registry outage.

The same requested read-only probes were then allowed outside the sandbox. No auth configuration or proxy was present, and TLS verification remained enabled:

| Probe | Result outside sandbox |
|---|---|
| `npm ping` | **PASS:** `PONG` in 346 ms. |
| `npm view follow-redirects@1.16.2 dist.tarball` | **PASS:** returned the expected public npm tarball URL. Metadata only; no tarball was downloaded. |
| `nslookup registry.npmjs.org` | **FAIL:** the configured DNS server (`2405:b800:fef:ff00::5`) returned no response. |
| HTTPS HEAD to the lockfile tarball URL | **PASS:** HTTP 200, `application/octet-stream`; TLS certificate validation succeeded. No body was downloaded. |

**Confirmed conclusion:** the npm registry and lockfile tarball were reachable with valid TLS outside the sandbox, while sandbox network calls were denied at socket access. This explains the `EACCES` from the sandboxed npm fetch more strongly than a registry outage. The standalone `nslookup` failure indicates the configured DNS server did not answer that query; it did not prevent npm metadata or the HTTPS HEAD request from succeeding outside the sandbox. The exact DNS resolution path used by those successful requests was not established.

## 5. Windows cache and security observations

- The npm cache directory exists and can be enumerated/read. The cache file mentioned in the failed verification also exists and can be opened read-only.
- ACL inspection of the cache directory and that cache object showed only `ReadAndExecute` and `Synchronize` rights in entries applicable to the current user/groups; no write/modify permission was present in the inspected entries. Write/delete access was not tested by creating or deleting anything.
- The authorized read-only `npm cache verify` command failed with **EPERM** while attempting to unlink a cache content object under `_cacache\content-v2\sha512`. The exact attempted path and error were reported by npm. The command did not complete; no cache cleanup or manual repair was performed.
- The web project and `web/node_modules` directory exist and were accessible for enumeration. `node_modules` is empty.
- Windows Defender Operational log was enabled and had no Controlled Folder Access block/audit events (IDs 1123/1124) today. Code Integrity had 3033 events, but none of the queried event messages referenced Node, npm, Rolldown, `node_modules`, npm cache, or CRYMA. AppLocker had no events today. No security feature was disabled, and no administrative query was attempted.
- These checks provide evidence of insufficient cache write/delete ACLs, but do not establish whether file locking or antivirus caused the earlier Rolldown unlink failure. No evidence tied Defender, Code Integrity, or AppLocker to either npm error.

## 6. Cause assessment and remaining uncertainty

**Confirmed:** sandboxed socket access is denied; outside-sandbox access to the official registry succeeds. The npm cache has a separate write/delete permission problem: cache objects are readable, but inspected applicable ACL entries do not grant write/modify, and `npm cache verify` reported EPERM on unlink.

**Not established:** whether Windows file locking, another process, antivirus, or permissions caused the first Rolldown binding unlink error. The specific lockfile tarball fetch was not retried outside the sandbox. The DNS server's lack of response remains unexplained despite successful HTTPS and npm requests through the host environment.

## 7. Recommended safe corrective action

Have the device administrator or IT support restore a user-writable npm cache location/ACL or provide an approved writable cache location, without changing project manifests. For future registry operations, use an approved environment with registry network access. Then, in a separately authorized recovery phase, run the existing lockfile install and verify its result. Do not weaken TLS, change security features, or infer installation success from these diagnostics.

## 8. Final repository verification

`git status`, `git diff --check`, and the package manifest/lockfile diff were inspected after the diagnostics. No staged changes were present; the pre-existing Phase 0B1–0C changes remain. The only new project file from this diagnostic phase is `docs/PHASE_0C_E1_NETWORK_DIAGNOSTIC_REPORT.md`. The only package-file diff is the existing Phase 0B3 Axios/follow-redirects lock resolution; `web/package.json` has no diff. No backend, database, environment, Flutter/mobile, or application-source file was changed.
