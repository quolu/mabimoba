# Botアイコンとバナーの導入完了

オーナーが、人物と風景をオリジナルへ変更して進めることを承認した。公式キャラクター・公式画像を入力や参照にせず、組み込みimagegenで人物アイコンと風景バナーを新規生成した。

## 採用したデザイン

- アイコン：栗色の短いボブヘア、琥珀の瞳、青緑のスカーフを合わせた、親しみやすい成人の案内役。
- バナー：明るい青空、緑の丘、小川と遠景の集落。プロフィールのアイコンが重なる左下を広く空けた。

文字やロゴは入れない。画像の正本は `bot/assets/`、生成条件・寸法・ハッシュは `bot/assets/artwork.json`。プロフィールから使う画像は `content/discord-profile.json` に指定する。

## 反映の確認

画像の保存・入力形式の確認・commit・通常pushを完了。`npm run discord:profile` でBotのアバター・バナーとアプリのアイコンを更新し、APIの読み戻しとDiscordプロフィールの実表示を確認した。小さな丸いアイコンでも顔が読み取れ、横長の風景バナーも正しく表示された。

更新前の画像と概要はmain-serverの専用stateへ保存済み。Botは再起動せず、画像反映後もrunning・healthyを確認した。`npm run check` と `npm run build` も成功。

## 出典

- https://docs.discord.com/developers/resources/user
- https://docs.discord.com/developers/resources/application

確認日：2026-10-08。確度：公式API仕様。公式画像の利用許諾を前提にする案は採用していない。
