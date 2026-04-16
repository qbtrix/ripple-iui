#!/usr/bin/env bash
# Ingest Ripple widget docs into kb-go for agent context injection.
# Re-runnable: clears the scope first, then ingests all articles.
# The compiled knowledge base lives IN the repo at .knowledge-base/
# and is symlinked to ~/.knowledge-base/ripple so kb-go can find it.
#
# Usage:
#   ./scripts/ingest-kb.sh                # uses default kb binary search
#   KB_BIN=/path/to/kb ./scripts/ingest-kb.sh  # explicit binary path

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$SCRIPT_DIR/.."
DOCS_DIR="$REPO_DIR/docs/kb"
REPO_KB_DIR="$REPO_DIR/.knowledge-base"
SCOPE="ripple"
SYSTEM_KB_DIR="$HOME/.knowledge-base/$SCOPE"

# Find kb binary: env var > workspace binary > PATH
if [ -n "${KB_BIN:-}" ]; then
  KB="$KB_BIN"
elif [ -f "$SCRIPT_DIR/../../kb-go/kb-darwin-arm64" ]; then
  KB="$SCRIPT_DIR/../../kb-go/kb-darwin-arm64"
elif command -v kb &>/dev/null; then
  KB="kb"
else
  echo "Error: kb binary not found. Set KB_BIN or add kb to PATH." >&2
  exit 1
fi

# Ensure the repo .knowledge-base dir exists
mkdir -p "$REPO_KB_DIR"

# Sets up the symlink: ~/.knowledge-base/ripple → repo/.knowledge-base/.
# Idempotent and safe to call multiple times. kb clear destroys the symlink
# (RemoveAll + MkdirAll), so we re-run this after the clear below.
setup_symlink() {
  if [ -L "$SYSTEM_KB_DIR" ]; then
    current_target="$(readlink "$SYSTEM_KB_DIR")"
    if [ "$current_target" != "$REPO_KB_DIR" ]; then
      echo "Updating symlink: $SYSTEM_KB_DIR → $REPO_KB_DIR"
      rm "$SYSTEM_KB_DIR"
      ln -s "$REPO_KB_DIR" "$SYSTEM_KB_DIR"
    fi
  elif [ -d "$SYSTEM_KB_DIR" ]; then
    # kb clear (or a first-time user) left a real directory — migrate + replace
    cp -r "$SYSTEM_KB_DIR"/* "$REPO_KB_DIR/" 2>/dev/null || true
    rm -rf "$SYSTEM_KB_DIR"
    ln -s "$REPO_KB_DIR" "$SYSTEM_KB_DIR"
  else
    mkdir -p "$(dirname "$SYSTEM_KB_DIR")"
    ln -s "$REPO_KB_DIR" "$SYSTEM_KB_DIR"
  fi
}

setup_symlink

echo "Using kb binary: $KB"
echo "Scope: $SCOPE"
echo "Docs dir: $DOCS_DIR"
echo "KB data: $REPO_KB_DIR (symlinked from $SYSTEM_KB_DIR)"
echo ""

# Clear existing articles for a clean rebuild. This RemoveAll's the symlink
# target and creates a real directory in its place, so we re-establish the
# symlink immediately after.
echo "Clearing existing $SCOPE scope..."
"$KB" clear --scope "$SCOPE" 2>/dev/null || true
setup_symlink
echo ""

# Ingest each markdown file
count=0
for doc in "$DOCS_DIR"/*.md; do
  filename="$(basename "$doc")"
  echo "Ingesting: $filename"
  "$KB" ingest "$doc" --scope "$SCOPE"
  count=$((count + 1))
  echo ""
done

echo "Done. Ingested $count articles into scope '$SCOPE'."
echo ""

# Show stats
echo "--- KB Stats ---"
"$KB" stats --scope "$SCOPE"
