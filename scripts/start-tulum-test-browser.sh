#!/usr/bin/env bash
set -euo pipefail

browser="${TULUM_TEST_BROWSER:-chromium}"
if ! command -v "$browser" >/dev/null 2>&1; then
  printf 'Browser executable not found: %s\n' "$browser" >&2
  exit 1
fi

# Keep this non-hidden so snap-confined Chromium can access the profile.
profile_dir="$HOME/tulum-test-browser-profile"
mkdir -p "$profile_dir"
chmod 700 "$profile_dir"

if curl -fsS http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
  printf 'A browser is already listening on 127.0.0.1:9222; close it before starting this profile.\n' >&2
  exit 1
fi

exec "$browser" \
  --user-data-dir="$profile_dir" \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check \
  http://localhost:8081/sign-in
