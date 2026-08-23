# GovPDF Editor Web V3.6.3.1｜GitHub Upload Ready Edition

這個資料夾是 **GitHub Pages 專用上傳版**。

## 部署方式

1. 建立或開啟 GitHub Repository。
2. 將本資料夾內的檔案上傳到 Repository 根目錄。
3. **一定要包含 `.github/workflows/deploy-pages.yml`**。
4. GitHub → Settings → Pages → Source 選 **GitHub Actions**。
5. GitHub → Actions，等待 `Deploy GovPDF Editor Web V3.6.3.1` 顯示綠色勾勾。
6. 回到 Settings → Pages 開啟網站網址。

## 如果 `.github` 資料夾無法上傳

根目錄另附 `deploy-pages_workflow_backup.yml`。

在 GitHub Repository：

1. Add file → Create new file。
2. 檔名輸入 `.github/workflows/deploy-pages.yml`。
3. 複製 `deploy-pages_workflow_backup.yml` 的全部內容貼入。
4. Commit changes。
5. 到 Actions 等待部署。

## 重要

- Pages Source 請選 **GitHub Actions**，不要選 Deploy from a branch。
- Workflow 會在 GitHub 建置階段下載固定版本 PDF.js 6.2.108 / pdf-lib 1.17.1 / JSZip 3.10.1，並以寫死的 SHA-512 驗證後才部署。
- 官方 GitHub Actions 也已固定到完整 commit SHA。
- 執行期不使用外部 CDN；Pages 成品會包含已驗證的 `vendor/`。
- GitHub Pages 執行時會啟用 Privacy Mode，不持久保存來源 PDF bytes 到 IndexedDB。
- PDF 的實際編輯仍在瀏覽器本機執行，不會把使用者 PDF 上傳到 GitHub。
