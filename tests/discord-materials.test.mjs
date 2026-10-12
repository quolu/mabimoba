import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sectionMenu, groupMenu, itemMenu, resultMenu, route, groupsOf, materialPayload, createRecipeCache } from '../bot/materials.mjs';
import { baseMaterials } from '../scripts/recipes.mjs';

const recipes = JSON.parse(await readFile(new URL('../content/recipes.json', import.meta.url), 'utf8'));
const id = ko => recipes.items.find(i => i.ko === ko).id;
const origin = 'https://example.test';
// Discordの部品の上限：1通に5段まで、選ぶ欄は25件まで、文字は100字まで。
const assertComponents = payload => {
  assert.ok(payload.components.length >= 1 && payload.components.length <= 5);
  for (const line of payload.components) {
    assert.equal(line.type, 1);
    assert.ok(line.components.length >= 1 && line.components.length <= 5);
    for (const part of line.components) {
      assert.ok(part.custom_id.length <= 100, part.custom_id);
      if (part.type === 3) {
        assert.equal(line.components.length, 1);
        assert.ok(part.options.length >= 1 && part.options.length <= 25, part.custom_id);
        assert.equal(new Set(part.options.map(o => o.value)).size, part.options.length);
        for (const o of part.options) assert.ok(o.label.length >= 1 && o.label.length <= 100 && o.value.length <= 100 && (o.description ?? '').length <= 100, o.label);
      } else assert.ok(part.type === 2 && part.label.length <= 80);
    }
  }
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
};

test('最初の画面は、13の分類から選ぶ', () => {
  const payload = sectionMenu(recipes, 2);
  assertComponents(payload);
  assert.equal(payload.components[0].components[0].custom_id, 'mat:s:2');
  assert.deepEqual(payload.components[0].components[0].options.map(o => o.value), recipes.sections.map(s => s.id));
  assert.match(payload.content, /2個ぶん/);
});

test('分類を選ぶと、グループがある分類はグループを、無い分類は品物を選ぶ', () => {
  const weapons = route(recipes, 'mat:s:1', ['weapons'], origin).payload;
  assertComponents(weapons);
  assert.equal(weapons.components[0].components[0].custom_id, 'mat:g:1:weapons');
  assert.equal(weapons.components[0].components[0].options.length, 19);
  const metal = route(recipes, 'mat:s:1', ['metal-processing'], origin).payload;
  assertComponents(metal);
  assert.equal(metal.components[0].components[0].custom_id, 'mat:i:1:metal-processing:0:0');
  assert.ok(metal.components[0].components[0].options.some(o => o.value === id('철괴')));
});

test('どの分類・グループ・ページの画面も、Discordの部品の上限に収まり、全部の品物を選べる', () => {
  const reachable = new Set();
  for (const section of recipes.sections) {
    assertComponents(groupMenu(recipes, 999, section.id));
    for (const [g, group] of groupsOf(recipes, section.id).entries()) {
      for (let page = 0; page < Math.ceil(group.recipes.length / 25); page++) {
        const payload = itemMenu(recipes, 999, section.id, g, page);
        assertComponents(payload);
        for (const o of payload.components[0].components[0].options) reachable.add(o.value);
      }
    }
  }
  assert.deepEqual([...reachable].sort(), recipes.items.filter(i => i.craftable).map(i => i.id).sort());
});

test('25品を超えるグループは、前後のボタンでページを替える', () => {
  const first = itemMenu(recipes, 1, 'potion-processing', 0, 0);
  assert.equal(first.components[0].components[0].options.length, 25);
  const [prev, next, back] = first.components[1].components;
  assert.ok(prev.disabled && !next.disabled);
  assert.equal(back.custom_id, 'mat:b:1');
  const second = route(recipes, next.custom_id, undefined, origin).payload;
  assert.equal(second.components[0].components[0].options.length, 2);
  assert.ok(second.components[1].components[1].disabled);
  assert.match(second.content, /2／2ページ/);
});

