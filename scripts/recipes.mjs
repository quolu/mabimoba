import { itemIcon, itemSprite, itemKind } from './item-icons.mjs';
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
 // 品物と同じ材料を除いて、材料を辿ると元の品物へ戻る輪が無い事。段取りの計算は、輪が無い前提で辿る。
 const state = new Map();
 const walk = id => {
  if (state.get(id) === 'open') bad(`材料が輪になっている ${id}`);
  if (state.has(id)) return;
  state.set(id, 'open');
  for (const x of r.recipes) if (x.item === id) for (const m of x.materials) if (m.item !== id) walk(m.item);
  state.set(id, 'done');
 };
 for (const id of made) walk(id);
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

// 品物を count 個作る時の段取り。作り方が載っていない材料（元の材料）まで辿る。
// 決まりは docs/crafting-data.md。途中の品物は、要る数を全部の枝から合算してから、1回でできる個数で割って回数を切り上げる。
// have は持っている数（品物ID → 個数）。作る品物そのものには使わない。prefer は作り方が2つ以上ある品物で使う作り方（品物ID → 作り方ID）。
export function craftPlan(r, itemId, count = 1, { have = {}, prefer = {} } = {}) {
 const { items, byItem } = indexOf(r);
 if (!items.has(itemId)) throw new Error(`RECIPE_ITEM_UNKNOWN: ${itemId}`);
 if (!Number.isInteger(count) || count < 1) throw new Error(`RECIPE_COUNT_INVALID: ${count}`);
 const recipeOf = id => {
  const list = byItem.get(id);
  if (!list) return null;
  if (prefer[id] === undefined) return list[0];
  const chosen = list.find(x => x.id === prefer[id]);
  if (!chosen) throw new Error(`RECIPE_PREFER_UNKNOWN: ${prefer[id]}`);
  return chosen;
 };
 // 個数の無い材料と、品物と同じ材料は辿らない。
 const counted = x => x.materials.filter(m => m.qty !== null && m.item !== x.item);
 const order = [], seen = new Set();
 const visit = id => {
  if (seen.has(id)) return;
  seen.add(id);
  const x = recipeOf(id);
  if (x) for (const m of counted(x)) visit(m.item);
  order.push(id);
 };
 visit(itemId);
 const need = new Map([[itemId, count]]), rows = new Map();
 for (const id of order.toReversed()) {
  const n = need.get(id) ?? 0;
  if (!n) continue;
  const fromStock = id === itemId ? 0 : Math.min(Math.max(0, Math.floor(have[id] ?? 0)), n);
  const short = n - fromStock, x = recipeOf(id);
  if (!x) { rows.set(id, { kind: 'base', item: id, need: n, fromStock, gather: short }); continue; }
  if (!short) { rows.set(id, { kind: 'covered', item: id, need: n, fromStock }); continue; }
  const times = Math.ceil(short / x.yield), makes = times * x.yield;
  rows.set(id, { kind: 'step', item: id, recipe: x.id, need: n, fromStock, times, makes, surplus: makes - short, station: x.station, stationLv: x.stationLv, skill: x.skill, skillLv: x.skillLv, seconds: x.seconds, totalSeconds: x.seconds === null ? null : x.seconds * times });
  for (const m of counted(x)) need.set(m.item, (need.get(m.item) ?? 0) + m.qty * times);
 }
 const list = kind => order.filter(id => rows.get(id)?.kind === kind).map(id => { const { kind: _, ...row } = rows.get(id); return row; });
 const steps = list('step');
 return {
  item: itemId,
  count,
  steps,
  base: list('base'),
  covered: list('covered'),
  unknown: steps.flatMap(s => r.recipes.find(x => x.id === s.recipe).materials.filter(m => m.qty === null || m.item === s.item).map(m => ({ recipe: s.recipe, item: m.item, why: m.qty === null ? 'qty' : 'self' }))),
  alternatives: steps.filter(s => byItem.get(s.item).length > 1).map(s => ({ item: s.item, used: s.recipe, recipes: byItem.get(s.item).map(x => x.id) }))
 };
}

// 「/材料」とサイトの計算の例で使う形。作る品物が先頭、元の材料は個数の多い順。
export function baseMaterials(r, itemId, count = 1) {
 const { items } = indexOf(r);
 const plan = craftPlan(r, itemId, count);
 return {
  item: items.get(itemId),
  count,
  base: plan.base.map(b => ({ item: items.get(b.item), qty: b.gather })).sort((a, b) => b.qty - a.qty),
  steps: plan.steps.toReversed().map(s => ({ item: items.get(s.item), recipe: s.recipe, times: s.times, makes: s.makes })),
  unknown: plan.unknown.map(u => ({ ...items.get(u.item), why: u.why }))
 };
}

