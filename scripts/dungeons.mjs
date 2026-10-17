// ダンジョンの推奨レベル（/dungeons/）と、狩り場の一覧（/hunting-grounds/）。
// 正本は content/dungeons.json。日本版の画面で見た値（checks）は、表の値と同じでなければ止める。
import { scene, SCENES } from './scenes.mjs';

export const DIFFS = ['NORMAL', 'HARD', 'VERY HARD'];
const diffClass = ['n', 'h', 'vh'];
const floorOf = label => label.split(' ')[0];

export function checkDungeons(d, sourceIds) {
 const fail = message => { throw new Error(`DUNGEONS_INVALID: ${message}`); };
 const ids = new Set();
 for (const id of d.sources) if (!sourceIds.has(id)) fail(`出典 ${id} が portal.json に無い`);
 for (const x of [...d.dungeons, ...d.hunting]) {
  if (ids.has(x.id)) fail(`id ${x.id} が重複`);
  ids.add(x.id);
  if (!SCENES.includes(x.scene)) fail(`${x.id} の挿絵 ${x.scene} が無い`);
  if (typeof x.japan !== 'boolean') fail(`${x.id} の japan が真偽値でない`);
 }
 for (const g of d.dungeons) {
  for (const f of g.floors) if (f.levels.length !== 3) fail(`${g.id} ${f.floor} の難易度が3つでない`);
  for (const c of g.checks ?? []) {
   const floor = floorOf(c.label), i = DIFFS.indexOf(c.difficulty);
   if (i < 0) fail(`${g.id} ${c.label} の難易度 ${c.difficulty}`);
   const value = floor.startsWith('深部') ? g.deep?.find(x => x.floor === floor)?.level : g.floors.find(x => x.floor === floor)?.levels[i];
   if (value !== c.level) fail(`${g.id} ${c.label} ${c.difficulty}：画面は Lv.${c.level}、表は Lv.${value}`);
  }
 }
 for (const h of d.hunting) if (h.levels.length < 2 || h.levels.length > 3) fail(`${h.id} の難易度の数`);
}

