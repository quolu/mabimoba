# 海外攻略情報の調査

出典: `content/portal.json` の sources に一次資料URLを収録。
取得日: 2026-10-07
確度: 公式仕様は一次資料で確認。X・プレイヤー投稿は投稿内容の観測であり、実戦結果の再現は未実施。

## 対象の区別

- 対象はマビノギモバイル（韓国: 마비노기 모바일、繁体字版: 瑪奇 Mobile）。PC版マビノギの仕様は混在させない。
- 日本版は2026-10-07開始。韓国版・繁体字版の先行仕様を日本版の確定仕様として扱わない。

## 参照の置き場

記事の要約・出典・確認日・資料基準日は `content/portal.json` が正本。資料全文の転載は保存していない。

## 観測

- 韓国公式ガイドの基準日は2026-04〜09に分散しており、取得日と現在の実装時点を同一扱いにしない。
- 日本公式紹介は18転職クラス、韓国公式紹介は21転職クラスを掲載。掲載の有無から未実装を断定しない。
- 韓国公式のURLは日本IPから英語トップへredirectする場合がある。日本での閲覧失敗を資料消失として扱わない。
- 2026-10-07実測（BellTeamコンテナとmain-server）: 韓国公式は一覧・個別記事とも `/en/Main` へ302で転送され本文を読めない。台湾公式は一覧が403（Cloudflareの確認画面）。日本公式のお知らせ・アップデート・イベント一覧は200で、記事リンクがHTMLに含まれる。
- 同日、韓国公式を読む経路を調べた。`/ko/`・`/kr/`の接頭辞、言語ヘッダー、個別記事URL、`forum.nexon.com/mabinogimobile` はすべて同じ転送になる。`robots.txt` は全体許可、`sitemap.xml` はFAQと一覧だけを載せる。Nexon Open APIにマビノギモバイルの項目は無い。Internet Archiveは応答不能で未確認。
- 動いた経路: Naver検索 `site:mabinogimobile.nexon.com` は公式URL・題名・抜粋を返し、5時間前の告知（News/Notice/3559028）も載っていた。Xの `mobinorick` は10/1アップデートノートを章別の画像で投稿しており、長弓兵の調整（3スキルのダメージ20%増）を画像から読めた。韓国App Store（`com.nexon.devcat.mm`、v3.3.150011、2026-09-16）は更新内容の要約を返す。
- 同日、NordVPNのソウルのHTTPSプロキシ（通常サーバー、出口はKR Seoul）経由で、韓国公式の一覧・10/1アップデートノート（News/Update/3554043）・ルーンガイド（Info/Guide/2751108）が200・韓国語本文で取得できた。Cloudflareの確認画面は出なかった。アップデートノート本文の長弓兵の記述は、`mobinorick` の画像と一致した。「Dedicated IP」の台（kr138）は407で断られた。
- 同日、韓国の攻略媒体Inven（`mabimo.inven.co.kr`）は200で読めた。Xの `mobinorick` は韓国公式の告知題名とリンクを転記している（公式アカウントではない）。
- 台湾・香港・マカオ版は公式の2026-07-22告知で開始を確認。過去クーポンは期限終了を確認。
- Xはxarticleの既存ベルaccountで日本語・韓国語をread-only検索。投稿・follow・like等は行っていない。
- Xの9候補をTypeSafe Jevで分類し、原文を読んで掲載8件を選んだ。分類結果は `docs/x-classification.json`。

## 定期更新の記録

- 2026-10-07（初回、試運転）: 日本公式のお知らせ6件・アップデート4件・イベント6件を全件読んだ。韓国公式はソウルのプロキシ経由で一覧3種と、10/1以降の告知2件・イベント2件の本文を読んだ。既存の「10月1日更新」のニュースは公式ノートの本文と一致した。日本語のX検索（不具合・攻略）は、単独の観測と募集投稿が中心で、仕様として載せられる投稿は無かった。台湾公式は未読。

## 一次資料へのポインタ

