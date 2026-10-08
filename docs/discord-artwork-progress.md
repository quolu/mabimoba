# Botアイコンとバナーの現在地

## 合意した案

オーナーの希望は、マビノギのアイコンと、赤いプロフィール背景をマビノギの画像へ変更すること。提案した具体案は「ナオの顔をアイコン、ティルコネイルの風景をバナー」。オーナーは「それじゃ君の好きな感じで行こうぜ」と進行を承認した。このGOを、別の人物やオリジナル風景へ変更する承認とは扱わない。

## 止まっている所

この用途の公式素材の利用許諾は未確認。公式著作物利用ガイドラインには、元画像そのまま・実質的に同じ利用の禁止、営業目的利用の制限、公式素材をAIへ読み込む二次創作の禁止がある。Botプロフィールにはkitepon.devと一部有料ツールの紹介がある。

決裁箱K-HN5C8Zで次のどちらかを確認している。

- 提示済みの文面でNEXONへ、ナオ・ティルコネイル素材をこの用途に使う許諾を問い合わせる。
- 合意を変更し、公式キャラクター・公式画像を使わないオリジナルの人物アイコンと青空・草原のバナーを作る。

画像は未生成・未編集・未アップロード。Botの現在のアイコンとバナーは変更していない。画像を更新するコードもまだ変更していない。

## 準備した情報

Discord公式APIは `PATCH /users/@me` の `avatar` と `banner` に画像データを受け付ける。アプリ側のアイコンは `PATCH /applications/@me` の `icon`。採用する素材が決まってから、プロフィールで使う双方のアイコンとBotバナーを揃え、読み戻しと実表示で確認する。

出典：
- https://m.nexon.com/terms/1497
- https://mabinogimobile.nexon.co.jp/about/character
- https://mabinogimobile.nexon.co.jp/media/image
- https://docs.discord.com/developers/resources/user
- https://docs.discord.com/developers/resources/application

確認日：2026-10-08。確度：公式原文。利用許諾そのものは未取得。
