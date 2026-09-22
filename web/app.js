/* All UI and data are bundled. No network requests are made by this app. */
(() => {
  'use strict';
  const data = window.ISAAC_DATA;
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {all:'全部',active:'主动道具',passive:'被动道具',card:'卡牌',set:'套装',trinket:'饰品'};
  const byKey = new Map(data.entries.map(e=>[e.key,e]));
  const read = key => {try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(k=>byKey.has(k)):[]}catch{return []}};
  let favorites = read('isaac.favorites.v1'), recent = read('isaac.recent.v1');
  let state = {category:'passive',query:'',quality:'',sort:'id',view:'catalog',limit:48}, scrollBeforeDetail=0, lastFocus=null;
  let quiz = {pool:[], question:null, choices:[], answered:false, score:0, total:0};
  let toastTimer;
  const toast = message => { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2000); };
  function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{toast('本地存储不可用，本次操作仅在当前会话保留')}}
  function art(e) {
    if(e.image)return `<img class="set-art" src="${esc(e.image)}" alt="${esc(e.name)}" loading="lazy">`;
    if(e.icon)return `<i aria-hidden="true" class="sprite" style="background-image:url(${esc(e.icon.file)});background-position:${esc(e.icon.position)}"></i>`;
    return '<i aria-hidden="true" class="sprite" style="background-image:url(assets/collectibles.png);background-position:-384px -480px"></i>';
  }
  const quality = e => e.quality===null?'':`<span class="quality q${e.quality}">✦ ${e.quality}</span>`;
  function categories(){
    $('categories').innerHTML=Object.entries(labels).map(([key,label])=>`<button data-category="${key}" class="${state.category===key?'active':''}" aria-pressed="${state.category===key}">${label}<small>${key==='all'?data.entries.length:data.counts[key]}</small></button>`).join('');
  }
  function renderList(){
    categories();
    const keys=state.view==='favorites'?favorites:state.view==='recent'?recent:null;
    const results=IsaacSearch.search(data.entries,{...state,keys});
    if(state.view==='recent')results.sort((a,b)=>recent.indexOf(a.key)-recent.indexOf(b.key));
    $('quality').hidden=!['active','passive','all'].includes(state.category);
    $('sort').hidden=state.view==='recent';
    $('list-title').textContent=state.view==='favorites'?'我的收藏':state.view==='recent'?'最近查看':state.category==='all'?'全部图鉴':labels[state.category];
    $('result-count').textContent=`${results.length} 项`;
    $('clear-search').hidden=!state.query;
    $('list').innerHTML=results.slice(0,state.limit).map(e=>`<article class="item-card"><button class="card-open" data-key="${e.key}" aria-label="${esc(e.name)} ${e.id===null?'套装':e.key} 查看详情"><div class="card-top"><span class="item-id">${e.id===null?'TRANSFORMATION':(e.category==='active'||e.category==='passive'?'C':e.key[0])+' · '+String(e.id).padStart(3,'0')}</span>${quality(e)}</div><div class="card-art">${art(e)}</div><span class="card-name">${esc(e.name)}</span><span class="card-en">${esc(e.en)}</span><p class="card-effect">${esc(e.effect)}</p></button>${favorites.includes(e.key)?'<span class="saved-mark" aria-label="已收藏">♥</span>':''}</article>`).join('');
    if(!results.length){
      const isEmptyCollection=keys&&keys.length===0;
      $('list').innerHTML=`<div class="empty"><span aria-hidden="true">${state.view==='favorites'?'♡':'⌕'}</span><h3>${isEmptyCollection?(state.view==='favorites'?'把喜欢的宝物放进口袋':'还没有查看记录'):'没有找到这件宝物'}</h3><p>${isEmptyCollection?'打开任意条目，开始探索你的图鉴。':'试试中文名、英文名、编号（如 C118）或效果关键词。'}</p><button id="reset-filters">${isEmptyCollection?'浏览图鉴':'清空筛选，查看全部'}</button></div>`;
    }
    $('load-more').hidden=results.length<=state.limit;
    $('load-more').textContent=`继续查看 · 还有 ${Math.max(0,results.length-state.limit)} 项`;
    $('list-note').textContent=state.query?'搜索当前分类 · 选择“全部”可跨分类查询':'资料已装进口袋，离线也能查阅。';
  }
  function setView(view){
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
    state.view=view;state.category=view==='catalog'?'passive':'all';state.query='';state.quality='';state.limit=48;
    $('search').value='';$('quality').value='';
    if(view==='quiz' && !quiz.question) newQuizQuestion();
    showView();window.scrollTo(0,0);
  }
  function showView(){
    $('catalog').hidden=!['catalog','favorites','recent'].includes(state.view);$('about').hidden=state.view!=='about';$('quiz').hidden=state.view!=='quiz';$('detail').hidden=true;
    document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false')});
    if(state.view==='about')renderAbout();else if(state.view==='quiz')renderQuiz();else renderList();
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
    if(!byKey.has(key))return;
    if(!location.hash){scrollBeforeDetail=window.scrollY;lastFocus=document.activeElement;}
    location.hash=key;
  }
  function renderDetail(key){
    const e=byKey.get(key);if(!e){closeDetail();return;}
    recent=[key,...recent.filter(k=>k!==key)].slice(0,60);persist('isaac.recent.v1',recent);
    $('catalog').hidden=true;$('about').hidden=true;$('quiz').hidden=true;$('detail').hidden=false;
    const saved=favorites.includes(key);
    const relatedSets=data.entries.filter(s=>s.category==='set'&&s.components.some(c=>c.key===key));
    $('detail').innerHTML=`<div class="detail-toolbar"><button class="back-button" id="back">← 返回</button><button class="save-button ${saved?'saved':''}" id="save" aria-pressed="${saved}">${saved?'♥ 已收藏':'♡ 收藏'}</button></div><section class="detail-hero"><span class="item-id">${e.id===null?'套装':labels[e.category]+' · ID '+e.id}</span>${quality(e)}<div class="card-art">${art(e)}</div><h1>${esc(e.name)}</h1><p class="english">${esc(e.en)}</p>${e.quote?`<p class="quote">“${esc(e.quote)}”</p>`:''}</section><section class="detail-section"><h2>效果${e.category==='set'?'':'摘要'}</h2>${e.effects?'<ul>'+e.effects.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul>':`<p>${esc(e.effect)}</p>`}</section>${e.condition?`<section class="detail-section"><h2>获得条件</h2><p>${esc(e.condition)}</p></section>`:''}${e.components?.length?`<section class="detail-section"><h2>相关组件 · ${e.components.length}</h2><div class="components">${e.components.map(c=>{const item=byKey.get(c.key);return item?`<button class="component" data-key="${c.key}">${art(item)}<span>${esc(c.name)}<br><small>${c.key} · 查看详情</small></span></button>`:`<a class="component" href="${esc(c.source)}"><span>${esc(c.name)}<br><small>${c.key} · Wiki 详情 ↗</small></span></a>`}).join('')}</div></section>`:''}${relatedSets.length?`<section class="detail-section"><h2>相关套装</h2><div class="components">${relatedSets.map(s=>`<button class="component" data-key="${s.key}">${art(s)}<span>${esc(s.name)}<br><small>${esc(s.quote)}</small></span></button>`).join('')}</div></section>`:''}${e.tags.length?`<section class="detail-section"><h2>道具标签</h2><div class="tags">${e.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></section>`:''}<div class="source-box">忏悔+ · 离线资料 · ${data.snapshotDate}<br>来源：以撒的结合中文维基（灰机wiki）<a class="source-link" href="${esc(e.source)}">在 Wiki 查看完整条目 ↗</a></div>`;
    $('save').onclick=()=>{const index=favorites.indexOf(key);if(index>=0)favorites.splice(index,1);else favorites.push(key);persist('isaac.favorites.v1',favorites);const now=favorites.includes(key);$('save').classList.toggle('saved',now);$('save').setAttribute('aria-pressed',now);$('save').textContent=now?'♥ 已收藏':'♡ 收藏';toast(now?'已加入收藏':'已取消收藏')};
    $('back').onclick=()=>history.back();
    window.scrollTo(0,0);$('back').focus({preventScroll:true});
  }
  function closeDetail(){showView();window.scrollTo(0,scrollBeforeDetail);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});else document.querySelector(`[data-key="${lastFocus?.dataset?.key}"]`)?.focus({preventScroll:true});}
  function renderAbout(){
    $('about').innerHTML=`<p class="eyebrow">THE POCKET OF ISAAC</p><h1>你的地下室随身手册</h1><p>以撒口袋图鉴 0.4.1 · 忏悔+<br>所有图鉴文字和图片均随安装包保存。搜索、浏览、收藏都可以离线使用。</p><div class="data-counts">${['active','passive','card','set','trinket'].map(c=>`<div><strong>${data.counts[c]}</strong><span>${labels[c]}</span></div>`).join('')}</div><section class="about-card"><h2>快速查询</h2><p>支持中文、英文、编号和效果关键词。输入 <b>118</b> 或 <b>C118</b> 查道具，<b>T1</b> 查饰品，<b>K1</b> 查卡牌。选择“全部”可以跨分类搜索。卡牌分类包含符文和魂石。</p><p>物品页提供游戏内介绍与效果摘要；更完整的协同、解锁和版本细节可通过来源链接查看。套装没有在本应用中假定游戏编号。</p></section><section class="about-card"><h2>资料来源与许可</h2><p>快照日期：${data.snapshotDate}。物品采用 Wiki 的“忏悔+”筛选结果；套装按当前版本效果整理。资料经字段提取、格式整理和版本差异筛选。</p><p>内容来自<a href="https://isaac.huijiwiki.com/wiki/%E9%81%93%E5%85%B7">以撒的结合中文维基</a>，感谢全体贡献者与灰机wiki。原创内容按 <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh">CC BY-NC-SA 3.0</a> 分享；原站注明的翻译内容按 <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.zh">CC BY-SA 3.0</a> 分享。整理后的对应资料沿用原许可。游戏名称及图像素材归原权利人所有。</p><p>本应用为非官方、非商业参考工具，不代表 Wiki 或游戏官方。资料快照可能落后于后续游戏更新，具体以游戏及来源页面为准。</p></section><section class="about-card"><h2>数据就在你的手机里</h2><p>收藏与最近查看记录仅存储在本机，没有账号或云端同步。卸载或清除应用数据会移除这些记录。外部来源链接需要网络，并在系统浏览器中打开。</p></section>`;
  }
  $('search').addEventListener('input',e=>{state.query=e.target.value;state.limit=48;renderList()});
  $('clear-search').onclick=()=>{$('search').value='';state.query='';state.limit=48;renderList();$('search').focus()};
  $('categories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;state.category=b.dataset.category;state.quality='';$('quality').value='';state.limit=48;renderList()};
  $('quality').onchange=e=>{state.quality=e.target.value;state.limit=48;renderList()};
  $('sort').onchange=e=>{state.sort=e.target.value;renderList()};
  $('load-more').onclick=()=>{state.limit+=48;renderList()};
  $('bottom-nav').onclick=e=>{const b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)};
  $('quiz').onclick=e=>{const choice=e.target.closest('[data-choice]');if(choice)answerQuiz(choice.dataset.choice);if(e.target.closest('#quiz-next')){newQuizQuestion();renderQuiz()}};
  document.querySelector('.brand-title').onclick=e=>{e.preventDefault();setView('catalog')};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-key]');if(b)openDetail(b.dataset.key);if(e.target.closest('#reset-filters')){if(state.view!=='catalog'&&(state.view==='favorites'?favorites:recent).length===0)setView('catalog');else{state.category='all';state.query='';state.quality='';state.limit=48;$('search').value='';$('quality').value='';renderList()}}});
  window.addEventListener('hashchange',()=>location.hash?renderDetail(location.hash.slice(1)):closeDetail());
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&location.hash)history.back()});
  // Called only by the Android Activity; consumes Back inside a detail or secondary view.
  window.handleAndroidBack=()=>{if(location.hash){history.back();return true}if(state.view!=='catalog'){setView('catalog');return true}return false};
  showView();if(location.hash)renderDetail(location.hash.slice(1));
})();
