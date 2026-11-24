# Repository Guidelines

## 專案結構與模組
- `server.js`：Express + Socket.IO 後端，維護用戶列表、上傳/下載與訊息轉送。上傳檔案在開發模式落在執行期建立的 `uploads/`（請勿提交）；打包執行檔則落在使用者家目錄下（見 `getUploadsDir()`）。  
- `tray.js`：System tray 圖示（只有 Exit 選單），只在 `process.pkg` 存在（即 pkg 打包後的執行檔）時啟用，`npm start`/`npm run dev` 不受影響。  
- `assets/`：tray 與安裝程式用的圖示（`icon.svg` 原始檔、`icon.png`、`icon.ico`）。  
- `public/`：前端資源；`index.html` 含 UI、樣式與客戶端邏輯。  
- `debian/`、`installer/`、`scripts/`：Ubuntu `.deb` 與 Windows 安裝程式的打包素材與建置腳本。  
- `dist/`：`pkg` / `.deb` / installer 打包輸出（不進版控）。  
- 根目錄：`package.json`、`package-lock.json`、`README.md`。

## 建置、測試與開發指令
- `npm start` / `npm run dev`：啟動本機伺服器（預設 3000），提供靜態檔與 Socket.IO 事件；不會顯示 tray 圖示。  
- `npm test`：目前為占位，會回傳錯誤；加入實際測試後再啟用。  
- `npm run build_deb`：打包 Ubuntu `.deb`（`scripts/build-deb.sh`），安裝後以 XDG autostart 開機自動啟動並常駐 tray。  
- `npm run build_win_installer`：打包 Windows 安裝程式（`scripts/build-win-installer.js` + `installer/kkdrop.nsi`），需要環境已安裝 NSIS（`makensis`）。

## 程式風格與命名慣例
- JavaScript/HTML/CSS 採 2 空格縮排。  
- 變數/函式用描述性 camelCase；真正常數才用 `SCREAMING_SNAKE_CASE`。  
- 事件名稱保持語意清晰（例：`updateDeviceInfo`、`sendMessage`），避免多義。  
- 註解簡短、點出原因或非直覺處；避免解釋顯而易見的程式碼。

## 測試指引
- 目前無測試套件；若新增，可放 `public/__tests__/` 或 `tests/`，並串到 `npm test`。  
- 測試名稱寫出行為（例：`clientList renders connected peers`），保持快速且可重現。

## Commit 與 Pull Request 指南
- Commit 訊息用祈使句（例：`Add device OS display`、`Normalize loopback IP`），單一變更聚焦。  
- PR 請包含：變更摘要、執行的測試、UI 變更的截圖/GIF，以及潛在破壞性說明；可連結相關 issue。

## 安全與設定提示
- 下載路徑已做 traversal 防護，修改時請維持檢查。  
- 不要將憑證/密鑰寫入版本庫；若需要設定請走環境變數。  
- 客戶端送出的 metadata（IP、裝置名稱/OS）需伺服端淨化並保持最小化。  
- 新增依賴請選用維護度高的套件，並透過 `package-lock.json` 鎖定版本。
