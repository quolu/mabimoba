// 製作・加工の作り方（content/recipes.json）に、採集図鑑（content/portal.json の gathering）の行き先と、
// 行き先で採れる品物（content/crafting.json）をつないで、公開するデータを作る。
// 採集のほかの手に入れ方（物々交換、店、ダンジョンなど）は、物々交換の一覧（content/barter.json）と content/crafting.json から足す。
// 出す物は /data/crafting.json と、計算の答えの例 /data/crafting-examples.json。項目と計算の決まりは docs/crafting-data.md。
import { createHash } from 'node:crypto';
import { craftPlan } from './recipes.mjs';

const RULE_URL = 'https://github.com/quolu/mabimoba/blob/main/docs/crafting-data.md';

export function buildCrafting(recipes, portal, extra, barter) {
 const bad = why => { throw new Error(`CRAFTING_INVALID: ${why}`); };
 if (extra?.schemaVersion !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(extra.checkedAt) || !extra.lead || !Number.isInteger(extra.gatherRun?.max)) bad('見出しの内容が不足');
 const checks = new Set(Object.keys(extra.checks));
 const sourceById = new Map(portal.sources.map(s => [s.id, s]));
 const byKo = new Map(recipes.items.map(i => [i.ko, i]));
 const byJa = new Map();
 for (const i of recipes.items) { if (byJa.has(i.ja)) bad(`日本語の名前が重複 ${i.ja}`); byJa.set(i.ja, i); }
 const itemOfKo = ko => byKo.get(ko) ?? bad(`品物が無い ${ko}`);

 // 採集スキル。名前は採集図鑑から、道具は content/crafting.json から。
 const guide = new Map(portal.gathering.skills.map(s => [s.id, s]));
 const skills = extra.skills.map(s => {
  const name = guide.get(s.id)?.name ?? s.name;
  if (!name || !checks.has(s.toolCheck) || !sourceById.has(s.source)) bad(`スキル ${s.id}`);
  return { id: s.id, name, tool: s.tool, toolCheck: s.toolCheck, toolNote: s.toolNote ?? null, source: s.source };
 });
 const skillById = new Map(skills.map(s => [s.id, s]));
 for (const id of guide.keys()) if (!skillById.has(id)) bad(`採集図鑑のスキルが無い ${id}`);

 // 行き先。採集図鑑に載せた行き先と、攻略媒体にだけ載っている行き先。
 const listed = [
  ...portal.gathering.skills.flatMap(s => s.destinations.map(d => ({ skill: s.id, name: d.name, level: d.level, place: d.place ?? null, check: d.check }))),
  ...extra.mediaDestinations.map(d => ({ ...d, place: null, check: 'media' }))
 ];
 const tie = name => {
  const t = extra.ties[name];
  if (t) return { item: itemOfKo(t.ko), sure: t.sure, note: t.note };
  const item = byJa.get(name);
  return item ? { item, sure: item.jaConfirmed, note: null } : { item: null, sure: null, note: null };
 };
 const destinations = listed.map(d => {
  const skill = skillById.get(d.skill) ?? bad(`行き先のスキル ${d.skill}`);
  const names = extra.yields[d.skill]?.[d.name];
  if (!names?.length || !checks.has(d.check)) bad(`行き先 ${d.skill}:${d.name}`);
  // 場所は「[種類]名前、名前」。種類が2つある行き先は「[種類]名前、[種類]名前」と続けて書く。
  const groups = d.place ? [...d.place.matchAll(/\[(.+?)\]([^\[]+)/g)].map(m => ({ type: m[1], areas: m[2].split('、').filter(Boolean) })) : [];
  if (d.place && (!groups.length || groups.some(g => !g.areas.length) || groups.map(g => `[${g.type}]${g.areas.join('、')}`).join('、') !== d.place)) bad(`行き先の場所 ${d.place}`);
  const place = groups.length ? groups : null;
  const mediaAreas = extra.mediaAreas[d.skill]?.[d.name];
  const own = extra.destinationTools[d.skill]?.[d.name];
  // 実機で、その行き先から手に入ったのを見た品物。
  const seen = extra.screenYields[d.skill]?.[d.name] ?? [];
  for (const name of seen) if (!names.includes(name)) bad(`実機で見た品物が、採れる品物に無い ${d.skill}:${d.name} ${name}`);
  return {
   id: `${d.skill}:${d.name}`, skill: d.skill, skillName: skill.name, name: d.name, level: d.level, check: d.check,
   areaType: place?.length === 1 ? place[0].type : null,
   areas: place ? place.flatMap(g => g.areas) : mediaAreas ?? [],
   areaCheck: place ? 'screen' : mediaAreas ? 'media' : null,
   areaGroups: place ?? [],
   tool: own ? own.tool : skill.tool, toolCheck: own ? own.toolCheck : skill.toolCheck,
   yields: names.map(name => { const t = tie(name); return { name, item: t.item?.id ?? null, sure: t.sure, check: seen.includes(name) ? 'screen' : 'media', ...(t.note ? { note: t.note } : {}) }; }),
   yieldsCheck: names.every(name => seen.includes(name)) ? 'screen' : 'media', yieldsSource: skill.source, japan: true
  };
 });

 // 韓国版の資料（ナムウィキ）の、行き先ごとに採れる物の全部。日本版の資料にある行き先には、無い品物を後ろへ足す。
 // 日本版の資料に無い行き先は、japan: false の行き先として足す。
 const kr = extra.krGathering;
 if (!sourceById.has(kr?.source)) bad('韓国版の採集の出典');
 const krYield = ko => {
  const item = byKo.get(extra.krAliases[ko] ?? ko);
  const name = item?.ja ?? extra.krNames[ko] ?? bad(`韓国版の品物の名前が無い ${ko}`);
  return { name, ko, item: item?.id ?? null, sure: item ? true : null, check: 'kr' };
 };
 const krPaired = new Set();
 for (const k of kr.destinations) {
  const skill = skillById.get(k.skill) ?? bad(`韓国版の行き先のスキル ${k.skill}`);
  if (!k.ko || !Number.isInteger(k.level) || !k.yields?.length || !k.jp === !k.ja) bad(`韓国版の行き先 ${k.ko}`);
  let d;
  if (k.jp) {
   d = destinations.find(x => x.id === `${k.skill}:${k.jp}`) ?? bad(`韓国版の行き先の対が無い ${k.jp}`);
   if (krPaired.has(d.id)) bad(`韓国版の行き先が重複 ${k.jp}`);
   krPaired.add(d.id);
  } else {
   d = { id: `${k.skill}:${k.ja}`, skill: k.skill, skillName: skill.name, name: k.ja, level: k.level, check: 'kr', areaType: null, areas: [], areaCheck: null, areaGroups: [], tool: skill.tool, toolCheck: skill.toolCheck, yields: [], yieldsCheck: 'kr', yieldsSource: kr.source, japan: false };
   destinations.push(d);
  }
  d.ko = k.ko; d.levelKr = k.level; d.yieldsSourceKr = kr.source;
  for (const y of [...k.yields, ...(kr.common[k.skill] ?? [])].map(krYield)) {
   const same = d.yields.find(x => (y.item && x.item === y.item) || x.name === y.name);
   if (same) same.ko ??= y.ko;
   else d.yields.push(y);
  }
 }
 for (const d of destinations) if (d.japan && !krPaired.has(d.id)) bad(`日本版の行き先に韓国版の対が無い ${d.id}`);
 if (new Set(destinations.map(d => d.id)).size !== destinations.length) bad('行き先が重複');
 for (const [skill, rows] of Object.entries(extra.yields)) for (const name of Object.keys(rows)) if (!destinations.some(d => d.id === `${skill}:${name}`)) bad(`採れる品物の行き先が無い ${skill}:${name}`);
 for (const group of [extra.mediaAreas, extra.destinationTools, extra.screenYields]) for (const [skill, rows] of Object.entries(group)) for (const name of Object.keys(rows)) if (!destinations.some(d => d.id === `${skill}:${name}`)) bad(`行き先が無い ${skill}:${name}`);

 // 品物。採れる行き先と、別の書き方を足す。
 const nameOf = new Map(recipes.items.map(i => [i.id, i]));
 const sourcesOf = new Map(), krSourcesOf = new Map(), aliasesOf = new Map(), seenInJp = new Set();
 for (const d of destinations) for (const y of d.yields) {
  if (!y.item) continue;
  const to = d.japan ? sourcesOf : krSourcesOf;
  if (!to.has(y.item)) to.set(y.item, []);
  if (!to.get(y.item).includes(d.id)) to.get(y.item).push(d.id);
  if (y.check !== 'kr' && y.name === nameOf.get(y.item).ja) seenInJp.add(y.item);
 }
 for (const [name, t] of Object.entries(extra.ties)) {
  const item = itemOfKo(t.ko);
  if (!aliasesOf.has(item.id)) aliasesOf.set(item.id, []);
  aliasesOf.get(item.id).push({ name, sure: t.sure, note: t.note });
 }
 const recommended = new Map(Object.entries(extra.recommendedLv).map(([ko, lv]) => [itemOfKo(ko).id, lv]));
 const jpNotes = new Map(Object.entries(extra.jpNotes).map(([ko, text]) => [itemOfKo(ko).id, text]));
 const secondsChecks = new Map(Object.entries(extra.secondsChecks).map(([ko, check]) => [itemOfKo(ko).id, check]));
 const secondsNotes = new Map(Object.entries(extra.secondsNotes).map(([ko, text]) => [itemOfKo(ko).id, text]));
 for (const [item, check] of secondsChecks) if (!checks.has(check) || !recipes.recipes.some(x => x.item === item && x.seconds !== null)) bad(`時間の確かめ ${item}`);
 const unusable = new Map(Object.entries(extra.unusable).map(([ko, why]) => [itemOfKo(ko).id, why]));
 const screenGroups = new Map(Object.entries(extra.screenGroups)), confirmedSkills = new Set(extra.confirmedSkills);
 for (const [section, list] of screenGroups) for (const ko of list) if (!recipes.recipes.some(x => x.section === section && x.group?.ko === ko)) bad(`分類のグループ ${section}:${ko}`);
 for (const ko of confirmedSkills) if (!recipes.recipes.some(x => x.skill?.ko === ko)) bad(`スキル ${ko}`);
 const outRecipes = recipes.recipes.map(x => {
  // 品物と同じ材料が書かれた作り方は、使えない印が要る。
  if (x.materials.some(m => m.item === x.item) && !unusable.has(x.item)) bad(`使えない印が無い ${x.id}`);
  return {
   id: x.id, section: x.section,
   group: x.group ? { ...x.group, jaConfirmed: screenGroups.get(x.section)?.includes(x.group.ko) ?? false } : null,
   item: x.item, yield: x.yield,
   station: x.station, stationLv: x.stationLv,
   skill: x.skill ? { ...x.skill, jaConfirmed: confirmedSkills.has(x.skill.ko) } : null,
   skillLv: x.skillLv, recommendedLv: recommended.get(x.item) ?? null,
   seconds: x.seconds, secondsCheck: x.seconds === null ? null : secondsChecks.get(x.item) ?? 'table', secondsTable: x.secondsTable ?? x.seconds, secondsNote: secondsNotes.get(x.item) ?? null,
   materials: x.materials.map(m => ({ item: m.item, qty: m.qty, ...(m.item === x.item ? { self: true } : {}) })),
   jpChecked: x.jpChecked === true, usable: !unusable.has(x.item), usableNote: unusable.get(x.item) ?? null, jpNote: jpNotes.get(x.item) ?? null, notes: x.notes ?? []
  };
 });
 const recommendedRecipe = new Map(Object.entries(extra.recommendedRecipes).map(([ko, c]) => {
  const id = itemOfKo(ko).id, list = recipes.recipes.filter(x => x.item === id);
  if (list.length < 2 || !list[c.nth - 1] || !c.why) bad(`勧める作り方 ${ko}`);
  return [id, { recipe: list[c.nth - 1].id, why: c.why }];
 }));
 const stations = recipes.stations.map(s => {
  const label = extra.stationLabels[s.id], check = extra.stationNameChecks[s.id];
  if (s.id !== 'no-bench' && (!label || !checks.has(check))) bad(`製作台 ${s.id}`);
  return { ...s, jaCheck: check ?? null, aliases: label && label !== s.ja ? [{ name: label, sure: true, note: extra.stationLabelNote }] : [] };
 });
 const sureSource = new Set(destinations.filter(d => d.japan).flatMap(d => d.yields.filter(y => y.sure && y.check !== 'kr').map(y => y.item)));

 // 採集のほかの手に入れ方。どれも韓国版の資料にだけある事なので、check は kr。
 const regionById = new Map(barter.regions.map(r => [r.id, r]));
 const npcView = n => ({ ko: n.ko, ja: n.ja, jaConfirmed: n.jaConfirmed, region: n.region, regionJa: (regionById.get(n.region) ?? bad(`NPCの地域 ${n.ko}`)).ja });
 const npcById = new Map(barter.npcs.map(n => [n.id, n])), npcByKo = new Map(barter.npcs.map(n => [n.ko, n]));
 const shopNpc = ko => npcByKo.get(ko) ?? (extra.shopNpcs[ko] ? { ko, ...extra.shopNpcs[ko] } : bad(`店のNPC ${ko}`));
 const thing = ko => { const r = byKo.get(ko); if (r) return { item: r.id, ko, ja: r.ja, jaConfirmed: r.jaConfirmed }; const b = barter.items.find(i => i.ko === ko) ?? bad(`交換の品物 ${ko}`); return { item: null, ko, ja: b.ja, jaConfirmed: b.jaConfirmed }; };
 const routesOf = new Map(), routeSources = new Set();
 const addRoute = (ko, r) => {
  if (!sourceById.has(r.source)) bad(`手に入れ方の出典 ${r.source}`);
  routeSources.add(r.source);
  const id = itemOfKo(ko).id;
  if (!routesOf.has(id)) routesOf.set(id, []);
  routesOf.get(id).push({ ...r, check: 'kr' });
 };
 for (const t of barter.trades) if (byKo.has(t.get.item)) addRoute(t.get.item, { kind: 'barter', trade: t.id, npc: npcView(npcById.get(t.npc)), qty: t.get.qty, give: { ...thing(t.give.item), qty: t.give.qty }, limit: t.limit, source: barter.sources[0] });
 for (const s of extra.shops) {
  if (!['gold', 'heart'].includes(s.currency) || !Number.isInteger(s.price) || !s.limit) bad(`店 ${s.npc} ${s.item}`);
  addRoute(s.item, { kind: 'shop', npc: npcView(shopNpc(s.npc)), price: s.price, currency: s.currency, limit: s.limit, ...(s.note ? { note: s.note } : {}), source: s.source });
 }
 const routeKinds = new Set(['shop', 'dungeon', 'drop', 'mission', 'decompose', 'other']);
 for (const [ko, list] of Object.entries(extra.routes)) for (const r of list) {
  if (!routeKinds.has(r.kind) || !r.text) bad(`手に入れ方 ${ko}`);
  addRoute(ko, { kind: r.kind, text: r.text, source: r.source });
 }
 const items = recipes.items.map(i => {
  const sources = sourcesOf.get(i.id) ?? [], krSources = krSourcesOf.get(i.id) ?? [], routes = routesOf.get(i.id) ?? [];
  let depth = 0, gatherOnly = null, gatherOnlySure = null;
  if (i.craftable) {
   const plan = craftPlan(recipes, i.id, 1);
   const level = new Map();
   for (const s of plan.steps) level.set(s.item, 1 + Math.max(0, ...recipes.recipes.find(x => x.id === s.recipe).materials.map(m => level.get(m.item) ?? 0)));
   depth = level.get(i.id);
   gatherOnly = !plan.unknown.length && plan.base.every(b => sourcesOf.has(b.item));
   gatherOnlySure = gatherOnly && [...plan.steps, ...plan.base].every(row => nameOf.get(row.item).jaConfirmed) && plan.base.every(b => sureSource.has(b.item));
  }
  return {
   id: i.id, ko: i.ko, ja: i.ja, aliases: aliasesOf.get(i.id) ?? [], jaConfirmed: i.jaConfirmed, jaSeen: !i.jaConfirmed && seenInJp.has(i.id),
   craftable: i.craftable, recipes: recipes.recipes.filter(x => x.item === i.id).map(x => x.id),
   recommendedRecipe: recommendedRecipe.get(i.id)?.recipe ?? null, recommendedWhy: recommendedRecipe.get(i.id)?.why ?? null,
   obtain: i.craftable ? 'craft' : sources.length ? 'gather' : krSources.length || routes.length ? 'other' : 'unknown',
   sources, krSources, routes, sourceKnown: i.craftable || sources.length + krSources.length + routes.length > 0, depth, gatherOnly, gatherOnlySure
  };
 });

 const used = new Set([...recipes.sections.map(s => s.source), ...(recipes.jpSources ?? []), ...skills.map(s => s.source), ...portal.gathering.sources, kr.source, ...routeSources]);
 const base = items.filter(i => !i.craftable);
 const body = {
  schemaVersion: 1,
  checkedAt: [recipes.checkedAt, portal.gathering.checkedAt, extra.checkedAt].sort().at(-1),
  region: recipes.region,
  lead: extra.lead,
  rule: RULE_URL,
  checks: extra.checks,
  time: extra.time,
  gatherRun: extra.gatherRun,
  counts: {
   items: items.length, recipes: outRecipes.length, destinations: destinations.length,
   baseItems: base.length, baseWithSources: base.filter(i => i.sources.length).length,
   gatherOnlyItems: items.filter(i => i.gatherOnly).length, gatherOnlySureItems: items.filter(i => i.gatherOnlySure).length,
   jaConfirmed: items.filter(i => i.jaConfirmed).length, jpChecked: outRecipes.filter(x => x.jpChecked).length,
   japanDestinations: destinations.filter(d => d.japan).length, baseWithOtherWays: base.filter(i => i.obtain === 'other').length, baseUnknown: base.filter(i => i.obtain === 'unknown').length
  },
  stations,
  sections: recipes.sections,
  skills,
  destinations,
  items,
  recipes: outRecipes,
  sources: [...used].map(id => { const s = sourceById.get(id) ?? bad(`出典 ${id}`); return { id: s.id, title: s.title, url: s.url, kind: s.kind, region: s.region, asOf: s.asOf }; })
 };
 const revision = createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 12);
 const { schemaVersion, ...rest } = body;
 const crafting = { schemaVersion, revision, ...rest };

 // 計算の答えの例。docs/crafting-data.md の決まりで計算した結果を、そのまま出す。
 const cases = extra.examples.map(c => {
  const item = itemOfKo(c.item);
  const have = Object.fromEntries(Object.entries(c.have ?? {}).map(([ko, n]) => [itemOfKo(ko).id, n]));
  const prefer = Object.fromEntries(Object.entries(c.prefer ?? {}).map(([ko, nth]) => {
   const id = itemOfKo(ko).id, list = recipes.recipes.filter(x => x.item === id);
   return [id, (list[nth - 1] ?? bad(`例 ${c.id} の作り方`)).id];
  }));
  return { id: c.id, input: { item: item.id, itemJa: item.ja, count: c.count, have, prefer }, output: craftPlan(recipes, item.id, c.count, { have, prefer }) };
 });
 if (new Set(cases.map(c => c.id)).size !== cases.length) bad('例のIDが重複');
 return { crafting, examples: { schemaVersion: 1, revision, rule: RULE_URL, cases } };
}
