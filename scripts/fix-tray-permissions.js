// npm does not always preserve the executable bit on binaries shipped inside
// tarballs, and systray2's own '+x' chmod call is a no-op on Node's fs.chmod
// (which only accepts numeric modes). Without this, the bundled tray helper
// binaries fail to spawn (EACCES) after a fresh install.
const fs = require('fs');
const path = require('path');

const trayBinDir = path.join(__dirname, '..', 'node_modules', 'systray2', 'traybin');
const bins = ['tray_linux_release', 'tray_darwin_release', 'tray_windows_release.exe'];

for (const bin of bins) {
    const binPath = path.join(trayBinDir, bin);
    if (fs.existsSync(binPath)) {
        fs.chmodSync(binPath, 0o755);
    }
}
