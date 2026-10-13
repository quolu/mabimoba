// 製作・加工の作り方（content/recipes.json）に、採集図鑑（content/portal.json の gathering）の行き先と、
// 行き先で採れる品物（content/crafting.json）をつないで、公開するデータを作る。
// 出す物は /data/crafting.json と、計算の答えの例 /data/crafting-examples.json。項目と計算の決まりは docs/crafting-data.md。
import { createHash } from 'node:crypto';
import { craftPlan } from './recipes.mjs';

const RULE_URL = 'https://github.com/quolu/mabimoba/blob/main/docs/crafting-data.md';

export function buildCrafting(recipes, portal, extra) {
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
  const place = d.place?.match(/^\[(.+?)\](.+)$/);
  if (d.place && !place) bad(`行き先の場所 ${d.place}`);
  const mediaAreas = extra.mediaAreas[d.skill]?.[d.name];
  const own = extra.destinationTools[d.skill]?.[d.name];
  return {
   id: `${d.skill}:${d.name}`, skill: d.skill, skillName: skill.name, name: d.name, level: d.level, check: d.check,
   areaType: place ? place[1] : null,
   areas: place ? place[2].split('、') : mediaAreas ?? [],
   areaCheck: place ? 'screen' : mediaAreas ? 'media' : null,
   tool: own ? own.tool : skill.tool, toolCheck: own ? own.toolCheck : skill.toolCheck,
   yields: names.map(name => { const t = tie(name); return { name, item: t.item?.id ?? null, sure: t.sure, ...(t.note ? { note: t.note } : {}) }; }),
   yieldsCheck: 'media', yieldsSource: skill.source
  };
 });
 if (new Set(destinations.map(d => d.id)).size !== destinations.length) bad('行き先が重複');
 for (const [skill, rows] of Object.entries(extra.yields)) for (const name of Object.keys(rows)) if (!destinations.some(d => d.id === `${skill}:${name}`)) bad(`採れる品物の行き先が無い ${skill}:${name}`);
 for (const group of [extra.mediaAreas, extra.destinationTools]) for (const [skill, rows] of Object.entries(group)) for (const name of Object.keys(rows)) if (!destinations.some(d => d.id === `${skill}:${name}`)) bad(`行き先が無い ${skill}:${name}`);

 // 品物。採れる行き先と、別の書き方を足す。
 const nameOf = new Map(recipes.items.map(i => [i.id, i]));
 const sourcesOf = new Map(), aliasesOf = new Map(), seenInJp = new Set();
 for (const d of destinations) for (const y of d.yields) {
  if (!y.item) continue;
  if (!sourcesOf.has(y.item)) sourcesOf.set(y.item, []);
  sourcesOf.get(y.item).push(d.id);
  if (y.name === nameOf.get(y.item).ja) seenInJp.add(y.item);
 }
 for (const [name, t] of Object.entries(extra.ties)) {
  const item = itemOfKo(t.ko);
  if (!aliasesOf.has(item.id)) aliasesOf.set(item.id, []);
  aliasesOf.get(item.id).push({ name, sure: t.sure, note: t.note });
 }
 const recommended = new Map(Object.entries(extra.recommendedLv).map(([ko, lv]) => [itemOfKo(ko).id, lv]));
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
   seconds: x.seconds,
   materials: x.materials.map(m => ({ item: m.item, qty: m.qty, ...(m.item === x.item ? { self: true } : {}) })),
   jpChecked: x.jpChecked === true, usable: !unusable.has(x.item), usableNote: unusable.get(x.item) ?? null, notes: x.notes ?? []
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
 const sureSource = new Set(destinations.flatMap(d => d.yields.filter(y => y.sure).map(y => y.item)));
 const items = recipes.items.map(i => {
  const sources = sourcesOf.get(i.id) ?? [];
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
   obtain: i.craftable ? 'craft' : sources.length ? 'gather' : 'unknown',
   sources, sourceKnown: i.craftable || sources.length > 0, depth, gatherOnly, gatherOnlySure
  };
 });

 const used = new Set([...recipes.sections.map(s => s.source), ...(recipes.jpSources ?? []), ...skills.map(s => s.source), ...portal.gathering.sources]);
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
   jaConfirmed: items.filter(i => i.jaConfirmed).length, jpChecked: outRecipes.filter(x => x.jpChecked).length
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
