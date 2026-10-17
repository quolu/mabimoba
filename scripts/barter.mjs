// 物々交換の一覧（content/barter.json）の検査とページ。
// 品物の名前は、製作・加工の一覧（content/recipes.json）にある品物はそちらを使い、無い品物だけを barter.json の items に持つ。

export function checkBarter(b, recipes, sourceIds) {
 const bad = why => { throw new Error(`BARTER_INVALID: ${why}`); };
 if (b?.schemaVersion !== 1) bad('schemaVersion');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(b.checkedAt) || !/^\d{4}-\d{2}-\d{2}$/.test(b.asOf) || !b.lead || !b.points?.length || !b.legend || !b.region) bad('見出しの内容が不足');
 for (const id of [...(b.sources ?? []), ...(b.jpSources ?? [])]) if (!sourceIds.has(id)) bad(`出典 ${id}`);
 if (!b.sources?.length) bad('出典が無い');
 const ids = list => { const s = new Set(list.map(x => x.id)); if (s.size !== list.length) bad('IDが重複'); return s; };
 const regions = ids(b.regions), npcs = ids(b.npcs);
 ids(b.trades);
 const named = x => x.ko && x.ja && typeof x.jaConfirmed === 'boolean';
 for (const r of b.regions) if (!named(r)) bad(`地域 ${r.id}`);
 for (const n of b.npcs) if (!named(n) || !regions.has(n.region)) bad(`NPC ${n.id}`);
 const fromRecipes = new Set(recipes.items.map(i => i.ko));
 const own = new Set();
 for (const i of b.items) {
  if (!named(i)) bad(`品物 ${i.ko}`);
  if (fromRecipes.has(i.ko)) bad(`製作・加工の一覧にある品物を二重に持っている ${i.ko}`);
  if (own.has(i.ko)) bad(`品物が重複 ${i.ko}`);
  own.add(i.ko);
 }
 const used = new Set();
 for (const t of b.trades) {
  if (!npcs.has(t.npc)) bad(`交換 ${t.id} のNPC`);
  for (const side of [t.get, t.give]) {
   if (!side || !(fromRecipes.has(side.item) || own.has(side.item))) bad(`交換 ${t.id} の品物 ${side?.item}`);
   if (!Number.isInteger(side.qty) || side.qty < 1) bad(`交換 ${t.id} の個数`);
   used.add(side.item);
  }
  const l = t.limit;
  if (!l || !['character', 'server'].includes(l.scope) || !(l.count === null ? l.per === null : Number.isInteger(l.count) && l.count > 0 && ['day', 'week'].includes(l.per))) bad(`交換 ${t.id} の回数`);
  if (t.pick !== undefined && (typeof t.pick !== 'string' || !t.pick)) bad(`交換 ${t.id} のおすすめ`);
 }
 for (const ko of own) if (!used.has(ko)) bad(`使っていない品物 ${ko}`);
 for (const r of b.regions) if (!b.npcs.some(n => n.region === r.id)) bad(`NPCのいない地域 ${r.id}`);
}

export const limitText = l => l.count === null ? '回数の制限なし' : `${l.per === 'day' ? '1日' : '1週'}${l.count}回${l.scope === 'server' ? '（サーバーで）' : ''}`;

