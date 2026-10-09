import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const hash = text => createHash('sha256').update(text).digest('hex');
export const failureCode = error => error.message?.startsWith('DISCORD_') ? error.message : Number.isInteger(error.status) ? `DISCORD_HTTP_${error.status}` : 'DISCORD_DELIVERY_UNKNOWN';

export class SubscriptionStore {
  constructor(path) {
    this.path = path;
    try { this.data = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; this.data = { schemaVersion: 2, subscriptions: {}, stopped: [] }; }
    const migrate = this.data.schemaVersion === 1;
    if (migrate) this.data = { ...this.data, schemaVersion: 2, stopped: [] };
    if (!Array.isArray(this.data.stopped) || this.data.schemaVersion !== 2 || !this.data.subscriptions || Array.isArray(this.data.subscriptions)) throw new Error('DISCORD_STATE_INVALID');
    for (const [id, row] of Object.entries(this.data.subscriptions)) {
      if (!/^\d+$/.test(id) || !/^\d+$/.test(row.channelId) || !Array.isArray(row.seen)) throw new Error('DISCORD_STATE_INVALID');
    }
    if (migrate) this.save();
  }
  save() {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    writeFileSync(this.path + '.tmp', JSON.stringify(this.data, null, 2) + '\n', { mode: 0o600 });
    renameSync(this.path + '.tmp', this.path);
  }
}

// 日次要約はその日の最初の通知だけに付ける。追記の通知へ同じ要約を付けると、毎回同じ書き出しになる。
const followUpSummary = fields => {
  const counts = new Map();
  for (const field of fields) { const type = field.name.split(' · ')[0]; counts.set(type, (counts.get(type) ?? 0) + 1); }
  return 'この日の追加分：' + [...counts].map(([type, count]) => `${type} ${count}件`).join('・');
};

export function pendingBatches(snapshot, seen) {
  const known = new Set(seen);
  const started = new Set(snapshot.batches.filter(batch => batch.keys.some(key => known.has(key))).map(batch => batch.date));
  return snapshot.batches.flatMap(batch => {
    const indexes = batch.keys.flatMap((key, i) => known.has(key) ? [] : [i]);
    if (!indexes.length) return [];
    const keys = indexes.map(i => batch.keys[i]);
    const id = hash(keys.join('\n')).slice(0, 16);
    const embed = batch.payload.embeds[0];
    const fields = indexes.map(i => embed.fields[i]);
    return [{ id, keys, payload: { ...batch.payload, embeds: [{ ...embed,
      description: started.has(batch.date) ? followUpSummary(fields) : embed.description,
      fields, footer: { text: embed.footer.text.replace(/通知ID [0-9a-f]+$/, `通知ID ${id}`) }
    }] } }];
  });
}

