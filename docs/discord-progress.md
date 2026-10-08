# Discordボットの接続と公開の現在地

## 合意した目的

第三者も自分のDiscordサーバーへ招待して、マビモバ攻略ポータルの最新情報を受け取る。Webhook専用方式は取り止め。ルピーと相談し、main-serverの独立Botコンテナ、サーバー別の開始・停止・状態コマンド、公開後の全登録先への配信を準備した。

## 準備済み

- Bot・公開招待ページ・公開済み更新データ・独立配備・定期配信のコードを作成した。秘密は未作成・未保存。
- focused test 13件、内容check、39ページbuild、nginx構文確認は成功。
- JevでローカルDiscord案内から更新ページへの遷移を確認。案内ページはPC・390px幅で横にはみ出さない。
- Chromeの本人ログインは確認済み。Jevが新規作成するタブではログイン状態を引き継げないため、理由を伝えてCUAの既存タブ操作へ切り替えた。

## 止まっている所

個人所有のDiscordアプリ作成は成功。公開BotはON、OAuth2 Code GrantとPrivileged IntentはOFFを確認した。トークンの初回発行でDiscordの多要素認証が出たため、本人操作を待っている。トークンは未発行・未保存。

Bot未接続のまま案内が公開されないよう、portal.jsonのdiscord.enabledはfalseにした。メニュー・案内ページを生成せず、公開済みの更新情報からもBot追加の行を外した。実際の公開日に有効化して記録する。

Dockerfileへdeploy/target.jsonのCOPYを追加した。修理前と同じコピー内容でENOENTを再現し、修理後のコピー構成でビルド成功を確認した。非公開・公開の各設定でも生成結果を確認済み。

多要素認証の申請K-7R95LSを決裁箱へ出し、Chromeの画面を保持している。
ルピーとの通話は `7576c19d-647e-4126-a556-954d27eed299`。新セッションへ移る場合は返信先を先に通知する。ルピーのWebhook入力カードは未入力、不要と通知済み。Botトークンの入力カードもブラウザ作成へ切り替えたため使わないよう通知済み。

## 続き

1. 多要素認証後にBotトークンを安全に読み、Guild Installを設定する。Privileged Intentは全てOFF、OAuth2 Code GrantもOFF。
2. Botトークンを表示せずmain-serverの ~/.config/mabimoba/discord-token へ0600で保存する。
3. 対象パスだけcommit・通常pushし、npm run discord:deploy、npm run deployを行う。本体コードは5f9a5a0、ビルド・先行案内の修理は0fd9d9cでmainへpush済み。0fd9d9cのポータル公開とHTTPS smokeは成功。Botコンテナは未配備。
4. 招待ページから実サーバー（情報サイト（kitepon.dev））へ導入し、開始・状態・停止・再開と実通知を確認する。不要な合成通知は送らない。
5. npm run notifyの結果と重複なしを確認し、ルピーへ確定コマンドと公開結果を伝える。進行記録は完了後に検証記録へまとめる。
