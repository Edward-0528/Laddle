#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# check-no-emoji.sh
# Scans src/ and server/src/ for emoji characters and exits non-zero if any
# are found. Run manually via `npm run lint:emoji` or automatically via the
# pre-commit hook.
#
# Rule: No emoji in source code unless explicitly added via a tracked
# exception list (see EXCEPTIONS below). This keeps the UI professional and
# ensures copy/UX decisions go through a deliberate review, not an impulse.
# ---------------------------------------------------------------------------

set -euo pipefail

DIRS=("src" "server/src")
EXTENSIONS=("tsx" "ts" "css" "html")

# Emoji Unicode range pattern for grep (covers most common blocks)
# U+1F300–U+1FAFF  — Misc Symbols, Emoticons, Transport, etc.
# U+2600–U+27BF    — Misc Symbols, Dingbats
# U+FE00–U+FEFF    — Variation Selectors (often trail emoji)
EMOJI_PATTERN=$'[\U0001F300-\U0001FAFF\U00002600-\U000027BF]'

found=0

for dir in "${DIRS[@]}"; do
  if [ ! -d "$dir" ]; then continue; fi

  for ext in "${EXTENSIONS[@]}"; do
    while IFS= read -r -d '' file; do
      # grep -P with Perl regex for emoji detection
      if grep -Pn '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE00}-\x{FEFF}]' "$file" 2>/dev/null; then
        echo "  ^^^ Emoji found in: $file"
        found=1
      fi
    done < <(find "$dir" -name "*.$ext" -print0)
  done
done

if [ "$found" -ne 0 ]; then
  echo ""
  echo "----------------------------------------------------------------------"
  echo "  BLOCKED: Emoji detected in source files."
  echo "  PopPop! UI must remain emoji-free unless explicitly approved."
  echo "  Remove the emoji above or request an exception before committing."
  echo "----------------------------------------------------------------------"
  exit 1
fi

echo "  [emoji-check] No emoji found. "
exit 0
