#!/usr/bin/env python3
"""Discover the public album, allowing time for slow incremental loading."""
import json
import subprocess
import sys
from pathlib import Path
SKILL=Path('/home/yhr/.agents/repos/agent-skills/skills/acquisition/scripts')
sys.path.insert(0,str(SKILL))
from discover_wechat_album import installed_cli_python, compile_manifest, apply_selection
URL='https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzIxMjE0Mjg2MQ==&action=getalbum&album_id=2441265493677359105&scene=126&sessionid=#wechat_redirect'
LAUNCHER='''
import asyncio,json,sys
from camoufox.async_api import AsyncCamoufox
async def main():
 async with AsyncCamoufox(headless=True) as browser:
  page=await browser.new_page(); await page.goto(sys.argv[1],wait_until="domcontentloaded"); await asyncio.sleep(2); stable=0
  for _ in range(100):
   before=await page.locator("li[data-link]").count(); await page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); await asyncio.sleep(1.2)
   after=await page.locator("li[data-link]").count(); stable=stable+1 if after==before else 0
   if stable>=8: break
  items=await page.locator("li[data-link]").evaluate_all("els => els.map(el => ({url: el.getAttribute('data-link'), text: (el.innerText || '').trim()}))")
  return {"title":await page.title(),"body":await page.locator("body").inner_text(),"items":items}
print(json.dumps(asyncio.run(main()),ensure_ascii=False))
'''
def main():
 if len(sys.argv)!=2: raise SystemExit('usage: discover_photo_album.py OUTPUT.json')
 process=subprocess.run([installed_cli_python('wechat-article-to-markdown'),'-c',LAUNCHER,URL],capture_output=True,text=True,timeout=180,check=True)
 manifest=apply_selection(compile_manifest(URL,json.loads(process.stdout)),None,'latest')
 if not manifest['complete'] or manifest['declared_items'] is None: raise SystemExit(f"incomplete album: {manifest['discovered_items']}/{manifest['declared_items']}")
 path=Path(sys.argv[1]); path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');print(f"complete: {manifest['discovered_items']} issues → {path}")
if __name__=='__main__': main()
