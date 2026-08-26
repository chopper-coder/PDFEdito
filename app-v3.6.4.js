const PDFJS_VERSION = '6.2.108';
const PDFLIB_VERSION = '1.17.1';
const JSZIP_VERSION = '3.10.1';
const APP_VERSION = '3.6.4';

let pdfjsLib = null;
let PDFLib = null;

const $ = (id) => document.getElementById(id);
const els = {
  openBtn:$('openBtn'), mergeBtn:$('mergeBtn'), insertBtn:$('insertBtn'), insertImageBtn:$('insertImageBtn'), wordBtn:$('wordBtn'), exportBtn:$('exportBtn'),
  fileInput:$('fileInput'), mergeInput:$('mergeInput'), insertInput:$('insertInput'), imageInput:$('imageInput'),
  libStatus:$('libStatus'), docStatus:$('docStatus'), pageCount:$('pageCount'), thumbList:$('thumbList'), viewer:$('viewer'), dropHint:$('dropHint'),
  stageWrap:$('stageWrap'), pagesContainer:$('pagesContainer'), stage:$('stage'), canvas:$('pdfCanvas'), overlay:$('overlay'), textHitLayer:$('textHitLayer'),
  undoBtn:$('undoBtn'), redoBtn:$('redoBtn'), rotateLeftBtn:$('rotateLeftBtn'), rotateRightBtn:$('rotateRightBtn'), deletePageBtn:$('deletePageBtn'),
  zoomOutBtn:$('zoomOutBtn'), zoomInBtn:$('zoomInBtn'), fitBtn:$('fitBtn'), zoomLabel:$('zoomLabel'), prevBtn:$('prevBtn'), nextBtn:$('nextBtn'), pageLabel:$('pageLabel'),
  blockColor:$('blockColor'), textColor:$('textColor'), fontSize:$('fontSize'), fontFamily:$('fontFamily'), boldText:$('boldText'), italicText:$('italicText'), underlineText:$('underlineText'), textAlign:$('textAlign'), textValue:$('textValue'),
  applyTextBtn:$('applyTextBtn'), cancelModeBtn:$('cancelModeBtn'), deleteObjectBtn:$('deleteObjectBtn'), watermarkBtn:$('watermarkBtn'), movePageUpBtn:$('movePageUpBtn'), movePageDownBtn:$('movePageDownBtn'), clearMetadata:$('clearMetadata'), organizeBtn:$('organizeBtn'),
  textEditDialog:$('textEditDialog'), originalTextValue:$('originalTextValue'), replacementTextValue:$('replacementTextValue'), confirmReplaceTextBtn:$('confirmReplaceTextBtn'),
  watermarkDialog:$('watermarkDialog'), watermarkText:$('watermarkText'), watermarkSize:$('watermarkSize'), watermarkColor:$('watermarkColor'), watermarkOpacity:$('watermarkOpacity'), watermarkRotation:$('watermarkRotation'), watermarkScope:$('watermarkScope'), confirmWatermarkBtn:$('confirmWatermarkBtn'),
  pageNumberBtn:$('pageNumberBtn'), pageNumberStatus:$('pageNumberStatus'), pageNumberDialog:$('pageNumberDialog'), pageNumberPosition:$('pageNumberPosition'), pageNumberFormat:$('pageNumberFormat'), pageNumberFromPage:$('pageNumberFromPage'), pageNumberStart:$('pageNumberStart'), pageNumberSize:$('pageNumberSize'), pageNumberMargin:$('pageNumberMargin'), pageNumberColor:$('pageNumberColor'), confirmPageNumberBtn:$('confirmPageNumberBtn'), removePageNumbersBtn:$('removePageNumbersBtn'),
  wordDialog:$('wordDialog'), confirmWordBtn:$('confirmWordBtn'), organizerDialog:$('organizerDialog'), organizerGrid:$('organizerGrid'), addPageBtn:$('addPageBtn'), addPageDialog:$('addPageDialog'), addPagePosition:$('addPagePosition'), addPageSize:$('addPageSize'), addPageCount:$('addPageCount'), confirmAddPageBtn:$('confirmAddPageBtn'),
  performanceMode:$('performanceMode'), performanceStatus:$('performanceStatus'), autoSaveStatus:$('autoSaveStatus'),
  orgSelectAllBtn:$('orgSelectAllBtn'), orgClearBtn:$('orgClearBtn'), orgRotateLeftBtn:$('orgRotateLeftBtn'), orgRotateRightBtn:$('orgRotateRightBtn'), orgDuplicateBtn:$('orgDuplicateBtn'), orgDeleteBtn:$('orgDeleteBtn'), orgSelectionStatus:$('orgSelectionStatus'),
  recoveryDialog:$('recoveryDialog'), recoveryInfo:$('recoveryInfo'), restoreRecoveryBtn:$('restoreRecoveryBtn'), discardRecoveryBtn:$('discardRecoveryBtn'),
  saveProjectBtn:$('saveProjectBtn'), openProjectBtn:$('openProjectBtn'), projectInput:$('projectInput'), jumpPageInput:$('jumpPageInput'), jumpPageBtn:$('jumpPageBtn'), snapEnabled:$('snapEnabled'), objectSelectionStatus:$('objectSelectionStatus'), lockObjectBtn:$('lockObjectBtn'), bringFrontBtn:$('bringFrontBtn'), sendBackBtn:$('sendBackBtn'), preflightDialog:$('preflightDialog'), preflightSummary:$('preflightSummary'), confirmExportBtn:$('confirmExportBtn'), privacyWarningDialog:$('privacyWarningDialog'), privacyWarningSummary:$('privacyWarningSummary'), privacyProceedBtn:$('privacyProceedBtn'), blockSafetyHint:$('blockSafetyHint'), metadataPrivacyStatus:$('metadataPrivacyStatus'),
  toast:$('toast'), busy:$('busy'), busyText:$('busyText'), busyDetail:$('busyDetail'), busyProgress:$('busyProgress'), busyCancelBtn:$('busyCancelBtn'), hintText:$('hintText'), sidePrevBtn:$('sidePrevBtn'), sideNextBtn:$('sideNextBtn')
};

