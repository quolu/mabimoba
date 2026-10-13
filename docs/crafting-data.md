# 採集とつないだ製作データ（crafting.json）

製作・加工の作り方に、採集の行き先をつないだデータ。品物から元の材料まで辿り、その材料がどの採集スキルのどの行き先で採れるかまでを、1つのファイルで読める。

- データ：`https://mabimoba.kitepon.dev/data/crafting.json`
- 計算の答えの例：`https://mabimoba.kitepon.dev/data/crafting-examples.json`
- 作る所：`scripts/crafting.mjs`（`content/recipes.json`、`content/portal.json` の `gathering`、`content/crafting.json` から組み立てる）
- 計算：`scripts/recipes.mjs` の `craftPlan`

作り方は韓国版の資料（2025年4月〜6月）が元で、日本版で確かめられたのは一部。確かめた度合いは、項目ごとに印で持っている。印の無い値を、日本版の事実として扱わない。

## ファイルの読み方

`revision` は中身から作った12桁の値。中身が変わると変わる。手元に写しを置いて使う時は、この値で新しいかどうかを見分ける。サーバーは `ETag` も返す。

`schemaVersion` は 1。項目を足す時は、この番号を変えずに足す。今ある項目の名前と意味、品物と作り方の `id` は変えない。変える時は番号を上げる。

### 確かめた度合い（`checks`）

| 値 | 意味 |
|---|---|
| `screen` | 日本版のゲームの画面で見て確かめた |
| `record` | 日本版の実機の記録を、攻略媒体や公式の一覧と照らして、同じだった |
| `guide` | 日本公式ゲームガイドに書かれている |
| `media` | 日本版の攻略媒体（GameWith）の記事にだけ書かれている |

### `items`（品物）

| 項目 | 中身 |
|---|---|
| `id` | 韓国語の名前から作った値。変わらない |
| `ko` | 元の表の名前 |
| `ja` | 日本語の名前 |
| `jaConfirmed` | `true` は、日本公式ゲームガイド、日本版の攻略媒体、日本版の実機で同じ名前を確かめた物。`false` は仮訳 |
| `jaSeen` | `jaConfirmed` が `false` の品物のうち、`ja` と同じ字が日本版の資料に出てくる物。字は日本版に有るが、韓国語の名前との対は推測 |
| `aliases` | 別の書き方。`{ name, sure, note }`。`sure` が `false` の物は、同じ品物と見ているだけで、確かめていない |
| `craftable` | この一覧に作り方があるか |
| `recipes` | その品物の作り方の `id`。並びは `recipes` と同じ。作り方の無い品物は空 |
| `recommendedRecipe`、`recommendedWhy` | 作り方が2つ以上ある品物で、勧める作り方の `id` と、その訳。ほかは `null`。確かめた事ではなく、編集部の見方 |
| `obtain` | `craft`（作る）、`gather`（採集の行き先が分かっている）、`unknown`（手に入れる先を調べていない） |
| `sources` | 採れる行き先の `id`。作る品物と、行き先が分からない品物は空 |
| `sourceKnown` | `obtain` が `unknown` でなければ `true` |
| `depth` | 元の材料まで何段あるか。元の材料は 0、元の材料だけで作れる品物は 1 |
| `gatherOnly` | 作る品物だけ。元の材料が全部、採集の行き先につながっていれば `true`。個数の無い材料がある時は `false` |
| `gatherOnlySure` | `gatherOnly` のうち、その品物、途中の品物、元の材料の名前が全部 `jaConfirmed` で、行き先とのつながりも確かな物 |

`obtain` が `unknown` の品物は、採集で採れないと決まった物ではない。店、分解、敵、ダンジョンのどれで手に入るかを、まだ分けていない。

### `recipes`（作り方）

