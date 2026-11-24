# KKDrop

類似 Snapdrop 的區域網路檔案與訊息傳輸工具。後端使用 Express + Socket.IO，同一個區域網路內的裝置只要用瀏覽器打開頁面，就能互相傳送檔案與文字訊息。打包後的執行檔會常駐在 system tray，並提供 Ubuntu `.deb` 與 Windows 安裝程式。

## 功能

- 自動列出同網段已連線的裝置（名稱、OS）
- 裝置間傳送檔案與文字訊息
- 支援中文檔名
- 每次啟動時清空上傳暫存資料夾
- 打包版提供 system tray 圖示（選單只有 Exit），並在開機時自動啟動

## 環境需求

- Node.js 18 以上
- 打包使用 [`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg)，已列在 `devDependencies`，執行 `npm install` 就會一併安裝
- 打包 `.deb` 需要 `bash` 與 `dpkg-deb`
- 打包 Windows 安裝程式需要 NSIS（`makensis`），Windows 可用 `winget install NSIS.NSIS` 安裝（Ubuntu/Debian 為 `sudo apt install nsis`）

## 安裝與啟動

```bash
npm install
npm start          # or: npm run dev / node server.js
```

預設使用 port `3000`，可以用環境變數 `PORT` 更改：

```bash
PORT=8080 npm start
```

啟動後終端機會顯示存取網址：

- 本機：`http://localhost:3000`
- 區域網路：`http://<本機 IP>:3000`，其他裝置用這個網址連線

> 用 `npm start` / `npm run dev` 執行時不會顯示 tray 圖示，tray 只在 pkg 打包後的執行檔中啟用。

## 上傳檔案存放位置

| 執行方式 | 路徑 |
| --- | --- |
| 開發模式（`npm start`） | `./uploads/` |
| 打包版 Linux | `~/.local/share/kkdrop/uploads/` |
| 打包版 Windows | `%APPDATA%\KKDrop\uploads\` |

伺服器每次啟動都會清空這個資料夾，請不要把重要檔案留在裡面。

## 打包

所有輸出都放在 `dist/`。

| 指令 | 說明 |
| --- | --- |
| `npm run build_all` | 用 pkg 打包 Linux / Windows / macOS（x64）單一執行檔 |
| `npm run build_win` | 只打包 Windows x64 執行檔 |
| `npm run build_deb` | 打包 Ubuntu `.deb`（`dist/kkdrop_<version>_amd64.deb`） |
| `npm run build_win_installer` | 打包 Windows 安裝程式（`dist/KKDrop-Setup-<version>.exe`） |

### Ubuntu `.deb`

```bash
npm run build_deb
sudo apt install ./dist/kkdrop_1.0.0_amd64.deb
```

安裝後會出現在應用程式選單中，並透過 XDG autostart（`/etc/xdg/autostart/kkdrop.desktop`）在登入時自動啟動。

### Windows 安裝程式

需先安裝 NSIS（Windows 可執行 `winget install NSIS.NSIS`，腳本會自動搜尋 `PATH` 與預設安裝目錄）：

```bash
npm run build_win_installer
```

腳本使用 Node.js 執行，可在 Windows（CMD / PowerShell）、Linux 與 macOS 直接打包，不需 `bash`。

預設安裝到 `C:\Program Files\KKDrop`，並建立開始選單捷徑和「啟動」資料夾捷徑，登入時會自動啟動。可以從控制台或開始選單中的「Uninstall KKDrop」解除安裝。

## 專案結構

```
server.js        Express + Socket.IO server (peers, upload/download, messaging)
tray.js          System tray icon (only active in pkg builds)
public/          Front-end (index.html with UI, styles and client logic)
assets/          Icons for tray and installers (svg / png / ico)
debian/          .desktop entry for the .deb package
installer/       NSIS script for the Windows installer
scripts/         Build scripts and postinstall helper
dist/            Build output (not tracked)
```

## License

ISC
