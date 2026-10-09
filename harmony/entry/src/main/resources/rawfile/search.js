(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\s·!！?'’"“”\-]/g, '');
  function search(entries, options = {}) {
    const { category = 'all', query = '', quality = '', keys = null, sort = 'id' } = options;
    const q = normalize(query);
    const numbered = /^#?([ctk])?0*(\d+)$/.exec(q);
    const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
    return entries.filter(e => {
      if (category !== 'all' && e.category !== category) return false;
      if (keys && !keys.includes(e.key)) return false;
      if (quality !== '' && e.quality !== Number(quality)) return false;
      if (!q) return true;
      if (numbered) { const prefix=numbered[1]; const matchesGameId=e.id===Number(numbered[2]); const matchesPrefix=!prefix || (prefix==='c' ? ['active','passive'].includes(e.category) : e.key[0].toLowerCase()===prefix); return matchesGameId&&matchesPrefix; }
      const haystack = normalize([e.name,e.en,e.quote,e.effect,e.condition,...(e.tags||[]),...(e.aliases||[])].join(' '));
      return tokens.every(t => haystack.includes(t));
    }).sort((a,b) => sort === 'name' ? a.name.localeCompare(b.name,'zh-Hans-CN') :
      sort === 'quality' ? (b.quality ?? -1)-(a.quality ?? -1) || (a.id||0)-(b.id||0) :
      sortById(a,b));
  }
  function sortById(a,b) {
    // Active and passive items share the game's C-number sequence: interleave them by ID.
    const isCollectible = e => e.category === 'active' || e.category === 'passive';
    if(isCollectible(a) && isCollectible(b)) return (a.id||0)-(b.id||0);
    const rank = {active:0,passive:0,card:1,set:2,trinket:3};
    return (rank[a.category]??9)-(rank[b.category]??9) || (a.id??Number(a.key.slice(1)))-(b.id??Number(b.key.slice(1)));
  }
  const api = { normalize, search };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.IsaacSearch = api;
})(typeof window === 'undefined' ? globalThis : window);
