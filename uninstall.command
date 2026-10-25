#!/bin/bash
set -euo pipefail
DEST_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
TARGET="$DEST_DIR/com.ogr.bentogrids"
if [ -L "$TARGET" ] || [ -e "$TARGET" ]; then
  rm -rf "$TARGET"
  echo "Removed com.ogr.bentogrids."
else
  echo "OGR Bento Grids is not installed in CEP."
fi
for v in 9 10 11 12 13; do
  defaults delete "com.adobe.CSXS.$v" PlayerDebugMode 2>/dev/null || true
done
echo "Disabled CEP PlayerDebugMode (CSXS 9–13)."
echo "Restart Illustrator to finish."
