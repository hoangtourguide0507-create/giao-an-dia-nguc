// Đo coverage script chính của index.html bằng Istanbul (cách Jest/nyc dùng): khi test, trang được phục vụ
// với script đã gắn bộ đếm; sau mỗi test (và trước mỗi lần tải lại trang) lấy window.__coverage__ ra gộp lại.
// Số dòng trong báo cáo khớp đúng số dòng của index.html. Thư viện QR nhúng sẵn (qrcode, jsQR) không tính.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInstrumenter } from 'istanbul-lib-instrument';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const RAW_DIR = join(ROOT, 'coverage', 'raw');
export const HTML_FILE = join(ROOT, 'index.html');
export const THRESHOLD = { lines: 90, statements: 90, functions: 90, branches: 80 };

let cached = null;
/* index.html với script chính đã gắn bộ đếm (đệm dòng trống để số dòng khớp file gốc) */
export function instrumentedHtml() {
  if (cached) return cached;
  const html = readFileSync(HTML_FILE, 'utf8');
  const re = /<script>([\s\S]*?)<\/script>/g; let m, main = null;
  while ((m = re.exec(html))) if (m[1].includes('window.__sota')) main = m;
  if (!main) throw new Error('Không tìm thấy script chính');
  const start = main.index + '<script>'.length, lines = html.slice(0, start).split('\n').length - 1;
  const code = createInstrumenter({ coverageVariable: '__coverage__', compact: true, produceSourceMap: false, esModules: false })
    .instrumentSync('\n'.repeat(lines) + main[1], HTML_FILE);
  cached = html.slice(0, start) + code + html.slice(start + main[1].length);
  return cached;
}

export function saveRaw(name, cov) { if (cov) writeFileSync(join(RAW_DIR, name + '.json'), JSON.stringify(cov)); }

export async function report() {
  const files = readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) { console.log('Không có dữ liệu coverage'); return; }
  const map = libCoverage.createCoverageMap({});
  for (const f of files) map.merge(JSON.parse(readFileSync(join(RAW_DIR, f), 'utf8')));
  mkdirSync(join(ROOT, 'coverage', 'report'), { recursive: true });
  const ctx = libReport.createContext({ dir: join(ROOT, 'coverage', 'report'), coverageMap: map, defaultSummarizer: 'flat' });
  for (const r of ['text-summary', 'html', 'lcovonly', 'json-summary']) reports.create(r).execute(ctx);
  const sum = map.getCoverageSummary().toJSON(), bad = Object.entries(THRESHOLD).filter(([k, v]) => sum[k].pct < v);
  console.log(`\nCoverage script chính index.html (${files.length} lần chụp): ` + Object.keys(THRESHOLD).map(k => `${k} ${sum[k].pct}%`).join(' · '));
  writeFileSync(join(ROOT, 'coverage', 'summary.txt'), Object.keys(THRESHOLD).map(k => `${k}: ${sum[k].pct}% (${sum[k].covered}/${sum[k].total})`).join('\n') + '\n');
  if (bad.length) { const msg = 'Coverage dưới ngưỡng: ' + bad.map(([k, v]) => `${k} ${sum[k].pct}% < ${v}%`).join(', '); process.exitCode = 1; throw new Error(msg); }
}
