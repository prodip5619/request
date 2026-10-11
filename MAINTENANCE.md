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

# Verification on macOS

## 10. Second Environment

The certificate fix was verified on a second machine:

- Operating System: macOS
- Node.js: 22.21.1 (Homebrew)
- npm: 10.9.4
- OpenSSL: 3.6.2

Dependencies were installed with:

    npm install --legacy-peer-deps

---

## 11. Renewed Certificates

The renewed certificates were checked with OpenSSL:

    openssl verify -CAfile tests/ssl/ca/ca.crt tests/ssl/ca/server.crt

Result:

    tests/ssl/ca/server.crt: OK

The renewed chain is valid. However, the reused CA key is only 1024 bits:

    openssl pkey -in tests/ssl/ca/ca.key -passin pass:password -noout -text

    Private-Key: (1024 bit, 2 primes)

Newer OpenSSL rejects 1024-bit CA keys with the error "CA certificate key too weak". So the CA key also needs to be replaced, not only the certificate.

---

## 12. HTTPS Test on macOS

We ran:

    node tests/test-https.js

The test server crashes before any test runs:

    Error: error:0A00018F:SSL routines::ee key too small
      at exports.createSSLServer (tests/server.js:62:17)
      code: 'ERR_SSL_EE_KEY_TOO_SMALL'

This is not caused by the renewed certificates.

`tests/server.js` also loads `tests/ssl/test.key` and `tests/ssl/test.crt`:

- `test.key` is a 1024-bit RSA key.
- `test.crt` is signed with SHA-1.
- `test.crt` also expired on November 30, 2021.

OpenSSL 3.6.2 rejects 1024-bit keys and SHA-1 signatures by default. Prodip's 20/20 result on Windows (Node.js 22.19.0) suggests its bundled OpenSSL still accepts them.

To confirm the cause, the test was run once with a lower OpenSSL security level:

    node --tls-cipher-list='DEFAULT@SECLEVEL=0' tests/test-https.js

Result:

    # tests 20
    # pass  20

This is for diagnosis only. It is not a fix, because it weakens certificate checking.

---

## 13. Tunnel Test on macOS

We ran:

    node tests/test-tunnel.js

Result:

    ERR_SSL_CA_MD_TOO_WEAK

`localhost.crt` and `client.crt` are signed with SHA-1.

With the lower security level, the result is:

    # tests 26
    # pass  24
    # fail  2

The two failures are the "mutual https over http" tests. They fail with "socket hang up".

The cause is the client certificate used for mutual TLS:

    openssl verify -CAfile tests/ssl/ca/ca.crt tests/ssl/ca/client.crt

    error 10 at 0 depth lookup: certificate has expired

`client.crt` expired on November 21, 2021. It was not part of the renewal.

---

## 14. Other Affected Tests

Four more test files use the same HTTPS test server in `tests/server.js`, so they crash on macOS for the same reason as `test-https.js`:

| Test file | Default | Lower security level |
| --- | --- | --- |
| test-httpModule.js | crash | 50/50 |
| test-redirect.js | crash | 92/92 |
| test-redirect-complex.js | crash | 40/40 |
| test-redirect-auth.js | crash | 18/18 |

---

## 15. Suggested Fix

Regenerate the remaining test certificates with at least 2048-bit keys and SHA-256 signatures:

- `tests/ssl/ca/ca.key` (1024-bit), which means `ca.crt` and every certificate signed by it must be reissued
- `tests/ssl/ca/client.crt` (expired, SHA-1)
- `tests/ssl/ca/localhost.crt` (SHA-1)
- `tests/ssl/test.crt` / `tests/ssl/test.key` (expired, 1024-bit, SHA-1)

The existing scripts `gen-server.sh`, `gen-client.sh` and `gen-localhost.sh` can be reused. There is no script for the CA yet.

Do not lower the security level or disable certificate verification.

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

Note: this holds on Windows. On macOS with OpenSSL 3.6.2, the HTTPS tests still fail because of the 1024-bit CA key and other weak or expired test certificates. See sections 11 to 15.

---

# Current Status

**Status: HTTPS certificate maintenance completed and verified.**

Note: verified on Windows only. On macOS with OpenSSL 3.6.2, the HTTPS tests still fail because of the 1024-bit CA key and other weak or expired test certificates. See sections 11 to 15.

The certificate maintenance changes have been committed on the `prodip-investigation` branch.

Commit:

    defd8a6 Renew expired HTTPS test certificates

The working tree is clean after the commit.

The complete project test suite still needs to be verified after the certificate fix.

---

# Planned / Remaining Work

1. Run the complete test suite after the certificate fix.
2. Investigate any remaining test failures.
3. Check that the certificate fix does not introduce regressions.
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
# Complete Test Suite Findings

## Andreas's Initial Test Run

Andreas ran the complete test suite on Windows using Node.js 22.19.0
and npm 10.9.3. Dependencies were installed with:

    npm.cmd install --legacy-peer-deps

The command `npm.cmd run test-ci` reported:

    total ............................... 0/1
    not ok

This output did not identify the failing test file. Andreas therefore
ran the 55 test files individually. His initial results were:

- 52 test files passed, with 1,434 assertions and no assertion failures.
- Three test files failed: `test-form-data.js`, `test-tunnel.js`, and
  `test-unix.js`.

These are Andreas's initial results, not the final results after
Prodip's subsequent local certificate and test-fixture changes.

## Subsequent Local Verification

In a later local working state, before those changes were stashed,
Prodip recorded the following results:

- `test-https.js`: 20/20 passed.
- `test-tunnel.js`: 27/27 passed after renewing the tunnel certificates.
- `test-form-data.js`: 65/65 passed after the test-fixture change.
- Browser tests: 2/2 passed.
- Lint: passed.

These results were obtained with local changes that are currently
preserved in a Git stash. They must be rechecked after those changes
are restored to the integration branch before being treated as the
final verified state.

## Remaining Windows Test Limitations

- `test-unix.js` fails with `listen EACCES` on Windows before its
  assertions can run. This is a platform-specific limitation observed
  in the local environment.
- `npm.cmd run test-ci` does not provide useful individual test results
  in this Windows environment. Individual test files were therefore
  used for diagnosis.

The full-suite status must be updated after the certificate changes
are restored and the remaining tests are verified.
