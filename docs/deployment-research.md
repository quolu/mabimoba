# 公開経路の確認

出典: main-serverのDocker稼働状態、Caddy設定、Cloudflare公式APIのread結果、[Caddy公式CLI](https://caddyserver.com/docs/command-line)。

確認日: 2026-10-07。確度: 実測。公開対象の構造化正本は `deploy/target.json`。

- main-serverへSSH接続でき、DockerとGitHubの認証が利用できる。
- 既存のhome-server Tunnelから、共有CaddyへHTTPSで入り、Hostヘッダーで各サービスを振り分ける。
- 共有Dockerネットワークを使い、新サイトのコンテナへ直接転送できる。新しいLAN公開ポートは不要。
- 専用コンテナと新規ホスト1件だけを追加する。共有Caddyとcloudflaredを停止しない。
- Caddyは候補の構文確認後、公式のreloadで反映する。変更前に設定ファイルをtarで保存する。
- Cloudflareの既存資格情報はサーバー上でAPI実行に使い、値を表示・複製しない。