| 項目 | 中身 |
|---|---|
| `item`、`yield` | できる品物と、1回でできる個数 |
| `group` | 製作の画面のタブ（フードの「STR特化」など）や、品物のまとまり。`jaConfirmed` が `true` は、日本版の画面で見た字 |
| `station`、`stationLv` | 製作台か加工施設（`stations` の `id`）と、要るレベル。その場で作る物は `no-bench` で、レベルは `null` |
| `skill`、`skillLv` | 要る製作スキルとレベル。加工は `null`。`skill.jaConfirmed` が `true` は、日本版の画面か攻略媒体で見た名前 |
| `recommendedLv` | 日本版の画面に出る「推奨 Lv.」。分かっている物だけ。ほかは `null` |
| `seconds` | 加工1回の時間。製作は `null`（元の表に無い）。下の「時間」を読む |
| `materials` | `{ item, qty }`。`qty` が `null` は、元の表に個数が無い。`self: true` は、元の表で品物と同じ名前が材料に書かれている物（誤記と見られる） |
| `jpChecked` | `true` は、日本版の製作や加工の画面と見比べて、条件、材料と個数が同じだった作り方。加工は時間も同じ |
| `usable`、`usableNote` | `false` は、書かれた通りには作れない作り方（品物と同じ名前が材料に書かれている）。訳は `usableNote` |
| `notes` | 元の表を直した所、欠けている所 |

### `stations`（製作台と加工施設）

`ja` は名前、`jaCheck` はその名前を確かめた度合い。加工施設の `ja` は日本公式ゲームガイドの名前（「木材加工施設」）で、ゲームのクイックナビゲーターの[設備]に並ぶ札は「木材加工」。札の字は `aliases` に入れてある。製作台は、札も同じ名前。

### 時間（`time`）

`seconds` は、元の表の注記では、ライフメンバーシップを使っている時の値。使っていない時は2倍（`withoutMembershipFactor`）と書かれている。日本版の画面と見比べた4件は、元の表の値と同じだった。日本版でメンバーシップを使っていない時の時間は、確かめていない。

### `skills`（採集スキル）と `destinations`（行き先）

`skills` は、採集スキルの名前と道具。`toolCheck` が `screen` の道具は、画面で見た品物の名前（「入門用の鎌」など）。`guide` の道具は、公式ガイドにある道具の種類の名前（「ツルハシ」など）で、買う品物の名前は確かめていない。

| `destinations` の項目 | 中身 |
|---|---|
| `id` | `<スキルのid>:<行き先の名前>`。行き先の名前を直した時は変わる |
| `skill`、`skillName`、`name`、`level` | 採集スキル、行き先の名前、要るスキルレベル |
| `check` | 行き先の名前とレベルを確かめた度合い |
| `areaType`、`areas`、`areaCheck` | 場所。`areaType` は行き先のカードに出た「一般フィールド」「狩り場」。分かっていない時は `null` と空 |
| `tool`、`toolCheck` | 要る道具。日常採集は `null`（道具なし）。水、井戸、乳牛は空き瓶 |
| `yields` | 採れる品物。`{ name, item, sure }`。`name` は資料の表記、`item` は品物の `id`（この一覧に無い品物は `null`）。`sure` が `false` は、つながりが推測 |
| `yieldsCheck`、`yieldsSource` | 採れる品物を確かめた度合いと、その資料 |

採れる品物は、今は全部、攻略媒体の表の「主に入手できるもの」による。先頭の品物が狙いの品物で、後ろの品物は一緒に出る事がある物、と読める並びだが、出る割合は書かれていない。

`gatherRun.max` は、行き先のカードの[近くで探す]の1回で採集する回数（10）。画面の追跡に「採集 n/10」と出る。1回の採集で手に入る個数は確かめていないので、採れた数は持ち物の数で数える。

## 元の材料まで辿る計算

品物 `T` を `N` 個作る時に、作る順と、集める元の材料を出す。入力は、品物の `id`、個数、`have`（持っている数。品物の `id` → 個数。省ける）、`prefer`（使う作り方。品物の `id` → 作り方の `id`。省ける）。

