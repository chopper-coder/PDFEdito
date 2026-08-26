from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'app-v3.6.4.js').read_text(encoding='utf-8')
server=(ROOT/'tools/local_server.ps1').read_text(encoding='utf-8')
prep=(ROOT/'tools/prepare_core.ps1').read_text(encoding='utf-8')
start=(ROOT/'Start_GovPDF_Editor.bat').read_text(encoding='utf-8')
wf=(ROOT/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
errors=[]

def need(text, token, msg):
    if token not in text: errors.append(msg)

# Recovery revision / privacy mode
need(js,"editRevision: 0",'editRevision state missing')
need(js,"savedRevision: 0",'savedRevision state missing')
need(js,"hasUnsavedEdits = function(){return (Number(state.editRevision)||0)!==(Number(state.savedRevision)||0)}",'revision dirty-state missing')
need(js,"markSavedRevision();updateUndoRedo();await recoveryClear()",'export does not mark revision saved before clearing recovery')
need(js,"isGitHubPagesPrivacyMode",'GitHub privacy mode detector missing')
need(js,"GitHub 隱私模式：不保存來源 PDF 復原資料",'GitHub privacy status missing')
need(js,"if(state.githubPrivacyMode||!hasUnsavedEdits())return",'autosave privacy/dirty guard missing')

# Project hostile-input limits
for token in ['projectFileBytes','projectJsonBytes','projectEntries','projectSources','projectPages','annotationsPerPage','compressionRatio','v363AssertSafeZipPath','v363ValidateAnnotation']:
    need(js,token,f'project validation missing: {token}')

# Heavy DOM virtualization / hidden thumbnails
for token in ['pdf-page-placeholder','virtualDomEnabled','virtualDomRadius','createV363Placeholder']:
    need(js,token,f'DOM virtualization missing: {token}')
need(css,'.pdf-page-placeholder','virtual placeholder CSS missing')
need(js,"els.thumbList.classList.contains('compat-hidden')",'hidden thumb list skip missing')

# True lock semantics
for phrase in ['包含鎖定物件，請先解除鎖定','鎖定文字不可修改','鎖定物件不可調整圖層']:
    need(js,phrase,f'lock hardening missing: {phrase}')

# Local server hardening
need(server,'127.0.0.1:$Port','local host allowlist missing')
need(server,'localhost:$Port','localhost allowlist missing')
need(server,'$RootBoundary','root-boundary containment check missing')
if 'for ($p = $Port' in server: errors.append('local server still auto-falls back to another port')
if 'Access-Control-Allow-Origin' in server: errors.append('local server unexpectedly exposes CORS header')

# Installed core verification
need(prep,'[switch]$VerifyOnly','prepare_core VerifyOnly missing')
need(prep,"CORE_FILES.sha256",'installed core SHA-256 manifest missing')
need(prep,'Test-CoreIntegrity','installed core verification function missing')
need(start,'-VerifyOnly','startup does not verify vendor core')

# GitHub Actions full SHA pinning
uses=re.findall(r'^\s*uses:\s*([^\s#]+)',wf,re.M)
if not uses: errors.append('no GitHub Actions uses entries found')
for ref in uses:
    if '@' not in ref or not re.fullmatch(r'.+@[0-9a-fA-F]{40}',ref): errors.append(f'GitHub Action not pinned to full SHA: {ref}')

if errors:
    raise SystemExit('FAIL:\n- '+'\n- '.join(errors))
print('PASS: V3.6.4 final hotfix checks')
