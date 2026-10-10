const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Catalog = require('../web/catalog.js');
const Search = require('../web/search.js');
const entries = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/data.json'), 'utf8')).entries;

test('首次默认全部，损坏或旧的浏览状态安全回退', () => {
  for (const saved of [null, [], 'active', { category: 'unknown', sort: 'unknown', quality: '9' }]) {
    const restored = Catalog.restore(saved, entries);
    assert.equal(restored.category, 'all');
    assert.equal(restored.sort, 'id');
    assert.equal(restored.quality, '');
  }
});

test('恢复分类和各分类锚点，过滤已删除条目与分类不匹配的记录', () => {
  const restored = Catalog.restore({
    category: 'active', sort: 'name', quality: '4',
    positions: { all: { key: 'C600', offset: 12 }, active: { key: 'C357', offset: -20 },
      passive: { key: 'C357' }, trinket: { key: 'T9999' }, card: { key: 'K1', offset: 5000 } }
  }, entries);
  assert.equal(restored.category, 'active');
  assert.equal(restored.sort, 'name');
  assert.deepEqual(restored.positions.all, { key: 'C600', offset: 12 });
  assert.deepEqual(restored.positions.active, { key: 'C357', offset: -20 });
  assert.equal(restored.positions.passive, undefined);
  assert.equal(restored.positions.trinket, undefined);
  assert.equal(restored.positions.card.offset, 1000);
});

test('定位 C600 按真实列表位置跳页，兼容编号空号和名称排序', () => {
  for (const sort of ['id', 'name', 'quality']) {
    const located = Catalog.locate(entries, { category: 'all', quality: '', sort, query: 'C600', page: 0 }, 'C600');
    const results = Search.search(entries, located);
    assert.equal(located.query, '');
    assert.equal(located.category, 'all');
    assert.equal(located.page, Math.floor(results.findIndex(e => e.key === 'C600') / Catalog.PAGE_SIZE));
    assert.ok(Catalog.page(results, located.page).items.some(e => e.key === 'C600'));
    if (sort === 'id') assert.ok(located.page > 10);
  }
});

test('跨分类入口切换至目标分类，仅清除会隐藏目标的品质筛选', () => {
  const card = Catalog.locate(entries, { category: 'active', quality: '4', sort: 'id' }, 'K1');
  assert.equal(card.category, 'card');
  assert.equal(card.quality, '');
  const item = entries.find(e => e.key === 'C357');
  const active = Catalog.locate(entries, { category: 'active', quality: String(item.quality), sort: 'name' }, item.key);
  assert.equal(active.category, 'active');
  assert.equal(active.quality, String(item.quality));
  assert.equal(active.sort, 'name');
  assert.equal(Catalog.locate(entries, card, 'C9999'), null);
});

test('分页首尾与空结果不越界，每页至多48项', () => {
  const results = Search.search(entries);
  assert.equal(Catalog.page(results, -1).index, 0);
  assert.equal(Catalog.page(results, 999).index, Math.ceil(results.length / 48) - 1);
  assert.equal(Catalog.page(results, 0).items.length, 48);
  assert.deepEqual(Catalog.page([], 100), { index: 0, count: 0, items: [] });
});

test('总览中的每个键都能定位到包含该条目的列表页', () => {
  for (const item of entries) {
    const located = Catalog.locate(entries, { category: 'all', quality: '', sort: 'id' }, item.key);
    const results = Search.search(entries, located);
    assert.ok(Catalog.page(results, located.page).items.some(e => e.key === item.key), item.key);
  }
});
