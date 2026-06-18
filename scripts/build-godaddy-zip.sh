#!/usr/bin/env bash
# Build a GoDaddy Publish-style zip from Queens repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
OUT_DIR="${1:-$ROOT/dist}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/queens-stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$OUT_DIR"
ZIP="$OUT_DIR/queenscustoms-deploy-${SHA}.zip"
rm -f "$ZIP"

echo "Staging app tree (no .git, no node_modules, no data.db)..."
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'data.db' \
  --exclude '*.DS_Store' \
  "$ROOT/" "$STAGE/"

echo "Installing deps with npm ci (production bundle)..."
(cd "$STAGE" && npm ci --omit=dev 2>/dev/null || npm ci)

echo "Creating zip..."
(cd "$STAGE" && zip -r -q "$ZIP" . \
  -x "*.DS_Store" -x ".env" -x ".env*" -x "data.db")

SIZE="$(du -h "$ZIP" | cut -f1)"
echo "Created $ZIP ($SIZE)"
cp -f "$ZIP" "$OUT_DIR/queenscustoms-deploy.zip"
echo "Latest: $OUT_DIR/queenscustoms-deploy.zip"
