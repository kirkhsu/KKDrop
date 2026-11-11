const path = require('path');
const { spawn } = require('child_process');

function isPackaged() {
    return !!process.pkg;
}

function openInBrowser(url) {
    let command;
    let args;
    if (process.platform === 'win32') {
        command = 'cmd';
        args = ['/c', 'start', '""', url];
    } else if (process.platform === 'darwin') {
        command = 'open';
        args = [url];
    } else {
        command = 'xdg-open';
        args = [url];
    }
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', (err) => {
        console.error('Failed to open browser:', err.message);
    });
    child.unref();
}

// The tray helper is a spawned subprocess outside our control (missing display,
// missing appindicator lib, a stripped executable bit after install, ...).
// Its failures surface as async 'error' events on the child process; if that
// event fires after the ready() promise already settled, Node treats it as an
// unhandled exception and would otherwise take the whole file-drop server down.
// Guard narrowly: only swallow crashes whose failing path is one of the tray
// helper binaries, let everything else crash normally.
function guardTraySubprocessCrashes() {
    process.on('uncaughtException', (err) => {
        const failedBin = err && err.path ? path.basename(err.path) : '';
        if (failedBin.startsWith('tray_')) {
            console.error('Tray subprocess error, continuing without tray:', err.message);
            return;
        }
        throw err;
    });
}

function initTray(url, onExit) {
    if (!isPackaged()) {
        return null;
    }

    let SysTray;
    try {
        SysTray = require('systray2').default;
    } catch (err) {
        console.error('Systray module unavailable:', err.message);
        return null;
    }

    guardTraySubprocessCrashes();

    const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

    const itemOpen = {
        title: 'Open in Browser',
        tooltip: 'Open in Browser',
        checked: false,
        enabled: true,
        click: () => {
            openInBrowser(url);
        }
    };

    const itemExit = {
        title: 'Exit',
        tooltip: 'Exit',
        checked: false,
        enabled: true,
        click: () => {
            systray.kill(false);
            onExit();
        }
    };

    const systray = new SysTray({
        menu: {
            icon: iconPath,
            isTemplateIcon: process.platform === 'darwin',
            title: 'KKDrop',
            tooltip: 'KKDrop',
            items: [itemOpen, SysTray.separator, itemExit]
        },
        debug: false,
        copyDir: true
    });

    systray.onClick(action => {
        if (action.item.click != null) {
            action.item.click();
        }
    });

    systray.ready().catch(err => {
        console.error('Tray failed to start:', err.message);
    });

    return systray;
}

module.exports = { initTray, isPackaged };
