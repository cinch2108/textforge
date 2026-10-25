/* Textforge regex worker: runs user patterns off the main thread so a
   catastrophic pattern can be terminated without freezing the page. */
'use strict';
const MAX_MATCHES = 5000;
function runRegex(req) {
  const { pattern, flags, text, replace, doReplace } = req;
  const t0 = Date.now();
  const re = new RegExp(pattern, flags);
  const global = re.global || re.sticky;
  const matches = [];
  let total = 0, capped = false;
  if (re.global) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      total++;
      if (matches.length < MAX_MATCHES) matches.push(pack(m));
      else { capped = true; }
      if (m[0] === '') re.lastIndex = advance(text, re.lastIndex, re.unicode || re.unicodeSets);
      if (total > 200000) { capped = true; break; }
    }
  } else {
    const m = re.exec(text);
    if (m) { total = 1; matches.push(pack(m)); }
  }
  let replaced = null;
  if (doReplace) replaced = text.replace(new RegExp(pattern, flags), replace);
  return { matches, total, capped, replaced, global, ms: Date.now() - t0 };
}
function advance(s, i, unicode) {
  if (!unicode || i >= s.length) return i + 1;
  const c = s.charCodeAt(i);
  return (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) ? i + 2 : i + 1;
}
function pack(m) {
  const groups = [];
  for (let g = 1; g < m.length; g++) groups.push(m[g] === undefined ? null : m[g]);
  const named = m.groups ? Object.entries(m.groups).map(([k, v]) => [k, v === undefined ? null : v]) : [];
  return { index: m.index, value: m[0], groups, named };
}
if (typeof self !== 'undefined' && typeof module === 'undefined') {
  self.onmessage = e => {
    const id = e.data && e.data.id;
    try { self.postMessage({ id, ok: true, ...runRegex(e.data) }); }
    catch (err) { self.postMessage({ id, ok: false, error: String(err && err.message || err) }); }
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { runRegex };
