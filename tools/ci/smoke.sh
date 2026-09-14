#!/usr/bin/env bash
# T-030-01: runs the Maestro smoke flow against an installed development build.
#
#   tools/ci/smoke.sh <android|ios>
#
# Expects the development build to be installed already on the one running
# emulator or booted simulator. Starts Metro, warms the bundle, forwards the port
# on Android, and runs .maestro/smoke.yaml. Logs and screenshots go to build/maestro-results/.
set -euo pipefail

platform=${1:?usage: smoke.sh <android|ios>}
root=$(cd "$(dirname "$0")/../.." && pwd)
results="$root/build/maestro-results"
mkdir -p "$results"
cd "$root"

port=8081
app_id=$(node -p 'const e = require("./app.json").expo; process.argv[1] === "ios" ? e.ios.bundleIdentifier : e.android.package' "$platform")
scheme=$(node -p 'require("./app.json").expo.scheme')

CI=1 pnpm exec expo start --dev-client --port "$port" >"$results/metro.log" 2>&1 &
metro=$!
trap 'kill "$metro" 2>/dev/null || true' EXIT

for _ in $(seq 1 120); do
  if curl -fsS "http://localhost:$port/status" 2>/dev/null | grep -q "packager-status:running"; then
    break
  fi
  sleep 1
done
curl -fsS "http://localhost:$port/status" | grep -q "packager-status:running" || {
  echo "Metro did not start" >&2
  cat "$results/metro.log" >&2
  exit 1
}

# Warm Metro's transform cache so the app's first request does not time out.
curl -fsS -o /dev/null --max-time 600 \
  "http://localhost:$port/index.bundle?platform=$platform&dev=true&minify=false" || true

if [[ "$platform" == android ]]; then
  adb reverse "tcp:$port" "tcp:$port"
fi

url="http://localhost:$port"
encoded=$(node -p 'encodeURIComponent(process.argv[1])' "$url")
# disableOnboarding and disableAutoLaunch keep the developer menu from covering
# the app on its first launch.
link="$scheme://expo-development-client/?url=$encoded&disableOnboarding=1&disableAutoLaunch=1"

echo "opening $link"
if [[ "$platform" == android ]]; then
  adb shell am start -W -a android.intent.action.VIEW -d "'$link'" "$app_id"
else
  xcrun simctl openurl booted "$link"
fi

capture() {
  if [[ "$platform" == android ]]; then
    adb exec-out screencap -p >"$results/screen.png" || true
    adb logcat -d >"$results/logcat.txt" || true
  else
    xcrun simctl io booted screenshot "$results/screen.png" || true
    xcrun simctl spawn booted log show --last 15m --style compact \
      --predicate 'process == "Saifu"' >"$results/simulator.log" 2>&1 || true
  fi
}

status=0
maestro test \
  --env "APP_ID=$app_id" \
  --debug-output "$results/debug" \
  --format junit --output "$results/report.xml" \
  .maestro/smoke.yaml || status=$?
if [[ $status -ne 0 ]]; then
  capture
  echo "--- metro.log (tail) ---" >&2
  tail -n 80 "$results/metro.log" >&2 || true
fi
exit $status
