import { Client, Events, GatewayIntentBits, PermissionFlagsBits, ChannelType, Routes, SlashCommandBuilder } from 'discord.js';
import { handleInteraction, neededPermissions } from './commands.mjs';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { SubscriptionStore, DeliveryService, loadPublishedSnapshot, failureCode } from './core.mjs';

const target = JSON.parse(readFileSync(new URL('../deploy/target.json', import.meta.url), 'utf8'));
const origin = `https://${target.domain}`;
const token = readFileSync('/run/secrets/discord-token', 'utf8').trim();
if (!token || /\s/.test(token)) throw new Error('DISCORD_TOKEN_INVALID: Botトークンを確認してください');
const store = new SubscriptionStore('/data/subscriptions.json');
const client = new Client({ intents: [GatewayIntentBits.Guilds], rest: { retries: 0, timeout: 20000 } });
const delivery = new DeliveryService(store, {
  send: (channelId, body) => client.rest.post(Routes.channelMessages(channelId), { body }),
  get: async (channelId, messageId) => {
    const message = await client.rest.get(Routes.channelMessage(channelId, messageId));
    if (message.author?.id !== client.user.id) throw new Error('DISCORD_CONFIRM_MISMATCH');
    return message;
  }
});
const needed = neededPermissions | PermissionFlagsBits.ManageChannels;
const channelName = '攻略通信（kitepon.dev）';
const command = new SlashCommandBuilder().setName('マビモバ').setDescription('マビモバ攻略ポータルの更新通知を管理します')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).setContexts(0).setIntegrationTypes(0)
  .addSubcommand(option => option.setName('開始').setDescription('このチャンネルで更新通知を受け取ります'))
  .addSubcommand(option => option.setName('停止').setDescription('このサーバーへの更新通知を停止します'))
  .addSubcommand(option => option.setName('状態').setDescription('通知先と直近の送信状況を確認します'));
let commandsReady = false;
const ready = () => client.isReady() && commandsReady;
const invite = () => `https://discord.com/oauth2/authorize?client_id=${client.application.id}&scope=bot%20applications.commands&permissions=${needed}&integration_type=0`;
const logError = (kind, error) => console.error(JSON.stringify({ kind, code: failureCode(error) }));

client.on(Events.InteractionCreate, interaction => handleInteraction(interaction, { delivery, store, loadSnapshot: () => loadPublishedSnapshot(origin), logError }));
client.on(Events.GuildDelete, guild => { delivery.removeGuild(guild.id).catch(error => logError('guild-delete-failed', error)); });
client.on(Events.Error, error => logError('gateway-error', error));
async function setupGuild(guild) {
  if (!guild.available || store.data.stopped.includes(guild.id) || store.data.subscriptions[guild.id]) return;
  try {
    const result = await delivery.autoStart(guild.id, await loadPublishedSnapshot(origin), async () => {
      const channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText,
        topic: channelName + ' · マビモバ攻略ポータルの更新通知 ' + origin + '/', reason: '更新通知用の専用チャンネルを作成' });
      // Discordが名前を正規化しても、返されたIDを正本として登録する。
      return channel.id;
    });
    console.log(JSON.stringify({ event: 'guild-configured', ...result }));
  } catch (error) {
    logError('auto-setup-failed', error);
    if (guild.systemChannelId) {
      await client.rest.post(Routes.channelMessages(guild.systemChannelId), { body: {
        content: 'マビモバ更新通知の初期設定に失敗しました。ボットの「チャンネルの管理」と投稿権限を確認してください。設定後に管理者が通知先で /マビモバ 開始 を実行すると登録できます。', allowed_mentions: { parse: [] }
      } }).catch(failure => logError('setup-error-notification-failed', failure));
    }
  }
}
client.on(Events.GuildCreate, guild => { setupGuild(guild).catch(error => logError('guild-setup-failed', error)); });

client.once(Events.ClientReady, async () => {
  try {
    await client.rest.put(Routes.applicationCommands(client.application.id), { body: [command.toJSON()] });
    // オフライン中に退会したサーバーの記録も削除する。
    for (const guildId of new Set([...Object.keys(store.data.subscriptions), ...store.data.stopped])) if (!client.guilds.cache.has(guildId)) await delivery.removeGuild(guildId);
    commandsReady = true;
    console.log(JSON.stringify({ event: 'ready', applicationId: client.application.id, inviteUrl: invite() }));
    for (const guild of client.guilds.cache.values()) await setupGuild(guild);
  } catch (error) { logError('startup-failed', error); process.exit(1); }
});
createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const path = new URL(request.url, 'http://localhost').pathname;
  if (request.method === 'GET' && path === '/healthz') { response.writeHead(ready() ? 200 : 503); response.end(JSON.stringify({ status: ready() ? 'ok' : 'connecting' })); return; }
  if (request.method === 'GET' && path === '/invite') { response.writeHead(ready() ? 302 : 503, ready() ? { Location: invite() } : {}); response.end(); return; }
  if (request.method !== 'POST' || path !== '/notify' || request.socket.remoteAddress !== '127.0.0.1') { response.writeHead(404); response.end(JSON.stringify({ error: 'NOT_FOUND' })); return; }
  try {
    if (!ready()) throw new Error('DISCORD_NOT_READY');
    let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 4096) throw new Error('DISCORD_REQUEST_TOO_LARGE'); }
    const options = JSON.parse(body);
    const snapshot = await loadPublishedSnapshot(origin);
    let result;
    if (options.confirmMessage) result = await delivery.reconcile(options.guildId, options.confirmMessage);
    else if (options.retryUnsent) result = await delivery.retryUnsent(options.guildId, snapshot);
    else result = await delivery.dispatch(snapshot, options.dryRun === true);
    response.end(JSON.stringify(result));
  } catch (error) { response.writeHead(500); response.end(JSON.stringify({ ok: false, error: error.message.startsWith('DISCORD_') ? error.message : failureCode(error) })); }
}).listen(8081, '0.0.0.0');

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { client.destroy(); process.exit(0); });
try { await client.login(token); } catch (error) { logError('login-failed', error); process.exit(1); }
