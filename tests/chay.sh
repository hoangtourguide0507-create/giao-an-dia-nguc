#!/usr/bin/env bash
# Kiểm thử nhẹ (không dùng trình duyệt): cú pháp, service worker, máy chủ đồng bộ/thông báo.
# Test giao diện (Playwright) chạy riêng: npm run test:app  hoặc  npx playwright test <tên-file>
set -u
cd "$(dirname "$0")/.."
FAIL=0
npm run -s check >/dev/null 2>&1 && echo "✓ cú pháp" || { echo "✗ cú pháp (npm run check)"; FAIL=1; }
npm run -s test:sw >/dev/null 2>&1 && echo "✓ service worker" || { echo "✗ service worker"; FAIL=1; }
node tests/test_push_server.mjs | grep -q FAIL && { echo "✗ push-server"; FAIL=1; } || echo "✓ push-server"
node tests/test_hub_sync.mjs 2>/dev/null | grep -q FAIL && { echo "✗ hub-sync (máy chủ đồng bộ)"; FAIL=1; } || echo "✓ hub-sync (máy chủ đồng bộ)"
node tests/test_dedupe_plan.mjs | grep -q FAIL && { echo "✗ dedupe giáo án"; FAIL=1; } || echo "✓ dedupe giáo án"
node tests/test_hub_pa33b.mjs 2>/dev/null | grep -q FAIL && { echo "✗ hub-passkey-anh"; FAIL=1; } || echo "✓ hub-passkey-anh"
exit $FAIL