- [キャラクター作成](https://mabinogimobile.nexon.com/Info/Guide/2750983) — 韓国 / 基準 2025-10-27
- [クエスト](https://mabinogimobile.nexon.com/Info/Guide/2751080) — 韓国 / 基準 記載なし
- [ルーンガイド](https://mabinogimobile.nexon.com/Info/Guide/2751108) — 韓国 / 基準 2026-06-25
- [刻印強化](https://mabinogimobile.nexon.com/Info/Guide/2751136) — 韓国 / 基準 2026-04-23
- [ダンジョン・深層ダンジョン](https://mabinogimobile.nexon.com/Info/Guide/2751110) — 韓国 / 基準 2026-06-25
- [アビス](https://mabinogimobile.nexon.com/Info/Guide/3164452) — 韓国 / 基準 2026-07-02
- [レイド](https://mabinogimobile.nexon.com/Info/Guide/2839865) — 韓国 / 基準 2026-09-21
- [宝石](https://mabinogimobile.nexon.com/Info/Guide/2751106) — 韓国 / 基準 2026-07-16
- [宝石スキルタグの変更](https://mabinogimobile.nexon.com/Info/Guide/3428479) — 韓国 / 基準 2026-04-23
- [生活道具](https://mabinogimobile.nexon.com/Info/Guide/2751065) — 韓国 / 基準 2026-06-25
- [製作](https://mabinogimobile.nexon.com/Info/Guide/2751070) — 韓国 / 基準 2026-08-13
- [キャンプファイア](https://mabinogimobile.nexon.com/Info/Guide/2751031) — 韓国 / 基準 記載なし
- [キャラクタースコアと能力値](https://mabinogimobile.nexon.com/Info/Guide/2751047) — 韓国 / 基準 記載なし
- [自動セットアップ](https://mabinogimobile.nexon.com/Info/Guide/3521939) — 韓国 / 基準 2026-08-13
- [記憶刻印プリセット](https://mabinogimobile.nexon.com/Info/Guide/3545323) — 韓国 / 基準 記載なし
- [装備変換スクロール](https://mabinogimobile.nexon.com/Info/Guide/3428478) — 韓国 / 基準 2026-04-23
- [鑑定・販売・分解](https://mabinogimobile.nexon.com/Info/Guide/2751079) — 韓国 / 基準 記載なし
- [怒り・カウンター](https://mabinogimobile.nexon.com/Info/Guide/2751058) — 韓国 / 基準 記載なし
- [マイホーム](https://mabinogimobile.nexon.com/Info/Guide/3311715) — 韓国 / 基準 記載なし
- [パーティ](https://mabinogimobile.nexon.com/Info/Guide/2751032) — 韓国 / 基準 2026-06-25
- [図鑑](https://mabinogimobile.nexon.com/Info/Guide/2751040) — 韓国 / 基準 記載なし
- [クラス紹介](https://mabinogimobile.nexon.com/Main) — 韓国 / 基準 記載なし
- [10月1日アップデート](https://mabinogimobile.nexon.com/News/Update/3554043) — 韓国 / 基準 2026-10-01
- [釣りの始め方（韓国プレイヤー投稿）](https://mabinogimobile.nexon.com/Community/Tip/2760254) — 韓国 / 基準 2025-03-27
- [グラスギブネンの全滅攻撃対処（韓国プレイヤー投稿）](https://mabinogimobile.nexon.com/Community/Tip/2849647) — 韓国 / 基準 2025-04-27
- [日本版の正式サービス開始（NEXON公式発表）](https://jp.nexon.com/news/136006?category=4) — 日本 / 基準 2026-10-07
- [正式サービス開始記念プレゼント](https://mabinogimobile.nexon.co.jp/news/notice/3559220) — 日本 / 基準 2026-10-07
- [日本版公式・職業の掲載一覧](https://mabinogimobile.nexon.co.jp/) — 日本 / 基準 2026-10-07
- [台湾・香港・マカオ版：正式開始と記念品の告知](https://tw.nexon.com/mabinogimobile/home/news/notice/3506278) — 台湾・香港・マカオ / 基準 2026-07-22
- [繁体字版公式ガイド：チャット](https://tw.nexon.com/mabinogimobile/home/info/guide/3474862) — 台湾・香港・マカオ / 基準 記載なし
