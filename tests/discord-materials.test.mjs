import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { searchItems, resolveItem, materialPayload, createRecipeCache } from '../bot/materials.mjs';
import { baseMaterials } from '../scripts/recipes.mjs';

const recipes = JSON.parse(await readFile(new URL('../content/recipes.json', import.meta.url), 'utf8'));
const id = ko => recipes.items.find(i => i.ko === ko).id;
const origin = 'https://example.test';

test('候補は作り方のある品物だけで、日本語と韓国語のどちらでも探せる', () => {
  const ja = searchItems(recipes, 'インゴット');
  assert.ok(ja.length > 3 && ja.length <= 25);
  assert.ok(ja.every(c => c.name.length <= 100 && recipes.items.find(i => i.id === c.value).craftable));
  assert.equal(searchItems(recipes, '철괴')[0].value, id('철괴'));
  assert.equal(searchItems(recipes, '鉱石').length, 0);
  assert.equal(searchItems(recipes, '').length, 25);
});

test('途中の品物は、できる個数で割って回数を切り上げ、元の材料まで辿る', () => {
  const steel = baseMaterials(recipes, id('강철괴'), 1);
  assert.deepEqual(steel.base.map(b => [b.item.ko, b.qty]), [['광석', 20], ['석탄', 4]]);
  assert.deepEqual(steel.steps.map(s => [s.item.ko, s.times, s.makes]), [['강철괴', 1, 3], ['철괴', 1, 3]]);
  const four = baseMaterials(recipes, id('강철괴'), 4);
  assert.deepEqual(four.base.map(b => [b.item.ko, b.qty]), [['광석', 40], ['석탄', 8]]);
  const steak = baseMaterials(recipes, id('크림소스 스테이크'), 1);
  assert.deepEqual(Object.fromEntries(steak.base.map(b => [b.item.ko, b.qty])), { '우유': 12, '고기': 10, '달걀': 6, '후추': 3, '설탕': 2, '마늘': 2 });
});

test('返事は埋め込み1つで、Discordの文字数の上限に収まる', () => {
  for (const item of recipes.items.filter(i => i.craftable)) {
    const payload = materialPayload(recipes, item, 999, origin);
    const embed = payload.embeds[0];
    assert.ok(embed.title.length <= 256 && embed.description.length <= 4096 && embed.footer.text.length <= 2048, item.ko);
    assert.ok(embed.fields.length >= 1 && embed.fields.every(f => f.value.length >= 1 && f.value.length <= 1024 && f.name.length <= 256), item.ko);
    assert.ok(embed.url.startsWith(origin + '/recipes/'), item.ko);
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
  }
});

test('見つからない名前と、作り方の無い材料は、文で返す', () => {
  assert.match(materialPayload(recipes, resolveItem(recipes, 'そんな品物は無い'), 1, origin).content, /見つかりません/);
  const ore = resolveItem(recipes, '鉱石');
  assert.equal(ore.ko, '광석');
  assert.match(materialPayload(recipes, ore, 1, origin).content, /作り方は、製作・加工の一覧に載っていません/);
  assert.equal(resolveItem(recipes, id('철괴')).ko, '철괴');
  assert.equal(resolveItem(recipes, 'アイアンインゴット').ko, '철괴');
});

test('個数の分からない材料は、別の欄に出す', () => {
  const payload = materialPayload(recipes, resolveItem(recipes, '두꺼운 옷감'), 1, origin);
  assert.ok(payload.embeds[0].fields.some(f => f.name === '個数が分からない材料' && f.value.includes('厚い羊毛')));
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
