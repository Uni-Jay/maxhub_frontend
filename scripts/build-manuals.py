import json, base64, html
from playwright.sync_api import sync_playwright
import os
FE=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
M=json.load(open(f'{FE}/data/userManual.json'))
logo='data:image/jpeg;base64,'+base64.b64encode(open(f'{FE}/public/images/maxhublogo.jpeg','rb').read()).decode()
brands=''.join(f'<img src="data:image/jpeg;base64,{base64.b64encode(open(f"{FE}/public/brands/{b}.jpeg","rb").read()).decode()}">' for b in ['visamax','kuriossat','beadmax','maxfood'])
AUD={'all':'Everyone','hr':'HR','hod':'Heads of department','accountant':'Accounts','admin':'Management','superadmin':'Management','staff':'Staff','student':'Students'}
e=html.escape
def aud(a): return ' · '.join(dict.fromkeys(AUD.get(x,x) for x in a))
def build(key, out):
    g=M[key]
    toc=''.join(f'<li><span>{i+1}. {e(c["title"])}</span><em>{e(c["summary"])}</em></li>' for i,c in enumerate(g['chapters']))
    body=''
    for i,c in enumerate(g['chapters']):
        body+=f'<section class="chap"><p class="aud">{e(aud(c["audience"]))}</p><h1><span>{i+1}</span>{e(c["title"])}</h1><p class="sum">{e(c["summary"])}</p>'
        for t in c['topics']:
            body+=f'<div class="topic"><h2>{e(t["title"])}</h2>'
            if t.get('where'): body+=f'<p class="where"><b>Where:</b> {e(t["where"])}</p>'
            body+='<ol>'+''.join(f'<li>{e(s)}</li>' for s in t['steps'])+'</ol>'
            for tip in t.get('tips',[]): body+=f'<p class="tip"><b>Tip:</b> {e(tip)}</p>'
            body+='</div>'
        body+='</section>'
    doc=f'''<!doctype html><html><head><meta charset="utf-8"><style>
    @page {{ size: A4; margin: 18mm 16mm 20mm; }}
    body {{ font-family: "Segoe UI", Helvetica, Arial, sans-serif; color:#1f2430; font-size:10.5pt; line-height:1.55; margin:0; }}
    .cover {{ height: 245mm; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; page-break-after:always; }}
    .cover img.logo {{ height:90px; border-radius:16px; }}
    .cover h1 {{ font-size:30pt; margin:24px 0 6px; color:#1e1b4b; }}
    .cover .ver {{ color:#6b7280; margin:0 0 26px; }}
    .cover p.intro {{ max-width:140mm; color:#374151; font-size:11pt; }}
    .brands {{ margin-top:30px; display:flex; gap:14px; }} .brands img {{ height:44px; border-radius:8px; border:1px solid #e5e7eb; }}
    .toc {{ page-break-after:always; }} .toc h1 {{ color:#1e1b4b; }}
    .toc ol {{ list-style:none; padding:0; }} .toc li {{ padding:9px 0; border-bottom:1px solid #eef0f4; display:flex; flex-direction:column; }}
    .toc li span {{ font-weight:700; }} .toc li em {{ color:#6b7280; font-style:normal; font-size:9.5pt; }}
    .chap {{ page-break-before:always; }} .chap:first-of-type {{ page-break-before:auto; }}
    .chap h1 {{ font-size:20pt; color:#1e1b4b; margin:2px 0 4px; display:flex; align-items:center; gap:10px; }}
    .chap h1 span {{ background:#4f46e5; color:#fff; border-radius:10px; width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; font-size:15pt; }}
    .aud {{ display:inline-block; margin:0; font-size:8.5pt; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#4f46e5; background:#eef2ff; padding:3px 8px; border-radius:99px; }}
    .sum {{ color:#6b7280; margin:0 0 14px; }}
    .topic {{ break-inside:avoid; border:1px solid #e5e7eb; border-radius:12px; padding:12px 16px; margin:0 0 12px; }}
    .topic h2 {{ font-size:12.5pt; margin:0 0 6px; color:#111827; }}
    .where {{ margin:0 0 6px; font-size:9.5pt; color:#065f46; background:#ecfdf5; padding:4px 8px; border-radius:6px; display:inline-block; }}
    ol {{ margin:4px 0 0; padding-left:20px; }} ol li {{ margin:3px 0; }}
    .tip {{ margin:8px 0 0; font-size:9.5pt; background:#fffbeb; color:#78350f; padding:6px 10px; border-radius:8px; }}
    </style></head><body>
    <div class="cover"><img class="logo" src="{logo}"><h1>{e(g["title"])}</h1><p class="ver">{e(M["version"])}</p><p class="intro">{e(g["intro"])}</p><div class="brands">{brands}</div></div>
    <div class="toc"><h1>Contents</h1><ol>{toc}</ol></div>{body}</body></html>'''
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(); pg.set_content(doc, wait_until='load')
        pg.pdf(path=out, format='A4', print_background=True, display_header_footer=True,
               header_template='<div></div>',
               footer_template=f'<div style="font-size:8px;color:#9ca3af;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>{e(g["title"])} · {e(M["version"])}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
               margin={'top':'16mm','bottom':'18mm','left':'16mm','right':'16mm'})
        b.close()
build('staff', f'{FE}/public/manuals/MaxHub-Staff-Manual.pdf')
build('student', f'{FE}/public/manuals/MaxHub-Student-Guide.pdf')
print('done')
