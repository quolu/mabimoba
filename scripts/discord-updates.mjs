import { createHash } from 'node:crypto';

const digest = text => createHash('sha256').update(text).digest('hex');
const itemKey = (date, item) => `${date}:${digest(item.type + item.text).slice(0, 16)}`;
const markdown = text => text.replace(/[\\`*_{}\[\]()<>#|~]/g, '\\$&');
const clip = (text, max) => [...text].length > max ? [...text].slice(0, max - 1).join('') + '…' : text;

// 更新の行き先のページ。ニュースは1件ずつ別のページとして扱い、ほかは同じページの節をまとめる。
const pageKey = url => url.pathname === '/news/' && url.hash ? `/news/${url.hash}` : url.pathname;

function region(data, url) {
  const article = data.articles.find(row => url.pathname === `/guides/${row.id}/`);
  if (article) return article.region;
  const news = url.pathname === '/news/' ? data.news.find(row => url.hash === `#${row.id}`) : null;
  if (news) return news.region ?? '韓国版';
  const post = url.pathname === '/community/' ? data.social.find(row => url.hash === `#post-${row.id}`) : null;
  return post?.region;
}

// Atomと同じ日付・type・textを通知の識別に使う。同日の追記も個別に拾う。
// 1通は1ページ。ページの題名とカードの絵を見出しにし、本文はそのページで変わった事の一覧だけにする。
// pages は build が渡すページの題名とカード（key → { title, image }）。無い時は最初の項目の文を題名にする。
export function planNotifications(data, seen, origin, pages = new Map()) {
  const batches = [];
  const planned = new Set(seen);
  for (const day of [...data.changelog].reverse()) {
    const groups = new Map();
    for (const item of day.items) {
      const key = itemKey(day.date, item);
      if (planned.has(key)) continue;
      planned.add(key);
      const url = new URL(item.url ?? `/updates/#u-${day.date}`, origin);
      if (url.origin !== origin) throw new Error('DISCORD_LINK_INVALID: サイト外への更新リンクです');
      const page = pageKey(url);
      if (!groups.has(page)) groups.set(page, { url, regions: new Set(), keys: [], lines: [] });
      const group = groups.get(page);
      const area = region(data, url);
      if (area) group.regions.add(area);
      // ニュースは見出しが記事の題名そのものなので、本文に同じ文を繰り返さない。
      const line = page.startsWith('/news/#') ? `**${markdown(item.type)}**` : `**${markdown(item.type)}**　${markdown(item.text)}`;
      if ([...line].length > 1000) throw new Error(`DISCORD_ITEM_TOO_LONG: ${day.date}/${item.type}`);
      group.keys.push(key); group.lines.push(line);
    }
    for (const [page, group] of groups) {
      const id = digest(group.keys.join('\n')).slice(0, 16);
      const info = pages.get(page);
      const href = group.keys.length === 1 ? group.url.href : new URL(page, origin).href;
      const embed = {
        title: clip(info?.title ?? day.items.find(item => itemKey(day.date, item) === group.keys[0]).text, 256), url: href,
        description: group.lines.join('\n'), color: 0x327a62,
        footer: { text: `サイトの更新情報 · ${day.date}${group.regions.size ? ' · ' + [...group.regions].join('・') : ''} · 通知ID ${id}` }
      };
      if (info?.image) embed.image = { url: info.image };
      if ([...embed.description].length > 4096) throw new Error(`DISCORD_PAGE_TOO_LONG: ${day.date}${page}`);
      batches.push({ id, date: day.date, page, keys: group.keys, lines: group.lines, payload: { allowed_mentions: { parse: [] }, embeds: [embed] } });
    }
  }
  return batches;
}
