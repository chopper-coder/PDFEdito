from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
js=(ROOT/'app-v3.6.4.js').read_text(encoding='utf-8')
html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'styles.css').read_text(encoding='utf-8')
errors=[]
checks=[
 ('image insert button','id="insertImageBtn"'),
 ('image input','id="imageInput"'),
 ('image file processor','async function insertImageFile'),
 ('safe image mime allowlist',"IMAGE_ALLOWED_MIME = new Set(['image/png','image/jpeg','image/webp'])"),
 ('image annotation renderer',"a.type==='image'"),
 ('image export renderer','ctx.drawImage(img,x,y,aw,ah)'),
 ('image project asset path','images/image_'),
 ('image project hydration','bytesToImageDataUrl'),
 ('image annotation validator',"'redact','image'"),
]
for name,token in checks:
    if token not in js and token not in html: errors.append(f'missing {name}: {token}')
if '.annotation.image' not in css or '.annotation-image-content' not in css: errors.append('image annotation CSS missing')
if 'Shift 可自由變形' not in js: errors.append('image resize behavior hint missing')
if errors: raise SystemExit('FAIL:\n- '+'\n- '.join(errors))
print('PASS: V3.6.4 image insert / move / resize / export / project checks')
