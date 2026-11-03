#!/usr/bin/env bash
#
# Build WhatsApp stickers from the SVG sources in assets/stickers/.
#
# Meta's requirements for a sticker message (Cloud API /messages, type=sticker):
#   - format:  WebP  (MIME image/webp)
#   - canvas:  512x512
#   - size:    <= 100 KB static  (<= 500 KB animated)
#   - alpha:   transparent background, so it sits on any chat wallpaper
#
# Everything here is free and runs locally — no Canva account, no uploading
# artwork to a third party.
#
# Renderer: ImageMagick's *internal* SVG renderer silently ignores transforms
# (rotate/translate), which quietly drops parts of a drawing instead of
# failing, so it is deliberately not used here. We use librsvg if it is
# installed and fall back to headless Chrome, which every dev machine with a
# browser already has.
#
#   brew install webp           # required (cwebp)
#   brew install librsvg        # optional, otherwise Chrome is used
#   ./scripts/build-stickers.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="assets/stickers"
OUT="public/stickers"
MAX_BYTES=$((100 * 1024))

command -v cwebp >/dev/null || { echo "need webp: brew install webp"; exit 1; }

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if command -v rsvg-convert >/dev/null; then
  RENDERER="rsvg"
elif [ -x "$CHROME" ]; then
  RENDERER="chrome"
else
  echo "no SVG renderer found. Install one: brew install librsvg" >&2
  exit 1
fi
echo "renderer: $RENDERER"

render() { # $1=svg  $2=png
  case "$RENDERER" in
    rsvg)
      rsvg-convert -w 512 -h 512 -b none "$1" -o "$2"
      ;;
    chrome)
      "$CHROME" --headless --disable-gpu --hide-scrollbars \
        --force-device-scale-factor=1 --default-background-color=00000000 \
        --window-size=512,512 --screenshot="$2" "file://$PWD/$1" >/dev/null 2>&1
      ;;
  esac
}

mkdir -p "$OUT"
shopt -s nullglob
built=0

for svg in "$SRC"/*.svg; do
  name="$(basename "$svg" .svg)"
  png="$(mktemp -t "sticker-$name").png"
  webp="$OUT/$name.webp"

  render "$svg" "$png"
  [ -s "$png" ] || { echo "FAIL $name: renderer produced nothing"; exit 1; }

  cwebp -quiet -q 90 -alpha_q 100 "$png" -o "$webp"

  bytes=$(wc -c < "$webp" | tr -d ' ')
  dims=$(magick identify -format '%wx%h' "$webp" 2>/dev/null || echo unknown)
  alpha=$(magick identify -format '%[channels]' "$webp" 2>/dev/null || echo unknown)
  rm -f "$png"

  [ "$dims" = "512x512" ] || { echo "FAIL $name: $dims, must be 512x512"; exit 1; }
  case "$alpha" in *a*) ;; *) echo "WARN $name: no alpha channel — sticker will show a box";; esac

  if [ "$bytes" -gt "$MAX_BYTES" ]; then
    echo "FAIL $name: ${bytes}B exceeds the 100KB static-sticker limit"; exit 1
  fi

  printf 'ok  %-12s %s  %3s KB  %s\n' "$name" "$dims" "$((bytes / 1024))" "$alpha"
  built=$((built + 1))
done

echo "built $built sticker(s) into $OUT/"
