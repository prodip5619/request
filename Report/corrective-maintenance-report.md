# Corrective Maintenance Report

> Snapshot note: This report records the repository and test results observed when the investigation was performed; it does not state a preparation date. The recorded tunnel result of 26/26 is historical and is not the current test count. The current test source includes a later assertion; use the latest verification recorded in `MAINTENANCE.md` for the current working-tree result.

## 1. Executive summary

I investigated the repository for a genuine, reproducible corrective-maintenance defect that remained after the earlier certificate and maintenance work. At the time of this report's investigation, inspection of the Git state, project history, maintenance notes, TLS tests, and certificate fixtures found no valid remaining corrective defect in the then-current branch.

The relevant HTTPS/TLS checks passed on the machine used for this investigation, and the certificate fixtures inspected then were valid and strong enough for that OpenSSL configuration. The inspected repository snapshot already contained the earlier fixes for the expired CA certificate and other weak test fixtures, and no additional runtime or TLS regression was reproducible in that investigation.

Because no valid defect remains, I did not make any implementation change. This is a report of the actual findings, not an invented corrective fix.

## 2. Investigation performed

I inspected the repository state and surrounding evidence at the time of the investigation before making any claim:

- Git status and branch history
- `MAINTENANCE.md`
- HTTPS/TLS test files under `tests/`
- certificate fixtures under `tests/ssl/` and `tests/ssl/ca/`
- OpenSSL and Node runtime versions used for the investigation

I specifically checked the inspected repository snapshot for the earlier certificate issues noted in project history, including the prior fixes for:

- expired CA/test certificates
- weak or duplicate certificate serial handling
- 1024-bit test key replacement

This was done to avoid claiming a defect that had already been fixed in the repository history.

## 3. Verified baseline evidence

### Node and OpenSSL versions

```text
v22.19.0
OpenSSL 3.6.1 27 Jan 2026 (Library: OpenSSL 3.6.1 27 Jan 2026)
```

### HTTPS/TLS baseline tests run

```bash
node tests/test-https.js
node tests/test-tunnel.js
```

Observed results:

```text
# tests 20
# pass  20
# ok
```

and

```text
# tests 26
# pass  26
# ok
```

These are the exact verified test results recorded for this report's snapshot.

### Certificate fixture verification

I verified the certificate and key metadata in the inspected snapshot with OpenSSL. Those fixtures were not expired and were at acceptable strength for the OpenSSL version used in the investigation:

- CA certificate: valid until October 2036
- CA key: 2048-bit RSA
- server certificate: valid until October 2036, 4096-bit key
- client certificate: valid until October 2036, 2048-bit key
- localhost certificate: valid until October 2036, 2048-bit key
- `tests/ssl/test.key`: 2048-bit RSA
- `tests/ssl/test.crt`: valid through October 2036

Examples from the actual verification output:

```text
notBefore=Oct 11 18:42:36 2026 GMT
notAfter=Oct  8 18:42:36 2036 GMT
Public-Key: (2048 bit)
```

```text
notBefore=Oct 12 00:18:13 2026 GMT
notAfter=Oct  9 00:18:13 2036 GMT
Public-Key: (4096 bit)
```

The inspection found that the snapshot did not exhibit the expired or weak certificate issues documented in earlier maintenance notes.

## 4. Repository history and status

The git history available in the inspected snapshot showed the relevant fixes already landed, including:

- `6fbcb56 Replace 1024-bit test.key used by the HTTPS test server`
- `dd288ba Fix duplicate serial numbers in certificate scripts`
- `defd8a6 Renew expired HTTPS test certificates`

The inspected branch also contained unrelated maintenance work already in progress (the Perfective Maintenance changes); the report did not alter those files.

## 5. Finding

No genuine corrective-maintenance defect was found in the inspected repository snapshot.

The actual measured evidence is:

- the HTTPS and tunnel tests passed in the environment used for the investigation,
- the certificate fixtures are valid and strong,
- earlier defects already identified in the project history have been fixed,
- there is no reproducible remaining runtime or certificate defect to correct without inventing a new issue.

## 6. Decision

I did not modify implementation files because no valid corrective defect was found in the inspected snapshot.

The corrective-maintenance task is therefore closed with a finding of "no remaining defect found."

## 7. Final review status

Status: no valid corrective maintenance defect was found in the repository snapshot inspected for this report.

This report is based only on verified repository evidence and runtime checks, and no code change was made.
