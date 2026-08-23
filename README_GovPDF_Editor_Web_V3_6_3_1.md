# 🌸 GovPDF Editor Web

**GovPDF Editor Web V3.6.3.1｜Security & Reliability Final Hotfix**

一套可直接在瀏覽器中使用的 PDF 編輯工具，支援 **Windows 本機使用** 與 **GitHub Pages 網頁使用**。

> PDF 文件主要在使用者瀏覽器本機處理，不需要將 PDF 上傳到後端伺服器。

---

## 🌐 線上版本

GitHub Pages：

**https://chopper-coder.github.io/PDFEditor/**

> 若網站剛更新但仍看到舊版，可使用 `Ctrl + F5` 強制重新整理。

---

## ✨ 主要功能

### PDF 瀏覽與頁面操作

- PDF 拖曳匯入
- 多頁 PDF 連續顯示
- 滑鼠滾輪上下瀏覽全部頁面
- 放大／縮小
- 放大後拖曳頁面
- 快速跳頁
- 頁面左轉／右轉
- 刪除頁面
- 新增空白頁
- 插入其他 PDF
- 合併 PDF
- 組織頁面
- 多頁選取與批次旋轉／刪除／複製
- 頁面重新排序

### 文字工具

- 新增文字
- 修改文字內容
- 文字拖曳移動
- 字型、字級、顏色
- 粗體／斜體／底線
- 左對齊／置中／右對齊
- 鍵盤方向鍵微調位置

### 色塊與遮罩

- 白色色塊
- 彩色色塊
- 色塊拖曳移動
- 色塊尺寸調整
- 圖層順序
- 物件鎖定
- 多物件選取與移動

> ⚠️ **一般色塊只是視覺遮罩。**  
> 被遮住的原始 PDF 文字仍可能被搜尋、複製或文字擷取工具讀取。  
> 若內容包含姓名、電話、身分證字號或其他敏感資料，請使用 **🔒 永久塗銷**。

### 🔒 永久塗銷

「永久塗銷」和一般黑色／白色色塊不同。

永久塗銷頁面在匯出時會進行安全處理，使被處理區域底下的原始文字不再保留於可搜尋文字層。

適合：

- 個人資料
- 身分證字號
- 電話
- 地址
- 案件敏感資訊
- 不宜公開之公文內容

### 頁碼

可統一替整份 PDF 加入頁碼。

支援：

- 底部置中
- 左下
- 右下
- 奇數頁右下／偶數頁左下
- 自訂起始頁
- 自訂起始編號
- 自訂字級及邊距

頁碼格式包含：

- `1`
- `1 / 100`
- `- 1 -`
- `Page 1`
- `第 1 頁，共 100 頁`
- 羅馬數字頁碼

新增、刪除或重新排序頁面後，頁碼會依目前文件順序重新計算。

### 浮水印

可加入：

- 自訂文字
- 顏色
- 字級
- 透明度
- 旋轉角度
- 套用目前頁
- 套用全部頁

### 專案與復原

支援：

- 自動儲存
- 意外關閉後復原
- 復原／重做
- `.govpdf` 專案檔
- 儲存目前編輯狀態
- 下次重新開啟後繼續編輯

GitHub Pages 版本會採用較嚴格的隱私策略，避免將來源 PDF 長期持久化於共享 origin 的瀏覽器儲存空間。

### 大型 PDF

針對大量頁面文件進行效能最佳化：

- 大型 PDF 模式
- 延遲渲染
- Canvas 自動釋放
- 快速滾動降載
- 附近頁面才進行高解析度渲染
- 組織頁面縮圖延遲建立
- DOM 虛擬化
- 匯出進度
- 可取消匯出

適合 100 頁以上的 PDF 文件使用。

---

# 🖥️ Windows 本機使用

## 第一次啟動

解壓縮完整專案後，執行：

```text
Start_GovPDF_Editor.bat
```

程式會先檢查離線 PDF 核心。

如果尚未準備核心，系統會自動下載固定版本：

- PDF.js 6.2.108
- pdf-lib 1.17.1
- JSZip 3.10.1

下載完成後會進行：

- SHA-512 套件驗證
- SHA-256 本機檔案清單驗證
- 必要 PDF.js 資源檢查

驗證完成後啟動：

```text
http://127.0.0.1:8765/
```

之後只需要再次執行：

```text
Start_GovPDF_Editor.bat
```

即可使用。

> 本機 Server 僅綁定 `127.0.0.1`，不對區域網路或 Internet 開放。

---

# ☁️ GitHub Pages 部署

本專案使用 **GitHub Actions** 建置完整 PDF 核心後部署。

## 1. 上傳檔案

將專案內容上傳至 GitHub Repository。

請確認包含：

```text
.github/
└── workflows/
    └── deploy-pages.yml
```

若網頁上傳時 `.github` 沒有成功上傳，可使用：

