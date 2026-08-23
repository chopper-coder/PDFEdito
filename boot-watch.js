'use strict';
window.__govpdfBootWatch=setTimeout(()=>{
  const el=document.getElementById('libStatus');
  if(!el||!el.textContent.includes('正在載入'))return;
  el.textContent='⚠️ PDF 核心尚未就緒｜請點此看說明';
  el.classList.add('error');
  el.style.cursor='pointer';
  el.title='若專案內沒有 vendor 核心，請關閉此頁後重新執行 Start_GovPDF_Editor.bat。';
  el.onclick=()=>alert('PDF 核心尚未就緒。\n\n本機：請直接執行 Start_GovPDF_Editor.bat；若缺少核心，啟動程式會自動下載固定版本並驗證完整性。\n\nGitHub：請使用內附 GitHub Actions workflow 部署，部署時會自動建立並驗證 vendor 核心。');
},15000);
