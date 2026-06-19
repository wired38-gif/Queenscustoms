#!/usr/bin/env bash
# Build a GoDaddy Publish-style zip from Queens repo root.
# Explicit file list (not zip -r .) + production node_modules — target ~60-80 MB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
OUT_DIR="${1:-$ROOT/dist}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/queens-stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$OUT_DIR"
ZIP="$OUT_DIR/queenscustoms-deploy-${SHA}.zip"
rm -f "$ZIP"

echo "Staging runtime tree (no .git, node_modules, data.db, dist)..."
mkdir -p "$STAGE"

# Copy only files needed to run node server.js + static site
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'data.db' \
  --exclude '*.DS_Store' \
  --exclude 'amazon-storefront.mp4' \
  "$ROOT/package.json" \
  "$ROOT/package-lock.json" \
  "$ROOT/server.js" \
  "$ROOT/db.js" \
  "$ROOT/notify.js" \
  "$ROOT/auth.js" \
  "$ROOT/index.html" \
  "$ROOT/style.css" \
  "$ROOT/app.js" \
  "$ROOT/builder.js" \
  "$ROOT/checkout.js" \
  "$ROOT/music.js" \
  "$ROOT/tiktok.js" \
  "$ROOT/order-cancel.html" \
  "$ROOT/order-success.html" \
  "$ROOT/robots.txt" \
  "$ROOT/sitemap.xml" \
  "$ROOT/.godaddy" \
  "$ROOT/.node-version" \
  "$ROOT/.npmrc" \
  "$STAGE/"

rsync -a --exclude '*.DS_Store' "$ROOT/admin/" "$STAGE/admin/"
rsync -a --exclude '*.DS_Store' "$ROOT/shop/" "$STAGE/shop/"
rsync -a \
  --exclude '*.DS_Store' \
  --exclude 'amazon-storefront.mp4' \
  --exclude 'hero-video-hq.mp4' \
  "$ROOT/assets/" "$STAGE/assets/"

# Use smaller hero clip as hq source (saves ~10 MB; poster + hero-video.mp4 still present)
if [[ -f "$STAGE/assets/hero-video.mp4" ]]; then
  cp -f "$STAGE/assets/hero-video.mp4" "$STAGE/assets/hero-video-hq.mp4"
fi

echo "Installing deps with npm ci --omit=dev..."
(cd "$STAGE" && npm ci --omit=dev 2>/dev/null || npm ci --omit=dev)

echo "Pruning node_modules bloat (docs, tests, maps, types)..."
find "$STAGE/node_modules" -type f \( \
  -name '*.md' -o -name '*.markdown' -o -name '*.map' -o \
  -name '*.ts' -o -name '*.tsx' -o -name '*.flow' \
\) -delete 2>/dev/null || true
find "$STAGE/node_modules" -type d \( \
  -name test -o -name tests -o -name __tests__ -o \
  -name docs -o -name example -o -name examples \
\) -prune -exec rm -rf {} + 2>/dev/null || true

echo "Creating zip (explicit file list, target ~60-80 MB)..."
(cd "$STAGE" && zip -r -q "$ZIP" \
  package.json package-lock.json server.js db.js notify.js auth.js \
  index.html style.css app.js builder.js checkout.js music.js tiktok.js \
  order-cancel.html order-success.html robots.txt sitemap.xml \
  .godaddy .node-version .npmrc \
  admin/ shop/ assets/ node_modules/ \
  -x "*.DS_Store" -x "assets/amazon-storefront.mp4")

SIZE="$(du -h "$ZIP" | cut -f1)"
BYTES="$(wc -c < "$ZIP" | tr -d ' ')"
MB="$(echo "scale=1; $BYTES / 1048576" | bc)"
echo "Created $ZIP ($SIZE, ${MB} MB)"
cp -f "$ZIP" "$OUT_DIR/queenscustoms-deploy.zip"
echo "Latest: $OUT_DIR/queenscustoms-deploy.zip"
