import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// ページごとの共有用カード（1200×630）。絵は `npm run cards` が手元のChromiumで撮り、public/assets/cards/ に置く。
// カードの元の値と型から作ったハッシュを content/cards.json に控え、値が変わったのに撮り直していなければビルドを止める。
export const CARD_DIR = 'public/assets/cards';
export const CARD_LEDGER = 'content/cards.json';
const CREDIT = '© NEXON Korea Corp. &amp; devCAT Corp.';
const e = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const cardName = key => key === '/' ? 'home' : key.replace(/^\/|\/$/g, '').replace(/[/#]+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();

// 題名の長さで字の大きさを決める。3行に収まらない長さは validate 側で短くする。
const titleSize = title => {
  const width = [...title].reduce((n, c) => n + (c.charCodeAt(0) < 128 ? .55 : 1), 0);
  return width <= 10 ? 76 : width <= 16 ? 64 : width <= 26 ? 54 : width <= 36 ? 46 : width <= 48 ? 40 : 34;
};

export const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=swap';

// fontCss は撮る時だけ手元へ落とした字体に差し替える。ハッシュは既定の @import の形で取る。
export function cardHtml(spec, assetBase, fontCss = `@import url('${FONT_CSS_URL}');`) {
  const art = spec.art.image
    ? `<div class="art ${spec.art.fit ?? 'frame'}"><img src="${assetBase}/${e(spec.art.image)}" alt=""><p>${CREDIT}</p></div>`
    : `<div class="art mark"><div class="ring"><svg viewBox="0 0 96 96" aria-hidden="true">${spec.art.svg}</svg></div></div>`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<style>
${fontCss}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#102c35;color:#fff;font-family:'Noto Sans JP',sans-serif;display:flex}
.copy{flex:1;min-width:0;padding:56px 40px 48px 64px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-size:21px;font-weight:700;color:#a5e5ce;letter-spacing:.04em}
.brand span{font-size:18px;padding:6px 14px;border-radius:8px;background:#21434a;color:#c9ece0;letter-spacing:.02em}
h1{font-size:${titleSize(spec.title)}px;font-weight:900;word-break:auto-phrase;line-height:1.28;letter-spacing:.02em;margin-top:34px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.lead{font-size:25px;font-weight:500;word-break:auto-phrase;line-height:1.6;color:#d2e1df;margin-top:24px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.site{margin-top:auto;padding-top:20px;font-size:20px;font-weight:700;color:#a5e5ce;letter-spacing:.04em}
.site small{font-size:16px;font-weight:500;color:#89a7aa;margin-left:14px;letter-spacing:0}
.art{flex:none;display:flex;flex-direction:column;justify-content:center}
.art p{font-size:13px;color:#89a7aa;text-align:right;margin-top:12px;letter-spacing:.04em}
.frame{width:560px;padding:0 48px 0 0}
.frame img{width:512px;height:288px;object-fit:contain;border-radius:14px;display:block;box-shadow:0 18px 40px #06181d99}
.portrait{width:430px;padding:28px 40px 24px 0;background:radial-gradient(circle at 50% 46%,#25765e66,#102c3500 66%)}
.portrait img{width:390px;height:520px;object-fit:contain;display:block}
.mark{width:430px;align-items:center;padding-right:24px}
.ring{width:340px;height:340px;border-radius:50%;background:#18343b;display:grid;place-items:center;box-shadow:inset 0 0 0 10px #21434a}
.ring svg{width:230px;height:230px}
</style></head><body>
<div class="copy"><div class="brand">マビモバ攻略ポータル<span>${e(spec.kicker)}</span></div><h1>${e(spec.title)}</h1>${spec.description ? `<p class="lead">${e(spec.description)}</p>` : ''}<p class="site">mabimoba.kitepon.dev<small>非公式ファンサイト</small></p></div>
${art}
</body></html>`;
}

// 型・値・使う絵のどれかが変わればハッシュが変わる。
export async function cardHash(spec) {
  const hash = createHash('sha256').update(cardHtml(spec, ''));
  if (spec.art.image) hash.update(await readFile(`public/assets/${spec.art.image}`));
  return hash.digest('hex').slice(0, 12);
}
