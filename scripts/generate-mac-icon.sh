#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-build/icon.png}"
OUT="build/icon.icns"
ICONSET="build/icon.iconset"

if [[ ! -f "$SRC" ]]; then
  echo "Icon source not found: $SRC"
  echo "Place your PNG at build/icon.png (1024x1024 recommended)."
  exit 1
fi

rm -rf "$ICONSET"
mkdir -p "$ICONSET"

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$SRC" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" "$SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done

iconutil -c icns "$ICONSET" -o "$OUT"
rm -rf "$ICONSET"

cp "$SRC" public/icon.png

echo "Created $OUT"
echo "Synced public/icon.png"
