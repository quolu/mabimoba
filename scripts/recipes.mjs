// 製作・加工の一覧（content/recipes.json）の検査、ページ、元の材料の計算。
// ページを作る build.mjs と、Discordボットの両方から読む。

export function checkRecipes(r, sourceIds) {
 const bad = why => { throw new Error(`RECIPES_INVALID: ${why}`); };
 if (r?.schemaVersion !== 1) bad('schemaVersion');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedAt) || !r.lead || !r.points?.length || !r.legend) bad('見出しの内容が不足');
 const ids = list => { const s = new Set(list.map(x => x.id)); if (s.size !== list.length) bad('IDが重複'); return s; };
 const stations = ids(r.stations), sections = ids(r.sections), items = ids(r.items);
 ids(r.recipes);
 for (const s of r.sections) if (!s.ja || !sourceIds.has(s.source)) bad(`分類 ${s.id}`);
 for (const id of r.jpSources ?? []) if (!sourceIds.has(id)) bad(`出典 ${id}`);
 for (const i of r.items) if (!i.ko || !i.ja || typeof i.jaConfirmed !== 'boolean') bad(`品物 ${i.id}`);
 const made = new Set(r.recipes.map(x => x.item));
 for (const i of r.items) if (i.craftable !== made.has(i.id)) bad(`craftable ${i.ko}`);
 for (const x of r.recipes) {
  if (!sections.has(x.section) || !stations.has(x.station) || !items.has(x.item)) bad(`作り方 ${x.id}`);
  if (!Number.isInteger(x.yield) || x.yield < 1 || !x.materials.length) bad(`作り方 ${x.id} の個数`);
  for (const m of x.materials) if (!items.has(m.item) || !(m.qty === null || (Number.isInteger(m.qty) && m.qty > 0))) bad(`作り方 ${x.id} の材料`);
 }
}

const indexOf = r => {
 const items = new Map(r.items.map(i => [i.id, i]));
 const byItem = new Map();
 for (const x of r.recipes) { if (!byItem.has(x.item)) byItem.set(x.item, []); byItem.get(x.item).push(x); }
 return { items, byItem, stations: new Map(r.stations.map(s => [s.id, s])), sections: new Map(r.sections.map(s => [s.id, s])) };
};

export const recipeHref = x => `/recipes/${x.section}/#${x.id}`;

export function duration(seconds) {
 if (seconds < 60) return `${seconds}秒`;
 const h = Math.floor(seconds / 3600), m = Math.round((seconds % 3600) / 60);
 return (h ? `${h}時間` : '') + (m ? `${m}分` : '');
}

// 品物を count 個そろえる時に、作り方が載っていない材料（元の材料）まで辿る。
// 途中の品物は、1回の製作でできる個数で割って、回数を切り上げる。作り方が2つある品物は、最初の作り方を使う。
export function baseMaterials(r, itemId, count = 1) {
 const { items, byItem } = indexOf(r);
 const base = new Map(), steps = [], unknown = new Set();
 const walk = (id, need, path) => {
  const recipe = byItem.get(id)?.[0];
  if (!recipe || path.includes(id)) { base.set(id, (base.get(id) ?? 0) + need); return; }
  const times = Math.ceil(need / recipe.yield);
  steps.push({ item: id, recipe: recipe.id, times, makes: times * recipe.yield, depth: path.length });
  for (const m of recipe.materials) {
   if (m.qty === null) { unknown.add(m.item); continue; }
   walk(m.item, m.qty * times, [...path, id]);
  }
 };
 if (!items.has(itemId)) throw new Error(`RECIPE_ITEM_UNKNOWN: ${itemId}`);
 walk(itemId, count, []);
 return {
  item: items.get(itemId),
  count,
  base: [...base].map(([id, qty]) => ({ item: items.get(id), qty })).sort((a, b) => b.qty - a.qty),
  steps: steps.map(s => ({ ...s, item: items.get(s.item) })),
  unknown: [...unknown].map(id => items.get(id))
 };
}

