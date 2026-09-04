#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
version="$(jq -r '.version' "$project_dir/manifest.json")"
archive="$project_dir/SubCopy-v${version}.zip"
stage_dir="$(mktemp -d /tmp/subcopy-release.XXXXXX)"

cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT

node --check "$project_dir/popup.js"
jq -e '.manifest_version == 3 and (.version | length > 0)' "$project_dir/manifest.json" >/dev/null

for locale_file in "$project_dir"/_locales/*/messages.json; do
  jq -e . "$locale_file" >/dev/null
done

cp "$project_dir/manifest.json" "$project_dir/popup.html" "$project_dir/popup.js" "$stage_dir/"
cp -R "$project_dir/icons" "$project_dir/_locales" "$stage_dir/"

rm -f "$archive"
(
  cd "$stage_dir"
  zip -q -r "$archive" manifest.json popup.html popup.js icons _locales
)

unzip -t "$archive" >/dev/null
printf 'Built %s\n' "$archive"
shasum -a 256 "$archive"