export class DeliveryService {
  constructor(store, api) { this.store = store; this.api = api; this.tail = Promise.resolve(); }
  // 状態ファイルの所有者は常駐プロセス一つ。コマンドと配信を同じ順番で処理する。
  serialize(operation) { const task = this.tail.then(operation, operation); this.tail = task; return task; }
  start(guildId, channelId, snapshot) {
    return this.serialize(() => this.startGuild(guildId, channelId, snapshot));
  }
  autoStart(guildId, snapshot, ensureChannel) {
    return this.serialize(async () => {
      if (this.store.data.stopped.includes(guildId) || this.store.data.subscriptions[guildId]) return { guildId, mode: 'unchanged' };
      return this.startGuild(guildId, await ensureChannel(), snapshot);
    });
  }
  async startGuild(guildId, channelId, snapshot) {
    const old = this.store.data.subscriptions[guildId];
    if (old?.channelId === channelId) return this.deliverGuild(guildId, snapshot);
    if (old?.pending) throw new Error('DISCORD_DELIVERY_PENDING');
    const seen = snapshot.batches.filter(batch => batch.date !== snapshot.latestDate).flatMap(batch => batch.keys);
    this.store.data.stopped = this.store.data.stopped.filter(id => id !== guildId);
    this.store.data.subscriptions[guildId] = { channelId, seen, pending: null, error: null, startedAt: new Date().toISOString() };
    this.store.save();
    return this.deliverGuild(guildId, snapshot);
  }
  stop(guildId) {
    return this.serialize(() => {
      delete this.store.data.subscriptions[guildId];
      this.store.data.stopped = [...new Set([...this.store.data.stopped, guildId])];
      this.store.save();
    });
  }
  removeGuild(guildId) {
    return this.serialize(() => {
      delete this.store.data.subscriptions[guildId];
      this.store.data.stopped = this.store.data.stopped.filter(id => id !== guildId);
      this.store.save();
    });
  }
  reconcile(guildId, messageId) {
    return this.serialize(async () => {
      const sub = this.store.data.subscriptions[guildId];
      if (!sub?.pending) throw new Error('DISCORD_NO_PENDING');
      const message = await this.api.get(sub.channelId, messageId);
      const expected = sub.pending.payload.embeds[0], actual = message.embeds?.[0];
      if (!actual || message.channel_id !== sub.channelId || actual.footer?.text !== expected.footer.text ||
        ['title', 'description', 'url'].some(key => actual[key] !== expected[key]) ||
        JSON.stringify(actual.fields?.map(({ name, value }) => ({ name, value }))) !== JSON.stringify(expected.fields)) throw new Error('DISCORD_CONFIRM_MISMATCH');
      this.acknowledge(sub, sub.pending, message);
      return { guildId, messageId, mode: 'confirmed' };
    });
  }
  retryUnsent(guildId, snapshot) {
    return this.serialize(async () => {
      const sub = this.store.data.subscriptions[guildId];
      if (!sub?.pending) throw new Error('DISCORD_NO_PENDING');
      sub.pending = null; this.store.save();
      return this.deliverGuild(guildId, snapshot);
    });
  }
  acknowledge(sub, batch, message) {
    sub.seen = [...new Set([...sub.seen, ...batch.keys])];
    sub.lastDelivery = { messageId: message.id, sentAt: new Date().toISOString() };
    sub.pending = null; sub.error = null;
    this.store.save();
  }
  async deliverGuild(guildId, snapshot) {
    const sub = this.store.data.subscriptions[guildId];
    if (sub.pending) throw new Error('DISCORD_DELIVERY_PENDING');
    const messages = [];
    for (const batch of pendingBatches(snapshot, sub.seen)) {
      sub.pending = batch; this.store.save();
      try {
        const nonce = hash(guildId + ':' + batch.id).slice(0, 25);
        const message = await this.api.send(sub.channelId, { ...batch.payload, nonce, enforce_nonce: true });
        if (!/^\d+$/.test(message.id) || message.channel_id !== sub.channelId) throw new Error('DISCORD_DELIVERY_UNKNOWN');
        this.acknowledge(sub, batch, message);
        messages.push(message.id);
      } catch (error) {
        const code = failureCode(error);
        if (error.status >= 400 && error.status < 500) sub.pending = null;
        sub.error = { code, at: new Date().toISOString() }; this.store.save();
        throw new Error(code);
      }
    }
    return { guildId, channelId: sub.channelId, messages };
  }
  dispatch(snapshot, dryRun = false) {
    return this.serialize(async () => {
      const results = [];
      for (const [guildId, sub] of Object.entries(this.store.data.subscriptions)) {
        if (dryRun) { results.push({ guildId, channelId: sub.channelId, pending: !!sub.pending, batches: pendingBatches(snapshot, sub.seen) }); continue; }
        try { results.push({ ...await this.deliverGuild(guildId, snapshot), ok: true }); }
        catch (error) { results.push({ guildId, channelId: sub.channelId, ok: false, error: error.message }); }
      }
      return { dryRun, results, ok: results.every(row => row.ok !== false) };
    });
  }
}

export async function loadPublishedSnapshot(origin, fetcher = fetch) {
  const get = async path => {
    const response = await fetcher(origin + path, { headers: { 'User-Agent': 'mabimoba-discord/1.0', 'Cache-Control': 'no-cache' }, redirect: 'error', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`DISCORD_PUBLIC_HTTP_${response.status}`);
    return response.json();
  };
  const [snapshot, health] = await Promise.all([get('/discord-updates.json'), get('/healthz')]);
  if (snapshot.schemaVersion !== 1 || !/^[0-9a-f]{12}$/.test(snapshot.revision) || snapshot.revision !== health.revision || health.status !== 'ok' ||
    !Array.isArray(snapshot.batches) || snapshot.batches.some(batch => !Array.isArray(batch.keys) || batch.keys.length !== batch.payload?.embeds?.[0]?.fields?.length)) throw new Error('DISCORD_PUBLIC_REVISION_MISMATCH');
  return snapshot;
}
