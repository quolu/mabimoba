// 製作・加工の一覧の、品物の絵。ゲームのアイコンの代わりに、名前から種類を見分けて編集部が描いた絵を出す。
// 種類の絵は <symbol> で1ページに1回だけ置き、品物ごとに <use> で色（素材と等級）を変えて使い回す。
const shapes = {
 ingot: '<path d="M8 30 16 18h20l6 12-8 6H14z" fill="var(--c1)"/><path d="M16 18h20l6 12H14z" fill="var(--c2)"/><path d="M18 21h14" stroke="#fff" stroke-width="2" opacity=".6"/>',
 ore: '<path d="M8 34 12 20l10-6 12 4 6 12-6 8H14z" fill="var(--c1)"/><path d="m16 22 6 4 8-3M22 26l-2 8M30 23l4 9" stroke="var(--c2)" stroke-width="2.4" fill="none"/>',
 stone: '<ellipse cx="24" cy="30" rx="15" ry="9" fill="var(--c1)"/><ellipse cx="20" cy="27" rx="6" ry="3" fill="#fff" opacity=".35"/>',
 log: '<rect x="8" y="17" width="30" height="16" rx="3" fill="var(--c1)"/><ellipse cx="38" cy="25" rx="5" ry="8" fill="var(--c2)"/><ellipse cx="38" cy="25" rx="2" ry="4" fill="var(--c1)" opacity=".6"/><path d="M12 22h16M14 28h18" stroke="#000" stroke-opacity=".18" stroke-width="2"/>',
 plank: '<rect x="8" y="14" width="32" height="8" rx="2" fill="var(--c1)"/><rect x="8" y="24" width="32" height="8" rx="2" fill="var(--c2)"/><rect x="8" y="34" width="32" height="6" rx="2" fill="var(--c1)"/>',
 branch: '<path d="M10 38 36 12M22 26l10 2M18 30l-4-8" stroke="var(--c1)" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="34" cy="28" r="4" fill="var(--c2)"/>',
 leather: '<path d="M14 10h20l4 8-2 10 4 10H8l4-10-2-10z" fill="var(--c1)"/><path d="M14 10h20l4 8H10z" fill="var(--c2)"/><path d="M14 24h20" stroke="#fff" stroke-dasharray="3 3" stroke-width="1.6" opacity=".6"/>',
 cloth: '<path d="M10 12h28v24c-6 4-22 4-28 0z" fill="var(--c1)"/><path d="M10 12h28v6H10z" fill="var(--c2)"/><path d="M14 24h20M14 30h20" stroke="#fff" stroke-width="1.6" opacity=".45"/>',
 thread: '<rect x="14" y="10" width="20" height="28" rx="3" fill="var(--c2)"/><rect x="16" y="14" width="16" height="20" rx="2" fill="var(--c1)"/><path d="M16 18h16M16 22h16M16 26h16M16 30h16" stroke="#fff" stroke-width="1.2" opacity=".5"/>',
 wool: '<circle cx="18" cy="26" r="8" fill="var(--c1)"/><circle cx="28" cy="22" r="9" fill="var(--c1)"/><circle cx="30" cy="31" r="7" fill="var(--c2)"/><circle cx="21" cy="33" r="6" fill="var(--c2)"/>',
 herb: '<path d="M24 40V20" stroke="#3f7a4a" stroke-width="2.4"/><path d="M24 26c-10 0-14-8-12-14 8 0 12 6 12 14zM24 22c0-8 6-12 12-12 0 8-4 12-12 12z" fill="var(--c1)"/><circle cx="24" cy="16" r="3" fill="var(--c2)"/>',
 flower: '<path d="M24 40V24" stroke="#3f7a4a" stroke-width="2.4"/><g fill="var(--c1)"><circle cx="24" cy="12" r="5"/><circle cx="32" cy="18" r="5"/><circle cx="16" cy="18" r="5"/><circle cx="20" cy="26" r="5"/><circle cx="28" cy="26" r="5"/></g><circle cx="24" cy="20" r="4" fill="var(--c2)"/>',
 mushroom: '<path d="M8 24c0-10 8-14 16-14s16 4 16 14z" fill="var(--c1)"/><rect x="19" y="24" width="10" height="14" rx="4" fill="#f3ead6"/><circle cx="18" cy="17" r="2.5" fill="#fff" opacity=".7"/><circle cx="28" cy="15" r="2" fill="#fff" opacity=".7"/>',
 potion: '<path d="M20 8h8v8l8 10v8a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6v-8l8-10z" fill="#e8f1f4"/><path d="M13 28h22v6a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6z" fill="var(--c1)"/><rect x="19" y="5" width="10" height="4" rx="1.5" fill="var(--c2)"/>',
 vial: '<rect x="18" y="8" width="12" height="32" rx="6" fill="#e8f1f4"/><rect x="18" y="22" width="12" height="18" rx="6" fill="var(--c1)"/><rect x="17" y="6" width="14" height="5" rx="2" fill="var(--c2)"/>',
 bottle: '<path d="M20 6h8v8c4 2 8 6 8 12v10a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V26c0-6 4-10 8-12z" fill="#dfeef3"/><path d="M12 28h24v8a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="var(--c1)" opacity=".8"/>',
 bandage: '<rect x="8" y="16" width="32" height="16" rx="8" fill="#f4efe4"/><rect x="18" y="16" width="12" height="16" fill="var(--c1)"/><path d="M22 20v8M26 20v8" stroke="#fff" stroke-width="1.6" opacity=".7"/>',
 dish: '<ellipse cx="24" cy="32" rx="17" ry="7" fill="#eef1f2"/><ellipse cx="24" cy="30" rx="12" ry="5" fill="var(--c1)"/><path d="M16 27c2-6 14-6 16 0" fill="var(--c2)"/>',
 soup: '<path d="M8 22h32c0 10-7 16-16 16S8 32 8 22z" fill="var(--c2)"/><ellipse cx="24" cy="22" rx="16" ry="4" fill="var(--c1)"/><path d="M18 14c0-3 3-3 3-6M26 14c0-3 3-3 3-6" stroke="#9fb3b8" stroke-width="2" fill="none" stroke-linecap="round"/>',
 cake: '<path d="M10 26h28v12H10z" fill="#f6e4c6"/><path d="M10 26c4-4 24-4 28 0v4H10z" fill="var(--c1)"/><circle cx="24" cy="20" r="3" fill="var(--c2)"/>',
 drink: '<path d="M14 12h20l-3 26H17z" fill="#e8f1f4"/><path d="M15.5 22h17l-1.8 16H17.3z" fill="var(--c1)"/><path d="M30 6 26 14" stroke="var(--c2)" stroke-width="2.4" stroke-linecap="round"/>',
 powder: '<path d="M10 30c2-10 26-10 28 0v6H10z" fill="#c9a77a"/><path d="M14 28c4-8 16-8 20 0z" fill="var(--c1)"/>',
 fruit: '<circle cx="24" cy="27" r="12" fill="var(--c1)"/><path d="M24 15c0-4 2-6 4-7" stroke="#6b4a2a" stroke-width="2.4" fill="none"/><path d="M25 14c4-4 9-3 10 0-4 2-7 2-10 0z" fill="#4c9a54"/><circle cx="19" cy="23" r="3" fill="#fff" opacity=".35"/>',
 veg: '<path d="M24 40c-8 0-12-8-10-18 2-6 6-8 10-8s8 2 10 8c2 10-2 18-10 18z" fill="var(--c1)"/><path d="M24 14c-2-4-6-6-8-6 2 4 4 6 8 6zM24 14c2-4 6-6 8-6-2 4-4 6-8 6z" fill="#4c9a54"/>',
 grain: '<path d="M24 40V12" stroke="var(--c2)" stroke-width="2"/><g fill="var(--c1)"><ellipse cx="20" cy="16" rx="3" ry="5"/><ellipse cx="28" cy="16" rx="3" ry="5"/><ellipse cx="20" cy="24" rx="3" ry="5"/><ellipse cx="28" cy="24" rx="3" ry="5"/><ellipse cx="24" cy="10" rx="3" ry="5"/></g>',
 egg: '<ellipse cx="24" cy="26" rx="11" ry="14" fill="var(--c1)"/><ellipse cx="20" cy="20" rx="3" ry="4" fill="#fff" opacity=".6"/>',
 meat: '<path d="M12 22c0-8 10-12 18-8s8 14 0 18-18 0-18-10z" fill="var(--c1)"/><path d="M30 30l8 8" stroke="#f3ead6" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="39" r="3" fill="#f3ead6"/><path d="M18 20c4-2 8-2 10 2" stroke="#fff" stroke-width="2" opacity=".4" fill="none"/>',
 fish: '<path d="M8 24c6-8 18-10 26-4l8-6v20l-8-6c-8 6-20 4-26-4z" fill="var(--c1)"/><circle cx="15" cy="23" r="1.8" fill="#1d2a2e"/><path d="M20 20c2 3 2 6 0 9" stroke="var(--c2)" stroke-width="2" fill="none"/>',
 bug: '<ellipse cx="24" cy="26" rx="8" ry="11" fill="var(--c1)"/><path d="M24 15v22" stroke="#1d2a2e" stroke-width="1.6"/><circle cx="24" cy="13" r="4" fill="#1d2a2e"/><path d="M16 22c-6-6-8-2-8 2 4 2 6 0 8-2zM32 22c6-6 8-2 8 2-4 2-6 0-8-2z" fill="var(--c2)" opacity=".85"/>',
 sword: '<path d="M34 6h8v8L20 36l-8-8z" fill="var(--c1)"/><path d="M36 8 16 28" stroke="#fff" stroke-width="1.6" opacity=".6"/><path d="m10 26 12 12-3 3-12-12z" fill="var(--c2)"/><path d="m8 36 4 4-4 4-4-4z" fill="var(--c2)"/>',
 bow: '<path d="M14 6c18 4 26 18 28 34" stroke="var(--c1)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 6 42 40" stroke="#e8eef0" stroke-width="1.4"/><path d="M8 40 30 18m0 0-6 1m6-1-1 6" stroke="var(--c2)" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
 crossbow: '<path d="M24 8v34" stroke="var(--c1)" stroke-width="5" stroke-linecap="round"/><path d="M8 18c8 6 24 6 32 0" stroke="var(--c2)" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M8 18 24 30l16-12" stroke="#e8eef0" stroke-width="1.4" fill="none"/>',
 staff: '<path d="M14 42 32 14" stroke="var(--c2)" stroke-width="4" stroke-linecap="round"/><circle cx="34" cy="11" r="7" fill="var(--c1)"/><circle cx="32" cy="9" r="2.4" fill="#fff" opacity=".7"/>',
 orb: '<circle cx="24" cy="22" r="13" fill="var(--c1)"/><circle cx="19" cy="17" r="4" fill="#fff" opacity=".55"/><path d="M14 38h20l-3-6H17z" fill="var(--c2)"/>',
 knuckle: '<rect x="8" y="16" width="32" height="16" rx="7" fill="var(--c1)"/><g fill="var(--c2)"><circle cx="15" cy="16" r="4"/><circle cx="22" cy="15" r="4"/><circle cx="29" cy="15" r="4"/><circle cx="36" cy="16" r="4"/></g>',
 harp: '<path d="M14 40V10c10 0 22 8 22 22v8z" fill="none" stroke="var(--c1)" stroke-width="4"/><path d="M18 14v24M24 16v22M30 22v16" stroke="var(--c2)" stroke-width="1.4"/>',
 lute: '<ellipse cx="20" cy="30" rx="10" ry="11" fill="var(--c1)"/><path d="M26 22 40 8" stroke="var(--c2)" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="30" r="3" fill="#3b2a1a"/>',
 fan: '<path d="M24 38 6 18a26 26 0 0 1 36 0z" fill="var(--c1)"/><path d="M24 38 12 13M24 38V10M24 38l12-25" stroke="var(--c2)" stroke-width="1.6"/><circle cx="24" cy="38" r="3" fill="var(--c2)"/>',
 top: '<path d="M16 8 8 14l4 8 4-2v20h16V20l4 2 4-8-8-6c-2 4-6 5-8 5s-6-1-8-5z" fill="var(--c1)"/><path d="M24 13v27" stroke="var(--c2)" stroke-width="2"/>',
 pants: '<path d="M14 8h20l2 32h-8l-4-20-4 20h-8z" fill="var(--c1)"/><rect x="14" y="8" width="20" height="5" fill="var(--c2)"/>',
 glove: '<path d="M14 40V20l-4-6 4-2 4 6V8h4v10-12h4v12-10h4v12-8h4v18c0 8-4 12-10 12z" fill="var(--c1)"/><rect x="14" y="34" width="20" height="6" rx="2" fill="var(--c2)"/>',
 boot: '<path d="M16 6h12v24l12 4v6H12V30z" fill="var(--c1)"/><rect x="12" y="36" width="28" height="4" fill="var(--c2)"/>',
 hat: '<path d="M10 30c0-12 6-20 14-20s14 8 14 20z" fill="var(--c1)"/><rect x="6" y="28" width="36" height="6" rx="3" fill="var(--c2)"/>',
 ring: '<circle cx="24" cy="28" r="11" fill="none" stroke="var(--c2)" stroke-width="4"/><path d="m24 8 6 6-6 6-6-6z" fill="var(--c1)"/>',
 pendant: '<path d="M10 8c4 14 24 14 28 0" stroke="var(--c2)" stroke-width="2" fill="none"/><path d="m24 22 8 8-8 10-8-10z" fill="var(--c1)"/>',
 blueprint: '<rect x="8" y="10" width="32" height="28" rx="3" fill="#3f6fa8"/><path d="M12 30h10V18h14M28 18v12h-6" stroke="#cfe3ff" stroke-width="1.6" fill="none"/><circle cx="36" cy="14" r="5" fill="var(--c1)"/>',
 scroll: '<rect x="10" y="12" width="28" height="24" fill="#efe2c2"/><rect x="7" y="9" width="34" height="6" rx="3" fill="var(--c2)"/><rect x="7" y="33" width="34" height="6" rx="3" fill="var(--c2)"/><path d="M14 20h20M14 25h20M14 30h12" stroke="var(--c1)" stroke-width="1.6"/>',
 part: '<circle cx="24" cy="24" r="10" fill="var(--c1)"/><g fill="var(--c1)"><rect x="21" y="6" width="6" height="8" rx="1.5"/><rect x="21" y="34" width="6" height="8" rx="1.5"/><rect x="6" y="21" width="8" height="6" rx="1.5"/><rect x="34" y="21" width="8" height="6" rx="1.5"/></g><circle cx="24" cy="24" r="4" fill="var(--c2)"/>',
 hammer: '<path d="M20 22 36 40" stroke="var(--c2)" stroke-width="4" stroke-linecap="round"/><path d="M8 18 20 6l10 10-12 12z" fill="var(--c1)"/>',
 tool: '<path d="M14 40 34 12" stroke="var(--c2)" stroke-width="4" stroke-linecap="round"/><path d="M22 10c8-4 16-2 20 4-6-2-12-1-16 4z" fill="var(--c1)"/>',
 rod: '<path d="M10 40 38 8" stroke="var(--c2)" stroke-width="3" stroke-linecap="round"/><path d="M38 8v20" stroke="#cfd8dc" stroke-width="1.2"/><circle cx="38" cy="30" r="3" fill="var(--c1)"/>',
 crystal: '<path d="m24 6 10 12-10 24-10-24z" fill="var(--c1)"/><path d="m24 6 10 12H14z" fill="var(--c2)"/><path d="M24 6v36" stroke="#fff" stroke-width="1.2" opacity=".4"/>',
 shard: '<path d="m14 36 6-22 10-6 4 14-8 16z" fill="var(--c1)"/><path d="m20 14 10-6 4 14z" fill="var(--c2)"/>',
 bomb: '<circle cx="22" cy="28" r="12" fill="var(--c1)"/><path d="M30 18l4-4" stroke="#6b5a40" stroke-width="3"/><path d="m36 12 2-4M36 12l4 0M36 12l3 3" stroke="var(--c2)" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="24" r="3" fill="#fff" opacity=".4"/>',
 box: '<path d="M8 18 24 10l16 8v18l-16 8-16-8z" fill="var(--c1)"/><path d="M8 18l16 8 16-8M24 26v18" stroke="var(--c2)" stroke-width="2" fill="none"/>',
 sack: '<path d="M16 12h16l-2 6c6 4 10 10 10 16 0 4-4 6-16 6S8 38 8 34c0-6 4-12 10-16z" fill="var(--c1)"/><path d="M16 12h16" stroke="var(--c2)" stroke-width="3"/>',
 sap: '<path d="M24 8c6 10 12 16 12 22a12 12 0 0 1-24 0c0-6 6-12 12-22z" fill="var(--c1)"/><ellipse cx="20" cy="28" rx="3" ry="5" fill="#fff" opacity=".45"/>',
 rope: '<circle cx="24" cy="24" r="13" fill="none" stroke="var(--c1)" stroke-width="6"/><circle cx="24" cy="24" r="13" fill="none" stroke="var(--c2)" stroke-width="2" stroke-dasharray="4 4"/>',
 chair: '<path d="M14 8h20v18H14z" fill="var(--c1)"/><path d="M10 26h28v6H10zM12 32v10M36 32v10" stroke="var(--c2)" stroke-width="4" fill="none"/>',
 misc: '<circle cx="24" cy="24" r="14" fill="var(--c1)"/><path d="M19 20a5 5 0 1 1 7 5c-2 1-2 2-2 4M24 34v1" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
};

