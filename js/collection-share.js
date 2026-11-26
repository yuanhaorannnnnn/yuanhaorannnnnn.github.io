(() => {
  const settings = document.currentScript.dataset;
  const status = document.createElement('span');
  status.className = 'collection-share-status';
  status.setAttribute('role', 'status');
  document.body.append(status);

  function addCopyButton(row) {
    const link = row.matches('a') ? row : row.querySelector('a[href]');
    const title = (row.querySelector(settings.title || 'h2, h3') || link || row).textContent.trim();
    const source = link ? new URL(link.href) : null;
    const article = source?.origin === location.origin && source.pathname.split('/').pop().replace(/\.html$/, '');
    const key = article || source?.searchParams.get('mid') ||
      row.querySelector('small')?.textContent.match(/\d{4}-\d{2}-\d{2}/)?.[0] || row.dataset.number;
    if (!row.id && !key) return;

    row.id ||= 'item-' + key;
    row.classList.add('collection-share-target');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'collection-copy';
    button.dataset.collectionCopy = '#' + row.id;
    button.textContent = '复制链接';
    button.setAttribute('aria-label', '复制链接：' + title);

    if (row.matches('a, details')) {
      const pair = document.createElement('div');
      pair.className = 'collection-share-pair';
      row.before(pair);
      pair.append(row, button);
    } else {
      row.classList.add('collection-share-row');
      row.append(button);
    }
  }

  if (settings.entries) {
    for (const row of document.querySelectorAll(settings.entries)) addCopyButton(row);

    const revealTarget = () => {
      const target = document.getElementById(location.hash.slice(1));
      if (!target?.classList.contains('collection-share-target')) return;
      if (target.closest('[hidden]')) {
        document.querySelector('[data-topic=""]')?.click();
        const search = document.querySelector('input[type="search"]');
        if (search) {
          search.value = '';
          search.dispatchEvent(new Event('input'));
        }
      }
      if (target.matches('details')) target.open = true;
      target.scrollIntoView({block: 'start', behavior: 'instant'});
    };
    window.addEventListener('hashchange', revealTarget);
    if (location.hash) {
      revealTarget();
      window.addEventListener('load', revealTarget, {once: true});
    }
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-collection-copy]');
    if (!button) return;
    const url = new URL(button.dataset.collectionCopy, location.href);
    url.search = '';
    try {
      await navigator.clipboard.writeText(url.href);
      const previous = document.querySelector('.collection-copy[data-copied]');
      if (previous) {
        previous.textContent = '复制链接';
        delete previous.dataset.copied;
      }
      button.textContent = '已复制';
      button.dataset.copied = '';
      status.textContent = (button.getAttribute('aria-label') || '链接').replace('复制链接：', '') + '，链接已复制';
    } catch {
      window.prompt('复制这条内容的链接', url.href);
    }
  });
})();
