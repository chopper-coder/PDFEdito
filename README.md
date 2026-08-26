# GovPDF Editor Web V3.6.4｜Image Insert & Resize Edition

V3.6.4 以 V3.6.3.1 的安全與可靠度修正版為基礎，新增「插入圖片」功能，同時保留本機離線使用與 GitHub Pages 部署方式。

## V3.6.4 新增功能

- 新增 **🖼 插入圖片** 按鈕。
- 支援 PNG、JPG / JPEG、WebP。
- 圖片插入目前 PDF 頁面中央後，可直接用滑鼠拖曳移動。
- 選取圖片後，可拖右下角控制點調整大小。
- 圖片縮放預設維持原比例；按住 **Shift** 拖曳控制點可自由調整寬高。
- 圖片可使用既有的鎖定、圖層、複製 / 貼上、Delete、方向鍵微調功能。
- 圖片會納入復原 / 重做、自動儲存、GovPDF 專案與 PDF 匯出。
- 一般圖片採覆蓋層方式匯出，不會因為只插入圖片就破壞原 PDF 文字層。
- 圖片匯入時會移除來源圖片 Metadata，並限制檔案大小與最大解碼尺寸，降低大型圖片造成記憶體壓力的風險。

## 圖片安全限制

- 輸入圖片最大 30 MB。
- 處理後單張圖片最大 20 MB。
- 最大邊長 4096 px，最大約 1200 萬像素。
- 不接受 SVG 或其他可包含主動內容的圖片格式。
- GovPDF 專案會把圖片獨立存入 `images/`，不直接把大型 Base64 內容塞進 `project.json`。

## 原有主要功能

- PDF 拖曳開啟、合併、插入 PDF。
- 多頁連續瀏覽與大型 PDF 虛擬化。
- 新增 / 修改文字、色塊、浮水印。
- 永久塗銷與 Privacy Guard。
- 新增空白頁、頁面旋轉、刪除、重排、組織頁面。
- 統一加入頁碼。
- 自動儲存、Crash Recovery、`.govpdf` 專案。
- PDF 轉 Word。
- Metadata Privacy。
- 固定 PDF.js / pdf-lib / JSZip 版本與完整性驗證。

## Windows 本機使用

1. 解壓縮到新的資料夾。
2. 執行 `Start_GovPDF_Editor.bat`。
3. 啟動程式會驗證離線 PDF 核心；缺少或被修改時，才會重新下載固定版本並驗證。
4. 瀏覽器會開啟 `http://127.0.0.1:8765/?v=364`。

本機 Server 只綁定 `127.0.0.1:8765`。

## GitHub Pages

1. 將整個專案上傳到 GitHub Repository，包含 `.github/workflows/deploy-pages.yml`。
2. 到 `Settings → Pages`。
3. `Source` 選擇 **GitHub Actions**。
4. 到 `Actions` 等待 **Deploy GovPDF Editor Web V3.6.4** 完成。

GitHub Actions 會建立並驗證固定版本 PDF 核心後再部署 Pages。

## 安全提醒

一般白色、黑色與彩色色塊只是視覺遮罩，底層文字仍可能被搜尋或複製。敏感資料請使用 **🔒 永久塗銷**。

## 第三方套件

- PDF.js 6.2.108 — Apache License 2.0
- pdf-lib 1.17.1 — MIT License
- JSZip 3.10.1 — MIT License

詳細資料請參閱 `THIRD_PARTY_NOTICES.txt` 與 `CORE_INTEGRITY.txt`。

## 測試

專案內含：

- `tests/static_check.py`
- `tests/security_check.py`
- `tests/privacy_guard_check.py`
- `tests/final_hotfix_check.py`
- `tests/local_server_runtime_check.py`
- `tests/image_insert_check.py`

V3.6.4 發布前上述檢查均須通過。
