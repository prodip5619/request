# Maintenance Programming - Group 4

## 1. Project Overview

**Course:** 1DL601 Maintenance Programming
**Project:** `request`, a legacy Node.js HTTP client library
**Group members:** Martin Ek, Andreas Lund, and Prodip Kumar Das

The original `request` project was deprecated in February 2020. We use this document to record our maintenance work, verification evidence, and remaining review items.

### Repository and investigation environment

The group repository is `prodip5619/request`. The initial investigation notes identify the `prodip-investigation` branch; their snapshot date is not recorded. At the October 20, 2026 documentation update and the October 21, 2026 audit, the checked-out branch was `prodip-integrate-andreas`, tracking `origin/prodip-integrate-andreas` and ahead by two commits. These are separate snapshots, not a claim that the current worktree is on the earlier branch.

The initial investigation and the later Windows verification were performed on Windows with Node.js 22.19.0 and npm 10.9.3. Results from that environment do not establish Linux or macOS compatibility.

## 2. Current Maintenance Status

Our core objective was to restore the test suite in the target Windows environment. This record classifies the test-suite restoration work as Adaptive Maintenance, the separate shell-script portability work as Perfective Maintenance, and the pooled-agent protocol correction as Corrective Maintenance. Each activity is counted under one primary maintenance type.

These classifications match Section 11 of the final project report. The activity details below are supported by repository changes and recorded test evidence.

The final branch was validated on Windows and macOS. The current branch has not been verified on Linux or Node.js 24.

## 3. Adaptive Maintenance — Core Test-Suite Restoration

These changes restore the test suite in the target environment. The activity includes test discovery, platform-specific test support, reliable fixtures and test-server behavior, and strict browser TLS validation. Browser TLS changes are part of this core restoration and are not counted again as separate Perfective or Corrective activities.

| Change | Purpose and evidence |
| --- | --- |
| HTTPS test certificate fixtures and generation | Updated expired or weak test certificates and related generation steps to allow strict HTTPS tests to run with the target Node/OpenSSL environment. This includes renewal of CA/server/client/localhost fixtures, serial handling in certificate scripts, and replacement of the 1024-bit HTTPS test key; see Section 9 and the recorded commits. TLS verification was not disabled. |
| `tests/run-test-suite.js` and the `test-ci` script in `package.json` | The earlier test command passed a wildcard to Taper through `cmd.exe`; Windows did not expand it, and Taper ran no tests. The runner now finds, sorts, and passes matching `tests/test-*.js` files directly to Taper. Before the later `localAddress` test fix, the Windows CI result reported 56 test files and 1,599 assertions passing. |
| `tests/test-unix.js` | Uses a Windows named pipe on Windows. Other platforms retain the Unix-domain socket path and URL. Progress Report 2 records 7/7 checks passing on Windows and that the Unix-socket test passed on macOS in an earlier test run. |
| `tests/browser/start.js` | Starts the local Karma CLI through `process.execPath` on Windows, avoiding shell parsing of paths with spaces; non-Windows platforms continue to invoke `karma`. Spawn errors and nonzero exit statuses are reported and propagated. |
| `tests/test-form-data.js` | The multipart basic-auth test server sends `Connection: close` with its 401 response. The recorded failure was `ECONNRESET` while the client was still sending the multipart body; after the test-server change the form-data test passed 64/64. This restores a failing test and is part of suite restoration, not an additional Corrective activity. |
| `tests/test-localAddress.js` | Replaced reliance on an external Google endpoint with a local HTTP server, avoiding the observed Windows `ENETUNREACH` failure while retaining checks for invalid binding, source address, and redirects. This is test isolation; production request behavior was not changed. |
| Browser TLS fixtures and configuration | Replaced expired/weak browser-only fixtures with a 2048-bit RSA test CA and matching SHA-256-signed 2048-bit RSA server certificate. The server certificate includes `DNS:localhost` in its Subject Alternative Name and `serverAuth` extended key usage. Both certificates were issued for 3,650 days; the server certificate is valid through October 18, 2036. The CA signing key is not retained in the repository. Karma/PhantomJS trusts `tests/browser/ssl/ca.crt` via `--ssl-certificates-path` and runs with `--ignore-ssl-errors=false`. TLS request errors are explicit test failures. |

