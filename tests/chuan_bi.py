"""Dựng bản thử tests/site/ từ index.html ở gốc repo, chèn móc window.__ev để test gọi hàm nội bộ trong IIFE."""
import os, shutil
G = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(G); S = os.path.join(G, 'site')
os.makedirs(S, exist_ok=True)
for f in os.listdir(R):
    p = os.path.join(R, f)
    if os.path.isfile(p) and f != 'index.html' and not f.startswith('.'): shutil.copy(p, S)
s = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
i = s.index('window.__sota = {'); j = s.index('\n', i)
s = s[:j + 1] + 'window.__ev = c => eval(c);\n' + s[j + 1:]
open(os.path.join(S, 'index.html'), 'w', encoding='utf-8').write(s)
print('Đã dựng tests/site/')