export function barterViews(b, recipes, h) {
 const { e, badge, icon, emblem, sourceList } = h;
 const recipeItems = new Map(recipes.items.map(i => [i.ko, i]));
 const firstRecipe = new Map();
 for (const x of recipes.recipes) if (!firstRecipe.has(x.item)) firstRecipe.set(x.item, x);
 const itemOf = ko => recipeItems.get(ko) ?? b.items.find(i => i.ko === ko);
 const regions = new Map(b.regions.map(r => [r.id, r]));
 const npcs = new Map(b.npcs.map(n => [n.id, n]));
 const tag = x => x.jaConfirmed ? '<span class="name-tag ok">日本版の名前</span>' : '<span class="name-tag">仮訳</span>';
 const mark = x => x.jaConfirmed ? '' : '<span class="barter-guess" title="仮訳">＊</span>';
 const item = side => {
  const i = itemOf(side.item), r = recipeItems.get(side.item), x = r && firstRecipe.get(r.id);
  const name = `${e(i.ja)}${mark(i)}`;
  return `<span class="barter-item">${x ? `<a href="/recipes/${x.section}/#${x.id}">${name}</a>` : name}<b>×${side.qty}</b></span>`;
 };
 const row = t => `<li class="barter-trade${t.pick ? ' is-pick' : ''}" id="${t.id}"><div class="barter-swap"><span class="barter-side"><small>渡す</small>${item(t.give)}</span><span class="barter-arrow" aria-label="と交換で">${icon('chevron')}</span><span class="barter-side"><small>もらう</small>${item(t.get)}</span></div><p class="barter-limit"><span>${e(limitText(t.limit))}</span>${t.pick ? '<a class="barter-pick" href="/guides/barter-picks/">おすすめ</a>' : ''}</p>${t.pick ? `<p class="barter-why">${e(t.pick)}</p>` : ''}</li>`;
 const npcCard = n => {
  const rows = b.trades.filter(t => t.npc === n.id);
  return `<article class="recipe-card barter-card" id="${n.id}"><h3>${e(n.ja)}</h3><p class="recipe-names"><span class="korean-name" lang="ko">${e(n.ko)}</span>${tag(n)}</p><ul class="barter-list">${rows.map(row).join('')}</ul></article>`;
 };
 const confirmed = [...b.npcs, ...b.items, ...[...new Set(b.trades.flatMap(t => [t.get.item, t.give.item]))].map(ko => recipeItems.get(ko)).filter(Boolean)];
 const picks = b.trades.filter(t => t.pick);
 const regionBlock = r => {
  const list = b.npcs.filter(n => n.region === r.id);
  const n = b.trades.filter(t => list.some(x => x.id === t.npc)).length;
  return `<section class="barter-region" id="region-${r.id}" data-category="${e(r.ja)}${b.trades.some(t => t.pick && list.some(x => x.id === t.npc)) ? ' おすすめあり' : ''}"><h2>${e(r.ja)}<small>${n}件 · <span lang="ko">${e(r.ko)}</span>${r.jaConfirmed ? '' : ' · 地名は仮訳'}</small></h2>${r.note ? `<p class="section-note">${e(r.note)}</p>` : ''}<div class="recipe-grid">${list.map(npcCard).join('')}</div></section>`;
 };
 const body = `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/life/">生活・ものづくり</a> / 物々交換の一覧</div><div class="article-layout single"><article class="article-body"><div class="article-head"><div>${badge('生活')} ${badge(b.region, 'amber')}<h1>物々交換の一覧：NPCごとの交換と回数</h1></div>${emblem('生活')}</div><p class="lead">${e(b.lead)}</p><div class="article-meta"><span>確認 ${b.checkedAt}</span><span>資料の基準日 ${b.asOf}</span><span>交換 ${b.trades.length}件</span><span>NPC ${b.npcs.length}人</span><span>おすすめ ${picks.length}件</span></div><figure class="page-banner"><img src="/assets/dunbarton-festival.webp" alt="旗が飾られたダンバートンの通りと、お祭りでにぎわう人々。韓国公式イラスト" width="740" height="416" decoding="async"><figcaption>韓国公式イラスト（© NEXON Korea Corp. &amp; devCAT Corp.）</figcaption></figure><div class="points-box"><h2>この一覧のポイント</h2><ul>${b.points.map(p => `<li>${icon('check')}<span>${e(p)}</span></li>`).join('')}</ul></div><aside class="bot-box"><div><span class="eyebrow">PICKS</span><strong>どれから回せばいい？</strong><p>加工の時間を減らせる交換と、集めにくい材料が手に入る交換を、記事にまとめた。</p></div><a class="button dark" href="/guides/barter-picks/">おすすめの物々交換を読む</a></aside><h2 id="regions">町から探す</h2><div class="toolbar" data-filter-target="barter-regions">${['すべて', 'おすすめあり', ...b.regions.map(r => r.ja)].map((c, i) => `<button class="filter-chip" type="button" data-filter="${e(c)}" aria-pressed="${i === 0}">${e(c)}</button>`).join('')}</div><p class="section-note">${e(b.legend)} 一覧では仮訳の名前に「＊」を付けた。品物の名前を押すと、その作り方へ移る。</p><div id="barter-regions">${b.regions.map(regionBlock).join('')}</div><h2 id="data">データ</h2><p>この一覧の中身は、<a href="/data/barter.json">barter.json</a> でも読める。交換ごとに、NPC、渡す物ともらう物の韓国語の名前と個数、回数の上限を持っている。品物の日本語の名前は、製作・加工の一覧の <a href="/data/recipes.json">recipes.json</a> と同じ物を使う。</p><section id="sources" class="sources-section"><details><summary>出典と資料の基準日（${b.sources.length + (b.jpSources?.length ?? 0)}件）</summary><p class="section-note">交換の中身は韓国の資料による。日本版の名前は、日本公式ゲームガイド、日本公式の告知、日本版の攻略媒体と、日本版の実機の画面で確かめた。</p>${sourceList([...b.sources, ...(b.jpSources ?? [])])}</details></section></article></div>`;
 const index = b.npcs.map(n => {
  const rows = b.trades.filter(t => t.npc === n.id);
  const name = side => itemOf(side.item).ja + '×' + side.qty;
  return { kind: '物々交換', title: `${n.ja}の物々交換（${regions.get(n.region).ja}）`, description: rows.map(t => `${name(t.give)}→${name(t.get)}`).join('、'), url: `/barter/#${n.id}`, text: [n.ja, n.ko, regions.get(n.region).ja, ...rows.flatMap(t => [t.get, t.give].flatMap(s => [itemOf(s.item).ja, s.item]))].join(' ') };
 });
 return { page: { title: '物々交換の一覧', description: b.lead, body }, index, total: b.trades.length, npcCount: b.npcs.length, confirmedCount: confirmed.filter(x => x.jaConfirmed).length, data: { ...b, items: [...new Set(b.trades.flatMap(t => [t.get.item, t.give.item]))].map(ko => { const i = itemOf(ko); return { ko, ja: i.ja, jaConfirmed: i.jaConfirmed, ...(recipeItems.has(ko) ? { recipeItem: i.id } : {}) }; }) } };
}
