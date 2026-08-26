from pathlib import Path
import re, json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
html=(ROOT/'index.html').read_text(encoding='utf-8')
js=(ROOT/'app-v3.6.4.js').read_text(encoding='utf-8')
ids=re.findall(r'id="([^"]+)"',html)
if len(ids)!=len(set(ids)):
    errors.append('duplicate HTML ids')
refs=set(re.findall(r"\$\('([^']+)'\)",js))
missing=sorted(refs-set(ids))
if missing: errors.append(f'missing HTML ids referenced by JS: {missing}')
for token in ['app-v3.6.4.js','boot-watch.js?v=3.6.4','styles.css?v=3.6.4','GovPDF Editor Web V3.6.4']:
    if token not in html: errors.append(f'index missing {token}')
for token in ["const APP_VERSION = '3.6.4'",'openPrivacyWarningIfNeeded','privacyWarningDialog','unsafeVisualMasks']:
    if token not in js: errors.append(f'JS missing {token}')
for token in ['privacyWarningDialog','privacyWarningSummary','privacyProceedBtn','blockSafetyHint','metadataPrivacyStatus']:
    if token not in ids: errors.append(f'V3.6.4 control missing: {token}')
manifest=json.loads((ROOT/'manifest.webmanifest').read_text(encoding='utf-8'))
if 'V3.6.4' not in manifest.get('name',''): errors.append('manifest version mismatch')
wf=(ROOT/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8')
if 'app-v3.6.4.js' not in wf or 'V3.6.4' not in wf: errors.append('GitHub workflow version mismatch')
if 'cdn.jsdelivr.net' in js or 'unpkg.com' in js: errors.append('runtime JS unexpectedly references external CDN')
if errors:
    print('FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('PASS: V3.6.4 static consistency checks')
