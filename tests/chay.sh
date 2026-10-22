#!/usr/bin/env bash
# Chạy toàn bộ kiểm thử. Dùng: bash tests/chay.sh   (hoặc bash tests/chay.sh pa16 sync để chạy vài file)
set -u
cd "$(dirname "$0")"
python3 -c "import playwright" 2>/dev/null || { echo "Cần: pip install playwright && playwright install chromium"; exit 1; }
python3 chuan_bi.py >/dev/null
# kiểm cú pháp script chính
python3 - <<'PY'
import re; s = open('../index.html', encoding='utf-8').read(); m = max(re.findall(r'<script>([\s\S]*?)</script>', s), key=len); open('/tmp/gadn-main.js', 'w').write(m)
PY
node --check /tmp/gadn-main.js || { echo "LỖI CÚ PHÁP index.html"; exit 1; }
FAIL=0
LIST=${*:-sync form focus pa6 pa10 pa11 pa14 pa16 pa18 pa19 pa20 pa21 pa22 pa23 pa24}
for t in $LIST; do
  out=$(python3 test_$t.py 2>&1); p=$(grep -c '^PASS' <<<"$out"); f=$(grep '^FAIL\|pageerror\|^Traceback\|Error:' <<<"$out"); [ "$p" = 0 ] && [ -z "$f" ] && f='không có kiểm tra nào chạy xong'
  if [ -n "$f" ]; then echo "✗ $t ($p đạt)"; echo "$f" | sed 's/^/    /'; FAIL=1; else echo "✓ $t ($p đạt)"; fi
done
if [ $# -eq 0 ]; then
  node test_push_server.mjs | grep -q FAIL && { echo "✗ push-server"; FAIL=1; } || echo "✓ push-server"
  node test_drive_gas.js | grep -q FAIL && { echo "✗ drive/Code.gs"; FAIL=1; } || echo "✓ drive/Code.gs"
fi
exit $FAIL