// 名前の語から種類を決める。上から順に見て、最初に当たった物にする。
const rules = [
 [/設計図/, 'blueprint'], [/図案|スクロール|^紙$/, 'scroll'], [/マジックボム(?!部品)|ボム$/, 'bomb'], [/ボックス|箱|キャンプファイアキット/, 'box'], [/椅子/, 'chair'],
 [/ソード|クリーバー|ダガー|ブレード|エッジ|スティレット|ペシュカド|刃物|剣|刀/, 'sword'], [/クロスボウ/, 'crossbow'], [/ボウ|弓/, 'bow'], [/オーブ/, 'orb'], [/スタッフ|ワンド|ケイン|ロッド|杖|コイル/, 'staff'], [/ナックル/, 'knuckle'], [/チャクラム/, 'ring'], [/ハープ/, 'harp'], [/リュート|マンドリン|フルート|タンバリン/, 'lute'], [/扇子/, 'fan'],
 [/\(上\)|トップス|(?<!グ)ローブ|上着|コート/, 'top'], [/\(下\)|ボトムス|ズボン/, 'pants'], [/\(手\)|グローブ|手袋/, 'glove'], [/\(足\)|シューズ|ブーツ|靴/, 'boot'], [/\(頭\)|ハット|帽子|ヘルム|フード/, 'hat'],
 [/(?<!ヒー)リング|指輪/, 'ring'], [/ペンダント|ネックレス|イヤリング|ブレスレット/, 'pendant'],
 [/インゴット/, 'ingot'], [/鉱$|鉱石|鉱\+|石炭/, 'ore'], [/石ころ|魔力の宿った石|粘土/, 'stone'], [/マナストーン|結晶|クリスタル|宝石|スピネル|ガーネット|ジルコン|ペリドット|^氷$|凝縮された/, 'crystal'], [/欠片|かけら|破片/, 'shard'],
 [/釣り竿/, 'rod'], [/ツルハシ|斧|鎌|鍬|バサミ|ばさみ|網|シャベル/, 'tool'], [/ハンマー|やっとこ/, 'hammer'], [/部品|取っ手|滑車|釘|五徳|焼き板|針山|桶|紙やすり|手回し車|歯車|櫛|金床|炉|ふいご|研磨機|投入口|薬鉢/, 'part'],
 [/包帯/, 'bandage'], [/ポーション|秘薬|霊薬/, 'potion'], [/エキス|乳化剤|起爆剤|触媒|染料|アンプル|油/, 'vial'], [/瓶/, 'bottle'],
 [/生皮|革/, 'leather'], [/糸|ロープ|繊維/, 'thread'], [/羊毛/, 'wool'], [/生地|シルク|布|フェルト/, 'cloth'],
 [/丸太/, 'log'], [/木材|合板/, 'plank'], [/枝/, 'branch'], [/樹液|蜜蝋|ハチミツ|蜂蜜|にかわ|タール/, 'sap'],
 [/テントウムシ|ホタル|トンボ|ガ$|チョウ|ムシ|虫/, 'bug'],
 [/キノコ|胞子/, 'mushroom'], [/花|クローバー/, 'flower'], [/ハーブ|草|茎|苔|茶葉|葉/, 'herb'],
 [/サラダ|ステーキ|炒め|焼き|料理|チップス|パルミジャーナ|目玉焼き|ゆで卵|ご飯|麺|豆腐|パスタ|ピザ|サンド|オムレツ|グラタン|マヨネーズ|チーズ|シャワルマ|ペペロンチーノ|ムニエル/, 'dish'],
 [/ケーキ|スフレ|パイ|クッキー|タルト|おやつ/, 'cake'], [/スープ|ポタージュ|鍋|ブイヤベース|シチュー|カレー/, 'soup'], [/ジュース|豆乳(?!の)|ミルク|牛乳|かき氷|クリーム/, 'drink'],
 [/粉|塩|砂糖|スパイス|胡椒|コショウ|パウダー|くず/, 'powder'],
 [/卵/, 'egg'], [/肉/, 'meat'], [/マス$|サバ|サケ|スズキ|ナマズ|鯉|魚|鮒|アユ|タイ$|マグロ|ウナギ|エビ|カニ|貝/, 'fish'],
 [/リンゴ|イチゴ|レモン|ブドウ|ベリー|オレンジ|モモ|バナナ/, 'fruit'], [/小麦|米|豆|トウモロコシ/, 'grain'], [/ジャガイモ|ダイコン|ニンニク|タマネギ|パースニップ|唐辛子|ニンジン|キャベツ|カボチャ|トマト|ナス|アスパラガス/, 'veg'],
 [/毒袋|袋/, 'sack']
];
export const ITEM_KINDS = Object.keys(shapes);
export function itemKind(name) {
 for (const [re, kind] of rules) if (re.test(name)) return kind;
 return 'misc';
}