The former browser server and CA certificates used 1024-bit RSA and SHA-1 and expired on January 4, 2025. The browser test is intended to establish the trusted-CA and correct-hostname positive case. Focused negative validation also checks rejection with an unrelated CA and with an incorrect hostname; neither case disables TLS verification. The browser-only certificate work does not change the Node HTTPS fixtures, OAuth signing key, or production TLS behavior. These browser changes are recorded in commit `96ee9b4`.

We classify this work as Adaptive Maintenance because it adapts and repairs the existing test infrastructure and fixtures so the core suite can run in the target environment while preserving Unix-like platform paths where applicable. These results do not establish that the current application or test suite works on every operating system.

## 4. Perfective Maintenance — Separate Shell-Script Activity

### Shell-script line-ending portability

The release and certificate-generation scripts were recorded with CRLF line endings. The project report records that executing `tests/ssl/ca/gen-all-certs.sh` under Bash failed with “cannot execute: required file not found.” This was a portability and maintenance-tooling problem, not a change to the `request` library's runtime behavior.

The work improves consistency and maintainability by enforcing LF endings and checking the script files automatically:

| File | Role or change |
| --- | --- |
| `.gitattributes` | Sets `text eol=lf` for `*.sh`. |
| `release.sh` | Release helper; normalized to LF. |
| `tests/ssl/gen-test.sh` | Generates the self-signed certificate used by the test server; normalized to LF. |
| `tests/ssl/ca/gen-all-certs.sh` | Runs the server, client, and localhost certificate-generation scripts; normalized to LF. |
| `tests/ssl/ca/gen-server.sh` | Generates the server test certificate; normalized to LF. |
| `tests/ssl/ca/gen-client.sh` | Generates the client test certificate; normalized to LF. |
| `tests/ssl/ca/gen-localhost.sh` | Generates the localhost test certificate; normalized to LF. |
| `tests/ssl/ca/README.md` | Documents the LF requirement for running the scripts with bash/sh. |
| `tests/test-shell-scripts.js` | Checks the six scripts for CR characters and runs `bash -n` on each: 12 checks total. |

The test checks line endings and Bash syntax. It does not execute the scripts, verify certificate generation, or prove application compatibility across operating systems.

Prodip Kumar Das completed this work independently in the Windows environment. We classify it as perfective because it improves the consistency and maintainability of our supporting scripts without changing the library's runtime behavior. The historical Windows verification recorded 12/12 checks passing. We reran the command during the October 20, 2026 documentation consolidation on Windows with Node.js 22.19.0; it again passed 12/12. Bash was available, but its version was not recorded. We have no evidence of a Linux or macOS run.

## 5. Corrective Maintenance — Agent-Pool Protocol Collision

The pooled-agent selection used the destination URI protocol in its pool key even when a non-tunneled proxy request selected its HTTP module from the proxy protocol. That mismatch could select an agent from the wrong protocol pool. The correction in `request.js` uses the proxy protocol for non-tunneled proxy requests and otherwise uses the destination protocol. Commit `e30d782` also adds a regression test in `tests/test-tunnel.js` that exercises an HTTPS request before the proxy cases.

The recorded old-key counterfactual passed 23/27 assertions and produced four protocol errors; with the updated key logic, `node tests/test-tunnel.js` passed 27/27. This is a functional library defect correction and a separate follow-on activity, not an adaptation required to make the test infrastructure run. The tunnel test exposed the defect but does not make the correction Adaptive Maintenance.

The agent-pool change is classified only as Corrective Maintenance. The certificate, form-data, `localAddress`, Windows infrastructure, and browser TLS work are already included in Adaptive Maintenance above and must not be counted again here.

## 6. Verification Results

The results below distinguish historical project records from tests rerun during the October 20, 2026 investigation and documentation update. Each row identifies its evidence status; results described as historical were not rerun during that investigation.