export function recipeViews(r, h) {
 const { e, badge, icon, emblem, sourceList } = h;
 const { items, byItem, stations, sections } = indexOf(r);
 const nameTag = i => i.jaConfirmed ? '<span class="name-tag ok">日本版の名前</span>' : '<span class="name-tag">仮訳</span>';
 const cond = x => {
  const st = stations.get(x.station);
  return [st.ja + (x.stationLv ? ` Lv.${x.stationLv}` : ''), x.skill ? `${x.skill.ja} Lv.${x.skillLv}` : '', x.seconds ? duration(x.seconds) : ''].filter(Boolean);
 };
 const material = m => {
  const i = items.get(m.item), first = byItem.get(m.item)?.[0];
  const name = `${e(i.ja)}<small lang="ko">${e(i.ko)}</small>`;
  return `<li>${first ? `<a href="${recipeHref(first)}">${name}</a>` : `<span>${name}</span>`}<b>${m.qty === null ? '個数不明' : '×' + m.qty}</b></li>`;
 };
 const card = x => {
  const i = items.get(x.item);
  return `<article class="recipe-card" id="${x.id}"><h3>${e(i.ja)}${x.yield > 1 ? `<span class="recipe-yield">×${x.yield}</span>` : ''}</h3><p class="recipe-names"><span class="korean-name" lang="ko">${e(i.ko)}</span>${nameTag(i)}</p><p class="recipe-cond">${cond(x).map(c => `<span>${e(c)}</span>`).join('')}</p><ul class="recipe-mats">${x.materials.map(material).join('')}</ul>${x.jpChecked ? '<p class="recipe-checked">日本版の画面と同じ（材料と個数、レベル、時間）</p>' : ''}${x.notes ? `<p class="recipe-note">${x.notes.map(e).join('／')}</p>` : ''}</article>`;
 };
 const confirmed = r.items.filter(i => i.jaConfirmed).length;
 const crumbs = tail => `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/life/">生活・ものづくり</a> / ${tail}</div>`;
 const pages = [], index = [];
 const fixed = r.recipes.filter(x => x.notes);
 pages.push(['/recipes/', {
  title: '製作・加工の一覧', description: r.lead,
  body: `${crumbs('製作・加工の一覧')}<div class="article-layout single"><article class="article-body"><div class="article-head"><div>${badge('生活')} ${badge(r.region, 'amber')}<h1>製作・加工の一覧：作れる品物と、その材料</h1></div>${emblem('生活')}</div><p class="lead">${e(r.lead)}</p><div class="article-meta"><span>確認 ${r.checkedAt}</span><span>作り方 ${r.recipes.length}件</span><span>日本版の名前を確かめた品物 ${confirmed}件</span><span>日本版の画面と同じだった作り方 ${r.recipes.filter(x => x.jpChecked).length}件</span></div><div class="points-box"><h2>この一覧のポイント</h2><ul>${r.points.map(p => `<li>${icon('check')}<span>${e(p)}</span></li>`).join('')}</ul></div><h2 id="sections">分類から探す</h2><div class="recipe-sections">${r.sections.map(s => { const n = r.recipes.filter(x => x.section === s.id).length; return `<a class="recipe-section" href="/recipes/${s.id}/"><span class="recipe-kind">${s.kind === 'process' ? '加工' : '製作'}</span><strong>${e(s.ja)}</strong><small>${n}件 · <span lang="ko">${e(s.ko)}</span></small></a>`; }).join('')}</div><p class="section-note">${e(r.legend)}</p><h2 id="fixed">元の表から直して載せた所</h2><p>元の表に、誤記と見られる所と、書かれていない所があった。下の作り方は、直した内容か、欠けたままの内容で載せている。</p><ul class="recipe-fixed">${fixed.map(x => `<li><a href="${recipeHref(x)}">${e(items.get(x.item).ja)}</a>：${x.notes.map(e).join('／')}</li>`).join('')}</ul><h2 id="data">データ</h2><p>この一覧の中身は、<a href="/data/recipes.json">recipes.json</a> でも読める。品物ごとに、韓国語の元の名前、日本語の名前、日本版の名前を確かめたかどうか、材料と個数を持っている。</p><section id="sources" class="sources-section"><details><summary>出典と資料の基準日（${r.sections.length + (r.jpSources?.length ?? 0)}件）</summary><p class="section-note">作り方は韓国の掲示板のまとめによる。日本版の名前と、日本版の画面と同じだった作り方は、下の日本のプレイヤーの投稿の画像と、日本公式ゲームガイドで確かめた。</p>${sourceList([...(r.jpSources ?? []), ...r.sections.map(s => s.source)])}</details></section></article></div>`
 }]);
 for (const s of r.sections) {
  const rows = r.recipes.filter(x => x.section === s.id);
  const groups = [];
  for (const x of rows) {
   const key = x.group?.ko ?? '';
   let g = groups.find(g => g.key === key);
   if (!g) groups.push(g = { key, ja: x.group?.ja ?? '', rows: [] });
   g.rows.push(x);
  }
  const named = groups.length > 1;
  pages.push([`/recipes/${s.id}/`, {
   title: `${s.ja}の作り方と材料`, description: `${s.ja}で作れる品物${rows.length}件と、その材料。韓国版の資料による。`,
   body: `${crumbs(`<a href="/recipes/">製作・加工の一覧</a> / ${e(s.ja)}`)}<div class="article-layout single"><article class="article-body"><div class="article-head"><div>${badge(s.kind === 'process' ? '加工' : '製作')} ${badge(r.region, 'amber')}<h1>${e(s.ja)}の作り方と材料</h1></div>${emblem('生活')}</div><p class="lead">${e(s.ja)}で作れる品物${rows.length}件と、その材料。韓国版の資料による。日本版では、印の付いた名前だけを確かめている。</p><div class="article-meta"><span>確認 ${r.checkedAt}</span><span>作り方 ${rows.length}件</span><span lang="ko">${e(s.ko)}</span></div>${named ? `<div class="toolbar recipe-jump">${groups.map((g, i) => `<a class="filter-chip" href="#group-${i}">${e(g.ja)}</a>`).join('')}</div>` : ''}${groups.map((g, i) => `${named ? `<h2 id="group-${i}">${e(g.ja)}<small lang="ko">${e(g.key)}</small></h2>` : ''}<div class="recipe-grid">${g.rows.map(card).join('')}</div>`).join('')}<p class="section-note">${e(r.legend)}</p><section id="sources" class="sources-section"><details><summary>出典と資料の基準日（1件）</summary>${sourceList([s.source])}</details></section><p><a class="text-link" href="/recipes/">製作・加工の一覧へ戻る</a></p></article></div>`
  }]);
  for (const x of rows) {
   const i = items.get(x.item), mats = x.materials.map(m => items.get(m.item));
   index.push({ kind: '製作・加工', title: `${i.ja} / ${i.ko}`, description: `${cond(x).join(' · ')} · 材料：${x.materials.map(m => items.get(m.item).ja + (m.qty === null ? '' : '×' + m.qty)).join('、')}`, url: recipeHref(x), text: [i.ja, i.ko, s.ja, x.group?.ja ?? '', ...mats.flatMap(m => [m.ja, m.ko])].join(' ') });
  }
 }
 return { pages, index, total: r.recipes.length, confirmed };
}
