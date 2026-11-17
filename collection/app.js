const app = document.querySelector('#app');
const key = 'jiyi-favorites-v1';
let issues = [];
let favorites = [];
try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) favorites = saved; } catch (_) {}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoKey = (issue, i) => `${issue.id}:${i}`;
const titleHtml = s => esc(s).replace(/\b([A-Za-z]+-\d+[A-Za-z]*)\b/g, '<span style="white-space:nowrap">$1</span>');
const listRoute = (query, page = 1) => {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', page);
  const value = params.toString();
  return value ? `/?${value}` : '/';
};
const issueRoute = (issue, index, from) => {
  const path = `/issue/${issue.id}${index >= 0 ? `/photo/${index + 1}` : ''}`;
  return from && from !== '/' ? `${path}?${new URLSearchParams({from})}` : path;
};
function photo(issue, image, i) {
  const id = photoKey(issue, i), selected = favorites.includes(id);
  return `<figure class="photo" id="photo-${i + 1}"><a href="${esc(image.path)}" target="_blank" rel="noopener"><img src="${esc(image.path)}" loading="lazy" alt="第 ${issue.id} 期第 ${i + 1} 张图片，点开查看原尺寸"></a><figcaption class="caption"><span class="caption-number">${String(i + 1).padStart(2, '0')} / ${String(issue.images.length).padStart(2, '0')}</span><span>${esc(image.caption)}</span><button class="favorite" data-id="${esc(id)}" aria-pressed="${selected}" aria-label="${selected ? '取消收藏这张图片' : '收藏这张图片'}" title="${selected ? '取消收藏' : '收藏'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/></svg></button></figcaption></figure>`;
}
function pagesNav(result, query) {
  if (result.pages <= 1) return '';
  const indexes = [...new Set([1, result.page - 1, result.page, result.page + 1, result.pages].filter(n => n >= 1 && n <= result.pages))].sort((a,b) => a-b);
  let previous = 0;
  const numbers = indexes.map(n => {
    const gap = n - previous > 1 ? '<span class="page-gap">…</span>' : ''; previous = n;
    return gap + (n === result.page ? `<span class="page-current" aria-current="page">${n}</span>` : `<a href="#${esc(listRoute(query,n))}" aria-label="第 ${n} 页">${n}</a>`);
  }).join('');
  const previousLink = result.page > 1 ? `<a href="#${esc(listRoute(query,result.page-1))}">上一页</a>` : '<span class="page-disabled">上一页</span>';
  const nextLink = result.page < result.pages ? `<a href="#${esc(listRoute(query,result.page+1))}">下一页</a>` : '<span class="page-disabled">下一页</span>';
  return `<nav class="pagination" aria-label="分页">${previousLink}<span class="page-numbers">${numbers}</span>${nextLink}<span class="page-total">${result.page} / ${result.pages}</span></nav>`;
}
function issueCard(issue, from) {
  return `<a class="issue" href="#${esc(issueRoute(issue,-1,from))}">${issue.images.length ? `<img src="${esc(issue.images[0].path)}" loading="lazy" alt="">` : `<span class="missing-cover">NO. ${issue.id}<br>暂未取得</span>`}<div><div class="eyebrow">NO. ${issue.id}${issue.date ? `　 /　${esc(issue.date)}` : ''}</div><h3>${esc(issue.title)}</h3><p>${issue.images.length ? `${issue.images.length} 张图片` : '内容暂缺 · 查看原文'}</p></div></a>`;
}
function searchCard(hit, query, from) {
  const {issue, image, index} = hit;
  let excerpt = '';
  if (image) {
    const offset = image.caption.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    const start = Math.max(0, offset - 35);
    excerpt = `${start ? '…' : ''}${image.caption.slice(start,start+130)}${start+130 < image.caption.length ? '…' : ''}`;
  }
  return `<a class="issue search-result" href="#${esc(issueRoute(issue,index,from))}">${image ? `<img src="${esc(image.path)}" loading="lazy" alt="">` : issue.images.length ? `<img src="${esc(issue.images[0].path)}" loading="lazy" alt="">` : `<span class="missing-cover">NO. ${issue.id}<br>暂未取得</span>`}<div><div class="eyebrow">NO. ${issue.id}${issue.date ? `　 /　${esc(issue.date)}` : ''}　 /　${image ? `第 ${index+1} 张` : '标题匹配'}</div><h3>${esc(issue.title)}</h3><p>${image ? esc(excerpt) : issue.images.length ? '查看本期' : '内容暂缺 · 查看原文'}</p></div></a>`;
}
function render() {
  document.querySelector('#count').textContent = favorites.length ? `(${favorites.length})` : '';
  const route = location.hash.slice(1) || '/';
  const [path, rawParams = ''] = route.split('?');
  const params = new URLSearchParams(rawParams);
  if (path === '/favorites') {
    const selected = issues.flatMap(issue => issue.images.map((image, i) => ({issue, image, i})).filter(x => favorites.includes(photoKey(x.issue, x.i))));
    app.innerHTML = `<a class="back" href="#/">← 返回所有期数</a><h1 class="issue-title">我的收藏</h1><p class="subtle">收藏仅保存在当前浏览器，清除浏览器数据后可能丢失。</p>${selected.length ? `<div class="photo-grid">${selected.map(x => photo(x.issue,x.image,x.i)).join('')}</div>` : '<p class="empty">还没有收藏的图片。打开一期，点击图片旁的心形图标。</p>'}`;
  } else if (path.startsWith('/issue/')) {
    const segments = path.split('/');
    const issue = issues.find(x => String(x.id) === segments[2]);
    const origin = params.get('from') || '/';
    const safeOrigin = origin === '/' || origin.startsWith('/?') ? origin : '/';
    const back = `<a class="back" href="#${esc(safeOrigin)}">← ${safeOrigin.includes('q=') ? '返回搜索结果' : '返回期数列表'}</a>`;
    if (!issue) { app.innerHTML = `${back}<p>未找到这一期。</p>`; return; }
    if (!issue.images.length) { app.innerHTML = `${back}<h1 class="issue-title">${titleHtml(issue.title)}</h1><p class="subtle">本期暂未取得内容，可查看公众号原文。</p><a class="source" href="${esc(issue.url)}" target="_blank" rel="noopener">查看公众号原文 ↗</a>`; return; }
    app.innerHTML = `${back}<h1 class="issue-title">${titleHtml(issue.title)}</h1><p class="subtle">NO. ${issue.id}　 /　${esc(issue.date)}　 /　${issue.images.length} 张图片</p><p class="copyright issue-copyright">本图集转载自公众号「hawk26讲武堂」。文章文字及编辑内容的权利归相应权利人所有，照片版权归原摄影师或其他权利人所有。本站不对上述内容主张版权。</p><a class="source" href="${esc(issue.url)}" target="_blank" rel="noopener">公众号原文 ↗</a><div class="photo-grid">${issue.images.map((image,i) => photo(issue,image,i)).join('')}</div>`;
    const number = segments[3] === 'photo' ? Number(segments[4]) : 0;
    const target = Number.isSafeInteger(number) && number > 0 ? document.getElementById(`photo-${number}`) : null;
    if (target) {
      const originalHash = location.hash;
      target.scrollIntoView({block:'start'});
      const images = [...document.querySelectorAll('.photo img')];
      let userMoved = false;
      const markMoved = () => { userMoved = true; };
      ['wheel','touchstart','keydown'].forEach(type => window.addEventListener(type, markMoved, {once:true}));
      images.forEach(img => { img.loading = 'eager'; });
      Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.addEventListener('load',resolve,{once:true}); img.addEventListener('error',resolve,{once:true}); }))).then(() => {
        ['wheel','touchstart','keydown'].forEach(type => window.removeEventListener(type, markMoved));
        if (!userMoved && location.hash === originalHash) target.scrollIntoView({block:'start'});
      });
    } else window.scrollTo(0,0);
  } else {
    const query = (params.get('q') || '').trim().slice(0,120);
    const matches = query ? GallerySearch.find(issues,query) : issues;
    const result = GallerySearch.paginate(matches, params.get('page') || 1);
    const from = listRoute(query,result.page);
    const search = `<form class="search-form" role="search"><label for="gallery-search">搜索期数和图片说明</label><div class="search-controls"><input id="gallery-search" name="q" type="search" maxlength="120" value="${esc(query)}" placeholder="例如 F-35、航母、核潜艇"><button type="submit">搜索</button>${query ? '<a class="search-clear" href="#/">清除</a>' : ''}</div></form>`;
    const header = `<div class="intro"><div><div class="eyebrow">PHOTO COLLECTION</div><h1>集腋成裘</h1></div><div><p class="copyright">内容来自「hawk26讲武堂」，文字与图片版权归各自权利人所有。</p></div></div>${search}`;
    if (query) {
      app.innerHTML = `${header}<div class="section-label"><span>搜索结果</span><span>${result.total} 条匹配</span></div><p class="search-scope">搜索已收录的标题和图片说明；内容暂缺的期数仅搜索标题。</p>${result.items.length ? result.items.map(hit => searchCard(hit,query,from)).join('') : '<p class="empty">没有找到匹配内容，试试其他关键词。</p>'}${pagesNav(result,query)}`;
    } else {
      const featured = result.page === 1 ? result.items[0] : null;
      const rest = featured ? result.items.slice(1) : result.items;
      const hero = featured ? `<div class="section-label"><span>最新一期</span><span>${esc(featured.date)}　 /　 NO. ${featured.id}</span></div><div class="hero"><a href="#${esc(issueRoute(featured,-1,from))}">${featured.images.length ? `<img src="${esc(featured.images[3]?.path || featured.images[0].path)}" alt="第 ${featured.id} 期代表图">` : `<span class="missing-cover">NO. ${featured.id}<br>暂未取得</span>`}</a><div><div class="eyebrow">ISSUE ${featured.id}　 /　${featured.images.length ? `${featured.images.length} 张图片` : '内容暂缺'}</div><h2>${esc(featured.title)}</h2><a class="button" href="#${esc(issueRoute(featured,-1,from))}">查看本期 ↗</a></div></div>` : '';
      app.innerHTML = `${header}${hero}<div class="issue-list${featured ? '' : ' issue-list-first'}"><div class="section-label"><span>往期图集</span><span>共 ${issues.length} 期</span></div>${rest.map(issue => issueCard(issue,from)).join('')}${pagesNav(result,'')}</div>`;
    }
    window.scrollTo(0,0);
  }
}
app.addEventListener('submit', event => {
  if (!event.target.matches('.search-form')) return;
  event.preventDefault();
  const query = new FormData(event.target).get('q').trim().slice(0,120);
  const next = `#${listRoute(query)}`;
  if (location.hash === next) render(); else location.hash = next;
});
app.addEventListener('click', event => {
  const button = event.target.closest('button[data-id]'); if (!button) return;
  const id = button.dataset.id; const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites,id];
  try { localStorage.setItem(key, JSON.stringify(next)); favorites = next; } catch (_) { alert('浏览器无法保存收藏，请检查存储权限。'); return; }
  const selected = favorites.includes(id); button.setAttribute('aria-pressed', String(selected)); button.setAttribute('aria-label', selected ? '取消收藏这张图片' : '收藏这张图片'); button.title = selected ? '取消收藏' : '收藏';
  document.querySelector('#count').textContent = favorites.length ? `(${favorites.length})` : '';
  if (location.hash === '#/favorites' && !favorites.includes(id)) render();
});
window.addEventListener('hashchange', render);
fetch('data.json').then(r => { if (!r.ok) throw Error('fetch failed'); return r.json(); }).then(data => { issues = data; render(); }).catch(() => { app.textContent = '图集暂时无法加载，请稍后重试。'; });