export function recipeViews(r, h) {
 const { e, badge, icon, emblem, sourceList, discord, gatherable } = h;
 // 集める材料まで辿る計算は、Discordのボットで出す。ページには、その案内と計算の例を置く。
 const botBox = rows => {
  if (!discord) return '';
  const pick = rows.map(x => baseMaterials(r, x.item, 1)).find(b => b.steps.length > 1 && !b.unknown.length && b.base.length <= 8) ?? baseMaterials(r, rows[0].item, 1);
  return `<aside class="bot-box"><div><span class="eyebrow">DISCORD BOT</span><strong>集める材料を、まとめて計算</strong><p>このページに出しているのは、直接の材料まで。Discordのボットの <code>/材料</code> を使うと、途中の加工まで辿って、集める材料の合計が出ます。</p><p class="bot-box-example">例：${e(pick.item.ja)}を1個 → ${e(pick.base.map(b => `${b.item.ja}×${b.qty}`).join('、'))}</p></div><a class="button dark" href="/discord/">ボットの使い方と招待</a></aside>`;
 };
 const { items, byItem, stations, sections } = indexOf(r);
 const nameTag = i => i.jaConfirmed ? '<span class="name-tag ok">日本版の名前</span>' : '<span class="name-tag">仮訳</span>';
 const cond = x => {
  const st = stations.get(x.station);
  return [st.ja + (x.stationLv ? ` Lv.${x.stationLv}` : ''), x.skill ? `${x.skill.ja} Lv.${x.skillLv}` : '', x.seconds ? duration(x.seconds) : ''].filter(Boolean);
 };
 const material = m => {
  const i = items.get(m.item), first = byItem.get(m.item)?.[0];
  const name = `${itemIcon(i.ja, 's')}<span class="mat-name">${e(i.ja)}<small lang="ko">${e(i.ko)}</small></span>`;
  return `<li>${first ? `<a href="${recipeHref(first)}">${name}</a>` : `<span>${name}</span>`}<b>${m.qty === null ? '個数不明' : '×' + m.qty}</b></li>`;
 };
 const card = x => {
  const i = items.get(x.item);
  return `<article class="recipe-card" id="${x.id}"><div class="recipe-head">${itemIcon(i.ja, 'l')}<div><h3>${e(i.ja)}${x.yield > 1 ? `<span class="recipe-yield">×${x.yield}</span>` : ''}</h3><p class="recipe-names"><span class="korean-name" lang="ko">${e(i.ko)}</span>${nameTag(i)}</p></div></div><p class="recipe-cond">${cond(x).map(c => `<span>${e(c)}</span>`).join('')}</p><ul class="recipe-mats">${x.materials.map(material).join('')}</ul>${x.jpChecked ? '<p class="recipe-checked">日本版の画面と同じ（材料と個数、レベル、時間）</p>' : ''}</article>`;
 };
 const confirmed = r.items.filter(i => i.jaConfirmed).length;
 const crumbs = tail => `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/life/">生活・ものづくり</a> / ${tail}</div>`;
 const pages = [], index = [];
 const sprite = itemSprite(r.items.map(i => itemKind(i.ja)));
 pages.push(['/recipes/', {
  title: '製作・加工の一覧', description: r.lead,
  body: `${sprite}${crumbs('製作・加工の一覧')}<div class="article-layout single"><article class="article-body"><div class="article-head"><div>${badge('生活')} ${badge(r.region, 'amber')}<h1>製作・加工の一覧：作れる品物と、その材料</h1></div>${emblem('生活')}</div><p class="lead">${e(r.lead)}</p><div class="article-meta"><span>確認 ${r.checkedAt}</span><span>作り方 ${r.recipes.length}件</span><span>日本版の名前を確かめた品物 ${confirmed}件</span><span>日本版の画面と同じだった作り方 ${r.recipes.filter(x => x.jpChecked).length}件</span></div><figure class="page-banner"><img src="/assets/lantern-night.webp" alt="ランタンを手に夜の町を歩く冒険者たち。韓国公式イラスト" width="740" height="416" decoding="async"><figcaption>韓国公式イラスト（© NEXON Korea Corp. &amp; devCAT Corp.）</figcaption></figure><div class="points-box"><h2>この一覧のポイント</h2><ul>${r.points.map(p => `<li>${icon('check')}<span>${e(p)}</span></li>`).join('')}</ul></div>${botBox(r.recipes)}<h2 id="sections">分類から探す</h2><div class="recipe-sections">${r.sections.map(s => { const n = r.recipes.filter(x => x.section === s.id).length; return `<a class="recipe-section" href="/recipes/${s.id}/"><span class="recipe-kind">${s.kind === 'process' ? '加工' : '製作'}</span><span class="section-icons">${[...new Map(r.recipes.filter(x => x.section === s.id).map(x => items.get(x.item).ja).map(n => [itemKind(n), n])).values()].slice(0, 5).map(n => itemIcon(n, 's')).join('')}</span><strong>${e(s.ja)}</strong><small>${n}件 · <span lang="ko">${e(s.ko)}</span></small></a>`; }).join('')}</div><p class="section-note">${e(r.legend)}</p><h2 id="data">データ</h2><p>この一覧の中身は、<a href="/data/recipes.json">recipes.json</a> でも読める。品物ごとに、韓国語の元の名前、日本語の名前、日本版の名前を確かめたかどうか、材料と個数を持っている。</p><p>採集の行き先とつないだ <a href="/data/crafting.json">crafting.json</a> もある。元の材料が、どの採集スキルのどの行き先で採れるかを、確かめた度合いの印と一緒に持っている。行き先が分かっている元の材料は、${r.items.filter(i => !i.craftable).length}件のうち${gatherable}件。項目の説明と、元の材料まで辿る計算の決まりは<a href="https://github.com/quolu/mabimoba/blob/main/docs/crafting-data.md" target="_blank" rel="noopener noreferrer">データの説明</a>に書いた。</p><section id="sources" class="sources-section"><details><summary>出典と資料の基準日（${r.sections.length + (r.jpSources?.length ?? 0)}件）</summary><p class="section-note">作り方は韓国の掲示板のまとめによる。日本版の名前と、日本版の画面と同じだった作り方は、下の日本のプレイヤーの投稿の画像、日本公式ゲームガイド、日本版の実機の画面で確かめた。</p>${sourceList([...(r.jpSources ?? []), ...r.sections.map(s => s.source)])}</details></section></article></div>`
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
   body: `${sprite}${crumbs(`<a href="/recipes/">製作・加工の一覧</a> / ${e(s.ja)}`)}<div class="article-layout single"><article class="article-body"><div class="article-head"><div>${badge(s.kind === 'process' ? '加工' : '製作')} ${badge(r.region, 'amber')}<h1>${e(s.ja)}の作り方と材料</h1></div>${emblem('生活')}</div><p class="lead">${e(s.ja)}で作れる品物${rows.length}件と、その材料。韓国版の資料による。日本版では、印の付いた名前だけを確かめている。</p><div class="article-meta"><span>確認 ${r.checkedAt}</span><span>作り方 ${rows.length}件</span><span lang="ko">${e(s.ko)}</span></div>${botBox(rows)}${named ? `<div class="toolbar recipe-jump">${groups.map((g, i) => `<a class="filter-chip" href="#group-${i}">${e(g.ja)}</a>`).join('')}</div>` : ''}${groups.map((g, i) => `${named ? `<h2 id="group-${i}">${e(g.ja)}<small lang="ko">${e(g.key)}</small></h2>` : ''}<div class="recipe-grid">${g.rows.map(card).join('')}</div>`).join('')}<p class="section-note">${e(r.legend)}</p><section id="sources" class="sources-section"><details><summary>出典と資料の基準日（1件）</summary>${sourceList([s.source])}</details></section><p><a class="text-link" href="/recipes/">製作・加工の一覧へ戻る</a></p></article></div>`
  }]);
  for (const x of rows) {
   const i = items.get(x.item), mats = x.materials.map(m => items.get(m.item));
   index.push({ kind: '製作・加工', title: `${i.ja} / ${i.ko}`, description: `${cond(x).join(' · ')} · 材料：${x.materials.map(m => items.get(m.item).ja + (m.qty === null ? '' : '×' + m.qty)).join('、')}`, url: recipeHref(x), text: [i.ja, i.ko, s.ja, x.group?.ja ?? '', ...mats.flatMap(m => [m.ja, m.ko])].join(' ') });
  }
 }
 return { pages, index, total: r.recipes.length, confirmed };
}
