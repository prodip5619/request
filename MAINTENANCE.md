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

Our work covers test discovery and execution, Windows test support, certificate fixtures and generation, the agent pool, and shell-script portability. The sections below summarize changes supported by the repository and our project reports.

We have discussed the adaptive and perfective classifications with the TA and received confirmation that we can use these categories for our work. We still need to clarify whether the certificate-related and other potentially corrective fixes count as corrective maintenance. Each task can count toward only one maintenance type for the course.

Our latest documented full CI and browser-test results are from Windows. We have not verified the current working tree on Linux or macOS.

### `localAddress` redirect test

The previous `tests/test-localAddress.js` redirect case contacted Google and chose the first non-internal IPv4 address returned by the operating system. On our Windows test environment, that address was `172.29.224.1` on the WSL virtual adapter. DNS resolution succeeded and a default-route TCP check to Google succeeded, but the request bound to the selected adapter failed with `ENETUNREACH` at `142.251.143.142:80`. The callback then accessed `res.request` even though the request had failed, causing a `TypeError`.

We replaced that external dependency with a local HTTP server bound to the selected local IPv4 address (or loopback if none is available). The test still checks invalid-address binding, verifies the source address observed by the server, and follows a local `/redirect` to `/final` while checking the source address on both requests. No production request or redirect code needed to change.

## 3. Adaptive Maintenance

These changes adapt the test infrastructure to Windows behavior while retaining the Unix-like platform paths where applicable.

| Change | Purpose and evidence |
| --- | --- |
| `tests/run-test-suite.js` and the `test-ci` script in `package.json` | The earlier test command passed a wildcard to Taper through `cmd.exe`; Windows did not expand it, and Taper ran no tests. The runner now finds, sorts, and passes matching `tests/test-*.js` files directly to Taper. Before the later `localAddress` test fix, the Windows CI result reported 56 test files and 1,599 assertions passing. |
| `tests/test-unix.js` | Uses a Windows named pipe on Windows. Other platforms retain the Unix-domain socket path and URL. Progress Report 2 records 7/7 checks passing on Windows and that the Unix-socket test passed on macOS in an earlier test run. |
| `tests/browser/start.js` | Starts the local Karma CLI through `process.execPath` on Windows, avoiding shell parsing of paths with spaces; non-Windows platforms continue to invoke `karma`. Spawn errors and nonzero exit statuses are reported and propagated. |

We classify this work as adaptive because it adjusts the existing test infrastructure to the Windows environment while preserving Unix-like behavior. These changes do not establish that the current application or test suite works on all operating systems.

## 4. Perfective Maintenance

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

## 5. Potentially Corrective Work — Classification Pending

We have not resolved with the TA whether the following fixes qualify as corrective maintenance for the course. A task may involve characteristics of multiple maintenance types, but it can count toward only one type. We still need to agree on the primary classification of each task and confirm it with the TA.

| Task | What changed and why | Classification status |
| --- | --- | --- |
| Certificate fixtures and generation | The expired CA caused strict HTTPS tests to fail with `CERT_HAS_EXPIRED`. We later renewed the CA and reissued the server, client, and localhost certificates. We also replaced weak or expired test fixtures, including `tests/ssl/test.key` and `tests/ssl/test.crt`. The generator workflow was updated, and `gen-client.sh` and `gen-localhost.sh` use `-CAserial ca.srl` to avoid duplicate serial allocation. TLS verification was not disabled. | We still need to confirm whether these changes count as corrective maintenance. |
| Agent-pool protocol collision | `request.js` keys pooled agents using the proxy protocol for non-tunneled proxy requests and otherwise the destination protocol. `tests/test-tunnel.js` first exercises an HTTPS request to expose an incompatible pooled-agent selection. An in-memory old-key counterfactual is recorded as 23/27 passing, with four protocol errors. | We still need to confirm whether this fix counts as corrective maintenance. |
| Form-data test response | `tests/test-form-data.js` sends `Connection: close` with the test server's 401 response. The progress report says this addressed an `ECONNRESET` when the client was still sending a multipart body. | We still need to confirm whether this test-server fix counts as corrective maintenance. |

Progress Reports 1 and 2 treated the maintenance classifications as proposals and left the final decision open. We have since confirmed with the TA that adaptive and perfective maintenance can be used for our work. The classification still awaiting clarification is whether the fixes above count as corrective maintenance.

We have not assigned a course maintenance type to the `localAddress` test-only reliability change described in Section 2.

The separate corrective-maintenance report found no additional reproducible corrective defect in its investigated snapshot and made no implementation change. It records passing HTTPS and tunnel checks on that snapshot; it does not settle the classification of the fixes listed above.

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
| Test suite and lint after replacing the 1024-bit HTTPS test key | All 55 test files and lint passed, as reported in the commit message for `6fbcb56`. | macOS, Node.js 22.21.1, OpenSSL 3.6.2. | Historical commit-message evidence; it does not verify the current working tree. |
| HTTPS, tunnel, shell-script, Unix-socket, and form-data tests | Passed 20/20, 27/27, 12/12, 6/6, and 64/64 respectively. | Windows, Node.js 22.19.0. | Rerun after the test fix; these tests also passed in the full CI suite. |

