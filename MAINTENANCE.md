# Maintenance Programming - Group 4

## Project

**Course:** 1DL601 Maintenance Programming

**Group members:**
- Martin Ek
- Andreas Lund
- Prodip Kumar Das

**Legacy system:** `request`

`request` is a legacy Node.js HTTP client library. The original project was officially deprecated in February 2020.

---

## Current Branch

We are currently working on:

`prodip-investigation`

This branch is being used for investigation and maintenance changes.

---

## Environment

- Operating System: Windows
- Node.js: 22.19.0
- npm: 10.9.3

---

# Work Done So Far

## 1. Repository Setup

- Forked the original `request` repository.
- Cloned the repository locally.
- Created the `prodip-investigation` branch.
- No source-code changes were made to `request.js`.

---

## 2. Installing Dependencies

First, we tried:

    npm.cmd install

This failed with an `ERESOLVE` dependency error involving `karma` and `karma-tap`.

We then used:

    npm.cmd install --legacy-peer-deps

This successfully installed the dependencies.

The installation also reported deprecated packages and security vulnerabilities.

We did not run `npm audit fix` because we did not want to automatically change the old dependency structure before understanding the original project.

---

## 3. Running the Tests

We ran:

    npm.cmd test

The result was:

    lint          -> passed
    test-ci       -> failed
    test-browser  -> not reached

Because `test-ci` failed, the browser tests were not executed.

The project has 55 JavaScript test files matching:

    tests/test-*.js

---

## 4. HTTPS Test Investigation

We ran the HTTPS test directly:

    node tests\test-https.js

Initially, the result was:

    20 tests
    10 passed
    10 failed

The relaxed HTTPS tests passed.

The strict HTTPS tests failed with:

    CERT_HAS_EXPIRED

This showed that certificate validation was the main problem to investigate.

---

## 5. Certificate Investigation

We checked the server certificate:

    openssl x509 -in tests\ssl\ca\server.crt -noout -dates -issuer -subject

The original server certificate was valid until:

**November 19, 2028**

We then checked the CA certificate:

    openssl x509 -in tests\ssl\ca\ca.crt -noout -dates -issuer -subject

The original CA certificate expired on:

**February 27, 2022**

Therefore:

- The server certificate had not expired.
- The CA certificate used by the strict HTTPS tests had expired.

---

## 6. OpenSSL Verification

We used OpenSSL to verify the certificate chain:

    openssl verify -CAfile tests\ssl\ca\ca.crt tests\ssl\ca\server.crt

The verification failed because the CA certificate had expired.

This confirmed that the expired CA certificate was the cause of the strict HTTPS failure.

---

## 7. Checking request.js

We also checked how `request.js` handles the HTTPS certificate options.

We searched for the relevant code using:

    Select-String -Path request.js -Pattern "strictSSL|rejectUnauthorized|ca|https"

The investigation showed that:

- The CA certificate is passed to the HTTPS options.
- The `rejectUnauthorized` setting is passed correctly.
- The request is eventually passed to Node's HTTP/HTTPS implementation.

We found no evidence that `request.js` itself was incorrectly handling the certificate options.

---

# Certificate Maintenance Fix

## 8. Renewing the Test Certificates

The expired CA certificate was renewed using the existing test CA key.

The CA certificate was regenerated with appropriate CA certificate extensions.

The server certificate and matching server private key were then regenerated using the renewed CA.

The new CA certificate is valid until:

**October 5, 2036**

The new server certificate is also valid until:

**October 5, 2036**

The certificate chain was verified with OpenSSL:

    openssl verify -CAfile tests\ssl\ca\ca.crt tests\ssl\ca\server.crt

Result:

    server.crt: OK

No changes were made to `request.js`.

---

## 9. HTTPS Test After the Fix

After regenerating the certificates, we ran:

    node tests\test-https.js

The result was:

    1..20
    # tests 20
    # pass  20
    # ok

Both relaxed and strict HTTPS tests now pass.

This confirms that the expired certificate problem has been fixed.

---

# Complete Test Suite After the Certificate Fix

## 10. Running the Complete Test Suite

Environment used (same as in Progress Report 1):

- Node.js: 22.19.0
- npm: 10.9.3
- Dependencies installed with `npm.cmd install --legacy-peer-deps`

We first ran:

    npm.cmd run test-ci

Taper only reported:

    total ............................... 0/1
    not ok

This does not show which test file failed. We therefore ran each of the 55 test files directly:

    node tests\test-<name>.js

The result was:

    55 test files
    52 passed   (1434 assertions, 0 failures)
     3 failed   (test-form-data, test-tunnel, test-unix)

`test-https.js` still passes with 20/20 after the certificate fix. The only other test file that uses `tests/ssl/ca/ca.crt` is `test-tunnel.js`, which fails for a different reason (see below).

---

## 11. Remaining Failures

### test-tunnel.js

The test crashes before any assertion when the HTTPS test server starts:

    Error: error:0A00018E:SSL routines::ca md too weak
    code: 'ERR_SSL_CA_MD_TOO_WEAK'

