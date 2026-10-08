import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SubscriptionStore, DeliveryService, loadPublishedSnapshot } from '../bot/core.mjs';
import { planNotifications } from '../scripts/discord-updates.mjs';
const portal = JSON.parse(await readFile(new URL('../content/portal.json', import.meta.url)));
const origin = 'https://mabimoba.kitepon.dev';
const snapshot = () => ({ schemaVersion: 1, revision: '123456789abc', latestDate: portal.changelog[0].date, batches: planNotifications(portal, [], origin) });
async function setup(t, send) {
  const dir = await mkdtemp(join(tmpdir(), 'mabimoba-bot-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new SubscriptionStore(join(dir, 'subscriptions.json'));
  const posted = [];
  const api = { send: send ?? (async (channel, payload) => { posted.push({ channel, payload }); return { id: String(1000 + posted.length), channel_id: channel }; }), get: async () => assert.fail('不要な照合') };
  return { store, posted, api, service: new DeliveryService(store, api) };
}

test('複数サーバーが独立に登録でき、初回は最新日のみ、再配信は0件', async t => {
  const { service, store, posted } = await setup(t);
  await service.start('111', '222', snapshot());
  await service.start('333', '444', snapshot());
  assert.deepEqual(posted.map(row => row.channel), ['222', '444']);
  assert.ok(posted.every(row => row.payload.embeds[0].title.endsWith(portal.changelog[0].date)));
  assert.ok(posted.every(row => row.payload.enforce_nonce && row.payload.nonce.length <= 25));
  const result = await service.dispatch(snapshot());
  assert.ok(result.results.every(row => row.messages.length === 0));
  assert.equal(posted.length, 2);
  const reloaded = new SubscriptionStore(store.path);
  assert.equal(Object.keys(reloaded.data.subscriptions).length, 2);
});

test('同日の追記だけを全登録先へ送り、一部403でも他サーバーは配信する', async t => {
  const { service, api, posted, store } = await setup(t);
  await service.start('111', '222', snapshot()); await service.start('333', '444', snapshot());
  const changed = snapshot();
  const batch = structuredClone(changed.batches.at(-1));
  batch.keys = ['2026-10-08:new']; batch.payload.embeds[0].fields = [{ name: 'ニュース', value: '追記' }];
  changed.batches.push(batch);
  const normal = api.send;
  api.send = async (channel, payload) => { if (channel === '222') throw Object.assign(new Error('forbidden'), { status: 403 }); return normal(channel, payload); };
  const result = await service.dispatch(changed);
  assert.equal(result.ok, false);
  assert.equal(result.results[0].error, 'DISCORD_HTTP_403');
  assert.equal(result.results[1].messages.length, 1);
  assert.equal(posted.at(-1).payload.embeds[0].fields.length, 1);
  assert.equal(store.data.subscriptions['111'].pending, null);
  assert.equal(store.data.subscriptions['111'].seen.includes('2026-10-08:new'), false);
});

test('通信結果不明はサーバーごとに保留し、再起動後も自動再送しない', async t => {
  const { service, store, api } = await setup(t, async () => { throw new Error('timeout'); });
  await assert.rejects(service.start('111', '222', snapshot()), /DISCORD_DELIVERY_UNKNOWN/);
  assert.ok(store.data.subscriptions['111'].pending);
  const restarted = new DeliveryService(new SubscriptionStore(store.path), api);
  const result = await restarted.dispatch(snapshot());
  assert.equal(result.results[0].error, 'DISCORD_DELIVERY_PENDING');
  await assert.rejects(restarted.start('111', '999', snapshot()), /DISCORD_DELIVERY_PENDING/);
});

test('送信済みメッセージの本文を照合してから通知済みへ進む', async t => {
  const { service, store, api } = await setup(t, async () => { throw new Error('timeout'); });
  await assert.rejects(service.start('111', '222', snapshot()));
  const expected = store.data.subscriptions['111'].pending.payload;
  api.get = async () => ({ id: '987', channel_id: '222', embeds: [{ ...expected.embeds[0], title: '違う内容' }] });
  await assert.rejects(service.reconcile('111', '987'), /DISCORD_CONFIRM_MISMATCH/);
  api.get = async () => ({ id: '987', channel_id: '222', embeds: expected.embeds });
  assert.equal((await service.reconcile('111', '987')).mode, 'confirmed');
  assert.equal((await service.dispatch(snapshot())).results[0].messages.length, 0);
});

test('dry-runは送信・保存せず、停止で登録・通知履歴を削除する', async t => {
  const { service, store, posted } = await setup(t);
  await service.start('111', '222', snapshot());
  const before = await readFile(store.path, 'utf8');
  await service.dispatch(snapshot(), true);
  assert.equal(await readFile(store.path, 'utf8'), before);
  assert.equal(posted.length, 1);
  await service.stop('111');
  assert.deepEqual(new SubscriptionStore(store.path).data.subscriptions, {});
});

test('同時の開始・配信を直列化し、同じ項目を重複送信しない', async t => {
  const { service, posted } = await setup(t);
  await Promise.all([service.start('111', '222', snapshot()), service.start('111', '222', snapshot()), service.dispatch(snapshot())]);
  assert.equal(posted.length, 1);
});

test('HTTPSの配信内容とhealthが不一致なら通知しない', async () => {
  const good = snapshot();
  const fetcher = async url => Response.json(url.endsWith('/healthz') ? { status: 'ok', revision: good.revision } : good);
  assert.equal((await loadPublishedSnapshot(origin, fetcher)).revision, good.revision);
  await assert.rejects(loadPublishedSnapshot(origin, async url => Response.json(url.endsWith('/healthz') ? { status: 'ok', revision: 'bad' } : good)), /DISCORD_PUBLIC_REVISION_MISMATCH/);
});
