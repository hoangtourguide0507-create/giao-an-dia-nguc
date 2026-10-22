// Kiểm tra cú pháp script chính trong index.html và sw.js (thay cho `node --check` thủ công).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = scripts.find(s => s.includes('window.__sota'));
if (!main) { console.error('Không tìm thấy script chính trong index.html'); process.exit(1); }
const dir = mkdtempSync(join(tmpdir(), 'gadn-'));
const file = join(dir, 'main.js');
writeFileSync(file, main);
for (const f of [file, new URL('../sw.js', import.meta.url).pathname]) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log('Cú pháp OK: script chính index.html + sw.js');
