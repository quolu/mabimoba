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

// ---- 選ぶ画面 ----
// 「/材料」の後は、分類 → グループ（ある時だけ）→ 品物 の順に、一覧から選ぶ。
// どこまで選んだかは、部品の custom_id に持たせる（mat:<種類>:<個数>:<分類>:<グループ>:<ページ>）。
const PAGE = 25;
const row = (...components) => ({ type: 1, components });
const select = (custom_id, placeholder, options) => ({ type: 3, custom_id, placeholder, options });
const button = (custom_id, label, style = 2, disabled = false) => ({ type: 2, custom_id, label, style, disabled });
const clip = (text, max = 100) => (text.length > max ? text.slice(0, max - 1) + '…' : text);
const menu = (content, components) => ({ content, embeds: [], components, allowed_mentions: { parse: [] } });

export function groupsOf(recipes, sectionId) {
  const groups = [];
  for (const x of recipes.recipes.filter(x => x.section === sectionId)) {
    const sub = x.group?.sub;
    const key = (x.group?.ko ?? '') + (sub ? '/' + sub.ko : '');
    let g = groups.find(g => g.key === key);
    if (!g) groups.push(g = { key, ja: (x.group?.ja ?? '') + (sub ? ' ＞ ' + sub.ja : ''), recipes: [] });
    if (!g.recipes.some(y => y.item === x.item)) g.recipes.push(x);
  }
  return groups;
}

export function sectionMenu(recipes, count) {
  const options = recipes.sections.map(s => ({ label: s.ja, value: s.id, description: `${s.kind === 'process' ? '加工' : '製作'} · ${new Set(recipes.recipes.filter(x => x.section === s.id).map(x => x.item)).size}品` }));
  return menu(`**材料を調べる**（${count}個ぶん）\nまず、作りたい物の分類を選んでください。`, [row(select(`mat:s:${count}`, '分類を選ぶ', options))]);
}

export function groupMenu(recipes, count, sectionId) {
  const section = recipes.sections.find(s => s.id === sectionId);
  if (!section) return sectionMenu(recipes, count);
  const groups = groupsOf(recipes, sectionId);
  if (groups.length < 2) return itemMenu(recipes, count, sectionId, 0, 0);
  const options = groups.slice(0, 25).map((g, i) => ({ label: clip(g.ja), value: String(i), description: `${g.recipes.length}品` }));
  return menu(`**${section.ja}**（${count}個ぶん）\n次に、グループを選んでください。`, [row(select(`mat:g:${count}:${sectionId}`, 'グループを選ぶ', options)), row(button(`mat:b:${count}`, '分類へ戻る'))]);
}

export function itemMenu(recipes, count, sectionId, groupIndex, page) {
  const section = recipes.sections.find(s => s.id === sectionId);
  if (!section) return sectionMenu(recipes, count);
  const groups = groupsOf(recipes, sectionId);
  const group = groups[groupIndex];
  if (!group) return groupMenu(recipes, count, sectionId);
  const pages = Math.max(1, Math.ceil(group.recipes.length / PAGE));
  const now = Math.min(Math.max(page, 0), pages - 1);
  const items = new Map(recipes.items.map(i => [i.id, i]));
  const stations = new Map(recipes.stations.map(s => [s.id, s]));
  const options = group.recipes.slice(now * PAGE, now * PAGE + PAGE).map(x => {
    const item = items.get(x.item);
    return { label: clip(label(item)), value: item.id, description: clip([stations.get(x.station).ja + (x.stationLv ? ` Lv.${x.stationLv}` : ''), x.skill ? `${x.skill.ja} Lv.${x.skillLv}` : ''].filter(Boolean).join(' ・ ')) };
  });
  const state = `${count}:${sectionId}:${groupIndex}`;
  const buttons = [];
  if (pages > 1) buttons.push(button(`mat:n:${state}:${now - 1}`, '前の25品', 2, now === 0), button(`mat:n:${state}:${now + 1}`, '次の25品', 2, now === pages - 1));
  buttons.push(groups.length > 1 ? button(`mat:c:${count}:${sectionId}`, 'グループへ戻る') : button(`mat:b:${count}`, '分類へ戻る'));
  const title = group.ja ? `${section.ja} ＞ ${group.ja}` : section.ja;
  return menu(`**${title}**（${count}個ぶん）${pages > 1 ? `　${now + 1}／${pages}ページ` : ''}\n品物を選んでください。＊は仮訳の名前です。`, [row(select(`mat:i:${state}:${now}`, '品物を選ぶ', options)), row(...buttons)]);
}

// 選んだ品物の結果。自分にだけ見える返事に、チャンネルへ出すボタンを付ける。
export function resultMenu(recipes, count, itemId, origin) {
  const item = recipes.items.find(i => i.id === itemId);
  const payload = materialPayload(recipes, item, count, origin);
  const recipe = item && recipes.recipes.find(x => x.item === item.id);
  const back = recipe ? button(`mat:c:${count}:${recipe.section}`, '選び直す') : button(`mat:b:${count}`, '分類へ戻る');
  return { content: payload.content ?? '', embeds: payload.embeds ?? [], components: [row(...(payload.embeds ? [button(`mat:p:${count}:${itemId}`, 'このチャンネルに表示', 1)] : []), back)], allowed_mentions: { parse: [] } };
}

// custom_id から、次に出す画面を決める。publish が true の時は、チャンネルに見える返事として出す。
export function route(recipes, customId, values, origin) {
  const [prefix, kind, rawCount, a, b, c] = String(customId).split(':');
  if (prefix !== 'mat') return null;
  const count = Math.min(Math.max(Number.parseInt(rawCount, 10) || 1, 1), 999);
  const first = values?.[0];
  if (kind === 's') return { payload: groupMenu(recipes, count, first) };
  if (kind === 'g') return { payload: itemMenu(recipes, count, a, Number.parseInt(first, 10) || 0, 0) };
  if (kind === 'n') return { payload: itemMenu(recipes, count, a, Number.parseInt(b, 10) || 0, Number.parseInt(c, 10) || 0) };
  if (kind === 'i') return { payload: resultMenu(recipes, count, first, origin) };
  if (kind === 'c') return { payload: groupMenu(recipes, count, a) };
  if (kind === 'p') return { publish: true, payload: materialPayload(recipes, recipes.items.find(i => i.id === a), count, origin) };
  return { payload: sectionMenu(recipes, count) };
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
  if (!item) return plain('その品物は、製作・加工の一覧に見つかりませんでした。もう一度「/材料」から選んでください。');
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
