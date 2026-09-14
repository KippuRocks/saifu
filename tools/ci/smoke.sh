#!/usr/bin/env bash
# T-030-01: runs the Maestro smoke flow against an installed development build.
#
#   tools/ci/smoke.sh <android|ios>
#
# Expects the development build to be installed already on the one running
# emulator or booted simulator. Starts Metro, warms the bundle, forwards the port
# on Android, and runs .maestro/smoke.yaml. Logs go to .maestro-results/.
set -euo pipefail

platform=${1:?usage: smoke.sh <android|ios>}
root=$(cd "$(dirname "$0")/../.." && pwd)
results="$root/.maestro-results"
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

maestro test \
  --env "APP_ID=$app_id" \
  --env "DEV_CLIENT_URL=$scheme://expo-development-client/?url=$encoded" \
  --debug-output "$results/debug" \
  --format junit --output "$results/report.xml" \
  .maestro/smoke.yaml
