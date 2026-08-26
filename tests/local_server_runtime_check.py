from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
ps=(ROOT/'tools'/'local_server.ps1').read_text(encoding='utf-8')
errors=[]
if re.search(r'(?im)^\s*\$host\s*=', ps):
    errors.append('PowerShell reserved $Host is assigned')
if '$requestHost' not in ps:
    errors.append('requestHost variable missing')
for token in ['Write-BytesSafely','catch [System.IO.IOException]','catch [System.Net.Sockets.SocketException]','catch [System.ObjectDisposedException]']:
    if token not in ps:
        errors.append(f'missing disconnect guard: {token}')
if 'Access-Control-Allow-Origin' in ps:
    errors.append('CORS wildcard/header unexpectedly restored')
if 'Cross-Origin-Resource-Policy: same-origin' not in ps:
    errors.append('CORP header missing')
if '$RootBoundary' not in ps or 'Test-PathInsideRoot' not in ps:
    errors.append('root-boundary protection missing')
if errors:
    raise SystemExit('FAIL:\n- ' + '\n- '.join(errors))
print('PASS: V3.6.4 local server runtime hotfix checks')
