import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { handleInteraction } from '../bot/commands.mjs';

const recipes = JSON.parse(await readFile(new URL('../content/recipes.json', import.meta.url), 'utf8'));
const steel = recipes.items.find(i => i.ko === '강철괴').id;
function scenario({ kind = 'command', customId, values, count = null, load = async () => recipes } = {}) {
  const calls = [], errors = [];
  const interaction = { deferred: false,
    isChatInputCommand: () => kind === 'command', isStringSelectMenu: () => kind === 'select', isButton: () => kind === 'button',
    options: { getInteger: () => count },
    deferReply: async value => { interaction.deferred = true; calls.push(['deferReply', value]); },
    deferUpdate: async () => { interaction.deferred = true; calls.push(['deferUpdate']); },
    editReply: async value => calls.push(['edit', value]) };
  if (kind === 'command') interaction.commandName = '材料'; else { interaction.customId = customId; interaction.values = values; }
  const deps = { loadRecipes: load, origin: 'https://example.test', logError: (name, error) => errors.push([name, error.message]),
    delivery: { start: () => assert.fail('通知の設定を触った'), stop: () => assert.fail('通知の設定を触った') }, store: { data: { stopped: [], subscriptions: {} } }, loadSnapshot: () => assert.fail('通知の内容を読んだ') };
  return { interaction, deps, calls, errors };
}

test('「/材料」は、本人にだけ見える返事で分類を選ばせる。権限は見ない', async () => {
  const row = scenario({ count: 3 });
  await handleInteraction(row.interaction, row.deps);
  assert.deepEqual(row.calls[0], ['deferReply', { flags: 64 }]);
  assert.equal(row.calls[1][1].components[0].components[0].custom_id, 'mat:s:3');
  assert.deepEqual(row.errors, []);
});
test('選ぶたびに、同じ返事を次の画面へ書き替える', async () => {
  const section = scenario({ kind: 'select', customId: 'mat:s:1', values: ['weapons'] });
  await handleInteraction(section.interaction, section.deps);
  assert.deepEqual(section.calls[0], ['deferUpdate']);
  assert.equal(section.calls[1][1].components[0].components[0].custom_id, 'mat:g:1:weapons');
  const item = scenario({ kind: 'select', customId: 'mat:i:2:metal-processing:0:0', values: [steel] });
  await handleInteraction(item.interaction, item.deps);
  assert.deepEqual(item.calls[0], ['deferUpdate']);
  assert.match(item.calls[1][1].embeds[0].title, /スチールインゴット を2個そろえる材料/);
  const back = scenario({ kind: 'button', customId: 'mat:b:2' });
  await handleInteraction(back.interaction, back.deps);
  assert.equal(back.calls[1][1].components[0].components[0].custom_id, 'mat:s:2');
});
test('「このチャンネルに表示」は、みんなに見える新しい返事で出す', async () => {
  const row = scenario({ kind: 'button', customId: `mat:p:2:${steel}` });
  await handleInteraction(row.interaction, row.deps);
  assert.deepEqual(row.calls[0], ['deferReply', undefined]);
  assert.match(row.calls[1][1].embeds[0].fields[0].value, /鉱石 ×20/);
  assert.equal(row.calls[1][1].components, undefined);
});
test('データの取得に失敗したら、保留した返事を失敗の文に替えて記録する', async () => {
  for (const options of [{}, { kind: 'select', customId: 'mat:s:1', values: ['food'] }]) {
    const row = scenario({ ...options, load: async () => { throw new Error('down'); } });
    await handleInteraction(row.interaction, row.deps);
    assert.match(row.calls[1][1].content, /失敗しました/);
    assert.deepEqual(row.calls[1][1].components, []);
    assert.deepEqual(row.errors, [['materials-failed', 'down']]);
  }
});
