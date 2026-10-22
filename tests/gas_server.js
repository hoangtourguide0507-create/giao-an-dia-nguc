/* Máy chủ giả chạy đúng drive/Code.gs (Google Drive / Properties giả lập trong bộ nhớ) để kiểm thử app đầu-cuối.
   Dùng: node gas_server.js <cổng>  → in ra MA_HLV rồi nhận POST như link Ứng dụng web. */
const fs = require('fs'), crypto = require('crypto'), vm = require('vm'), http = require('http');
let idc = 0; const all = {};
function Iter(a) { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; }
function File(name, data, mime) { this.id = 'f' + (++idc); this.name = name; this.data = data; this.mime = mime; all[this.id] = this; }
File.prototype = { getName() { return this.name }, setContent(s) { this.data = Buffer.from(s) }, getBlob() { const t = this; return { getDataAsString: () => t.data.toString('utf8'), getBytes: () => [...t.data], getContentType: () => t.mime } }, makeCopy(n, d) { return d._add(new File(n, Buffer.from(this.data), this.mime)) }, setTrashed() {} };
function Folder(name) { this.id = 'd' + (++idc); this.name = name; this.files = []; this.folders = []; all[this.id] = this; }
Folder.prototype = { getId() { return this.id }, getName() { return this.name }, getUrl() { return 'https://drive/' + this.id },
  getFoldersByName(n) { return Iter(this.folders.filter(f => f.name === n)) }, getFilesByName(n) { return Iter(this.files.filter(f => f.name === n)) }, getFolders() { return Iter(this.folders) }, getFiles() { return Iter(this.files) },
  createFolder(n) { const f = new Folder(n); this.folders.push(f); return f }, createFile(a, b, c) { const f = typeof a === 'string' ? new File(a, Buffer.from(b), c) : new File(a.name, a.bytes, a.mime); this.files.push(f); return f }, _add(f) { this.files.push(f); return f }, setTrashed() {} };
const my = new Folder('root'), props = {};
const ctx = { console, Logger: { log() {} },
  DriveApp: { getFolderById: id => { if (!all[id]) throw new Error('x'); return all[id] }, getFoldersByName: n => my.getFoldersByName(n), createFolder: n => my.createFolder(n) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => props[k] = v, deleteProperty: k => delete props[k] }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({ timeBased: () => ({ everyDays: () => ({ atHour: () => ({ create() {} }) }) }) }) },
  Utilities: { getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => b > 127 ? b - 256 : b),
    base64Decode: s => Buffer.from(s, 'base64'), base64Encode: b => Buffer.from(b).toString('base64'), newBlob: (bytes, mime, name) => ({ bytes, mime, name }), formatDate: () => '2026-10-22' },
  ContentService: { MimeType: { JSON: 1 }, createTextOutput: s => ({ setMimeType: () => ({ s }) }) } };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(__dirname + '/../drive/Code.gs', 'utf8'), ctx);
ctx.caiDat(); console.log(props.MA_HLV);
http.createServer((rq, rs) => { let b = ''; rq.on('data', c => b += c); rq.on('end', () => {
  const out = rq.method === 'POST' ? ctx.doPost({ postData: { contents: b } }).s : ctx.doGet().s;
  if (rq.url === '/__props') { rs.end(JSON.stringify(props)); return; }
  rs.writeHead(200, { 'Content-Type': 'application/json' }); rs.end(out); }); }).listen(Number(process.argv[2] || 8799));
