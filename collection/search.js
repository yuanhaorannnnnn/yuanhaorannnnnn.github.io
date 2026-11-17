(function (root) {
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase();
  function find(issues, query) {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return issues.flatMap(issue => {
      const matches = [];
      if (normalize(issue.title).includes(needle)) matches.push({issue, image: null, index: -1});
      issue.images.forEach((image, index) => {
        if (normalize(image.caption).includes(needle)) matches.push({issue, image, index});
      });
      return matches;
    });
  }
  function paginate(items, requested, size = 20) {
    const pages = Math.max(1, Math.ceil(items.length / size));
    const number = Number(requested);
    const page = Number.isSafeInteger(number) ? Math.min(pages, Math.max(1, number)) : 1;
    return {page, pages, total: items.length, items: items.slice((page - 1) * size, page * size)};
  }
  const api = {find, paginate};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GallerySearch = api;
})(typeof globalThis === 'undefined' ? this : globalThis);
