#!/usr/bin/env python3
"""Render the author's quick notes into the site; never modify source notes."""
import argparse
import os
import html
import hashlib
import json
import re
from pathlib import Path

_DSH_ROOT = os.environ.get("DSH_DATA_ROOT") or os.path.join("/media", os.environ.get("USER", ""), "2T")
import markdown
import bleach

SITE = Path(__file__).resolve().parent.parent
SOURCE = Path(_DSH_ROOT) / 'files' / 'notes' / 'self' / '随手记'
START = '<!-- quick-notes:start -->'
END = '<!-- quick-notes:end -->'
MARK = '<!-- generated:quick-note -->'
NAME = re.compile(r'^\d{4}-\d{2}-\d{2}-\d{2}\.md$')


def run(source=SOURCE, site=SITE):
    source, site = Path(source), Path(site)
    if not source.is_dir():
        raise RuntimeError('Source directory is unavailable; existing pages retained')
    files = sorted(source.glob('*.md'), reverse=True)
    if not files or any(not NAME.fullmatch(p.name) or p.is_symlink() for p in files):
        raise RuntimeError('Source empty or unexpected filenames; existing pages retained')
    archive = site / 'archives/index.html'
    original = archive.read_text(encoding='utf-8')
    if (START in original) != (END in original) or original.count(START) > 1 or original.count(END) > 1:
        raise RuntimeError('Archive markers invalid')
    titles = json.loads((site / "notes/titles.json").read_text(encoding="utf-8"))
    pages = []
    for p in files:
        content = p.read_text(encoding='utf-8')
        lines = content.splitlines()
        if not lines:
            raise RuntimeError(f'Empty note not published yet: {p.name}')
        if not lines[0].startswith('# ') or not lines[0][2:].strip():
            raise RuntimeError(f'Note has no title: {p.name}')
        entry = titles.get(p.stem, {})
        if entry.get('sha256') != hashlib.sha256(p.read_bytes()).hexdigest() or not entry.get('title', '').strip():
            raise RuntimeError(f'Missing or stale website title: {p.name}')
        title = entry['title'].strip()
        body = '<p>' + html.escape(lines[0][2:]) + '</p>' + markdown.markdown('\n'.join(lines[1:]), extensions=['fenced_code', 'tables'])
        body = bleach.clean(body, tags=['p','br','h2','h3','h4','ul','ol','li','a','strong','em','blockquote','code','pre','hr','table','thead','tbody','tr','th','td'], attributes={'a':['href','title']}, protocols=['http','https','mailto'], strip=True)
        pages.append((p.stem, title, body))
    rows = []
    current_year = None
    for slug, title, body in pages:
        year = slug[:4]
        if year != current_year:
            rows.append(f'<h3>{year}</h3>')
            current_year = year
        rows.append(f'<article class="archive-item"><a class="archive-item-link" href="/notes/{slug}/">{html.escape(title)}</a><span class="archive-item-date">{slug[:10]}</span></article>')
    block = START + '\n' + '\n'.join(rows) + '\n' + END
    if START in original:
        before, tail = original.split(START, 1)
        _, after = tail.split(END, 1)
        updated = before + block + after
    else:
        marker = '<div class="post-wrap archive">'
        if original.count(marker) != 1:
            raise RuntimeError('Archive insertion point is missing')
        updated = original.replace(marker, marker + '\n' + block, 1)
    root = site / 'notes'
    root.mkdir(exist_ok=True)
    keep = set()
    for slug, title, body in pages:
        target = root / slug / 'index.html'
        if target.exists() and MARK not in target.read_text(encoding='utf-8'):
            raise RuntimeError(f'Refusing to overwrite unmanaged file: {target}')
        keep.add(target)
    stale = []
    for target in root.glob('*/index.html'):
        if target not in keep and MARK in target.read_text(encoding='utf-8'):
            stale.append(target)
    for slug, title, body in pages:
        safe_title = html.escape(title)
        target = root / slug / 'index.html'
        target.parent.mkdir(exist_ok=True)
        target.write_text(f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{safe_title} | Xianning</title><link rel="stylesheet" href="/css/style.css"><style>.quick-note{{max-width:720px;margin:100px auto;padding:0 24px}}.quick-note h1{{font-size:2em;line-height:1.4}}.quick-note time{{color:#888;font-size:14px}}.quick-note .post-content{{margin-top:35px;line-height:1.9;overflow-wrap:anywhere}}.quick-nav{{display:flex;justify-content:space-between;padding:24px 40px;font-size:15px}}@media(max-width:600px){{.quick-nav{{padding:23px 22px}}.quick-note{{margin:65px auto}}}}</style></head><body>{MARK}<header class="quick-nav"><a href="/">Xianning</a><a href="/archives/">文章</a></header><main class="quick-note"><h1>{safe_title}</h1><time datetime="{slug[:10]}">{slug[:10]}</time><div class="post-content">{body}</div></main></body></html>''', encoding='utf-8')
    archive.write_text(updated, encoding='utf-8')
    for target in stale:
        target.unlink()
        try: target.parent.rmdir()
        except OSError: pass
    print(json.dumps({'notes':len(pages),'removed':len(stale)}, ensure_ascii=False))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--site', type=Path, default=SITE)
    args = parser.parse_args()
    run(args.source, args.site)
