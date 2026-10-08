import test from 'node:test';
import assert from 'node:assert/strict';
import { handleInteraction } from '../bot/commands.mjs';
function scenario({ manager = true, guild = true, permissions = true, type = 0, action = '開始' } = {}) {
  const messages = [], calls = [];
  const interaction = { commandName: 'マビモバ', guildId: '111', channelId: '222', channel: { type }, deferred: false,
    isChatInputCommand: () => true, inGuild: () => guild,
    memberPermissions: { has: () => manager }, appPermissions: { has: () => permissions },
    options: { getSubcommand: () => action }, reply: async value => messages.push(value),
    deferReply: async () => { interaction.deferred = true; calls.push('defer'); }, editReply: async value => messages.push(value) };
  const deps = { delivery: { start: async (guildId, channelId) => calls.push(['start', guildId, channelId]), stop: async guildId => calls.push(['stop', guildId]) },
    store: { data: { subscriptions: { '111': { channelId: '222' }, '999': { channelId: '888' } } } },
    loadSnapshot: async () => { calls.push('snapshot'); return {}; }, logError: () => assert.fail('予期しないエラー') };
  return { interaction, deps, messages, calls };
}

test('管理権限のない利用者とDMからは登録・停止できない', async () => {
  for (const options of [{ manager: false }, { guild: false }]) {
    const row = scenario(options); await handleInteraction(row.interaction, row.deps);
    assert.deepEqual(row.calls, []); assert.match(row.messages[0].content, /権限/);
  }
});
test('投稿権限不足とスレッドからは登録を作らない', async () => {
  for (const options of [{ permissions: false }, { type: 11 }]) {
    const row = scenario(options); await handleInteraction(row.interaction, row.deps);
    assert.deepEqual(row.calls, ['defer']); assert.match(row.messages[0], /権限/);
  }
});
test('先に応答を保留し、呼出し元サーバーとチャンネルだけを登録する', async () => {
  const row = scenario(); await handleInteraction(row.interaction, row.deps);
  assert.deepEqual(row.calls, ['defer', 'snapshot', ['start', '111', '222']]);
});
test('停止と状態は呼出し元の登録だけを扱う', async () => {
  const stop = scenario({ action: '停止' }); await handleInteraction(stop.interaction, stop.deps);
  assert.deepEqual(stop.calls, ['defer', ['stop', '111']]);
  const status = scenario({ action: '状態' }); await handleInteraction(status.interaction, status.deps);
  assert.match(status.messages[0], /222/); assert.doesNotMatch(status.messages[0], /888/);
});
