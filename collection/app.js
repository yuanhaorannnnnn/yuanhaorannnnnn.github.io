const app = document.querySelector('#app');
const key = 'jiyi-favorites-v1';
let issues = [];
let favorites = [];
try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) favorites = saved; } catch (_) {}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photoKey = (issue, i) => `${issue.id}:${i}`;
const titleHtml = s => esc(s).replace(/\b([A-Za-z]+-\d+[A-Za-z]*)\b/g, '<span style="white-space:nowrap">$1</span>');
function photo(issue, image, i) {
  const id = photoKey(issue, i), selected = favorites.includes(id);
  return `<figure class="photo"><a href="${esc(image.path)}" target="_blank" rel="noopener"><img src="${esc(image.path)}" loading="lazy" alt="第 ${issue.id} 期第 ${i + 1} 张图片，点开查看原尺寸"></a><figcaption class="caption"><span class="caption-number">${String(i + 1).padStart(2, '0')} / ${String(issue.images.length).padStart(2, '0')}</span><span>${esc(image.caption)}</span><button class="favorite" data-id="${esc(id)}" aria-pressed="${selected}">${selected ? '已收藏' : '收藏'}</button></figcaption></figure>`;
}
function render() {
  document.querySelector('#count').textContent = favorites.length ? `(${favorites.length})` : '';
  const route = location.hash.slice(1) || '/';
  if (route === '/favorites') {
    const selected = issues.flatMap(issue => issue.images.map((image, i) => ({issue, image, i})).filter(x => favorites.includes(photoKey(x.issue, x.i))));
    app.innerHTML = `<a class="back" href="#/">← 返回所有期数</a><h1 class="issue-title">我的收藏</h1><p class="subtle">收藏仅保存在当前浏览器，清除浏览器数据后可能丢失。</p>${selected.length ? `<div class="photo-grid">${selected.map(x => photo(x.issue,x.image,x.i)).join('')}</div>` : '<p class="empty">还没有收藏的图片。打开一期，点击图片旁的「收藏」。</p>'}`;
  } else if (route.startsWith('/issue/')) {
    const issue = issues.find(x => String(x.id) === route.split('/')[2]);
    if (!issue) { app.innerHTML = '<p>未找到这一期。<a href="#/">返回期数列表</a></p>'; return; }
    if (!issue.images.length) { app.innerHTML = `<a class="back" href="#/">← 所有期数</a><h1 class="issue-title">${titleHtml(issue.title)}</h1><p class="subtle">本期暂未取得内容，可查看公众号原文。</p><a class="source" href="${esc(issue.url)}" target="_blank" rel="noopener">查看公众号原文 ↗</a>`; return; }
    app.innerHTML = `<a class="back" href="#/">← 所有期数</a><h1 class="issue-title">${titleHtml(issue.title)}</h1><p class="subtle">NO. ${issue.id}　 /　${esc(issue.date)}　 /　${issue.images.length} 张图片</p><a class="source" href="${esc(issue.url)}" target="_blank" rel="noopener">公众号原文 ↗</a><div class="photo-grid">${issue.images.map((image,i) => photo(issue,image,i)).join('')}</div>`;
  } else {
    const latest = issues[0];
    app.innerHTML = `<div class="intro"><div><div class="eyebrow">PHOTO COLLECTION</div><h1>集腋成裘</h1></div><p>照片中的装备、现场与细节。按期收录「hawk26讲武堂」的图文合集，留住值得慢慢看的画面。</p></div><div class="section-label"><span>最新一期</span><span>${esc(latest.date)}　 /　 NO. ${latest.id}</span></div><div class="hero"><a href="#/issue/${latest.id}"><img src="${esc(latest.images[3]?.path || latest.images[0].path)}" alt="第 ${latest.id} 期代表图"></a><div><div class="eyebrow">ISSUE ${latest.id}　 /　${latest.images.length} 张图片</div><h2>${esc(latest.title)}</h2><p>航空、舰船与地面装备的画面。沿着照片和原文说明，逐张阅读。</p><a class="button" href="#/issue/${latest.id}">查看本期 ↗</a></div></div><div class="issue-list"><div class="section-label"><span>往期图集</span><span>共 ${issues.length} 期</span></div>${issues.slice(1).map(issue => `<a class="issue" href="#/issue/${issue.id}">${issue.images.length ? `<img src="${esc(issue.images[0].path)}" loading="lazy" alt="">` : `<span class="missing-cover">NO. ${issue.id}<br>暂未取得</span>`}<div><div class="eyebrow">NO. ${issue.id}　 /　${esc(issue.date)}</div><h3>${esc(issue.title)}</h3><p>${issue.images.length ? `${issue.images.length} 张图片` : "内容暂缺 · 查看原文"}</p></div><span>查看 ↗</span></a>`).join('')}</div>`;
  }
}
app.addEventListener('click', event => {
  const button = event.target.closest('button[data-id]'); if (!button) return;
  const id = button.dataset.id; favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites,id];
  try { localStorage.setItem(key, JSON.stringify(favorites)); } catch (_) { alert('浏览器无法保存收藏，请检查存储权限。'); }
  button.setAttribute('aria-pressed', String(favorites.includes(id))); button.textContent = favorites.includes(id) ? '已收藏' : '收藏';
  document.querySelector('#count').textContent = favorites.length ? `(${favorites.length})` : '';
  if (location.hash === '#/favorites' && !favorites.includes(id)) render();
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0,0); });
fetch('data.json').then(r => { if (!r.ok) throw Error('fetch failed'); return r.json(); }).then(data => { issues = data; render(); }).catch(() => { app.textContent = '图集暂时无法加载，请稍后重试。'; });
