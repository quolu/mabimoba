// ダンジョンと狩り場の挿絵。公式の絵が無い場所を、編集部が描いた風景で見分けられるようにする。
// どれも 640×240 の同じ枠で、空（奥）→ 地形 → 手前の順に重ねる。
const sky = (id, top, bottom) => `<defs><linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><rect width="640" height="240" fill="url(#sky-${id})"/>`;
const stars = (color, points) => points.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`).join('');
const glow = (x, y, r, color, opacity = .35) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/><circle cx="${x}" cy="${y}" r="${r * .45}" fill="${color}" opacity="${opacity + .25}"/>`;

const art = {
 // 岩の洞窟：奥の明かりと、垂れ下がる岩
 cave: () => `${sky('cave', '#1d2f3a', '#3b4b52')}${glow(320, 150, 90, '#f2c56b', .18)}<path d="M0 0h640v40c-40 30-70 10-100 40s-60-20-90 20-50-10-80 10-60 0-90-20-60 30-90 10-60-20-90 10-60-10-100-10z" fill="#132029"/><path d="M60 40l14 50 14-50zM210 70l10 38 10-38zM420 60l12 44 12-44zM540 50l9 34 9-34z" fill="#132029"/><path d="M0 240V170c60-30 110-10 160-40s80 10 120 30 70-40 120-30 80 30 120 10 80 0 120 20v80z" fill="#22343c"/><path d="M0 240v-30c80-20 160 0 240-10s140-10 220 0 120 10 180 0v40z" fill="#0e1a20"/>${glow(250, 196, 10, '#a5e5ce', .5)}${glow(400, 204, 8, '#a5e5ce', .5)}`,
 // 苔の洞窟：緑の光と木の根
 moss: () => `${sky('moss', '#173a33', '#2f5a48')}${glow(330, 130, 100, '#a5e5ce', .16)}<path d="M0 0h640v50c-50 20-90-10-140 20s-90 0-140-10-80 30-130 10S110 50 60 70 20 40 0 50z" fill="#0f2a25"/><path d="M110 0c10 60-30 90-10 150M150 0c-10 50 30 80 10 140M480 0c-20 60 20 80 0 160M520 0c10 40-20 70 0 120" stroke="#3d6b4d" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M0 240V180c70-20 120 10 190-10s120-20 180 0 110 10 160-10 80 0 110 10v70z" fill="#1d4434"/><path d="M0 240v-34c60-14 120 4 190-6s150-8 230 2 140-4 220 4v34z" fill="#0d221c"/>${stars('#c8f5d8', [[200, 120, 2.5], [260, 90, 2], [420, 110, 2.5], [470, 150, 2], [350, 70, 1.8], [150, 160, 2]])}`,
 // 冷たい屋敷：月と尖った屋根
 mansion: () => `${sky('mansion', '#1b2340', '#46507a')}<circle cx="520" cy="60" r="30" fill="#e8ecff" opacity=".85"/>${stars('#e8ecff', [[90, 40, 1.5], [180, 70, 1.2], [300, 30, 1.6], [420, 60, 1.2], [600, 110, 1.4]])}<path d="M150 240V120l40-50 40 50v-30l50-50 50 50v30l40-50 40 50v120z" fill="#10162b"/><path d="M190 140h18v24h-18zM270 120h20v30h-20zM350 140h18v24h-18zM270 180h20v30h-20z" fill="#f2c56b" opacity=".75"/><path d="M0 240v-40c80-20 140 0 220-10s200 0 260-10 110 10 160 0v60z" fill="#0b1020"/><path d="M60 240v-90h8v90zM560 240v-70h8v70z" fill="#0b1020"/><path d="M40 160l24-40 24 40zM540 180l24-40 24 40z" fill="#0b1020"/>`,
 // 地下の遺跡：柱とアーチ
 ruins: () => `${sky('ruins', '#2a2a3a', '#5a5368')}${glow(320, 120, 110, '#f2c56b', .12)}<path d="M120 240V90h40v150zM480 240V90h40v150z" fill="#1d1c29"/><path d="M110 90h60v-16h-60zM470 90h60v-16h-60z" fill="#2c2a3c"/><path d="M200 240V140a120 120 0 0 1 240 0v100h-36V146a84 84 0 0 0-168 0v94z" fill="#1d1c29"/><path d="M0 240v-36h640v36z" fill="#121119"/><path d="M40 204l30-30 20 30zM560 204l20-24 30 24zM300 210h50l-10-14h-30z" fill="#2c2a3c"/>${stars('#f6d58e', [[320, 150, 3], [300, 170, 1.8], [345, 175, 2]])}`,
 // 島の遺跡：海と灰色の塔
 island: () => `${sky('island', '#5f7d91', '#b9cbd3')}<circle cx="120" cy="70" r="26" fill="#f4f1e2" opacity=".8"/><path d="M0 170c80-10 160 6 240 0s160-8 240 0 120 6 160 2v68H0z" fill="#3d6478"/><path d="M200 172V96l20-22 20 22v76zM270 172v-50h28v50zM330 172V110l16-18 16 18v62zM390 172v-36h30v36z" fill="#59656c"/><path d="M180 176c40-14 220-14 260 0z" fill="#46524f"/><path d="M0 200c60-10 120 6 180 0s140-8 220 0 160 8 240 0v40H0z" fill="#2c4c5c"/><path d="M40 214h60M200 222h80M420 212h70M540 226h50" stroke="#a9c7d2" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
 // 夕闇の遺跡
 dusk: () => `${sky('dusk', '#3c2a4a', '#d78a62')}<circle cx="430" cy="150" r="46" fill="#f7c06f" opacity=".85"/><path d="M0 170c80-10 160 6 240 0s160-8 240 0 120 6 160 2v68H0z" fill="#4a3346"/><path d="M150 172V110h24v62zM186 172V84l18-20 18 20v88zM240 172v-40h30v40zM470 172V120h24v52z" fill="#2a1d2c"/><path d="M0 204c60-10 120 6 180 0s140-8 220 0 160 8 240 0v36H0z" fill="#231828"/><path d="M380 214h90M520 222h60" stroke="#f7c06f" stroke-width="3" stroke-linecap="round" opacity=".5"/>`,
 // 鉱山：坑道の枠とトロッコの線路
 mine: () => `${sky('mine', '#2a2420', '#5a4a3a')}<path d="M0 240V70c80 10 140-20 220 0s140 20 200 0 140-10 220 10v160z" fill="#3a2f27"/><path d="M230 240V110h180v130h-28V138H258v102z" fill="#7a5a3a"/><path d="M220 108h200v-16H220z" fill="#8f6b45"/><path d="M258 240V138h124v102z" fill="#14100d"/>${glow(320, 170, 30, '#f2c56b', .3)}<path d="M120 240l60-40M520 240l-60-40M150 222h340M170 208h300" stroke="#a88a6a" stroke-width="4" stroke-linecap="round"/><path d="M60 160l20-12 16 18zM540 150l22-10 12 20z" fill="#9fb6c2"/>`,
 // 古墳：石の門と鬼火
 tomb: () => `${sky('tomb', '#1a1d26', '#3a3f4f')}<path d="M0 240V160c100-60 200-80 320-80s220 20 320 80v80z" fill="#2a2e3a"/><path d="M250 240V140h140v100z" fill="#3c4150"/><path d="M270 240V158h100v82z" fill="#0f1117"/><path d="M240 140h160l-14-18H254z" fill="#4a5060"/>${glow(200, 120, 14, '#8fe0ff', .4)}${glow(450, 100, 12, '#8fe0ff', .4)}${glow(320, 190, 18, '#8fe0ff', .25)}<path d="M0 240v-26h640v26z" fill="#12141b"/>`,
 // 地下水路：水面の反射
 water: () => `${sky('water', '#0f2a3a', '#1e5066')}<path d="M0 0h640v60c-40 10-80-10-120 0s-80 20-120 10-80-10-120 0-80 20-120 10S40 50 0 60z" fill="#0a1d28"/><path d="M80 60v120M200 60v110M440 60v110M560 60v120" stroke="#1a3d4e" stroke-width="22"/><path d="M0 170h640v70H0z" fill="#12546b"/><path d="M40 190h120M220 204h160M420 188h120M100 220h90M470 222h110" stroke="#8fd8ef" stroke-width="3" stroke-linecap="round" opacity=".6"/>${stars('#bff0ff', [[300, 100, 2], [340, 80, 1.6], [380, 120, 2], [260, 130, 1.4]])}`,
 // 森の小道
 forest: () => `${sky('forest', '#2f5f4a', '#9fd3a6')}<path d="M0 240V120l40-60 40 60V90l30-50 30 50v150zM480 240V100l36-60 36 60v-20l30-40 30 40v160z" fill="#1f4a37"/><path d="M220 240c20-40 60-80 100-80s80 40 100 80z" fill="#e6d7a8" opacity=".9"/><path d="M0 240v-30c80-10 160 0 220 10h200c60-10 140-20 220-10v30z" fill="#163a2b"/>${stars('#fff6c2', [[300, 120, 3], [350, 100, 2.4], [260, 90, 2], [400, 140, 2.6]])}`,
 // オオカミの森：針葉樹と遠吠えの丘
 wolf: () => `${sky('wolf', '#28465a', '#8fb0a8')}<circle cx="500" cy="64" r="28" fill="#f6efd8" opacity=".9"/><path d="M0 200c80-40 160-60 260-40s200 40 380 0v80H0z" fill="#355b4b"/><path d="M40 210l26-70 26 70zM90 214l30-86 30 86zM150 212l22-60 22 60zM460 214l28-80 28 80zM520 216l24-64 24 64zM570 214l30-90 30 90z" fill="#1d3a30"/><path d="M330 158l10-14 4 6 10-2 6 12-4 2-2 8h-6l-2-6h-10l-2 8h-6z" fill="#1d3a30"/><path d="M0 240v-20c100-10 200 4 320 0s220-12 320 0v20z" fill="#142a22"/>`,
 // 女神の庭：大きな木と花
 garden: () => `${sky('garden', '#5aa58a', '#d8f0c8')}<path d="M300 240V120h40v120z" fill="#5b4a33"/><circle cx="320" cy="96" r="70" fill="#2f7d58"/><circle cx="260" cy="120" r="44" fill="#3b9467"/><circle cx="384" cy="118" r="48" fill="#3b9467"/><path d="M0 240v-50c80-20 180-10 260 4s220 10 380-10v56z" fill="#5ea86f"/>${stars('#ffd1e0', [[80, 214, 5], [140, 222, 4], [470, 216, 5], [540, 224, 4], [600, 210, 4]])}${stars('#fff3a6', [[110, 226, 3], [500, 228, 3], [200, 218, 3]])}`,
 // 氷の峡谷：雪山と氷柱
 ice: () => `${sky('ice', '#7fb2d0', '#e4f2fa')}<path d="M0 200L90 80l60 70 80-110 90 120 70-80 90 100 60-60 100 100v40H0z" fill="#b8d4e4"/><path d="M90 80l20 24-30 10zM230 40l26 34-40 12zM410 60l24 26-34 8z" fill="#fff"/><path d="M0 240v-40c100-20 200 10 320 0s220-20 320 0v40z" fill="#eef7fc"/><path d="M200 240l20-50 20 50zM420 240l16-40 16 40z" fill="#9fd0ea"/>${stars('#fff', [[60, 50, 2], [180, 30, 1.6], [330, 50, 2], [500, 30, 1.8], [600, 60, 2]])}`,
 // 雲の荒野
 desert: () => `${sky('desert', '#d9a26a', '#f4dcb2')}<circle cx="140" cy="70" r="30" fill="#fff4d6" opacity=".9"/><path d="M0 180l80-30 60 20 90-50 70 40 80-30 100 30 80-20 80 30v70H0z" fill="#b8784a"/><path d="M300 150v-30h40v30zM290 120h60l-10-12h-40z" fill="#8a5434"/><path d="M0 240v-36c100-20 200 6 320-6s220-6 320 6v36z" fill="#9a5f3a"/><path d="M40 120c40-6 80 0 120-8M420 90c50-6 100 2 150-6" stroke="#fff4d6" stroke-width="4" stroke-linecap="round" opacity=".5"/>`,
 // センマイ平原：裂け目と墓標
 plain: () => `${sky('plain', '#6b7a7a', '#c8cdb4')}<path d="M0 170c120-20 220 0 320-6s200-20 320 0v76H0z" fill="#7c8a5a"/><path d="M240 240l40-60 20 30 30-50 20 80z" fill="#3a3326"/><path d="M90 186v-26h12v26zM84 166h24M480 192v-30h12v30zM474 170h24M540 196v-22h10v22z" stroke="#4a4a3a" stroke-width="4" fill="none"/><path d="M0 240v-24c120-10 240 6 320 0s200-10 320 0v24z" fill="#5d6a42"/>`,
 // 蒼白の山：城跡
 castle: () => `${sky('castle', '#4f5a6e', '#b7bfcc')}<path d="M0 220L120 90l80 70 80-110 120 130 80-60 160 110v-10z" fill="#6b7486"/><path d="M250 120V70h14v-12h10v12h14v-12h10v12h14v50z" fill="#3b4250"/><path d="M262 120v-24h12v24z" fill="#1c2028"/><path d="M0 240v-30c120-20 220 6 320-4s200-14 320 4v30z" fill="#4a5262"/>${stars('#eaf0ff', [[100, 40, 1.6], [420, 30, 1.8], [560, 60, 1.4]])}`
};
export const SCENES = Object.keys(art);
let serial = 0;
// 同じページに同じ絵が2枚あってもグラデーションのidが重ならないよう、番号を付け替える。
export function scene(kind, label = '') {
 if (!art[kind]) throw new Error(`SCENE_UNKNOWN: ${kind}`);
 const n = ++serial;
 return `<svg class="scene" viewBox="0 0 640 240" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${art[kind]().replaceAll(`sky-${kind}`, `sky-${kind}-${n}`)}</svg>`;
}