The test uses other certificates from `tests/ssl/ca/`, which were not part of the certificate fix:

    localhost.crt   sha1WithRSAEncryption, 2048 bit, valid until Nov 19, 2028
    client.crt      sha1WithRSAEncryption, 2048 bit, expired Nov 21, 2021

OpenSSL 3 rejects the SHA-1 signature on `localhost.crt`. `client.crt` has also expired:

    openssl verify -CAfile tests\ssl\ca\ca.crt tests\ssl\ca\client.crt
    error 10 at 0 depth lookup: certificate has expired

This is the same type of problem as the expired CA certificate and should be fixable in the same way.

### test-form-data.js

42 assertions pass, then the `multipart formData + basic auth` case fails and the test crashes:

    not ok 43 should be equal
      expected: null
      actual:   { [Error: read ECONNRESET] code: 'ECONNRESET', syscall: 'read' }

    TypeError: Cannot read properties of undefined (reading 'statusCode')

The failure happens on every run, and also on Node.js 24.

Preliminary explanation (not yet verified): with `sendImmediately: false`, the test server answers the first request with `401` without reading the multipart body. Modern Node.js closes the connection while the client is still sending the body, which gives `ECONNRESET` on the client side.

This needs further investigation to decide whether the problem is in the test or in how `request.js` handles the 401 response.

### test-unix.js

The test crashes when it tries to listen on a Unix domain socket:

    Error: listen EACCES: permission denied ...\tests/tmp-socket

The test uses a file path as socket path. This does not work on Windows, where a named pipe path (`\\.\pipe\...`) is required. The original project only ran its CI on Linux (`.travis.yml`).

This is a platform problem and not a defect in `request`.

### test-browser

Because `test-ci` fails, `npm test` never reaches the browser tests. Running them directly gives:

    npm.cmd run test-browser
    Error: spawn karma ENOENT

`tests/browser/start.js` starts `karma` in a way that does not work on Windows. The browser tests also depend on PhantomJS, which is no longer maintained.

---

## 12. Environment Observations

- On Node.js 24, `test-https.js` crashes with `ERR_SSL_EE_KEY_TOO_SMALL`, even after the certificate fix, because Node.js 24 rejects the 1024-bit `tests/ssl/test.key` used by the relaxed HTTPS server. All group members should therefore use Node.js 22.19.0.
- `package-lock.json` is ignored by `.gitignore`. The installed dependency tree can therefore differ between group members. A fresh install gave 896 packages and 61 vulnerabilities, compared to 892 packages and 59 vulnerabilities in Progress Report 1.

---

# Current Finding

The original strict HTTPS test failure was caused by an expired CA certificate in the test infrastructure.

The maintenance fix was to renew the test CA certificate and regenerate the server certificate and matching server key.

Important findings:

- The original CA certificate expired in February 2022.
- The original server certificate itself had not expired.
- Strict HTTPS verification failed because the CA was expired.
- `request.js` was not identified as the cause.
- The renewed CA and server certificates verify successfully.
- All 20 HTTPS tests now pass.

---

# Current Status

**Status: HTTPS certificate maintenance completed and verified.**

The certificate maintenance changes have been committed on the `prodip-investigation` branch.

Commit:

    defd8a6 Renew expired HTTPS test certificates

The working tree is clean after the commit.

The complete test suite has been run after the certificate fix (see sections 10–12). 52 of 55 test files pass. Three test files still fail.

---

# Planned / Remaining Work

1. Renew `localhost.crt` and `client.crt` so that `test-tunnel.js` can run.
2. Investigate the root cause of the `test-form-data.js` failure.
3. Decide whether to fix or only document the Windows-specific failures (`test-unix.js`, `test-browser`).
4. Document the final findings.
5. Finalize the maintenance type classification.
6. Update the final project report.
7. Prepare the final presentation.

---

# Task Division

## Prodip Kumar Das

- Investigate the HTTPS certificate problem.
- Renew the expired test certificates.
- Maintain `MAINTENANCE.md`.
- Document the certificate-related findings.

## Martin Ek

- Verify the HTTPS tests after the certificate fix.
- Report any additional HTTPS-related issues.

## Andreas Lund

- Run and investigate the complete test suite.
- Report any remaining failures.

## All Group Members

- Review the final maintenance changes.
- Agree on the maintenance type classification.
- Prepare the final report and presentation.

---

# Preliminary Maintenance Types

## Corrective Maintenance

The expired CA certificate caused the strict HTTPS tests to fail. Renewing the certificate corrects this failure.

## Adaptive Maintenance

The old test certificate infrastructure needed to be updated so that the legacy project continues to work correctly in the current development environment while maintaining strict HTTPS certificate validation.

## Perfective Maintenance

Perfective maintenance will only be considered if the project includes an improvement that makes the test infrastructure easier to maintain or understand.

The final classification will be decided after the remaining project work is completed.

---

# Project Reports

The submitted reports are stored in:

    Report/

They include:

- `Initial Report - Maintenance Programming Project.pdf`
- `annotated-Progress_Report_1_Group_4.docx.pdf`

---

# Notes

This file is a living technical log for the maintenance project.

It records important setup steps, commands, investigation results, maintenance changes, current findings, and remaining work.

It will be updated as the project progresses.