| Command or check | Result | Environment | Evidence status |
| --- | --- | --- | --- |
| `npm.cmd install` | Failed with `ERESOLVE` involving `karma` and `karma-tap`. `npm.cmd install --legacy-peer-deps` then installed dependencies successfully. The install reported deprecated packages and vulnerabilities. We did not run `npm audit fix` because we did not want to automatically change the legacy dependency structure before understanding it. | Initial Windows setup; Node.js 22.19.0, npm 10.9.3. | Historical setup record; not a test result. |
| Initial `npm.cmd test` | Lint passed; `test-ci` failed, so `test-browser` was not reached in that run. | Initial Windows test run; Node.js 22.19.0, npm 10.9.3. | Historical; later browser and full-suite results are listed separately below. |
| `node tests/test-https.js` before certificate renewal | 20 tests; 10 passed and 10 failed. Relaxed HTTPS checks passed; strict checks failed with `CERT_HAS_EXPIRED`. | Initial Windows HTTPS investigation; Node.js 22.19.0. | Historical baseline. |
| `node tests/test-https.js` after certificate renewal | 20/20 passed, including strict HTTPS checks. | Windows, Node.js 22.19.0. | Historical post-fix verification; later results are listed separately below. |
| `npm.cmd run test-ci` and individual test files | Taper reported no useful failing file. We ran each matching file with the historical command pattern `node tests\test-<name>.js`, where `<name>` is the test-file name suffix. The 55 files yielded 52 passing files (1,434 assertions) and three failing files: `test-form-data`, `test-tunnel`, and `test-unix`. | Windows; initial post-certificate-fix snapshot, Node.js 22.19.0, npm 10.9.3. | Historical intermediate snapshot, before the subsequent Windows and test-fixture fixes. |
| `npm.cmd run test-browser` | Failed to start with `spawn karma ENOENT`. | Initial Windows test setup. | Historical; `tests/browser/start.js` was later updated, and subsequent browser results are listed separately. |
| `npm.cmd run lint` | Exit 0; legacy dependency circular-dependency warnings were reported. | Windows, Node.js 22.19.0, npm 10.9.3 | Historical, preceding verification. |
| `npm.cmd run test-ci` | Exit 0; 56 test files and 1,599/1,599 assertions passed. | Windows, Node.js 22.19.0, npm 10.9.3 | Historical, preceding verification. |
| `node tests/test-tunnel.js` | Exit 0; 27/27 assertions passed. | Windows, Node.js 22.19.0, npm 10.9.3 | Historical, preceding verification. |
| `node tests/test-shell-scripts.js` | 12/12 checks passed. | Windows, Node.js 22.19.0; Bash available, version not recorded. | Historical standalone result and October 20 rerun; also passed in the October 21 full CI run. |
| `npm.cmd test` in an isolated worktree copy | Exit 0; lint and CI passed, then the PhantomJS browser tests passed 2/2. | Windows; recorded with Node.js 22.19.0 and npm 10.9.3. | Historical, preceding verification. |
| `npm.cmd test` before the Windows Karma-launch fix | Lint passed and CI passed 1,606/1,606; browser startup failed because `cmd.exe` split the Karma configuration path at the first space. | Windows, Node.js 22.19.0, npm 10.9.3; isolated copy under a path containing spaces. | Observed during the October 21, 2026 review; led to the startup fix in `tests/browser/start.js`. |
| `node tests/test-unix.js` | 7/7 checks passed. | Windows; Progress Report 2 environment, Node.js 22.19.0. | Historical, earlier snapshot. |
| `npm.cmd test` | Lint, all 55 test files (1,585 assertions), and browser tests passed. | Windows, Node.js 22.19.0; Progress Report 2, October 12, 2026. | Historical snapshot before the later 56-file and `localAddress` test results; not current verification. |
| `node tests/test-https.js` | 20/20 passed after the CA renewal. | Windows; earlier certificate-fix verification, Node.js 22.19.0. | Historical; not a current cross-platform result. |
| `openssl verify -CAfile tests/ssl/ca/ca.crt tests/ssl/ca/server.crt` | `server.crt: OK` after renewal. | Windows; earlier certificate-fix verification. | Historical. |
| `node tests/test-localAddress.js` before the test fix | Exit 1; the redirect assertion received `ENETUNREACH` and the callback then raised `TypeError` because `res` was undefined. | Windows, Node.js 22.19.0. | Baseline reproduced twice before editing. |
| `npm.cmd run test-ci` before the test fix | Exit 2; 1,596/1,598 assertions passed. `test-localAddress.js` failed 1/6. | Windows, Node.js 22.19.0, npm 10.9.3. | Baseline run during this investigation. |
| `node tests/test-localAddress.js` after the test fix | Exit 0; 14/14 assertions passed on repeated runs. | Windows, Node.js 22.19.0. | Rerun after the final test change. |
| `npm.cmd test` after the Windows Karma-launch fix | Exit 0; lint passed, CI passed 1,606/1,606 assertions, and browser tests passed 2/2. | Windows, Node.js 22.19.0, npm 10.9.3, PhantomJS 2.1.1; isolated copy of the current worktree under a path containing spaces. | Rerun during the October 21, 2026 review. |
| `npm.cmd run test-cov` | Exit 0; the test suite passed 1,606/1,606 assertions and generated coverage output. | Windows, Node.js 22.19.0, npm 10.9.3; isolated copy of the current worktree. | Rerun during the October 21, 2026 review; generated artifacts stayed in the isolated copy. |
| `npm.cmd test` after enabling browser certificate validation | Lint passed, all 56 test files passed with 1,606/1,606 assertions, and PhantomJS passed 2/2 browser assertions with `--ignore-ssl-errors=false` and the browser test CA configured. | Windows 11 Home `10.0.26200`; Node.js 22.19.0, npm 10.9.3, OpenSSL 3.6.1, PhantomJS 2.1.1; isolated copy of the current worktree. | Current Windows validation for the browser TLS update. |
| Final branch validation on macOS | Lint passed; all 56 test files passed with 1,606/1,606 assertions; browser tests passed 2/2 with strict certificate validation. `test-https.js` 20/20, `test-tunnel.js` 27/27, `test-oauth.js` 45/45, `test-form-data.js` 64/64, `test-shell-scripts.js` 12/12, and `test-unix.js` 6/6 passed. The `npm run test-cov` run also passed 1,606/1,606. | macOS 15.6.1; branch `prodip-integrate-andreas`, commit `96ee9b4`; Node.js 22.21.1, OpenSSL 3.6.2, PhantomJS 2.1.1. | `Report/Group_4_Maintenance_Programming_Final_Report.pdf`; this document update did not rerun those tests. |
| `npm.cmd run test-cov` | Exit 0; 1,606/1,606 assertions passed. | Same Windows environment; isolated copy. | Current Windows validation for the updated working tree. |
| `node tests/test-https.js`, `node tests/test-tunnel.js`, and `node tests/test-oauth.js` | HTTPS 20/20, tunnel 27/27, and OAuth 45/45 assertions passed. | Same Windows environment; isolated copy. | Current targeted regressions; Node HTTPS and OAuth fixtures were not changed. |
| `npm.cmd run test-browser` with trusted, unrelated-CA, and wrong-host certificates | The trusted CA and `localhost` certificate passed 2/2 assertions. Both an unrelated CA and a certificate signed by the trusted CA for `wronghost` caused an explicit failed HTTPS assertion. | Windows, PhantomJS 2.1.1; isolated validation copy. | Focused trust and hostname positive/negative checks; no certificate-validation bypass was enabled. |
| OpenSSL verification of `tests/browser/ssl/server.crt` | Chain verification and hostname verification for `localhost` passed; certificate was current, used a 2048-bit RSA key and SHA-256 signature, and matched `server.key`. | Windows OpenSSL 3.6.1. | Current fixture validation. |
| `cd tests/ssl && sh gen-test.sh` from the certificate README | Exit 0; the documented command wrote `test.key` and `test.crt` under the disposable `tests/ssl` directory, not its parent. | Windows 11; executed with WSL Bash 5.2.21 and OpenSSL 3.0.13, using an isolated temporary directory and OpenSSL configuration. | Current documentation-command validation; no checked-in fixture was regenerated. |
| Test suite and lint after replacing the 1024-bit HTTPS test key | All 55 test files and lint passed, as reported in the commit message for `6fbcb56`. | macOS, Node.js 22.21.1, OpenSSL 3.6.2. | Historical commit-message evidence; it does not verify the current working tree. |
| HTTPS, tunnel, shell-script, Unix-socket, and form-data tests | Passed 20/20, 27/27, 12/12, 6/6, and 64/64 respectively. | Windows, Node.js 22.19.0. | Rerun after the test fix; these tests also passed in the full CI suite. |

