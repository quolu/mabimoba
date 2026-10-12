import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleInteraction } from '../bot/commands.mjs';

const recipes = JSON.parse(await readFile(new URL('../content/recipes.json', import.meta.url), 'utf8'));
function scenario({ autocomplete = false, focused = '', item = 'アイアンインゴット', count = null, load = async () => recipes } = {}) {
  const calls = [], errors = [];
  const interaction = { commandName: '材料', deferred: false,
    isAutocomplete: () => autocomplete, isChatInputCommand: () => !autocomplete,
    options: { getFocused: () => focused, getString: () => item, getInteger: () => count },
    respond: async value => calls.push(['respond', value]),
    deferReply: async value => { interaction.deferred = true; calls.push(['defer', value]); },
    editReply: async value => calls.push(['edit', value]) };
  const deps = { loadRecipes: load, origin: 'https://example.test', logError: (kind, error) => errors.push([kind, error.message]),
    delivery: { start: () => assert.fail('通知の設定を触った'), stop: () => assert.fail('通知の設定を触った') }, store: { data: { stopped: [], subscriptions: {} } }, loadSnapshot: () => assert.fail('通知の内容を読んだ') };
  return { interaction, deps, calls, errors };
}

test('入力の途中で、候補を25件までで返す', async () => {
  const row = scenario({ autocomplete: true, focused: 'ソード' });
  await handleInteraction(row.interaction, row.deps);
  assert.equal(row.calls.length, 1);
  const [kind, choices] = row.calls[0];
  assert.equal(kind, 'respond');
  assert.ok(choices.length > 0 && choices.length <= 25 && choices.every(c => c.name.includes('ソード')));
});
test('候補の取得に失敗したら、空の候補を返して記録する', async () => {
  const row = scenario({ autocomplete: true, load: async () => { throw new Error('down'); } });
  await handleInteraction(row.interaction, row.deps);
  assert.deepEqual(row.calls, [['respond', []]]);
  assert.deepEqual(row.errors, [['materials-autocomplete-failed', 'down']]);
});
test('権限を見ずに、誰からでも材料を返す。返事はチャンネルに見える形', async () => {
  const row = scenario({ item: recipes.items.find(i => i.ko === '강철괴').id, count: 4 });
  await handleInteraction(row.interaction, row.deps);
  assert.deepEqual(row.calls[0], ['defer', undefined]);
  const embed = row.calls[1][1].embeds[0];
  assert.match(embed.title, /を4個そろえる材料/);
  assert.match(embed.fields[0].value, /鉱石 ×40/);
  assert.match(embed.fields[1].value, /アイアンインゴット：2回（6個できる）/);
  assert.deepEqual(row.errors, []);
});
test('個数を省くと1個で計算する', async () => {
  const row = scenario();
  await handleInteraction(row.interaction, row.deps);
  assert.match(row.calls[1][1].embeds[0].title, /を1個そろえる材料/);
});
test('計算に失敗したら、保留した返事を失敗の文に替える', async () => {
  const row = scenario({ load: async () => { throw new Error('down'); } });
  await handleInteraction(row.interaction, row.deps);
  assert.equal(row.calls[1][0], 'edit');
  assert.match(row.calls[1][1], /失敗しました/);
  assert.deepEqual(row.errors, [['materials-failed', 'down']]);
});
