import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { craftPlan, baseMaterials } from '../scripts/recipes.mjs';
import { buildCrafting } from '../scripts/crafting.mjs';

const recipes = JSON.parse(await readFile(new URL('../content/recipes.json', import.meta.url), 'utf8'));
const portal = JSON.parse(await readFile(new URL('../content/portal.json', import.meta.url), 'utf8'));
const extra = JSON.parse(await readFile(new URL('../content/crafting.json', import.meta.url), 'utf8'));
const { crafting, examples } = buildCrafting(recipes, portal, extra);
const id = ko => recipes.items.find(i => i.ko === ko).id;
const ko = itemId => recipes.items.find(i => i.id === itemId).ko;
const recipeOf = recipeId => recipes.recipes.find(x => x.id === recipeId);

test('同じ途中の品物が2つの枝で要る時は、合わせてから切り上げる', () => {
  const plan = craftPlan(recipes, id('웨이브 엣지소드SS'), 1);
  const base = Object.fromEntries(plan.base.map(b => [ko(b.item), b.gather]));
  assert.equal(base['광석'], 60);
  assert.equal(base['석탄'], 76);
  assert.equal(plan.steps.find(s => ko(s.item) === '철괴').times, 3);
});

test('作る順は、どの品物も材料が先に来る。数は作り方と合う', () => {
  for (const item of recipes.items.filter(i => i.craftable)) {
    const plan = craftPlan(recipes, item.id, 7);
    const done = new Set(plan.base.map(b => b.item)), need = new Map([[item.id, 7]]);
    assert.equal(plan.steps.at(-1).item, item.id, item.ko);
    for (const step of plan.steps) {
      const x = recipeOf(step.recipe);
      for (const m of x.materials) if (m.qty !== null && m.item !== x.item) assert.ok(done.has(m.item), `${item.ko}: ${ko(step.item)} の材料が先に無い`);
      done.add(step.item);
    }
    for (const step of plan.steps.toReversed()) {
      const x = recipeOf(step.recipe);
      assert.equal(step.need, need.get(step.item), item.ko);
      assert.equal(step.times, Math.ceil(step.need / x.yield), item.ko);
      assert.equal(step.makes - step.surplus, step.need, item.ko);
      for (const m of x.materials) if (m.qty !== null && m.item !== x.item) need.set(m.item, (need.get(m.item) ?? 0) + m.qty * step.times);
    }
    for (const b of plan.base) assert.equal(b.gather, need.get(b.item), item.ko);
  }
});

test('持っている数は、途中の品物と元の材料から引く。作る品物そのものからは引かない', () => {
  const all = craftPlan(recipes, id('합금강괴'), 2, { have: { [id('강철괴')]: 99, [id('석탄')]: 1 } });
  assert.deepEqual(all.steps.map(s => ko(s.item)), ['합금강괴']);
  assert.deepEqual(all.covered.map(c => [ko(c.item), c.fromStock]), [['강철괴', 3]]);
  assert.deepEqual(all.base.map(b => [ko(b.item), b.need, b.fromStock, b.gather]), [['석탄', 8, 1, 7], ['동 광석', 15, 0, 15]]);
  const target = craftPlan(recipes, id('목재'), 3, { have: { [id('목재')]: 50 } });
  assert.deepEqual(target.steps.map(s => [s.times, s.fromStock]), [[1, 0]]);
});

test('作り方が2つある品物は、選ばなければ最初の作り方。選んだ時はその作り方', () => {
  const iron = id('철괴'), [first, second] = recipes.recipes.filter(x => x.item === iron);
  assert.deepEqual(craftPlan(recipes, iron, 1).base.map(b => [ko(b.item), b.gather]), [['광석', 20]]);
  const chosen = craftPlan(recipes, iron, 4, { prefer: { [iron]: second.id } });
  assert.deepEqual(chosen.base.map(b => [ko(b.item), b.gather]), [['철 광석', 20]]);
  assert.deepEqual(chosen.alternatives, [{ item: iron, used: second.id, recipes: [first.id, second.id] }]);
  assert.throws(() => craftPlan(recipes, iron, 1, { prefer: { [iron]: 'no-such-recipe' } }), /RECIPE_PREFER_UNKNOWN/);
  assert.throws(() => craftPlan(recipes, iron, 0), /RECIPE_COUNT_INVALID/);
});

test('個数の無い材料と、品物と同じ材料は、数に入れずに知らせる', () => {
  assert.deepEqual(craftPlan(recipes, id('두꺼운 옷감'), 1).unknown.map(u => [ko(u.item), u.why]), [['두꺼운 양털', 'qty']]);
  const self = craftPlan(recipes, id('최상급 목재+'), 1);
  assert.deepEqual(self.unknown.map(u => [ko(u.item), u.why]), [['최상급 목재+', 'self']]);
  assert.ok(!self.base.some(b => b.item === id('최상급 목재+')));
});

test('「/材料」の形は、作る品物が先頭で、元の材料は個数の多い順', () => {
  const steel = baseMaterials(recipes, id('강철괴'), 1);
  assert.deepEqual(steel.steps.map(s => s.item.ko), ['강철괴', '철괴']);
  assert.deepEqual(steel.base.map(b => [b.item.ko, b.qty]), [['광석', 20], ['석탄', 4]]);
});

