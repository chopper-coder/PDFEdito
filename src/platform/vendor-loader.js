import {PDFJS_VERSION, CORE_SOURCES, PDFLIB_SOURCES, JSZIP_SOURCES} from './config.js';
import {els} from './dom.js';

export let pdfjsLib = null;
export let PDFLib = null;
export let coreAsset = null;

let coreLoadPromise = null;
let pdfLibLoadPromise = null;
let jszipLoadPromise = null;

function withTimeout(promise,ms,label){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} 載入逾時（${Math.round(ms/1000)} 秒）`)),ms)),
  ]);
}

function assetUrl(src){return new URL(src,import.meta.url).href}

function loadClassicScript(src){
  return new Promise((resolve,reject)=>{
    const el=document.createElement('script');
    el.src=assetUrl(src);
    el.async=true;
    el.crossOrigin='anonymous';
    el.onload=resolve;
    el.onerror=()=>reject(new Error(`無法載入 ${src}`));
    document.head.appendChild(el);
  });
}

export async function cleanupLegacyCaches(){
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
  }catch(e){console.warn('SW cleanup',e)}
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('govpdf-web-')).map(k=>caches.delete(k)));
    }
  }catch(e){console.warn('cache cleanup',e)}
}

export async function loadViewerCore(){
  if(pdfjsLib)return;
  if(coreLoadPromise)return coreLoadPromise;
  coreLoadPromise=(async()=>{
    els.libStatus.textContent='正在載入 PDF 核心…';
    els.libStatus.classList.remove('ok','error');
    const errors=[];
    for(const src of CORE_SOURCES){
      try{
        const pj=await withTimeout(import(assetUrl(src.pdf)),src.local?3000:8000,`PDF.js (${src.name})`);
        pj.GlobalWorkerOptions.workerSrc=assetUrl(src.worker);
        pdfjsLib=pj;
        coreAsset={...src,cmaps:assetUrl(src.cmaps),standardFonts:assetUrl(src.standardFonts),wasm:assetUrl(src.wasm),iccs:assetUrl(src.iccs)};
        els.libStatus.textContent=`✅ PDF 核心已就緒｜${src.name}`;
        els.libStatus.classList.add('ok');
        els.libStatus.title=`PDF.js ${PDFJS_VERSION}｜${src.name}`;
        return;
      }catch(err){errors.push(`${src.name}: ${err?.message||err}`)}
    }
    throw new Error(`PDF.js 載入失敗。\n${errors.join('\n')}\n\n本機請重新執行 Start_GovPDF_Editor.bat，啟動程式會自動準備 vendor 核心；GitHub Pages 請使用內附 Actions workflow。`);
  })();
  try{return await coreLoadPromise}finally{if(!pdfjsLib)coreLoadPromise=null}
}

export async function ensurePdfLib(){
  if(PDFLib)return PDFLib;
  if(window.PDFLib){PDFLib=window.PDFLib;return PDFLib}
  if(pdfLibLoadPromise)return pdfLibLoadPromise;
  pdfLibLoadPromise=(async()=>{
    const errors=[];
    for(const src of PDFLIB_SOURCES){
      try{
        await withTimeout(loadClassicScript(src),8000,'pdf-lib');
        if(window.PDFLib){PDFLib=window.PDFLib;return PDFLib}
      }catch(e){errors.push(e?.message||String(e))}
    }
    throw new Error(`pdf-lib 載入失敗。\n${errors.join('\n')}`);
  })();
  try{return await pdfLibLoadPromise}finally{if(!PDFLib)pdfLibLoadPromise=null}
}

export async function ensureJSZip(){
  if(window.JSZip)return window.JSZip;
  if(jszipLoadPromise)return jszipLoadPromise;
  jszipLoadPromise=(async()=>{
    const errors=[];
    for(const src of JSZIP_SOURCES){
      try{
        await withTimeout(loadClassicScript(src),8000,'JSZip');
        if(window.JSZip)return window.JSZip;
      }catch(e){errors.push(e?.message||String(e))}
    }
    throw new Error(`JSZip 載入失敗。\n${errors.join('\n')}`);
  })();
  try{return await jszipLoadPromise}finally{if(!window.JSZip)jszipLoadPromise=null}
}
