const storageKey = 'ski-hotels-favorites-v1';
const count = document.querySelector('#count');
const saved = document.querySelector('#saved');
const results = document.querySelector('#results');
const form = document.querySelector('.search');
let favorites = [];
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(stored)) favorites = stored;
} catch {}
let articles = [];

function updateButtons() {
  count.textContent = favorites.length ? String(favorites.length) : '';
  for (const button of document.querySelectorAll('[data-photo]')) {
    const selected = favorites.includes(button.dataset.photo);
    button.textContent = selected ? '♥ 已收藏' : '♡ 收藏';
    button.setAttribute('aria-pressed', String(selected));
  }
}

function photoLink(article, index) {
  return article.id + '.html#photo-' + (index + 1);
}

function renderFavorites() {
  saved.replaceChildren();
  for (const article of articles) {
    article.images.forEach((photo, index) => {
      const id = article.id + ':' + (index + 1);
      if (!favorites.includes(id)) return;
      const figure = document.createElement('figure');
      figure.className = 'photo';
      const link = document.createElement('a');
      link.href = photoLink(article, index);
      const img = new Image();
      img.src = photo.path;
      img.loading = 'lazy';
      img.alt = photo.caption || article.title;
      link.append(img);
      const caption = document.createElement('figcaption');
      const label = document.createElement('span');
      label.textContent = photo.caption || article.title;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.photo = id;
      caption.append(label, button);
      figure.append(link, caption);
      saved.append(figure);
    });
  }
  if (!saved.children.length) saved.textContent = '还没有收藏的图片。';
  updateButtons();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-photo]');
  if (!button) return;
  const id = button.dataset.photo;
  const next = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    favorites = next;
  } catch {
    window.alert('当前浏览器无法保存收藏。');
    return;
  }
  if (saved) renderFavorites();
  else updateButtons();
});

function renderSearch() {
  const params = new URLSearchParams(location.search);
  const query = (params.get('q') || '').trim().slice(0, 120);
  if (!query) return;
  form.elements.q.value = query;
  const matches = GallerySearch.find(articles, query);
  const pagination = GallerySearch.paginate(matches, params.get('page') || 1);
  results.replaceChildren();
  for (const {issue, image, index} of pagination.items) {
    const row = document.createElement('div');
    row.className = 'row';
    const link = document.createElement('a');
    link.href = image ? photoLink(issue, index) : issue.id + '.html';
    link.textContent = image ? issue.title + ' · ' + image.caption : issue.title;
    row.append(link);
    results.append(row);
  }
  if (!matches.length) results.textContent = '没有找到匹配的标题或图注。';
  const pages = document.querySelector('#pages');
  for (let number = 1; number <= pagination.pages && pagination.pages > 1; number++) {
    const link = document.createElement('a');
    link.href = '?' + new URLSearchParams({q: query, page: number});
    link.textContent = String(number);
    if (number === pagination.page) link.setAttribute('aria-current', 'page');
    pages.append(link);
  }
}

updateButtons();
if (results || saved) {
  fetch('data.json').then(response => {
    if (!response.ok) throw new Error('无法读取专题数据');
    return response.json();
  }).then(data => {
    articles = data;
    if (saved) renderFavorites();
    else renderSearch();
  }).catch(() => {
    const target = saved || document.querySelector('#pages');
    target.textContent = '专题数据暂时无法加载。';
  });
}
