# マビモバ攻略ポータル

[公開サイト](https://mabimoba.kitepon.dev/) — マビノギモバイルの海外情報を日本語で整理する非公式攻略サイト。

韓国・台湾／香港／マカオの公式情報と、日本・韓国のX投稿を参照する。PC版マビノギの仕様は混在させない。

- 初心者の進行ロードマップとブラウザ内チェック保存
- 攻略記事、職業図鑑、ダンジョン・成長・生活データベース
- 日本語・韓国語の横断検索
- 地域別ニュースと日韓のX情報
- 出典、確認日、資料の基準日、公式／プレイヤー投稿の区別

Node.jsで静的HTMLを生成し、main-serverの専用コンテナで配信する。内容の編集にSQLサーバーや実行時のAI APIは必要ない。

```sh
npm run check
npm run build
npm run dev
```

編集の正本は [content/portal.json](content/portal.json)。画像の出典は [content/assets.json](content/assets.json)。配置先と公開経路は [deploy/target.json](deploy/target.json) に置く。

更新・公開は [docs/maintenance.md](docs/maintenance.md)、資料調査は [rag/INDEX.md](rag/INDEX.md) を参照。毎日16:00（日本時間）に定期更新する。

公式画像・ゲーム関連の著作物はNEXONおよびdevCAT等の権利者に帰属する。本サイトは公式・公認サイトではない。
