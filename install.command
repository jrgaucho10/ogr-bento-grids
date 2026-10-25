#!/bin/bash
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
DEST="$DEST_DIR/com.ogr.bentogrids"

say()  { printf '%s\n' "$*"; }
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }

say "OGR Bento Grids installer"
say "  source: $SRC"
say "  target: $DEST"
say ""

[ -f "$SRC/CSXS/manifest.xml" ] || fail "CSXS/manifest.xml not found."
[ -f "$SRC/client/index.html" ]  || fail "client/index.html not found."

mkdir -p "$DEST_DIR"

if [ -L "$DEST" ]; then
  rm "$DEST"
elif [ -e "$DEST" ]; then
  BACKUP="$DEST.backup.$(date +%Y%m%d-%H%M%S)"
  mv "$DEST" "$BACKUP"
  say "Moved existing folder to: $BACKUP"
fi

ln -s "$SRC" "$DEST"
say "Linked extension."

for v in 9 10 11 12 13; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null || true
done
say "Enabled CEP PlayerDebugMode (CSXS 9–13)."

for v in 11 12 13; do
  defaults write "com.adobe.CSXS.$v" LogLevel 6 2>/dev/null || true
done
say "Set CEP LogLevel to 6 (all)."

say ""
say "Done. Restart Illustrator, then open:"
say "  Window > Extensions > OGR Bento Grids"
