// Giả lập môi trường Artifact của claude.ai: window.claude.use('db' | 'user' | 'downloads').
// Dữ liệu “trên tài khoản” giữ trong sessionStorage nên còn nguyên khi tải lại trang.
export async function installCloud(page, opts = {}) {
  await page.addInitScript(opts => {
    const KEY = '__mockcloud';
    const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; } };
    let S = load(); if (!S) { S = { docs: opts.docs || {}, log: [], saved: [] }; sessionStorage.setItem(KEY, JSON.stringify(S)); }
    /* luôn đọc lại từ sessionStorage để test sửa “dữ liệu trên tài khoản” giữa chừng được */
    const sync = () => { S = load() || S; };
    const persist = () => sessionStorage.setItem(KEY, JSON.stringify(S));
    const fail = op => { const f = (opts.fail || {})[op]; if (f) { const e = new Error(f); e.code = f; return e; } return null; };
    const docRef = path => ({
      async get() { sync(); const v = S.docs[path]; return { exists: v !== undefined, data: () => JSON.parse(JSON.stringify(v)) }; },
      async set(v) { sync(); const e = fail('set'); if (e) throw e; S.docs[path] = JSON.parse(JSON.stringify(v)); S.log.push('set ' + path); persist(); },
      async delete() { sync(); delete S.docs[path]; S.log.push('del ' + path); persist(); },
      collection: n => col(path + '/' + n)
    });
    const col = base => ({
      doc: k => docRef(base + '/' + k),
      where: (f, op, v) => ({ orderBy: () => ({ limit: n => ({ async get() { sync();
        const docs = Object.entries(S.docs).filter(([p]) => p.startsWith(base + '/') && !p.slice(base.length + 1).includes('/')).map(([, d]) => d).filter(d => d[f] > v).sort((a, b) => a[f] - b[f]).slice(0, n);
        return { size: docs.length, docs: docs.map(d => ({ data: () => JSON.parse(JSON.stringify(d)) })) }; } }) }) })
    });
    const db = { doc: docRef };
    const user = { id: async () => opts.uid === undefined ? 'u1' : opts.uid, can: async () => opts.canWrite !== false };
    const downloads = { async save({ filename, data }) { sync(); if (opts.dl) { const e = new Error(opts.dl); e.code = opts.dl; throw e; } S.saved.push({ filename, size: data.size }); persist(); } };
    window.claude = { use: async name => {
      if (opts.useFail) throw Object.assign(new Error('x'), { code: opts.useFail });
      return name === 'db' ? db : name === 'user' ? user : name === 'downloads' ? downloads : null; } };
    window.__cloud = { get S() { return load(); } };
  }, opts);
}
export const cloudState = page => page.evaluate(() => window.__cloud.S);
