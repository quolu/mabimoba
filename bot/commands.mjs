import { PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
export const neededPermissions = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages | PermissionFlagsBits.EmbedLinks | PermissionFlagsBits.ReadMessageHistory;

export async function handleInteraction(interaction, { delivery, store, loadSnapshot, logError }) {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'マビモバ') return;
  try {
    if (!interaction.inGuild() || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({ content: 'この操作には「サーバーの管理」権限が必要です。', flags: MessageFlags.Ephemeral }); return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const action = interaction.options.getSubcommand();
    if (action === '停止') {
      await delivery.stop(interaction.guildId);
      await interaction.editReply('このサーバーへの通知を停止し、登録情報を削除しました。'); return;
    }
    if (action === '状態') {
      const sub = store.data.subscriptions[interaction.guildId];
      await interaction.editReply(sub ? `通知先：<#${sub.channelId}>\n${sub.pending ? '送信結果の確認が必要です。運営へご連絡ください。' : sub.error ? '直近の送信に失敗しています。チャンネルの権限を確認してください。' : '更新情報を受け取る設定です。'}${sub.lastDelivery ? `\n最終送信：${sub.lastDelivery.sentAt}` : ''}` : '通知は未設定です。通知先のチャンネルで `/マビモバ 開始` を実行してください。'); return;
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
