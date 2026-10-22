#!/usr/bin/env python3
"""Liệt kê (và với --apply thì xoá) mã trong script chính của index.html mà không có đường chạy nào tới được.
Cách làm: chia script thành các khối cấp cao nhất; gốc = mọi câu lệnh không phải khai báo + hành động `data-act` còn
được nút nào đó gọi + tên các test cần; lan truyền theo tên được nhắc tới. Khối khai báo không bao giờ được nhắc → mã chết.
Dùng: python3 scripts/dead-code.py [--apply] [--keep tên,tên]"""
import re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
ms = [m for m in re.finditer(r'<script>([\s\S]*?)</script>', src)]
main = max(ms, key=lambda m: len(m.group(1)))
body = main.group(1)
lines = body.split('\n')
keep_extra = set(); ignore_act = set()
for a in sys.argv[1:]:
    if a.startswith('--keep='): keep_extra |= set(a[7:].split(','))
    if a.startswith('--ignore-act='): ignore_act |= set(a[13:].split(','))
# --- tên mà bộ test cần gọi qua window.__sota
tests_txt = ''.join(open(os.path.join(dp, f), encoding='utf-8').read() for dp, _, fs in os.walk(os.path.join(ROOT, 'tests', 'app')) for f in fs if f.endswith('.mjs'))
sota_used = set(re.findall(r'A\.([A-Za-z0-9_]+)', tests_txt)) | set(re.findall(r'__sota\.([A-Za-z0-9_]+)', tests_txt))
# --- chia khối
START = re.compile(r'^(async function |function |const |let |var |[A-Za-z_$][\w$.]*\s*(=|\()|document\.|window\.|try |setTimeout|setInterval|for |if |\(async|\/\*)')
start0 = next(i for i, l in enumerate(lines) if l.startswith('(() => {')) + 1
end0 = max(i for i, l in enumerate(lines) if l.startswith('})();'))
chunks = []  # (a, b) nửa mở
cur = None
for i in range(start0, end0):
    l = lines[i]
    if l and not l[0].isspace() and l[0] not in '})]' and START.match(l):
        if cur is not None: chunks.append((cur, i))
        cur = i
if cur is not None: chunks.append((cur, end0))
def text(c): return '\n'.join(lines[c[0]:c[1]])
DEF = re.compile(r'^(?:async function ([\w$]+)|function ([\w$]+)|const ([\w$]+)\s*=|let ([\w$]+)|var ([\w$]+))')
info = []
for c in chunks:
    m = DEF.match(lines[c[0]]); name = next((g for g in m.groups() if g), None) if m else None
    kind = 'let' if m and (m.group(4) or m.group(5)) else 'def' if name else 'stmt'
    info.append({'c': c, 'name': name, 'kind': kind, 't': text(c)})
names = {i['name']: i for i in info if i['kind'] == 'def'}
# --- bảng handlers
hi = next(i for i in info if i['name'] == 'handlers')
H = {}
hl = hi['t'].split('\n'); cur_h = None
for l in hl[1:]:
    m = re.match(r"^  '([a-z0-9-]+)':", l)
    if m: cur_h = m.group(1); H[cur_h] = []
    if cur_h and not l.startswith('};'): H[cur_h].append(l)
htext = {k: '\n'.join(v) for k, v in H.items()}
def strip_comments(t):
    t = re.sub(r'/\*[\s\S]*?\*/', ' ', t)
    return re.sub(r'(?<![:\'"\\])//[^\n]*', ' ', t)
tok = lambda s: set(re.findall(r'[A-Za-z_$][\w$]*', strip_comments(s)))
live_defs = set(); live_h = set(); work = []
ACT_RE = [re.compile(r'data-act="([a-z0-9-]+)"'), re.compile(r"act: '([a-z0-9-]+)'"), re.compile(r"handlers\['([a-z0-9-]+)'\]")]
def acts_in(t):
    out = set()
    for r in ACT_RE: out |= set(r.findall(t))
    for m in re.finditer(r'data-act="\$\{(.*?)\}"', t): out |= set(re.findall(r"'([a-z0-9-]+)'", m.group(1)))
    for l in t.split('\n'):
        if 'dataset.act' in l or 'qrStatic(' in l or 'exPickList(' in l or "setAttribute('data-act'" in l: out |= set(re.findall(r"'([a-z0-9-]+)'", l))
    return out
def mark_text(t):
    for w in tok(t):
        if w in names and w not in live_defs: live_defs.add(w); work.append(('d', w))
    for h in acts_in(t):
        if h in H and h not in live_h and h not in ignore_act: live_h.add(h); work.append(('h', h))
static_html = src[:main.start(1)] + src[main.end(1):]
mark_text(static_html)
for i in info:
    if i['kind'] != 'def' or i['name'] in keep_extra:
        if i['name'] == 'handlers': continue
        if i['name'] == 'window' or 'window.__sota' in i['t'][:20]:
            continue
        mark_text(i['t'])
for n in keep_extra | sota_used:
    if n in names and n not in live_defs: live_defs.add(n); work.append(('d', n))
# root: những phần xử lý sự kiện chung không nằm trong bảng
while work:
    k, n = work.pop()
    if k == 'd' and n == 'handlers': continue  # bảng handlers chỉ sống theo từng mục
    mark_text(names[n]['t'] if k == 'd' else htext[n])
# handlers dùng bởi mã động (act: 'x' trong toast...) đã bắt ở mark_text; thêm các handler gọi nhau
dead_defs = [i for i in info if i['kind'] == 'def' and i['name'] not in live_defs and i['name'] != 'handlers']
dead_h = [h for h in H if h not in live_h]
print('Khai báo chết:', len(dead_defs), '| dòng:', sum(i['c'][1] - i['c'][0] for i in dead_defs))
for i in dead_defs: print('  ', i['c'][0] + 1, i['name'], i['c'][1] - i['c'][0])
print('Handler chết:', len(dead_h), dead_h)
if '--apply' in sys.argv:
    kill = set()
    for i in dead_defs: kill |= set(range(i['c'][0], i['c'][1]))
    # xoá handler chết
    hs = next(x for x in info if x['name'] == 'handlers')['c'][0]
    cur_h = None
    for j in range(hs + 1, hs + len(hl)):
        m = re.match(r"^  '([a-z0-9-]+)':", lines[j])
        if m: cur_h = m.group(1)
        if cur_h in dead_h and not lines[j].startswith('};'): kill.add(j)
    out = [l for i, l in enumerate(lines) if i not in kill]
    nb = '\n'.join(out)
    new = src[:main.start(1)] + nb + src[main.end(1):]
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(new)
    print('Đã xoá', len(kill), 'dòng')
if '--apply' in sys.argv:
    # rút gọn window.__sota theo các tên còn tồn tại
    s2 = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    m2 = re.search(r'window\.__sota = \{(.*?)\};', s2)
    if m2:
        left = {n for n in names if n in live_defs}
        parts = [p.strip() for p in re.split(r',\s*(?![^{]*\})', m2.group(1))]
        kept = [p for p in parts if not re.fullmatch(r'[A-Za-z_$][\w$]*', p) or p in left]
        s2 = s2[:m2.start()] + 'window.__sota = { ' + ', '.join(kept) + ' };' + s2[m2.end():]
        open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(s2)
        print('__sota còn', len(kept), 'mục')