const state = {
  sources: [], // {id,name,bytes:ArrayBuffer,pdfjsDoc}
  pages: [],   // {id,sourceId,pageIndex,rotation,annotations:[]}
  currentIndex: 0,
  zoom: 1.15,
  tool: 'select',
  selectedAnnotationId: null,
  selectedAnnotationIds: new Set(),
  snapEnabled: true,
  undo: [], redo: [],
  renderToken: 0,
  thumbObserver: null,
  draggingPageId: null,
  organizerDraggingPageId: null,
  fileName: 'edited.pdf',
  pendingTextHit: null,
  textCache: new Map(),
  imageCache: new Map(),
  pageObserver: null,
  organizerObserver: null,
  pageRenderPromises: new Map(),
  pageRenderQueue: [],
  pageRenderQueued: new Set(),
  pageRenderWorkers: 0,
  organizerRenderQueue: [],
  organizerRenderQueued: new Set(),
  organizerRenderWorkers: 0,
  scrollRaf: 0,
  scrollIdleTimer: 0,
  isScrolling: false,
  performanceMode: 'auto',
  organizerSelection: new Set(),
  organizerLastSelectedIndex: -1,
  annotationClipboard: null,
  autosaveTimer: 0,
  autosaveSuspended: false,
  recoveryAvailable: null,
  recoveryDisabled: false,
  recoverySourceSignature: '',
  githubPrivacyMode: false,
  editRevision: 0,
  savedRevision: 0,
  virtualRebuildPending: false,
  operation: null,
  pageNumber: {enabled:false,position:'center',format:'number',fromPage:1,start:1,fontSize:11,margin:20,color:'#333333'}
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const deepClone = (v) => JSON.parse(JSON.stringify(v));
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const normalizeRotation = (r) => ((r % 360) + 360) % 360;
const xmlEscape = (s='') => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

const CORE_SOURCES = [
  {name:'專案內建核心',pdf:'./vendor/pdf.min.mjs',worker:'./vendor/pdf.worker.min.mjs',cmaps:'./vendor/cmaps/',standardFonts:'./vendor/standard_fonts/',wasm:'./vendor/wasm/',iccs:'./vendor/iccs/',local:true}
];
const PDFLIB_SOURCES=['./vendor/pdf-lib.min.js'];
const JSZIP_SOURCES=['./vendor/jszip.min.js'];
let coreAsset=null,coreLoadPromise=null,pdfLibLoadPromise=null,jszipLoadPromise=null;
function withTimeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} 載入逾時（${Math.round(ms/1000)} 秒）`)),ms))])}
function loadClassicScript(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=true;el.crossOrigin='anonymous';el.onload=resolve;el.onerror=()=>reject(new Error(`無法載入 ${src}`));document.head.appendChild(el)})}
async function cleanupLegacyCaches(){try{if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()))}}catch(e){console.warn('SW cleanup',e)}try{if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('govpdf-web-')).map(k=>caches.delete(k)))}}catch(e){console.warn('cache cleanup',e)}}
async function loadViewerCore(){if(pdfjsLib)return;if(coreLoadPromise)return coreLoadPromise;coreLoadPromise=(async()=>{els.libStatus.textContent='正在載入 PDF 核心…';els.libStatus.classList.remove('ok','error');const errors=[];for(const src of CORE_SOURCES){try{const pj=await withTimeout(import(src.pdf),src.local?3000:8000,`PDF.js (${src.name})`);pj.GlobalWorkerOptions.workerSrc=src.worker;pdfjsLib=pj;coreAsset=src;els.libStatus.textContent=`✅ PDF 核心已就緒｜${src.name}`;els.libStatus.classList.add('ok');els.libStatus.title=`PDF.js ${PDFJS_VERSION}｜${src.name}`;return}catch(err){errors.push(`${src.name}: ${err?.message||err}`)}}throw new Error(`PDF.js 載入失敗。\n${errors.join('\n')}\n\n本機請重新執行 Start_GovPDF_Editor.bat，啟動程式會自動準備 vendor 核心；GitHub Pages 請使用內附 Actions workflow。`)})();try{return await coreLoadPromise}finally{if(!pdfjsLib)coreLoadPromise=null}}
async function ensurePdfLib(){if(PDFLib)return PDFLib;if(window.PDFLib){PDFLib=window.PDFLib;return PDFLib}if(pdfLibLoadPromise)return pdfLibLoadPromise;pdfLibLoadPromise=(async()=>{const errors=[];for(const src of PDFLIB_SOURCES){try{await withTimeout(loadClassicScript(src),8000,'pdf-lib');if(window.PDFLib){PDFLib=window.PDFLib;return PDFLib}}catch(e){errors.push(e?.message||String(e))}}throw new Error(`pdf-lib 載入失敗。\n${errors.join('\n')}`)})();try{return await pdfLibLoadPromise}finally{if(!PDFLib)pdfLibLoadPromise=null}}
async function ensureJSZip(){if(window.JSZip)return window.JSZip;if(jszipLoadPromise)return jszipLoadPromise;jszipLoadPromise=(async()=>{const errors=[];for(const src of JSZIP_SOURCES){try{await withTimeout(loadClassicScript(src),8000,'JSZip');if(window.JSZip)return window.JSZip}catch(e){errors.push(e?.message||String(e))}}throw new Error(`JSZip 載入失敗。\n${errors.join('\n')}`)})();try{return await jszipLoadPromise}finally{if(!window.JSZip)jszipLoadPromise=null}}
function showToast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(showToast._t);showToast._t=setTimeout(()=>els.toast.classList.remove('show'),2600)}
function setBusy(on,text='處理中…',detail='',opts={}){if(on&&!state.operation)state.operation={type:'busy',cancelable:false,cancelled:false};els.busyText.textContent=text;els.busyDetail.textContent=detail;els.busy.classList.toggle('hidden',!on);if(els.busyProgress){els.busyProgress.classList.toggle('hidden',!on||!opts.progress);if(!on||!opts.progress)els.busyProgress.value=0}if(els.busyCancelBtn){els.busyCancelBtn.classList.toggle('hidden',!on||!opts.cancelable);els.busyCancelBtn.disabled=false}if(!on)state.operation=null}
function setBusyProgress(current,total,detail=''){if(detail)els.busyDetail.textContent=detail;if(els.busyProgress&&total>0){els.busyProgress.classList.remove('hidden');els.busyProgress.value=clamp((current/total)*100,0,100)}}
function startOperation(type,cancelable=false){state.operation={type,cancelable,cancelled:false};return state.operation}
function operationCancelled(op){return !!(op&&op.cancelled)}
function currentPageEntry(){return state.pages[state.currentIndex]||null}
function getSource(id){return state.sources.find(s=>s.id===id)}
async function getPdfJsPage(entry){const src=getSource(entry.sourceId);if(!src)throw new Error('找不到 PDF 來源');const page=await src.pdfjsDoc.getPage(entry.pageIndex+1);if(!entry.intrinsicKnown){const base=page.getViewport({scale:1,rotation:0});entry.baseWidth=base.width;entry.baseHeight=base.height;entry.rotation=normalizeRotation((page.rotate||0)+(entry.pendingRotation||0));entry.pendingRotation=0;entry.intrinsicKnown=true}return page}

function snapshot(){return {pages:deepClone(state.pages),currentIndex:state.currentIndex,pageNumber:deepClone(state.pageNumber)}}
function pushUndo(){state.undo.push(snapshot());if(state.undo.length>60)state.undo.shift();state.redo.length=0;updateUndoRedo();scheduleAutosave()}
function restore(snap){state.imageCache.clear();state.pages=deepClone(snap.pages);state.pageNumber=deepClone(snap.pageNumber||{enabled:false,position:'center',format:'number',fromPage:1,start:1,fontSize:11,margin:20,color:'#333333'});state.currentIndex=clamp(snap.currentIndex,0,Math.max(0,state.pages.length-1));state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();state.pendingTextHit=null;rebuildThumbs();renderContinuousDocument({scrollToCurrent:true});updateUI();scheduleAutosave()}
function undo(){if(!state.undo.length)return;state.redo.push(snapshot());restore(state.undo.pop());updateUndoRedo()}
function redo(){if(!state.redo.length)return;state.undo.push(snapshot());restore(state.redo.pop());updateUndoRedo()}
function updateUndoRedo(){els.undoBtn.disabled=!state.undo.length;els.redoBtn.disabled=!state.redo.length}

function recoveryDbOpen(){return new Promise((resolve,reject)=>{const req=indexedDB.open('GovPDFEditorRecovery',2);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions');if(!db.objectStoreNames.contains('sources'))db.createObjectStore('sources')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function idbPut(store,key,value){const db=await recoveryDbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value,key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function idbGet(store,key){const db=await recoveryDbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).get(key);req.onsuccess=()=>{db.close();resolve(req.result||null)};req.onerror=()=>{db.close();reject(req.error)}})}
async function recoveryGet(){try{const session=await idbGet('sessions','latest');if(!session)return null;const sources=await idbGet('sources','latest');return sources?{...session,sources}:null}catch(e){console.warn('recovery get',e);return null}}
async function recoveryClear(){try{const db=await recoveryDbOpen();await new Promise((resolve,reject)=>{const tx=db.transaction(['sessions','sources'],'readwrite');tx.objectStore('sessions').delete('latest');tx.objectStore('sources').delete('latest');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}});state.recoverySourceSignature=''}catch(e){console.warn('recovery clear',e)}}
function totalSourceBytes(){return state.sources.reduce((sum,s)=>sum+(s.bytes?.byteLength||0),0)}
function totalImageAnnotationBytesApprox(){let n=0;for(const p of state.pages)for(const a of p.annotations||[])if(a.type==='image'&&typeof a.src==='string')n+=Math.floor(a.src.length*.75);return n}
function recoverySourceSignature(){return state.sources.map(s=>`${s.id}:${s.bytes?.byteLength||0}`).join('|')}
function recoverySerializable(){return{appVersion:APP_VERSION,savedAt:Date.now(),fileName:state.fileName,currentIndex:state.currentIndex,zoom:state.zoom,pageNumber:deepClone(state.pageNumber),performanceMode:state.performanceMode,pages:deepClone(state.pages)}}
function scheduleAutosave(){if(state.autosaveSuspended||state.recoveryDisabled||!state.pages.length)return;clearTimeout(state.autosaveTimer);if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：等待變更穩定…';state.autosaveTimer=setTimeout(saveRecoveryNow,1100)}
async function saveRecoveryNow(){if(state.autosaveSuspended||state.recoveryDisabled||!state.pages.length)return;const bytes=totalSourceBytes(),imageBytes=totalImageAnnotationBytesApprox();if(bytes+imageBytes>320*1024*1024){state.recoveryDisabled=true;if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：PDF + 圖片資料超過 320MB，已停用';return}try{if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：儲存中…';const sig=recoverySourceSignature();if(sig!==state.recoverySourceSignature){const sourceData=state.sources.map(src=>({id:src.id,name:src.name,bytes:src.bytes}));await idbPut('sources','latest',sourceData);state.recoverySourceSignature=sig}await idbPut('sessions','latest',recoverySerializable());if(els.autoSaveStatus)els.autoSaveStatus.textContent=`自動儲存：已儲存 ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`}catch(e){console.warn('autosave',e);if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：空間不足或瀏覽器不支援'}}

async function checkRecovery(){const data=await recoveryGet();if(!data?.pages?.length||!data?.sources?.length)return;state.recoveryAvailable=data;if(els.recoveryInfo){const dt=new Date(data.savedAt||0),name=document.createElement('strong');name.textContent=String(data.fileName||'PDF');els.recoveryInfo.replaceChildren(document.createTextNode('上次編輯：'),name,document.createElement('br'),document.createTextNode(`頁數：${data.pages.length} 頁`),document.createElement('br'),document.createTextNode(`儲存時間：${dt.toLocaleString()}`))}els.recoveryDialog?.showModal()}
async function restoreRecoverySession(){const data=state.recoveryAvailable;if(!data)return;setBusy(true,'正在恢復上次工作','重建 PDF 工作階段…',{progress:true});state.autosaveSuspended=true;try{const asset=coreAsset?{cMapUrl:coreAsset.cmaps,standardFontDataUrl:coreAsset.standardFonts,wasmUrl:coreAsset.wasm,iccUrl:coreAsset.iccs}:{};const sources=[];for(let i=0;i<data.sources.length;i++){const s=data.sources[i];setBusyProgress(i,data.sources.length,`載入來源 ${i+1} / ${data.sources.length}｜${s.name}`);const ab=s.bytes instanceof ArrayBuffer?s.bytes:s.bytes?.buffer;const pdfjsDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab.slice(0)),...asset,cMapPacked:true}).promise;sources.push({id:s.id,name:s.name,bytes:ab,pdfjsDoc})}state.sources=sources;state.recoverySourceSignature=recoverySourceSignature();state.pages=deepClone(data.pages);state.currentIndex=clamp(data.currentIndex||0,0,state.pages.length-1);state.zoom=clamp(Number(data.zoom)||1.15,.35,4);state.pageNumber=deepClone(data.pageNumber||state.pageNumber);state.performanceMode=data.performanceMode||'auto';if(els.performanceMode)els.performanceMode.value=state.performanceMode;state.undo=[];state.redo=[];state.fileName=data.fileName||'recovered_edited.pdf';state.textCache.clear();rebuildThumbs();await renderContinuousDocument({scrollToCurrent:true});updateUI();showToast('已恢復上次未完成的工作')}catch(e){console.error(e);alert(`恢復失敗：\n${e?.message||e}`)}finally{state.autosaveSuspended=false;setBusy(false);els.recoveryDialog?.close();scheduleAutosave()}}
async function discardRecovery(){state.recoveryAvailable=null;await recoveryClear();els.recoveryDialog?.close();if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：待命'}

async function loadPdfSource(file){
  if(!pdfjsLib)await loadViewerCore();
  const ab=await file.arrayBuffer();
  const asset=coreAsset?{cMapUrl:coreAsset.cmaps,standardFontDataUrl:coreAsset.standardFonts,wasmUrl:coreAsset.wasm,iccUrl:coreAsset.iccs}:{};
  const loadingTask=pdfjsLib.getDocument({data:new Uint8Array(ab.slice(0)),...asset,cMapPacked:true});
  loadingTask.onProgress=({loaded,total})=>{if(total)setBusyProgress(loaded,total,`讀取檔案 ${Math.round(loaded/total*100)}%`)};
  const pdfjsDoc=await loadingTask.promise;
  const first=await pdfjsDoc.getPage(1),base=first.getViewport({scale:1,rotation:0}),defaultRotation=normalizeRotation(first.rotate||0);
  const source={id:uid(),name:file.name,bytes:ab,pdfjsDoc};
  const entries=Array.from({length:pdfjsDoc.numPages},(_,i)=>({id:uid(),sourceId:source.id,pageIndex:i,rotation:i===0?defaultRotation:0,pendingRotation:0,baseWidth:base.width,baseHeight:base.height,intrinsicKnown:i===0,annotations:[]}));
  return {source,entries};
}
async function openFile(file){
  if(!file||!/\.pdf$/i.test(file.name)){showToast('請選擇 PDF 檔案');return}
  if(state.pages.length&&hasUnsavedEdits()&&!confirm('目前 PDF 有尚未匯出的修改。\n\n確定要開啟另一份 PDF 並放棄目前修改嗎？'))return;
  setBusy(true,'正在開啟 PDF',file.name,{progress:true});
  try{
    const {source,entries}=await loadPdfSource(file);await recoveryClear();state.sources=[source];state.pages=entries;state.currentIndex=0;state.undo=[];state.redo=[];state.zoom=1.15;state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();state.pageNumber={enabled:false,position:'center',format:'number',fromPage:1,start:1,fontSize:11,margin:20,color:'#333333'};state.textCache.clear();state.imageCache.clear();state.fileName=file.name.replace(/\.pdf$/i,'')+'_edited.pdf';state.recoveryDisabled=false;state.recoverySourceSignature='';
    if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：待第一次修改';setBusyProgress(1,1,`建立 ${state.pages.length} 頁快速索引…`);rebuildThumbs();updateUI();await renderContinuousDocument({scrollToCurrent:true});showToast(`已開啟 ${file.name}｜${state.pages.length} 頁`);
  }catch(err){console.error(err);alert(`無法開啟 PDF：\n${friendlyPdfError(err)}`)}finally{setBusy(false)}
}
async function mergeFiles(files){
  const arr=[...files].filter(f=>/\.pdf$/i.test(f.name));if(!arr.length)return;
  if(!state.pages.length){await openFile(arr[0]);arr.shift();if(!arr.length)return}
  pushUndo();setBusy(true,'正在合併 PDF',`共 ${arr.length} 個檔案`);
  try{for(let i=0;i<arr.length;i++){els.busyDetail.textContent=`${i+1}/${arr.length}｜${arr[i].name}`;const {source,entries}=await loadPdfSource(arr[i]);state.sources.push(source);state.pages.push(...entries)}rebuildThumbs();await renderContinuousDocument({scrollToCurrent:false});updateUI();scheduleAutosave();showToast(`已加入 ${arr.length} 個 PDF`)}catch(err){console.error(err);alert(`合併失敗：\n${err?.message||err}`)}finally{setBusy(false)}
}
async function insertPdfAfterCurrent(file){
  if(!file||!/\.pdf$/i.test(file.name)||!state.pages.length)return;
  pushUndo();setBusy(true,'正在插入 PDF',file.name);
  try{const {source,entries}=await loadPdfSource(file);state.sources.push(source);const at=state.currentIndex+1;state.pages.splice(at,0,...entries);state.currentIndex=at;rebuildThumbs();updateUI();await renderContinuousDocument({scrollToCurrent:true});scheduleAutosave();showToast(`已在目前頁後插入 ${entries.length} 頁`)}catch(err){console.error(err);alert(`插入 PDF 失敗：\n${err?.message||err}`)}finally{setBusy(false)}
}
function hasUnsavedEdits(){return state.pages.some(p=>p.annotations.length>0)||state.pageNumber.enabled||state.undo.length>0}

function updateUI(){
  const has=state.pages.length>0;
  els.exportBtn.disabled=!has;els.insertBtn.disabled=!has;els.wordBtn.disabled=!has;els.rotateLeftBtn.disabled=!has;els.rotateRightBtn.disabled=!has;els.deletePageBtn.disabled=!has;els.zoomInBtn.disabled=!has;els.zoomOutBtn.disabled=!has;els.fitBtn.disabled=!has;els.prevBtn.disabled=!has||state.currentIndex<=0;els.nextBtn.disabled=!has||state.currentIndex>=state.pages.length-1;
  if(els.addPageBtn)els.addPageBtn.disabled=!has;if(els.insertImageBtn)els.insertImageBtn.disabled=!has;if(els.saveProjectBtn)els.saveProjectBtn.disabled=!has;
  els.movePageUpBtn.disabled=!has||state.currentIndex<=0;els.movePageDownBtn.disabled=!has||state.currentIndex>=state.pages.length-1;els.organizeBtn.disabled=!has;
  if(els.pageNumberBtn)els.pageNumberBtn.disabled=!has;if(els.pageNumberStatus)els.pageNumberStatus.textContent=state.pageNumber.enabled?`頁碼：已套用｜${pageNumberFormatLabel()}`:'頁碼：未套用';
  const selectedCount=selectedAnnotations().length;els.pageCount.textContent=`${state.pages.length} 頁`;els.pageLabel.textContent=has?`第 ${state.currentIndex+1} / ${state.pages.length} 頁`:'第 0 / 0 頁';els.zoomLabel.textContent=`${Math.round(state.zoom*100)}%`;els.deleteObjectBtn.disabled=!selectedCount;if(els.objectSelectionStatus)els.objectSelectionStatus.textContent=selectedCount?`物件：已選 ${selectedCount} 個${selectedAnnotations().some(a=>a.locked)?'｜含鎖定':''}`:'物件：未選取';if(els.lockObjectBtn)els.lockObjectBtn.disabled=!selectedCount;if(els.bringFrontBtn)els.bringFrontBtn.disabled=!selectedCount;if(els.sendBackBtn)els.sendBackBtn.disabled=!selectedCount;if(els.jumpPageInput){els.jumpPageInput.max=Math.max(1,state.pages.length);if(has&&!document.activeElement?.isSameNode(els.jumpPageInput))els.jumpPageInput.value=state.currentIndex+1;}
  els.docStatus.textContent=has?`${state.fileName.replace(/_edited\.pdf$/,'')}｜第 ${state.currentIndex+1} / ${state.pages.length} 頁`:'尚未開啟 PDF';els.dropHint.classList.toggle('hidden',has);els.stageWrap.classList.toggle('hidden',!has);
  document.querySelectorAll('.thumb').forEach((e,i)=>e.classList.toggle('active',i===state.currentIndex));document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===state.tool));
  document.querySelectorAll('.page-overlay').forEach(o=>o.className=`page-overlay overlay tool-${state.tool}`);document.querySelectorAll('.page-text-hit-layer').forEach((l,i)=>l.classList.toggle('active',state.tool==='edit-text'&&i===state.currentIndex));
  document.querySelectorAll('.pdf-page-shell').forEach((e,i)=>e.classList.toggle('current',i===state.currentIndex));
  if(els.sidePrevBtn)els.sidePrevBtn.disabled=!has||state.currentIndex<=0;if(els.sideNextBtn)els.sideNextBtn.disabled=!has||state.currentIndex>=state.pages.length-1;updateUndoRedo();updateHint();updatePerformanceStatus();
}

function entryDisplaySize(entry){
  const bw=entry.baseWidth||595.28,bh=entry.baseHeight||841.89;const r=normalizeRotation(entry.rotation||0);return (r===90||r===270)?{width:bh,height:bw}:{width:bw,height:bh};
}
function pageShell(index){return els.pagesContainer?.querySelector(`.pdf-page-shell[data-index="${index}"]`)||null}
function effectivePerformanceMode(){if(state.performanceMode&&state.performanceMode!=='auto')return state.performanceMode;if(state.pages.length>=100)return'large';return state.pages.length>=45?'balanced':'quality'}
function isLargeDocument(){return effectivePerformanceMode()==='large'||state.pages.length>=100}
function renderRadius(){const mode=effectivePerformanceMode();if(mode==='large')return state.isScrolling?0:1;if(mode==='balanced')return state.isScrolling?1:3;return state.isScrolling?1:5}
function renderDpr(){const native=window.devicePixelRatio||1,mode=effectivePerformanceMode();return Math.min(native,mode==='large'?1:mode==='balanced'?1.25:1.7)}
function updatePerformanceStatus(){if(!els.performanceStatus)return;const mode=effectivePerformanceMode(),label=mode==='large'?'大型 PDF 高效能':mode==='balanced'?'平衡':'畫質優先',rendered=[...document.querySelectorAll('.pdf-page-canvas')].filter(c=>c.width>1).length;els.performanceStatus.textContent=`效能：${label}${state.performanceMode==='auto'?'（自動）':''}｜高解析 ${rendered} 頁｜預載 ${renderRadius()*2+1} 頁`;document.body.classList.toggle('performance-large',mode==='large')}
function syncActivePageRefs(index=state.currentIndex){const sh=pageShell(index);if(!sh)return null;els.stage=sh.querySelector('.page-stage');els.canvas=sh.querySelector('.pdf-page-canvas');els.overlay=sh.querySelector('.page-overlay');els.textHitLayer=sh.querySelector('.page-text-hit-layer');return sh}
function updateCurrentPageUI(prevIndex,newIndex){
  if(prevIndex===newIndex)return;
  const prevThumb=els.thumbList?.querySelector(`.thumb[data-index="${prevIndex}"]`),nextThumb=els.thumbList?.querySelector(`.thumb[data-index="${newIndex}"]`);
  prevThumb?.classList.remove('active');nextThumb?.classList.add('active');
  pageShell(prevIndex)?.classList.remove('current');pageShell(newIndex)?.classList.add('current');
  pageShell(prevIndex)?.querySelector('.page-text-hit-layer')?.classList.remove('active');
  pageShell(newIndex)?.querySelector('.page-text-hit-layer')?.classList.toggle('active',state.tool==='edit-text');
  els.pageLabel.textContent=`第 ${newIndex+1} / ${state.pages.length} 頁`;
  els.docStatus.textContent=`${state.fileName.replace(/_edited\.pdf$/,'')}｜第 ${newIndex+1} / ${state.pages.length} 頁`;
  els.prevBtn.disabled=newIndex<=0;els.nextBtn.disabled=newIndex>=state.pages.length-1;
  els.movePageUpBtn.disabled=newIndex<=0;els.movePageDownBtn.disabled=newIndex>=state.pages.length-1;
  if(els.sidePrevBtn)els.sidePrevBtn.disabled=newIndex<=0;if(els.sideNextBtn)els.sideNextBtn.disabled=newIndex>=state.pages.length-1;
}
function setCurrentIndex(index,{scroll=false}={}){if(index<0||index>=state.pages.length)return;const prev=state.currentIndex;state.currentIndex=index;state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();state.pendingTextHit=null;const sh=syncActivePageRefs(index);updateCurrentPageUI(prev,index);updateUI();if(scroll&&sh)sh.scrollIntoView({behavior:'smooth',block:'start'});scheduleNearbyPageRenders(index,true);if(state.tool==='edit-text')renderPageAtIndex(index,true)}
function releasePageCanvas(index){const sh=pageShell(index);if(!sh)return;const c=sh.querySelector('.pdf-page-canvas'),tl=sh.querySelector('.page-text-hit-layer'),wasRendered=!!(c&&c.width>1);if(wasRendered){c.width=1;c.height=1;delete c.dataset.renderKey}if(tl)tl.innerHTML='';if(wasRendered&&isLargeDocument()){const entry=state.pages[index],src=entry&&getSource(entry.sourceId);src?.pdfjsDoc?.getPage(entry.pageIndex+1).then(p=>p.cleanup?.()).catch(()=>{})}}
function releaseFarPageCanvases(){const radius=renderRadius();els.pagesContainer?.querySelectorAll('.pdf-page-shell').forEach(sh=>{const i=Number(sh.dataset.index);if(Math.abs(i-state.currentIndex)<=radius)return;if(!state.pageRenderPromises.has(i))releasePageCanvas(i);if(isLargeDocument()&&Math.abs(i-state.currentIndex)>radius+2){const ov=sh.querySelector('.page-overlay');if(ov)ov.innerHTML='';const tl=sh.querySelector('.page-text-hit-layer');if(tl)tl.innerHTML=''}})}
function schedulePageRender(index,priority=false){if(index<0||index>=state.pages.length)return;if(state.isScrolling&&isLargeDocument()&&!priority&&index!==state.currentIndex)return;if(state.pageRenderPromises.has(index)||state.pageRenderQueued.has(index))return;state.pageRenderQueued.add(index);priority?state.pageRenderQueue.unshift(index):state.pageRenderQueue.push(index);pumpPageRenderQueue()}
function scheduleNearbyPageRenders(center=state.currentIndex,priority=false){const r=renderRadius();schedulePageRender(center,true);for(let d=1;d<=r;d++){schedulePageRender(center-d,priority);schedulePageRender(center+d,priority)}}
function pumpPageRenderQueue(){const maxWorkers=isLargeDocument()?1:2;while(state.pageRenderWorkers<maxWorkers&&state.pageRenderQueue.length){const index=state.pageRenderQueue.shift();state.pageRenderQueued.delete(index);if(index<0||index>=state.pages.length)continue;state.pageRenderWorkers++;renderPageAtIndex(index,false).catch(()=>{}).finally(()=>{state.pageRenderWorkers--;pumpPageRenderQueue()})}}

async function renderContinuousDocument({scrollToCurrent=false}={}){
  state.renderToken++;
  if(!state.pages.length){els.pagesContainer.innerHTML='';return}
  const keepTopPage=state.currentIndex;const oldShell=pageShell(keepTopPage);const oldOffset=oldShell?oldShell.getBoundingClientRect().top-els.stageWrap.getBoundingClientRect().top:0;
  if(state.pageObserver)state.pageObserver.disconnect();state.pageRenderQueue.length=0;state.pageRenderQueued.clear();els.pagesContainer.innerHTML='';
  const frag=document.createDocumentFragment();
  state.pages.forEach((entry,i)=>{
    const sz=entryDisplaySize(entry),w=Math.max(1,sz.width*state.zoom),h=Math.max(1,sz.height*state.zoom);
    const shell=document.createElement('section');shell.className='pdf-page-shell'+(i===state.currentIndex?' current':'');shell.dataset.index=i;shell.dataset.pageId=entry.id;
    const badge=document.createElement('div');badge.className='page-number-badge';badge.textContent=`第 ${i+1} 頁`;
    const stage=document.createElement('div');stage.className='page-stage';stage.style.width=`${w}px`;stage.style.height=`${h}px`;
    const canvas=document.createElement('canvas');canvas.className='pdf-page-canvas';canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.width=1;canvas.height=1;
    const textLayer=document.createElement('div');textLayer.className='page-text-hit-layer text-hit-layer';
    const overlay=document.createElement('div');overlay.className=`page-overlay overlay tool-${state.tool}`;overlay.dataset.index=i;
    overlay.addEventListener('pointerdown',overlayPointerDown);overlay.addEventListener('pointermove',overlayPointerMove);overlay.addEventListener('pointerup',overlayPointerUp);
    stage.addEventListener('pointerdown',(ev)=>{if(ev.button===0&&!ev.target.closest('.annotation')&&!ev.target.closest('.text-hit'))setCurrentIndex(i)});
    stage.append(canvas,textLayer,overlay);shell.append(badge,stage);frag.appendChild(shell);
    if(!isLargeDocument()||Math.abs(i-state.currentIndex)<=2)renderAnnotationsForPage(i,overlay);
  });
  els.pagesContainer.appendChild(frag);syncActivePageRefs(state.currentIndex);
  state.pageObserver=new IntersectionObserver(entries=>{for(const ent of entries){if(ent.isIntersecting){const i=Number(ent.target.dataset.index);schedulePageRender(i,false)}}},{root:els.stageWrap,rootMargin:isLargeDocument()?'320px 0px 320px 0px':'650px 0px 650px 0px',threshold:.01});
  els.pagesContainer.querySelectorAll('.pdf-page-shell').forEach(sh=>state.pageObserver.observe(sh));
  await renderPageAtIndex(state.currentIndex,true);scheduleNearbyPageRenders(state.currentIndex,false);releaseFarPageCanvases();updateUI();
  requestAnimationFrame(()=>{if(scrollToCurrent){pageShell(state.currentIndex)?.scrollIntoView({block:'start'})}else if(oldShell){const sh=pageShell(keepTopPage);if(sh){els.stageWrap.scrollTop+=sh.getBoundingClientRect().top-els.stageWrap.getBoundingClientRect().top-oldOffset}}});
}

async function renderPageAtIndex(index,force=false){
  const entry=state.pages[index],sh=pageShell(index);if(!entry||!sh)return;const canvas=sh.querySelector('.pdf-page-canvas'),stage=sh.querySelector('.page-stage'),textLayer=sh.querySelector('.page-text-hit-layer');
  if(state.isScrolling&&isLargeDocument()&&!force&&index!==state.currentIndex)return;
  if(state.pageRenderPromises.has(index)){const pending=state.pageRenderPromises.get(index);if(!force)return pending;try{await pending}catch{}state.pageRenderPromises.delete(index);return renderPageAtIndex(index,true)}
  const token=state.renderToken;
  const job=(async()=>{
    try{
      const page=await getPdfJsPage(entry),viewport=page.getViewport({scale:state.zoom,rotation:entry.rotation}),dpr=renderDpr(),key=`${state.zoom}:${entry.rotation}:${dpr}`;if(!force&&canvas.dataset.renderKey===key)return;
      stage.style.width=`${viewport.width}px`;stage.style.height=`${viewport.height}px`;canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;
      canvas.width=Math.max(1,Math.floor(viewport.width*dpr));canvas.height=Math.max(1,Math.floor(viewport.height*dpr));
      const ctx=canvas.getContext('2d',{alpha:false});await page.render({canvasContext:ctx,viewport,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null,background:'white'}).promise;
      if(token!==state.renderToken){canvas.width=1;canvas.height=1;delete canvas.dataset.renderKey;return}
      canvas.dataset.renderKey=key;renderAnnotationsForPage(index,sh.querySelector('.page-overlay'));
      if(state.tool==='edit-text'&&index===state.currentIndex)await renderTextHitLayerForPage(index,page,viewport,textLayer);
      if(isLargeDocument()&&Math.abs(index-state.currentIndex)>renderRadius())releasePageCanvas(index);
    }catch(err){console.error('render page',index,err);sh.classList.add('render-error')}
  })();
  state.pageRenderPromises.set(index,job);try{return await job}finally{state.pageRenderPromises.delete(index)}
}
async function renderCurrentPage(){return renderPageAtIndex(state.currentIndex,true)}

function fontCss(a,scale=state.zoom){const size=Math.max(6,(a.fontSize||20)*scale);const weight=a.bold?'700':'400';const style=a.italic?'italic':'normal';const fam=a.fontFamily||'Microsoft JhengHei';return `${style} ${weight} ${size}px "${fam}","Microsoft JhengHei",sans-serif`}
function renderAnnotations(){const sh=syncActivePageRefs(state.currentIndex);if(sh)renderAnnotationsForPage(state.currentIndex,els.overlay);updateUI()}

const IMAGE_INPUT_MAX_BYTES = 30 * 1024 * 1024;
const IMAGE_OUTPUT_MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_MAX_DIMENSION = 4096;
const IMAGE_MAX_PIXELS = 12_000_000;
const IMAGE_ALLOWED_MIME = new Set(['image/png','image/jpeg','image/webp']);
function imageMimeFromFile(file){
  const mime=String(file?.type||'').toLowerCase();
  if(IMAGE_ALLOWED_MIME.has(mime))return mime;
  const name=String(file?.name||'').toLowerCase();
  if(/\.png$/.test(name))return'image/png';
  if(/\.(jpg|jpeg)$/.test(name))return'image/jpeg';
  if(/\.webp$/.test(name))return'image/webp';
  return'';
}
function canvasToBlobPromise(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('無法處理圖片')),type,quality))}
function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('無法讀取圖片'));r.readAsDataURL(blob)})}
async function decodeImageFile(file){
  const mime=imageMimeFromFile(file);if(!mime)throw new Error('僅支援 PNG、JPG / JPEG、WebP 圖片');
  if(file.size>IMAGE_INPUT_MAX_BYTES)throw new Error('圖片檔案超過 30 MB 安全上限');
  let source=null,objectUrl='';
  try{
    if('createImageBitmap'in window){try{source=await createImageBitmap(file,{imageOrientation:'from-image'})}catch{source=await createImageBitmap(file)}}
    if(!source){objectUrl=URL.createObjectURL(file);source=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('瀏覽器無法解碼此圖片'));img.src=objectUrl})}
    const naturalWidth=Number(source.width||source.naturalWidth)||0,naturalHeight=Number(source.height||source.naturalHeight)||0;
    if(!naturalWidth||!naturalHeight)throw new Error('圖片尺寸無效');
    const pixelScale=Math.sqrt(IMAGE_MAX_PIXELS/Math.max(1,naturalWidth*naturalHeight));
    const scale=Math.min(1,IMAGE_MAX_DIMENSION/naturalWidth,IMAGE_MAX_DIMENSION/naturalHeight,pixelScale);
    const width=Math.max(1,Math.round(naturalWidth*scale)),height=Math.max(1,Math.round(naturalHeight*scale));
    const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d',{alpha:true});ctx.drawImage(source,0,0,width,height);
    const outMime=mime==='image/png'?'image/png':mime==='image/webp'?'image/webp':'image/jpeg';
    const blob=await canvasToBlobPromise(c,outMime,outMime==='image/png'?undefined:.92);c.width=1;c.height=1;
    if(blob.size>IMAGE_OUTPUT_MAX_BYTES)throw new Error('圖片處理後仍超過 20 MB，請先縮小圖片再插入');
    const src=await blobToDataUrl(blob);return{src,mime:outMime,width,height,name:String(file.name||'image').slice(0,255),bytes:blob.size}
  }finally{if(source&&typeof source.close==='function')try{source.close()}catch{}if(objectUrl)URL.revokeObjectURL(objectUrl)}
}
async function insertImageFile(file){
  if(!file)return;if(!state.pages.length){showToast('請先開啟 PDF');return}
  setBusy(true,'正在插入圖片',String(file.name||'圖片'));
  try{
    const img=await decodeImageFile(file),entry=currentPageEntry(),sz=entryDisplaySize(entry),ratio=img.height/img.width;
    let w=.38,h=w*ratio*(sz.width/Math.max(1,sz.height));if(h>.58){const k=.58/h;w*=k;h*=k}if(w>.72){const k=.72/w;w*=k;h*=k}w=clamp(w,.04,.9);h=clamp(h,.04,.9);
    pushUndo();const a={id:uid(),type:'image',x:(1-w)/2,y:(1-h)/2,w,h,src:img.src,imageMime:img.mime,imageName:img.name,naturalWidth:img.width,naturalHeight:img.height,locked:false,opacity:1};entry.annotations.push(a);state.selectedAnnotationId=a.id;state.selectedAnnotationIds=new Set([a.id]);state.tool='select';renderAnnotations();markCurrentThumbEdited();updateUI();scheduleAutosave();showToast('已插入圖片，可直接拖曳移動；拖右下角可調整大小（Shift 可自由變形）')
  }catch(err){console.error(err);alert(`插入圖片失敗：\n${err?.message||err}`)}finally{setBusy(false)}
}
function loadAnnotationImage(src){
  const key=String(src||'');if(!key)return Promise.reject(new Error('圖片資料遺失'));if(state.imageCache.has(key))return state.imageCache.get(key);
  const promise=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>{state.imageCache.delete(key);reject(new Error('圖片資料無法解碼'))};img.src=key});state.imageCache.set(key,promise);return promise
}
function dataUrlToImageBytes(src){
  const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(String(src||''));if(!m)throw new Error('圖片資料格式不合法');const raw=atob(m[2]);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return{mime:m[1].toLowerCase(),bytes}
}
function imageExtension(mime){return mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'}
function bytesToImageDataUrl(bytes,mime){return blobToDataUrl(new Blob([bytes],{type:mime}))}

function renderAnnotationsForPage(index,overlay){
  if(!overlay)return;overlay.innerHTML='';const entry=state.pages[index];if(!entry)return;
  const selectedIds=selectedAnnotationIdSet();
  for(const a of entry.annotations){
    const isSelected=index===state.currentIndex&&selectedIds.has(a.id);const d=document.createElement('div');d.className=`annotation ${a.type}${isSelected?' selected':''}${a.locked?' locked':''}`;d.dataset.id=a.id;d.dataset.pageIndex=index;d.style.left=`${a.x*100}%`;d.style.top=`${a.y*100}%`;d.style.width=`${a.w*100}%`;d.style.height=`${a.h*100}%`;
    if(a.type==='rect'||a.type==='redact'){d.style.setProperty('--anno-color',a.type==='redact'?'#000000':(a.color||'#fff'))}
    else if(a.type==='image'){const img=document.createElement('img');img.className='annotation-image-content';img.alt=a.imageName||'插入圖片';img.draggable=false;img.src=a.src||'';d.appendChild(img);d.style.setProperty('--anno-opacity',a.opacity??1)}
    else{d.textContent=a.text||'';d.style.color=a.color||'#111827';d.style.fontSize=`${Math.max(6,(a.fontSize||20)*state.zoom)}px`;d.style.setProperty('--anno-font',`"${a.fontFamily||'Microsoft JhengHei'}","Microsoft JhengHei",sans-serif`);d.style.setProperty('--anno-weight',a.bold?'700':'400');d.style.setProperty('--anno-style',a.italic?'italic':'normal');d.style.setProperty('--text-decoration',a.underline?'underline':'none');d.style.setProperty('--anno-align',a.align||'left');d.style.setProperty('--anno-opacity',a.opacity??1);if(a.type==='replace')d.style.setProperty('--anno-bg',a.bg||'#ffffff');if(a.type==='watermark')d.style.transform=`rotate(${Number(a.rotation)||0}deg)`}
    const label=document.createElement('span');label.className='annotation-label';label.textContent=(a.locked?'🔒 ':'')+(a.type==='replace'?'修改文字':a.type==='watermark'?'浮水印':a.type==='text'?'新增文字':a.type==='redact'?'永久塗銷':a.type==='image'?'插入圖片':'色塊');d.appendChild(label);const h=document.createElement('span');h.className='resize-handle';d.appendChild(h);d.addEventListener('pointerdown',annotationPointerDown);d.addEventListener('dblclick',annotationDoubleClick);h.addEventListener('pointerdown',resizePointerDown);overlay.appendChild(d)
  }
  renderPageNumberPreview(index,overlay);
}
function overlayPoint(ev,overlay=ev.currentTarget?.classList?.contains('page-overlay')?ev.currentTarget:ev.target?.closest?.('.page-overlay')||els.overlay){const r=overlay.getBoundingClientRect();return{x:clamp((ev.clientX-r.left)/r.width,0,1),y:clamp((ev.clientY-r.top)/r.height,0,1),w:r.width,h:r.height}}
let drawing=null;
function overlayPointerDown(ev){
  const overlay=ev.currentTarget,index=Number(overlay.dataset.index);if(!state.pages[index])return;setCurrentIndex(index);syncActivePageRefs(index);if(ev.button===1)return;if(state.tool==='select'){if(ev.target===overlay){setSingleAnnotationSelection(null);renderAnnotationsForPage(index,overlay);updateUI()}return}
  if(state.tool==='text'){pushUndo();const p=overlayPoint(ev,overlay),txt=(els.textValue.value||'新增文字').trim()||'新增文字',fmt=currentTextFormat(),lines=txt.split(/\n/),w=clamp(Math.max(.08,Math.min(.7,Math.max(...lines.map(s=>s.length),1)*(fmt.fontSize/800))),.05,.8),h=clamp(Math.max(.035,lines.length*(fmt.fontSize/650)),.025,.5),a={id:uid(),type:'text',x:p.x,y:p.y,w:Math.min(w,1-p.x),h:Math.min(h,1-p.y),text:txt,...fmt};state.pages[index].annotations.push(a);state.selectedAnnotationId=a.id;state.selectedAnnotationIds=new Set([a.id]);state.tool='select';renderAnnotationsForPage(index,overlay);markCurrentThumbEdited();updateUI();showToast('已新增文字，可直接拖曳移動');ev.preventDefault();return}
  if(state.tool==='white'||state.tool==='block'||state.tool==='redact'){const p=overlayPoint(ev,overlay);drawing={pageIndex:index,overlay,sx:p.x,sy:p.y,currentX:p.x,currentY:p.y,color:state.tool==='redact'?'#000000':state.tool==='white'?'#ffffff':els.blockColor.value,type:state.tool==='redact'?'redact':'rect'};const box=document.createElement('div');box.className='drawing-box';box.id='drawingBox';overlay.appendChild(box);updateDrawingBox();overlay.setPointerCapture?.(ev.pointerId);ev.preventDefault()}
}
function overlayPointerMove(ev){if(!drawing||ev.currentTarget!==drawing.overlay)return;const p=overlayPoint(ev,drawing.overlay);drawing.currentX=p.x;drawing.currentY=p.y;updateDrawingBox()}
function overlayPointerUp(ev){if(!drawing||ev.currentTarget!==drawing.overlay)return;const {pageIndex,overlay}=drawing,x=Math.min(drawing.sx,drawing.currentX),y=Math.min(drawing.sy,drawing.currentY),w=Math.abs(drawing.currentX-drawing.sx),h=Math.abs(drawing.currentY-drawing.sy),color=drawing.color,type=drawing.type||'rect';drawing=null;if(w>.006&&h>.006){pushUndo();const a={id:uid(),type,x,y,w,h,color,locked:false};state.pages[pageIndex].annotations.push(a);state.currentIndex=pageIndex;state.selectedAnnotationId=a.id;state.selectedAnnotationIds=new Set([a.id]);state.tool='select';markCurrentThumbEdited();showToast(type==='redact'?'已新增永久塗銷區，匯出後底層文字將移除':'已新增色塊，可直接拖曳移動')}renderAnnotationsForPage(pageIndex,overlay);updateUI()}
function updateDrawingBox(){const b=drawing?.overlay?.querySelector('#drawingBox');if(!b||!drawing)return;const x=Math.min(drawing.sx,drawing.currentX),y=Math.min(drawing.sy,drawing.currentY),w=Math.abs(drawing.currentX-drawing.sx),h=Math.abs(drawing.currentY-drawing.sy);b.style.left=`${x*100}%`;b.style.top=`${y*100}%`;b.style.width=`${w*100}%`;b.style.height=`${h*100}%`}
function findAnnotation(pageIndex,id){return state.pages[pageIndex]?.annotations.find(a=>a.id===id)}
function findCurrentAnnotation(id){return findAnnotation(state.currentIndex,id)}
function selectedAnnotationIdSet(){const out=new Set(state.selectedAnnotationIds||[]);if(state.selectedAnnotationId)out.add(state.selectedAnnotationId);return out}
function selectedAnnotations(){const ids=selectedAnnotationIdSet(),e=currentPageEntry();return e?e.annotations.filter(a=>ids.has(a.id)):[]}
function setSingleAnnotationSelection(id){state.selectedAnnotationId=id||null;state.selectedAnnotationIds=id?new Set([id]):new Set()}
function toggleAnnotationSelection(id){const s=selectedAnnotationIdSet();s.has(id)?s.delete(id):s.add(id);state.selectedAnnotationIds=s;state.selectedAnnotationId=s.has(id)?id:(s.values().next().value||null)}
function clearSnapGuides(overlay){overlay?.querySelectorAll('.snap-guide').forEach(x=>x.remove())}
function showSnapGuides(overlay,guides){clearSnapGuides(overlay);for(const g of guides||[]){const d=document.createElement('div');d.className=`snap-guide ${g.axis==='x'?'vertical':'horizontal'}`;if(g.axis==='x')d.style.left=`${g.value*100}%`;else d.style.top=`${g.value*100}%`;overlay.appendChild(d)}}
function snapAnnotationPosition(pageIndex,a,x,y){if(!state.snapEnabled)return{x,y,guides:[]};const t=.008,guides=[];let sx=x,sy=y,bestX=t,bestY=t;const xTargets=[0,.5-a.w/2,1-a.w],yTargets=[0,.5-a.h/2,1-a.h];const entry=state.pages[pageIndex];for(const o of entry?.annotations||[]){if(o.id===a.id||selectedAnnotationIdSet().has(o.id))continue;xTargets.push(o.x,o.x+o.w-a.w,o.x+o.w/2-a.w/2);yTargets.push(o.y,o.y+o.h-a.h,o.y+o.h/2-a.h/2)}for(const v of xTargets){const d=Math.abs(x-v);if(d<bestX){bestX=d;sx=v}}for(const v of yTargets){const d=Math.abs(y-v);if(d<bestY){bestY=d;sy=v}}if(bestX<t)guides.push({axis:'x',value:clamp(sx+a.w/2,0,1)});if(bestY<t)guides.push({axis:'y',value:clamp(sy+a.h/2,0,1)});return{x:clamp(sx,0,Math.max(0,1-a.w)),y:clamp(sy,0,Math.max(0,1-a.h)),guides}}
function annotationPointerDown(ev){
  if(state.tool!=='select')return;ev.stopPropagation();ev.preventDefault();const el=ev.currentTarget,pageIndex=Number(el.dataset.pageIndex),id=el.dataset.id,overlay=el.closest('.page-overlay'),a=findAnnotation(pageIndex,id);if(!a)return;const changedPage=state.currentIndex!==pageIndex;state.currentIndex=pageIndex;syncActivePageRefs(pageIndex);if(changedPage)setSingleAnnotationSelection(null);
  const modifier=ev.ctrlKey||ev.metaKey||ev.shiftKey;if(modifier){toggleAnnotationSelection(id);if(!selectedAnnotationIdSet().has(id)){renderAnnotationsForPage(pageIndex,overlay);updateUI();return}}else if(!selectedAnnotationIdSet().has(id))setSingleAnnotationSelection(id);else state.selectedAnnotationId=id;
  renderAnnotationsForPage(pageIndex,overlay);loadAnnotationToInspector(a);updateUI();if(a.locked){showToast('此物件已鎖定；可按「鎖定 / 解鎖」解除');return}
  const ids=selectedAnnotationIdSet(),members=state.pages[pageIndex].annotations.filter(x=>ids.has(x.id)&&!x.locked),activeEl=overlay.querySelector(`.annotation[data-id="${CSS.escape(id)}"]`)||el,start=overlayPoint(ev,overlay),orig=new Map(members.map(x=>[x.id,{x:x.x,y:x.y}]));let moved=false;
  const move=(e)=>{const p=overlayPoint(e,overlay);if(!moved&&Math.hypot(p.x-start.x,p.y-start.y)<.0015)return;if(!moved){pushUndo();moved=true}const base=orig.get(id)||{x:a.x,y:a.y},rawX=base.x+(p.x-start.x),rawY=base.y+(p.y-start.y),snapped=snapAnnotationPosition(pageIndex,a,rawX,rawY),dx=snapped.x-base.x,dy=snapped.y-base.y;showSnapGuides(overlay,snapped.guides);for(const x of members){const o=orig.get(x.id);x.x=clamp(o.x+dx,0,Math.max(0,1-x.w));x.y=clamp(o.y+dy,0,Math.max(0,1-x.h));const dom=overlay.querySelector(`.annotation[data-id="${CSS.escape(x.id)}"]`);if(dom){dom.style.left=`${x.x*100}%`;dom.style.top=`${x.y*100}%`}}};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);clearSnapGuides(overlay);renderAnnotationsForPage(pageIndex,overlay);if(moved){markCurrentThumbEdited();scheduleAutosave()}};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})
}
function annotationDoubleClick(ev){if(state.tool!=='select')return;const pageIndex=Number(ev.currentTarget.dataset.pageIndex),a=findAnnotation(pageIndex,ev.currentTarget.dataset.id);if(!a)return;state.currentIndex=pageIndex;syncActivePageRefs(pageIndex);if(['text','replace','watermark'].includes(a.type)){setSingleAnnotationSelection(a.id);loadAnnotationToInspector(a);els.textValue.focus();els.textValue.select()}}
function resizePointerDown(ev){if(state.tool!=='select')return;ev.stopPropagation();ev.preventDefault();const parent=ev.currentTarget.parentElement,pageIndex=Number(parent.dataset.pageIndex),id=parent.dataset.id,overlay=parent.closest('.page-overlay'),a=findAnnotation(pageIndex,id);if(!a)return;if(a.locked){showToast('此物件已鎖定');return}state.currentIndex=pageIndex;syncActivePageRefs(pageIndex);setSingleAnnotationSelection(id);const start=overlayPoint(ev,overlay),orig={w:a.w,h:a.h};pushUndo();const move=(e)=>{const p=overlayPoint(e,overlay);if(a.type==='image'&&!e.shiftKey){const cw=Math.max(.01,orig.w+(p.x-start.x)),ch=Math.max(.01,orig.h+(p.y-start.y)),fw=cw/orig.w,fh=ch/orig.h,factor=Math.abs(fw-1)>=Math.abs(fh-1)?fw:fh,minFactor=Math.max(.01/orig.w,.01/orig.h),maxFactor=Math.min((1-a.x)/orig.w,(1-a.y)/orig.h);const f=clamp(factor,minFactor,maxFactor);a.w=orig.w*f;a.h=orig.h*f}else{a.w=clamp(orig.w+(p.x-start.x),.01,1-a.x);a.h=clamp(orig.h+(p.y-start.y),.01,1-a.y)}parent.style.width=`${a.w*100}%`;parent.style.height=`${a.h*100}%`};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAnnotationsForPage(pageIndex,overlay);markCurrentThumbEdited();scheduleAutosave()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:true})}
function deleteSelectedAnnotation(){const e=currentPageEntry(),ids=selectedAnnotationIdSet();if(!e||!ids.size)return;pushUndo();e.annotations=e.annotations.filter(a=>!ids.has(a.id));state.imageCache.clear();setSingleAnnotationSelection(null);renderAnnotations();markCurrentThumbEdited();updateUI();scheduleAutosave()}
function selectedAnnotation(){return findCurrentAnnotation(state.selectedAnnotationId)}
function copySelectedAnnotation(){const arr=selectedAnnotations();if(!arr.length)return false;state.annotationClipboard=deepClone(arr);showToast(`已複製 ${arr.length} 個物件`);return true}
function pasteAnnotation(){if(!state.annotationClipboard||!currentPageEntry())return false;const src=Array.isArray(state.annotationClipboard)?state.annotationClipboard:[state.annotationClipboard];pushUndo();const pasted=src.map(orig=>{const a=deepClone(orig);a.id=uid();a.x=clamp((a.x||0)+.018,0,Math.max(0,1-(a.w||.1)));a.y=clamp((a.y||0)+.018,0,Math.max(0,1-(a.h||.05)));a.locked=false;return a});currentPageEntry().annotations.push(...pasted);state.selectedAnnotationIds=new Set(pasted.map(a=>a.id));state.selectedAnnotationId=pasted[pasted.length-1].id;renderAnnotations();markCurrentThumbEdited();scheduleAutosave();showToast(`已貼上 ${pasted.length} 個物件`);return true}
function duplicateSelectedAnnotation(){if(!copySelectedAnnotation())return false;return pasteAnnotation()}
function nudgeSelectedAnnotation(dxPx,dyPx){const arr=selectedAnnotations().filter(a=>!a.locked),overlay=els.overlay;if(!arr.length||!overlay)return false;const r=overlay.getBoundingClientRect();pushUndo();for(const a of arr){a.x=clamp(a.x+dxPx/Math.max(1,r.width),0,Math.max(0,1-a.w));a.y=clamp(a.y+dyPx/Math.max(1,r.height),0,Math.max(0,1-a.h))}renderAnnotations();markCurrentThumbEdited();scheduleAutosave();return true}
function currentTextFormat(){return {fontFamily:els.fontFamily.value||'Microsoft JhengHei',fontSize:clamp(Number(els.fontSize.value)||20,6,96),color:els.textColor.value||'#111827',bold:els.boldText.checked,italic:els.italicText.checked,underline:els.underlineText.checked,align:els.textAlign.value||'left'}}
function loadAnnotationToInspector(a){if(!a)return;if(['text','replace','watermark'].includes(a.type)){els.textValue.value=a.text||'';els.fontFamily.value=[...els.fontFamily.options].some(o=>o.value===a.fontFamily)?a.fontFamily:'Microsoft JhengHei';els.fontSize.value=a.fontSize||20;els.textColor.value=a.color||'#111827';els.boldText.checked=!!a.bold;els.italicText.checked=!!a.italic;els.underlineText.checked=!!a.underline;els.textAlign.value=a.align||'left'}else if(a.type==='rect'){els.blockColor.value=a.color||'#ffffff';updatePrivacyUi()}}
function applyCurrentTextSettings(){const arr=selectedAnnotations().filter(a=>['text','replace','watermark'].includes(a.type));if(!arr.length){showToast('請先選取文字物件');return}pushUndo();const fmt=currentTextFormat();for(const a of arr){a.text=els.textValue.value;Object.assign(a,fmt)}renderAnnotations();markCurrentThumbEdited();scheduleAutosave();showToast(`文字設定已套用｜${arr.length} 個物件`)}

function toggleLockSelected(){const arr=selectedAnnotations();if(!arr.length)return;pushUndo();const lock=!arr.every(a=>a.locked);for(const a of arr)a.locked=lock;renderAnnotations();scheduleAutosave();showToast(lock?`已鎖定 ${arr.length} 個物件`:`已解除鎖定 ${arr.length} 個物件`)}
function moveSelectedLayer(toFront){const e=currentPageEntry(),ids=selectedAnnotationIdSet();if(!e||!ids.size)return;pushUndo();const selected=e.annotations.filter(a=>ids.has(a.id)),others=e.annotations.filter(a=>!ids.has(a.id));e.annotations=toFront?[...others,...selected]:[...selected,...others];renderAnnotations();scheduleAutosave();showToast(toFront?'已置於最上層':'已置於最下層')}
function jumpToPage(){if(!state.pages.length)return;const n=clamp(parseInt(els.jumpPageInput?.value||'1',10)||1,1,state.pages.length);selectPage(n-1)}

async function saveProjectFile(){if(!state.pages.length||state.operation)return;const total=totalSourceBytes();if(total>450*1024*1024&&!confirm(`此專案來源 PDF 約 ${(total/1024/1024).toFixed(0)} MB，儲存 .govpdf 可能需要較多記憶體與時間。\n\n仍要繼續嗎？`))return;const op=startOperation('project-save',false);setBusy(true,'正在儲存 GovPDF 專案','打包來源 PDF、圖片與可編輯物件…',{progress:true});try{const JSZip=await ensureJSZip(),zip=new JSZip(),sources=[];for(let i=0;i<state.sources.length;i++){const s=state.sources[i],path=`sources/source_${String(i+1).padStart(3,'0')}.pdf`;sources.push({id:s.id,name:s.name,path});zip.file(path,new Uint8Array(s.bytes),{compression:'STORE'});setBusyProgress(i+1,state.sources.length,`加入來源 ${i+1} / ${state.sources.length}`);await nextFrame()}const projectPages=deepClone(state.pages);let imageNo=0;for(const p of projectPages){for(const a of p.annotations||[]){if(a.type!=='image')continue;const parsed=dataUrlToImageBytes(a.src);if(parsed.bytes.byteLength>V363_LIMITS.imageBytes)throw new Error(`圖片 ${a.imageName||''} 超過專案安全上限`);imageNo++;const path=`images/image_${String(imageNo).padStart(4,'0')}.${imageExtension(parsed.mime)}`;zip.file(path,parsed.bytes,{compression:'STORE'});a.imagePath=path;a.imageMime=parsed.mime;delete a.src}}const manifest={format:'GovPDFProject',formatVersion:2,appVersion:APP_VERSION,savedAt:new Date().toISOString(),fileName:state.fileName,currentIndex:state.currentIndex,zoom:state.zoom,performanceMode:state.performanceMode,pageNumber:deepClone(state.pageNumber),pages:projectPages,sources};zip.file('project.json',JSON.stringify(manifest,null,2));const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:3}},m=>setBusyProgress(m.percent,100,`壓縮專案 ${Math.round(m.percent)}%`));const base=(state.fileName||'GovPDF_Project').replace(/_edited\.pdf$/i,'').replace(/\.pdf$/i,'');downloadBlob(blob,`${base}.govpdf`);showToast(`GovPDF 專案已儲存${imageNo?`｜含 ${imageNo} 張圖片`:''}`)}catch(e){console.error(e);alert(`儲存專案失敗：\n${e?.message||e}`)}finally{setBusy(false)}}
async function openProjectFile(file){return v363OpenProjectFile(file)}

function annotationRequiresSecureFlatten(a){return !!a&&['redact','replace'].includes(a.type)}
function pageHasSecureFlattenAnnotations(entry){return !!entry?.annotations?.some(annotationRequiresSecureFlatten)}
function pageHasNonDestructiveAnnotations(entry){return !!entry?.annotations?.some(a=>!annotationRequiresSecureFlatten(a))}
function pageRequiresFullFlatten(entry,index){const pn=!!pageNumberText(index),hasAny=!!entry?.annotations?.length;return pageHasSecureFlattenAnnotations(entry)||(entry.rotation!==0&&(hasAny||pn))}
function pageUsesOverlayExport(entry,index){if(pageRequiresFullFlatten(entry,index))return false;return pageHasNonDestructiveAnnotations(entry)||(!!pageNumberText(index)&&state.pageNumber.format==='zhTotal')}
function preflightReport(){
  const anns=state.pages.flatMap((p,i)=>(p.annotations||[]).map(a=>({a,page:i}))),redactions=anns.filter(x=>x.a.type==='redact'),replacements=anns.filter(x=>x.a.type==='replace'),visualMasks=anns.filter(x=>x.a.type==='rect'),images=anns.filter(x=>x.a.type==='image'),locked=anns.filter(x=>x.a.locked),editedPages=new Set(anns.map(x=>x.page)),outOfBounds=anns.filter(({a})=>a.x<0||a.y<0||a.x+a.w>1.0001||a.y+a.h>1.0001),blankSources=new Set(state.sources.filter(s=>/^blank_/i.test(s.name||'')).map(s=>s.id)),blankPages=state.pages.filter(p=>blankSources.has(p.sourceId)).length,totalMB=totalSourceBytes()/1024/1024,flattenPages=state.pages.reduce((n,p,i)=>n+(pageRequiresFullFlatten(p,i)?1:0),0),overlayPages=state.pages.reduce((n,p,i)=>n+(pageUsesOverlayExport(p,i)?1:0),0),unsafeVisualMasks=visualMasks.filter(x=>!pageRequiresFullFlatten(state.pages[x.page],x.page)),unsafeMaskPages=new Set(unsafeVisualMasks.map(x=>x.page)),blackVisualMasks=unsafeVisualMasks.filter(x=>String(x.a.color||'').toLowerCase()==='#000000');
  return{annotations:anns.length,redactions:redactions.length,replacements:replacements.length,visualMasks:visualMasks.length,images:images.length,unsafeVisualMasks:unsafeVisualMasks.length,unsafeMaskPages:unsafeMaskPages.size,blackVisualMasks:blackVisualMasks.length,locked:locked.length,editedPages:editedPages.size,outOfBounds:outOfBounds.length,blankPages,totalMB,flattenPages,overlayPages,metadataCleared:!!els.clearMetadata?.checked}
}
function appendPreflightRow(grid,label,value){const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=String(value);grid.append(a,b)}
function appendRiskCard(parent,level,title,detail){const box=document.createElement('div');box.className=`preflight-risk ${level}`;const h=document.createElement('strong');h.textContent=title;const p=document.createElement('span');p.textContent=detail;box.append(h,p);parent.appendChild(box)}
function openPreflightDialog(){
  if(!state.pages.length)return;const r=preflightReport();els.preflightSummary.replaceChildren();
  const grid=document.createElement('div');grid.className='preflight-grid';appendPreflightRow(grid,'文件頁數',`${state.pages.length} 頁`);appendPreflightRow(grid,'有編輯的頁面',`${r.editedPages} 頁`);appendPreflightRow(grid,'文字 / 色塊等物件',`${r.annotations} 個`);appendPreflightRow(grid,'一般視覺色塊',`${r.visualMasks} 個`);appendPreflightRow(grid,'插入圖片',`${r.images} 張`);appendPreflightRow(grid,'永久塗銷',`${r.redactions} 個`);appendPreflightRow(grid,'修改原文字',`${r.replacements} 個`);appendPreflightRow(grid,'保留原文字層的覆蓋頁',`${r.overlayPages} 頁`);appendPreflightRow(grid,'需安全扁平化頁面',`${r.flattenPages} 頁`);appendPreflightRow(grid,'來源 Metadata',r.metadataCleared?'匯出時清除':'⚠ 將保留');appendPreflightRow(grid,'統一頁碼',state.pageNumber.enabled?'已啟用':'未啟用');els.preflightSummary.appendChild(grid);
  const risks=document.createElement('div');risks.className='preflight-risk-list';
  if(r.unsafeVisualMasks)appendRiskCard(risks,'warn','⚠ 視覺遮罩不是塗銷',`有 ${r.unsafeVisualMasks} 個一般色塊分布於 ${r.unsafeMaskPages} 頁，匯出後底層原文字仍可能被搜尋、複製或擷取。`);
  if(r.blackVisualMasks)appendRiskCard(risks,'danger','⬛ 黑色色塊仍不是永久塗銷',`其中 ${r.blackVisualMasks} 個為黑色色塊。若用於敏感內容，請返回並改用「永久塗銷」。`);
  if(r.flattenPages)appendRiskCard(risks,'safe','🔒 安全扁平化',`${r.flattenPages} 頁會因永久塗銷、修改原文字或旋轉後覆蓋內容而扁平化，底層原文字不會保留。`);
  if(r.metadataCleared)appendRiskCard(risks,'safe','🔐 Metadata 隱私保護已啟用','匯出時會清除來源 Title、Author、Subject、Keywords、Creator 與 Producer。');
  else appendRiskCard(risks,'warn','⚠ 將保留來源 Metadata','來源文件屬性可能包含作者、軟體名稱或內部文件資訊。');
  if(r.outOfBounds)appendRiskCard(risks,'warn','⚠ 物件超出頁面',`有 ${r.outOfBounds} 個物件超出頁面邊界。`);
  if(state.pages.length>=200)appendRiskCard(risks,'info','大型文件',`目前 ${state.pages.length} 頁，匯出時間可能較長。`);
  if(r.totalMB>=200)appendRiskCard(risks,'info','大型來源檔',`來源 PDF 約 ${r.totalMB.toFixed(0)} MB，請確保瀏覽器有足夠記憶體。`);
  if(!risks.childElementCount)appendRiskCard(risks,'safe','✅ 匯出前檢查完成','未發現需要額外確認的隱私或版面風險。');
  els.preflightSummary.appendChild(risks);els.preflightDialog.showModal()
}
function exportPrivacyIssues(){const r=preflightReport(),issues=[];if(r.unsafeVisualMasks)issues.push({level:r.blackVisualMasks?'danger':'warn',title:'一般色塊仍保留底層文字',detail:`${r.unsafeVisualMasks} 個一般色塊（${r.unsafeMaskPages} 頁）不會移除原 PDF 文字層${r.blackVisualMasks?`，其中 ${r.blackVisualMasks} 個是黑色色塊`:''}。`});if(!r.metadataCleared)issues.push({level:'warn',title:'來源 Metadata 將被保留',detail:'Title / Author / Subject / Keywords / Creator / Producer 可能包含來源文件資訊。'});return issues}
function openPrivacyWarningIfNeeded(){const issues=exportPrivacyIssues();if(!issues.length){exportPdf();return}els.privacyWarningSummary.replaceChildren();for(const issue of issues)appendRiskCard(els.privacyWarningSummary,issue.level,issue.title,issue.detail);els.privacyWarningDialog.showModal()}
function updatePrivacyUi(){if(els.blockSafetyHint){const black=String(els.blockColor?.value||'').toLowerCase()==='#000000';els.blockSafetyHint.textContent=black?'⚠ 黑色色塊（非塗銷）：只會遮住畫面，底層原文字仍可能被搜尋／複製。敏感資料請使用「永久塗銷」。':'一般色塊只是視覺遮罩，原文字仍可搜尋；敏感資料請使用「永久塗銷」。';els.blockSafetyHint.classList.toggle('danger-text',black)}if(els.metadataPrivacyStatus){const safe=!!els.clearMetadata?.checked;els.metadataPrivacyStatus.textContent=safe?'Metadata：將清除來源 Title / Author / Subject / Keywords / Creator / Producer。':'⚠ Metadata：目前設定為保留來源文件屬性，可能包含作者或內部資訊。';els.metadataPrivacyStatus.classList.toggle('privacy-safe',safe);els.metadataPrivacyStatus.classList.toggle('danger-text',!safe)}}

async function renderTextHitLayerForPage(index,page,viewport,layer){layer.innerHTML='';if(state.tool!=='edit-text'||index!==state.currentIndex)return;const items=await getTextItemsForPage(state.pages[index],page,viewport);const frag=document.createDocumentFragment();for(const item of items.slice(0,1000)){if(!item.text.trim())continue;const d=document.createElement('div');d.className='text-hit';d.title=`點擊修改：${item.text}`;d.style.left=`${item.x*100}%`;d.style.top=`${item.y*100}%`;d.style.width=`${Math.max(.004,item.w)*100}%`;d.style.height=`${Math.max(.012,item.h)*100}%`;d.addEventListener('click',(ev)=>{ev.stopPropagation();state.currentIndex=index;syncActivePageRefs(index);openTextReplacementDialog(item)});frag.appendChild(d)}layer.appendChild(frag)}
async function renderTextHitLayer(page,viewport,token){const sh=pageShell(state.currentIndex);if(!sh)return;return renderTextHitLayerForPage(state.currentIndex,page,viewport,sh.querySelector('.page-text-hit-layer'))}
async function getTextItemsForPage(entry,page=null,viewport=null){
  const cacheKey=`${entry.id}:${entry.rotation}`;if(state.textCache.has(cacheKey))return state.textCache.get(cacheKey);page=page||await getPdfJsPage(entry);viewport=page.getViewport({scale:1,rotation:entry.rotation});const text=await page.getTextContent();const out=[];
  for(const it of text.items||[]){if(!('str' in it)||!it.str)continue;const tx=pdfjsLib.Util.transform(viewport.transform,it.transform);const fs=Math.max(5,Math.hypot(tx[2],tx[3]));const x=tx[4],y=tx[5]-fs;const w=Math.max(2,Math.abs((it.width||it.str.length*fs*.5)*1));const h=Math.max(fs,Math.abs(it.height||fs));out.push({text:it.str,x:clamp(x/viewport.width,0,1),y:clamp(y/viewport.height,0,1),w:clamp(w/viewport.width,.002,1),h:clamp(h/viewport.height,.008,.25),fontSize:fs,fontName:it.fontName||''})}
  state.textCache.set(cacheKey,out);return out;
}
function sampleBackgroundForRect(item){
  try{const c=els.canvas,ctx=c.getContext('2d');const sx=c.width/(els.stage.clientWidth||1),sy=c.height/(els.stage.clientHeight||1);const x=Math.max(0,Math.floor(item.x*els.stage.clientWidth*sx)),y=Math.max(0,Math.floor(item.y*els.stage.clientHeight*sy)),w=Math.max(1,Math.floor(item.w*els.stage.clientWidth*sx)),h=Math.max(1,Math.floor(item.h*els.stage.clientHeight*sy));const pts=[[x,y],[x+w-1,y],[x,y+h-1],[x+w-1,y+h-1]];let r=0,g=0,b=0,n=0;for(const [px,py] of pts){const d=ctx.getImageData(clamp(px,0,c.width-1),clamp(py,0,c.height-1),1,1).data;r+=d[0];g+=d[1];b+=d[2];n++}return `rgb(${Math.round(r/n)},${Math.round(g/n)},${Math.round(b/n)})`}catch{return '#ffffff'}
}
function openTextReplacementDialog(item){state.pendingTextHit={...item,bg:sampleBackgroundForRect(item)};els.originalTextValue.value=item.text;els.replacementTextValue.value=item.text;els.textEditDialog.showModal();setTimeout(()=>{els.replacementTextValue.focus();els.replacementTextValue.select()},30)}
function confirmReplaceText(ev){ev.preventDefault();const hit=state.pendingTextHit;if(!hit)return;const txt=els.replacementTextValue.value;pushUndo();const fmt=currentTextFormat();fmt.fontSize=clamp(Math.round(hit.fontSize)||Number(els.fontSize.value)||16,6,96);const a={id:uid(),type:'replace',x:hit.x,y:hit.y,w:Math.min(1-hit.x,Math.max(hit.w,.02)),h:Math.min(1-hit.y,Math.max(hit.h,.02)),original:hit.text,text:txt,bg:hit.bg,...fmt};currentPageEntry().annotations.push(a);state.pendingTextHit=null;els.textEditDialog.close();setTool('select');setSingleAnnotationSelection(a.id);renderAnnotations();loadAnnotationToInspector(a);markCurrentThumbEdited();scheduleAutosave();showToast('原文字修改已加入')}

let pan=null;
function viewerPointerDown(ev){const allowHand=state.tool==='hand'&&ev.button===0,allowMiddle=ev.button===1;if((!allowHand&&!allowMiddle)||!state.pages.length)return;const sw=els.stageWrap;pan={x:ev.clientX,y:ev.clientY,left:sw.scrollLeft,top:sw.scrollTop};document.body.classList.add('panning');ev.preventDefault()}
function viewerPointerMove(ev){if(!pan)return;els.stageWrap.scrollLeft=pan.left-(ev.clientX-pan.x);els.stageWrap.scrollTop=pan.top-(ev.clientY-pan.y)}
function viewerPointerUp(){pan=null;document.body.classList.remove('panning')}
function updateHint(){if(!els.hintText)return;const map={select:'連續預覽：滑鼠滾輪可直接上下瀏覽全部頁面；文字、色塊與圖片都可直接拖曳移動與調整大小。',hand:'移動畫面模式：拖曳 PDF 檢視區即可平移。','edit-text':'文字修改：點選 PDF 原本文字，輸入新內容後套用。',text:'新增文字：在 PDF 上點一下建立文字，再用右側格式設定調整。',block:'色塊遮罩：在 PDF 上按住滑鼠左鍵拖出矩形；建立後可移動、縮放與改色。',white:'白色遮罩：在 PDF 上拖出白色色塊。',redact:'永久塗銷：拖出黑色塗銷區；匯出時該頁會扁平化，底下原文字層不會保留。'};els.hintText.textContent=state.pages.length?(map[state.tool]||'可開始編輯 PDF。'):'請先開啟 PDF。'}
function setTool(tool){state.tool=tool;state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();document.querySelectorAll('.page-overlay').forEach((o,i)=>{if(!isLargeDocument()||Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,o);else o.className=`page-overlay overlay tool-${state.tool}`});document.querySelectorAll('.page-text-hit-layer').forEach(l=>l.innerHTML='');if(tool==='edit-text')renderPageAtIndex(state.currentIndex,true);updateUI();updateHint()}
function changeZoom(next,anchor=true){if(!state.pages.length)return;state.renderToken++;const sh=pageShell(state.currentIndex),wrapRect=els.stageWrap.getBoundingClientRect(),oldTop=sh?sh.getBoundingClientRect().top-wrapRect.top:0;state.zoom=clamp(next,.35,4);els.pagesContainer.querySelectorAll('.pdf-page-shell').forEach((shell,i)=>{const entry=state.pages[i],sz=entryDisplaySize(entry),w=Math.max(1,sz.width*state.zoom),h=Math.max(1,sz.height*state.zoom),stage=shell.querySelector('.page-stage'),canvas=shell.querySelector('.pdf-page-canvas');stage.style.width=`${w}px`;stage.style.height=`${h}px`;canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;if(canvas.width>1){canvas.width=1;canvas.height=1;delete canvas.dataset.renderKey}if(Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,shell.querySelector('.page-overlay'))});syncActivePageRefs(state.currentIndex);renderPageAtIndex(state.currentIndex,true);scheduleNearbyPageRenders(state.currentIndex,true);requestAnimationFrame(()=>{if(anchor&&sh){const now=pageShell(state.currentIndex);if(now)els.stageWrap.scrollTop+=now.getBoundingClientRect().top-wrapRect.top-oldTop}});updateUI()}
async function fitWidth(){const e=currentPageEntry();if(!e)return;const sz=entryDisplaySize(e),avail=Math.max(200,els.stageWrap.clientWidth-80);changeZoom(clamp(avail/sz.width,.35,3),false)}

function markCurrentThumbEdited(){const el=els.thumbList.querySelector(`.thumb[data-page-id="${currentPageEntry()?.id}"]`);if(el)el.classList.toggle('edited',(currentPageEntry()?.annotations.length||0)>0)}
function selectPage(index){if(index<0||index>=state.pages.length)return;setCurrentIndex(index,{scroll:true})}
async function refreshPageGeometry(index=state.currentIndex){const entry=state.pages[index],sh=pageShell(index);if(!entry||!sh)return;try{const page=await getPdfJsPage(entry),viewport=page.getViewport({scale:state.zoom,rotation:entry.rotation}),stage=sh.querySelector('.page-stage'),canvas=sh.querySelector('.pdf-page-canvas');stage.style.width=`${viewport.width}px`;stage.style.height=`${viewport.height}px`;canvas.style.width=`${viewport.width}px`;canvas.style.height=`${viewport.height}px`;canvas.width=1;canvas.height=1;delete canvas.dataset.renderKey;renderAnnotationsForPage(index,sh.querySelector('.page-overlay'));await renderPageAtIndex(index,true);releaseFarPageCanvases();updateUI()}catch(e){console.warn('refresh geometry',e)}}
function rotateCurrent(delta){const entry=currentPageEntry();if(!entry)return;pushUndo();if(entry.intrinsicKnown)entry.rotation=normalizeRotation(entry.rotation+delta);else{entry.pendingRotation=normalizeRotation((entry.pendingRotation||0)+delta);entry.rotation=entry.pendingRotation}state.textCache.clear();refreshThumb(state.currentIndex);refreshPageGeometry(state.currentIndex);scheduleAutosave()}
function deleteCurrentPage(){if(!currentPageEntry())return;if(state.pages.length===1){showToast('至少要保留 1 頁');return}if(!confirm(`確定刪除第 ${state.currentIndex+1} 頁？`))return;pushUndo();state.pages.splice(state.currentIndex,1);state.currentIndex=clamp(state.currentIndex,0,state.pages.length-1);setSingleAnnotationSelection(null);rebuildThumbs();renderContinuousDocument({scrollToCurrent:true});updateUI();scheduleAutosave()}
function moveCurrentPage(delta){const from=state.currentIndex,to=from+delta;if(to<0||to>=state.pages.length)return;pushUndo();const[p]=state.pages.splice(from,1);state.pages.splice(to,0,p);state.currentIndex=to;rebuildThumbs();renderContinuousDocument({scrollToCurrent:true});updateUI();scheduleAutosave()}

function rebuildThumbs(){
  if(state.thumbObserver)state.thumbObserver.disconnect();els.thumbList.innerHTML='';state.pages.forEach((p,i)=>{const el=document.createElement('div');el.className='thumb'+(i===state.currentIndex?' active':'')+(p.annotations.length?' edited':'');el.dataset.pageId=p.id;el.dataset.index=i;el.draggable=true;el.innerHTML=`<div class="thumb-canvas-wrap"><canvas width="120" height="150"></canvas></div><div class="thumb-meta"><span>第 ${i+1} 頁</span><span class="dirty-dot" title="此頁有編輯"></span></div>`;el.addEventListener('click',()=>selectPage(Number(el.dataset.index)));el.addEventListener('dragstart',(e)=>{state.draggingPageId=p.id;el.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',p.id)});el.addEventListener('dragend',()=>{state.draggingPageId=null;el.classList.remove('dragging')});el.addEventListener('dragover',(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move'});el.addEventListener('drop',(e)=>{e.preventDefault();reorderByDrop(p.id)});els.thumbList.appendChild(el)});
  state.thumbObserver=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting)renderThumbElement(en.target)},{root:els.thumbList,rootMargin:'300px'});els.thumbList.querySelectorAll('.thumb').forEach(e=>state.thumbObserver.observe(e));updateUI();
}
function reorderByDrop(targetId){const from=state.pages.findIndex(p=>p.id===state.draggingPageId),to=state.pages.findIndex(p=>p.id===targetId);if(from<0||to<0||from===to)return;pushUndo();const[m]=state.pages.splice(from,1);state.pages.splice(to,0,m);state.currentIndex=to;rebuildThumbs();renderContinuousDocument({scrollToCurrent:true});scheduleAutosave()}
async function renderThumbElement(el){if(el.dataset.rendered==='1')return;el.dataset.rendered='1';const entry=state.pages.find(p=>p.id===el.dataset.pageId);if(!entry)return;try{const page=await getPdfJsPage(entry);const base=page.getViewport({scale:1,rotation:entry.rotation});const scale=Math.min(150/base.width,180/base.height);const vp=page.getViewport({scale,rotation:entry.rotation});const c=el.querySelector('canvas');c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp,background:'white'}).promise}catch(e){console.warn('thumb',e)}}
function refreshThumb(index){const el=els.thumbList.querySelectorAll('.thumb')[index];if(!el)return;el.dataset.rendered='0';renderThumbElement(el)}

function updateOrganizerSelectionUI(){if(els.orgSelectionStatus)els.orgSelectionStatus.textContent=`已選 ${state.organizerSelection.size} 頁`;els.organizerGrid?.querySelectorAll('.organizer-card').forEach(card=>{const yes=state.organizerSelection.has(card.dataset.pageId);card.classList.toggle('selected',yes);const cb=card.querySelector('.organizer-check');if(cb)cb.checked=yes})}
function organizerSelectByIndex(index,ev){const page=state.pages[index];if(!page)return;const multi=ev?.ctrlKey||ev?.metaKey,range=ev?.shiftKey;if(range&&state.organizerLastSelectedIndex>=0){const a=Math.min(index,state.organizerLastSelectedIndex),b=Math.max(index,state.organizerLastSelectedIndex);if(!multi)state.organizerSelection.clear();for(let i=a;i<=b;i++)state.organizerSelection.add(state.pages[i].id)}else if(multi){state.organizerSelection.has(page.id)?state.organizerSelection.delete(page.id):state.organizerSelection.add(page.id);state.organizerLastSelectedIndex=index}else{state.organizerSelection.clear();state.organizerSelection.add(page.id);state.organizerLastSelectedIndex=index}state.currentIndex=index;updateOrganizerSelectionUI();updateUI()}
function buildOrganizerCards(){
  if(state.organizerObserver)state.organizerObserver.disconnect();
  els.organizerGrid.innerHTML='';const frag=document.createDocumentFragment();
  for(let i=0;i<state.pages.length;i++){const p=state.pages[i],card=document.createElement('div');card.className='organizer-card'+(i===state.currentIndex?' active':'')+(state.organizerSelection.has(p.id)?' selected':'');card.draggable=true;card.dataset.pageId=p.id;card.dataset.index=i;card.innerHTML=`<input class="organizer-check" type="checkbox" aria-label="選取第 ${i+1} 頁" ${state.organizerSelection.has(p.id)?'checked':''}><div class="organizer-canvas-wrap"><canvas width="1" height="1"></canvas><span class="organizer-placeholder">${i+1}</span></div><div>第 ${i+1} 頁</div>`;
    card.addEventListener('click',ev=>{if(ev.target.closest('.organizer-check'))return;organizerSelectByIndex(i,ev)});card.querySelector('.organizer-check').addEventListener('click',ev=>{ev.stopPropagation();organizerSelectByIndex(i,{ctrlKey:true,metaKey:false,shiftKey:ev.shiftKey})});
    card.addEventListener('dblclick',()=>{state.currentIndex=i;els.organizerDialog.close();renderContinuousDocument({scrollToCurrent:true});updateUI()});
    card.addEventListener('dragstart',()=>{state.organizerDraggingPageId=p.id;card.classList.add('dragging')});card.addEventListener('dragend',()=>{state.organizerDraggingPageId=null;card.classList.remove('dragging')});card.addEventListener('dragover',e=>e.preventDefault());card.addEventListener('drop',e=>{e.preventDefault();const from=state.pages.findIndex(x=>x.id===state.organizerDraggingPageId),to=state.pages.findIndex(x=>x.id===p.id);if(from<0||to<0||from===to)return;pushUndo();const[m]=state.pages.splice(from,1);state.pages.splice(to,0,m);state.currentIndex=to;rebuildThumbs();buildOrganizerCards();renderContinuousDocument({scrollToCurrent:true});scheduleAutosave()});frag.appendChild(card)}
  els.organizerGrid.appendChild(frag);updateOrganizerSelectionUI();
  state.organizerObserver=new IntersectionObserver(entries=>{for(const en of entries)if(en.isIntersecting)scheduleOrganizerRender(en.target)},{root:els.organizerGrid,rootMargin:'220px 0px',threshold:.01});
  els.organizerGrid.querySelectorAll('.organizer-card').forEach(c=>state.organizerObserver.observe(c));
}
async function openOrganizer(){if(!state.pages.length)return;state.organizerSelection=new Set([currentPageEntry().id]);state.organizerLastSelectedIndex=state.currentIndex;els.organizerDialog.showModal();buildOrganizerCards();requestAnimationFrame(()=>{const active=els.organizerGrid.querySelector('.organizer-card.active');active?.scrollIntoView({block:'center'});scheduleOrganizerRender(active)})}
async function renderOrganizer(){if(!els.organizerDialog.open)return;buildOrganizerCards()}
function scheduleOrganizerRender(card){if(!card||card.dataset.rendered==='1'||card.dataset.queued==='1')return;card.dataset.queued='1';state.organizerRenderQueue.push(card);pumpOrganizerRenderQueue()}
function pumpOrganizerRenderQueue(){const maxWorkers=isLargeDocument()?1:2;while(state.organizerRenderWorkers<maxWorkers&&state.organizerRenderQueue.length){const card=state.organizerRenderQueue.shift();if(!card?.isConnected)continue;card.dataset.queued='0';state.organizerRenderWorkers++;const entry=state.pages.find(p=>p.id===card.dataset.pageId);renderOrganizerCard(card,entry).finally(()=>{state.organizerRenderWorkers--;pumpOrganizerRenderQueue()})}}
async function renderOrganizerCard(card,entry){if(!card||!entry||card.dataset.rendered==='1')return;card.dataset.rendered='1';try{const page=await getPdfJsPage(entry),base=page.getViewport({scale:1,rotation:entry.rotation}),targetW=isLargeDocument()?88:120,targetH=isLargeDocument()?116:150,scale=Math.min(targetW/base.width,targetH/base.height),vp=page.getViewport({scale,rotation:entry.rotation}),c=card.querySelector('canvas');c.width=Math.max(1,Math.floor(vp.width));c.height=Math.max(1,Math.floor(vp.height));await page.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:vp,background:'white'}).promise;card.querySelector('.organizer-placeholder')?.remove()}catch(e){card.dataset.rendered='0';console.warn('organizer thumb',e)}}
function organizerSelectedEntries(){return state.pages.filter(p=>state.organizerSelection.has(p.id))}
function organizerSelectAll(){state.organizerSelection=new Set(state.pages.map(p=>p.id));updateOrganizerSelectionUI()}
function organizerClearSelection(){state.organizerSelection.clear();updateOrganizerSelectionUI()}
function organizerBatchRotate(delta){const selected=organizerSelectedEntries();if(!selected.length)return;pushUndo();for(const p of selected){if(p.intrinsicKnown)p.rotation=normalizeRotation((p.rotation||0)+delta);else{p.pendingRotation=normalizeRotation((p.pendingRotation||0)+delta);p.rotation=p.pendingRotation}}state.textCache.clear();buildOrganizerCards();rebuildThumbs();renderContinuousDocument({scrollToCurrent:true});scheduleAutosave();showToast(`已旋轉 ${selected.length} 頁`)}
function organizerBatchDelete(){const selected=organizerSelectedEntries();if(!selected.length)return;if(selected.length>=state.pages.length){showToast('至少要保留 1 頁');return}if(!confirm(`確定刪除選取的 ${selected.length} 頁？`))return;pushUndo();const ids=new Set(selected.map(p=>p.id));state.pages=state.pages.filter(p=>!ids.has(p.id));state.currentIndex=clamp(state.currentIndex,0,state.pages.length-1);state.organizerSelection.clear();rebuildThumbs();buildOrganizerCards();renderContinuousDocument({scrollToCurrent:true});scheduleAutosave();showToast(`已刪除 ${selected.length} 頁`)}
function organizerBatchDuplicate(){const idxs=state.pages.map((p,i)=>state.organizerSelection.has(p.id)?i:-1).filter(i=>i>=0);if(!idxs.length)return;pushUndo();const clones=idxs.map(i=>{const p=deepClone(state.pages[i]);p.id=uid();p.annotations=(p.annotations||[]).map(a=>({...a,id:uid()}));return p});const at=Math.max(...idxs)+1;state.pages.splice(at,0,...clones);state.currentIndex=at;state.organizerSelection=new Set(clones.map(p=>p.id));rebuildThumbs();buildOrganizerCards();renderContinuousDocument({scrollToCurrent:true});scheduleAutosave();showToast(`已複製 ${clones.length} 頁`)}

async function openAddPageDialog(){if(!state.pages.length)return;els.addPageCount.value='1';els.addPageDialog.showModal()}
async function confirmAddPage(ev){ev.preventDefault();if(!state.pages.length)return;const count=clamp(parseInt(els.addPageCount.value||'1',10)||1,1,50);let w=595.28,h=841.89;if(els.addPageSize.value==='same'){const cur=currentPageEntry(),sz=entryDisplaySize(cur);w=sz.width;h=sz.height}else if(els.addPageSize.value==='a4l'){w=841.89;h=595.28}await ensurePdfLib();setBusy(true,'正在新增空白頁',`${count} 頁`);try{const doc=await PDFLib.PDFDocument.create();for(let i=0;i<count;i++)doc.addPage([w,h]);const bytes=await doc.save({useObjectStreams:true});const blob=new Blob([bytes],{type:'application/pdf'}),file=new File([blob],`blank_${Date.now()}.pdf`,{type:'application/pdf'}),loaded=await loadPdfSource(file);state.sources.push(loaded.source);pushUndo();let at=state.pages.length;if(els.addPagePosition.value==='before')at=state.currentIndex;else if(els.addPagePosition.value==='after')at=state.currentIndex+1;state.pages.splice(at,0,...loaded.entries);state.currentIndex=at;rebuildThumbs();els.addPageDialog.close();await renderContinuousDocument({scrollToCurrent:true});updateUI();scheduleAutosave();showToast(`已新增 ${count} 頁空白頁`)}catch(err){console.error(err);alert(`新增空白頁失敗：\n${err?.message||err}`)}finally{setBusy(false)}}

function toRoman(num){if(num<=0)return String(num);const vals=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];let n=num,s='';for(const[v,r]of vals)while(n>=v){s+=r;n-=v}return s}
function pageNumberPositionForIndex(index){const p=state.pageNumber.position;if(p!=='outer')return p;return (index+1)%2===1?'right':'left'}
function pageNumberFormatLabel(){const m={number:'1',total:'1 / 全部',dash:'- 1 -',page:'Page 1',zhTotal:'第 1 頁，共 100 頁',roman:'i, ii, iii'};const pos=state.pageNumber.position==='left'?'左下':state.pageNumber.position==='right'?'右下':state.pageNumber.position==='outer'?'奇右偶左':'底部置中';return `${m[state.pageNumber.format]||'1'}｜${pos}`}
function pageNumberText(index,total=state.pages.length){const c=state.pageNumber;if(!c.enabled||index+1<c.fromPage)return'';const n=c.start+(index+1-c.fromPage),last=c.start+Math.max(0,total-c.fromPage);if(c.format==='total')return`${n} / ${last}`;if(c.format==='dash')return`- ${n} -`;if(c.format==='page')return`Page ${n}`;if(c.format==='zhTotal')return`第 ${n} 頁，共 ${last} 頁`;if(c.format==='roman')return toRoman(n);return String(n)}
function renderPageNumberPreview(index,overlay){const text=pageNumberText(index);if(!text||!overlay)return;const c=state.pageNumber,pos=pageNumberPositionForIndex(index),d=document.createElement('div');d.className=`page-number-preview pos-${pos}`;d.textContent=text;d.style.bottom=`${Math.max(4,c.margin)*state.zoom}px`;d.style.fontSize=`${Math.max(6,c.fontSize)*state.zoom}px`;d.style.color=c.color||'#333333';d.style.setProperty('--pn-margin',`${Math.max(4,c.margin)*state.zoom}px`);overlay.appendChild(d)}
function openPageNumberDialog(){if(!state.pages.length)return;const c=state.pageNumber;els.pageNumberPosition.value=c.position;els.pageNumberFormat.value=c.format;els.pageNumberFromPage.value=clamp(c.fromPage,1,state.pages.length);els.pageNumberStart.value=c.start;els.pageNumberSize.value=c.fontSize;els.pageNumberMargin.value=c.margin;els.pageNumberColor.value=c.color;els.pageNumberFromPage.max=state.pages.length;els.pageNumberDialog.showModal()}
function confirmPageNumber(ev){ev.preventDefault();if(!state.pages.length)return;pushUndo();state.pageNumber={enabled:true,position:els.pageNumberPosition.value||'center',format:els.pageNumberFormat.value||'number',fromPage:clamp(parseInt(els.pageNumberFromPage.value||'1',10)||1,1,state.pages.length),start:Math.max(0,parseInt(els.pageNumberStart.value||'1',10)||0),fontSize:clamp(Number(els.pageNumberSize.value)||11,6,48),margin:clamp(Number(els.pageNumberMargin.value)||20,4,100),color:els.pageNumberColor.value||'#333333'};els.pageNumberDialog.close();document.querySelectorAll('.page-overlay').forEach(o=>{const i=Number(o.closest('.pdf-page-shell')?.dataset.index);if(Number.isInteger(i)&&Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,o)});updateUI();scheduleAutosave();showToast('已套用全部頁碼')}
function removePageNumbers(){if(!state.pageNumber.enabled){els.pageNumberDialog.close();return}pushUndo();state.pageNumber.enabled=false;els.pageNumberDialog.close();document.querySelectorAll('.page-overlay').forEach(o=>{const i=Number(o.closest('.pdf-page-shell')?.dataset.index);if(Number.isInteger(i)&&Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,o)});updateUI();scheduleAutosave();showToast('已移除頁碼')}
function hexToPdfRgb(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');const v=m?m[1]:'333333';return PDFLib.rgb(parseInt(v.slice(0,2),16)/255,parseInt(v.slice(2,4),16)/255,parseInt(v.slice(4,6),16)/255)}
function drawPageNumberToCanvas(ctx,w,h,index,scale){const text=pageNumberText(index);if(!text)return;const c=state.pageNumber,fs=Math.max(6,c.fontSize)*scale,margin=Math.max(4,c.margin)*scale;ctx.save();ctx.font=`400 ${fs}px Arial,Helvetica,sans-serif`;ctx.fillStyle=c.color||'#333333';ctx.textBaseline='bottom';const pos=pageNumberPositionForIndex(index);ctx.textAlign=pos==='left'?'left':pos==='right'?'right':'center';const x=pos==='left'?margin:pos==='right'?w-margin:w/2;ctx.fillText(text,x,h-margin);ctx.restore()}
function drawPageNumberToPdfPage(page,index,font){const text=pageNumberText(index);if(!text)return;const c=state.pageNumber,size=Math.max(6,c.fontSize),margin=Math.max(4,c.margin),w=page.getWidth(),tw=font.widthOfTextAtSize(text,size);const pos=pageNumberPositionForIndex(index);let x=(w-tw)/2;if(pos==='left')x=margin;else if(pos==='right')x=w-margin-tw;page.drawText(text,{x:Math.max(0,x),y:margin,size,font,color:hexToPdfRgb(c.color)})}
function friendlyPdfError(err){const msg=err?.message||String(err);if(/password|PasswordException/i.test(msg))return'此 PDF 有密碼或加密保護，瀏覽器無法直接編輯。';if(/InvalidPDF|invalid pdf/i.test(msg))return'PDF 結構損毀或格式不完整。';if(/MissingPDF|not found/i.test(msg))return'找不到 PDF 內容。';return msg}
function openWatermarkDialog(){if(!state.pages.length)return;els.watermarkDialog.showModal()}
function confirmWatermark(ev){ev.preventDefault();const txt=els.watermarkText.value.trim();if(!txt){showToast('請輸入浮水印文字');return}pushUndo();const targets=els.watermarkScope.value==='current'?[currentPageEntry()]:state.pages;for(const p of targets){p.annotations.push({id:uid(),type:'watermark',x:.12,y:.40,w:.76,h:.18,text:txt,fontFamily:'Microsoft JhengHei',fontSize:clamp(Number(els.watermarkSize.value)||44,12,120),color:els.watermarkColor.value||'#808080',bold:true,italic:false,underline:false,align:'center',opacity:clamp(Number(els.watermarkOpacity.value)||.22,.05,.9),rotation:clamp(Number(els.watermarkRotation.value)||-35,-180,180)})}els.watermarkDialog.close();document.querySelectorAll('.page-overlay').forEach(o=>{const i=Number(o.closest('.pdf-page-shell')?.dataset.index);if(Number.isInteger(i)&&Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,o)});rebuildThumbs();scheduleAutosave();showToast(`已加入浮水印｜${targets.length} 頁`)}

async function exportPdf(){
  if(!state.pages.length||state.operation)return;const op=startOperation('export',true);setBusy(true,'正在匯出 PDF','準備文件…',{progress:true,cancelable:true});
  try{
    await ensurePdfLib();if(operationCancelled(op))throw new Error('__CANCELLED__');
    const out=await PDFLib.PDFDocument.create(),sourceDocs=new Map();let sourceNo=0;for(const srcInfo of state.sources){sourceNo++;setBusyProgress(sourceNo,Math.max(1,state.sources.length),`載入來源文件 ${sourceNo} / ${state.sources.length}`);sourceDocs.set(srcInfo.id,await PDFLib.PDFDocument.load(srcInfo.bytes.slice(0),{ignoreEncryption:false,updateMetadata:false}));if(operationCancelled(op))throw new Error('__CANCELLED__')}
    const pageNumberFont=state.pageNumber.enabled?await out.embedFont(PDFLib.StandardFonts.Helvetica):null;
    for(let i=0;i<state.pages.length;i++){
      if(operationCancelled(op))throw new Error('__CANCELLED__');const entry=state.pages[i];setBusyProgress(i,state.pages.length,`正在輸出第 ${i+1} / ${state.pages.length} 頁`);await getPdfJsPage(entry);const pn=pageNumberText(i),mustFlatten=pageRequiresFullFlatten(entry,i),useOverlay=pageUsesOverlayExport(entry,i);
      if(!mustFlatten){const src=sourceDocs.get(entry.sourceId);const[copied]=await out.copyPages(src,[entry.pageIndex]);copied.setRotation(PDFLib.degrees(entry.rotation));out.addPage(copied);if(useOverlay){const overlayResult=await renderNonDestructiveOverlayCanvas(entry,i,2.2);if(operationCancelled(op)){overlayResult.canvas.width=1;overlayResult.canvas.height=1;throw new Error('__CANCELLED__')}const overlayBytes=await canvasToBytes(overlayResult.canvas,'image/png'),overlayImage=await out.embedPng(overlayBytes);copied.drawImage(overlayImage,{x:0,y:0,width:overlayResult.base.width,height:overlayResult.base.height});overlayResult.canvas.width=1;overlayResult.canvas.height=1}if(pn&&pageNumberFont&&state.pageNumber.format!=='zhTotal')drawPageNumberToPdfPage(copied,i,pageNumberFont)}
      else{const scale=await chooseFlattenScaleFromEntry(entry),rendered=await renderEntryCanvas(entry,scale,true);if(operationCancelled(op)){rendered.canvas.width=1;rendered.canvas.height=1;throw new Error('__CANCELLED__')}if(pn)drawPageNumberToCanvas(rendered.canvas.getContext('2d'),rendered.canvas.width,rendered.canvas.height,i,scale);const base=rendered.base,encoded=await encodeCanvasForPdf(rendered.canvas),img=encoded.type==='png'?await out.embedPng(encoded.bytes):await out.embedJpg(encoded.bytes),outPage=out.addPage([base.width,base.height]);outPage.drawImage(img,{x:0,y:0,width:base.width,height:base.height});rendered.canvas.width=1;rendered.canvas.height=1}
      await nextFrame();
    }
    setBusyProgress(state.pages.length,state.pages.length,'正在建立最終 PDF…');applyOutputMetadata(out,sourceDocs.values().next().value);const bytes=await out.save({useObjectStreams:true,addDefaultPage:false,updateFieldAppearances:false});if(operationCancelled(op))throw new Error('__CANCELLED__');downloadBlob(new Blob([bytes],{type:'application/pdf'}),state.fileName);state.undo=[];state.redo=[];markSavedRevision();updateUndoRedo();await recoveryClear();if(els.autoSaveStatus)els.autoSaveStatus.textContent='自動儲存：已匯出，復原點與暫存來源已清除';showToast('PDF 匯出完成');
  }catch(err){if(err?.message==='__CANCELLED__'){showToast('已取消匯出')}else{console.error(err);alert(`匯出失敗：\n${friendlyPdfError(err)}`)}}finally{setBusy(false)}
}

function applyOutputMetadata(out,src){
  try{if(els.clearMetadata.checked){out.setTitle('');out.setAuthor('');out.setSubject('');out.setKeywords([]);out.setCreator('');out.setProducer('')}else if(src){const t=src.getTitle?.();if(t)out.setTitle(t);const a=src.getAuthor?.();if(a)out.setAuthor(a);const s=src.getSubject?.();if(s)out.setSubject(s);const c=src.getCreator?.();if(c)out.setCreator(c);const p=src.getProducer?.();if(p)out.setProducer(p);const k=src.getKeywords?.();if(k)out.setKeywords(String(k).split(/[,;]/).map(x=>x.trim()).filter(Boolean))}}catch(e){console.warn('metadata',e)}
}
async function chooseFlattenScaleFromEntry(entry){const page=await getPdfJsPage(entry),base=page.getViewport({scale:1,rotation:entry.rotation});return chooseFlattenScale(base.width,base.height)}
function chooseFlattenScale(w,h){const px=w*h;if(px>1200000)return 1.7;if(state.pages.length>200)return 1.55;if(state.pages.length>80)return 1.75;return 2.2}
async function renderNonDestructiveOverlayCanvas(entry,index,scale=2.2){const srcPage=await getPdfJsPage(entry),base=srcPage.getViewport({scale:1,rotation:0}),c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(base.width*scale));c.height=Math.max(1,Math.ceil(base.height*scale));const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);const annotations=(entry.annotations||[]).filter(a=>!annotationRequiresSecureFlatten(a));if(annotations.length)await drawAnnotationsToCanvas(ctx,c.width,c.height,annotations,scale);if(pageNumberText(index)&&state.pageNumber.format==='zhTotal')drawPageNumberToCanvas(ctx,c.width,c.height,index,scale);return{canvas:c,base}}
async function renderEntryCanvas(entry,scale=1.8,withAnnotations=true){const srcPage=await getPdfJsPage(entry),base=srcPage.getViewport({scale:1,rotation:entry.rotation}),vp=srcPage.getViewport({scale,rotation:entry.rotation}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);const ctx=c.getContext('2d',{alpha:false});await srcPage.render({canvasContext:ctx,viewport:vp,background:'white'}).promise;if(withAnnotations)await drawAnnotationsToCanvas(ctx,c.width,c.height,entry.annotations,scale);return{canvas:c,base,vp}}
async function drawAnnotationsToCanvas(ctx,w,h,annotations,scale){
  ctx.save();for(const a of annotations){const x=a.x*w,y=a.y*h,aw=a.w*w,ah=a.h*h;if(a.type==='rect'||a.type==='redact'){ctx.save();ctx.fillStyle=a.type==='redact'?'#000000':(a.color||'#fff');ctx.fillRect(x,y,aw,ah);ctx.restore();continue}if(a.type==='image'){const img=await loadAnnotationImage(a.src);ctx.save();ctx.globalAlpha=clamp(Number(a.opacity??1),0,1);ctx.drawImage(img,x,y,aw,ah);ctx.restore();continue}if(a.type==='replace'){ctx.save();ctx.fillStyle=a.bg||'#fff';ctx.fillRect(x,y,aw,ah);ctx.restore()}drawTextAnnotation(ctx,a,x,y,aw,ah,scale)}ctx.restore();
}
function drawTextAnnotation(ctx,a,x,y,w,h,scale){
  const fs=Math.max(6,(a.fontSize||20)*scale),lines=String(a.text||'').split(/\n/),lh=fs*1.22;ctx.save();ctx.globalAlpha=a.opacity??1;ctx.fillStyle=a.color||'#111827';ctx.font=`${a.italic?'italic ':''}${a.bold?'700 ':'400 '}${fs}px "${a.fontFamily||'Microsoft JhengHei'}","Microsoft JhengHei",sans-serif`;ctx.textBaseline='top';ctx.textAlign=a.align==='center'?'center':a.align==='right'?'right':'left';let tx=a.align==='center'?x+w/2:a.align==='right'?x+w:x;
  if(a.type==='watermark'){ctx.translate(x+w/2,y+h/2);ctx.rotate((Number(a.rotation)||0)*Math.PI/180);tx=0;for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],0,(i-(lines.length-1)/2)*lh);ctx.restore();return}
  for(let i=0;i<lines.length;i++){const ty=y+i*lh;ctx.fillText(lines[i],tx,ty,Math.max(1,w));if(a.underline){const m=ctx.measureText(lines[i]);const uw=Math.min(w,m.width),uy=ty+fs*1.06;let ux=tx;if(ctx.textAlign==='center')ux=tx-uw/2;if(ctx.textAlign==='right')ux=tx-uw;ctx.fillRect(ux,uy,uw,Math.max(1,fs*.045))}}ctx.restore();
}
function canvasToBytes(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(async b=>b?resolve(new Uint8Array(await b.arrayBuffer())):reject(new Error('無法建立頁面影像')),type,quality))}
async function encodeCanvasForPdf(canvas){const pixels=canvas.width*canvas.height;if(pixels<=5200000)return{type:'png',bytes:await canvasToBytes(canvas,'image/png')};return{type:'jpg',bytes:await canvasToBytes(canvas,'image/jpeg',.95)}}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function nextFrame(){return new Promise(r=>requestAnimationFrame(()=>r()))}

function openWordDialog(){if(!state.pages.length)return;els.wordDialog.showModal()}
async function confirmWord(ev){ev.preventDefault();const mode=document.querySelector('input[name="wordMode"]:checked')?.value||'smart';els.wordDialog.close();await convertPdfToWord(mode)}
async function convertPdfToWord(mode){
  setBusy(true,'正在轉換 Word',mode==='image'?'版面圖片模式':'擷取文字…');
  try{await ensureJSZip();const zip=new window.JSZip(),media=[],rels=[];let body='';for(let i=0;i<state.pages.length;i++){const entry=state.pages[i];els.busyDetail.textContent=`第 ${i+1} / ${state.pages.length} 頁`;
      if(mode==='image'){const rendered=await renderEntryCanvas(entry,state.pages.length>100?1.15:1.45,true);const bytes=await canvasToBytes(rendered.canvas,'image/jpeg',.90);const name=`image${i+1}.jpg`,rid=`rId${i+1}`;media.push({name,bytes});rels.push({rid,name});body+=imageParagraphXml(rid,i+1,rendered.canvas.width,rendered.canvas.height);rendered.canvas.width=1;rendered.canvas.height=1}
      else{const lines=await extractWordLines(entry,mode==='smart');for(const line of lines)body+=wordParagraphXml(line.text,{fontSize:line.fontSize||11,left:mode==='smart'?line.left:0,bold:false});const added=entry.annotations.filter(a=>['text','replace'].includes(a.type)&&a.text);if(added.length){body+=wordParagraphXml('',{});for(const a of added)body+=wordParagraphXml(a.text,{fontSize:Math.max(8,(a.fontSize||16)*.75),left:mode==='smart'?Math.round(a.x*9000):0,bold:!!a.bold,italic:!!a.italic,underline:!!a.underline})}}
      if(i<state.pages.length-1)body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';await nextFrame()}
    const docXml=docxDocumentXml(body);writeDocxBase(zip,docXml,rels,media.length>0);for(const m of media)zip.file(`word/media/${m.name}`,m.bytes);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},meta=>{els.busyDetail.textContent=`建立 DOCX｜${Math.round(meta.percent)}%`});downloadBlob(blob,state.fileName.replace(/_edited\.pdf$/i,'').replace(/\.pdf$/i,'')+'.docx');showToast('Word 轉換完成')
  }catch(err){console.error(err);alert(`PDF 轉 Word 失敗：\n${err?.message||err}`)}finally{setBusy(false)}
}
async function extractWordLines(entry,smart){const page=await getPdfJsPage(entry),viewport=page.getViewport({scale:1,rotation:entry.rotation}),items=await getTextItemsForPage(entry,page,viewport);const sorted=[...items].sort((a,b)=>Math.abs(a.y-b.y)>.008?a.y-b.y:a.x-b.x);const lines=[];for(const it of sorted){let line=lines.find(l=>Math.abs(l.y-it.y)<.008);if(!line){line={y:it.y,x:it.x,items:[],fontSize:it.fontSize};lines.push(line)}line.items.push(it);line.x=Math.min(line.x,it.x);line.fontSize=Math.max(line.fontSize,it.fontSize)}lines.sort((a,b)=>a.y-b.y);const reps=entry.annotations.filter(a=>a.type==='replace');return lines.map(l=>{l.items.sort((a,b)=>a.x-b.x);let text=l.items.map(i=>i.text).join(' ');for(const r of reps)if(r.original)text=text.replace(r.original,r.text||'');return{text,fontSize:smart?Math.max(8,l.fontSize*.75):11,left:smart?Math.round(l.x*9000):0}}).filter(l=>l.text.trim())}
function wordParagraphXml(text,{fontSize=11,left=0,bold=false,italic=false,underline=false}={}){const sz=Math.round(fontSize*2),rPr=`<w:rPr>${bold?'<w:b/>':''}${italic?'<w:i/>':''}${underline?'<w:u w:val="single"/>':''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:rFonts w:eastAsia="Microsoft JhengHei"/></w:rPr>`;const pPr=left?`<w:pPr><w:ind w:left="${clamp(left,0,10000)}"/></w:pPr>`:'';return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`}
function imageParagraphXml(rid,id,widthPx,heightPx){const maxCx=5943600,maxCy=8200000,ratio=widthPx/heightPx;let cx=maxCx,cy=Math.round(cx/ratio);if(cy>maxCy){cy=maxCy;cx=Math.round(cy*ratio)}return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="PDF Page ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="PDF Page ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`}
function docxDocumentXml(body){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr></w:body></w:document>`}
function writeDocxBase(zip,documentXml,rels,hasImages){
  zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${hasImages?'<Default Extension="jpg" ContentType="image/jpeg"/>':''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.file('word/document.xml',documentXml);zip.file('word/styles.xml',`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:eastAsia="Microsoft JhengHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style></w:styles>`);
  zip.file('word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(r=>`<Relationship Id="${r.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${r.name}"/>`).join('')}</Relationships>`);
  zip.file('docProps/core.xml',`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>GovPDF Editor Export</dc:title><dc:creator>GovPDF Editor Web</dc:creator><cp:lastModifiedBy>GovPDF Editor Web</cp:lastModifiedBy></cp:coreProperties>`);
  zip.file('docProps/app.xml',`<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>GovPDF Editor Web</Application></Properties>`);
}

function handleStageScroll(){
  state.isScrolling=true;document.body.classList.add('fast-scrolling');clearTimeout(state.scrollIdleTimer);
  if(isLargeDocument()){state.pageRenderQueue=state.pageRenderQueue.filter(i=>i===state.currentIndex);state.pageRenderQueued=new Set(state.pageRenderQueue)}
  if(!state.scrollRaf)state.scrollRaf=requestAnimationFrame(()=>{state.scrollRaf=0;const vr=els.stageWrap.getBoundingClientRect(),cx=vr.left+Math.min(vr.width*.5,700),cy=vr.top+vr.height*.42;let sh=document.elementFromPoint(cx,cy)?.closest?.('.pdf-page-shell');if(!sh){const candidates=[];for(let d=0;d<=3;d++){candidates.push(pageShell(state.currentIndex+d));if(d)candidates.push(pageShell(state.currentIndex-d))}let best=null,dist=Infinity;for(const c of candidates.filter(Boolean)){const r=c.getBoundingClientRect(),dd=Math.abs((r.top+r.bottom)/2-cy);if(dd<dist){dist=dd;best=c}}sh=best}const best=sh?Number(sh.dataset.index):-1;if(best>=0&&best!==state.currentIndex){const prev=state.currentIndex;state.currentIndex=best;setSingleAnnotationSelection(null);syncActivePageRefs(best);updateCurrentPageUI(prev,best);schedulePageRender(best,true);if(state.tool==='edit-text')renderPageAtIndex(best,true)}});
  state.scrollIdleTimer=setTimeout(()=>{state.isScrolling=false;document.body.classList.remove('fast-scrolling');scheduleNearbyPageRenders(state.currentIndex,true);releaseFarPageCanvases();updatePerformanceStatus()},180)
}

function bindEvents(){
  els.openBtn.onclick=()=>els.fileInput.click();if(els.saveProjectBtn)els.saveProjectBtn.onclick=saveProjectFile;if(els.openProjectBtn)els.openProjectBtn.onclick=()=>els.projectInput.click();if(els.projectInput)els.projectInput.onchange=()=>{const f=els.projectInput.files[0];els.projectInput.value='';openProjectFile(f)};if(els.jumpPageBtn)els.jumpPageBtn.onclick=jumpToPage;if(els.jumpPageInput)els.jumpPageInput.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpToPage()}};els.fileInput.onchange=()=>{const f=els.fileInput.files[0];els.fileInput.value='';openFile(f)};els.mergeBtn.onclick=()=>els.mergeInput.click();els.mergeInput.onchange=()=>{const f=[...els.mergeInput.files];els.mergeInput.value='';mergeFiles(f)};els.insertBtn.onclick=()=>els.insertInput.click();els.insertInput.onchange=()=>{const f=els.insertInput.files[0];els.insertInput.value='';insertPdfAfterCurrent(f)};if(els.insertImageBtn)els.insertImageBtn.onclick=()=>els.imageInput?.click();if(els.imageInput)els.imageInput.onchange=()=>{const f=els.imageInput.files[0];els.imageInput.value='';insertImageFile(f)};els.exportBtn.onclick=openPreflightDialog;els.wordBtn.onclick=openWordDialog;if(els.addPageBtn)els.addPageBtn.onclick=openAddPageDialog;if(els.confirmAddPageBtn)els.confirmAddPageBtn.onclick=confirmAddPage;
  document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));els.undoBtn.onclick=undo;els.redoBtn.onclick=redo;els.rotateLeftBtn.onclick=()=>rotateCurrent(-90);els.rotateRightBtn.onclick=()=>rotateCurrent(90);els.deletePageBtn.onclick=deleteCurrentPage;els.deleteObjectBtn.onclick=deleteSelectedAnnotation;els.applyTextBtn.onclick=applyCurrentTextSettings;els.cancelModeBtn.onclick=()=>setTool('select');els.watermarkBtn.onclick=openWatermarkDialog;if(els.pageNumberBtn)els.pageNumberBtn.onclick=openPageNumberDialog;if(els.confirmPageNumberBtn)els.confirmPageNumberBtn.onclick=confirmPageNumber;if(els.removePageNumbersBtn)els.removePageNumbersBtn.onclick=removePageNumbers;els.movePageUpBtn.onclick=()=>moveCurrentPage(-1);els.movePageDownBtn.onclick=()=>moveCurrentPage(1);els.organizeBtn.onclick=openOrganizer;if(els.snapEnabled){state.snapEnabled=els.snapEnabled.checked;els.snapEnabled.onchange=()=>{state.snapEnabled=els.snapEnabled.checked;localStorage.setItem('govpdf-snap-enabled',state.snapEnabled?'1':'0')}}if(els.lockObjectBtn)els.lockObjectBtn.onclick=toggleLockSelected;if(els.bringFrontBtn)els.bringFrontBtn.onclick=()=>moveSelectedLayer(true);if(els.sendBackBtn)els.sendBackBtn.onclick=()=>moveSelectedLayer(false);if(els.confirmExportBtn)els.confirmExportBtn.onclick=e=>{e.preventDefault();els.preflightDialog.close();openPrivacyWarningIfNeeded()};if(els.privacyProceedBtn)els.privacyProceedBtn.onclick=e=>{e.preventDefault();els.privacyWarningDialog.close();exportPdf()};
  if(els.performanceMode)els.performanceMode.onchange=()=>{state.performanceMode=els.performanceMode.value||'auto';localStorage.setItem('govpdf-performance-mode',state.performanceMode);releaseFarPageCanvases();renderContinuousDocument({scrollToCurrent:true});updatePerformanceStatus()};
  if(els.orgSelectAllBtn)els.orgSelectAllBtn.onclick=organizerSelectAll;if(els.orgClearBtn)els.orgClearBtn.onclick=organizerClearSelection;if(els.orgRotateLeftBtn)els.orgRotateLeftBtn.onclick=()=>organizerBatchRotate(-90);if(els.orgRotateRightBtn)els.orgRotateRightBtn.onclick=()=>organizerBatchRotate(90);if(els.orgDuplicateBtn)els.orgDuplicateBtn.onclick=organizerBatchDuplicate;if(els.orgDeleteBtn)els.orgDeleteBtn.onclick=organizerBatchDelete;
  if(els.restoreRecoveryBtn)els.restoreRecoveryBtn.onclick=restoreRecoverySession;if(els.discardRecoveryBtn)els.discardRecoveryBtn.onclick=discardRecovery;if(els.busyCancelBtn)els.busyCancelBtn.onclick=()=>{if(state.operation?.cancelable){state.operation.cancelled=true;els.busyCancelBtn.disabled=true;els.busyDetail.textContent='正在安全停止作業…'}};
  els.blockColor.oninput=()=>{updatePrivacyUi();const arr=selectedAnnotations().filter(a=>a.type==='rect');if(arr.length){if(arr.some(a=>a.locked)){els.blockColor.value=arr[0]?.color||'#ffffff';updatePrivacyUi();showToast('🔒 包含鎖定物件，請先解除鎖定');return}if(arr.every(a=>a.color===els.blockColor.value))return;markDirtyRevision();for(const a of arr)a.color=els.blockColor.value;renderAnnotations();markCurrentThumbEdited();scheduleAutosave()}};if(els.clearMetadata)els.clearMetadata.onchange=updatePrivacyUi;
  els.zoomOutBtn.onclick=()=>changeZoom(state.zoom-.15);els.zoomInBtn.onclick=()=>changeZoom(state.zoom+.15);els.fitBtn.onclick=fitWidth;els.prevBtn.onclick=()=>selectPage(state.currentIndex-1);els.nextBtn.onclick=()=>selectPage(state.currentIndex+1);if(els.sidePrevBtn)els.sidePrevBtn.onclick=()=>selectPage(state.currentIndex-1);if(els.sideNextBtn)els.sideNextBtn.onclick=()=>selectPage(state.currentIndex+1);
  els.viewer.addEventListener('pointerdown',viewerPointerDown);window.addEventListener('pointermove',viewerPointerMove);window.addEventListener('pointerup',viewerPointerUp);
  els.stageWrap.addEventListener('wheel',(e)=>{if(e.ctrlKey&&state.pages.length){e.preventDefault();changeZoom(state.zoom+(e.deltaY<0?.12:-.12))}else if(e.shiftKey&&state.pages.length){e.preventDefault();els.stageWrap.scrollLeft+=e.deltaY}},{passive:false});els.stageWrap.addEventListener('scroll',handleStageScroll,{passive:true});
  els.confirmReplaceTextBtn.onclick=confirmReplaceText;els.confirmWatermarkBtn.onclick=confirmWatermark;els.confirmWordBtn.onclick=confirmWord;
  const stop=(e)=>{e.preventDefault()};['dragenter','dragover','dragleave'].forEach(n=>window.addEventListener(n,stop));window.addEventListener('dragenter',()=>els.dropHint.classList.add('dragover'));window.addEventListener('dragleave',(e)=>{if(e.clientX===0&&e.clientY===0)els.dropHint.classList.remove('dragover')});window.addEventListener('drop',(e)=>{e.preventDefault();els.dropHint.classList.remove('dragover');const files=[...e.dataTransfer.files].filter(f=>/\.pdf$/i.test(f.name));if(!files.length)return;if(!state.pages.length)openFile(files[0]).then(()=>files.length>1&&mergeFiles(files.slice(1)));else mergeFiles(files)});
  window.addEventListener('keydown',(e)=>{const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName),mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();if(mod&&key==='z'){e.preventDefault();undo()}else if(mod&&key==='y'){e.preventDefault();redo()}else if(mod&&key==='s'){e.preventDefault();if(state.pages.length)openPreflightDialog()}else if(!typing&&mod&&key==='c'&&selectedAnnotationIdSet().size){e.preventDefault();copySelectedAnnotation()}else if(!typing&&mod&&key==='v'&&state.annotationClipboard){e.preventDefault();pasteAnnotation()}else if(!typing&&mod&&key==='d'&&selectedAnnotationIdSet().size){e.preventDefault();duplicateSelectedAnnotation()}else if(!typing&&e.key==='Delete'){deleteSelectedAnnotation()}else if(!typing&&selectedAnnotationIdSet().size&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?10:1;nudgeSelectedAnnotation(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)}else if(!typing&&e.key==='ArrowLeft')selectPage(state.currentIndex-1);else if(!typing&&e.key==='ArrowRight')selectPage(state.currentIndex+1);else if(!typing&&e.key==='PageUp'){e.preventDefault();selectPage(state.currentIndex-1)}else if(!typing&&e.key==='PageDown'){e.preventDefault();selectPage(state.currentIndex+1)}else if(!typing&&e.key==='Home'){e.preventDefault();selectPage(0)}else if(!typing&&e.key==='End'){e.preventDefault();selectPage(state.pages.length-1)}});
  window.addEventListener('resize',()=>{clearTimeout(window.__govpdfResizeTimer);window.__govpdfResizeTimer=setTimeout(()=>{updatePerformanceStatus();releaseFarPageCanvases();scheduleNearbyPageRenders(state.currentIndex,true)},180)});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasUnsavedEdits())saveRecoveryNow()});window.addEventListener('pagehide',()=>{if(hasUnsavedEdits())saveRecoveryNow()});window.addEventListener('beforeunload',(e)=>{if(hasUnsavedEdits()){e.preventDefault();e.returnValue=''}});
}