test('品物を選ぶと結果が出て、チャンネルへ出すボタンと選び直すボタンが付く', () => {
  const picked = route(recipes, 'mat:i:4:metal-processing:0:0', [id('강철괴')], origin).payload;
  assertComponents(picked);
  assert.match(picked.embeds[0].title, /スチールインゴット を4個そろえる材料/);
  assert.match(picked.embeds[0].fields[0].value, /鉱石 ×40/);
  const [share, back] = picked.components[0].components;
  assert.equal(share.custom_id, `mat:p:4:${id('강철괴')}`);
  const shared = route(recipes, share.custom_id, undefined, origin);
  assert.equal(shared.publish, true);
  assert.equal(shared.payload.components, undefined);
  assert.match(shared.payload.embeds[0].fields[1].value, /アイアンインゴット：2回（6個できる）/);
  assert.equal(route(recipes, back.custom_id, undefined, origin).payload.components[0].components[0].custom_id, 'mat:i:4:metal-processing:0:0');
});

test('壊れた値や古い値は、最初の画面か一覧へ戻す', () => {
  assert.equal(route(recipes, 'other:1', [], origin), null);
  assert.equal(route(recipes, 'mat:s:abc', ['no-such-section'], origin).payload.components[0].components[0].custom_id, 'mat:s:1');
  assert.equal(route(recipes, 'mat:n:99999:weapons:77:5', undefined, origin).payload.components[0].components[0].custom_id, 'mat:g:999:weapons');
  assert.match(resultMenu(recipes, 1, 'i-missing', origin).content, /見つかりませんでした/);
});

test('途中の品物は、できる個数で割って回数を切り上げ、元の材料まで辿る', () => {
  const steel = baseMaterials(recipes, id('강철괴'), 1);
  assert.deepEqual(steel.base.map(b => [b.item.ko, b.qty]), [['광석', 20], ['석탄', 4]]);
  assert.deepEqual(steel.steps.map(s => [s.item.ko, s.times, s.makes]), [['강철괴', 1, 3], ['철괴', 1, 3]]);
  const steak = baseMaterials(recipes, id('크림소스 스테이크'), 1);
  assert.deepEqual(Object.fromEntries(steak.base.map(b => [b.item.ko, b.qty])), { '우유': 12, '고기': 10, '달걀': 6, '후추': 3, '설탕': 2, '마늘': 2 });
});

test('結果の埋め込みは、どの品物でもDiscordの文字数の上限に収まる', () => {
  for (const item of recipes.items.filter(i => i.craftable)) {
    const embed = materialPayload(recipes, item, 999, origin).embeds[0];
    assert.ok(embed.title.length <= 256 && embed.description.length <= 4096 && embed.footer.text.length <= 2048, item.ko);
    assert.ok(embed.fields.length >= 1 && embed.fields.every(f => f.value.length >= 1 && f.value.length <= 1024 && f.name.length <= 256), item.ko);
    assert.ok(embed.url.startsWith(origin + '/recipes/'), item.ko);
  }
  assert.ok(materialPayload(recipes, recipes.items.find(i => i.ko === '두꺼운 옷감'), 1, origin).embeds[0].fields.some(f => f.name === '個数が分からない材料' && f.value.includes('厚い羊毛')));
});

test('データは一度読んだら使い回し、取得に失敗しても前のデータで答える', async () => {
  let calls = 0, fail = false, time = 0;
  const fetcher = async () => { calls++; if (fail) throw new Error('down'); return { ok: true, json: async () => recipes }; };
  const cache = createRecipeCache(origin, fetcher, 1000, () => time);
  assert.equal((await cache.load()).recipes.length, recipes.recipes.length);
  await cache.load();
  assert.equal(calls, 1);
  time = 5000; fail = true;
  assert.equal((await cache.load()).recipes.length, recipes.recipes.length);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 2);
});
