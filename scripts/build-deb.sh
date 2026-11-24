#!/usr/bin/env bash
# Build a .deb package for KKDrop (Ubuntu/Debian, amd64).
# Installs as a desktop app that autostarts (XDG autostart) with a system
# tray icon; the tray's only menu action is Exit.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./package.json').version")"
ARCH="amd64"
PKG_NAME="kkdrop"
STAGE_DIR="$ROOT_DIR/build/deb"
DIST_DIR="$ROOT_DIR/dist"

rm -rf "$STAGE_DIR"
mkdir -p \
    "$STAGE_DIR/DEBIAN" \
    "$STAGE_DIR/usr/bin" \
    "$STAGE_DIR/usr/share/applications" \
    "$STAGE_DIR/etc/xdg/autostart" \
    "$STAGE_DIR/usr/share/icons/hicolor/256x256/apps"

echo "==> Building Linux binary with pkg"
npx pkg server.js -t node*-linux-x64 -c package.json -o "$STAGE_DIR/usr/bin/kkdrop"

echo "==> Staging desktop files and icon"
cp debian/kkdrop.desktop "$STAGE_DIR/usr/share/applications/kkdrop.desktop"
cp debian/kkdrop.desktop "$STAGE_DIR/etc/xdg/autostart/kkdrop.desktop"
cp assets/icon.png "$STAGE_DIR/usr/share/icons/hicolor/256x256/apps/kkdrop.png"

cat > "$STAGE_DIR/DEBIAN/control" <<EOF
Package: $PKG_NAME
Version: $VERSION
Section: net
Priority: optional
Architecture: $ARCH
Depends: libayatana-appindicator3-1 | libappindicator3-1
Maintainer: KKDrop
Description: Local network file drop server with a system tray icon
 KKDrop runs a small local web server (Express + Socket.IO) so devices on
 the same network can drag-and-drop files to each other through the
 browser. It autostarts on login and stays in the system tray; use the
 tray's Exit item to stop it.
EOF

echo "==> Fixing permissions"
find "$STAGE_DIR" -type d -exec chmod 755 {} \;
find "$STAGE_DIR" -type f -exec chmod 644 {} \;
chmod 755 "$STAGE_DIR/usr/bin/kkdrop"

echo "==> Building .deb"
mkdir -p "$DIST_DIR"
DEB_FILE="$DIST_DIR/${PKG_NAME}_${VERSION}_${ARCH}.deb"
dpkg-deb --build --root-owner-group "$STAGE_DIR" "$DEB_FILE"

echo "==> Done: $DEB_FILE"