async function init(){
  bindEvents();
  updatePrivacyUi();
  updateUI();
  await cleanupLegacyCaches();
  try{
    state.performanceMode=localStorage.getItem('govpdf-performance-mode')||'auto';state.snapEnabled=localStorage.getItem('govpdf-snap-enabled')!=='0';if(els.performanceMode)els.performanceMode.value=state.performanceMode;if(els.snapEnabled)els.snapEnabled.checked=state.snapEnabled;await loadViewerCore();updatePerformanceStatus();await checkRecovery();
  }catch(err){
    console.error(err);
    const msg=err?.message||String(err);
    els.libStatus.textContent='❌ PDF 核心載入失敗｜點此看原因';
    els.libStatus.classList.add('error');
    els.libStatus.title=msg;
    els.libStatus.style.cursor='pointer';
    els.libStatus.onclick=()=>alert(`GovPDF Editor Web V${APP_VERSION} PDF 核心載入失敗。

${msg}`);
  }
}

/* V3.6.4 Image Insert & Resize Edition ---------------------------------
 * - revision based dirty-state (prevents post-export recovery re-persistence)
 * - GitHub Pages privacy mode (no persistent source PDF bytes)
 * - hostile .govpdf validation / bounded ZIP processing
 * - heavy DOM virtualization for large documents
 * - true object-lock semantics
 */
