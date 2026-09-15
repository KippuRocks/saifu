#!/usr/bin/env bash
# Vendors @kippurocks/api — the types of the Kippu API's tRPC router, contract C5 (F-020,
# T-020-04) — and @kippurocks/sponsorship — the sponsor relay's client (F-023, T-023-07) —
# from a pinned kippu-api commit, as Ibento and ticketto-offchain vendor theirs.
#
#   tools/vendor-kippu-api.sh <commit>   build and pack the package at <commit> into
#                                        vendor/kippu-api/, and record the commit
#   tools/vendor-kippu-api.sh --check    rebuild at the recorded commit and fail if the
#                                        vendored package's contents differ
#
# Neither package is published to any registry. @kippurocks/api is declarations only, and
# declares @trpc/server as a peer dependency, which this repository installs at the same
# version. @kippurocks/sponsorship declares @ticketto/sdk and @ticketto/profile-v0 as peer
# dependencies, which resolve to this repository's vendored libticketto tarballs.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/vendor/kippu-api"
repository="https://github.com/KippuRocks/kippu-api.git"
packages=(api sponsorship)

mode=vendor
if [[ "${1:-}" == "--check" ]]; then
  mode=check
  commit=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).commit)' "$out/source.json")
elif [[ $# -eq 1 ]]; then
  commit=$1
  if [[ ! "$commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "pin a full 40-character commit hash" >&2
    exit 2
  fi
else
  echo "usage: $0 <commit> | --check" >&2
  exit 2
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

git init --quiet "$work/src"
git -C "$work/src" fetch --quiet --depth 1 "$repository" "$commit"
git -C "$work/src" checkout --quiet --detach FETCH_HEAD
resolved=$(git -C "$work/src" rev-parse HEAD)

(
  cd "$work/src"
  # The declarations are emitted from the server's router, so the whole workspace installs.
  pnpm install --frozen-lockfile >/dev/null
  for package in "${packages[@]}"; do
    pnpm --filter "@kippurocks/$package" build >/dev/null
  done
)

mkdir -p "$work/packed"
for package in "${packages[@]}"; do
  (cd "$work/src/packages/$package" && pnpm pack --pack-destination "$work/packed" >/dev/null)
done

if [[ "$mode" == check ]]; then
  status=0
  for tarball in "$work/packed"/*.tgz; do
    name=$(basename "$tarball")
    if [[ ! -f "$out/$name" ]]; then
      echo "missing vendored package $name" >&2
      status=1
      continue
    fi
    mkdir -p "$work/expected/$name" "$work/actual/$name"
    tar -xzf "$tarball" -C "$work/expected/$name"
    tar -xzf "$out/$name" -C "$work/actual/$name"
    # `pnpm pack` rewrites `workspace:*` ranges in no fixed key order, so manifests are
    # compared with their keys sorted; every other file byte for byte.
    for manifest in "$work/expected/$name/package/package.json" "$work/actual/$name/package/package.json"; do
      node -e '
        const fs = require("fs");
        const sort = (v) => Array.isArray(v) ? v.map(sort) : v && typeof v === "object"
          ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
        fs.writeFileSync(process.argv[1], JSON.stringify(sort(JSON.parse(fs.readFileSync(process.argv[1], "utf8"))), null, 2));
      ' "$manifest"
    done
    if ! diff -r "$work/expected/$name" "$work/actual/$name" >/dev/null; then
      echo "vendor/kippu-api/$name differs from kippu-api at $resolved" >&2
      status=1
    fi
  done
  [[ $status -eq 0 ]] && echo "vendor/kippu-api matches kippu-api at $resolved"
  exit $status
fi

rm -rf "$out"
mkdir -p "$out"
cp "$work/packed"/*.tgz "$out/"
node - "$out" "$resolved" "$repository" <<'NODE'
const { createHash } = require("node:crypto");
const { readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const [out, commit, repository] = process.argv.slice(2);
const packages = readdirSync(out)
  .filter((file) => file.endsWith(".tgz"))
  .sort()
  .map((file) => ({
    file,
    sha256: createHash("sha256").update(readFileSync(join(out, file))).digest("hex"),
  }));
writeFileSync(
  join(out, "source.json"),
  `${JSON.stringify({ repository, commit, packages }, null, 2)}\n`,
);
NODE
echo "vendored kippu-api at $resolved into vendor/kippu-api"
