from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'app-v3.6.4.js').read_text(encoding='utf-8')
html=(ROOT/'index.html').read_text(encoding='utf-8')
errors=[]
checks={
 'active export privacy guard':'openPrivacyWarningIfNeeded',
 'unsafe visual mask detection':'unsafeVisualMasks',
 'black visual mask detection':'blackVisualMasks',
 'privacy warning dialog':'privacyWarningDialog',
 'metadata warning':'來源 Metadata 將被保留',
 'safe flatten messaging':'安全扁平化',
}
for name,token in checks.items():
    if token not in js and token not in html: errors.append(f'missing {name}: {token}')
if '黑色色塊（非塗銷）' not in html: errors.append('black block is not explicitly labeled non-redaction')
if 'id="clearMetadata" type="checkbox" checked' not in html: errors.append('Metadata Privacy Guard is not enabled by default')
if "els.preflightDialog.close();openPrivacyWarningIfNeeded()" not in js: errors.append('preflight does not route through privacy guard')
if "els.privacyWarningDialog.close();exportPdf()" not in js: errors.append('explicit risk override path missing')
if errors: raise SystemExit('FAIL:\n- '+'\n- '.join(errors))
print('PASS: V3.6.4 privacy guard checks')