const V363_LIMITS = Object.freeze({
  projectFileBytes: 1024 * 1024 * 1024,
  projectJsonBytes: 20 * 1024 * 1024,
  projectEntries: 5205,
  projectSources: 100,
  projectPages: 5000,
  annotationsPerPage: 5000,
  annotationTextChars: 100000,
  sourceBytes: 600 * 1024 * 1024,
  totalUncompressedBytes: 1200 * 1024 * 1024,
  compressionRatio: 200,
  imageAssets: 500,
  imageBytes: 20 * 1024 * 1024
});
const V363_ALLOWED_ANNOTATION_TYPES = new Set(['rect','text','replace','watermark','redact','image']);
function isGitHubPagesPrivacyMode(){return location.protocol==='https:' && /(^|\.)github\.io$/i.test(location.hostname)}
function resetRevisionState(){state.editRevision=0;state.savedRevision=0}
function markDirtyRevision(){state.editRevision=(Number(state.editRevision)||0)+1}
function markSavedRevision(){state.savedRevision=Number(state.editRevision)||0}
hasUnsavedEdits = function(){return (Number(state.editRevision)||0)!==(Number(state.savedRevision)||0)};
const __v362PushUndo=pushUndo;
pushUndo = function(){markDirtyRevision();return __v362PushUndo()};
const __v362Restore=restore;
restore = function(snap){markDirtyRevision();return __v362Restore(snap)};
recoverySerializable = function(){return{appVersion:APP_VERSION,savedAt:Date.now(),fileName:state.fileName,currentIndex:state.currentIndex,zoom:state.zoom,pageNumber:deepClone(state.pageNumber),performanceMode:state.performanceMode,pages:deepClone(state.pages),editRevision:Number(state.editRevision)||0,savedRevision:Number(state.savedRevision)||0}};
const __v362ScheduleAutosave=scheduleAutosave;
scheduleAutosave = function(){if(state.githubPrivacyMode||!hasUnsavedEdits())return;return __v362ScheduleAutosave()};
const __v362SaveRecoveryNow=saveRecoveryNow;
saveRecoveryNow = async function(){if(state.githubPrivacyMode||!hasUnsavedEdits())return;return __v362SaveRecoveryNow()};
async function purgeRecoveryDatabase(){try{await recoveryClear()}catch{}try{await new Promise(resolve=>{const req=indexedDB.deleteDatabase('GovPDFEditorRecovery');req.onsuccess=req.onerror=req.onblocked=()=>resolve()})}catch(e){console.warn('recovery DB purge',e)}}
const __v362CheckRecovery=checkRecovery;
checkRecovery = async function(){
  if(state.githubPrivacyMode){state.recoveryDisabled=true;await purgeRecoveryDatabase();if(els.autoSaveStatus)els.autoSaveStatus.textContent='🔐 GitHub 隱私模式：不保存來源 PDF 復原資料';return}
  return __v362CheckRecovery();
};
const __v362OpenFile=openFile;
openFile = async function(file){
  const before=state.sources;
  await __v362OpenFile(file);
  if(state.sources!==before){resetRevisionState();state.recoveryDisabled=!!state.githubPrivacyMode;state.recoverySourceSignature='';if(els.autoSaveStatus)els.autoSaveStatus.textContent=state.githubPrivacyMode?'🔐 GitHub 隱私模式：不保存來源 PDF 復原資料':'自動儲存：待第一次修改'}
};
const __v362RestoreRecoverySession=restoreRecoverySession;
restoreRecoverySession = async function(){
  const data=state.recoveryAvailable;
  await __v362RestoreRecoverySession();
  if(data&&state.pages.length){state.editRevision=Number.isFinite(Number(data.editRevision))?Number(data.editRevision):1;state.savedRevision=Number.isFinite(Number(data.savedRevision))?Number(data.savedRevision):0;if(!hasUnsavedEdits())state.editRevision=state.savedRevision+1;scheduleAutosave()}
};

