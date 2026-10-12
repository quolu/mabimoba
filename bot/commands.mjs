import { PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { sectionMenu, route } from './materials.mjs';
export const neededPermissions = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.ReadMessageHistory;

// 「/材料」は、サーバーの誰でも使える。通知の設定（/マビモバ）とは別のコマンドにしてある。
// コマンドの後は、分類 → グループ → 品物 の順に一覧から選ぶ。選ぶ画面と結果は本人にだけ見え、ボタンでチャンネルへ出せる。
export async function handleMaterials(interaction, { loadRecipes, origin, logError }) {
  const component = interaction.isStringSelectMenu?.() || interaction.isButton?.();
  try {
    if (component) {
      const publish = String(interaction.customId).startsWith('mat:p:');
      if (publish) await interaction.deferReply(); else await interaction.deferUpdate();
      const next = route(await loadRecipes(), interaction.customId, interaction.values, origin);
      await interaction.editReply(next.payload);
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply(sectionMenu(await loadRecipes(), interaction.options.getInteger('個数') ?? 1));
  } catch (error) {
    logError('materials-failed', error);
    if (interaction.deferred) await interaction.editReply({ content: '材料の計算に失敗しました。時間をおいて、もう一度お試しください。', embeds: [], components: [] }).catch(failure => logError('reply-failed', failure));
  }
}

export async function handleInteraction(interaction, { delivery, store, loadSnapshot, logError, loadRecipes, origin }) {
  if (interaction.commandName === '材料' || String(interaction.customId ?? '').startsWith('mat:')) return handleMaterials(interaction, { loadRecipes, origin, logError });
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'マビモバ') return;
  try {
    if (!interaction.inGuild() || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'この操作には「サーバーの管理」権限が必要です。', flags: MessageFlags.Ephemeral }); return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const action = interaction.options.getSubcommand();
    if (action === '停止') {
      await delivery.stop(interaction.guildId);
      await interaction.editReply('このサーバーへの通知を停止し、通知先と配信履歴を削除しました。停止状態だけを保存します。'); return;
    }
    if (action === '状態') {
      const sub = store.data.subscriptions[interaction.guildId];
      await interaction.editReply(sub ? `通知先：<#${sub.channelId}>\n${sub.pending ? '送信結果の確認が必要です。運営へご連絡ください。' : sub.error ? '直近の送信に失敗しています。チャンネルの権限を確認してください。' : '更新情報を受け取る設定です。'}${sub.lastDelivery ? `\n最終送信：${sub.lastDelivery.sentAt}` : ''}` : store.data.stopped.includes(interaction.guildId) ? '通知は停止中です。再開するチャンネルで `/マビモバ 開始` を実行してください。' : '通知は未設定です。通知先のチャンネルで `/マビモバ 開始` を実行してください。'); return;
    }
    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(interaction.channel?.type) || !interaction.appPermissions.has(neededPermissions)) {
      await interaction.editReply('テキストまたはアナウンスチャンネルで実行し、ボットに「チャンネルを見る」「メッセージを送信」「埋め込みリンク」「メッセージ履歴を読む」の権限を付けてください。'); return;
    }
    await delivery.start(interaction.guildId, interaction.channelId, await loadSnapshot());
    await interaction.editReply(`<#${interaction.channelId}> で更新通知を開始しました。公開済みの最新情報を送り、以後は新しい項目だけを通知します。停止は「/マビモバ 停止」です。`);
  } catch (error) {
    logError('command-failed', error);
    if (interaction.deferred) await interaction.editReply('通知の処理に失敗しました。登録した設定は `/マビモバ 状態` で確認できます。運営へお問い合わせください。').catch(failure => logError('reply-failed', failure));
  }
}
