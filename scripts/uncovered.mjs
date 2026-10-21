// In các dòng còn nhiều nhánh chưa chạy (để bổ sung test), từ dữ liệu coverage/raw.
import { readdirSync, readFileSync } from 'node:fs';
import libCoverage from 'istanbul-lib-coverage';
const dir = new URL('../coverage/raw/', import.meta.url).pathname, map = libCoverage.createCoverageMap({});
for (const f of readdirSync(dir)) map.merge(JSON.parse(readFileSync(dir + f, 'utf8')));
const fc = map.fileCoverageFor(map.files()[0]), d = fc.toJSON(), per = {};
for (const [k, br] of Object.entries(d.branchMap)) d.b[k].forEach((n, i) => { if (!n) { const loc = br.locations[i] && br.locations[i].start.line ? br.locations[i] : br.loc, l = loc.start.line; per[l] = (per[l] || 0) + 1; } });
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').split('\n');
Object.entries(per).sort((a, b) => b[1] - a[1]).slice(0, +(process.argv[2] || 40)).forEach(([l, n]) => console.log(String(n).padStart(3), l.padStart(5), html[l - 1].trim().slice(0, 110)));
