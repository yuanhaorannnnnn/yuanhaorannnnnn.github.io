#!/usr/bin/env python3
"""Capture missing public album items from a verified discovery manifest."""
import argparse
import os
import concurrent.futures
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

_DSH_ROOT = os.environ.get("DSH_DATA_ROOT") or os.path.join("/media", os.environ.get("USER", ""), "2T")
from PIL import Image

SKILL = Path.home() / '.agents' / 'repos' / 'agent-skills' / 'skills' / 'acquisition' / 'scripts'
sys.path.insert(0, str(SKILL))
from ingest_wechat_article import run_cli_in_staging, single_markdown_file, parse_cli_markdown
from discover_wechat_album import article_identity

ROOT = Path(__file__).resolve().parents[1] / 'collection'
STAGING = Path(_DSH_ROOT) / 'agent-workspaces' / 'jiyi-sync'

def capture(item):
    number = item['article_number']; url = item['url']; staging = STAGING / str(number)
    staging.mkdir(parents=True, exist_ok=True)
    try:
        # Resume a completed capture; each invocation otherwise attempts one public fallback.
        files = list(staging.glob('*/*.md'))
        if not files:
            direct = subprocess.run([sys.executable, str(SKILL/'extract_article.py'), url], capture_output=True, text=True, timeout=45)
            pos = direct.stdout.find('{\n')
            result = json.loads(direct.stdout[pos:]) if pos >= 0 else {}
            title, body = result.get('title') or '', result.get('body') or ''
            if title and title != '环境异常' and len(''.join(body.split())) >= 200 and '当前环境异常' not in body:
                return number, None, 'direct extraction succeeded; images require manual handling'
            run_cli_in_staging(url, staging, 'wechat-article-to-markdown')
        file = single_markdown_file(staging)
        text = file.read_text(encoding='utf-8')
        _, _, published, body = parse_cli_markdown(text, url)
        parts = re.split(r'!\[[^\]]*\]\(images/([^\)]+)\)', body)
        if len(parts) < 3: raise ValueError('no article images')
        images = []
        for index in range(1, len(parts), 2):
            name = parts[index]
            if Path(name).name != name: raise ValueError('unsafe image filename')
            source = file.parent / 'images' / name
            with Image.open(source) as image: image.verify()
            caption = re.sub(r'\[[^\]]+\]\(https?://[^)]+\)', '', parts[index+1])
            caption = re.sub(r'\n{3,}', '\n\n', caption.split('友情提示：')[0].strip())
            if not caption: raise ValueError('empty image caption')
            images.append({'path':f'images/{number}/{name}', 'caption':caption})
        destination = ROOT/'images'/str(number)
        destination.mkdir(parents=True, exist_ok=True)
        for image in images: shutil.copy2(file.parent/'images'/Path(image['path']).name, destination/Path(image['path']).name)
        record = {'id':number, 'title':item['title'].removeprefix('集腋成裘：'), 'date':published[:10], 'url':url, 'images':images}
        return number, record, 'ok'
    except Exception as error:
        return number, None, f'{type(error).__name__}: {str(error)[:160]}'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--manifest', type=Path, required=True);parser.add_argument('--workers',type=int,default=2,choices=[1,2]);parser.add_argument('--skip',type=int,action='append',default=[]);args=parser.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding='utf-8'))
    items=manifest['items']
    if manifest.get('complete') is not True or manifest.get('declared_items') != len(items): raise SystemExit('incomplete manifest; no capture started')
    numbers=[item.get('article_number') for item in items]
    if any(not isinstance(x,int) for x in numbers) or len(set(numbers)) != len(numbers): raise SystemExit('missing or duplicate issue numbers')
    existing={issue['id']:issue for issue in json.loads((ROOT/'data.json').read_text(encoding='utf-8'))}
    for item in items:
        old = existing.get(item['article_number'])
        if old and article_identity(old['url']) != article_identity(item['url']):
            raise SystemExit(f"issue identity changed: {item['article_number']}; manual reconciliation required")
    pending=[item for item in items if not existing.get(item['article_number'],{}).get('images') and item['article_number'] not in args.skip]
    print(f"discovered={len(items)} existing={sum(bool(existing.get(item['article_number'], {}).get('images')) for item in items)} pending={len(pending)} skipped={len(args.skip)}",flush=True)
    failures=[]; consecutive=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        inflight={}
        it=iter(pending)
        def submit():
            try: item=next(it)
            except StopIteration: return False
            inflight[pool.submit(capture,item)]=item;return True
        for _ in range(args.workers): submit()
        while inflight:
            done,_=concurrent.futures.wait(inflight,return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                item=inflight.pop(future); number, record, status=future.result()
                print(f'{number}: {status}',flush=True)
                if record: existing[number]=record;consecutive=0
                else: failures.append(number);consecutive+=1
                if consecutive < 5: submit()
    for item in items:
        number=item['article_number']
        if number not in existing: existing[number]={'id':number,'title':item['title'].removeprefix('集腋成裘：'),'date':'','url':item['url'],'images':[]}
    result=sorted(existing.values(),key=lambda x:x['id'],reverse=True)
    path=ROOT/'data.json'; temp=path.with_suffix('.json.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(path)
    missing=[x['id'] for x in result if not x['images']]
    print(f'complete={len(result)-len(missing)} total={len(result)} missing={missing}',flush=True)
    if consecutive >= 5: print('stopped after consecutive failures',flush=True)
    return 2 if missing else 0
if __name__=='__main__': raise SystemExit(main())