The 1,599/1,599, 1,596/1,598, and 1,606/1,606 CI counts are from different snapshots, not conflicting totals for one run: 1,599/1,599 was an earlier result before the later `localAddress` failure; 1,596/1,598 was the baseline during that investigation; and 1,606/1,606 followed the local-server test fix.

The final branch has documented full-suite and browser-test results on Windows and macOS. The current branch has not been verified on Linux or Node.js 24.

### Earlier macOS findings

Progress Report 2 records an earlier macOS run with Node.js 22.21.1, npm 10.9.4, and OpenSSL 3.6.2: 50 of 55 test files passed, including `test-unix.js`; five tests using the then-1024-bit HTTPS test key failed with `ERR_SSL_EE_KEY_TOO_SMALL`. We subsequently replaced the test key and related fixtures, but that report does not verify the current working tree on macOS.

The later commit message for `6fbcb56` reports that all 55 test files and lint passed on macOS with Node.js 22.21.1 and OpenSSL 3.6.2 after the 1024-bit HTTPS test key was replaced. This is historical evidence for that commit's snapshot, not a test of the current working tree.

The final report also records that `tests/test-timing.js` failed intermittently on macOS: one assertion failed in 7 of 15 repeated runs, and the unmodified upstream `master` failed at the same rate. The assertion compares request and redirected-response start times in whole milliseconds, which can be equal on a fast machine. The report identifies this as a pre-existing timing-sensitive test, not a regression from the maintenance changes.

