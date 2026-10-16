import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { planNotifications } from '../scripts/discord-updates.mjs';

const portal = JSON.parse(await readFile(new URL('../content/portal.json', import.meta.url), 'utf8'));
const origin = 'https://mabimoba.kitepon.dev';
const current = () => structuredClone(portal);
const day = items => ({ date: '2026-10-08', summary: '試験', items });

test('実データの全項目を1ページ1通で、文字数制限内に収める', () => {
  const batches = planNotifications(portal, [], origin);
  assert.equal(batches.flatMap(batch => batch.keys).length, portal.changelog.flatMap(day => day.items).length);
  assert.equal(new Set(batches.map(batch => batch.date + batch.page)).size, batches.length);
  for (const batch of batches) {
    assert.deepEqual(batch.payload.allowed_mentions, { parse: [] });
    assert.equal(batch.payload.embeds.length, 1);
    const embed = batch.payload.embeds[0];
    assert.equal(embed.fields, undefined);
    assert.equal(batch.keys.length, batch.lines.length);
    assert.ok([...embed.title].length <= 256 && [...embed.description].length <= 4096);
    assert.ok([embed.title, embed.description, embed.footer.text].join('').length <= 6000);
    assert.ok(embed.url.startsWith(origin + '/'));
  }
  // 最新日に韓国版の項目が無い日もあるので、地域は全日分で確かめる。
  const footers = batches.map(batch => batch.payload.embeds[0].footer.text);
  assert.ok(footers.some(text => text.includes('日本版')) && footers.some(text => text.includes('韓国版')));
});

test('同じページの更新は1通にまとめ、ニュースは1件ずつ別の通にする', () => {
  const data = current();
  data.changelog = [day([
    { type: '記事の更新', text: '節を足した', url: '/guides/crafting/#section-7' },
    { type: 'ニュース', text: 'ニュースA', url: '/news/#a' },
    { type: '記事の更新', text: '表を直した', url: '/guides/crafting/' },
    { type: 'ニュース', text: 'ニュースB', url: '/news/#b' }
  ])];
  const batches = planNotifications(data, [], origin);
  assert.deepEqual(batches.map(batch => batch.page), ['/guides/crafting/', '/news/#a', '/news/#b']);
  assert.equal(batches[0].keys.length, 2);
  assert.equal(batches[0].payload.embeds[0].url, origin + '/guides/crafting/');
  assert.equal(batches[0].payload.embeds[0].description, '**記事の更新**　節を足した\n**記事の更新**　表を直した');
  assert.equal(batches[1].payload.embeds[0].url, origin + '/news/#a');
  assert.equal(batches[1].payload.embeds[0].description, '**ニュース**');
});

test('ページの題名とカードの絵を見出しにする。カードが無いページは絵を付けない', () => {
  const data = current();
  data.changelog = [day([
    { type: '記事の更新', text: '節を足した', url: '/guides/crafting/#section-7' },
    { type: 'サイトの改良', text: '検索を直した', url: '/search/' }
  ])];
  const pages = new Map([['/guides/crafting/', { title: '製作を始める', image: origin + '/assets/cards/guides-crafting.jpg?v=1' }], ['/search/', { title: '攻略を検索' }]]);
  const [crafting, search] = planNotifications(data, [], origin, pages).map(batch => batch.payload.embeds[0]);
  assert.equal(crafting.title, '製作を始める');
  assert.deepEqual(crafting.image, { url: origin + '/assets/cards/guides-crafting.jpg?v=1' });
  assert.equal(crafting.url, origin + '/guides/crafting/#section-7');
  assert.equal(search.title, '攻略を検索');
  assert.equal(search.image, undefined);
});

test('再掲載された項目は重複させず、長すぎる項目は止める', () => {
  const data = current();
  const item = { type: 'サイトの改良', text: '一つ', url: '/updates/' };
  data.changelog = [day([item, item])];
  assert.equal(planNotifications(data, [], origin).flatMap(batch => batch.keys).length, 1);
  data.changelog = [day([{ ...item, text: '長'.repeat(1100) }])];
  assert.throws(() => planNotifications(data, [], origin), /DISCORD_ITEM_TOO_LONG/);
  data.changelog = [day([{ ...item, url: 'https://example.com/' }])];
  assert.throws(() => planNotifications(data, [], origin), /DISCORD_LINK_INVALID/);
});
