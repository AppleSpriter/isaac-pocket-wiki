(function (root) {
  'use strict';
  const Search = typeof module !== 'undefined' && module.exports ? require('./search.js') : root.IsaacSearch;
  const PAGE_SIZE = 48;
  const categories = ['all', 'active', 'passive', 'card', 'set', 'trinket'];
  const sorts = ['id', 'quality', 'name'];

  function restore(saved, entries) {
    const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    const byKey = new Map(entries.map(e => [e.key, e]));
    const positions = {};
    for (const category of categories) {
      const position = source.positions?.[category];
      const item = byKey.get(position?.key);
      if (item && (category === 'all' || item.category === category)) {
        positions[category] = { key: item.key, offset: Math.max(-1000, Math.min(1000, Number(position.offset) || 0)) };
      }
    }
    const category = categories.includes(source.category) ? source.category : 'all';
    return {
      category,
      quality: ['all', 'active', 'passive'].includes(category) && ['0', '1', '2', '3', '4'].includes(source.quality) ? source.quality : '',
      sort: sorts.includes(source.sort) ? source.sort : 'id',
      positions
    };
  }

  function pageForKey(results, key) {
    const index = results.findIndex(e => e.key === key);
    return index < 0 ? 0 : Math.floor(index / PAGE_SIZE);
  }

  function page(results, requested) {
    const count = Math.ceil(results.length / PAGE_SIZE);
    const index = Math.max(0, Math.min(Math.max(0, count - 1), Math.floor(Number(requested) || 0)));
    return { index, count, items: results.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE) };
  }

  function locate(entries, state, key) {
    const item = entries.find(e => e.key === key);
    if (!item) return null;
    const category = state.category === 'all' || state.category === item.category ? state.category : item.category;
    const quality = state.quality !== '' && item.quality !== Number(state.quality) ? '' : state.quality;
    const next = { ...state, category, quality, query: '' };
    const results = Search.search(entries, next);
    return { ...next, page: pageForKey(results, key), anchorKey: key };
  }

  const api = { PAGE_SIZE, restore, pageForKey, page, locate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IsaacCatalog = api;
})(typeof window === 'undefined' ? globalThis : window);
