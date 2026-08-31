# PDF Editor Web V3.7 Architecture

V3.7 的主要目標是移除 V3.6.x 逐版累積的「單一大型 JS + 尾端 monkey-patch 覆寫」模式。

## Runtime entry

```text
app-v3.7.0.js
  └─ src/main.js
      └─ src/editor/runtime.js
```

`app-v3.7.0.js` 只負責載入模組，不再放功能實作。

## Modules

```text
src/
├─ main.js
├─ editor/
│  └─ runtime.js
├─ platform/
│  ├─ config.js
│  ├─ dom.js
│  ├─ state.js
│  ├─ utils.js
│  └─ vendor-loader.js
└─ security/
   ├─ privacy.js
   └─ project-validation.js
```

### platform/config.js
集中管理：
- App / PDF.js / pdf-lib / JSZip 版本
- vendor 路徑
- 圖片 MIME 白名單
- PDF 壓縮 preset
- `.govpdf` 專案安全限制

### platform/dom.js
集中管理 DOM id 對應。新增 UI 控制項時，只需要在這裡登記一次。

### platform/state.js
集中建立應用程式 mutable state，避免版本熱修補重複增加 state 欄位。

### platform/vendor-loader.js
只負責本機 vendor 核心載入：
- PDF.js
- pdf-lib
- JSZip

不處理編輯邏輯。

### security/project-validation.js
集中處理不可信 `.govpdf` 專案輸入：
- ZIP path validation
- ZIP bomb / compression ratio 限制
- 檔案與頁數上限
- annotation schema validation
- image asset validation

### security/privacy.js
集中判斷 GitHub Pages 隱私模式。

### editor/runtime.js
保留與 UI / PDF 編輯高度耦合的互動流程。V3.7 已將所有歷史同名函式覆寫合併為單一正式實作，不再使用：

```text
setTool = function(...)
const __v362SetTool = setTool
```

這類 monkey-patch 模式。

## Maintainability rule

V3.7 起：
1. 同一功能只能有一個正式 function declaration。
2. 禁止用 `foo = function(){...}` 覆寫既有功能做版本 hotfix。
3. 新的安全驗證優先放入 `src/security/`。
4. 新的固定設定優先放入 `src/platform/config.js`。
5. 新功能修改後必須跑 `tests/architecture_check.py`。

## Security baseline

模組化不改變 V3.6.5 的安全基線：
- CSP self-only runtime
- npm 套件固定 SHA-512 驗證
- 本機 vendor SHA-256 manifest
- localhost Host / path traversal 防護
- GitHub Pages privacy mode
- Stored XSS 防護
- Metadata Privacy Guard
- 永久塗銷安全扁平化
