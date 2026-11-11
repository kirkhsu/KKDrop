#!/usr/bin/env bash
# Build a Windows installer for KKDrop using pkg + NSIS.
# Installs to Program Files, adds a Start Menu entry, and autostarts on
# login via a shortcut in the (all-users) Startup folder — the tray's only
# menu action is Exit.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v makensis >/dev/null 2>&1; then
    echo "error: makensis (NSIS) not found. Install NSIS, or run this on a machine/CI that has it." >&2
    exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
WIN_BUILD_DIR="$ROOT_DIR/build/win"
DIST_DIR="$ROOT_DIR/dist"

rm -rf "$WIN_BUILD_DIR"
mkdir -p "$WIN_BUILD_DIR" "$DIST_DIR"

echo "==> Building Windows binary with pkg"
npx pkg server.js -t node18-win-x64 -c package.json -o "$WIN_BUILD_DIR/KKDrop.exe"

OUT_FILE="$DIST_DIR/KKDrop-Setup-$VERSION.exe"

echo "==> Building installer with makensis"
makensis \
    "-DAPP_VERSION=$VERSION" \
    "-DAPP_EXE=$WIN_BUILD_DIR/KKDrop.exe" \
    "-DAPP_ICON=$ROOT_DIR/assets/icon.ico" \
    "-DOUT_FILE=$OUT_FILE" \
    installer/kkdrop.nsi

echo "==> Done: $OUT_FILE"
