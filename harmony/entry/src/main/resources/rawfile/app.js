/* All UI and data are bundled. No network requests are made by this app. */
(() => {
  'use strict';
  const data = window.ISAAC_DATA;
  history.scrollRestoration = 'manual';
  const isHarmony = window.ISAAC_PLATFORM === 'harmony';
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {all:'全部',active:'主动道具',passive:'被动道具',card:'卡牌',set:'套装',trinket:'饰品'};
  const byKey = new Map(data.entries.map(e=>[e.key,e]));
  const achievements = data.achievements || [];
  const achievementByKey = new Map(achievements.map(e=>[e.key,e]));
  const achievementState = {query:'',page:0,scrollY:0};
  const read = key => {try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(k=>byKey.has(k)):[]}catch{return []}};
  let favorites = read('isaac.favorites.v1'), recent = read('isaac.recent.v1');
  const settings = {expandWikiByDefault:false};
  try { const saved=JSON.parse(localStorage.getItem('isaac.settings.v1')||'null');if(typeof saved?.expandWikiByDefault==='boolean')settings.expandWikiByDefault=saved.expandWikiByDefault; } catch {}
  let savedCatalog;
  try { savedCatalog = JSON.parse(localStorage.getItem('isaac.catalog.v2') || 'null'); } catch { savedCatalog = null; }
  const restored = IsaacCatalog.restore(savedCatalog, data.entries);
  let positions = restored.positions;
  let state = {category:restored.category,query:'',quality:restored.quality,sort:restored.sort,view:'catalog',page:0};
  const viewStates = {catalog:null,favorites:null,recent:null};
  const mineViews = ['favorites','recent','settings','about'];
  let mineView='favorites';
  let scrollBeforeDetail=0, lastFocus=null, lastSearchKey=null, searchOriginKey=null, pendingReturnKey=null;
  let detailFromUI=false, highlightedKey=null, scrollTimer, restoringPosition=false, positionTicket=0;
  let currentDetailId=null, detailSequence=0, pendingAchievementKey=null;
  const detailContexts = new Map();
  let quiz = {pool:[], question:null, choices:[], answered:false, score:0, total:0};
  let toastTimer;
  const toast = message => { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2000); };
  function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{toast('本地存储不可用，本次操作仅在当前会话保留')}}
  function art(e) {
    if(e.image)return `<img class="set-art" src="${esc(e.image)}" alt="${esc(e.name)}" loading="lazy">`;
    if(e.icon)return `<i aria-hidden="true" class="sprite" style="background-image:url(${esc(e.icon.file)});background-position:${esc(e.icon.position)}"></i>`;
    return '<i aria-hidden="true" class="sprite" style="background-image:url(assets/collectibles.png);background-position:-384px -480px"></i>';
  }
  function achievementArt(e){
    if(e.icon)return `<i aria-hidden="true" class="achievement-sprite" style="background-image:url(${esc(e.icon.file)});background-position:${esc(e.icon.position)};width:${Number(e.icon.width)||32}px;height:${Number(e.icon.height)||32}px"></i>`;
    return `<span class="achievement-seal" aria-hidden="true">${e.id}</span>`;
  }
  const quality = e => e.quality===null?'':`<span class="quality q${e.quality}">✦ ${e.quality}</span>`;
  const overview = IsaacOverview.create({dialog:$('overview-dialog'),entries:data.entries,art,escape:esc,labels,onLocate:key=>locateInCatalog(key)});
  function categories(){
    $('categories').innerHTML=Object.entries(labels).map(([key,label])=>`<button data-category="${key}" class="${state.category===key?'active':''}" aria-pressed="${state.category===key}">${label}<small>${key==='all'?data.entries.length:data.counts[key]}</small></button>`).join('');
  }
  function resultsFor(current=state){
    const keys=current.view==='favorites'?favorites:current.view==='recent'?recent:null;
    const results=IsaacSearch.search(data.entries,{...current,keys});
    if(current.view==='recent')results.sort((a,b)=>recent.indexOf(a.key)-recent.indexOf(b.key));
    return results;
  }
  function saveCatalog(current=state){
    if(current.view!=='catalog')return;
    persist('isaac.catalog.v2',{category:current.category,quality:current.quality,sort:current.sort,positions});
  }
  function rememberPosition(){
    if(state.view!=='catalog'||state.query||location.hash||overview.isOpen()||restoringPosition)return;
    const top=document.querySelector('.search-panel').getBoundingClientRect().bottom;
    const cards=[...$('list').querySelectorAll('[data-item-key]')];
    const card=cards.find(c=>c.getBoundingClientRect().bottom>top+8)||cards[0];
    if(card){positions[state.category]={key:card.dataset.itemKey,offset:card.getBoundingClientRect().top-top};saveCatalog()}
  }
  function scrollToKey(key,offset=0,focus=false){
    restoringPosition=true;
    const ticket=++positionTicket;
    requestAnimationFrame(()=>{
      if(ticket!==positionTicket)return;
      if(location.hash||!['catalog','favorites','recent'].includes(state.view)){restoringPosition=false;return}
      const card=$('list').querySelector(`[data-item-key="${key}"]`);if(!card){restoringPosition=false;return}
      const safeTop=document.querySelector('.search-panel').offsetHeight+12;
      window.scrollTo(0,Math.max(0,window.scrollY+card.getBoundingClientRect().top-safeTop-offset));
      if(focus)card.querySelector('.card-open').focus({preventScroll:true});
      restoringPosition=false;
    });
  }
  function locateInCatalog(key){
    const current=state.view==='catalog'?state:(viewStates.catalog||{...restored,view:'catalog',query:'',page:0});
    const next=IsaacCatalog.locate(data.entries,current,key);if(!next)return;
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    state={...next,view:'catalog'};highlightedKey=key;pendingReturnKey=null;lastSearchKey=null;
    positions[state.category]={key,offset:0};viewStates.catalog={...state};
    saveCatalog();showView();scrollToKey(key,0,true);
  }
  function renderList(){
    categories();
    const results=resultsFor(),page=IsaacCatalog.page(results,state.page);state.page=page.index;
    if(state.query){
      lastSearchKey=results.length===1?results[0].key:null;
      if(lastSearchKey&&state.view==='catalog'){
        const located=IsaacCatalog.locate(data.entries,state,lastSearchKey);
        positions[located.category]={key:lastSearchKey,offset:0};saveCatalog({...located,view:'catalog'});
      }
    }
    $('search').value=state.query;$('quality').value=state.quality;$('sort').value=state.sort;
    $('quality').hidden=!['active','passive','all'].includes(state.category);
    $('sort').hidden=state.view==='recent';
    $('list-title').textContent=state.view==='favorites'?'我的收藏':state.view==='recent'?'最近查看':state.category==='all'?'全部图鉴':labels[state.category];
    $('result-count').textContent=`${results.length} 项`;
    $('clear-search').hidden=!state.query;
    $('page-summary').textContent=results.length?`第 ${page.index*IsaacCatalog.PAGE_SIZE+1}–${page.index*IsaacCatalog.PAGE_SIZE+page.items.length} 项`:'0 项';
    $('list-location').hidden=!highlightedKey||!!state.query||!page.items.some(e=>e.key===highlightedKey);
    $('list-location').textContent=highlightedKey?`已定位：${highlightedKey} · ${byKey.get(highlightedKey)?.name||''}`:'';
    $('list').innerHTML=page.items.map(e=>`<article class="item-card ${e.key===highlightedKey?'located':''}" data-item-key="${e.key}"><button class="card-open" data-key="${e.key}" aria-label="${esc(e.name)} ${e.id===null?'套装':e.key} 查看详情"><div class="card-top"><span class="item-id">${e.id===null?'TRANSFORMATION':(e.category==='active'||e.category==='passive'?'C':e.key[0])+' · '+String(e.id).padStart(3,'0')}</span>${quality(e)}</div><div class="card-art">${art(e)}</div><span class="card-name">${esc(e.name)}</span><span class="card-en">${esc(e.en)}</span><p class="card-effect">${esc(e.effect)}</p></button>${state.query?`<button class="card-locate" data-locate-key="${e.key}" aria-label="在完整列表中定位 ${esc(e.name)}">定位到列表 ↗</button>`:''}${favorites.includes(e.key)?'<span class="saved-mark" aria-label="已收藏">♥</span>':''}</article>`).join('');
    if(!results.length){
      const keys=state.view==='favorites'?favorites:state.view==='recent'?recent:null;
      const isEmptyCollection=keys&&keys.length===0;
      $('list').innerHTML=`<div class="empty"><span aria-hidden="true">${state.view==='favorites'?'♡':'⌕'}</span><h3>${isEmptyCollection?(state.view==='favorites'?'把喜欢的宝物放进口袋':'还没有查看记录'):'没有找到这件宝物'}</h3><p>${isEmptyCollection?'打开任意条目，开始探索你的图鉴。':'试试中文名、英文名、编号（如 C118）或效果关键词。'}</p><button id="reset-filters">${isEmptyCollection?'浏览图鉴':'清空筛选，查看全部'}</button></div>`;
    }
    $('page-nav').hidden=page.count<=1;$('prev-page').disabled=page.index===0;$('next-page').disabled=page.index>=page.count-1;
    $('page-number').value=page.index+1;$('page-number').max=Math.max(1,page.count);$('page-count').textContent=page.count;
    $('list-note').textContent=state.query?'清空搜索或点“定位到列表”，可从这件物品所在页继续浏览。':isHarmony?'点按上一页/下一页继续浏览。眼动翻页待系统开放接口后接入。':'分类和浏览位置会保存在本机，离线也能继续查阅。';
  }
  function goPage(requested){
    highlightedKey=null;
    state.page=IsaacCatalog.page(resultsFor(),requested).index;renderList();
    const first=$('list').querySelector('[data-item-key]');
    if(first&&!state.query&&state.view==='catalog'){positions[state.category]={key:first.dataset.itemKey,offset:0};saveCatalog()}
    if(first)scrollToKey(first.dataset.itemKey);
  }
  function updateQuery(query){
    if(!state.query&&query){rememberPosition();searchOriginKey=positions[state.category]?.key||IsaacCatalog.page(resultsFor(),state.page).items[0]?.key}
    const restoreKey=lastSearchKey||searchOriginKey;
    state.query=query;highlightedKey=null;
    if(!query&&restoreKey&&state.view==='catalog'){locateInCatalog(restoreKey);return}
    state.page=!query&&restoreKey?IsaacCatalog.pageForKey(resultsFor(),restoreKey):0;
    lastSearchKey=null;renderList();
    if(!query&&restoreKey)scrollToKey(restoreKey);
  }
  function setView(view){
    if(view==='mine')view=mineView;
    if(mineViews.includes(view))mineView=view;
    if(['catalog','favorites','recent'].includes(state.view)){rememberPosition();viewStates[state.view]={...state,scrollY:location.hash?scrollBeforeDetail:window.scrollY}}
    if(state.view==='achievements'&&!location.hash)achievementState.scrollY=window.scrollY;
    positionTicket++;restoringPosition=false;
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    pendingReturnKey=null;pendingAchievementKey=null;detailFromUI=false;currentDetailId=null;
    if(['catalog','favorites','recent'].includes(view)){
      state={...(viewStates[view]||{category:'all',query:'',quality:'',sort:'id',page:0}),view};
    }else state.view=view;
    if(view==='catalog'&&!state.query)state.page=IsaacCatalog.pageForKey(resultsFor(),positions[state.category]?.key);
    if(view==='quiz'&&!quiz.question)newQuizQuestion();
    showView();
    if(view==='catalog'&&!state.query){const position=positions[state.category];if(position)scrollToKey(position.key,position.offset);else window.scrollTo(0,0)}
    else window.scrollTo(0,view==='achievements'?achievementState.scrollY:viewStates[view]?.scrollY||0);
  }
  function showView(){
    const inMine=mineViews.includes(state.view);
    if(inMine)mineView=state.view;
    $('mine-header').hidden=!inMine;
    $('catalog').hidden=!['catalog','favorites','recent'].includes(state.view);$('about').hidden=state.view!=='about';$('settings').hidden=state.view!=='settings';$('quiz').hidden=state.view!=='quiz';$('achievements').hidden=state.view!=='achievements';$('detail').hidden=true;
    document.querySelector('#catalog .intro').hidden=state.view!=='catalog';
    if(inMine&&state.view!=='about'&&state.view!=='settings'){$('catalog').setAttribute('role','tabpanel');$('catalog').setAttribute('aria-labelledby','mine-tab-'+state.view)}
    else{$('catalog').removeAttribute('role');$('catalog').removeAttribute('aria-labelledby')}
    $('about').setAttribute('role','tabpanel');$('about').setAttribute('aria-labelledby','mine-tab-about');
    document.querySelectorAll('[data-mine-view]').forEach(b=>{const selected=b.dataset.mineView===state.view;b.classList.toggle('active',selected);b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1});
    const activeView=inMine?'mine':state.view;
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===activeView);b.setAttribute('aria-current',b.dataset.view===activeView?'page':'false')});
    if(state.view==='about')renderAbout();else if(state.view==='settings')renderSettings();else if(state.view==='quiz')renderQuiz();else if(state.view==='achievements')renderAchievements();else renderList();
  }
  function achievementResults(){
    const query=achievementState.query.normalize('NFKC').trim().toLowerCase();
    if(!query)return achievements;
    const number=query.match(/^(?:a|成就\s*)?0*(\d+)$/);
    if(number)return achievements.filter(e=>e.id===Number(number[1]));
    const words=query.split(/\s+/);
    return achievements.filter(e=>{const text=[e.key,e.id,e.name,e.en,e.condition,e.description,e.reward].join(' ').normalize('NFKC').toLowerCase();return words.every(word=>text.includes(word))});
  }
  function renderAchievements(){
    const results=achievementResults(),page=IsaacCatalog.page(results,achievementState.page);achievementState.page=page.index;
    $('achievement-search').value=achievementState.query;$('achievement-clear').hidden=!achievementState.query;
    $('achievement-count').textContent=`${results.length} 项`;
    $('achievement-list').innerHTML=page.items.map(e=>`<article class="achievement-card" data-achievement-key="${e.key}"><button data-key="${e.key}" aria-label="成就 ${e.id} ${esc(e.name)} 查看详情"><div class="achievement-card-art">${achievementArt(e)}</div><div class="achievement-card-copy"><div class="achievement-card-meta"><span class="item-id">A · ${String(e.id).padStart(3,'0')}</span>${e.version?`<span class="achievement-version">${esc(e.version)}</span>`:''}</div><h2>${esc(e.name)}</h2>${e.en?`<p class="achievement-en">${esc(e.en)}</p>`:''}<p class="achievement-condition">${esc(e.condition||e.description)}</p>${e.reward?`<p class="achievement-reward"><span>解锁</span> ${esc(e.reward)}</p>`:''}</div></button></article>`).join('')||'<div class="empty"><span aria-hidden="true">⌕</span><h3>没有找到这个成就</h3><p>试试 A 编号、中文名、英文名或达成条件。</p><button id="achievement-reset">查看全部成就</button></div>';
    $('achievement-pages').hidden=page.count<=1;$('achievement-prev').disabled=page.index===0;$('achievement-next').disabled=page.index>=page.count-1;
    $('achievement-page').value=page.index+1;$('achievement-page').max=Math.max(1,page.count);$('achievement-page-count').textContent=page.count;
  }
  function achievementPage(page){achievementState.page=page;renderAchievements();window.scrollTo(0,$('achievements').offsetTop)}
  function locateAchievement(key){
    if(!achievementByKey.has(key))return;
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    pendingReturnKey=null;pendingAchievementKey=null;currentDetailId=null;
    state.view='achievements';achievementState.query='';achievementState.page=IsaacCatalog.pageForKey(achievements,key);showView();
    requestAnimationFrame(()=>{const card=document.querySelector(`[data-achievement-key="${key}"]`);if(!card)return;card.classList.add('located');window.scrollTo(0,Math.max(0,window.scrollY+card.getBoundingClientRect().top-$('achievement-search').closest('.search-panel').offsetHeight-12));card.querySelector('button').focus({preventScroll:true});achievementState.scrollY=window.scrollY});
  }
  function shuffle(values){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a;}
  function quizPool(){return data.entries.filter(e=>['active','passive','card','trinket'].includes(e.category));}
  function newQuizQuestion(){
    const pool=quizPool();
    quiz.pool=pool;
    const candidates=pool.filter(e=>e.key!==quiz.question?.key);
    quiz.question=candidates[Math.floor(Math.random()*candidates.length)];
    const others=[]; const seen=new Set([quiz.question.effect]);
    const shuffled=shuffle(pool.filter(e=>e.category===quiz.question.category));
    for(const e of shuffled) if(!seen.has(e.effect)&&e.effect.trim()){seen.add(e.effect);others.push(e.effect);if(others.length===3)break;}
    quiz.choices=shuffle([quiz.question.effect,...others]);quiz.answered=false;
  }
  function renderQuiz(){
    const q=quiz.question;if(!q)return;
    const correct=quiz.answered&&quiz.selected===q.effect;
    $('quiz').innerHTML=`<div class="quiz-head"><div><p class="eyebrow">记忆模式 · 主动 / 被动 / 卡牌 / 饰品</p><h1>看图识效果</h1><p class="muted">像背单词一样，选出这件物品的功能。</p></div><div class="quiz-score"><b>${quiz.score}</b><span>答对 / ${quiz.total}</span></div></div><section class="quiz-card"><div class="quiz-label">这件物品的效果是？</div><div class="quiz-art">${art(q)}</div><div class="quiz-name">${esc(q.name)}</div><div class="quiz-en">${esc(q.en)} · ${q.key}</div><div class="quiz-choices" role="group" aria-label="选择功能">${quiz.choices.map((choice,i)=>{const picked=quiz.answered&&choice===quiz.selected;const right=quiz.answered&&choice===q.effect;return `<button class="quiz-choice ${right?'correct':''} ${picked&&!right?'wrong':''}" data-choice="${esc(choice)}" ${quiz.answered?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(choice)}</button>`}).join('')}</div>${quiz.answered?`<div role="status" class="quiz-result ${correct?'is-correct':'is-wrong'}"><strong>${correct?'答对了！':'再记一下'}</strong><span>${'正确答案：'+esc(q.effect)}</span></div><button class="quiz-next" id="quiz-next">下一题 →</button>`:'<p class="quiz-tip">提示：可以根据图标和名称回忆，也可以先去图鉴查看。</p>'}</section><p class="quiz-foot">题库共 ${quiz.pool.length} 条 · 题目与选项均来自本地资料 · 饰品也纳入题库 · 计分仅本次会话</p>`;
  }
  function answerQuiz(choice){
    if(quiz.answered)return;quiz.selected=choice;quiz.answered=true;quiz.total++;if(choice===quiz.question.effect)quiz.score++;renderQuiz();
  }
  function openDetail(key){
    key=key.toUpperCase();if(!byKey.has(key)&&!achievementByKey.has(key))return;
    if(location.hash.slice(1).toUpperCase()===key)return;
    saveDetailContext();
    if(!location.hash){rememberPosition();scrollBeforeDetail=window.scrollY;lastFocus=document.activeElement;}
    detailFromUI=true;
    if(byKey.has(key)&&!location.hash&&state.view==='catalog'&&(state.query||restoringPosition))pendingReturnKey=key;
    location.hash=key;
  }
  function saveDetailContext(){
    const context=detailContexts.get(currentDetailId);if(!context||$('detail').hidden)return;
    context.scrollY=window.scrollY;context.expanded=[...$('detail').querySelectorAll('.wiki-section[open]')].map(section=>section.dataset.sectionIndex);
  }
  function startDetail(key){
    saveDetailContext();
    const existing=history.state?.isaacDetailKey===key&&detailContexts.get(history.state?.isaacDetailId);
    const fromUI=detailFromUI,external=!fromUI&&!existing;
    detailFromUI=false;
    if(existing)currentDetailId=history.state.isaacDetailId;
    else {currentDetailId=++detailSequence;detailContexts.set(currentDetailId,{key,scrollY:0,expanded:null});history.replaceState({...history.state,isaacDirectDetail:!fromUI&&!!history.state?.isaacDirectDetail,isaacDetailKey:key,isaacDetailId:currentDetailId},'',location.href)}
    return {external,context:detailContexts.get(currentDetailId)};
  }
  function finishDetail(context){
    $('back').onclick=backFromDetail;
    if(context.expanded){const expanded=new Set(context.expanded);$('detail').querySelectorAll('.wiki-section').forEach(section=>section.open=expanded.has(section.dataset.sectionIndex))}
    syncWikiToggle();
    requestAnimationFrame(()=>{if(detailContexts.get(currentDetailId)!==context||$('detail').hidden)return;window.scrollTo(0,context.scrollY||0);$('back').focus({preventScroll:true})});
  }
  function achievementLinks(keys,title){
    const rows=(keys||[]).map(key=>achievementByKey.get(key)).filter(Boolean);if(!rows.length)return '';
    return `<section class="detail-section achievement-links"><h2>${esc(title)} · ${rows.length}</h2><div class="components">${rows.map(e=>`<button class="component" data-key="${e.key}"><span class="component-achievement-art">${achievementArt(e)}</span><span>${esc(e.name)}<br><small>A${e.id} · ${esc(e.condition||e.description)}</small></span></button>`).join('')}</div></section>`;
  }
  function itemLinks(keys,title){
    const rows=(keys||[]).map(key=>byKey.get(key)).filter(Boolean);if(!rows.length)return '';
    return `<section class="detail-section"><h2>${esc(title)} · ${rows.length}</h2><div class="components">${rows.map(e=>`<button class="component" data-key="${e.key}">${art(e)}<span>${esc(e.name)}<br><small>${e.key} · ${labels[e.category]}</small></span></button>`).join('')}</div></section>`;
  }
  function dataNotes(issues){
    const notes=Array.isArray(issues)?issues.filter(note=>typeof note==='string'&&note.trim()):[];
    return notes.length?`<section class="detail-section data-notes"><h2>资料说明</h2><ul>${notes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul></section>`:'';
  }
  function wikiSections(e){
    const sections=e.wiki?.sections||[];if(!sections.length)return '';
    return `<section class="wiki-full"><div class="wiki-heading"><h2>Wiki 资料</h2><p>技巧、协同、轶事与版本说明，按原条目章节整理。长表格可左右滑动。</p></div><div class="wiki-controls"><button id="wiki-toggle-all" type="button" aria-expanded="false">展开全部</button></div><nav class="wiki-contents" aria-label="Wiki 章节">${sections.map((s,i)=>`<button data-wiki-section="${i}">${esc(s.title)}</button>`).join('')}</nav>${sections.map((s,i)=>`<details class="wiki-section" data-section-index="${i}" id="wiki-section-${i}" ${settings.expandWikiByDefault||i===0?'open':''}><summary>${esc(s.title)}</summary><div class="wiki-content">${s.html}</div></details>`).join('')}</section>`;
  }
  function syncWikiToggle(){
    const button=$('wiki-toggle-all');if(!button)return;
    const sections=[...$('detail').querySelectorAll('.wiki-section')],expanded=sections.length>0&&sections.every(section=>section.open);
    button.textContent=expanded?'收起全部':'展开全部';button.setAttribute('aria-expanded',expanded);
  }
  function renderAchievementDetail(e,route){
    if(route.external)pendingAchievementKey=e.key;
    $('mine-header').hidden=true;$('settings').hidden=true;$('catalog').hidden=true;$('about').hidden=true;$('quiz').hidden=true;$('achievements').hidden=true;$('detail').hidden=false;
    const rich=(field)=>e[field+'Html']||`<p>${esc(e[field])}</p>`;
    $('detail').innerHTML=`<div class="detail-toolbar"><button class="back-button" id="back">← 返回</button><button class="back-button" id="achievement-locate">定位到成就</button></div><section class="detail-hero achievement-hero"><span class="item-id">成就 · ID ${e.id}</span>${e.version?`<span class="achievement-version">${esc(e.version)}</span>`:''}<div class="achievement-hero-art">${achievementArt(e)}</div><h1>${esc(e.name)}</h1>${e.en?`<p class="english">${esc(e.en)}</p>`:''}</section>${e.condition?`<section class="detail-section"><h2>达成条件</h2><div class="wiki-content">${rich('condition')}</div></section>`:''}${e.reward?`<section class="detail-section"><h2>解锁奖励</h2><div class="wiki-content">${rich('reward')}</div></section>`:''}${e.description&&e.description!==e.condition?`<section class="detail-section"><h2>成就说明</h2><div class="wiki-content">${rich('description')}</div></section>`:''}${itemLinks(e.rewardKeys,'解锁的物品')}${itemLinks(e.relatedKeys,'达成条件涉及的物品')}<div class="source-box">离线成就资料 · ${esc(data.achievementSnapshotDate||data.wikiSnapshotDate||data.snapshotDate)}<br>来源：以撒的结合中文维基（灰机wiki）<a class="source-link" href="${esc(e.source)}">在 Wiki 查看成就来源 ↗</a></div>`;
    $('detail').querySelector('.source-box').insertAdjacentHTML('beforebegin',dataNotes(e.issues));
    $('achievement-locate').onclick=()=>locateAchievement(e.key);finishDetail(route.context);
  }
  function renderDetail(key){
    positionTicket++;restoringPosition=false;
    key=key.toUpperCase();
    if(achievementByKey.has(key)){const route=startDetail(key);renderAchievementDetail(achievementByKey.get(key),route);return}
    const e=byKey.get(key);if(!e){history.replaceState(null,'',location.pathname+location.search);closeDetail();return;}
    const route=startDetail(key);
    if(route.external){pendingReturnKey=key;pendingAchievementKey=null}
    if(pendingReturnKey){
      const located=IsaacCatalog.locate(data.entries,state.view==='catalog'?state:(viewStates.catalog||{...restored,view:'catalog',query:''}),pendingReturnKey);
      positions[located.category]={key:located.anchorKey,offset:0};saveCatalog({...located,view:'catalog'});
    }else if(state.view==='catalog'&&(state.category==='all'||state.category===e.category)){
      positions[state.category]={key,offset:0};saveCatalog();
    }
    recent=[key,...recent.filter(k=>k!==key)].slice(0,60);persist('isaac.recent.v1',recent);
    $('mine-header').hidden=true;$('settings').hidden=true;$('catalog').hidden=true;$('about').hidden=true;$('quiz').hidden=true;$('achievements').hidden=true;$('detail').hidden=false;
    const saved=favorites.includes(key);
    const relatedSets=data.entries.filter(s=>s.category==='set'&&s.components.some(c=>c.key===key));
    $('detail').innerHTML=`<div class="detail-toolbar"><button class="back-button" id="back">← 返回</button><button class="save-button ${saved?'saved':''}" id="save" aria-pressed="${saved}">${saved?'♥ 已收藏':'♡ 收藏'}</button></div><section class="detail-hero"><span class="item-id">${e.id===null?'套装':labels[e.category]+' · ID '+e.id}</span>${quality(e)}<div class="card-art">${art(e)}</div><h1>${esc(e.name)}</h1><p class="english">${esc(e.en)}</p>${e.quote?`<p class="quote">“${esc(e.quote)}”</p>`:''}</section><section class="detail-section"><h2>效果${e.category==='set'?'':'摘要'}</h2>${e.effects?'<ul>'+e.effects.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>':`<p>${esc(e.effect)}</p>`}</section>${e.condition?`<section class="detail-section"><h2>获得条件</h2><p>${esc(e.condition)}</p></section>`:''}${e.components?.length?`<section class="detail-section"><h2>相关组件 · ${e.components.length}</h2><div class="components">${e.components.map(c=>{const item=byKey.get(c.key);return item?`<button class="component" data-key="${c.key}">${art(item)}<span>${esc(c.name)}<br><small>${c.key} · 查看详情</small></span></button>`:`<a class="component" href="${esc(c.source)}"><span>${esc(c.name)}<br><small>${c.key} · Wiki 详情 ↗</small></span></a>`}).join('')}</div></section>`:''}${relatedSets.length?`<section class="detail-section"><h2>相关套装</h2><div class="components">${relatedSets.map(s=>`<button class="component" data-key="${s.key}">${art(s)}<span>${esc(s.name)}<br><small>${esc(s.quote)}</small></span></button>`).join('')}</div></section>`:''}${e.tags.length?`<section class="detail-section"><h2>道具标签</h2><div class="tags">${e.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></section>`:''}<div class="source-box">忏悔+ · 离线资料 · ${data.snapshotDate}<br>来源：以撒的结合中文维基（灰机wiki）<a class="source-link" href="${esc(e.source)}">在 Wiki 查看完整条目 ↗</a></div>`;
    $('save').onclick=()=>{const index=favorites.indexOf(key);if(index>=0)favorites.splice(index,1);else favorites.push(key);persist('isaac.favorites.v1',favorites);const now=favorites.includes(key);$('save').classList.toggle('saved',now);$('save').setAttribute('aria-pressed',now);$('save').textContent=now?'♥ 已收藏':'♡ 收藏';toast(now?'已加入收藏':'已取消收藏')};
    $('detail').querySelector('.source-box').insertAdjacentHTML('beforebegin',achievementLinks(e.unlockAchievements,'解锁此物品的成就')+achievementLinks(e.relatedAchievements,'与此物品相关的成就')+dataNotes(e.wiki?.issues)+wikiSections(e));
    const wikiDate=e.wiki?.date||data.wikiSnapshotDate;
    if(wikiDate)$('detail').querySelector('.source-box').insertAdjacentHTML('afterbegin',`完整条目快照：${esc(wikiDate)}<br>`);
    const locateButton=document.createElement('button');locateButton.className='back-button';locateButton.id='detail-locate';locateButton.textContent='定位到列表';locateButton.onclick=()=>locateInCatalog(key);
    $('back').after(locateButton);
    finishDetail(route.context);
  }
  function closeDetail(){
    saveDetailContext();currentDetailId=null;
    if(pendingReturnKey){const key=pendingReturnKey;pendingReturnKey=null;locateInCatalog(key);return}
    if(pendingAchievementKey){const key=pendingAchievementKey;pendingAchievementKey=null;locateAchievement(key);return}
    showView();requestAnimationFrame(()=>{window.scrollTo(0,scrollBeforeDetail);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else document.querySelector(`[data-key="${lastFocus?.dataset?.key}"]`)?.focus({preventScroll:true})});
  }
  function backFromDetail(){
    if(history.state?.isaacDirectDetail){history.replaceState(null,'',location.pathname+location.search);closeDetail()}
    else history.back();
  }
  function renderSettings(){
    $('settings').innerHTML=`<section class="settings-card"><h2>Wiki 资料</h2><label class="setting-option" for="expand-wiki-default"><span><strong>默认展开全部资料</strong><small>每次打开道具详情时，展开所有 Wiki 章节。设置会保存在本机。</small></span><input id="expand-wiki-default" type="checkbox" ${settings.expandWikiByDefault?'checked':''}></label></section>`;
  }
  function renderAbout(){
    $('about').innerHTML=`<p class="eyebrow">THE POCKET OF ISAAC</p><h2 class="about-title">你的地下室随身手册</h2><p>以撒口袋图鉴 ${esc(window.ISAAC_APP_VERSION || '0.6.1')} · 忏悔+<br>物品资料、Wiki 章节与成就信息随安装包保存。搜索、浏览、收藏和道具与成就互查都可以离线使用。</p><div class="data-counts">${['active','passive','card','set','trinket'].map(c=>`<div><strong>${data.counts[c]}</strong><span>${labels[c]}</span></div>`).join('')}</div><p>另有 ${achievements.length} 项离线成就，可按 A 编号、名称、条件和奖励查询。</p><section class="about-card"><h2>快速查询</h2><p>支持中文、英文、编号和效果关键词。输入 <b>118</b> 或 <b>C118</b> 查道具，<b>T1</b> 查饰品，<b>K1</b> 查卡牌。选择“全部”可以跨分类搜索。卡牌分类包含符文和魂石。</p><p>物品页保留效果摘要，并加入 Wiki 的详细资料、技巧、协同与轶事等章节；章节目录可直接展开并定位。“解锁此物品的成就”与成就页的奖励互相链接。套装没有在本应用中假定游戏编号。</p></section><section class="about-card"><h2>资料来源与许可</h2><p>图鉴摘要快照：${data.snapshotDate}；Wiki 章节快照：${esc(data.wikiSnapshotDate||data.snapshotDate)}；成就快照：${esc(data.achievementSnapshotDate||data.snapshotDate)}。物品采用 Wiki 的“忏悔+”筛选结果；完整章节保留原文的版本与历史说明，请结合其中的版本标记阅读。</p><p>内容来自<a href="https://isaac.huijiwiki.com/wiki/%E9%81%93%E5%85%B7">以撒的结合中文维基</a>，感谢全体贡献者与灰机wiki。原创内容按 <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh">CC BY-NC-SA 3.0</a> 分享；原站注明的翻译内容按 <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.zh">CC BY-SA 3.0</a> 分享。整理后的对应资料沿用原许可。游戏名称及图像素材归原权利人所有。</p><p>本应用为非官方、非商业参考工具，不代表 Wiki 或游戏官方。资料快照可能落后于后续游戏更新，具体以游戏及来源页面为准。</p></section><section class="about-card"><h2>制作</h2><p>Applespriter · 以撒口袋图鉴</p></section><section class="about-card"><h2>数据就在你的手机里</h2><p>收藏与最近查看记录仅存储在本机，没有账号或云端同步。卸载或清除应用数据会移除这些记录。外部来源链接需要网络，并在系统浏览器中打开。</p></section>`;
  }
  function refreshFilters(){
    const key=positions[state.category]?.key;
    const results=resultsFor();state.page=IsaacCatalog.pageForKey(results,key);highlightedKey=null;
    renderList();
    const first=IsaacCatalog.page(results,state.page).items[0];
    const target=results.some(e=>e.key===key)?key:first?.key;
    if(target&&!state.query&&state.view==='catalog')positions[state.category]={key:target,offset:0};
    saveCatalog();if(target)scrollToKey(target);
  }
  $('search').addEventListener('input',e=>updateQuery(e.target.value));
  $('clear-search').onclick=()=>{$('search').blur();updateQuery('')};
  $('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;rememberPosition();state.category=b.dataset.category;state.quality='';lastSearchKey=null;refreshFilters()};
  $('quality').onchange=e=>{rememberPosition();state.quality=e.target.value;refreshFilters()};
  $('sort').onchange=e=>{rememberPosition();state.sort=e.target.value;refreshFilters()};
  $('prev-page').onclick=()=>goPage(state.page-1);
  $('next-page').onclick=()=>goPage(state.page+1);
  $('page-number').onchange=e=>goPage(Number(e.target.value)-1);
  $('overview-open').onclick=()=>{rememberPosition();overview.open(state.category,positions[state.category]?.key)};
  $('achievement-search').addEventListener('input',e=>{achievementState.query=e.target.value;achievementState.page=0;renderAchievements()});
  $('achievement-clear').onclick=()=>{achievementState.query='';achievementState.page=0;renderAchievements();$('achievement-search').focus()};
  $('achievement-prev').onclick=()=>achievementPage(achievementState.page-1);
  $('achievement-next').onclick=()=>achievementPage(achievementState.page+1);
  $('achievement-page').onchange=e=>achievementPage(Number(e.target.value)-1);
  $('bottom-nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)};
  $('mine-tabs').onclick=e=>{const b=e.target.closest('[data-mine-view]');if(b)setView(b.dataset.mineView)};
  $('mine-tabs').onkeydown=e=>{const tabs=[...$('mine-tabs').querySelectorAll('[data-mine-view]')],index=tabs.indexOf(e.target);if(index<0)return;let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;else if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();setView(tabs[next].dataset.mineView);tabs[next].focus()};
  $('settings').onchange=e=>{if(e.target.id==='expand-wiki-default'){settings.expandWikiByDefault=e.target.checked;persist('isaac.settings.v1',settings)}};
  $('detail').addEventListener('toggle',e=>{if(e.target.matches('.wiki-section'))syncWikiToggle()},true);
  $('quiz').onclick=e=>{const choice=e.target.closest('[data-choice]');if(choice)answerQuiz(choice.dataset.choice);if(e.target.closest('#quiz-next')){newQuizQuestion();renderQuiz()}};
  document.querySelector('.brand-title').onclick=e=>{e.preventDefault();setView('catalog')};
  document.addEventListener('click',e=>{
    if(e.target.closest('#wiki-toggle-all')){const sections=[...$('detail').querySelectorAll('.wiki-section')],expand=!sections.every(section=>section.open);sections.forEach(section=>section.open=expand);syncWikiToggle();return}
    const chapter=e.target.closest('[data-wiki-section]');if(chapter){const section=$('wiki-section-'+chapter.dataset.wikiSection);if(section){section.open=true;syncWikiToggle();section.scrollIntoView({block:'start'})}return}
    const link=e.target.closest('a[href^="#"]');if(link){const key=link.getAttribute('href').slice(1).toUpperCase();if(byKey.has(key)||achievementByKey.has(key)){e.preventDefault();openDetail(key);return}}
    const locate=e.target.closest('[data-locate-key]');if(locate&&!$('overview-dialog').contains(locate)){locateInCatalog(locate.dataset.locateKey);return}
    const b=e.target.closest('[data-key]');if(b)openDetail(b.dataset.key);
    if(e.target.closest('#achievement-reset')){achievementState.query='';achievementState.page=0;renderAchievements()}
    if(e.target.closest('#reset-filters')){if(state.view!=='catalog'&&(state.view==='favorites'?favorites:recent).length===0)setView('catalog');else{state.category='all';state.query='';state.quality='';state.page=0;highlightedKey=null;lastSearchKey=null;renderList();saveCatalog()}}
  });
  window.addEventListener('hashchange',()=>location.hash?renderDetail(location.hash.slice(1)):closeDetail());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&location.hash&&!overview.isOpen())backFromDetail()});
  // Both mobile containers call this function to consume Back within the app.
  window.handleAppBack=()=>{if(overview.isOpen()){overview.close();return true}if(location.hash){backFromDetail();return true}if(state.view!=='catalog'){setView('catalog');return true}return false};
  window.handleAndroidBack=window.handleAppBack;
  window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(rememberPosition,180)},{passive:true});
  window.addEventListener('pagehide',rememberPosition);
  const initialPosition=positions[state.category];state.page=IsaacCatalog.pageForKey(resultsFor(),initialPosition?.key);
  viewStates.catalog={...state};showView();saveCatalog();
  if(location.hash){history.replaceState({isaacDirectDetail:true},'',location.href);renderDetail(location.hash.slice(1))}else if(initialPosition)scrollToKey(initialPosition.key,initialPosition.offset);
})();
