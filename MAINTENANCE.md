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