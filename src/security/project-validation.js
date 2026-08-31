import {PROJECT_LIMITS, ALLOWED_ANNOTATION_TYPES, IMAGE_ALLOWED_MIME} from '../platform/config.js';
import {clamp} from '../platform/utils.js';
import {ensureJSZip} from '../platform/vendor-loader.js';

function zipStat(entry){
  const data=entry?._data||{};
  return {uncompressed:Number(data.uncompressedSize)||0,compressed:Number(data.compressedSize)||0};
}

function assertSafeZipPath(name){
  const normalized=String(name||'').replace(/\\/g,'/');
  if(!normalized||normalized.startsWith('/')||/^[A-Za-z]:/.test(normalized)||normalized.split('/').includes('..')||normalized.includes('\0')){
    throw new Error(`專案含不安全路徑：${name}`);
  }
  return normalized;
}

function finiteNumber(value,min=-Infinity,max=Infinity){
  const num=Number(value);
  return Number.isFinite(num)&&num>=min&&num<=max;
}

export function sanitizePageNumber(value){
  const src=(value&&typeof value==='object'&&!Array.isArray(value))?value:{};
  const positions=new Set(['center','left','right','book']);
  const formats=new Set(['number','total','dash','page','zhTotal','roman']);
  return {
    enabled:!!src.enabled,
    position:positions.has(src.position)?src.position:'center',
    format:formats.has(src.format)?src.format:'number',
    fromPage:clamp(Number.parseInt(src.fromPage,10)||1,1,PROJECT_LIMITS.projectPages),
    start:clamp(Number.parseInt(src.start,10)||1,0,1000000),
    fontSize:clamp(Number(src.fontSize)||11,6,48),
    margin:clamp(Number(src.margin)||20,4,100),
    color:typeof src.color==='string'&&src.color.length<=64?src.color:'#333333',
  };
}

function validateAnnotation(annotation,pageNo){
  const a=annotation;
  if(!a||typeof a!=='object'||Array.isArray(a))throw new Error(`第 ${pageNo} 頁含無效標註`);
  if(!ALLOWED_ANNOTATION_TYPES.has(a.type))throw new Error(`第 ${pageNo} 頁含不支援標註類型：${String(a.type)}`);
  if(typeof a.id!=='string'||!a.id||a.id.length>160)throw new Error(`第 ${pageNo} 頁標註 ID 不合法`);
  for(const key of ['x','y','w','h'])if(!finiteNumber(a[key],-0.05,1.05))throw new Error(`第 ${pageNo} 頁標註座標不合法`);
  if(Number(a.w)<=0||Number(a.h)<=0)throw new Error(`第 ${pageNo} 頁標註尺寸不合法`);
  if(['text','replace','watermark'].includes(a.type)&&String(a.text||'').length>PROJECT_LIMITS.annotationTextChars)throw new Error(`第 ${pageNo} 頁文字物件過大`);
  if(a.type==='image'){
    if(a.src!=null)throw new Error(`第 ${pageNo} 頁圖片不得直接內嵌於 project.json`);
    if(typeof a.imagePath!=='string'||!/^images\/image_[0-9]{4}\.(?:png|jpg|webp)$/i.test(a.imagePath))throw new Error(`第 ${pageNo} 頁圖片路徑不合法`);
    if(!IMAGE_ALLOWED_MIME.has(String(a.imageMime||'').toLowerCase()))throw new Error(`第 ${pageNo} 頁圖片格式不支援`);
    if(String(a.imageName||'').length>255)throw new Error(`第 ${pageNo} 頁圖片名稱過長`);
    if(a.naturalWidth!=null&&!finiteNumber(a.naturalWidth,1,50000))throw new Error(`第 ${pageNo} 頁圖片寬度不合法`);
    if(a.naturalHeight!=null&&!finiteNumber(a.naturalHeight,1,50000))throw new Error(`第 ${pageNo} 頁圖片高度不合法`);
  }
  if(a.fontSize!=null&&!finiteNumber(a.fontSize,1,1000))throw new Error(`第 ${pageNo} 頁字級不合法`);
  if(a.color!=null&&String(a.color).length>64)throw new Error(`第 ${pageNo} 頁顏色值過長`);
  if(a.fontFamily!=null&&String(a.fontFamily).length>256)throw new Error(`第 ${pageNo} 頁字型名稱過長`);
  if(a.original!=null&&String(a.original).length>PROJECT_LIMITS.annotationTextChars)throw new Error(`第 ${pageNo} 頁原文字資料過大`);
  if(a.opacity!=null&&!finiteNumber(a.opacity,0,1))throw new Error(`第 ${pageNo} 頁透明度不合法`);
  if(a.rotation!=null&&!finiteNumber(a.rotation,-36000,36000))throw new Error(`第 ${pageNo} 頁物件旋轉值不合法`);
}

