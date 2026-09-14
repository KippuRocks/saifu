#!/usr/bin/env bash
# Installs a pinned Maestro CLI release, verified against its published checksum,
# into ~/.maestro and adds it to the GitHub Actions PATH.
set -euo pipefail

version="2.10.0"
sha256="29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsSL -o "$work/maestro.zip" \
  "https://github.com/mobile-dev-inc/maestro/releases/download/cli-$version/maestro.zip"
echo "$sha256  $work/maestro.zip" | shasum -a 256 -c -
rm -rf "$HOME/.maestro"
mkdir -p "$HOME/.maestro"
unzip -q "$work/maestro.zip" -d "$work"
mv "$work/maestro/"* "$HOME/.maestro/"
echo "$HOME/.maestro/bin" >> "${GITHUB_PATH:-/dev/null}"
"$HOME/.maestro/bin/maestro" --version
