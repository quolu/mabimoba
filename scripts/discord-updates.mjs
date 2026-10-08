import { createHash } from 'node:crypto';

const digest = text => createHash('sha256').update(text).digest('hex');
const itemKey = (date, item) => `${date}:${digest(item.type + item.text).slice(0, 16)}`;
const markdown = text => text.replace(/[\\`*_{}\[\]()<>#|~]/g, '\\$&');
const units = text => text.length;

function itemField(data, item, origin, date) {
  const url = new URL(item.url ?? `/updates/#u-${date}`, origin);
  if (url.origin !== origin) throw new Error('DISCORD_LINK_INVALID: サイト外への更新リンクです');
  const article = data.articles.find(row => url.pathname === `/guides/${row.id}/`);
  const news = url.pathname === '/news/' ? data.news.find(row => url.hash === `#${row.id}`) : null;
  const post = url.pathname === '/community/' ? data.social.find(row => url.hash === `#post-${row.id}`) : null;
  const sourceIds = article?.sources ?? (news ? [news.source] : post?.corroboratedBy ? [post.corroboratedBy] : []);
  const sources = sourceIds.map(id => {
    const source = data.sources.find(row => row.id === id);
    if (!source) throw new Error(`DISCORD_SOURCE_MISSING: ${id}`);
    return source;
  });
  const region = article?.region ?? (news ? news.region ?? '韓国版' : post?.region);
  const reference = sources[0];
  const referenceText = reference ? `\n代表出典：[${markdown(reference.title)}](${reference.url})（資料基準 ${reference.asOf ?? '記載なし'}）\n出典の全件と確認日はリンク先に掲載` : '';
  return {
    name: item.type + (region ? ` · ${region}` : ''),
    value: `[${markdown(item.text)}](${url.href})` + referenceText
  };
}

// Atomと同じ日付・type・textを通知の識別に使う。同日の追記も個別に拾う。
export function planNotifications(data, seen, origin) {
  const batches = [];
  const planned = new Set(seen);
  for (const day of [...data.changelog].reverse()) {
    let fields = [], keys = [];
    function flush() {
      if (!fields.length) return;
      const id = digest(keys.join('\n')).slice(0, 16);
      const payload = { allowed_mentions: { parse: [] }, embeds: [{
        title: `サイトの更新情報 · ${day.date}`, url: `${origin}/updates/#u-${day.date}`,
        description: day.summary, color: 0x327a62, fields,
        footer: { text: `海外情報は日本版への適用を確認 · 日本語名は一部仮訳 · 通知ID ${id}` }
      }] };
      batches.push({ id, date: day.date, keys, payload });
      fields = []; keys = [];
    }
    const overhead = units(`サイトの更新情報 · ${day.date}`) + units(day.summary) + 90;
    if (units(day.summary) > 4096 || overhead > 6000) throw new Error(`DISCORD_SUMMARY_TOO_LONG: ${day.date}`);
    for (const item of day.items) {
      const key = itemKey(day.date, item);
      if (planned.has(key)) continue;
      const field = itemField(data, item, origin, day.date);
      if (units(field.name) > 256 || units(field.value) > 1024 || overhead + units(field.name) + units(field.value) > 6000) {
        throw new Error(`DISCORD_ITEM_TOO_LONG: ${day.date}/${item.type}`);
      }
      const length = fields.reduce((sum, row) => sum + units(row.name) + units(row.value), overhead);
      if (fields.length === 25 || length + units(field.name) + units(field.value) > 6000) flush();
      fields.push(field); keys.push(key); planned.add(key);
    }
    flush();
  }
  return batches;
}

