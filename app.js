'use strict';
/* Frame-buster: GitHub Pages can't send frame-ancestors / X-Frame-Options, so if another origin frames this page, break out (or blank the page if breaking out is blocked). */
if (typeof window !== 'undefined' && window.top !== window.self) {
  let sameOrigin = false;
  try { sameOrigin = window.top.location.origin === window.location.origin; } catch (e) { sameOrigin = false; }
  if (!sameOrigin) {
    try { window.top.location.replace(window.location.href); } catch (e) { /* sandboxed */ }
    document.documentElement.style.display = 'none';
  }
}
/* ==========================================================================
   Textforge: pure text logic (no DOM). Exported for tests under Node.
   ========================================================================== */
const TF = (() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasSeg = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
  const segW = hasSeg ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
  const segG = hasSeg ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Hangul}]/u;
  const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:['’\-_.][\p{L}\p{M}\p{N}]+)*/gu;

  /* ---------- counting ---------- */
  function words(text) {
    if (segW && CJK.test(text) && text.length < 400000) {
      const out = []; for (const s of segW.segment(text)) if (s.isWordLike) out.push(s.segment); return out;
    }
    return text.match(WORD_RE) || [];
  }
  function graphemes(text) {
    if (segG && text.length < 400000 && /[^\x00-\x7f]/.test(text)) { let n = 0; for (const _ of segG.segment(text)) n++; return n; }
    if (/[^\x00-\x7f]/.test(text)) return Array.from(text).length;
    return text.length;
  }
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0; if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1;
  }
  function stats(text) {
    const w = words(text);
    const nonEmpty = /\S/.test(text);
    const sentences = nonEmpty ? text.split(/(?<=[.!?…。！？]["'”’)\]]*)\s+|\n\s*\n/).filter(s => /[\p{L}\p{N}]/u.test(s)).length : 0;
    const paras = nonEmpty ? text.split(/\n\s*\n/).filter(p => /\S/.test(p)).length : 0;
    const lines = text.length ? text.split(/\r\n|\r|\n/).length : 0;
    const uniq = new Set(w.map(x => x.toLowerCase())).size;
    const letters = w.reduce((a, x) => a + x.length, 0);
    let flesch = null;
    if (w.length >= 30 && sentences > 0 && !CJK.test(text)) {
      const sample = w.length > 20000 ? w.slice(0, 20000) : w;
      const syl = sample.reduce((a, x) => a + syllables(x), 0);
      flesch = 206.835 - 1.015 * (w.length / sentences) - 84.6 * (syl / sample.length);
      flesch = Math.max(0, Math.min(100, flesch));
    }
    return { words: w.length, chars: graphemes(text), nospace: graphemes(text.replace(/\s+/g, '')), sentences, paras, lines, unique: uniq,
      avg: w.length ? letters / w.length : 0, readSec: w.length / 238 * 60, speakSec: w.length / 150 * 60, flesch, wordList: w };
  }
  function fleschLabel(f) {
    if (f == null) return 'Readability (Flesch): needs 30+ words';
    return f >= 80 ? 'Very easy to read' : f >= 70 ? 'Easy to read' : f >= 60 ? 'Plain English' : f >= 50 ? 'Fairly difficult' : f >= 30 ? 'Difficult (college level)' : 'Very difficult (graduate level)';
  }
  function duration(sec) {
    if (sec < 1) return '0s';
    if (sec < 60) return Math.round(sec) + 's';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }
  const STOP = new Set(('a about above after again against all am an and any are aren\'t as at be because been before being below between both but by can can\'t cannot could couldn\'t did didn\'t do does doesn\'t doing don\'t down during each few for from further had hadn\'t has hasn\'t have haven\'t having he he\'d he\'ll he\'s her here here\'s hers herself him himself his how how\'s i i\'d i\'ll i\'m i\'ve if in into is isn\'t it it\'s its itself just let\'s me more most mustn\'t my myself no nor not now of off on once only or other ought our ours ourselves out over own same shan\'t she she\'d she\'ll she\'s should shouldn\'t so some such than that that\'s the their theirs them themselves then there there\'s these they they\'d they\'ll they\'re they\'ve this those through to too under until up very was wasn\'t we we\'d we\'ll we\'re we\'ve were weren\'t what what\'s when when\'s where where\'s which while who who\'s whom why why\'s will with won\'t would wouldn\'t you you\'d you\'ll you\'re you\'ve your yours yourself yourselves also get got may might much many one two us via vs etc').split(' '));
  function keywords(wordList, { n = 1, stop = true, limit = 12 } = {}) {
    const norm = wordList.map(x => x.toLowerCase().replace(/’/g, "'")).filter(x => !/^[\d.,\-_]+$/.test(x));
    const total = Math.max(1, norm.length - n + 1);
    const m = new Map();
    for (let i = 0; i + n <= norm.length; i++) {
      const g = norm.slice(i, i + n);
      if (stop && (STOP.has(g[0]) || STOP.has(g[n - 1]))) continue;
      if (n === 1 && g[0].length < 2) continue;
      const k = g.join(' '); m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m].filter(([, c]) => n === 1 || c > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit)
      .map(([word, count]) => ({ word, count, pct: count / total * 100 }));
  }
  const LIMITS = [['X / Twitter post', 280], ['Bluesky post', 300], ['Threads post', 500], ['SEO title tag', 60], ['Meta description', 160], ['SMS (one message)', 160], ['YouTube title', 100], ['Instagram caption', 2200], ['LinkedIn post', 3000], ['Facebook post (before "See more")', 477]];

  /* ---------- case ---------- */
  const SMALL = new Set('a an and as at but by en for from if in into nor of off on onto or over per so than the to up upon via vs vs. v. yet with'.split(' '));
  const upFirst = s => { const a = Array.from(s); return a.length ? a[0].toUpperCase() + a.slice(1).join('') : s; };
  const perLine = (s, f) => s.split('\n').map(f).join('\n');
  function splitWords(s) {
    return s.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2').replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
      .split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);
  }
  function capWord(w, force, lineHasLower) {
    const m = w.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su);
    const [, pre, core, post] = m;
    if (!core) return w;
    if (/\p{Ll}/u.test(core) && /\p{Lu}/u.test(core.slice(1))) return w;            // iPhone, McDonald
    if (lineHasLower && core.length > 1 && !/\p{Ll}/u.test(core) && /\p{Lu}/u.test(core)) return w; // NASA, API
    if (/^(https?:|www\.)|@|\.\w{2,}\//i.test(core)) return w;                        // urls, emails
    const lower = core.toLowerCase();
    if (!force && SMALL.has(lower)) return pre + lower + post;
    return pre + upFirst(lower) + post;
  }
  function titleCase(s) {
    return perLine(s, line => {
      const hasLower = /\p{Ll}/u.test(line);
      const parts = line.split(/(\s+)/);
      const idx = []; parts.forEach((p, i) => { if (p.trim()) idx.push(i); });
      const first = idx[0], last = idx[idx.length - 1];
      let afterBreak = false;
      return parts.map((p, i) => {
        if (!p.trim()) return p;
        const force = i === first || i === last || afterBreak;
        afterBreak = /[:.!?—–]["'”’)]*$/.test(p) || p === '-' || p === '—';
        const segs = p.split('-');
        return segs.map((seg, j) => capWord(seg, (force && (j === 0 || (i === last && j === segs.length - 1))) || (j > 0 && !SMALL.has(seg.toLowerCase())), hasLower)).join('-');
      }).join('');
    });
  }
  function sentenceCase(s) {
    return s.toLowerCase()
      .replace(/(^|[.!?…]\s+|\n\s*)(["'“‘(\[¿¡]*)(\p{Ll})/gu, (m, a, b, c) => a + b + c.toUpperCase())
      .replace(/(^|[^\p{L}])i(?=$|[^\p{L}])/gu, '$1I');
  }
  const joinCase = (s, f) => perLine(s, l => { const lead = l.match(/^\s*/)[0]; const w = splitWords(l); return w.length ? lead + f(w) : l; });
  const CASES = {
    upper: s => s.toUpperCase(),
    lower: s => s.toLowerCase(),
    title: titleCase,
    sentence: sentenceCase,
    camel: s => joinCase(s, w => w.map((x, i) => i ? upFirst(x.toLowerCase()) : x.toLowerCase()).join('')),
    pascal: s => joinCase(s, w => w.map(x => upFirst(x.toLowerCase())).join('')),
    snake: s => joinCase(s, w => w.map(x => x.toLowerCase()).join('_')),
    kebab: s => joinCase(s, w => w.map(x => x.toLowerCase()).join('-')),
    constant: s => joinCase(s, w => w.map(x => x.toUpperCase()).join('_')),
    dot: s => joinCase(s, w => w.map(x => x.toLowerCase()).join('.')),
    alternating: s => { let k = 0; return Array.from(s).map(c => { if (c.toLowerCase() === c.toUpperCase()) return c; return (k++ % 2) ? c.toUpperCase() : c.toLowerCase(); }).join(''); },
    inverse: s => Array.from(s).map(c => { const u = c.toUpperCase(); return c === u ? c.toLowerCase() : u; }).join(''),
    trim: s => s.split('\n').map(l => l.replace(/[ \t\u00a0\u2000-\u200b\u3000]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    nobreaks: s => s.replace(/[ \t]*\r?\n[ \t]*/g, ' ').replace(/ {2,}/g, ' ').trim(),
    noempty: s => s.split('\n').filter(l => l.trim()).join('\n'),
    sortaz: s => s.split('\n').sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).join('\n'),
    sortza: s => s.split('\n').sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })).join('\n'),
    dedupe: s => { const seen = new Set(); return s.split('\n').filter(l => seen.has(l) ? false : (seen.add(l), true)).join('\n'); },
    revlines: s => s.split('\n').reverse().join('\n'),
    revtext: s => segG && s.length < 400000 ? Array.from(segG.segment(s), x => x.segment).reverse().join('') : Array.from(s).reverse().join(''),
    number: s => { const l = s.split('\n'); const w = String(l.length).length; return l.map((x, i) => String(i + 1).padStart(w, ' ') + '. ' + x).join('\n'); },
  };

  /* ---------- JSON ---------- */
  function lineCol(src, pos) {
    let line = 1, last = -1;
    for (let i = 0; i < pos && i < src.length; i++) if (src.charCodeAt(i) === 10) { line++; last = i; }
    return { line, col: pos - last };
  }
  function jsonCheck(src) {
    let i = 0; const n = src.length; const big = []; const dups = [];
    const fail = (msg, pos = i) => { throw { jsonErr: true, msg, pos: Math.min(pos, n) }; };
    const ws = () => { while (i < n) { const c = src.charCodeAt(i); if (c === 32 || c === 9 || c === 10 || c === 13) i++; else break; } };
    const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    function str() {
      const start = i; i++;
      while (i < n) {
        const c = src.charCodeAt(i);
        if (c === 34) { i++; return src.slice(start + 1, i - 1); }
        if (c === 92) {
          const e = src[i + 1];
          if (e === 'u') { if (!/^[0-9a-fA-F]{4}$/.test(src.substr(i + 2, 4))) fail('Invalid \\u escape: needs 4 hex digits', i); i += 6; continue; }
          if (!e || '"\\/bfnrt'.indexOf(e) < 0) fail(`Invalid escape "\\${e || ''}" in string`, i);
          i += 2; continue;
        }
        if (c < 32) fail(c === 10 ? 'Line break inside a string: use \\n instead' : 'Unescaped control character inside a string', i);
        i++;
      }
      fail('Unterminated string: missing closing "', start);
    }
    function value(depth) {
      if (depth > 1000) fail('Nesting is more than 1000 levels deep');
      ws();
      if (i >= n) fail('Unexpected end of input: a value was expected');
      const c = src[i];
      if (c === '{') {
        i++; ws(); if (src[i] === '}') { i++; return; }
        const keys = new Set();
        for (;;) {
          ws();
          if (src[i] !== '"') fail(src[i] === "'" ? 'Property names must use double quotes, not single quotes' : src[i] === '}' ? 'Trailing comma before }' : i >= n ? 'Unexpected end of input: missing }' : 'Expected a "double-quoted" property name');
          const kp = i; const k = str();
          if (keys.has(k)) dups.push({ key: k, pos: kp }); keys.add(k);
          ws(); if (src[i] !== ':') fail('Expected : after property name');
          i++; value(depth + 1); ws();
          if (src[i] === ',') { i++; continue; }
          if (src[i] === '}') { i++; return; }
          fail(i >= n ? 'Unexpected end of input: missing }' : 'Expected , or } after property value (missing comma?)');
        }
      }
      if (c === '[') {
        i++; ws(); if (src[i] === ']') { i++; return; }
        for (;;) {
          value(depth + 1); ws();
          if (src[i] === ',') { i++; ws(); if (src[i] === ']') fail('Trailing comma before ]'); continue; }
          if (src[i] === ']') { i++; return; }
          fail(i >= n ? 'Unexpected end of input: missing ]' : 'Expected , or ] after array item (missing comma?)');
        }
      }
      if (c === '"') { str(); return; }
      if (c === '-' || (c >= '0' && c <= '9')) {
        NUM.lastIndex = i; const m = NUM.exec(src);
        if (!m) fail('Invalid number');
        if (/^-?0\d/.test(src.slice(i, i + 3))) fail('Numbers cannot have leading zeros');
        const t = m[0];
        if (/^-?\d{16,}$/.test(t) && !Number.isSafeInteger(Number(t))) big.push({ value: t, pos: i });
        i += t.length;
        if (/[.\deE]/.test(src[i] || '')) fail('Invalid number');
        return;
      }
      if (src.startsWith('true', i)) { i += 4; return; }
      if (src.startsWith('false', i)) { i += 5; return; }
      if (src.startsWith('null', i)) { i += 4; return; }
      if (c === "'") fail('Strings must use double quotes, not single quotes');
      if (src.startsWith('//', i) || src.startsWith('/*', i)) fail('Comments are not allowed in JSON');
      const word = (src.slice(i).match(/^[A-Za-z_$][\w$]*/) || [])[0];
      if (word) fail(/^(True|False|None|undefined|NaN|Infinity)$/.test(word) ? `"${word}" is not valid JSON (use true, false or null)` : `Unexpected word "${word.slice(0, 30)}": strings need "double quotes"`);
      fail(`Unexpected character ${JSON.stringify(c)}`);
    }
    try {
      if (src.charCodeAt(0) === 0xfeff) i = 1;
      ws(); if (i >= n) return { ok: false, empty: true, msg: 'Empty input', pos: 0, line: 1, col: 1 };
      value(0); ws();
      if (i < n) fail('Unexpected content after the end of the JSON value');
      return { ok: true, big, dups };
    } catch (e) {
      if (!e || !e.jsonErr) throw e;
      return { ok: false, msg: e.msg, pos: e.pos, ...lineCol(src, e.pos) };
    }
  }
  function jsonRepair(s) {
    let out = '', i = 0; const n = s.length;
    const MAP = { True: 'true', False: 'false', None: 'null', undefined: 'null', NaN: 'null', Infinity: 'null' };
    while (i < n) {
      const c = s[i];
      if (c === '"' || c === "'") {
        let j = i + 1, str = '';
        while (j < n && s[j] !== c) {
          if (s[j] === '\\' && j + 1 < n) { const e = s[j + 1]; str += (c === "'" && e === "'") ? "'" : s[j] + e; j += 2; continue; }
          const ch = s[j];
          str += ch === '"' ? '\\"' : ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ch;
          j++;
        }
        out += '"' + str + '"'; i = j + 1; continue;
      }
      if (c === '/' && s[i + 1] === '/') { while (i < n && s[i] !== '\n') i++; continue; }
      if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      if (c === ',') {
        let j = i + 1;
        for (;;) {
          while (j < n && /\s/.test(s[j])) j++;
          if (s[j] === '/' && s[j + 1] === '/') { while (j < n && s[j] !== '\n') j++; continue; }
          if (s[j] === '/' && s[j + 1] === '*') { const e = s.indexOf('*/', j + 2); j = e < 0 ? n : e + 2; continue; }
          break;
        }
        if (j >= n || s[j] === '}' || s[j] === ']') { i++; continue; }
      }
      if (/[A-Za-z_$]/.test(c)) {
        let j = i; while (j < n && /[\w$]/.test(s[j])) j++;
        const w = s.slice(i, j); let k = j; while (k < n && /\s/.test(s[k])) k++;
        out += s[k] === ':' ? JSON.stringify(w) : (MAP[w] || w); i = j; continue;
      }
      out += c; i++;
    }
    return out;
  }
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort((a, b) => a.localeCompare(b))) Object.defineProperty(o, k, { value: sortKeys(v[k]), enumerable: true, writable: true, configurable: true }); return o; }
    return v;
  }
  function jsonHighlight(s) {
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],]/g;
    let out = '', last = 0, m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      let cls;
      if (m[1]) cls = m[2] ? 'j-k' : 'j-s'; else if (m[3]) cls = 'j-b'; else if (m[0] === 'null') cls = 'j-z'; else if (/[{}\[\],]/.test(m[0])) cls = 'j-p'; else cls = 'j-n';
      if (m[1] && m[2]) out += `<span class="j-k">${esc(m[1])}</span>${esc(m[2])}`;
      else out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(s.slice(last));
  }

  /* ---------- encoders ---------- */
  function bytesToB64(bytes) { let bin = ''; const CH = 0x8000; for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH)); return btoa(bin); }
  function b64Encode(s, urlSafe) { let o = bytesToB64(new TextEncoder().encode(s)); if (urlSafe) o = o.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); return o; }
  function b64ToBytes(s) {
    let t = s.trim().replace(/^data:[^,]*?;base64,/i, '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (/[^A-Za-z0-9+/=]/.test(t)) throw new Error('Contains characters that are not valid Base64');
    t = t.replace(/=+$/, '');
    if (t.length % 4 === 1) throw new Error('Invalid Base64: the length is off by one character');
    t += '='.repeat((4 - t.length % 4) % 4);
    const bin = atob(t); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64Decode(s) {
    const bytes = b64ToBytes(s);
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bytes, binary: false }; }
    catch { return { text: null, bytes, binary: true }; }
  }
  function urlEncode(s, kind) { return kind === 'full' ? encodeURI(s) : encodeURIComponent(s); }
  function urlDecode(s, kind, plus) {
    const t = plus ? s.replace(/\+/g, ' ') : s;
    try { return kind === 'full' ? decodeURI(t) : decodeURIComponent(t); }
    catch { throw new Error('Malformed % sequence: a % must be followed by two hex digits forming valid UTF-8'); }
  }
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', bull: '•', middot: '·', deg: '°', plusmn: '±', times: '×', divide: '÷', euro: '€', pound: '£', yen: '¥', cent: '¢', curren: '¤', sect: '§', para: '¶', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›', iexcl: '¡', iquest: '¿', micro: 'µ', frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', rArr: '⇒', lArr: '⇐', hearts: '♥', spades: '♠', clubs: '♣', diams: '♦', infin: '∞', ne: '≠', le: '≤', ge: '≥', asymp: '≈', minus: '−', permil: '‰', prime: '′', Prime: '″', dagger: '†', Dagger: '‡', shy: '\u00ad', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', zwj: '\u200d', zwnj: '\u200c', ordf: 'ª', ordm: 'º', not: '¬', macr: '¯', acute: '´', cedil: '¸', uml: '¨', szlig: 'ß', agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý', yuml: 'ÿ', Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Auml: 'Ä', Aring: 'Å', Ccedil: 'Ç', Eacute: 'É', Egrave: 'È', Ntilde: 'Ñ', Ouml: 'Ö', Uuml: 'Ü', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', pi: 'π', sigma: 'σ', mu: 'μ', lambda: 'λ', omega: 'ω', Omega: 'Ω', Delta: 'Δ', sum: '∑', radic: '√', check: '✓' };
  function htmlEncode(s, all) {
    let o = s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    if (all) o = Array.from(o).map(c => { const cp = c.codePointAt(0); return cp > 126 ? `&#x${cp.toString(16).toUpperCase()};` : c; }).join('');
    return o;
  }
  function htmlDecode(s) {
    return s.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([A-Za-z][A-Za-z0-9]{1,31}));?/g, (m, d, h, name) => {
      if (d || h) { const cp = parseInt(d || h, d ? 10 : 16); return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : '\ufffd'; }
      return Object.prototype.hasOwnProperty.call(ENT, name) ? ENT[name] : m;
    });
  }

  /* ---------- diff (Myers O(ND) with prefix/suffix trim) ---------- */
  function myers(a, b, limit = 3000) {
    let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length; while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const ops = []; for (let i = 0; i < s; i++) ops.push(['=', i, i]);
    const A = a.slice(s, ea), B = b.slice(s, eb), N = A.length, M = B.length;
    let approx = false;
    if (!N) for (let j = 0; j < M; j++) ops.push(['+', -1, s + j]);
    else if (!M) for (let i = 0; i < N; i++) ops.push(['-', s + i, -1]);
    else {
      const max = N + M, off = max + 1, V = new Int32Array(2 * max + 3), trace = []; let D, found = false;
      for (D = 0; D <= max; D++) {
        for (let k = -D; k <= D; k += 2) {
          let x = (k === -D || (k !== D && V[off + k - 1] < V[off + k + 1])) ? V[off + k + 1] : V[off + k - 1] + 1;
          let y = x - k;
          while (x < N && y < M && A[x] === B[y]) { x++; y++; }
          V[off + k] = x;
          if (x >= N && y >= M) { found = true; break; }
        }
        trace.push(V.slice(off - D, off + D + 1));
        if (found || D >= limit) break;
      }
      if (!found) { approx = true; for (let i = 0; i < N; i++) ops.push(['-', s + i, -1]); for (let j = 0; j < M; j++) ops.push(['+', -1, s + j]); }
      else {
        const rev = []; let x = N, y = M;
        for (let d = D; d > 0; d--) {
          const vp = trace[d - 1], get = k => vp[k + d - 1], k = x - y;
          const down = k === -d || (k !== d && get(k - 1) < get(k + 1));
          const pk = down ? k + 1 : k - 1, px = get(pk), py = px - pk;
          while (x > px && y > py) { rev.push(['=', s + x - 1, s + y - 1]); x--; y--; }
          if (down) { rev.push(['+', -1, s + y - 1]); y--; } else { rev.push(['-', s + x - 1, -1]); x--; }
        }
        while (x > 0 && y > 0) { rev.push(['=', s + x - 1, s + y - 1]); x--; y--; }
        for (let r = rev.length - 1; r >= 0; r--) ops.push(rev[r]);
      }
    }
    for (let i = ea, j = eb; i < a.length; i++, j++) ops.push(['=', i, j]);
    ops.approx = approx; return ops;
  }
  function keyer(opts) {
    return t => { if (opts.ignoreCase) t = t.toLowerCase(); if (opts.ignoreWs) t = t.replace(/\s+/g, ' ').trim(); return t; };
  }
  function toIds(listA, listB, key) {
    const map = new Map(); const id = t => { const k = key(t); let v = map.get(k); if (v === undefined) { v = map.size; map.set(k, v); } return v; };
    return [listA.map(id), listB.map(id)];
  }
  const splitLines = s => s === '' ? [] : s.replace(/\r\n?/g, '\n').split('\n');
  const tokenize = s => s.match(/\s+|[\p{L}\p{M}\p{N}_]+|[^\s\p{L}\p{M}\p{N}_]/gu) || [];
  function diffLines(a, b, opts = {}) {
    const A = splitLines(a), B = splitLines(b);
    const [ia, ib] = toIds(A, B, keyer(opts));
    const ops = myers(ia, ib);
    let add = 0, del = 0, same = 0; for (const o of ops) o[0] === '+' ? add++ : o[0] === '-' ? del++ : same++;
    return { A, B, ops, add, del, same, approx: ops.approx };
  }
  function diffWords(a, b, opts = {}) {
    const A = tokenize(a), B = tokenize(b);
    const key = opts.ignoreWs ? t => (/^\s+$/.test(t) ? ' ' : (opts.ignoreCase ? t.toLowerCase() : t)) : keyer(opts);
    const [ia, ib] = toIds(A, B, key);
    const ops = myers(ia, ib, 4000);
    const parts = []; let add = 0, del = 0;
    for (const [t, i, j] of ops) {
      const text = t === '+' ? B[j] : A[i];
      if (/\S/.test(text)) { if (t === '+') add++; else if (t === '-') del++; }
      const last = parts[parts.length - 1];
      if (last && last.t === t) last.text += text; else parts.push({ t, text });
    }
    return { parts, add, del, approx: ops.approx };
  }

  /* ---------- lorem ipsum ---------- */
  const FLAVORS = {
    latin: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a odio nullam varius turpis et commodo pharetra eros bibendum elit nec luctus magna felis sollicitudin mauris integer viverra accumsan nunc vestibulum ante primis faucibus ultrices posuere cubilia mattis porta semper morbi tristique senectus netus malesuada fames ac',
    tech: 'scalable platform cloud native microservices pipeline deploy roadmap sprint backlog api endpoint latency throughput serverless container cluster analytics dashboard onboarding funnel growth retention churn metrics stack frontend backend refactor feature flag rollout beta launch users seamless integration workflow automation insights realtime sync edge cache payload schema iteration velocity prototype ship product market fit pivot runway seed round founders',
    office: 'synergy leverage bandwidth circle back deep dive alignment stakeholders deliverables actionable insights move the needle low hanging fruit best practices touch base going forward core competencies paradigm shift value add holistic approach mission critical quick win key takeaways in the loop thought leadership win win ecosystem empower streamline strategic initiative north star offline drill down baked in pain point bottom line',
    space: 'orbit nebula galaxy comet asteroid stellar cosmic gravity lunar solar eclipse telescope astronaut rocket launch payload module capsule spacewalk horizon quasar pulsar supernova constellation meteor crater rover mission trajectory satellite station cosmos vacuum thruster booster countdown liftoff atmosphere planet exoplanet red dwarf event horizon light year',
    coffee: 'espresso latte cappuccino macchiato crema barista roast arabica robusta pour over cold brew grinder beans aroma oat milk foam steamed cortado americano flat white mocha caramel drizzle drip filter french press single origin tasting notes chocolate citrus nutty bright body acidity mug saucer cafe morning refill warm cozy',
  };
  const CLASSIC = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
  function lorem({ n = 3, unit = 'p', flavor = 'latin', classic = true, html = false, rand = Math.random } = {}) {
    const W = (FLAVORS[flavor] || FLAVORS.latin).split(' ');
    const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
    const pick = () => W[Math.floor(rand() * W.length)];
    let usedClassic = false;
    const sentence = (min = 7, max = 15) => {
      if (classic && !usedClassic) { usedClassic = true; return flavor === 'latin' ? CLASSIC : 'Lorem ipsum ' + sentence(min, max).replace(/^./, c => c.toLowerCase()); }
      const len = ri(min, max); const ws = [];
      for (let i = 0; i < len; i++) { let w = pick(); if (i && w === ws[ws.length - 1]) w = pick(); ws.push(w); }
      if (len > 8 && rand() < 0.6) { const c = ri(3, len - 4); ws[c] += ','; }
      const s = ws.join(' '); return s.charAt(0).toUpperCase() + s.slice(1) + (rand() < 0.08 ? '?' : '.');
    };
    n = Math.max(1, Math.min(unit === 'w' ? 10000 : unit === 's' ? 2000 : 200, Math.floor(+n) || 1));
    if (unit === 'w') {
      const ws = []; if (classic) ws.push(...'lorem ipsum dolor sit amet'.split(' ').slice(0, n));
      while (ws.length < n) ws.push(pick());
      let s = ws.join(' '); s = s.charAt(0).toUpperCase() + s.slice(1) + '.';
      return html ? `<p>${s}</p>` : s;
    }
    if (unit === 's') { const ss = []; for (let i = 0; i < n; i++) ss.push(sentence()); const t = ss.join(' '); return html ? `<p>${t}</p>` : t; }
    if (unit === 'l') {
      const items = []; for (let i = 0; i < n; i++) items.push(sentence(3, 8).replace(/[.?]$/, '').replace(/,/g, ''));
      return html ? `<ul>\n${items.map(x => `  <li>${x}</li>`).join('\n')}\n</ul>` : items.map(x => '• ' + x).join('\n');
    }
    const ps = []; for (let i = 0; i < n; i++) { const k = ri(4, 7); const ss = []; for (let j = 0; j < k; j++) ss.push(sentence()); ps.push(ss.join(' ')); }
    return html ? ps.map(p => `<p>${p}</p>`).join('\n\n') : ps.join('\n\n');
  }

  return { esc, words, stats, fleschLabel, duration, keywords, LIMITS, CASES, splitWords, jsonCheck, jsonRepair, sortKeys, jsonHighlight, lineCol,
    b64Encode, b64Decode, b64ToBytes, bytesToB64, urlEncode, urlDecode, htmlEncode, htmlDecode, myers, diffLines, diffWords, lorem, FLAVORS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TF;

/* ==========================================================================
   UI (browser only). No inline handlers: everything is delegated from here.
   ========================================================================== */
if (typeof document !== 'undefined') (() => {
  const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || location.href;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const { esc } = TF;
  const fmtN = n => n.toLocaleString('en-US');
  const fmtBytes = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), typeof ms === 'function' ? ms() : ms); }; };
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1500); };
  function copy(txt, label) {
    if (!txt) return toast('Nothing to copy yet');
    const done = () => toast((label || 'Copied') + (txt.length > 40 ? ` · ${fmtN(txt.length)} characters` : ''));
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt, done));
    else fallbackCopy(txt, done);
  }
  function fallbackCopy(txt, done) { const ta = el('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch { toast('Copy failed: select and press Ctrl+C'); } ta.remove(); }
  function download(name, data, type = 'text/plain;charset=utf-8') {
    if (!data || (data.length === 0)) return toast('Nothing to download yet');
    const url = URL.createObjectURL(new Blob([data], { type })); const a = el('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const valOf = id => { const e = document.getElementById(id); return e ? ('value' in e && e.tagName !== 'PRE' ? e.value : e.textContent) : ''; };
  const fire = e => e.dispatchEvent(new Event('input', { bubbles: true }));

  /* ---------- tabs, last-used tool, keyboard ---------- */
  const view = document.body.dataset.view || 'count';
  const page = document.body.dataset.page || view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + view));
  const tabs = $$('#tabs .tab');
  const last = store.get('textforge.page');
  if (document.body.dataset.home === '1' && last && last !== page) {
    const t = tabs.find(x => x.dataset.p === last);
    if (t && t.href) { const a = el('a'); a.href = t.href; a.textContent = '↩ Continue with ' + (t.dataset.name || t.textContent); const r = $('#resume'); r.appendChild(a); r.hidden = false; }
  }
  store.set('textforge.page', page);
  $('#tabs').addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].focus(); }
  });
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) { const t = tabs[+e.code.slice(5) - 1]; if (t) { e.preventDefault(); t.click(); } }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (view === 'json') { e.preventDefault(); jsonRun('format'); }
      if (view === 'lorem') { e.preventDefault(); loGen(); }
    }
  });

  /* ---------- word counter ---------- */
  const cntIn = $('#cnt-in');
  const limBox = $('#cnt-limits');
  const limRows = TF.LIMITS.map(([name, max]) => {
    const r = el('div', 'lim'); const top = el('div', 'top'); const b = el('b', null, name); const s = el('span', null, `0 / ${max}`);
    top.append(b, s); const bar = el('div', 'bar'); const i = el('i'); i.style.width = '0%'; bar.appendChild(i); r.append(top, bar); limBox.appendChild(r);
    return { r, s, i, max };
  });
  function countRender() {
    const text = cntIn.value; const st = TF.stats(text);
    const set = (k, v) => { const e = $(`#cnt-stats [data-k="${k}"]`); if (e) e.textContent = v; };
    set('words', fmtN(st.words)); set('chars', fmtN(st.chars)); set('nospace', fmtN(st.nospace)); set('sentences', fmtN(st.sentences));
    set('paras', fmtN(st.paras)); set('lines', fmtN(st.lines)); set('read', TF.duration(st.readSec)); set('speak', TF.duration(st.speakSec));
    set('unique', fmtN(st.unique)); set('avg', st.avg ? st.avg.toFixed(1) : '0');
    set('flesch', st.flesch == null ? '–' : st.flesch.toFixed(0) + ' / 100'); set('fleschlbl', TF.fleschLabel(st.flesch));
    for (const L of limRows) {
      const over = st.chars > L.max; L.r.classList.toggle('over', over);
      L.s.textContent = over ? `${fmtN(st.chars)} / ${fmtN(L.max)} · ${fmtN(st.chars - L.max)} over` : `${fmtN(st.chars)} / ${fmtN(L.max)} · ${fmtN(L.max - st.chars)} left`;
      L.s.classList.toggle('over', over); L.i.style.width = Math.min(100, st.chars / L.max * 100) + '%';
    }
    const kw = TF.keywords(st.wordList, { n: +$('#kw-n').value, stop: $('#kw-stop').checked });
    const box = $('#cnt-kw'); box.textContent = '';
    if (!kw.length) { box.appendChild(el('p', 'hint', st.words ? 'No repeated keywords yet.' : 'Keywords and their density appear here.')); return; }
    const top = kw[0].count;
    for (const k of kw) { const r = el('div', 'kwrow'); r.style.setProperty('--w', (k.count / top * 100) + '%'); r.append(el('b', null, k.word), el('span', null, '×' + k.count), el('span', null, k.pct.toFixed(1) + '%')); box.appendChild(r); }
  }
  const countLater = debounce(countRender, () => cntIn.value.length > 100000 ? 250 : 40);

  /* ---------- case converter ---------- */
  const caseIn = $('#case-in'); const caseHist = [];
  const caseInfo = () => { const v = caseIn.value; $('#case-info').textContent = `${fmtN(v.length)} characters · ${fmtN(v ? v.split('\n').length : 0)} lines · ${fmtN(TF.words(v).length)} words`; };
  $('#v-case').addEventListener('click', e => {
    const b = e.target.closest('[data-case]'); if (!b) return;
    const f = TF.CASES[b.dataset.case]; if (!f) return;
    if (!caseIn.value) { toast('Paste or type some text first'); caseIn.focus(); return; }
    const out = f(caseIn.value);
    if (out === caseIn.value) return toast('Already in that format');
    caseHist.push(caseIn.value); if (caseHist.length > 25) caseHist.shift();
    caseIn.value = out; caseInfo();
    $$('#v-case [data-case]').forEach(x => x.classList.toggle('done', x === b));
    toast(b.textContent + ' ✓');
  });

  /* ---------- JSON ---------- */
  const jIn = $('#json-in'), jOut = $('#json-out'), jTree = $('#json-tree'), jErr = $('#json-err'), jStat = $('#json-status');
  let jText = '', jValue, jHas = false, jView = 'code';
  const setPill = (p, cls, txt) => { p.className = 'pill' + (p.classList.contains('sm') ? ' sm' : '') + (cls ? ' ' + cls : ''); p.textContent = txt; };
  function jsonShowError(src, r) {
    setPill(jStat, 'bad', `✗ Line ${r.line}, column ${r.col}`);
    jErr.textContent = '';
    const head = el('div'); head.append(el('b', null, 'Invalid JSON: '), document.createTextNode(`${r.msg} (line ${r.line}, column ${r.col})`));
    const lines = src.split('\n'); const from = Math.max(0, r.line - 3), to = Math.min(lines.length, r.line + 1);
    const w = String(to).length; const pre = el('pre');
    for (let ln = from; ln < to; ln++) {
      let text = lines[ln]; let start = 0;
      if (text.length > 160) { start = ln === r.line - 1 ? Math.max(0, r.col - 80) : 0; text = text.slice(start, start + 160); }
      pre.appendChild(document.createTextNode(String(ln + 1).padStart(w) + ' │ '));
      if (ln === r.line - 1) {
        const c = r.col - 1 - start;
        pre.appendChild(document.createTextNode(text.slice(0, c)));
        pre.appendChild(el('mark', null, text.slice(c, c + 1) || ' '));
        pre.appendChild(document.createTextNode(text.slice(c + 1)));
      } else pre.appendChild(document.createTextNode(text));
      pre.appendChild(document.createTextNode('\n'));
    }
    const go = el('button', 'btn sm', 'Go to error'); go.dataset.act = 'json-goto'; go.dataset.pos = r.pos;
    const fix = el('button', 'btn sm', '✨ Try Repair'); fix.dataset.act = 'json-repair'; fix.style.marginLeft = '6px';
    jErr.append(head, pre, go, fix); jErr.hidden = false;
  }
  function jsonValidate() {
    const src = jIn.value;
    if (!src.trim()) { setPill(jStat, '', 'Waiting for JSON'); jErr.hidden = true; return null; }
    const r = TF.jsonCheck(src);
    if (!r.ok) { jsonShowError(src, r); return null; }
    jErr.hidden = true;
    const warn = [];
    if (r.big.length) warn.push(`${r.big.length} number${r.big.length > 1 ? 's' : ''} too big for exact precision`);
    if (r.dups.length) warn.push(`${r.dups.length} duplicate key${r.dups.length > 1 ? 's' : ''} ("${r.dups[0].key.slice(0, 20)}")`);
    setPill(jStat, warn.length ? 'warn' : 'ok', '✓ Valid JSON · ' + fmtBytes(new Blob([src]).size) + (warn.length ? ' · ⚠ ' + warn.join(', ') : ''));
    return r;
  }
  function jsonRun(kind) {
    const src = jIn.value;
    if (!src.trim()) { toast('Paste some JSON first'); jIn.focus(); return; }
    const r = jsonValidate();
    if (!r) { toast('Invalid JSON: see the highlighted error'); return; }
    let v = JSON.parse(src.charCodeAt(0) === 0xfeff ? src.slice(1) : src);
    if ($('#json-sort').checked) v = TF.sortKeys(v);
    const ind = $('#json-indent').value;
    jText = kind === 'minify' ? JSON.stringify(v) : JSON.stringify(v, null, ind === 'tab' ? '\t' : +ind);
    jValue = v; jHas = true; jsonRender();
    toast(kind === 'minify' ? `Minified · ${fmtBytes(new Blob([jText]).size)}` : 'Formatted ✓');
  }
  function jsonRender() {
    jOut.hidden = jView !== 'code'; jTree.hidden = jView !== 'tree';
    if (!jHas) { jOut.textContent = ''; jTree.textContent = ''; return; }
    if (jView === 'code') { if (jText.length < 1500000) jOut.innerHTML = TF.jsonHighlight(jText); else jOut.textContent = jText; }
    else buildTree();
  }
  const treeData = new WeakMap(); let treeCount = 0; const TREE_MAX = 20000;
  const pathJoin = (p, k) => typeof k === 'number' ? `${p}[${k}]` : /^[A-Za-z_$][\w$]*$/.test(k) ? `${p}.${k}` : `${p}[${JSON.stringify(k)}]`;
  function leafSpan(v) {
    if (v === null) return el('span', 'j-z', 'null');
    if (typeof v === 'string') return el('span', 'j-s', JSON.stringify(v.length > 500 ? v.slice(0, 500) + '…' : v));
    if (typeof v === 'number') return el('span', 'j-n', String(v));
    return el('span', 'j-b', String(v));
  }
  function treeNode(key, v, path, depth) {
    treeCount++;
    const label = frag => { if (key !== null) { frag.appendChild(el('span', typeof key === 'number' ? 'j-n' : 'j-k', typeof key === 'number' ? String(key) : JSON.stringify(key))); frag.appendChild(document.createTextNode(': ')); } };
    if (v && typeof v === 'object') {
      const d = el('details'); const s = el('summary'); label(s);
      const isArr = Array.isArray(v); const n = isArr ? v.length : Object.keys(v).length;
      s.appendChild(el('span', 'j-p', isArr ? '[ ]' : '{ }')); s.appendChild(el('span', 'cnt', `${fmtN(n)} ${isArr ? (n === 1 ? 'item' : 'items') : (n === 1 ? 'key' : 'keys')}`));
      s.title = path + ' (Alt+click to copy path)'; s.dataset.path = path;
      d.appendChild(s); treeData.set(d, { v, path, depth, filled: false });
      if (depth < 3 && treeCount < 400) { d.open = true; fillNode(d); }
      return d;
    }
    const leaf = el('div', 'leaf'); label(leaf); leaf.appendChild(leafSpan(v)); leaf.dataset.path = path; leaf.title = 'Click to copy path ' + path;
    return leaf;
  }
  function fillNode(d) {
    const info = treeData.get(d); if (!info || info.filled) return; info.filled = true;
    const { v, path, depth } = info; const keys = Array.isArray(v) ? v.map((_, i) => i) : Object.keys(v);
    let shown = 0;
    for (const k of keys) {
      if (shown >= 1000 || treeCount > TREE_MAX) { d.appendChild(el('div', 'leaf hint', `… ${fmtN(keys.length - shown)} more (switch to Code view to see everything)`)); break; }
      d.appendChild(treeNode(k, v[k], pathJoin(path, k), depth + 1)); shown++;
    }
  }
  function buildTree() { jTree.textContent = ''; treeCount = 0; jTree.appendChild(treeNode(null, jValue, '$', 0)); }
  jTree.addEventListener('toggle', e => { if (e.target.tagName === 'DETAILS' && e.target.open) fillNode(e.target); }, true);
  jTree.addEventListener('click', e => {
    const leaf = e.target.closest('.leaf[data-path]'); if (leaf) return copy(leaf.dataset.path, 'Path copied');
    const s = e.target.closest('summary'); if (s && e.altKey) { e.preventDefault(); copy(s.dataset.path, 'Path copied'); }
  });
  const jsonLater = debounce(jsonValidate, () => jIn.value.length > 1000000 ? 700 : 200);
  const SAMPLE_JSON = '{"name":"Textforge","version":2,"free":true,"tools":["counter","case","json","base64","url","diff","lorem","regex"],"limits":{"jsonMB":5,"fileMB":10},"author":null,"tags":[{"id":1,"label":"privacy"},{"id":2,"label":"speed"}]}';

  /* ---------- encode / decode ---------- */
  const eIn = $('#enc-in'), eOut = $('#enc-out'), eStat = $('#enc-status');
  let eMode = ['b64', 'url', 'html'].includes(document.body.dataset.mode) ? document.body.dataset.mode : 'b64', eDir = 'enc';
  let fileRaw = null, fileType = '', fileUrl = null;
  function encSetup() {
    $$('#enc-mode button').forEach(b => b.classList.toggle('on', b.dataset.mode === eMode));
    $$('#enc-dir button').forEach(b => b.classList.toggle('on', b.dataset.dir === eDir));
    $$('#v-encode [data-for]').forEach(x => { x.hidden = x.dataset.for !== eMode; });
    const names = { b64: 'Base64', url: 'URL', html: 'HTML entities' };
    $('#enc-inlbl').textContent = eDir === 'enc' ? 'Text to encode' : `${names[eMode]} to decode`;
    encRun();
  }
  function encRun() {
    const s = eIn.value;
    if (!s) { eOut.value = ''; setPill(eStat, '', ''); eStat.hidden = true; urlParts(); return; }
    eStat.hidden = false;
    try {
      let out;
      if (eMode === 'b64') {
        if (eDir === 'enc') out = TF.b64Encode(s, $('#b64-url').checked);
        else { const r = TF.b64Decode(s); if (r.binary) { eOut.value = ''; setPill(eStat, 'warn', `Binary data · ${fmtBytes(r.bytes.length)} (use "Decode to a file")`); return; } out = r.text; }
      } else if (eMode === 'url') out = eDir === 'enc' ? TF.urlEncode(s, $('#url-kind').value) : TF.urlDecode(s, $('#url-kind').value, $('#url-plus').checked);
      else out = eDir === 'enc' ? TF.htmlEncode(s, $('#html-all').checked) : TF.htmlDecode(s);
      eOut.value = out; setPill(eStat, 'ok', `${fmtN(s.length)} → ${fmtN(out.length)} chars`);
    } catch (err) { eOut.value = ''; setPill(eStat, 'bad', err.message); }
    urlParts();
  }
  function urlParts() {
    if (eMode !== 'url') return;
    const box = $('#url-table'); box.textContent = '';
    let u = null;
    for (const c of [eIn.value.trim(), eOut.value.trim()]) { if (/^[a-z][a-z0-9+.-]*:\/\//i.test(c)) { try { u = new URL(c); break; } catch { /* keep trying */ } } }
    $('#url-hint').hidden = !!u; if (!u) return;
    const t = el('table', 'kv'); const add = (k, v) => { const tr = el('tr'); tr.append(el('td', null, k), el('td', 'mono', v)); t.appendChild(tr); };
    add('Protocol', u.protocol); add('Host', u.hostname); if (u.port) add('Port', u.port); if (u.username) add('User', decodeURIComponent(u.username));
    let path; try { path = decodeURIComponent(u.pathname); } catch { path = u.pathname; } add('Path', path);
    let qn = 0; u.searchParams.forEach((v, k) => { if (qn++ < 200) add('?' + k, v); });
    if (u.hash) { let h; try { h = decodeURIComponent(u.hash); } catch { h = u.hash; } add('Fragment', h); }
    box.appendChild(t);
  }
  const fileB64 = () => fileRaw == null ? '' : ($('#b64-datauri').checked ? `data:${fileType || 'application/octet-stream'};base64,` : '') + fileRaw;
  const FILE_TYPES_IMG = /^image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/;
  function loadFile(f) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast(`That file is ${fmtBytes(f.size)}. The limit is 10 MB.`);
    const rd = new FileReader();
    rd.onerror = () => toast('That file could not be read');
    rd.onload = () => {
      fileRaw = TF.bytesToB64(new Uint8Array(rd.result)); fileType = f.type;
      if (fileUrl) URL.revokeObjectURL(fileUrl); fileUrl = null;
      const img = $('#file-prev'), isImg = FILE_TYPES_IMG.test(f.type) && f.type !== 'image/svg+xml';
      if (isImg) { fileUrl = URL.createObjectURL(f); img.src = fileUrl; }
      img.hidden = !isImg; $('#file-css-btn').hidden = $('#file-img-btn').hidden = !FILE_TYPES_IMG.test(f.type);
      $('#file-meta').textContent = `${f.name.slice(0, 120)} · ${f.type || 'unknown type'} · ${fmtBytes(f.size)} → ${fmtN(fileB64().length)} Base64 characters`;
      $('#file-out').hidden = false; toast('File encoded. Nothing was uploaded.');
    };
    rd.readAsArrayBuffer(f);
  }
  function sniffExt(b) {
    const h = Array.from(b.slice(0, 8), x => x.toString(16).padStart(2, '0')).join('');
    return h.startsWith('89504e47') ? 'png' : h.startsWith('ffd8ff') ? 'jpg' : h.startsWith('47494638') ? 'gif' : h.startsWith('25504446') ? 'pdf' : h.startsWith('504b0304') ? 'zip' : h.startsWith('52494646') ? 'webp' : 'bin';
  }
  const drop = $('#drop');
  drop.addEventListener('click', () => $('#file').click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
  $('#file').addEventListener('change', e => { loadFile(e.target.files[0]); e.target.value = ''; });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });

  /* ---------- diff ---------- */
  const dA = $('#diff-a'), dB = $('#diff-b'), dOut = $('#diff-out');
  let dView = 'side', dLevel = 'line';
  const CTX = 3;
  function intra(l, r) {
    if (l.length > 3000 || r.length > 3000) return [esc(l), esc(r)];
    const w = TF.diffWords(l, r, dOpts());
    let L = '', R = '';
    for (const p of w.parts) { const t = esc(p.text); if (p.t === '=') { L += t; R += t; } else if (p.t === '-') L += `<del>${t}</del>`; else R += `<ins>${t}</ins>`; }
    return [L, R];
  }
  const dOpts = () => ({ ignoreWs: $('#diff-ws').checked, ignoreCase: $('#diff-case').checked });
  function diffRun() {
    const a = dA.value, b = dB.value; const stats = $('#diff-stats'); stats.textContent = '';
    if (!a && !b) { dOut.innerHTML = '<p class="hint pad">Paste two versions of your text to see what changed.</p>'; return; }
    const pill = (cls, t) => { const p = el('span', 'pill ' + cls, t); stats.appendChild(p); };
    if (dLevel === 'word') {
      const r = TF.diffWords(a, b, dOpts());
      if (!r.add && !r.del) pill('ok', '✓ No differences'); else { pill('ok', `+${fmtN(r.add)} words added`); pill('bad', `−${fmtN(r.del)} words removed`); }
      if (r.approx) pill('warn', 'Texts are very different: showing a simplified diff');
      let L = '', R = '', I = '';
      for (const p of r.parts) { const t = esc(p.text); if (p.t === '=') { L += t; R += t; I += t; } else if (p.t === '-') { L += `<del>${t}</del>`; I += `<del>${t}</del>`; } else { R += `<ins>${t}</ins>`; I += `<ins>${t}</ins>`; } }
      dOut.innerHTML = dView === 'side' ? `<div class="wdgrid"><div class="wd">${L}</div><div class="wd">${R}</div></div>` : `<div class="wd">${I}</div>`;
      return;
    }
    const r = TF.diffLines(a, b, dOpts());
    if (r.A.length > 50000 || r.B.length > 50000) { dOut.innerHTML = '<p class="hint pad">That is over 50,000 lines. Split it into smaller pieces to compare.</p>'; return; }
    if (!r.add && !r.del) pill('ok', '✓ No differences' + (dOpts().ignoreWs || dOpts().ignoreCase ? ' (with your ignore options)' : ''));
    else { pill('ok', `+${fmtN(r.add)} added`); pill('bad', `−${fmtN(r.del)} removed`); pill('', `${fmtN(r.same)} unchanged`); pill('', `${Math.round(r.same / Math.max(1, r.A.length, r.B.length) * 100)}% similar`); }
    if (r.approx) pill('warn', 'Texts are very different: showing a simplified diff');
    // rows
    const rows = []; const ops = r.ops; let k = 0;
    while (k < ops.length) {
      if (ops[k][0] === '=') { rows.push({ t: '=', l: ops[k][1], r: ops[k][2] }); k++; continue; }
      const dels = [], adds = [];
      while (k < ops.length && ops[k][0] !== '=') { if (ops[k][0] === '-') dels.push(ops[k][1]); else adds.push(ops[k][2]); k++; }
      const n = Math.max(dels.length, adds.length);
      for (let i = 0; i < n; i++) rows.push({ t: dels[i] != null && adds[i] != null ? 'c' : dels[i] != null ? '-' : '+', l: dels[i], r: adds[i] });
    }
    const collapse = $('#diff-collapse').checked; const out = [];
    for (let i = 0; i < rows.length;) {
      if (rows[i].t !== '=') { out.push(rows[i++]); continue; }
      let j = i; while (j < rows.length && rows[j].t === '=') j++;
      const len = j - i, head = i === 0 ? 0 : CTX, tail = j === rows.length ? 0 : CTX;
      if (collapse && len > head + tail + 1) { for (let x = i; x < i + head; x++) out.push(rows[x]); out.push({ t: 'sep', n: len - head - tail }); for (let x = j - tail; x < j; x++) out.push(rows[x]); }
      else for (let x = i; x < j; x++) out.push(rows[x]);
      i = j;
    }
    const RENDER_MAX = 30000; let html = '';
    const A = r.A, B = r.B;
    if (dView === 'side') {
      html = '<table class="dt"><colgroup><col style="width:52px"><col style="width:18px"><col><col style="width:52px"><col style="width:18px"><col></colgroup>';
      for (const row of out.slice(0, RENDER_MAX)) {
        if (row.t === 'sep') { html += `<tr class="sep"><td colspan="6">⋯ ${fmtN(row.n)} unchanged line${row.n > 1 ? 's' : ''}</td></tr>`; continue; }
        let L = row.l != null ? esc(A[row.l]) : '', R = row.r != null ? esc(B[row.r]) : '';
        if (row.t === 'c') [L, R] = intra(A[row.l], B[row.r]);
        const lc = row.t === '=' ? '' : row.l != null ? 'del' : 'emp', rc = row.t === '=' ? '' : row.r != null ? 'add' : 'emp';
        html += `<tr><td class="n">${row.l != null ? row.l + 1 : ''}</td><td class="sg ${lc}">${lc === 'del' ? '−' : ''}</td><td class="${lc}">${L}</td><td class="n">${row.r != null ? row.r + 1 : ''}</td><td class="sg ${rc}">${rc === 'add' ? '+' : ''}</td><td class="${rc}">${R}</td></tr>`;
      }
    } else {
      html = '<table class="dt"><colgroup><col style="width:52px"><col style="width:52px"><col style="width:18px"><col></colgroup>';
      for (const row of out.slice(0, RENDER_MAX)) {
        if (row.t === 'sep') { html += `<tr class="sep"><td colspan="4">⋯ ${fmtN(row.n)} unchanged line${row.n > 1 ? 's' : ''}</td></tr>`; continue; }
        if (row.t === '=') { html += `<tr><td class="n">${row.l + 1}</td><td class="n">${row.r + 1}</td><td class="sg"></td><td>${esc(A[row.l])}</td></tr>`; continue; }
        let L = row.l != null ? esc(A[row.l]) : '', R = row.r != null ? esc(B[row.r]) : '';
        if (row.t === 'c') [L, R] = intra(A[row.l], B[row.r]);
        if (row.l != null) html += `<tr><td class="n">${row.l + 1}</td><td class="n"></td><td class="sg del">−</td><td class="del">${L}</td></tr>`;
        if (row.r != null) html += `<tr><td class="n"></td><td class="n">${row.r + 1}</td><td class="sg add">+</td><td class="add">${R}</td></tr>`;
      }
    }
    if (out.length > RENDER_MAX) html += `<tr class="sep"><td colspan="6">Showing the first ${fmtN(RENDER_MAX)} rows</td></tr>`;
    dOut.innerHTML = html + '</table>';
  }
  const diffLater = debounce(diffRun, () => dA.value.length + dB.value.length > 200000 ? 500 : 180);

  /* ---------- lorem ---------- */
  function loGen() {
    const out = TF.lorem({ n: +$('#lo-n').value || 1, unit: $('#lo-unit').value, flavor: $('#lo-flavor').value, classic: $('#lo-classic').checked, html: $('#lo-html').checked });
    $('#lo-out').value = out;
    const plain = out.replace(/<[^>]+>/g, '');
    $('#lo-info').textContent = `${fmtN(TF.words(plain).length)} words · ${fmtN(plain.length)} characters`;
  }

  /* ---------- regex (Web Worker with timeout) ---------- */
  const rePat = $('#re-pat'), reText = $('#re-text'), reBack = $('#re-back'), reStat = $('#re-status'), reRep = $('#re-rep');
  const WORKER_URL = new URL('worker.js', SCRIPT_SRC).href;
  let worker = null, busy = false, reqId = 0, timer = null, sent = null, lastMatches = [];
  const TIMEOUT = 1500;
  function getWorker() {
    if (!worker) {
      worker = new Worker(WORKER_URL);
      worker.onmessage = e => { if (e.data.id !== reqId) return; clearTimeout(timer); busy = false; reRender(e.data); };
      worker.onerror = e => { e.preventDefault(); clearTimeout(timer); busy = false; setPill(reStat, 'bad', 'Regex engine error'); };
    }
    return worker;
  }
  const flags = () => $$('#re-flags button.on').map(b => b.dataset.flag).join('');
  function reRun() {
    const p = rePat.value, f = flags(), text = reText.value;
    if (!p) { setPill(reStat, '', 'Enter a pattern'); reBack.textContent = text + '\n'; $('#re-matches').innerHTML = '<p class="hint">Matches and capture groups show up here.</p>'; $('#re-out').textContent = ''; lastMatches = []; return; }
    try { new RegExp(p, f); } catch (err) { setPill(reStat, 'bad', '✗ ' + err.message.replace(/^Invalid regular expression: /, '')); reBack.textContent = text + '\n'; return; }
    if (busy && worker) { worker.terminate(); worker = null; }
    const id = ++reqId; busy = true; sent = { text, id };
    getWorker().postMessage({ id, pattern: p, flags: f, text, replace: reRep.value, doReplace: true });
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (reqId !== id || !busy) return;
      worker.terminate(); worker = null; busy = false;
      setPill(reStat, 'bad', `⏱ Stopped after ${TIMEOUT / 1000}s: this pattern backtracks too much on this text`);
      reBack.textContent = text + '\n'; $('#re-out').textContent = '';
      $('#re-matches').innerHTML = '<p class="hint">Try making nested quantifiers like <code>(a+)+</code> more specific.</p>';
    }, TIMEOUT);
  }
  function reRender(d) {
    if (!d.ok) { setPill(reStat, 'bad', '✗ ' + d.error); return; }
    const text = sent.text;
    if (text !== reText.value) return; // stale: a newer request is coming
    lastMatches = d.matches;
    setPill(reStat, d.total ? 'ok' : 'warn', d.total ? `${fmtN(d.total)} match${d.total > 1 ? 'es' : ''}${d.capped ? ' (showing first ' + fmtN(d.matches.length) + ')' : ''}${d.global ? '' : ' · add the g flag to find all'} · ${d.ms} ms` : 'No matches');
    let html = '', last = 0;
    d.matches.forEach((m, i) => {
      if (m.index < last) return;
      html += esc(text.slice(last, m.index));
      html += m.value === '' ? '<mark class="z"></mark>' : `<mark${i % 2 ? ' class="b"' : ''}>${esc(m.value)}</mark>`;
      last = m.index + m.value.length;
    });
    reBack.innerHTML = html + esc(text.slice(last)) + '\n';
    reBack.scrollTop = reText.scrollTop;
    const box = $('#re-matches'); box.textContent = '';
    if (!d.matches.length) box.appendChild(el('p', 'hint', 'No matches in the test text.'));
    d.matches.slice(0, 300).forEach((m, i) => {
      const c = el('div', 'match'); const h = el('div', 'mh'); h.append(el('span', null, `Match ${i + 1}`), el('span', null, `index ${m.index}–${m.index + m.value.length}`));
      const v = el('div', 'mv', m.value === '' ? '(empty match)' : m.value.length > 400 ? m.value.slice(0, 400) + '…' : m.value); c.append(h, v);
      if (m.groups.length) {
        const g = el('div', 'gr'); const names = new Map(); m.named.forEach(([k, val]) => names.set(k, val));
        m.groups.forEach((val, gi) => { g.append(el('span', null, `$${gi + 1}`), el('span', null, val == null ? '(not matched)' : val)); });
        m.named.forEach(([k, val]) => g.append(el('span', null, `<${k}>`), el('span', null, val == null ? '(not matched)' : val)));
        c.appendChild(g);
      }
      box.appendChild(c);
    });
    if (d.matches.length > 300) box.appendChild(el('p', 'hint', `Listing the first 300 of ${fmtN(d.total)} matches.`));
    $('#re-out').textContent = d.replaced == null ? '' : d.replaced;
  }
  const reLater = debounce(reRun, () => reText.value.length > 100000 ? 300 : 120);
  reText.addEventListener('scroll', () => { reBack.scrollTop = reText.scrollTop; });
  $('#re-flags').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); reRun(); });
  $$('#re-flags button').forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on')));
  const PRESETS = [
    ['Email address', '[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)*\\.[A-Za-z]{2,}', 'gi', 'Contact sam.lee+news@example.co.uk or ops@my-site.io today.'],
    ['URL (http/https)', 'https?:\\/\\/[\\w.-]+(?:\\.[\\w-]+)+(?::\\d+)?(?:[\\/?#][^\\s"\'<>]*)?', 'gi', 'Docs at https://example.com/docs?page=2#intro and http://localhost:8080/api.'],
    ['Phone number (US & intl)', '(?:\\+?\\d{1,3}[\\s.-]?)?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}', 'g', 'Call (555) 123-4567, +1 555.987.6543 or 5551112222.'],
    ['Date (YYYY-MM-DD)', '\\b(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])\\b', 'g', 'Launched 2026-10-25, updated 2026-11-03. Not a date: 2026-13-40.'],
    ['Date (MM/DD/YYYY)', '\\b(0?[1-9]|1[0-2])\\/(0?[1-9]|[12]\\d|3[01])\\/(\\d{4})\\b', 'g', 'Due 10/25/2026 or 1/5/2027.'],
    ['IPv4 address', '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b', 'g', 'Servers 192.168.0.1 and 10.0.0.255, not 999.1.1.1.'],
    ['IPv6 address (full)', '\\b(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\\b', 'gi', 'Host 2001:0db8:85a3:0000:0000:8a2e:0370:7334 is up.'],
    ['Hex color', '#(?:[0-9a-f]{3,4}){1,2}\\b', 'gi', 'Brand colors #7c5cff, #FF5C9D and #fff.'],
    ['UUID', '\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b', 'gi', 'Order 3f2b8c4e-9a1d-4c2b-8e7f-1a2b3c4d5e6f shipped.'],
    ['US ZIP code', '\\b\\d{5}(?:-\\d{4})?\\b', 'g', 'Ship to 10001 or 94105-1234.'],
    ['HTML tag', '<\\/?([a-z][a-z0-9-]*)\\b[^>]*>', 'gi', '<p class="lead">Hello <b>world</b></p>'],
    ['Number (int or decimal)', '-?\\b\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?\\b|-?\\b\\d+(?:\\.\\d+)?\\b', 'g', 'Totals: 1,234.56, -42, 3.14 and 1000000.'],
    ['Repeated word', '\\b(\\w+)\\s+\\1\\b', 'gi', 'This is is a test of the the repeated words.'],
    ['Trailing whitespace', '[ \\t]+$', 'gm', 'line one   \nline two\t\nclean line'],
  ];
  PRESETS.forEach(([n], i) => { const o = el('option', null, n); o.value = i; $('#re-preset').appendChild(o); });
  $('#re-preset').addEventListener('change', e => {
    const p = PRESETS[+e.target.value]; if (!p) return;
    rePat.value = p[1]; $$('#re-flags button').forEach(b => { const on = p[2].includes(b.dataset.flag); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    if (!reText.value.trim() || reText.dataset.sample === '1') { reText.value = p[3]; reText.dataset.sample = '1'; }
    e.target.value = ''; reRun();
  });
  const CHEAT = [['Characters', [['.', 'any character'], ['\\d', 'digit'], ['\\w', 'word character'], ['\\s', 'whitespace'], ['\\D', 'not a digit'], ['\\W', 'not a word char'], ['\\S', 'not whitespace'], ['[abc]', 'a, b or c'], ['[^abc]', 'not a, b or c'], ['[a-z]', 'range']]],
    ['Anchors', [['^', 'start of line'], ['$', 'end of line'], ['\\b', 'word boundary'], ['\\B', 'not a boundary']]],
    ['Quantifiers', [['*', '0 or more'], ['+', '1 or more'], ['?', '0 or 1'], ['{3}', 'exactly 3'], ['{2,}', '2 or more'], ['{2,5}', '2 to 5'], ['*?', 'lazy (as few as possible)']]],
    ['Groups & lookaround', [['(…)', 'capture group'], ['(?:…)', 'non-capturing'], ['(?<name>…)', 'named group'], ['\\1', 'backreference'], ['a|b', 'a or b'], ['(?=…)', 'followed by'], ['(?!…)', 'not followed by'], ['(?<=…)', 'preceded by'], ['(?<!…)', 'not preceded by']]],
    ['Replace', [['$&', 'whole match'], ['$1', 'group 1'], ['$<name>', 'named group'], ['$$', 'literal $']]]];
  for (const [title, items] of CHEAT) {
    $('#cheat').appendChild(el('h3', null, title));
    for (const [tok, desc] of items) { const b = el('button'); b.type = 'button'; b.dataset.ins = tok.replace('…', ''); b.dataset.rep = title === 'Replace' ? '1' : ''; b.append(el('code', null, tok), document.createTextNode(desc)); $('#cheat').appendChild(b); }
  }
  $('#cheat').addEventListener('click', e => {
    const b = e.target.closest('button[data-ins]'); if (!b) return;
    const inp = b.dataset.rep ? reRep : rePat; const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? s;
    inp.value = inp.value.slice(0, s) + b.dataset.ins + inp.value.slice(en);
    const caret = s + b.dataset.ins.length - (/\)$/.test(b.dataset.ins) ? 1 : 0);
    inp.focus(); inp.setSelectionRange(caret, caret); reRun();
  });

  /* ---------- delegated events ---------- */
  document.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'cnt-in' || id === 'kw-n' || id === 'kw-stop') countLater();
    else if (id === 'case-in') caseInfo();
    else if (id === 'json-in') jsonLater();
    else if (id === 'enc-in' || id === 'b64-url' || id === 'url-plus' || id === 'html-all') encRun();
    else if (id === 'diff-a' || id === 'diff-b') diffLater();
    else if (id === 'diff-ws' || id === 'diff-case' || id === 'diff-collapse') diffRun();
    else if (id === 'lo-n') loGen();
    else if (id === 're-pat' || id === 're-rep') reLater();
    else if (id === 're-text') { reText.dataset.sample = ''; reLater(); }
  });
  document.addEventListener('change', e => {
    const id = e.target.id;
    if (id === 'kw-n') countRender();
    else if (id === 'url-kind') encRun();
    else if (['lo-unit', 'lo-flavor', 'lo-classic', 'lo-html'].includes(id)) loGen();
    else if (id === 'b64-datauri' && fileRaw != null) $('#file-meta').textContent = $('#file-meta').textContent.replace(/[\d,]+ Base64 characters/, fmtN(fileB64().length) + ' Base64 characters');
    else if (id === 'json-sort' && jHas) jsonRun('format');
    else if (id === 'json-indent' && jHas) jsonRun('format');
  });
  document.addEventListener('click', e => {
    const seg = e.target.closest('.seg button');
    if (seg) {
      const g = seg.parentElement; g.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === seg));
      if (seg.dataset.jv) { jView = seg.dataset.jv; jsonRender(); }
      if (seg.dataset.mode) { eMode = seg.dataset.mode; encSetup(); }
      if (seg.dataset.dir) { eDir = seg.dataset.dir; encSetup(); }
      if (seg.dataset.dv) { dView = seg.dataset.dv; diffRun(); }
      if (seg.dataset.dl) { dLevel = seg.dataset.dl; diffRun(); }
      return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const tgt = b.dataset.target && document.getElementById(b.dataset.target);
    switch (b.dataset.act) {
      case 'copy-el': copy(valOf(b.dataset.target)); break;
      case 'download-el': download(b.dataset.name || 'text.txt', valOf(b.dataset.target)); break;
      case 'clear': if (tgt) { if (tgt.value && tgt.id === 'case-in') caseHist.push(tgt.value); tgt.value = ''; fire(tgt); tgt.focus(); } break;
      case 'paste':
        if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { tgt.value = t.slice(0, +tgt.maxLength > 0 ? +tgt.maxLength : t.length); fire(tgt); }, () => toast('Press Ctrl+V (⌘V) to paste'));
        else toast('Press Ctrl+V (⌘V) to paste');
        break;
      case 'case-undo': if (!caseHist.length) toast('Nothing to undo'); else { caseIn.value = caseHist.pop(); caseInfo(); toast('Undone'); } break;
      case 'json-format': jsonRun('format'); break;
      case 'json-minify': jsonRun('minify'); break;
      case 'json-repair': {
        if (!jIn.value.trim()) return toast('Paste some JSON first');
        if (TF.jsonCheck(jIn.value).ok) return jsonRun('format');
        const fixed = TF.jsonRepair(jIn.value); const r = TF.jsonCheck(fixed);
        if (r.ok) { jIn.value = fixed; jsonRun('format'); toast('Repaired and formatted ✓'); } else { jsonValidate(); toast("Couldn't fix it automatically: " + r.msg); }
        break;
      }
      case 'json-goto': { const p = +b.dataset.pos; jIn.focus(); jIn.setSelectionRange(p, Math.min(p + 1, jIn.value.length)); const lh = parseFloat(getComputedStyle(jIn).lineHeight) || 21; jIn.scrollTop = Math.max(0, (TF.lineCol(jIn.value, p).line - 4) * lh); break; }
      case 'json-sample': jIn.value = SAMPLE_JSON; jsonRun('format'); break;
      case 'json-copy': copy(jText); break;
      case 'json-download': download('formatted.json', jText, 'application/json'); break;
      case 'enc-swap': if (!eOut.value) return toast('Nothing to swap yet'); eIn.value = eOut.value; eDir = eDir === 'enc' ? 'dec' : 'enc'; encSetup(); break;
      case 'file-copy': copy(fileB64(), 'Base64 copied'); break;
      case 'file-css': copy(`background-image: url("${fileB64().startsWith('data:') ? fileB64() : `data:${fileType};base64,` + fileRaw}");`, 'CSS copied'); break;
      case 'file-img': copy(`<img src="${fileB64().startsWith('data:') ? fileB64() : `data:${fileType};base64,` + fileRaw}" alt="">`, '<img> tag copied'); break;
      case 'b64-tofile': {
        if (!eIn.value.trim()) return toast('Paste Base64 into the input first');
        try { const bytes = TF.b64ToBytes(eIn.value); const ext = sniffExt(bytes); download('decoded.' + ext, bytes, 'application/octet-stream'); toast(`Decoded ${fmtBytes(bytes.length)} → decoded.${ext}`); }
        catch (err) { toast(err.message); }
        break;
      }
      case 'diff-swap': { const t = dA.value; dA.value = dB.value; dB.value = t; diffRun(); break; }
      case 'diff-sample':
        dA.value = 'Textforge is a free set of text tools.\nIt runs in your browser.\nNothing is uploaded.\nThe JSON formatter supports trees.\nThanks for reading!';
        dB.value = 'Textforge is a free set of text and developer tools.\nIt runs entirely in your browser.\nNothing is uploaded.\nThe JSON formatter supports collapsible trees.\nIt also has a regex tester.\nThanks for reading!';
        diffRun(); break;
      case 'lo-gen': loGen(); toast('Fresh text generated'); break;
      case 're-copy-matches': copy(lastMatches.map(m => m.value).join('\n'), 'Matches copied'); break;
    }
  });

  /* ---------- consent (needed before showing personalised ads in EU/UK) ---------- */
  const CKEY = 'textforge.consent';
  if (!store.get(CKEY)) $('#consent').classList.add('show');
  $('#c-yes').addEventListener('click', () => { store.set(CKEY, 'granted'); $('#consent').classList.remove('show'); });
  $('#c-no').addEventListener('click', () => { store.set(CKEY, 'denied'); $('#consent').classList.remove('show'); });

  /* ---------- init ---------- */
  countRender(); caseInfo(); encSetup(); loGen(); reBack.textContent = '\n';
  if (view === 'regex' && !rePat.value) { rePat.value = PRESETS[0][1]; $$('#re-flags button').forEach(b => { const on = 'gi'.includes(b.dataset.flag); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); reText.value = PRESETS[0][3]; reText.dataset.sample = '1'; reRun(); }
})();