export function dungeonViews(d, { e, badge, icon, sourceList, emblem }) {
 const lv = v => v == null ? '<span class="lv none">—</span>' : `<span class="lv">Lv.${v}</span>`;
 const checked = (g, floor, i) => (g.checks ?? []).find(c => floorOf(c.label) === floor && (floor.startsWith('深部') || DIFFS.indexOf(c.difficulty) === i));
 const jpBadge = x => x.japan ? badge('日本版にある', 'blue') : badge('韓国版の先行・名前は仮訳', 'amber');
 const legend = `<div class="diff-legend">${DIFFS.map((t, i) => `<span class="diff ${diffClass[i]}">${t}</span>`).join('')}<span class="jp-mark">${icon('check')}日本版の画面で見た値</span></div>`;
 const finder = (kind) => `<div class="level-finder" data-level-finder="${kind}"><label for="lv-${kind}"><span class="eyebrow">YOUR LEVEL</span><strong>あなたのレベル</strong></label><div class="finder-input"><input id="lv-${kind}" type="range" min="1" max="100" value="40" data-level-range><output data-level-out>Lv.40</output></div><p class="finder-result" data-level-result aria-live="polite"></p></div>`;

 // レベルの物差し。1F の3つの難易度を、1〜100 の上に印で置く。
 const ruler = list => `<div class="level-ruler" aria-hidden="true"><div class="ruler-scale">${[1, 20, 40, 60, 80, 100].map(n => `<span style="left:${(n - 1) / .99}%">${n}</span>`).join('')}</div>${list.map(x => {
  const levels = x.floors ? x.floors[0].levels : x.levels;
  const shown = levels.map((v, i) => [v, i]).filter(([v]) => v != null);
  if (!shown.length) return '';
  const lo = shown[0][0], hi = shown[shown.length - 1][0];
  return `<div class="ruler-row${x.japan ? '' : ' ko'}"><span class="ruler-name">${e(x.short ?? x.ja)}</span><div class="ruler-track"><span class="ruler-span" style="left:${(lo - 1) / .99}%;width:${(hi - lo) / .99}%"></span>${shown.map(([v, i]) => `<span class="ruler-dot ${diffClass[i]}" style="left:${(v - 1) / .99}%" title="${DIFFS[i]} Lv.${v}"></span>`).join('')}</div></div>`;
 }).join('')}</div>`;

 const dungeonCard = g => {
  const rows = g.floors.map(f => `<tr><th scope="row">${f.floor}</th>${f.levels.map((v, i) => { const c = checked(g, f.floor, i); return `<td class="${diffClass[i]}${c ? ' jp' : ''}"${v == null ? '' : ` data-lv="${v}" data-place="${e(g.short)} ${f.floor} ${DIFFS[i]}"`}>${lv(v)}${c ? `<span class="jp-mark" title="日本版の画面で見た値">${icon('check')}</span>` : ''}</td>`; }).join('')}</tr>`).join('');
  const deep = (g.deep ?? []).map(f => { const c = checked(g, f.floor); return `<tr class="deep"><th scope="row">${f.floor}</th><td colspan="3"${c ? ' class="jp"' : ''} data-lv="${f.level}" data-place="${e(g.short)} ${f.floor}">${lv(f.level)}${f.power ? `<small>推奨戦闘力 ${f.power.toLocaleString('ja-JP')}</small>` : ''}${f.minLevel ? `<small>Lv.${f.minLevel}から入れる</small>` : ''}${c ? `<span class="jp-mark" title="日本版の画面で見た値">${icon('check')}</span>` : ''}</td></tr>`; }).join('');
  return `<article class="place-card${g.japan ? '' : ' ko'}" id="${g.id}"><div class="place-art">${g.photo ? `<img class="place-photo" src="/assets/${g.photo}" alt="${e(g.ja)}。日本版のゲーム画面" width="750" height="240" loading="lazy"><span class="photo-note">日本版のゲーム画面</span>` : scene(g.scene, g.ja + 'の挿絵')}<div class="place-title"><h3>${e(g.ja)}</h3><span lang="ko">${e(g.ko)}</span></div></div><div class="place-body"><div class="place-badges">${jpBadge(g)}${g.deep ? badge('深部ダンジョンあり', 'navy') : ''}</div><p class="place-mood">${e(g.mood)}</p><div class="table-wrap"><table class="level-table"><thead><tr><th scope="col">階</th>${DIFFS.map((t, i) => `<th scope="col" class="${diffClass[i]}">${t}</th>`).join('')}</tr></thead><tbody>${rows}${deep}</tbody></table></div>${g.deepNote ? `<p class="place-note">${e(g.deepNote)}</p>` : ''}${g.jpNote ? `<p class="place-note">${e(g.jpNote)}${g.jpNoteHref ? ` <a href="${g.jpNoteHref}">記事を読む</a>` : ''}</p>` : ''}${g.boss ? `<a class="place-link" href="${g.boss.href}">${e(g.boss.text)}<strong>${e(g.boss.label)} ${icon('chevron')}</strong></a>` : ''}</div></article>`;
 };

 const huntCard = h => {
  const pills = h.levels.map((v, i) => `<div class="hunt-level ${diffClass[i]}"${v == null ? '' : ` data-lv="${v}" data-place="${e(h.ja)} ${DIFFS[i]}"`}><span>${DIFFS[i]}</span><strong>${v == null ? '—' : 'Lv.' + v}</strong></div>`).join('');
  const facts = [['場所', h.near], ['エリア', h.areas + 'つ'], h.fieldBoss ? ['フィールドボス', h.fieldBoss] : null].filter(Boolean);
  return `<article class="place-card hunt${h.japan ? '' : ' ko'}" id="${h.id}"><div class="place-art">${h.photo ? `<img class="place-photo" src="/assets/${h.photo}" alt="${e(h.ja)}。日本版のゲーム画面" width="750" height="240" loading="lazy"><span class="photo-note">日本版のゲーム画面</span>` : scene(h.scene, h.ja + 'の挿絵')}<div class="place-title"><h3>${e(h.ja)}</h3><span lang="ko">${e(h.ko)}</span></div></div><div class="place-body"><div class="place-badges">${jpBadge(h)}</div><p class="place-mood">${e(h.mood)}</p><div class="hunt-levels">${pills}</div><dl class="place-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${h.enemies?.length ? `<h4>日本版で見た敵</h4><ul class="chip-list">${h.enemies.map(x => `<li>${e(x)}</li>`).join('')}</ul>` : ''}${h.gather?.length ? `<h4>採れる物（採集図鑑）</h4><ul class="chip-list gather">${h.gather.map(x => `<li><a href="/gathering/">${e(x)}</a></li>`).join('')}</ul>` : ''}${(h.notes ?? []).map(n => `<p class="place-note">${e(n)}</p>`).join('')}</div></article>`;
 };

 const jpD = d.dungeons.filter(g => g.japan), koD = d.dungeons.filter(g => !g.japan);
 const jpH = d.hunting.filter(h => h.japan), koH = d.hunting.filter(h => !h.japan);
 const sources = `<section id="sources" class="sources-section"><details><summary>出典と資料の基準日（${d.sources.length}件）</summary>${sourceList(d.sources)}<p class="section-note">推奨レベルの表は韓国のナムウィキとInvenのまとめ（どちらもプレイヤーが書いた物）による。日本版の画面で ${d.jpCheckedOn.slice(5).replace('-', '月')}日に見た値は、印を付けた所だけで、どれも表と同じだった。</p></details></section>`;
 const head = (kicker, title, lead, art, meta) => `<div class="place-hero">${art.endsWith('.webp') ? `<img class="place-hero-img" src="/assets/${art}" alt="" width="960" height="540" fetchpriority="high">` : scene(art, '')}<div class="place-hero-text"><span class="eyebrow">${kicker}</span><h1>${e(title)}</h1><p>${e(lead)}</p><div class="article-meta">${meta.map(m => `<span>${m}</span>`).join('')}</div></div></div>`;

 const dungeonBody = `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/database/">データベース</a> / ダンジョンの推奨レベル</div>${head('DUNGEON LEVELS', 'ダンジョンの推奨レベル', '日本版にある6つのダンジョンと深部ダンジョンを、階と難易度ごとの推奨レベルで並べました。レベルを動かすと、今の自分に合う所が光ります。', 'lion-shield.webp', [`確認 ${d.checkedAt}`, `日本版 ${jpD.length}・韓国版の先行 ${koD.length}`])}
<div class="place-layout"><div class="points-box"><h2>この一覧のポイント</h2><ul>${[
  '難易度は NORMAL・HARD・VERY HARD の3つ。推奨レベルは階と難易度で決まる。',
  '通常ダンジョンの入場はシルバーコイン10枚。深部ダンジョンは魔族の供物1個（供物はLv.55からたまる）。',
  'ゲームの難易度選択の画面にも[推奨]の表示が出る。迷ったらそれに合わせる。',
  `日本版の画面で見た${d.dungeons.reduce((n, g) => n + (g.checks?.length ?? 0), 0)}か所の推奨レベルは、どれも下の表と同じだった。`
 ].map(p => `<li>${icon('check')}<span>${e(p)}</span></li>`).join('')}</ul></div>
${finder('dungeons')}
<section><h2>レベルの物差し</h2><p class="section-note">各ダンジョンの1Fの推奨レベル。左の印が NORMAL、右へ HARD、VERY HARD。</p>${legend}${ruler([...jpD, ...koD])}</section>
<section><h2>日本版にあるダンジョン</h2>${legend}<div class="place-grid">${jpD.map(dungeonCard).join('')}</div></section>
<section><h2>韓国版で先に来ているダンジョン</h2><p class="section-note">日本版ではまだ見ていないダンジョン。名前は韓国語からの仮訳で、日本版で来た時に名前と値を確かめ直す。</p><div class="place-grid">${koD.map(dungeonCard).join('')}</div></section>
<section class="advice-box"><h2>ダンジョンの仕組みを読む</h2><ul class="place-links">${[['/guides/dungeon-basics/', '通常ダンジョンと深部ダンジョンの違い'], ['/guides/abyss-guide/', 'アビスの解放条件と週次報酬'], ['/guides/ghost-tower/', '亡霊の塔'], ['/guides/raid-guide/', 'レイドの始め方'], ['/hunting-grounds/', '狩り場の推奨レベル']].map(([href, t]) => `<li><a href="${href}">${e(t)} ${icon('chevron')}</a></li>`).join('')}</ul></section>${sources}</div>`;

 const huntBody = `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/database/">データベース</a> / 狩り場の推奨レベル</div>${head('HUNTING GROUNDS', '狩り場の推奨レベル', '女神像の祭壇から入る狩り場を、難易度ごとの推奨レベル、フィールドボス、日本版で見た敵と採れる物で並べました。', 'erin/media-08.webp', [`確認 ${d.checkedAt}`, `日本版 ${jpH.length}・韓国版の先行 ${koH.length}`])}
<div class="place-layout"><div class="points-box"><h2>この一覧のポイント</h2><ul>${[
  '狩り場は各地の女神像の祭壇から入る。難易度は NORMAL・HARD・VERY HARD。',
  'エリア任務（メイン任務）はシルバーコインを使う。失敗しても、達成したサブ任務の数に応じて一部が戻る。',
  '調査任務は1回だけ。クリアすると、次の調査任務までは狩り任務を繰り返せる。',
  'フィールドボスは毎日12時・18時・20時・22時に出る。'
 ].map(p => `<li>${icon('check')}<span>${e(p)}</span></li>`).join('')}</ul></div>
${finder('hunting')}
<section><h2>レベルの物差し</h2>${legend}${ruler([...jpH, ...koH])}</section>
<section><h2>日本版にある狩り場</h2><div class="place-grid">${jpH.map(huntCard).join('')}</div></section>
<section><h2>任務の種類</h2><div class="table-wrap"><table><thead><tr><th scope="col">種類</th><th scope="col">回数</th><th scope="col">特徴</th></tr></thead><tbody><tr><th scope="row">調査任務</th><td>1回</td><td>クリアすると、次の調査任務が解放されるまで狩り任務を進められる</td></tr><tr><th scope="row">狩り任務</th><td>繰り返し</td><td>[狩りIV]では任務の再設定ができる</td></tr><tr><th scope="row">ダブルドロップ</th><td>—</td><td>シルバーコインを2倍使って、報酬を2倍もらう。「残された疑問」のクリアで解放</td></tr></tbody></table></div><p class="section-note">日本公式ゲームガイド「狩場」による。</p></section>
<section><h2>韓国版で先に来ている狩り場</h2><p class="section-note">日本版ではまだ見ていない狩り場。名前は韓国語からの仮訳。</p><div class="place-grid">${koH.map(huntCard).join('')}</div></section>
<section class="advice-box"><h2>あわせて読みたい</h2><ul class="place-links">${[['/gathering/', '採集図鑑：行き先に要るレベル'], ['/guides/time-table/', '時間で決まっている事の早見表'], ['/guides/titles/', 'フィールドボスのタイトル'], ['/dungeons/', 'ダンジョンの推奨レベル']].map(([href, t]) => `<li><a href="${href}">${e(t)} ${icon('chevron')}</a></li>`).join('')}</ul></section>${sources}</div>`;

 const index = [
  ...d.dungeons.map(g => ({ kind: 'ダンジョン', title: `${g.ja} / ${g.ko}`, description: g.floors.map(f => `${f.floor} ${f.levels.map((v, i) => v == null ? null : DIFFS[i] + ' Lv.' + v).filter(Boolean).join('・')}`).join(' / '), url: `/dungeons/#${g.id}`, text: [g.ja, g.ko, g.mood, '推奨レベル ダンジョン'].join(' ') })),
  ...d.hunting.map(h => ({ kind: '狩り場', title: `${h.ja} / ${h.ko}`, description: h.levels.map((v, i) => v == null ? null : DIFFS[i] + ' Lv.' + v).filter(Boolean).join('・') || '推奨レベルは資料に無い', url: `/hunting-grounds/#${h.id}`, text: [h.ja, h.ko, h.mood, h.fieldBoss ?? '', ...(h.enemies ?? []), ...(h.gather ?? []), '狩り場 狩場 推奨レベル'].join(' ') }))
 ];
 return {
  pages: [
   ['/dungeons/', { title: 'ダンジョンの推奨レベル', description: 'マビノギモバイルのダンジョンを、階と難易度（NORMAL・HARD・VERY HARD）ごとの推奨レベルと、深部ダンジョンの推奨戦闘力で一覧に。', body: dungeonBody }],
   ['/hunting-grounds/', { title: '狩り場の推奨レベル', description: 'マビノギモバイルの狩り場を、難易度ごとの推奨レベル、フィールドボス、日本版で見た敵と採れる物で一覧に。', body: huntBody }]
  ],
  index
 };
}
