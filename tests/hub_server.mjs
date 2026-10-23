/* Máy chủ đồng bộ giả để kiểm thử app đầu-cuối: chạy đúng push-server/src/index.js với SQLite thật (node:sqlite).
   Dùng: HK=<khoá HLV> node hub_server.mjs <cổng>  → in "san-sang" khi nhận yêu cầu. */
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Hub } from '../push-server/src/index.js';

const db = new DatabaseSync(':memory:');
const mem = new Map();
const storage = {
  get: async k => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); },
  delete: async k => { for (const x of [].concat(k)) mem.delete(x); return 1; },
  list: async ({ prefix = '', limit } = {}) => { const m = new Map([...mem].filter(([k]) => k.startsWith(prefix))); return limit ? new Map([...m].slice(0, limit)) : m; },
  setAlarm: async () => {}, deleteAlarm: async () => {},
  sql: { exec(q, ...b) { const st = db.prepare(q); const rows = /^\s*(select|with)/i.test(q) ? st.all(...b) : (st.run(...b), []); return { toArray: () => rows, one: () => rows[0] }; } }
};
const HK = process.env.HK;
const hub = new Hub({ storage, blockConcurrencyWhile: f => f() }, { HLV_HASH: crypto.createHash('sha256').update(HK).digest('base64url'), RP_ID: process.env.RP_ID, RP_ORIGIN: process.env.RP_ORIGIN });

http.createServer((rq, rs) => {
  const chunks = []; rq.on('data', c => chunks.push(c));
  rq.on('end', async () => {
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await hub.fetch(new Request('http://hub.local' + rq.url, { method: rq.method, headers: rq.headers, body: ['GET', 'HEAD'].includes(rq.method) ? undefined : body }));
    rs.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json' });
    rs.end(Buffer.from(await r.arrayBuffer()));
  });
}).listen(Number(process.argv[2]), () => console.log('san-sang'));