export async function validateAndReadProject(file){
  if(!file||!/\.govpdf$/i.test(file.name||''))throw new Error('請選擇 .govpdf 專案檔');
  if(file.size>PROJECT_LIMITS.projectFileBytes)throw new Error('GovPDF 專案超過 1 GB 安全上限');
  const JSZip=await ensureJSZip();
  const zip=await JSZip.loadAsync(await file.arrayBuffer(),{createFolders:false});
  const entries=Object.values(zip.files);
  if(entries.length>PROJECT_LIMITS.projectEntries)throw new Error(`專案項目過多（${entries.length}）`);
  let total=0;
  for(const entry of entries){
    assertSafeZipPath(entry.name);
    const stat=zipStat(entry);
    total+=stat.uncompressed;
    if(stat.uncompressed>0&&stat.compressed>0&&stat.uncompressed/stat.compressed>PROJECT_LIMITS.compressionRatio)throw new Error(`偵測到異常壓縮比例：${entry.name}`);
  }
  if(total>PROJECT_LIMITS.totalUncompressedBytes)throw new Error('專案解壓後容量超過 1.2 GB 安全上限');

  const projectFile=zip.file('project.json');
  if(!projectFile)throw new Error('不是有效的 GovPDF 專案：缺少 project.json');
  if(zipStat(projectFile).uncompressed>PROJECT_LIMITS.projectJsonBytes)throw new Error('project.json 超過 20 MB 安全上限');
  const manifestText=await projectFile.async('string');
  if(new Blob([manifestText]).size>PROJECT_LIMITS.projectJsonBytes)throw new Error('project.json 超過 20 MB 安全上限');
  let manifest;
  try{manifest=JSON.parse(manifestText)}catch{throw new Error('project.json JSON 格式損毀')}
  if(manifest?.format!=='GovPDFProject'||!Array.isArray(manifest.sources)||!Array.isArray(manifest.pages))throw new Error('GovPDF 專案格式不正確');
  if(manifest.sources.length<1||manifest.sources.length>PROJECT_LIMITS.projectSources)throw new Error(`來源 PDF 數量超過安全上限（${PROJECT_LIMITS.projectSources}）`);
  if(manifest.pages.length<1||manifest.pages.length>PROJECT_LIMITS.projectPages)throw new Error(`頁數超過安全上限（${PROJECT_LIMITS.projectPages}）`);

  const sourceIds=new Set();
  const paths=new Set();
  for(const src of manifest.sources){
    if(!src||typeof src!=='object'||typeof src.id!=='string'||!src.id||src.id.length>160||sourceIds.has(src.id))throw new Error('來源 PDF ID 不合法或重複');
    sourceIds.add(src.id);
    const path=assertSafeZipPath(src.path);
    if(!/^sources\/[^/]{1,180}\.pdf$/i.test(path)||paths.has(path))throw new Error(`來源 PDF 路徑不合法：${path}`);
    paths.add(path);
    if(String(src.name||'').length>512)throw new Error('來源 PDF 名稱過長');
    const zipFile=zip.file(path);
    if(!zipFile)throw new Error(`專案缺少來源：${path}`);
    if(zipStat(zipFile).uncompressed>PROJECT_LIMITS.sourceBytes)throw new Error(`來源 PDF 超過 600 MB：${src.name||path}`);
  }

  for(let i=0;i<manifest.pages.length;i++){
    const page=manifest.pages[i];
    if(!page||typeof page!=='object'||typeof page.id!=='string'||!page.id||page.id.length>160||!sourceIds.has(page.sourceId)||!Number.isInteger(Number(page.pageIndex))||Number(page.pageIndex)<0)throw new Error(`第 ${i+1} 頁來源資訊不合法`);
    if(!Array.isArray(page.annotations)||page.annotations.length>PROJECT_LIMITS.annotationsPerPage)throw new Error(`第 ${i+1} 頁標註數超過安全上限`);
    if(page.rotation!=null&&!finiteNumber(page.rotation,-36000,36000))throw new Error(`第 ${i+1} 頁旋轉值不合法`);
    if(page.baseWidth!=null&&!finiteNumber(page.baseWidth,1,50000))throw new Error(`第 ${i+1} 頁寬度不合法`);
    if(page.baseHeight!=null&&!finiteNumber(page.baseHeight,1,50000))throw new Error(`第 ${i+1} 頁高度不合法`);
    if(page.pendingRotation!=null&&!finiteNumber(page.pendingRotation,-36000,36000))throw new Error(`第 ${i+1} 頁待處理旋轉值不合法`);
    page.annotations.forEach(annotation=>validateAnnotation(annotation,i+1));
  }

  const imagePaths=new Set();
  for(const page of manifest.pages){
    for(const annotation of page.annotations||[]){
      if(annotation.type!=='image')continue;
      imagePaths.add(annotation.imagePath);
      const zipFile=zip.file(annotation.imagePath);
      if(!zipFile)throw new Error(`專案缺少圖片：${annotation.imagePath}`);
      if(zipStat(zipFile).uncompressed>PROJECT_LIMITS.imageBytes)throw new Error(`專案圖片超過 20 MB：${annotation.imageName||annotation.imagePath}`);
    }
  }
  if(imagePaths.size>PROJECT_LIMITS.imageAssets)throw new Error(`專案圖片數量超過安全上限（${PROJECT_LIMITS.imageAssets}）`);
  return {zip,manifest};
}