function v363ZipStat(entry){const d=entry?._data||{};return{uncompressed:Number(d.uncompressedSize)||0,compressed:Number(d.compressedSize)||0}}
function v363AssertSafeZipPath(name){const n=String(name||'').replace(/\\/g,'/');if(!n||n.startsWith('/')||/^[A-Za-z]:/.test(n)||n.split('/').includes('..')||n.includes('\0'))throw new Error(`專案含不安全路徑：${name}`);return n}
function v363Finite(v,min=-Infinity,max=Infinity){const n=Number(v);return Number.isFinite(n)&&n>=min&&n<=max}

function v363SanitizePageNumber(p){
  const src=(p&&typeof p==='object'&&!Array.isArray(p))?p:{};const positions=new Set(['center','left','right','book']);const formats=new Set(['number','total','dash','page','zhTotal','roman']);
  return{enabled:!!src.enabled,position:positions.has(src.position)?src.position:'center',format:formats.has(src.format)?src.format:'number',fromPage:clamp(Number.parseInt(src.fromPage,10)||1,1,V363_LIMITS.projectPages),start:clamp(Number.parseInt(src.start,10)||1,0,1000000),fontSize:clamp(Number(src.fontSize)||11,6,48),margin:clamp(Number(src.margin)||20,4,100),color:typeof src.color==='string'&&src.color.length<=64?src.color:'#333333'}
}
function v363ValidateAnnotation(a,pageNo){
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error(`第 ${pageNo} 頁含無效標註`);
  if(!V363_ALLOWED_ANNOTATION_TYPES.has(a.type))throw new Error(`第 ${pageNo} 頁含不支援標註類型：${String(a.type)}`);
  if(typeof a.id!=='string'||!a.id||a.id.length>160)throw new Error(`第 ${pageNo} 頁標註 ID 不合法`);
  for(const k of ['x','y','w','h'])if(!v363Finite(a[k],-0.05,1.05))throw new Error(`第 ${pageNo} 頁標註座標不合法`);
  if(Number(a.w)<=0||Number(a.h)<=0)throw new Error(`第 ${pageNo} 頁標註尺寸不合法`);
  if(['text','replace','watermark'].includes(a.type)&&String(a.text||'').length>V363_LIMITS.annotationTextChars)throw new Error(`第 ${pageNo} 頁文字物件過大`);
  if(a.type==='image'){if(a.src!=null)throw new Error(`第 ${pageNo} 頁圖片不得直接內嵌於 project.json`);if(typeof a.imagePath!=='string'||!/^images\/image_[0-9]{4}\.(?:png|jpg|webp)$/i.test(a.imagePath))throw new Error(`第 ${pageNo} 頁圖片路徑不合法`);if(!IMAGE_ALLOWED_MIME.has(String(a.imageMime||'').toLowerCase()))throw new Error(`第 ${pageNo} 頁圖片格式不支援`);if(String(a.imageName||'').length>255)throw new Error(`第 ${pageNo} 頁圖片名稱過長`);if(a.naturalWidth!=null&&!v363Finite(a.naturalWidth,1,50000))throw new Error(`第 ${pageNo} 頁圖片寬度不合法`);if(a.naturalHeight!=null&&!v363Finite(a.naturalHeight,1,50000))throw new Error(`第 ${pageNo} 頁圖片高度不合法`)}
  if(a.fontSize!=null&&!v363Finite(a.fontSize,1,1000))throw new Error(`第 ${pageNo} 頁字級不合法`);if(a.color!=null&&String(a.color).length>64)throw new Error(`第 ${pageNo} 頁顏色值過長`);if(a.fontFamily!=null&&String(a.fontFamily).length>256)throw new Error(`第 ${pageNo} 頁字型名稱過長`);if(a.original!=null&&String(a.original).length>V363_LIMITS.annotationTextChars)throw new Error(`第 ${pageNo} 頁原文字資料過大`);if(a.opacity!=null&&!v363Finite(a.opacity,0,1))throw new Error(`第 ${pageNo} 頁透明度不合法`);if(a.rotation!=null&&!v363Finite(a.rotation,-36000,36000))throw new Error(`第 ${pageNo} 頁物件旋轉值不合法`);
}
async function v363ValidateAndReadProject(file){
  if(!file||!/\.govpdf$/i.test(file.name||''))throw new Error('請選擇 .govpdf 專案檔');
  if(file.size>V363_LIMITS.projectFileBytes)throw new Error('GovPDF 專案超過 1 GB 安全上限');
  const JSZip=await ensureJSZip(),zip=await JSZip.loadAsync(await file.arrayBuffer(),{createFolders:false});
  const entries=Object.values(zip.files);if(entries.length>V363_LIMITS.projectEntries)throw new Error(`專案項目過多（${entries.length}）`);
  let total=0;
  for(const e of entries){v363AssertSafeZipPath(e.name);const z=v363ZipStat(e);total+=z.uncompressed;if(z.uncompressed>0&&z.compressed>0&&z.uncompressed/z.compressed>V363_LIMITS.compressionRatio)throw new Error(`偵測到異常壓縮比例：${e.name}`)}
  if(total>V363_LIMITS.totalUncompressedBytes)throw new Error('專案解壓後容量超過 1.2 GB 安全上限');
  const pf=zip.file('project.json');if(!pf)throw new Error('不是有效的 GovPDF 專案：缺少 project.json');
  const ps=v363ZipStat(pf);if(ps.uncompressed>V363_LIMITS.projectJsonBytes)throw new Error('project.json 超過 20 MB 安全上限');
  const manifestText=await pf.async('string');if(new Blob([manifestText]).size>V363_LIMITS.projectJsonBytes)throw new Error('project.json 超過 20 MB 安全上限');
  let manifest;try{manifest=JSON.parse(manifestText)}catch{throw new Error('project.json JSON 格式損毀')}
  if(manifest?.format!=='GovPDFProject'||!Array.isArray(manifest.sources)||!Array.isArray(manifest.pages))throw new Error('GovPDF 專案格式不正確');
  if(manifest.sources.length<1||manifest.sources.length>V363_LIMITS.projectSources)throw new Error(`來源 PDF 數量超過安全上限（${V363_LIMITS.projectSources}）`);
  if(manifest.pages.length<1||manifest.pages.length>V363_LIMITS.projectPages)throw new Error(`頁數超過安全上限（${V363_LIMITS.projectPages}）`);
  const ids=new Set(),paths=new Set();
  for(const src of manifest.sources){
    if(!src||typeof src!=='object'||typeof src.id!=='string'||!src.id||src.id.length>160||ids.has(src.id))throw new Error('來源 PDF ID 不合法或重複');ids.add(src.id);
    const path=v363AssertSafeZipPath(src.path);if(!/^sources\/[^/]{1,180}\.pdf$/i.test(path)||paths.has(path))throw new Error(`來源 PDF 路徑不合法：${path}`);paths.add(path);
    if(String(src.name||'').length>512)throw new Error('來源 PDF 名稱過長');const zf=zip.file(path);if(!zf)throw new Error(`專案缺少來源：${path}`);const zs=v363ZipStat(zf);if(zs.uncompressed>V363_LIMITS.sourceBytes)throw new Error(`來源 PDF 超過 600 MB：${src.name||path}`);
  }
  for(let i=0;i<manifest.pages.length;i++){
    const p=manifest.pages[i];if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id||p.id.length>160||!ids.has(p.sourceId)||!Number.isInteger(Number(p.pageIndex))||Number(p.pageIndex)<0)throw new Error(`第 ${i+1} 頁來源資訊不合法`);
    if(!Array.isArray(p.annotations)||p.annotations.length>V363_LIMITS.annotationsPerPage)throw new Error(`第 ${i+1} 頁標註數超過安全上限`);
    if(p.rotation!=null&&!v363Finite(p.rotation,-36000,36000))throw new Error(`第 ${i+1} 頁旋轉值不合法`);if(p.baseWidth!=null&&!v363Finite(p.baseWidth,1,50000))throw new Error(`第 ${i+1} 頁寬度不合法`);if(p.baseHeight!=null&&!v363Finite(p.baseHeight,1,50000))throw new Error(`第 ${i+1} 頁高度不合法`);if(p.pendingRotation!=null&&!v363Finite(p.pendingRotation,-36000,36000))throw new Error(`第 ${i+1} 頁待處理旋轉值不合法`);
    p.annotations.forEach(a=>v363ValidateAnnotation(a,i+1));
  }
  const imagePaths=new Set();for(const p of manifest.pages){for(const a of p.annotations||[]){if(a.type!=='image')continue;imagePaths.add(a.imagePath);const zf=zip.file(a.imagePath);if(!zf)throw new Error(`專案缺少圖片：${a.imagePath}`);const zs=v363ZipStat(zf);if(zs.uncompressed>V363_LIMITS.imageBytes)throw new Error(`專案圖片超過 20 MB：${a.imageName||a.imagePath}`)}}if(imagePaths.size>V363_LIMITS.imageAssets)throw new Error(`專案圖片數量超過安全上限（${V363_LIMITS.imageAssets}）`);
  return{zip,manifest};
}
async function v363OpenProjectFile(file){
  if(!file)return;if(state.pages.length&&hasUnsavedEdits()&&!confirm('目前文件有尚未匯出的修改。\n\n確定要開啟 GovPDF 專案並取代目前工作嗎？'))return;
  setBusy(true,'正在安全檢查 GovPDF 專案',file.name,{progress:true});state.autosaveSuspended=true;
  try{
    await loadViewerCore();const{zip,manifest}=await v363ValidateAndReadProject(file),asset=coreAsset?{cMapUrl:coreAsset.cmaps,standardFontDataUrl:coreAsset.standardFonts,wasmUrl:coreAsset.wasm,iccUrl:coreAsset.iccs}:{};const sources=[],pageCounts=new Map();let actualTotal=0;
    for(let i=0;i<manifest.sources.length;i++){
      const meta=manifest.sources[i],zf=zip.file(meta.path),bytes=await zf.async('uint8array');actualTotal+=bytes.byteLength;if(bytes.byteLength>V363_LIMITS.sourceBytes)throw new Error(`來源 PDF 超過 600 MB：${meta.name||meta.path}`);if(actualTotal>V363_LIMITS.totalUncompressedBytes)throw new Error('來源 PDF 解壓後總容量超過 1.2 GB 安全上限');
      const ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),pdfjsDoc=await pdfjsLib.getDocument({data:new Uint8Array(ab.slice(0)),...asset,cMapPacked:true}).promise;sources.push({id:meta.id,name:String(meta.name||'source.pdf'),bytes:ab,pdfjsDoc});pageCounts.set(meta.id,pdfjsDoc.numPages);setBusyProgress(i+1,manifest.sources.length,`驗證來源 ${i+1} / ${manifest.sources.length}`)
    }
    for(let i=0;i<manifest.pages.length;i++){const p=manifest.pages[i],count=pageCounts.get(p.sourceId)||0;if(Number(p.pageIndex)>=count)throw new Error(`第 ${i+1} 頁引用不存在的來源頁碼`)}
    const hydratedPages=deepClone(manifest.pages);let imageCount=0;for(const p of hydratedPages){for(const a of p.annotations||[]){if(a.type!=='image')continue;const bytes=await zip.file(a.imagePath).async('uint8array');a.src=await bytesToImageDataUrl(bytes,a.imageMime);delete a.imagePath;imageCount++}}
    await recoveryClear();state.sources=sources;state.pages=hydratedPages;state.imageCache.clear();state.currentIndex=clamp(Number(manifest.currentIndex)||0,0,Math.max(0,state.pages.length-1));state.zoom=clamp(Number(manifest.zoom)||1.15,.35,4);state.performanceMode=['auto','quality','balanced','large'].includes(manifest.performanceMode)?manifest.performanceMode:'auto';state.pageNumber=v363SanitizePageNumber(manifest.pageNumber);state.fileName=String(manifest.fileName||file.name.replace(/\.govpdf$/i,'')+'_edited.pdf').slice(0,512);state.undo=[];state.redo=[];state.textCache.clear();setSingleAnnotationSelection(null);state.recoveryDisabled=!!state.githubPrivacyMode;state.recoverySourceSignature='';resetRevisionState();if(els.performanceMode)els.performanceMode.value=state.performanceMode;rebuildThumbs();await renderContinuousDocument({scrollToCurrent:true});updateUI();showToast(`已安全開啟 GovPDF 專案｜${state.pages.length} 頁`)
  }catch(e){console.error(e);alert(`開啟專案失敗：\n${e?.message||e}`)}finally{state.autosaveSuspended=false;setBusy(false)}
}

