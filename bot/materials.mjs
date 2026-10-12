// 「/材料」コマンドの中身。品物の名前から、集める材料（作り方が載っていない物）までを辿って返す。
// Discordの部品を使わないので、単体で試験できる。
import { baseMaterials, recipeHref } from '../scripts/recipes.mjs';

const fold = text => String(text).normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const label = item => item.ja + (item.jaConfirmed ? '' : '＊');

export function createRecipeCache(origin, fetcher = fetch, ttl = 600000, now = () => Date.now()) {
  let value = null, loadedAt = 0, pending = null;
  const fetchOnce = async () => {
    const response = await fetcher(origin + '/data/recipes.json', { headers: { 'User-Agent': 'mabimoba-discord/1.0' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`DISCORD_PUBLIC_HTTP_${response.status}`);
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.items) || !Array.isArray(data.recipes)) throw new Error('DISCORD_RECIPES_INVALID');
    value = data; loadedAt = now();
    return data;
  };
  const refresh = () => pending ??= fetchOnce().finally(() => { pending = null; });
  return {
    // 古くなったデータは、次の取得が済むまでそのまま返す。取得に失敗しても、前のデータで答える。
    load: async () => {
      if (!value) return refresh();
      if (now() - loadedAt > ttl) refresh().catch(() => {});
      return value;
    }
  };
}

export function searchItems(recipes, query, limit = 25) {
  const q = fold(query ?? '');
  const rows = recipes.items.filter(i => i.craftable).map(i => ({ item: i, ja: fold(i.ja), ko: fold(i.ko) }));
  const hit = q ? rows.filter(r => r.ja.includes(q) || r.ko.includes(q)) : rows;
  const rank = r => (r.ja === q || r.ko === q ? 0 : r.ja.startsWith(q) || r.ko.startsWith(q) ? 1 : 2);
  return hit.sort((a, b) => rank(a) - rank(b) || a.item.ja.length - b.item.ja.length || a.item.ja.localeCompare(b.item.ja, 'ja'))
    .slice(0, limit).map(r => ({ name: `${label(r.item)}（${r.item.ko}）`.slice(0, 100), value: r.item.id }));
}

export function resolveItem(recipes, value) {
  const byId = recipes.items.find(i => i.id === value);
  if (byId) return byId;
  const q = fold(value ?? '');
  if (!q) return null;
  const exact = recipes.items.find(i => fold(i.ja) === q || fold(i.ko) === q);
  if (exact) return exact;
  const first = searchItems(recipes, value, 1)[0];
  return first ? recipes.items.find(i => i.id === first.value) : null;
}

const lines = (rows, max = 1000) => {
  const out = [];
  let size = 0;
  for (const [index, row] of rows.entries()) {
    if (size + row.length + 1 > max - 12) { out.push(`ほか${rows.length - index}件`); break; }
    out.push(row); size += row.length + 1;
  }
  return out.join('\n');
};

export function materialPayload(recipes, item, count, origin) {
  const plain = content => ({ content, allowed_mentions: { parse: [] } });
  if (!item) return plain('その名前の品物は、製作・加工の一覧に見つかりませんでした。名前の一部を入れると、候補が出ます。');
  if (!item.craftable) return plain(`「${item.ja}」の作り方は、製作・加工の一覧に載っていません。採集や購入で集める材料と見られます。\n${origin}/recipes/`);
  const result = baseMaterials(recipes, item.id, count);
  const top = result.steps[0];
  const recipe = recipes.recipes.find(x => x.id === top.recipe);
  const station = recipes.stations.find(s => s.id === recipe.station);
  const several = recipes.recipes.filter(x => x.item === item.id).length > 1;
  const condition = [station.ja + (recipe.stationLv ? ` Lv.${recipe.stationLv}` : ''), recipe.skill ? `${recipe.skill.ja} Lv.${recipe.skillLv}` : ''].filter(Boolean).join(' ・ ');
  const fields = [{ name: '集める材料', value: lines(result.base.map(b => `・${label(b.item)} ×${b.qty}`)) || '（個数の分かる材料がありません）' }];
  const middle = result.steps.slice(1);
  if (middle.length) fields.push({ name: '途中で作る物', value: lines(middle.map(s => `・${label(s.item)}：${s.times}回（${s.makes}個できる）`)) });
  if (result.unknown.length) fields.push({ name: '個数が分からない材料', value: lines(result.unknown.map(u => `・${label(u)}`)) });
  return {
    embeds: [{
      title: `${label(item)} を${count}個そろえる材料`.slice(0, 256),
      url: origin + recipeHref(recipe),
      color: 3308130,
      description: [`${condition} で、製作を${top.times}回（${top.makes}個できる）。`, several ? '作り方が2つ以上ある品物は、一覧の最初の作り方で計算しています。' : '', '途中の品物は、1回でできる個数で割って、回数を切り上げています。'].filter(Boolean).join('\n'),
      fields,
      footer: { text: '韓国版の資料による計算 · 日本版では個数や品物が違う事があります · ＊は仮訳の名前' }
    }],
    allowed_mentions: { parse: [] }
  };
}
