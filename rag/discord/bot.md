# 招待できるDiscord更新通知ボット

出典：Discord公式の[OAuth2](https://docs.discord.com/developers/topics/oauth2)、[Application Commands](https://docs.discord.com/developers/interactions/application-commands)、[Gateway](https://docs.discord.com/developers/events/gateway)、[Message](https://docs.discord.com/developers/resources/message)、[discord.js RESTOptions](https://discord.js.org/docs/packages/discord.js/main/RESTOptions:Interface)。取得日：2026-10-08。確度：API仕様は公式資料で確認、実接続・招待・自動作成・実通知は検証記録で確認済み。

## 採用した構成

第三者が自分のサーバーへ招待する用途なので、Incoming WebhookではなくBotを使う。招待は `bot` と `applications.commands` のスコープ、Guild Installを使う。招待時に専用テキストチャンネルを作り、返されたIDで自動登録する。変更・停止のスラッシュコマンドは「サーバーの管理」権限を確認する。

HTTP Interactionsも可能だが、Gatewayの `Guilds` intentを使うとサーバーからの退会を受けて登録情報を削除できる。専用コンテナは外向きの接続だけで動き、共有Caddy・Cloudflare設定の追加が不要。会話本文・メンバー一覧のPrivileged Intentは使わない。

接続・再接続・429の待機はdiscord.jsが担当する。Bot専用のpackageとlockfileへ閉じ込め、ポータル本体は依存0個を保つ。ポータルの公開でBotを再起動する必要はなく、Botは公開済みの生成データを読む。

## 導入サーバー数

出典：[discord.js Client](https://discord.js.org/docs/packages/discord.js/14.27.0/Client:Class)、[GuildManager](https://discord.js.org/docs/packages/discord.js/14.27.0/GuildManager:Class)。確認日：2026-10-08。確度：公式資料で確認。

単一プロセスで接続しているBotでは `client.guilds.cache` が参加サーバーを保持し、`size` で総数を取得できる。通知の登録件数とは区別し、停止中のサーバーも数える。招待ページはBotの公開HTTPから総数だけを読み、Discord接続前は503で失敗を明示する。プロセスを分割する時は全プロセスの集計が必要。

## 送信の境界

Embedはタイトル256文字、本文4096文字、フィールド25個、フィールド値1024文字、全体6000文字まで。更新項目の途中は切り詰めず、項目単位で通知を分ける。メンションは `allowed_mentions.parse=[]`。

BotのCreate Messageには `nonce` と `enforce_nonce` があり、同じ投稿者・同じnonceの直近数分の重複を避けられる。永続的な重複防止の代わりにはならないため、サーバー別に通知済み項目と送信中の内容を保存する。通信断で結果が不明なら自動再送を止める。実メッセージを照合する場合、チャンネル閲覧とメッセージ履歴の権限が必要。

## 実測

- npmの公開版を確認し、Bot専用のlockfileを作成。依存の監査は脆弱性0件。
- 実データの通知文生成、複数サーバーの独立配信、同日追記、部分失敗、再起動後の保留、本文照合、停止、同時実行、公開データの一致確認はfocused testで検証。
- MacのChromeへのJev接続は成功。最初の判断要求は応答検証エラーで操作なし、再試行ではDeveloper Portalからログイン画面へ到達した。本人ログイン後もJevの新規タブではログイン状態を引き継げず、既存タブにはログイン済みであることを確認した。理由を報告し、既存タブを操作するCUAへ切り替えた。本人から個人所有で進めるGOを受け、規約同意・作成を実行した。本人がhCaptchaを完了し、アプリ作成を確認した。本人が多要素認証を完了し、トークンを表示せずDiscordでアプリIDを照合してmain-serverへ直接保管した。

- Discordの実APIは「攻略通信（kitepon.dev）」を「攻略通信（kitepondev）」へ正規化した。説明欄へ正式名を残し、IDで管理する。自動チャンネル作成・実通知と再実行時の0件、Bot再配備でチャンネルが増えないことを確認した。

## プロフィールの更新

出典：[Discord公式Application API](https://docs.discord.com/developers/resources/application)、[kitepon.devの製品一覧](https://kitepon.dev/)、[AuctionBOT](https://quo-labo.vercel.app/auctionbot)、[MMOBank](https://bank.kitepon.dev/)、[ReminderBOT](https://kitepon.dev/products/reminderbot/)、[KITE BINGO](https://bingo.kitepon.dev/)。確認日：2026-10-08。確度：公式仕様・運営の公開ページ。

Discordの概要は公式の `PATCH /applications/@me` で `description` だけを更新できる。元の概要を保存し、更新後にGETで読み戻す。概要の正本は `content/discord-profile.json`。`npm run discord:profile` が登録と照合を行う。

kitepon.devの紹介とMMO向けツールの紹介を335文字にまとめた。Jevに候補のMMOとの関連度を判断させ、最終的にはサイトで用途を確認したAuctionBOT・MMOBank・ReminderBOT・KITE BINGOの4製品を採用した。変動する料金や利用件数は概要に載せない。
