# Current Evidence Rerun Summary

This report documents tests run on **October 22, 2026**. These results describe
the current rerun only; they do not establish what happened in earlier project
work.

## Run context

- Repository: `prodip5619/request`
- Branch: `prodip-integrate-andreas`
- Commit: `96ee9b4a0a11edd8efa35abbedec4576e3a54d57`
- OS: Windows 11 Home Single Language, build 26200
- Node.js: `v22.19.0`
- npm: `10.9.3`
- Browser runner: Karma with PhantomJS `2.1.1` (headless)
- Bash: GNU Bash `5.2.21(1)-release` via Windows `bash.exe`
- Browser TLS setting: `--ignore-ssl-errors=false`
- Time zone: Central European Summer Time (`+02:00`)

## Browser TLS results

The repository's regular browser test covers trusted CA plus the `localhost`
certificate name. It does not include negative trust or hostname cases.
The regular run completed at **2026-10-22 00:51:38 +02:00**.

| Scenario | Actual test and evidence | Result |
| --- | --- | --- |
| Trusted CA, correct hostname | `npm.cmd run test-browser`; PhantomJS ran the existing `succeeds on valid URLs (with https and CORS)` test. 2 total assertions passed, including the HTTPS response status assertion. | **PASS**, exit 0 |
| Untrusted CA | `node evidence-rerun-browser-tls.js`; temporary test/config used `tests/browser/ssl/server.crt` as the unrelated trust file and connected to `https://localhost:<ephemeral-port>`. TLS validation remained enabled. 2/2 assertions passed: request rejected and no response. Browser error text: `XHR error`. | **PASS** (expected rejection), exit 0 |
| Incorrect hostname | Same helper and verification setting, with the intended `ca.crt` and URL `https://127.0.0.1:<ephemeral-port>`. 2/2 assertions passed: request rejected and no response. Browser error text: `XHR error`. | **PASS** (expected rejection), exit 0 |

The helper started at **00:55:11 +02:00**; the two scenario runs began at
00:55:11 and 00:55:23, respectively. Fixture checks confirmed the server
certificate verifies with the intended CA, has `DNS:localhost` as its SAN,
matches `localhost`, and does not match `127.0.0.1`. PhantomJS reports a generic
`XHR error`; it does not expose a more specific certificate error string to the
test callback.

Commands to reproduce from the repository root:

```powershell
npm.cmd run test-browser
node evidence-rerun-browser-tls.js
```

The negative-case helper creates a uniquely named temporary Tape test under
`tests/browser/` plus a temporary Karma config in the OS temp directory. It
removes both after execution and does not edit existing tests, production
code, or certificate fixtures.

## Shell-script portability results

Run at **2026-10-22 00:50:41–00:50:52 +02:00**:

```powershell
node tests/test-shell-scripts.js
```

**PASS**, exit 0: 12 checks passed, 0 failed. The test checked six listed shell
scripts for carriage returns and ran `bash -n` on each. No checks were skipped.
The repository policy is `*.sh text eol=lf` in `.gitattributes`; the CA README
also documents the LF requirement. Certificate-generation scripts were not
executed.

## Limitations and worktree notes

- PhantomJS is headless; no graphical browser result page was available. Use a
  terminal screenshot for the test output.
- The negative-case callback exposes only `XHR error`, so the specific
  rejection cause is supported by the controlled CA/hostname changes and the
  certificate fixture checks rather than a detailed browser error code.
- Two initial temporary harness attempts failed before running assertions
  because of harness configuration/path issues. The corrected helper was run
  successfully as recorded above; those setup attempts were not TLS test
  failures.
- No certificate-generation command was run.
- The pre-existing untracked file
  `tests/ssl/ca/server.crt.pre-maintenance-backup` was left untouched. The
  temporary negative-case test/config files were removed.

## Screenshot filenames

Suggested filenames:

- `browser-tls-trusted-ca.png`
- `browser-tls-untrusted-ca.png`
- `browser-tls-wrong-hostname.png`
- `shell-script-portability.png`
- Optional: `shell-script-policy-and-test.png`