1. **使う作り方を決める。** 作り方が1つの品物は、それを使う。2つ以上ある品物は、`prefer` にあればその作り方、無ければ `recipes` の並びで最初の作り方を使う。作り方の無い品物が、元の材料。品物の `recommendedRecipe` は、計算の既定には使わない。勧めの作り方で計算する時は、`prefer` に渡す。
2. **辿る材料を決める。** 作り方の材料のうち、`qty` が `null` の物と `self` が `true` の物は辿らず、数にも入れない。答えの `unknown` に出す。`usable` が `false` の作り方も、計算は同じように通る。その通りに作れないので、`unknown` に `self` が出た段取りは、そのまま使わない。
3. **要る数を、上から合算する。** `T` の要る数は `N`。品物を、それを材料にする品物が全部済んでから処理する（`T` が最初、元の材料が最後）。品物ごとに、
   - 要る数 `need` は、それを材料にする全部の作り方からの合計。
   - 持っている数を引く。`fromStock = min(have, need)`、足りない数 `short = need − fromStock`。`T` そのものには `have` を使わない（`N` は作る数）。
   - 元の材料なら、`short` が集める数（`gather`）。
   - 作る品物で `short` が 0 なら、作らない。その材料も要らない。答えの `covered` に出す。
   - 作る品物で `short` が 1 以上なら、回数 `times = ceil(short ÷ yield)`、できる数 `makes = times × yield`、余り `surplus = makes − short`。材料ごとに、`qty × times` をその材料の要る数へ足す。
4. **作る順は、下から。** `steps` は、どの品物も、その材料が先に来る並び。材料を作り方に書かれた順に辿り、材料が全部出た後でその品物を出す。材料が先に来ていれば、別の並びでも正しい。

同じ途中の品物が2つの枝で要る時は、枝ごとに切り上げず、合わせてから切り上げる。枝ごとに切り上げると、材料が多めに出る。例：ウェーブエッジソードSS を1個作る時、鉱石は合わせてから切り上げると 60、枝ごとだと 100。

`totalSeconds` は `seconds × times`。加工を続けて頼んだ時の合計として出している。同時に進められる数は、確かめていない。

### 答えの形

```
{
  item, count,
  steps:   [{ item, recipe, need, fromStock, times, makes, surplus,
              station, stationLv, skill, skillLv, seconds, totalSeconds }],   // 下から作る順
  base:    [{ item, need, fromStock, gather }],                               // 元の材料
  covered: [{ item, need, fromStock }],                                       // 持っている分で足りた途中の品物
  unknown: [{ recipe, item, why }],                                           // 数に入れていない材料。why は qty か self
  alternatives: [{ item, used, recipes }]                                     // 作り方が2つ以上あった品物と、使った作り方
}
```

### 答えの例で確かめる

`crafting-examples.json` の `cases` は、`input`（品物、個数、`have`、`prefer`）と、この決まりで計算した `output`。別の言語で同じ計算を書いた時は、`cases` の全部で同じ答えになる事を確かめる。`steps` の並びだけは、材料が先に来ていれば違っていてよい。

入っている例：名前まで確かで採集だけで揃う品物（`gatherOnlySure`）の全部、作り方が2つあるアイアンインゴットのそれぞれ、同じ途中の品物が2つの枝で要る品物、採集で揃わない品物、個数の無い材料がある品物、品物と同じ材料が書かれた品物、持っている数を引く例3つ。

例を足す時は、`content/crafting.json` の `examples` に足す。答えはビルドの時に作る。

## 中身を直す時

- 行き先を足す、名前やレベルを直す：`content/portal.json` の `gathering`（採集図鑑）。攻略媒体にしか載っていない行き先は、`content/crafting.json` の `mediaDestinations`。
- 行き先で採れる品物：`content/crafting.json` の `yields`。品物の名前が一覧の `ja` と違う時は、`ties` に韓国語の名前との対を書く。確かめていない対は `sure: false`。
- 道具：`content/crafting.json` の `skills` と `destinationTools`。
- 推奨 Lv.：`content/crafting.json` の `recommendedLv`。
- 設備の札の字（`stationLabels`）、画面で見たタブの字（`screenGroups`）と製作スキルの名前（`confirmedSkills`）、使えない作り方（`unusable`）、勧める作り方（`recommendedRecipes`）、1回の採集の回数（`gatherRun`）：どれも `content/crafting.json`。
- 名前、個数、条件：`content/recipes.json`（手順書の「製作・加工の一覧」）。

直したら `npm run check` と `npm test`。つながりが切れている時は `CRAFTING_INVALID` で止まる。
