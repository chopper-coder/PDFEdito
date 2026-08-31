export const APP_VERSION = '3.7.0';
export const PDFJS_VERSION = '6.2.108';
export const PDFLIB_VERSION = '1.17.1';
export const JSZIP_VERSION = '3.10.1';

export const CORE_SOURCES = Object.freeze([
  Object.freeze({
    name: '專案內建核心',
    pdf: '../../vendor/pdf.min.mjs',
    worker: '../../vendor/pdf.worker.min.mjs',
    cmaps: '../../vendor/cmaps/',
    standardFonts: '../../vendor/standard_fonts/',
    wasm: '../../vendor/wasm/',
    iccs: '../../vendor/iccs/',
    local: true,
  }),
]);

export const PDFLIB_SOURCES = Object.freeze(['../../vendor/pdf-lib.min.js']);
export const JSZIP_SOURCES = Object.freeze(['../../vendor/jszip.min.js']);

export const IMAGE_ALLOWED_MIME = Object.freeze(new Set(['image/png', 'image/jpeg', 'image/webp']));

export const COMPRESSION_PRESETS = Object.freeze({
  quality: Object.freeze({label:'畫質優先',dpi:150,quality:.88,detail:'150 DPI / JPEG 88%｜適合需要較清晰文字與圖片'}),
  balanced: Object.freeze({label:'平衡',dpi:120,quality:.76,detail:'120 DPI / JPEG 76%｜一般文件建議'}),
  strong: Object.freeze({label:'高壓縮',dpi:96,quality:.58,detail:'96 DPI / JPEG 58%｜檔案較小，文字與圖片較模糊'}),
});

export const PROJECT_LIMITS = Object.freeze({
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
  imageBytes: 20 * 1024 * 1024,
});

export const ALLOWED_ANNOTATION_TYPES = Object.freeze(new Set(['rect','text','replace','watermark','redact','image']));

export function defaultPageNumber(){
  return {enabled:false,position:'center',format:'number',fromPage:1,start:1,fontSize:11,margin:20,color:'#333333'};
}
