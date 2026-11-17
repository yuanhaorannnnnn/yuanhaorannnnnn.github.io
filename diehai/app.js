const search = document.querySelector('#search');
if (search) {
  const status = document.querySelector('#search-status');
  search.addEventListener('input', () => {
    const query = search.value.trim().normalize('NFKC').toLowerCase();
    let count = 0;
    for (const group of document.querySelectorAll('.group')) {
      let shown = 0;
      for (const entry of group.querySelectorAll('.entry')) {
        entry.hidden = !entry.dataset.search.normalize('NFKC').toLowerCase().includes(query);
        if (!entry.hidden) shown++;
      }
      group.hidden = shown === 0;
      count += shown;
    }
    status.textContent = query ? (count ? count + ' 条匹配' : '没有匹配条目') : '';
  });
}
const key = 'diehai-photo-favorites-v1';
let favorites = {};
try {
  const stored = JSON.parse(localStorage.getItem(key) || '{}');
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) favorites = stored;
} catch {}

function render() {
  const saved = document.querySelector('#saved');
  if (saved) {
    saved.replaceChildren();
    for (const [id, photo] of Object.entries(favorites)) {
      if (!/^\d+:\d+$/.test(id) || !photo || !/^images\/\d+\/img_\d+\.[a-z0-9]+$/i.test(photo.image)) continue;
      const figure = document.createElement('figure');
      const anchor = document.createElement('a');
      anchor.href = id.replace(':', '.html#photo-');
      const image = new Image();
      image.src = photo.image;
      image.alt = photo.title;
      image.loading = 'lazy';
      anchor.append(image);
      const caption = document.createElement('figcaption');
      const button = document.createElement('button');
      button.dataset.photo = id;
      caption.append(button);
      figure.append(anchor, caption);
      saved.append(figure);
    }
    if (!saved.children.length) saved.textContent = '还没有收藏的图片。';
  }
  for (const button of document.querySelectorAll('[data-photo]')) {
    const selected = Object.hasOwn(favorites, button.dataset.photo);
    button.textContent = selected ? '♥ 已收藏' : '♡ 收藏图片';
    button.setAttribute('aria-pressed', String(selected));
  }
}
document.addEventListener('click', event => {
  const button = event.target.closest('button[data-photo]');
  if (!button) return;
  const id = button.dataset.photo;
  const next = {...favorites};
  if (Object.hasOwn(next, id)) delete next[id];
  else next[id] = {image: button.closest('figure').querySelector('img').getAttribute('src'), title: document.title.split(' · ')[0]};
  try {
    localStorage.setItem(key, JSON.stringify(next));
    favorites = next;
  } catch {
    window.alert('当前浏览器无法保存收藏。');
    return;
  }
  render();
});
render();
