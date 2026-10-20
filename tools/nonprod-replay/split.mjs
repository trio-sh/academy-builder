function hasCode(t) { if (!t) return false; let i = 0; const n = t.length; while (i < n) { const c = t[i]; if (c === " " || c === "\n" || c === "\t" || c === "\r") { i++; continue; } if (c === "-" && t[i+1] === "-") { const j = t.indexOf("\n", i); if (j < 0) return false; i = j + 1; continue; } if (c === "/" && t[i+1] === "*") { const j = t.indexOf("*/", i + 2); if (j < 0) return false; i = j + 2; continue; } return true; } return false; }
export function splitSql(s) {
  const out = []; let cur = ""; let i = 0; const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === "-" && d === "-") { const j = s.indexOf("\n", i); const e = j < 0 ? n : j; cur += s.slice(i, e); i = e; continue; }
    if (c === "/" && d === "*") { let depth = 1, j = i + 2; while (j < n && depth > 0) { if (s[j] === "/" && s[j + 1] === "*") { depth++; j += 2; } else if (s[j] === "*" && s[j + 1] === "/") { depth--; j += 2; } else j++; } cur += s.slice(i, j); i = j; continue; }
    if (c === "'") { const lc = cur[cur.length - 1]; const esc = lc === "e" || lc === "E"; let j = i + 1; while (j < n) { if (esc && s[j] === "\\") { j += 2; continue; } if (s[j] === "'") { if (s[j + 1] === "'") { j += 2; continue; } break; } j++; } cur += s.slice(i, j + 1); i = j + 1; continue; }
    if (c === '"') { let j = i + 1; while (j < n && !(s[j] === '"' && s[j + 1] !== '"')) j += s[j] === '"' ? 2 : 1; cur += s.slice(i, j + 1); i = j + 1; continue; }
    if (c === "$") { const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(s.slice(i, i + 80)); if (m) { const tag = m[0]; const j = s.indexOf(tag, i + tag.length); const e = j < 0 ? n : j + tag.length; cur += s.slice(i, e); i = e; continue; } }
    if (c === ";") { const t = cur.trim(); if (hasCode(t)) out.push(t); cur = ""; i++; continue; }
    cur += c; i++;
  }
  const t = cur.trim(); if (hasCode(t)) out.push(t);
  return out;
}
