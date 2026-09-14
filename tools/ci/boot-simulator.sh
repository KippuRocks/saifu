#!/usr/bin/env bash
# Boots the newest available iPhone simulator and prints its UDID.
set -euo pipefail

udid=$(xcrun simctl list devices available --json | node -e '
  const { devices } = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const runtimes = Object.keys(devices).filter((r) => r.includes("iOS")).sort().reverse();
  for (const runtime of runtimes) {
    const phone = devices[runtime].find((d) => /^iPhone \d+( Pro)?$/.test(d.name));
    if (phone) { console.log(phone.udid); process.exit(0); }
  }
  process.exit(1);
')
xcrun simctl boot "$udid" >&2 || true
xcrun simctl bootstatus "$udid" -b >&2
echo "$udid"
