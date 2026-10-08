import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planNotifications } from '../scripts/discord-updates.mjs';

const portal = JSON.parse(await readFile(new URL('../content/portal.json', import.meta.url), 'utf8'));
const origin = 'https://mabimoba.kitepon.dev';
const current = () => structuredClone(portal);

test('実データの全項目を文字数制限内で通知でき、地域と出典・リンクを保つ', () => {
  const batches = planNotifications(portal, [], origin);
  assert.equal(batches.flatMap(batch => batch.keys).length, portal.changelog.flatMap(day => day.items).length);
  for (const { payload } of batches) {
    assert.deepEqual(payload.allowed_mentions, { parse: [] });
    const embed = payload.embeds[0];
    assert.ok(embed.fields.length <= 25);
    assert.ok(embed.fields.every(field => field.name.length <= 256 && field.value.length <= 1024));
    assert.ok([embed.title, embed.description, embed.footer.text, ...embed.fields.flatMap(field => [field.name, field.value])].join('').length <= 6000);
  }
  const latest = batches.at(-1).payload.embeds[0];
  assert.ok(latest.fields.some(field => field.name.includes('日本版') && field.value.includes('出典')));
  assert.ok(latest.fields.some(field => field.name.includes('韓国版')));
});

test('長い日次通知は項目の境目で分割し、再掲載された項目は重複させない', () => {
  const data = current();
  const items = Array.from({ length: 40 }, (_, i) => ({ type: 'サイトの改良', text: `${i}番 ${'あ'.repeat(300)}`, url: '/updates/' }));
  data.changelog = [{ date: '2026-10-08', summary: '大量の更新', items: [...items, items[0]] }];
  const batches = planNotifications(data, [], origin);
  assert.ok(batches.length > 2);
  assert.equal(batches.flatMap(batch => batch.keys).length, 40);
  assert.throws(() => planNotifications({ ...data, changelog: [{ ...data.changelog[0], items: [{ ...items[0], text: '長'.repeat(1100) }] }] }, [], origin), /DISCORD_ITEM_TOO_LONG/);
});