// Lock means immutable until explicitly unlocked.
const __v362DeleteSelectedAnnotation=deleteSelectedAnnotation;
deleteSelectedAnnotation = function(){const arr=selectedAnnotations();if(arr.some(a=>a.locked)){showToast('🔒 包含鎖定物件，請先解除鎖定');return}return __v362DeleteSelectedAnnotation()};
const __v362ApplyCurrentTextSettings=applyCurrentTextSettings;
applyCurrentTextSettings = function(){const arr=selectedAnnotations().filter(a=>['text','replace','watermark'].includes(a.type));if(arr.some(a=>a.locked)){showToast('🔒 鎖定文字不可修改，請先解除鎖定');return}return __v362ApplyCurrentTextSettings()};
const __v362MoveSelectedLayer=moveSelectedLayer;
moveSelectedLayer = function(toFront){if(selectedAnnotations().some(a=>a.locked)){showToast('🔒 鎖定物件不可調整圖層，請先解除鎖定');return}return __v362MoveSelectedLayer(toFront)};

// Large-document heavy DOM virtualization. Distant pages retain only a height placeholder.
function virtualDomEnabled(){return state.pages.length>=120&&effectivePerformanceMode()==='large'}
function virtualDomRadius(){return virtualDomEnabled()?8:Infinity}
function pageItem(index){return els.pagesContainer?.querySelector(`.pdf-page-shell[data-index="${index}"],.pdf-page-placeholder[data-index="${index}"]`)||null}
function createV363PageShell(entry,i){
  const sz=entryDisplaySize(entry),w=Math.max(1,sz.width*state.zoom),h=Math.max(1,sz.height*state.zoom),shell=document.createElement('section');shell.className='pdf-page-shell'+(i===state.currentIndex?' current':'');shell.dataset.index=i;shell.dataset.pageId=entry.id;
  const badge=document.createElement('div');badge.className='page-number-badge';badge.textContent=`第 ${i+1} 頁`;const stage=document.createElement('div');stage.className='page-stage';stage.style.width=`${w}px`;stage.style.height=`${h}px`;
  const canvas=document.createElement('canvas');canvas.className='pdf-page-canvas';canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.width=1;canvas.height=1;const textLayer=document.createElement('div');textLayer.className='page-text-hit-layer text-hit-layer';const overlay=document.createElement('div');overlay.className=`page-overlay overlay tool-${state.tool}`;overlay.dataset.index=i;
  overlay.addEventListener('pointerdown',overlayPointerDown);overlay.addEventListener('pointermove',overlayPointerMove);overlay.addEventListener('pointerup',overlayPointerUp);stage.addEventListener('pointerdown',ev=>{if(ev.button===0&&!ev.target.closest('.annotation')&&!ev.target.closest('.text-hit'))setCurrentIndex(i)});stage.append(canvas,textLayer,overlay);shell.append(badge,stage);if(Math.abs(i-state.currentIndex)<=2)renderAnnotationsForPage(i,overlay);return shell
}
function createV363Placeholder(entry,i){const sz=entryDisplaySize(entry),w=Math.max(1,sz.width*state.zoom),h=Math.max(1,sz.height*state.zoom),ph=document.createElement('div');ph.className='pdf-page-placeholder';ph.dataset.index=i;ph.dataset.pageId=entry.id;ph.style.width=`${w}px`;ph.style.height=`${h+24}px`;ph.setAttribute('aria-label',`第 ${i+1} 頁（虛擬化）`);ph.addEventListener('click',()=>setCurrentIndex(i,{scroll:true}));return ph}
renderContinuousDocument = async function({scrollToCurrent=false,preserveScroll=false}={}){
  state.renderToken++;if(!state.pages.length){els.pagesContainer.innerHTML='';return}const oldTop=els.stageWrap.scrollTop,center=state.currentIndex,r=virtualDomRadius();if(state.pageObserver)state.pageObserver.disconnect();state.pageRenderQueue.length=0;state.pageRenderQueued.clear();els.pagesContainer.innerHTML='';const frag=document.createDocumentFragment();
  state.pages.forEach((entry,i)=>{frag.appendChild(Math.abs(i-center)<=r?createV363PageShell(entry,i):createV363Placeholder(entry,i))});els.pagesContainer.appendChild(frag);syncActivePageRefs(state.currentIndex);
  state.pageObserver=new IntersectionObserver(entries=>{for(const ent of entries)if(ent.isIntersecting)schedulePageRender(Number(ent.target.dataset.index),false)},{root:els.stageWrap,rootMargin:isLargeDocument()?'300px 0px':'650px 0px',threshold:.01});els.pagesContainer.querySelectorAll('.pdf-page-shell').forEach(sh=>state.pageObserver.observe(sh));
  await renderPageAtIndex(state.currentIndex,true);scheduleNearbyPageRenders(state.currentIndex,false);releaseFarPageCanvases();updateUI();requestAnimationFrame(()=>{if(scrollToCurrent)pageShell(state.currentIndex)?.scrollIntoView({block:'start'});else if(preserveScroll)els.stageWrap.scrollTop=oldTop});
};
setCurrentIndex = function(index,{scroll=false}={}){
  if(index<0||index>=state.pages.length)return;const prev=state.currentIndex;state.currentIndex=index;state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();state.pendingTextHit=null;const item=pageItem(index);
  if(virtualDomEnabled()&&(!item||item.classList.contains('pdf-page-placeholder'))){renderContinuousDocument({scrollToCurrent:scroll,preserveScroll:!scroll});return}
  const sh=syncActivePageRefs(index);updateCurrentPageUI(prev,index);updateUI();if(scroll&&sh)sh.scrollIntoView({behavior:'smooth',block:'start'});scheduleNearbyPageRenders(index,true);if(state.tool==='edit-text')renderPageAtIndex(index,true)
};
updateUI = function(){
  const has=state.pages.length>0;els.exportBtn.disabled=!has;els.insertBtn.disabled=!has;els.wordBtn.disabled=!has;els.rotateLeftBtn.disabled=!has;els.rotateRightBtn.disabled=!has;els.deletePageBtn.disabled=!has;els.zoomInBtn.disabled=!has;els.zoomOutBtn.disabled=!has;els.fitBtn.disabled=!has;els.prevBtn.disabled=!has||state.currentIndex<=0;els.nextBtn.disabled=!has||state.currentIndex>=state.pages.length-1;if(els.addPageBtn)els.addPageBtn.disabled=!has;if(els.insertImageBtn)els.insertImageBtn.disabled=!has;if(els.saveProjectBtn)els.saveProjectBtn.disabled=!has;els.movePageUpBtn.disabled=!has||state.currentIndex<=0;els.movePageDownBtn.disabled=!has||state.currentIndex>=state.pages.length-1;els.organizeBtn.disabled=!has;if(els.pageNumberBtn)els.pageNumberBtn.disabled=!has;if(els.pageNumberStatus)els.pageNumberStatus.textContent=state.pageNumber.enabled?`頁碼：已套用｜${pageNumberFormatLabel()}`:'頁碼：未套用';
  const selected=selectedAnnotations(),selectedCount=selected.length,hasLocked=selected.some(a=>a.locked);els.pageCount.textContent=`${state.pages.length} 頁`;els.pageLabel.textContent=has?`第 ${state.currentIndex+1} / ${state.pages.length} 頁`:'第 0 / 0 頁';els.zoomLabel.textContent=`${Math.round(state.zoom*100)}%`;els.deleteObjectBtn.disabled=!selectedCount||hasLocked;if(els.objectSelectionStatus)els.objectSelectionStatus.textContent=selectedCount?`物件：已選 ${selectedCount} 個${hasLocked?'｜🔒 含鎖定':''}`:'物件：未選取';if(els.lockObjectBtn)els.lockObjectBtn.disabled=!selectedCount;if(els.bringFrontBtn)els.bringFrontBtn.disabled=!selectedCount||hasLocked;if(els.sendBackBtn)els.sendBackBtn.disabled=!selectedCount||hasLocked;if(els.applyTextBtn)els.applyTextBtn.disabled=!selected.some(a=>['text','replace','watermark'].includes(a.type))||hasLocked;if(els.jumpPageInput){els.jumpPageInput.max=Math.max(1,state.pages.length);if(has&&!document.activeElement?.isSameNode(els.jumpPageInput))els.jumpPageInput.value=state.currentIndex+1}
  els.docStatus.textContent=has?`${state.fileName.replace(/_edited\.pdf$/,'')}｜第 ${state.currentIndex+1} / ${state.pages.length} 頁`:'尚未開啟 PDF';els.dropHint.classList.toggle('hidden',has);els.stageWrap.classList.toggle('hidden',!has);document.querySelectorAll('.thumb').forEach(e=>e.classList.toggle('active',Number(e.dataset.index)===state.currentIndex));document.querySelectorAll('.tool[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===state.tool));document.querySelectorAll('.page-overlay').forEach(o=>o.className=`page-overlay overlay tool-${state.tool}`);document.querySelectorAll('.page-text-hit-layer').forEach(l=>l.classList.toggle('active',state.tool==='edit-text'&&Number(l.closest('.pdf-page-shell')?.dataset.index)===state.currentIndex));document.querySelectorAll('.pdf-page-shell').forEach(e=>e.classList.toggle('current',Number(e.dataset.index)===state.currentIndex));if(els.sidePrevBtn)els.sidePrevBtn.disabled=!has||state.currentIndex<=0;if(els.sideNextBtn)els.sideNextBtn.disabled=!has||state.currentIndex>=state.pages.length-1;updateUndoRedo();updateHint();updatePerformanceStatus()
};
setTool = function(tool){state.tool=tool;state.selectedAnnotationId=null;state.selectedAnnotationIds=new Set();document.querySelectorAll('.page-overlay').forEach(o=>{const i=Number(o.closest('.pdf-page-shell')?.dataset.index);if(!isLargeDocument()||Math.abs(i-state.currentIndex)<=renderRadius()+1)renderAnnotationsForPage(i,o);else o.className=`page-overlay overlay tool-${state.tool}`});document.querySelectorAll('.page-text-hit-layer').forEach(l=>l.innerHTML='');if(tool==='edit-text')renderPageAtIndex(state.currentIndex,true);updateUI();updateHint()};
changeZoom = function(next){if(!state.pages.length)return;state.renderToken++;state.zoom=clamp(next,.35,4);renderContinuousDocument({scrollToCurrent:true});updateUI()};
const __v362RebuildThumbs=rebuildThumbs;
rebuildThumbs = function(){if(!els.thumbList)return;if(els.thumbList.classList.contains('compat-hidden')||getComputedStyle(els.thumbList).display==='none'){state.thumbObserver?.disconnect();els.thumbList.replaceChildren();return}return __v362RebuildThumbs()};
handleStageScroll = function(){
  clearTimeout(state.scrollIdleTimer);state.isScrolling=true;document.body.classList.toggle('fast-scrolling',isLargeDocument());if(isLargeDocument()){state.pageRenderQueue=state.pageRenderQueue.filter(i=>i===state.currentIndex);state.pageRenderQueued=new Set(state.pageRenderQueue)}
  if(!state.scrollRaf)state.scrollRaf=requestAnimationFrame(()=>{state.scrollRaf=0;const vr=els.stageWrap.getBoundingClientRect(),cx=vr.left+Math.min(vr.width*.5,700),cy=vr.top+vr.height*.42;let item=document.elementFromPoint(cx,cy)?.closest?.('.pdf-page-shell,.pdf-page-placeholder');if(!item){let best=null,dist=Infinity;for(let d=0;d<=12;d++){for(const idx of d?[state.currentIndex+d,state.currentIndex-d]:[state.currentIndex]){const c=pageItem(idx);if(!c)continue;const r=c.getBoundingClientRect(),dd=Math.abs((r.top+r.bottom)/2-cy);if(dd<dist){dist=dd;best=c}}}item=best}const best=item?Number(item.dataset.index):-1;if(best>=0&&best!==state.currentIndex){const prev=state.currentIndex;state.currentIndex=best;setSingleAnnotationSelection(null);if(item.classList.contains('pdf-page-placeholder')&&virtualDomEnabled()){if(!state.virtualRebuildPending){state.virtualRebuildPending=true;renderContinuousDocument({preserveScroll:true}).finally(()=>{state.virtualRebuildPending=false;const latest=pageItem(state.currentIndex);if(virtualDomEnabled()&&latest?.classList.contains('pdf-page-placeholder')){state.virtualRebuildPending=true;renderContinuousDocument({preserveScroll:true}).finally(()=>{state.virtualRebuildPending=false})}})}}else{syncActivePageRefs(best);updateCurrentPageUI(prev,best);schedulePageRender(best,true);if(state.tool==='edit-text')renderPageAtIndex(best,true)}}});
  state.scrollIdleTimer=setTimeout(()=>{state.isScrolling=false;document.body.classList.remove('fast-scrolling');scheduleNearbyPageRenders(state.currentIndex,true);releaseFarPageCanvases();updatePerformanceStatus()},180)
};

// Wrap init so GitHub Pages always starts in non-persistent privacy mode.
const __v362Init=init;
init = async function(){state.githubPrivacyMode=isGitHubPagesPrivacyMode();state.recoveryDisabled=state.githubPrivacyMode;await __v362Init();if(state.githubPrivacyMode&&els.autoSaveStatus)els.autoSaveStatus.textContent='🔐 GitHub 隱私模式：不保存來源 PDF 復原資料'};

init();