The 1,599/1,599, 1,596/1,598, and 1,606/1,606 CI counts are from different snapshots, not conflicting totals for one run: 1,599/1,599 was an earlier result before the later `localAddress` failure; 1,596/1,598 was the baseline during that investigation; and 1,606/1,606 followed the local-server test fix.

We have documented full-suite and browser-test results for Windows. We still need to verify the current working tree on Linux or macOS.

### Earlier macOS findings

Progress Report 2 records an earlier macOS run with Node.js 22.21.1, npm 10.9.4, and OpenSSL 3.6.2: 50 of 55 test files passed, including `test-unix.js`; five tests using the then-1024-bit HTTPS test key failed with `ERR_SSL_EE_KEY_TOO_SMALL`. We subsequently replaced the test key and related fixtures, but that report does not verify the current working tree on macOS.

The later commit message for `6fbcb56` reports that all 55 test files and lint passed on macOS with Node.js 22.21.1 and OpenSSL 3.6.2 after the 1024-bit HTTPS test key was replaced. This is historical evidence for that commit's snapshot, not a test of the current working tree.

The report also records a diagnostic run with a lowered OpenSSL security level. We used that only to investigate, not as a fix. We did not disable certificate verification or lower OpenSSL security checks as a solution.

## 7. Remaining Work

### Required before the maintenance work is finalized

1. Clarify with the TA how to classify the certificate-related and other disputed tasks.
2. Agree on one primary classification per task, especially for the certificate, agent-pool, and form-data work.
3. Run and record the current full test suite on Linux and macOS, or document which platform we can test and any limits. The earlier macOS snapshot is not current verification.
4. Confirm individual contributions and reviews for later implementation work. Our original task division records initial plans, not ownership of every later change.
5. Complete our final review and update the project documentation before sharing approved changes.

### Optional future improvements

- Consider replacing or modernizing the PhantomJS browser-test stack; it is described as unmaintained in Progress Report 2, but it is outside the completed maintenance work recorded here.
- Review the separate browser-test TLS fixtures in `tests/browser/ssl/`. The checked-in server and CA certificates are self-signed, use 1024-bit RSA keys and SHA-1 signatures, and expired on January 4, 2025. The PhantomJS launcher uses `--ignore-ssl-errors=true`, so the passing browser test does not verify these certificates under normal TLS validation. Decide whether to replace the fixtures or retire this test setup as part of browser-stack modernization.
- Review dependency and lockfile reproducibility separately. Progress Report 1 notes that `package-lock.json` is ignored and installs differed between snapshots; this was not addressed as part of the documented maintenance changes.

## 8. Group Contributions and Review

The following contributions reflect the information currently available. They are not an exhaustive record, and we can add or correct them as we confirm more details.

- **Prodip Kumar Das:** I independently completed the Perfective Maintenance work in Section 4 on Windows. I improved shell-script portability and maintainability, added the `.gitattributes` LF rule, normalized the relevant shell scripts, added `tests/test-shell-scripts.js` to check for CR characters and validate syntax with `bash -n`, documented the LF requirement in `tests/ssl/ca/README.md`, and verified 12/12 shell checks on Windows. I also investigated HTTPS certificate failures, documented the certificate findings, renewed or updated the relevant HTTPS test certificate fixtures, verified HTTPS tests and the broader test suite on Windows after certificate changes, and maintained `MAINTENANCE.md` with our maintenance findings and verification evidence.
- **Martin Ek:** He verified HTTPS tests after certificate-related changes and investigated and reported additional HTTPS-related issues. He also investigated the identified macOS-specific test failures, implemented fixes for them, and verified relevant tests on macOS after those changes, as recorded in the available reports and group information. Those earlier targeted results do not establish that the current working tree has been fully verified on macOS.
- **Andreas Lund:** He investigated the complete test suite and reported the remaining failures, as recorded in the maintenance notes.

Our original task division also listed reviewing the maintenance work, agreeing on classifications, and preparing the final report and presentation as shared responsibilities. We still need to confirm individual authorship and review of later changes with our groupmates; we do not assign those changes to a specific person without evidence.

## 9. Historical Investigation

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

Earlier Windows runs also exposed the wildcard-expansion issue addressed in Section 3. Later Windows results and fixes are recorded in Sections 3 and 6; none of these historical failures should be read as current results. The classification of disputed work remains pending as described in Section 5.

## 10. Project Reports and References

Project reports retained in `Report/` include:

- `Initial Report - Maintenance Programming Project.pdf`
- `annotated-Progress_Report_1_Group_4.docx.pdf`
- `Progress_Report_2_Group_4.pdf`
- `corrective-maintenance-report.md`

We use this file as our central maintenance record. It retains earlier investigation results where they explain our changes or current verification limits.
