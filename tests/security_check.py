from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'app-v3.6.4.js').read_text(encoding='utf-8')
html=(ROOT/'index.html').read_text(encoding='utf-8')
server=(ROOT/'tools/local_server.ps1').read_text(encoding='utf-8')
prep=(ROOT/'tools/prepare_core.ps1').read_text(encoding='utf-8')
wf=(ROOT/'.github/workflows/deploy-pages.yml').read_text(encoding='utf-8')
errors=[]
if 'recoveryInfo.innerHTML' in js: errors.append('Recovery still writes filename through innerHTML')
if "name.textContent=String(data.fileName||'PDF')" not in js: errors.append('Recovery safe filename assignment missing')
if 'Access-Control-Allow-Origin: *' in server: errors.append('localhost wildcard CORS remains')
for token in ['Cross-Origin-Resource-Policy: same-origin','X-Content-Type-Options: nosniff']:
    if token not in server: errors.append(f'missing localhost hardening header: {token}')
for sri in [
 'sha512-YxFb+SQcodN2rnX9Tn3dHYlqfb7NjlzzfONPpJd+AKoKtUjEdevTfbC07d5TcczzOK6261auRkP/M8OBHs9vFQ==',
 'sha512-V/mpyJAoTsN4cnP31vc0wfNA1+p20evqqnap0KLoRUN0Yk/p3wN52DOEsL4oBFcLdb76hlpKPtzJIgo67j/XLw==',
 'sha512-xXDvecyTpGLrqFrvkrUSoxxfJI5AH7U8zxxtVclpsUtMCq4JQ290LY8AW5c7Ggnr/Y/oK+bQMbqK2qmtk3pN4g=='
]:
    if sri not in prep or sri not in wf: errors.append('pinned package SRI missing from local prep or CI')
if 'cdn.jsdelivr.net' in prep or 'unpkg.com' in prep: errors.append('unverified direct CDN fallback remains')
if "['redact','replace'].includes(a.type)" not in js: errors.append('secure flatten classification missing')
if 'Content-Security-Policy' not in html: errors.append('CSP meta missing')
if '<script>' in html: errors.append('inline script remains under self-only CSP')
if 'boot-watch.js' not in html: errors.append('external boot watcher missing')
if errors: raise SystemExit('FAIL:\n- '+'\n- '.join(errors))
print('PASS: V3.6.4 security hardening checks')
