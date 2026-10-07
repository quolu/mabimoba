const menuButton = document.querySelector('.menu-button');
menuButton?.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')==='true';menuButton.setAttribute('aria-expanded',String(!open));document.body.classList.toggle('menu-open',!open)});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('menu-open');menuButton?.setAttribute('aria-expanded','false')}if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();location.href='/search/'}});
for(const bar of document.querySelectorAll('[data-filter-target]')) {
 const rows=[...document.querySelector('#'+bar.dataset.filterTarget).children];
 bar.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;for(const b of bar.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));for(const row of rows)row.hidden=button.dataset.filter!=='すべて'&&row.dataset.category!==button.dataset.filter;});
}
const checkboxes=[...document.querySelectorAll('[data-task]')];
if(checkboxes.length) {
 const progress=document.querySelector('[role=progressbar]');
 const update=()=>{const count=checkboxes.filter(c=>c.checked).length;progress.setAttribute('aria-valuenow',String(count));progress.firstElementChild.style.width=(count/checkboxes.length*100)+'%';document.querySelector('#progress-text').textContent=count+' / '+checkboxes.length+' 完了';};
 const storageError=()=>{const el=document.querySelector('#storage-error');el.hidden=false;el.textContent='このブラウザではチェックを保存できません。現在の画面ではチェックできます。';};
 try {const saved=JSON.parse(localStorage.getItem('mabimoba-roadmap')??'[]');if(!Array.isArray(saved))throw new Error('保存されたチェックの形式が不正です');for(const c of checkboxes)c.checked=saved.includes(c.dataset.task);}catch(error){storageError();}
 update();
 const save=()=>{update();try{localStorage.setItem('mabimoba-roadmap',JSON.stringify(checkboxes.filter(c=>c.checked).map(c=>c.dataset.task)))}catch(error){storageError()}};
 for(const c of checkboxes)c.addEventListener('change',save);
 document.querySelector('.reset-button').addEventListener('click',()=>{for(const c of checkboxes)c.checked=false;save()});
}
const search=document.querySelector('#site-search');
if(search) {
 const normalize=value=>value.normalize('NFKC').toLocaleLowerCase('ja');
 const params=new URLSearchParams(location.search);search.value=params.get('q')??'';
 const results=document.querySelector('#search-results'),count=document.querySelector('#search-count');
 let index;
 const render=()=>{
  const query=search.value.trim();const terms=normalize(query).split(/\s+/).filter(Boolean);
  const found=terms.length?index.filter(r=>terms.every(t=>normalize(r.text+' '+r.kind).includes(t))):[];
  count.textContent=query?`「${query}」の検索結果：${found.length}件`:'検索語を入力してください。';
  results.replaceChildren();
  if(query&&!found.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='該当する情報は見つかりませんでした。別の用語や、短いキーワードで探してください。';results.append(empty);}
  for(const r of found){const a=document.createElement('a');a.className='search-result';a.href=r.url;const tag=document.createElement('span');tag.className='badge';tag.textContent=r.kind;const h=document.createElement('h2');h.textContent=r.title;const p=document.createElement('p');p.textContent=r.description;a.append(tag,h,p);results.append(a);}
  const url=new URL(location);if(query)url.searchParams.set('q',query);else url.searchParams.delete('q');history.replaceState(null,'',url);
 };
 fetch('/search-index.json').then(r=>{if(!r.ok)throw new Error('検索データHTTP '+r.status);return r.json()}).then(data=>{index=data;render();search.addEventListener('input',render);document.querySelector('.search-form').addEventListener('submit',e=>{e.preventDefault();render()})}).catch(error=>{count.textContent='検索データを読み込めませんでした。ページを再読み込みしてください。';count.setAttribute('role','alert');console.error(error)});
}
const navigation=document.querySelector('#navigation');
const mobile=matchMedia('(max-width:760px)');
const syncNavigation=()=>{navigation.inert=mobile.matches&&!document.body.classList.contains('menu-open');};
const closeMenu=()=>{document.body.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');syncNavigation();menuButton.focus()};
menuButton.addEventListener('click',()=>{syncNavigation();if(document.body.classList.contains('menu-open'))navigation.querySelector('a').focus()});
document.querySelector('.nav-close').addEventListener('click',closeMenu);
document.addEventListener('pointerdown',event=>{if(document.body.classList.contains('menu-open')&&!navigation.contains(event.target)&&!menuButton.contains(event.target))closeMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){syncNavigation();if(mobile.matches)menuButton.focus()}if(event.key==='Tab'&&mobile.matches&&document.body.classList.contains('menu-open')){const focusable=[...navigation.querySelectorAll('a,button')];const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
mobile.addEventListener('change',syncNavigation);syncNavigation();
