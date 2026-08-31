# PDF Editor Web V3.7

**Modular Architecture & Maintainability Edition**

純前端 PDF 編輯工具，可直接部署到 GitHub Pages 使用。PDF 主要在使用者瀏覽器本機處理，不需要上傳到後端伺服器。

## 線上功能

- 拖入 PDF、連續頁面瀏覽
- 新增／移動文字
- 插入圖片並調整大小
- 一般色塊與永久塗銷
- 頁面新增、刪除、旋轉、排序、合併、插入 PDF
- 頁碼、浮水印
- 大型 PDF 效能最佳化
- PDF 壓縮輸出
- `.govpdf` 專案檔
- 匯出前 Privacy Guard 與 Metadata Privacy

> ⚠️ 一般白色／黑色／彩色色塊只是視覺遮罩，底層文字仍可能被搜尋或複製。敏感資料請使用「永久塗銷」。

## GitHub Pages 部署

1. 將本資料夾內的所有檔案上傳到 GitHub Repository 根目錄。
2. 確認有：`.github/workflows/deploy-pages.yml`。
3. 到 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
4. 到 **Actions** 等待 `Deploy PDF Editor Web V3.7` 的 `build` 與 `deploy` 都顯示綠色勾勾。
5. 開啟 GitHub Pages 網址即可使用。

本版本的 GitHub Actions 會自動：

- 下載固定版本 PDF.js 6.2.108、pdf-lib 1.17.1、JSZip 3.10.1
- 驗證固定 SHA-512
- 建立完整 `vendor/`
- 產生 SHA-256 manifest
- 部署 GitHub Pages

因此 **不需要手動上傳 `vendor/`**。

若 GitHub 網頁上傳時 `.github` 沒有出現，可使用根目錄的 `deploy-pages_workflow_backup.yml`，在 GitHub 手動建立：

`.github/workflows/deploy-pages.yml`

並把備份內容全部貼入。

## 主要安全設計

- Content Security Policy
- Stored XSS 防護
- 第三方套件 SHA-512 驗證
- GitHub Pages Privacy Mode
- Metadata Privacy Guard
- 真正永久塗銷輸出
- `.govpdf` 輸入驗證與限制
- GitHub Actions 使用固定 commit SHA

## 第三方套件

- PDF.js 6.2.108 — Apache License 2.0
- pdf-lib 1.17.1 — MIT License
- JSZip 3.10.1 — MIT License

詳見 `THIRD_PARTY_NOTICES.txt` 與 `CORE_INTEGRITY.txt`。
