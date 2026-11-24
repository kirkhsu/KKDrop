// Build a Windows installer for KKDrop using pkg + NSIS.
// Installs to Program Files, adds a Start Menu entry, and autostarts on
// login via a shortcut in the (all-users) Startup folder — the tray's only
// menu action is Exit.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

function findMakensis() {
  const versionFlag = isWin ? '/VERSION' : '-VERSION';
  const candidates = ['makensis'];

  // NSIS on Windows does not always add itself to PATH after installation.
  if (isWin) {
    const dirs = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(Boolean);
    for (const dir of dirs) {
      candidates.push(path.join(dir, 'NSIS', 'makensis.exe'));
    }
  }

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
      continue;
    }
    const probe = spawnSync(candidate, [versionFlag], { stdio: 'ignore' });
    if (!probe.error && probe.status === 0) {
      return candidate;
    }
  }

  return null;
}

function resolvePkgBin() {
  const pkgJsonPath = require.resolve('@yao-pkg/pkg/package.json', { paths: [rootDir] });
  const pkgJson = require(pkgJsonPath);
  const binRel = typeof pkgJson.bin === 'string' ? pkgJson.bin : pkgJson.bin.pkg;
  return path.resolve(path.dirname(pkgJsonPath), binRel);
}

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`error: failed to run "${command}": ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const makensis = findMakensis();
if (!makensis) {
  console.error(
    'error: makensis (NSIS) not found. Install NSIS (e.g. "winget install NSIS.NSIS" on Windows or "sudo apt install nsis" on Ubuntu/Debian), or run this on a machine/CI that has it.'
  );
  process.exit(1);
}

const { version } = require(path.join(rootDir, 'package.json'));
const winBuildDir = path.join(rootDir, 'build', 'win');
const distDir = path.join(rootDir, 'dist');
const exePath = path.join(winBuildDir, 'KKDrop.exe');
const iconPath = path.join(rootDir, 'assets', 'icon.ico');
const outFile = path.join(distDir, `KKDrop-Setup-${version}.exe`);
const nsiScript = path.join(rootDir, 'installer', 'kkdrop.nsi');

fs.rmSync(winBuildDir, { recursive: true, force: true });
fs.mkdirSync(winBuildDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

console.log('==> Building Windows binary with pkg');
runOrExit(process.execPath, [
  resolvePkgBin(),
  'server.js',
  '-t',
  'node*-win-x64',
  '-c',
  'package.json',
  '-o',
  exePath,
]);

console.log('==> Building installer with makensis');
const optPrefix = isWin ? '/' : '-';
runOrExit(makensis, [
  `${optPrefix}INPUTCHARSET`,
  'UTF8',
  `${optPrefix}DAPP_VERSION=${version}`,
  `${optPrefix}DAPP_EXE=${exePath}`,
  `${optPrefix}DAPP_ICON=${iconPath}`,
  `${optPrefix}DOUT_FILE=${outFile}`,
  nsiScript,
]);

console.log(`==> Done: ${outFile}`);
