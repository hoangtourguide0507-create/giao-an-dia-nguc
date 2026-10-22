// Chạy hàm tính toán của app trên một trạng thái dựng sẵn (không qua giao diện).
export async function calc(page, st, fn, arg) {
  return page.evaluate(([st, src, arg]) => {
    const S = window.__sota.state;
    for (const k of Object.keys(st)) if (k !== 'settings') S[k] = st[k];
    S.settings = { ...S.settings, ...(st.settings || {}) };
    const f = new Function('A', 'arg', 'return (' + src + ')(A, arg)');
    const out = f(window.__sota, arg);
    return out === undefined ? null : JSON.parse(JSON.stringify(out));
  }, [st, fn.toString(), arg]);
}