The report also records a diagnostic run with a lowered OpenSSL security level. We used that only to investigate, not as a fix. We did not disable certificate verification or lower OpenSSL security checks as a solution.

## 7. Remaining Work

### Remaining before the maintenance work is finalized

1. Decide with the group whether current-branch Linux testing is feasible before submission. Linux testing has not been run on the current branch.
2. Confirm individual contributions and reviews for later implementation work. Our original task division records initial plans, not ownership of every later change.
3. Complete our final review and update the project documentation before sharing approved changes.

### Optional future improvements

- Consider replacing or modernizing the PhantomJS browser-test stack; it is described as unmaintained in Progress Report 2, but it is outside the completed maintenance work recorded here.
- Review dependency and lockfile reproducibility separately. Progress Report 1 notes that `package-lock.json` is ignored and installs differed between snapshots; this was not addressed as part of the documented maintenance changes.

## 8. Group Contributions and Review

The following contributions reflect the information currently available. They are not an exhaustive record, and we can add or correct them as we confirm more details.

- **Prodip Kumar Das:** I independently completed the Perfective Maintenance work in Section 4 on Windows. I improved shell-script portability and maintainability, added the `.gitattributes` LF rule, normalized the relevant shell scripts, added `tests/test-shell-scripts.js` to check for CR characters and validate syntax with `bash -n`, documented the LF requirement in `tests/ssl/ca/README.md`, and verified 12/12 shell checks on Windows. I also investigated HTTPS certificate failures, documented the certificate findings, renewed or updated the relevant HTTPS test certificate fixtures, verified HTTPS tests and the broader test suite on Windows after certificate changes, and maintained `MAINTENANCE.md` with our maintenance findings and verification evidence.
- **Martin Ek:** He verified HTTPS tests after certificate-related changes and investigated and reported additional HTTPS-related issues. He also investigated the identified macOS-specific test failures, implemented fixes for them, and verified relevant tests on macOS after those changes, as recorded in the available reports and group information. Those earlier targeted results do not establish that the current working tree has been fully verified on macOS.
- **Andreas Lund:** He investigated the complete test suite and reported the remaining failures, as recorded in the maintenance notes.

