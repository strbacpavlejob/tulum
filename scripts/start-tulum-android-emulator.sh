#!/usr/bin/env bash
set -euo pipefail

# Boots the Android emulator for Tulum app checks and forwards the emulator's
# localhost:8081 (Metro) and localhost:3001 (API) to this machine, so the
# app's default EXPO_PUBLIC_API_URL works unchanged. Safe to rerun: a running
# emulator is reused and only the port forwarding is redone.
# Extra arguments go to the emulator, e.g. -no-window for a headless run.

sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
adb="$sdk/platform-tools/adb"
emulator="$sdk/emulator/emulator"
avd="${TULUM_AVD:-Medium_Phone_API_36}"

for tool in "$adb" "$emulator"; do
  if [ ! -x "$tool" ]; then
    printf 'Not found: %s (set ANDROID_HOME to the Android SDK).\n' "$tool" >&2
    exit 1
  fi
done

running_emulator() {
  "$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" && !found { print $1; found = 1 }'
}

serial="$(running_emulator)"
if [ -z "$serial" ]; then
  if ! "$emulator" -list-avds | grep -Fx "$avd" >/dev/null; then
    printf 'AVD not found: %s. Available AVDs:\n' "$avd" >&2
    "$emulator" -list-avds >&2
    exit 1
  fi

  log="${TMPDIR:-/tmp}/tulum-emulator.log"
  setsid nohup "$emulator" -avd "$avd" "$@" >"$log" 2>&1 </dev/null &
  printf 'Starting %s (log: %s)\n' "$avd" "$log"

  deadline=$((SECONDS + 120))
  until serial="$(running_emulator)" && [ -n "$serial" ]; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      printf 'The emulator did not come up within 120 s; see %s\n' "$log" >&2
      exit 1
    fi
    sleep 2
  done
fi

deadline=$((SECONDS + 240))
until [ "$("$adb" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    printf '%s did not finish booting within 240 s.\n' "$serial" >&2
    exit 1
  fi
  sleep 2
done

for port in 8081 3001; do
  "$adb" -s "$serial" reverse "tcp:$port" "tcp:$port" >/dev/null
done

printf '%s is ready; its localhost:8081 and localhost:3001 reach this machine.\n' "$serial"
