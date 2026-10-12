#!/bin/sh
set -ex

# Self-signed certificate used by tests/server.js (createSSLServer).
# Uses a 2048-bit key and SHA-256, which current OpenSSL accepts by default.
# Do not use this for tests/test-oauth.js, which uses oauth-rsa.key.

openssl req -x509 -newkey rsa:2048 -nodes -sha256 \
    -keyout test.key \
    -out test.crt \
    -days 3650 \
    -subj '/C=TH/ST=Bangkok/L=Silom/O=The Request Module/CN=request.example'
