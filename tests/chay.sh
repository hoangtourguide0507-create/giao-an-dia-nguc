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
node tests/test_can_vung_co.mjs >/dev/null 2>&1 && echo "✓ cân vùng cơ (BR-39)" || { echo "✗ cân vùng cơ (BR-39)"; FAIL=1; }
node tests/test_vung_bo_quen.mjs >/dev/null 2>&1 && echo "✓ vùng bị bỏ quên (BR-40)" || { echo "✗ vùng bị bỏ quên (BR-40)"; FAIL=1; }
node tests/test_kcal.mjs >/dev/null 2>&1 && echo "✓ kcal buổi tập (BR-41)" || { echo "✗ kcal buổi tập (BR-41)"; FAIL=1; }
node tests/test_nghi_bai_tiep.mjs >/dev/null 2>&1 && echo "✓ nghỉ → bài tiếp (BR-43)" || { echo "✗ nghỉ → bài tiếp (BR-43)"; FAIL=1; }
node tests/test_tang_ta.mjs >/dev/null 2>&1 && echo "✓ tăng tạ theo chuẩn (BR-44)" || { echo "✗ tăng tạ theo chuẩn (BR-44)"; FAIL=1; }
node tests/test_tai_nha.mjs >/dev/null 2>&1 && echo "✓ giáo án tại nhà (BR-45)" || { echo "✗ giáo án tại nhà (BR-45)"; FAIL=1; }
node tests/test_tu_trong.mjs >/dev/null 2>&1 && echo "✓ tự trọng / trợ lực / tính giây (BR-46)" || { echo "✗ tự trọng / trợ lực / tính giây (BR-46)"; FAIL=1; }
exit $FAIL