test('公開するデータは、参照が切れていない', () => {
  const items = new Map(crafting.items.map(i => [i.id, i])), places = new Map(crafting.destinations.map(d => [d.id, d]));
  const checks = new Set(Object.keys(crafting.checks)), sources = new Set(crafting.sources.map(s => s.id));
  assert.match(crafting.revision, /^[0-9a-f]{12}$/);
  assert.equal(examples.revision, crafting.revision);
  for (const d of crafting.destinations) {
    assert.ok(checks.has(d.check) && checks.has(d.yieldsCheck) && sources.has(d.yieldsSource) && (d.areaCheck === null || checks.has(d.areaCheck)), d.id);
    assert.ok(d.tool === null || checks.has(d.toolCheck), d.id);
    for (const y of d.yields) assert.ok(y.item === null ? y.sure === null : items.has(y.item) && typeof y.sure === 'boolean', `${d.id} ${y.name}`);
  }
  for (const i of crafting.items) {
    for (const s of i.sources) assert.ok(places.get(s).yields.some(y => y.item === i.id), i.ko);
    assert.equal(i.obtain, i.craftable ? 'craft' : i.sources.length ? 'gather' : 'unknown', i.ko);
    assert.equal(i.sourceKnown, i.obtain !== 'unknown', i.ko);
    assert.ok(!(i.jaConfirmed && i.jaSeen), i.ko);
  }
  for (const s of crafting.sections) assert.ok(sources.has(s.source), s.id);
  // 採集図鑑に載せた行き先は、全部入っている。
  for (const s of portal.gathering.skills) for (const d of s.destinations) assert.ok(places.has(`${s.id}:${d.name}`), d.name);
});

test('使えない作り方、勧める作り方、画面の字を持っている', () => {
  const items = new Map(crafting.items.map(i => [i.id, i]));
  for (const x of crafting.recipes) {
    assert.equal(x.usable, !x.materials.some(m => m.self), x.id);
    assert.equal(x.usableNote === null, x.usable, x.id);
    if (!x.usable) assert.equal(items.get(x.item).gatherOnly, false, x.id);
  }
  for (const i of crafting.items) {
    assert.deepEqual(i.recipes, crafting.recipes.filter(x => x.item === i.id).map(x => x.id), i.ko);
    assert.ok(i.recommendedRecipe === null ? i.recommendedWhy === null : i.recipes.length > 1 && i.recipes.includes(i.recommendedRecipe) && i.recommendedWhy, i.ko);
  }
  assert.equal(items.get(id('철괴')).recommendedRecipe, crafting.recipes.filter(x => x.item === id('철괴'))[1].id);
  const station = sid => crafting.stations.find(s => s.id === sid);
  assert.deepEqual(station('wood-facility').aliases.map(a => a.name), ['木材加工']);
  assert.deepEqual(station('cooking-bench').aliases, []);
  assert.equal(station('no-bench').jaCheck, null);
  const steak = crafting.recipes.find(x => x.item === id('크림소스 스테이크'));
  assert.deepEqual([steak.group.ja, steak.group.jaConfirmed, steak.skill.ja, steak.skill.jaConfirmed, steak.jpChecked], ['STR特化', true, '料理', true, true]);
  assert.equal(crafting.gatherRun.max, 10);
  const thick = crafting.destinations.find(d => d.id === 'logging:太い木'), tree = crafting.destinations.find(d => d.id === 'logging:チクチクの木');
  assert.deepEqual([thick.yieldsCheck, thick.yields.map(y => y.check)], ['screen', ['screen']]);
  assert.deepEqual([tree.yieldsCheck, tree.yields.map(y => y.check)], ['media', ['media', 'media']]);
  assert.ok(crafting.recipes.find(x => x.item === id('부드러운 목재')).jpNote);
  assert.equal(crafting.recipes.find(x => x.item === id('목재')).jpNote, null);
  const time = ko => { const x = crafting.recipes.find(x => x.item === id(ko)); return [x.seconds, x.secondsCheck, x.secondsTable, x.secondsNote !== null]; };
  assert.deepEqual(time('목재'), [45, 'screen', 45, false]);
  assert.deepEqual(time('목재+'), [360, 'screen', 540, true]);
  assert.deepEqual(time('상급 목재'), [6000, 'screen', 7200, true]);
  assert.deepEqual(time('합금강괴'), [6000, 'screen', 7200, true]);
  assert.deepEqual(time('철괴'), [30, 'screen', 30, false]);
  assert.deepEqual(time('강철괴'), [300, 'screen', 480, true]);
  assert.deepEqual(time('크림소스 스테이크'), [null, null, null, false]);
  for (const x of crafting.recipes) assert.ok(x.secondsCheck === null ? x.seconds === null : x.secondsCheck in crafting.checks, x.id);
});

test('名前まで確かで採集だけで揃う品物は、全部、答えの例に入っている', () => {
  const sure = crafting.items.filter(i => i.gatherOnlySure);
  assert.ok(sure.length >= 13);
  const inExamples = new Set(examples.cases.map(c => c.input.item));
  for (const i of sure) assert.ok(inExamples.has(i.id), i.ko);
  for (const c of examples.cases) assert.deepEqual(c.output, craftPlan(recipes, c.input.item, c.input.count, { have: c.input.have, prefer: c.input.prefer }), c.id);
});

test('中身が同じなら revision は同じで、変われば変わる', () => {
  assert.equal(buildCrafting(recipes, portal, extra).crafting.revision, crafting.revision);
  const changed = structuredClone(extra);
  changed.recommendedLv['목재'] = 5;
  assert.notEqual(buildCrafting(recipes, portal, changed).crafting.revision, crafting.revision);
});