Our original task division also listed reviewing the maintenance work, agreeing on classifications, and preparing the final report and presentation as shared responsibilities. We still need to confirm individual authorship and review of later changes with our groupmates; we do not assign those changes to a specific person without evidence.

## 9. Historical Investigation

### Historical corrective investigation snapshot

The separate corrective-maintenance investigation did not state a preparation
date. It described a repository snapshot in which the earlier certificate and
test fixture fixes were already present. Its conclusion was limited to that
investigation: no additional reproducible corrective defect was found there,
so it made no implementation change. This does not remove or reclassify the
separately documented agent-pool protocol correction in Section 5.

The investigation recorded Node.js `v22.19.0` and OpenSSL `3.6.1 27 Jan 2026`.
It ran:

```text
node tests/test-https.js
node tests/test-tunnel.js
```

The recorded results were 20/20 HTTPS assertions and 26/26 tunnel assertions.
The tunnel count is historical; the later regression test added an assertion,
and the later Windows result recorded in Section 6 is 27/27.

The report recorded these fixture details for its snapshot: CA certificate
valid through October 2036 and 2048-bit RSA key; server certificate valid
through October 2036 with a 4096-bit key; client and localhost certificates
valid through October 2036 with 2048-bit keys; `tests/ssl/test.key` at 2048
bits; and `tests/ssl/test.crt` valid through October 2036. Its sample OpenSSL
output included:

```text
notBefore=Oct 11 18:42:36 2026 GMT
notAfter=Oct  8 18:42:36 2036 GMT
Public-Key: (2048 bit)

notBefore=Oct 12 00:18:13 2026 GMT
notAfter=Oct  9 00:18:13 2036 GMT
Public-Key: (4096 bit)
```

These are the report's historical observations, not current fixture
validation.

The investigation referred to commits `6fbcb56` (replace the 1024-bit HTTPS
test key), `dd288ba` (fix duplicate certificate serial numbers), and
`defd8a6` (renew expired HTTPS test certificates). It inspected Git state,
maintenance notes, HTTPS/TLS tests, certificate fixtures, and runtime
versions, and found those previously identified issues already addressed in
the snapshot. No implementation changes were made as part of that
investigation.

### Initial setup and HTTPS findings

In the initial Windows HTTPS investigation, the relaxed HTTPS tests passed but the strict tests failed with `CERT_HAS_EXPIRED`; `node tests/test-https.js` passed 10/20. We inspected the certificates with:

```text
openssl x509 -in tests/ssl/ca/server.crt -noout -dates -issuer -subject
openssl x509 -in tests/ssl/ca/ca.crt -noout -dates -issuer -subject
openssl verify -CAfile tests/ssl/ca/ca.crt tests/ssl/ca/server.crt
```

The original server certificate was valid until November 19, 2028, but its CA certificate expired on February 27, 2022. OpenSSL chain verification failed because of the expired CA. We also inspected `request.js` for `strictSSL`, `rejectUnauthorized`, CA handling, and HTTPS options. The CA and `rejectUnauthorized` settings were passed through to Node's HTTP/HTTPS implementation; we found no evidence that this failure required a `request.js` certificate-option change.

We later renewed or replaced the CA and related fixtures. In the historical certificate-renewal record, we regenerated the CA using the existing test CA key and appropriate CA extensions, then regenerated the server certificate and matching server private key using the renewed CA. That record gives October 5, 2036 as the expiry date for both the renewed CA and server certificates. Our maintenance records also report 2048-bit CA, client, localhost, and test keys, a 4096-bit server key, and reference `defd8a6` for certificate renewal, `dd288ba` for certificate serial handling, and `6fbcb56` for replacement of the 1024-bit HTTPS test key. These are historical fixture details and do not establish current Linux or macOS test success.