```text
deploy-pages_workflow_backup.yml
```

在 GitHub 手動建立：

```text
.github/workflows/deploy-pages.yml
```

## 2. 啟用 GitHub Pages

進入：

```text
Settings
→ Pages
→ Build and deployment
→ Source
→ GitHub Actions
```

不要使用：

```text
Deploy from a branch
```

## 3. 等待部署

進入：

```text
Actions
```

等待：

```text
Deploy GovPDF Editor Web V3.6.3.1
```

完成。

`build` 與 `deploy` 都應顯示綠色勾勾。

GitHub Actions 會自動：

1. 下載固定版本 PDF 核心
2. 驗證 SHA-512
3. 建立 `vendor/`
4. 建立 PDF.js CMaps、標準字型、WASM、ICC 等資源
5. 產生本機 SHA-256 manifest
6. 建立 Pages artifact
7. 部署到 GitHub Pages

---

# 🔐 資安與隱私設計

V3.6.3.1 已加入多項安全防護。

### Stored XSS 防護

外部檔名及復原資料使用安全 DOM API 與 `textContent` 顯示，不直接將外部輸入放入 `innerHTML`。

### Content Security Policy

網站限制：

- Script 僅允許同源
- Worker 僅允許同源
- 禁止 Object
- 禁止 Base URL 注入
- 網路連線限制為同源

### 第三方核心完整性

固定版本套件：

| 套件 | 版本 |
|---|---|
| PDF.js | 6.2.108 |
| pdf-lib | 1.17.1 |
| JSZip | 3.10.1 |

下載時會驗證固定 SHA-512。

安裝後再建立 SHA-256 manifest，用於本機啟動完整性檢查。

### localhost 防護

Windows 本機伺服器：

- 僅綁定 `127.0.0.1`
- 固定 Port 8765
- Host Header 白名單
- 路徑穿越防護
- 不開放 `Access-Control-Allow-Origin: *`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

### Privacy Guard

匯出前會檢查：

- 一般視覺遮罩
- 黑色色塊
- 永久塗銷
- 需安全扁平化頁面
- Metadata Privacy 狀態

若偵測到一般色塊仍保留底層文字，系統會額外顯示安全確認。

### Metadata Privacy

預設清除來源 PDF 的文件屬性，例如：

- Title
- Author
- Subject
- Keywords
- Creator
- Producer

避免合併或重新匯出 PDF 時意外保留來源文件資訊。

---

# ⚠️ 一般色塊與永久塗銷的差異

| 功能 | 畫面遮住內容 | 原文字可搜尋 | 適合敏感資料 |
|---|---:|---:|---:|
| 白色色塊 | ✅ | ⚠️ 可能可以 | ❌ |
| 黑色色塊（非塗銷） | ✅ | ⚠️ 可能可以 | ❌ |
| 彩色色塊 | ✅ | ⚠️ 可能可以 | ❌ |
| 永久塗銷 | ✅ | ❌ | ✅ |

**處理敏感內容時，請使用「永久塗銷」，不要只使用黑色或白色色塊。**

---

# 🧪 測試

專案內包含：

```text
tests/static_check.py
tests/security_check.py
tests/privacy_guard_check.py
tests/final_hotfix_check.py
tests/local_server_runtime_check.py
```

用於檢查：

- DOM ID 一致性
- JavaScript 引用
- 版本一致性
- Stored XSS 修復
- CSP
- CORS
- 核心完整性
- Privacy Guard
- Recovery
- localhost Server
- Final Hotfix 安全條件

---

# 📦 第三方開源套件

本專案使用：

### Mozilla PDF.js

- Version: 6.2.108
- License: Apache License 2.0

### pdf-lib

- Version: 1.17.1
- License: MIT License

### JSZip

- Version: 3.10.1
- License: MIT License

詳細第三方授權資訊請參閱：

```text
THIRD_PARTY_NOTICES.txt
CORE_INTEGRITY.txt
```

---

# 🔄 建議瀏覽器

建議使用最新版：

- Google Chrome
- Microsoft Edge
- Chromium 系瀏覽器

大型 PDF 建議使用 64-bit 瀏覽器並保留足夠記憶體。

---

# ⚠️ 使用注意事項

1. 正式文件匯出後，仍建議重新開啟輸出 PDF 做最後人工確認。
2. 敏感資料請使用「永久塗銷」。
3. 不要把普通黑色色塊視為永久刪除內容。
4. 大型 PDF 匯出時請等待進度完成，不要直接關閉瀏覽器。
5. 若瀏覽器更新或清除網站資料，自動復原資料可能被清除。
6. 使用 GitHub Pages 處理高度敏感文件前，請依組織資訊安全政策評估是否應改用本機版本。

---

## Version

**GovPDF Editor Web V3.6.3.1**

Security & Reliability Final Hotfix + Local Server Runtime Hotfix
