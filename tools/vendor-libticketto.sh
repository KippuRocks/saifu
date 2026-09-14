#!/usr/bin/env bash
# Vendors @ticketto/* packages from a pinned libticketto
# commit.
#
#   tools/vendor-libticketto.sh <commit>   build and pack the packages at <commit> into
#                                          vendor/libticketto/, and record the commit
#   tools/vendor-libticketto.sh --check    rebuild at the recorded commit and fail if the
#                                          vendored packages' contents differ
#
# The packages are not published to any registry, and this repository must build
# without access to kippu-docs. `pnpm pack` rewrites libticketto's `workspace:*`
# ranges to plain versions, and package.json resolves every name to its tarball.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/vendor/libticketto"
repository="https://github.com/KippuRocks/libticketto.git"
packages=(sdk profile-v0 binding-offchain ledger-rules log backend-memory)

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
  pnpm install --frozen-lockfile --filter "@ticketto/backend-memory..." --filter "@ticketto/binding-offchain..." >/dev/null
  for package in "${packages[@]}"; do
    pnpm --filter "@ticketto/$package" build >/dev/null
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
      echo "vendor/libticketto/$name differs from libticketto at $resolved" >&2
      status=1
    fi
  done
  [[ $status -eq 0 ]] && echo "vendor/libticketto matches libticketto at $resolved"
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
echo "vendored libticketto at $resolved into vendor/libticketto"