### Earlier suite failures and subsequent work

The initial dependency setup failed with `ERESOLVE` involving `karma` and `karma-tap`; `npm.cmd install --legacy-peer-deps` succeeded. We did not run `npm audit fix` because we wanted to avoid automatically changing the legacy dependency structure. The initial `npm.cmd test` run passed lint, failed at CI, and therefore did not reach browser tests. In an intermediate snapshot, `npm.cmd run test-ci` did not identify the failing file, so the 55 matching test files were run individually: 52 passed with 1,434 assertions, while `test-form-data`, `test-tunnel`, and `test-unix` failed. This is an earlier result, not the latest suite count.

The original tunnel failure occurred before assertions while the HTTPS test server started, with `ERR_SSL_CA_MD_TOO_WEAK`; the investigation attributed this to OpenSSL 3 rejecting the SHA-1 signature on `localhost.crt`. That certificate was 2048-bit and valid until November 19, 2028. The 2048-bit `client.crt` was also SHA-1-signed and had expired on November 21, 2021; verification against the renewed CA reported expiration. These were observations of the earlier fixture set. The fixtures were subsequently renewed or replaced, and the later tunnel test passed 27/27; the separate agent-pool protocol fix and its regression test are documented in Section 5.

The original form-data failure occurred after 42 assertions: the multipart basic-auth case received `ECONNRESET`, followed by a `TypeError` when the unavailable response was accessed. The original investigation notes say the failure recurred on repeated runs and was also observed on Node.js 24; this is a historical observation, not a current test result or proof of cause. The source investigation proposed that the server sent `401` without reading the body while the client was still sending it, but labeled that explanation preliminary. A later test-server change sends `Connection: close` with the `401` response; the test subsequently passed 64/64. The preliminary explanation is not treated here as a confirmed production defect.

On Windows, the original Unix-domain socket test attempted to listen on a filesystem socket path and failed with `EACCES`; Windows requires a named-pipe path for this use. The initial investigation notes describe the project's Travis CI as Linux-only; that historical setup is not verification of the current working tree on Linux. The test was adapted to use a named pipe on Windows while retaining Unix-domain sockets on supported Unix-like systems. The initial browser command, `npm.cmd run test-browser`, failed with `spawn karma ENOENT` because the startup script did not launch Karma correctly on Windows. The startup script was subsequently made platform-aware, and a later Windows browser run passed 2/2.

The initial notes also record a Node.js 24 compatibility issue: `test-https.js` failed with `ERR_SSL_EE_KEY_TOO_SMALL` because the relaxed HTTPS server used the 1024-bit `tests/ssl/test.key`. The fixture was later replaced; this historical observation does not establish that the current suite has been verified on Node.js 24. Dependency reproducibility was also a concern: `package-lock.json` is ignored, and one fresh install recorded 896 packages and 61 vulnerabilities, compared with 892 packages and 59 vulnerabilities in Progress Report 1. Those counts are snapshot-specific, not current dependency-audit results.

Earlier Windows runs also exposed the wildcard-expansion issue addressed in Section 3. Later Windows results and fixes are recorded in Sections 3 and 6; none of these historical failures should be read as current results. The final activity classifications are summarized in Sections 3–5.

## 10. Project Reports and References

Project reports retained in `Report/` include:

- `Group_4_Maintenance_Programming_Final_Report.pdf`
- `Initial Report - Maintenance Programming Project.pdf`
- `annotated-Progress_Report_1_Group_4.docx.pdf`
- `Progress_Report_2_Group_4.pdf`

Historical corrective-investigation evidence is summarized in Section 9.
Browser TLS configuration and validation are documented as Adaptive
Maintenance in Section 3. We use this file as our central maintenance record
and retain earlier investigation results where they explain our changes or
current verification limits.
