const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {search}=require('../web/search.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../web/data.json'),'utf8'));
const all=data.entries;

test('完整分类数量、唯一键及所需本地资源',()=>{
  assert.equal(all.length,1022);
  assert.equal(new Set(all.map(e=>e.key)).size,1022);
  for(const [category,count] of Object.entries(data.counts)) assert.equal(search(all,{category}).length,count);
  for(const e of all){
    assert.ok(e.name&&e.en&&e.effect&&e.source.startsWith('https://isaac.huijiwiki.com/wiki/'),e.key);
    assert.ok(e.icon||e.image,e.key);
    for(const asset of [e.icon?.file,e.image].filter(Boolean))assert.ok(fs.existsSync(path.join(__dirname,'../web',asset)),asset);
    assert.ok(e.category==='set'?e.id===null:Number.isInteger(e.id)&&e.id>0,e.key);
  }
});
test('编号精确查询，避免把 1 匹配为 10 / 118',()=>{
  assert.deepEqual(search(all,{query:'1'}).map(e=>e.key).sort(),['C1','K1','T1']);
  for(const query of ['C118','c118',' C00118 ','Ｃ１１８','#C118'])assert.deepEqual(search(all,{query}).map(e=>e.key),['C118']);
  assert.deepEqual(search(all,{query:'#118'}).map(e=>e.key).sort(),['C118','T118']);
  assert.equal(search(all,{query:'C9999'}).length,0);
});
test('中文、英文、效果与套装别名查询',()=>{
  assert.ok(search(all,{query:'硫磺火'}).some(e=>e.key==='C118')); 
  assert.ok(search(all,{query:'brimstone'}).some(e=>e.key==='C118'));
  assert.ok(search(all,{query:'追踪',category:'passive'}).some(e=>e.key==='C3'));
  assert.ok(search(all,{query:'猫套装',category:'set'}).some(e=>e.key==='S1'));
});
test('分类、品质、收藏的组合筛选与零品质',()=>{
  assert.equal(search(all,{category:'trinket',query:'C118'}).length,0);
  assert.equal(search(all,{category:'passive',quality:'4'}).length,28);
  assert.equal(search(all,{category:'passive',quality:'0'}).length,49);
  assert.deepEqual(search(all,{keys:['C118','K1'],category:'card'}).map(e=>e.key),['K1']);
  assert.equal(search(all,{keys:[]}).length,0);
});
test('套装忏悔效果与新增套装关系',()=>{
  const guppy=all.find(e=>e.key==='S1'),necro=all.find(e=>e.name==='死灵法师！');
  assert.ok(guppy.effect.includes('66%'));
  assert.ok(!guppy.effect.includes('每当角色对敌人造成伤害时，生成1只'));
  assert.equal(guppy.effects.length,2);
  assert.deepEqual(necro.components.map(c=>c.key).sort(),['C262','C35','T48']);
  assert.ok(necro.condition.includes('同时拥有'));
});

test('主动道具全量、C编号及套装组件关联',()=>{
 const active=all.filter(e=>e.category==='active');
 assert.equal(active.length,170);
 assert.deepEqual(search(all,{query:'C33'}).map(e=>e.key),['C33']);
 assert.equal(search(all,{query:'C33',category:'active'})[0].name,'圣经');
 assert.equal(search(all,{query:'C33',category:'passive'}).length,0);
 assert.equal(all.filter(e=>['active','passive','card','trinket'].includes(e.category)).length,1006);
 assert.ok(all.find(e=>e.key==='C35'&&e.category==='active'));
 for(const e of active){assert.equal(e.key,'C'+e.id);assert.ok(Number.isInteger(e.quality));}
});

test('全部图鉴按C编号混排主被动道具而不是主动优先',()=>{
 const result=search(all,{category:'all',sort:'id'});
 assert.deepEqual(result.slice(0,3).map(e=>e.key),['C1','C2','C3']);
 const collectibles=all.filter(e=>['active','passive'].includes(e.category)).sort((a,b)=>a.id-b.id);
 assert.deepEqual(result.slice(0,collectibles.length).map(e=>e.key),collectibles.map(e=>e.key));
 assert.ok(result.findIndex(e=>e.key==='C32')<result.findIndex(e=>e.key==='C33'));
 assert.ok(result.findIndex(e=>e.key==='C45')<result.findIndex(e=>e.key==='C46'));
 for(const category of ['active','passive','card','trinket']){
  const rows=search(all,{category,sort:'id'});
  assert.ok(rows.every((e,i)=>!i||e.id>rows[i-1].id));
 }
});
