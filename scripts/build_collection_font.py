#!/usr/bin/env python3
"""Subset the installed Noto Serif CJK SC font to collection titles."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'collection'
FONT=Path('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc')
items=json.loads((ROOT/'data.json').read_text(encoding='utf-8'))
text='集腋成裘我的收藏'+''.join(item['title'] for item in items)
with tempfile.TemporaryDirectory() as directory:
    source=Path(directory)/'characters.txt'; result=Path(directory)/'font.woff2'; source.write_text(text,encoding='utf-8')
    subprocess.run([sys.executable,'-m','fontTools.subset',str(FONT),'--font-number=2',f'--text-file={source}','--flavor=woff2',f'--output-file={result}'],check=True)
    (ROOT/'fonts'/'noto-serif-sc-subset.woff2').write_bytes(result.read_bytes())
