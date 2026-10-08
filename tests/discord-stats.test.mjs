import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createPublicHandler } from '../bot/public-http.mjs';

async function scenario(t) {
  const state = { connected: true, guilds: new Map([['111', { name: '非公開のサーバー' }]]) };
  const handle = createPublicHandler({ ready: () => state.connected, invite: () => 'https://discord.com/oauth2/authorize', guildCount: () => state.guilds.size });
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    if (!handle(request, response)) { response.writeHead(404); response.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { state, get: (path = '/stats', options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options) };
}

test('導入数だけを公開し、参加・退会を次の取得に反映する', async t => {
  const { state, get } = await scenario(t);
  const first = await get();
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await first.json(), { guildCount: 1 });
  state.guilds.set('222', { name: '別の非公開サーバー' });
  assert.deepEqual(await (await get()).json(), { guildCount: 2 });
  state.guilds.clear();
  assert.deepEqual(await (await get()).json(), { guildCount: 0 });
});

test('Discord未接続は503で示し、古い数や0件を返さない', async t => {
  const { state, get } = await scenario(t);
  state.connected = false;
  const response = await get();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'DISCORD_NOT_READY' });
});

test('統計の公開で配信操作を公開せず、既存の招待と稼働確認を保つ', async t => {
  const { get } = await scenario(t);
  assert.equal((await get('/notify', { method: 'POST' })).status, 404);
  assert.equal((await get('/stats', { method: 'POST' })).status, 404);
  assert.deepEqual(await (await get('/healthz')).json(), { status: 'ok' });
  const invite = await get('/invite', { redirect: 'manual' });
  assert.equal(invite.status, 302);
  assert.equal(invite.headers.get('location'), 'https://discord.com/oauth2/authorize');
});
