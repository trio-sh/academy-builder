#!/usr/bin/env python3
"""Continuous integration check for acceptance test DT-02 of T3A-DEV-DAY1-001.
Scans system identifiers in source, migrations, schemas, templates, seeds and exports.

Usage:
  python3 tools/check_forbidden_identifiers.py <repo_root> [--exclude PATH ...] [--manifest OUT.json]

--exclude takes exact paths relative to repo_root. A file path excludes that file only.
A directory path must end with '/' and excludes that directory and everything under it.
No other matching is applied, so 'tools/' never excludes 'toolsX/'.
Approved wording: a line that must contain a listed word in participant facing text (for example the
locked sentence "The 3rd Academy does not validate people. It governs evidence.") carries the marker
t3a-allow:<rule> on the same line, where <rule> is the rule label with spaces replaced by underscores
(for example t3a-allow:contains_validate). Each allowance is listed in the manifest and the output.
Exit 0 on zero hits, 1 otherwise."""
import json, os, re, sys

EXT = {".py",".js",".mjs",".cjs",".ts",".mts",".cts",".tsx",".jsx",".sql",".prisma",".json",".yaml",".yml",
       ".html",".vue",".svelte",".astro",".rb",".php",".go",".java",".cs",".kt",".kts",".scala",".swift",
       ".rs",".ex",".exs",".graphql",".gql",".csv",".sh",".toml",".ini",".xml",".tf",".env",".dart",".lua",".mdx",".njk",".hbs",".ejs",".liquid",".twig",".jinja",".j2",".pug",".po",".properties",".strings",".resx",".arb"}
SKIP_DIRS = {".git","node_modules","dist","build","vendor",".venv","venv","__pycache__",".next",".nuxt","coverage"}
RULES = [
 ("contains validate", re.compile(r"validat")),
 ("fingerprint", re.compile(r"fingerprint")),
 ("skill_passport", re.compile(r"skill_?passport")),
 ("level_1..level_4", re.compile(r"(^|_)level_?[1-4]($|_)")),
 ("observation_level", re.compile(r"observation_level")),
 ("behavioral_score", re.compile(r"behaviou?ral_score")),
 ("readiness_score", re.compile(r"readiness_score")),
 ("score", re.compile(r"(^|_)scores?($|_)")),
 ("rating or rank or percentile", re.compile(r"(^|_)(rating|ratings|rank|ranking|percentile)($|_)")),
 ("tier", re.compile(r"(^|_)tiers?($|_)")),
 ("endorsement", re.compile(r"endorse")),
 ("ordinal_anchor", re.compile(r"ordinal_anchor")),
 ("has_rehearsed", re.compile(r"has_rehearsed")),
 ("shortlist", re.compile(r"shortlist")),
]
TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{2,}")
ALLOW = re.compile(r"t3a-allow:([a-z0-9_.]+)")

def norm(t):
    t = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", t).replace("-", "_")
    return t.lower()

def excluded(rel, excludes):
    rel = rel.replace(os.sep, "/")
    for x in excludes:
        x = x.replace(os.sep, "/")
        if x.startswith("./"): x = x[2:]
        if x.endswith("/"):
            if rel.startswith(x): return True
        elif rel == x: return True
    return False

def scan(root, excludes):
    hits, scanned, skipped, allowances = [], [], [], []
    for dp, dns, fns in os.walk(root):
        dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
        for fn in sorted(fns):
            path = os.path.join(dp, fn); rel = os.path.relpath(path, root).replace(os.sep, "/")
            ext = os.path.splitext(fn)[1].lower()
            if ext not in EXT and not fn.startswith(".env"): continue
            if excluded(rel, excludes): skipped.append(rel); continue
            try: lines = open(path, encoding="utf-8", errors="ignore").read().splitlines()
            except OSError: continue
            scanned.append(rel)
            for i, line in enumerate(lines, 1):
                allowed = set(ALLOW.findall(line))
                for tok in TOKEN.findall(ALLOW.sub(" ", line)):
                    nt = norm(tok)
                    for label, rx in RULES:
                        if rx.search(nt):
                            key = label.replace(" ", "_").replace(".", "_")
                            rec = {"file": rel, "line": i, "rule": label, "token": tok}
                            (allowances if key in allowed else hits).append(rec); break
    return hits, scanned, skipped, allowances

def main(argv):
    if len(argv) < 2: print(__doc__); return 2
    root = argv[1]; excludes = []; manifest = None; i = 2
    while i < len(argv):
        if argv[i] == "--exclude":
            i += 1
            while i < len(argv) and not argv[i].startswith("--"): excludes.append(argv[i]); i += 1
        elif argv[i] == "--manifest": manifest = argv[i+1]; i += 2
        else: print(f"unknown argument {argv[i]}"); return 2
    hits, scanned, skipped, allowances = scan(root, excludes)
    for h in hits: print(f"HIT {h['file']}:{h['line']} [{h['rule']}] {h['token']}")
    for h in allowances: print(f"ALLOWED {h['file']}:{h['line']} [{h['rule']}] {h['token']}")
    if manifest:
        json.dump({"root": os.path.abspath(root), "excludes": excludes, "scanned_files": scanned,
                   "excluded_files": skipped, "hit_count": len(hits), "hits": hits, "allowances": allowances}, open(manifest, "w"), indent=1)
    print(f"scanned {len(scanned)} files, excluded {len(skipped)}, allowances {len(allowances)}")
    print("RESULT", "PASS" if not hits else f"FAIL ({len(hits)} hits)")
    return 0 if not hits else 1

if __name__ == "__main__": sys.exit(main(sys.argv))