// 色。素材の語で主の色を、等級（上級・最上級）で地の色を決める。
const materialColor = [
 [/アイアン|鉄/, ['#8c99a3', '#c6d0d6']], [/スチール/, ['#6f8796', '#b7c8d3']], [/合金/, ['#9b8f6a', '#d8ccA4']], [/特殊/, ['#b48a52', '#e6c48a']], [/銅|ブロンズ/, ['#b87344', '#e0a473']], [/白銅|銀|シルバー/, ['#a9b7c0', '#e3ebef']], [/金|ゴールド/, ['#d1a23a', '#f2d27a']], [/隕鉄|ミスリル/, ['#5d6f9a', '#a8b8e0']],
 [/厚革/, ['#6e4428', '#9a6a44']], [/鱗/, ['#3f8a86', '#7cc2bb']], [/鎖/, ['#7d8a93', '#b8c3ca']], [/鉄板/, ['#9aa6ae', '#d0d8dd']], [/キルト|厚手/, ['#5e7fa8', '#a3bedc']], [/強化/, ['#7a5ea8', '#b9a3dc']],
 [/革|生皮/, ['#a0673a', '#c99060']], [/シルク/, ['#e3dbe9', '#bba9cf']], [/羊毛|生地|クモの糸/, ['#ece6d8', '#c9bfa8']],
 [/炎|火|唐辛子/, ['#e0583a', '#f6a35a']], [/氷|雪|防寒|グレイシャー/, ['#5fb4d8', '#bfe6f5']], [/雷|電/, ['#e6c341', '#f8e58c']], [/風/, ['#69c39a', '#bdeccf']], [/酸|毒/, ['#7ab33f', '#c3e48a']],
 [/回復|ヒーリング|治癒/, ['#e0546b', '#f2b0bc']], [/マナ|魔力/, ['#4f78d6', '#a9c1f2']], [/リンゴ|イチゴ/, ['#d8403f', '#f08a7d']], [/レモン/, ['#ecd04a', '#f6e894']],
 [/木|丸太|枝|樹/, ['#a57a4a', '#d2a978']], [/キノコ/, ['#c96d4a', '#efb08a']], [/ハーブ|草|葉|茎|苔|クローバー/, ['#5aa66a', '#a6dcae']], [/花/, ['#e58bb2', '#f6d06b']],
 [/卵|豆腐|豆乳|米|ご飯|麺/, ['#f3ead6', '#e2cfa3']], [/肉|ステーキ/, ['#b6524a', '#e08b7d']], [/サバ|サケ|スズキ|ナマズ|鯉|マス|魚/, ['#6f93ad', '#b6cfe0']]
];
const kindColor = { blueprint: ['#f2c56b', '#3f6fa8'], scroll: ['#7a5a2a', '#9a6b3a'], potion: ['#d8506a', '#8a6a4a'], vial: ['#6fb8a0', '#8a6a4a'], bandage: ['#e7c9a0', '#fff'], dish: ['#e8b56a', '#c96d4a'], soup: ['#e8a05a', '#8f5a3a'], cake: ['#f2a7b8', '#d8403f'], drink: ['#f2c56b', '#5aa66a'], powder: ['#d8b05a', '#a57a4a'], grain: ['#e2c26a', '#a68b3a'], veg: ['#d9b46a', '#8a6a3a'], fruit: ['#d8403f', '#f08a7d'], bug: ['#c9a227', '#9fd6e6'], egg: ['#f6efe0', '#e2cfa3'], meat: ['#b6524a', '#e08b7d'], fish: ['#6f93ad', '#b6cfe0'], part: ['#8c99a3', '#5d6a72'], hammer: ['#8c99a3', '#8a5a34'], tool: ['#9aa6ae', '#8a5a34'], rod: ['#e05a3a', '#8a5a34'], crystal: ['#7fb6e8', '#cfe6fb'], shard: ['#9b7fd6', '#d6c8f5'], bomb: ['#3d4a52', '#f2c56b'], box: ['#c9945a', '#7a5130'], chair: ['#e8a8c0', '#8a5a34'], sack: ['#7ab33f', '#5a7a2a'], sap: ['#e2a13a', '#fff'], rope: ['#c9a87a', '#8a6a4a'], stone: ['#9aa0a4', '#fff'], ring: ['#7fb6e8', '#d1a23a'], pendant: ['#7fb6e8', '#d1a23a'], misc: ['#8aa0a6', '#fff'] };
export function itemLook(name) {
 const kind = itemKind(name);
 const mat = materialColor.find(([re]) => re.test(name))?.[1];
 const [c1, c2] = mat ?? kindColor[kind] ?? ['#8c99a3', '#c6d0d6'];
 const tier = /最上級/.test(name) ? 'epic' : /上級/.test(name) ? 'rare' : /伝説|レジェンド/.test(name) ? 'legend' : '';
 const stars = /SS$|SS\)/.test(name) ? 2 : /S$|S\)/.test(name) ? 1 : 0;
 const plus = /\+$/.test(name);
 return { kind, c1, c2, tier, stars, plus };
}
export function itemSprite(kinds) {
 return `<svg class="item-sprite" aria-hidden="true" style="position:absolute;width:0;height:0">${[...new Set(kinds)].map(k => `<symbol id="ico-${k}" viewBox="0 0 48 48">${shapes[k]}</symbol>`).join('')}</svg>`;
}
export function itemIcon(name, size = 'm') {
 const l = itemLook(name);
 return `<span class="item-icon ${size}${l.tier ? ' ' + l.tier : ''}" aria-hidden="true"><svg viewBox="0 0 48 48" style="--c1:${l.c1};--c2:${l.c2}"><use href="#ico-${l.kind}"/></svg>${l.stars ? `<i class="stars">${'★'.repeat(l.stars)}</i>` : ''}${l.plus ? '<i class="plus">+</i>' : ''}</span>`;
}
