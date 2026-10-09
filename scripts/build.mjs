import { readFile, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validate } from './validate.mjs';
import { planNotifications } from './discord-updates.mjs';
const deployTarget = JSON.parse(await readFile(new URL('../deploy/target.json', import.meta.url), 'utf8'));
const botOrigin = `https://${deployTarget.domain}`;
const data = JSON.parse(await readFile('content/portal.json', 'utf8'));
const assets = JSON.parse(await readFile('content/assets.json', 'utf8'));
await validate(data, assets);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const e = escape;
const sourceMap = Object.fromEntries(data.sources.map(s => [s.id, s]));
const nav = [['/', 'ホーム', 'home'], ['/beginner/', '初心者ロードマップ', 'book'], ['/guides/', '攻略ガイド', 'compass'], ['/classes/', '職業図鑑', 'sword'], ['/database/', 'データベース', 'database'], ['/life/', '生活・ものづくり', 'leaf'], ['/news/', '日本・海外ニュース', 'news'], ['/community/', '日韓のX情報', 'message'], ...(data.discord.enabled ? [['/discord/', 'Discord更新通知', 'message']] : []), ['/updates/', 'サイトの更新情報', 'clock']];
const paths = {
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
 book:'M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V6',
 compass:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-6-3-2 4-4 2 2-4z',
 sword:'m14 3 7 0 0 7-12 12-7-7L14 3M3 21l4-4M3 13l8 8',
 database:'M20 6c0 2-4 3-8 3S4 8 4 6s4-3 8-3 8 1 8 3m0 0v12c0 2-4 3-8 3s-8-1-8-3V6m0 6c0 2 4 3 8 3s8-1 8-3',
 leaf:'M20 3C8 2 3 7 4 14s11 11 16-11M4 20 15 9',
 news:'M5 3h15v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8h2V3m3 4h9M8 11h9M8 15h5M5 8v11',
 message:'M21 11a8 8 0 0 1-8 8H6l-4 3 1-7a8 8 0 1 1 18-4M7 10h10M7 14h6',
 search:'M19 19l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 external:'M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
 clock:'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 chevron:'m9 5 7 7-7 7', check:'m5 12 4 4 10-10', menu:'M4 6h16M4 12h16M4 18h16'
};
const icon = name => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"></path></svg>`;
const badge = (text, type='') => `<span class="badge ${type}">${e(text)}</span>`;
const link = (url,text) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(text)} ${icon('external')}</a>`;
const articleHref = id => `/guides/${id}/`;
const asset = (name, alt, cls='') => `<img src="/assets/${name}" alt="${e(alt)}" class="${cls}" loading="lazy" decoding="async">`;
const sectionHeading = (kicker,title,url,label) => `<div class="section-heading"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${url?`<a class="text-link" href="${url}">${label}</a>`:''}</div>`;
const articleCard = a => `<a class="article-card" href="${articleHref(a.id)}"><div class="card-meta">${badge(a.category)}<span>${a.readingMinutes}分で読む</span></div><h3>${e(a.title)}</h3><p>${e(a.description)}</p><div class="card-bottom"><span>${e(a.region)} · ${a.sources.some(id=>sourceMap[id].kind==='community')?'プレイヤー投稿を参照':a.region==='日本版'?'公式告知を参照':'公式ガイドを参照'}</span>${icon('chevron')}</div></a>`;
const familyCard = f => `<a class="family-card family-${f.id}" href="/classes/${f.id}/"><div>${badge(f.role)}<h3>${e(f.title)}<span>系統</span></h3><p>${f.classes.length}つの転職クラス</p></div>${asset(f.image,`${f.title}系統の公式キャラクター`)}</a>`;
const sourceList = ids => `<div class="source-list">${ids.map(id=>{const s=sourceMap[id];return `<div>${badge(s.kind==='official'?'公式':s.kind==='media'?'攻略媒体':'プレイヤー投稿',s.kind==='official'?'green':'amber')} ${link(s.url,s.title)}<p>${e(s.region)} · ${({'ko':'韓国語','ja':'日本語','zh-Hant':'繁体字中国語'})[s.language]} · 確認 ${s.checkedAt}${s.asOf?` · 資料の基準 ${s.asOf}`:' · 資料の基準日記載なし'}</p></div>`}).join('')}</div>`;
const categories = ['初心者','装備・成長','ダンジョン','生活'];
const site = 'https://mabimoba.kitepon.dev';
const feedTitle = 'マビモバ攻略ポータルの更新情報';
const dotted = date => date.replaceAll('-','.');
// X・Discord・LINEなどでリンクを貼った時のカード。画像を作り直した時だけURLの?v=が変わり、共有先の古い画像が入れ替わる。
const shareImage = `${site}/assets/og-card.jpg?v=${createHash('sha256').update(await readFile('public/assets/og-card.jpg')).digest('hex').slice(0,8)}`;
const shareImageAlt = 'マビモバ攻略ポータル。韓国の先行情報を、日本語で。草原で羊と過ごす公式イラスト';
const shareTitle = title => title==='ホーム'?'マビモバ攻略ポータル':title+' | マビモバ攻略ポータル';
const updateTone = {'新しい記事':'blue','記事の更新':'green','データの更新':'green','Xの情報':'amber','サイトの改良':'navy'};
const updateItem = i => `<li>${badge(i.type,updateTone[i.type]??'')}${i.url?`<a href="${e(i.url)}">${e(i.text)}</a>`:`<span>${e(i.text)}</span>`}</li>`;
function layout(title,body,route='/',description='韓国の先行情報を日本語で整理。初心者ロードマップ、職業図鑑、ダンジョン・成長データ、生活ガイドと日韓のX情報。') {
 const active = nav.find(([url])=>url!=='/'&&route.startsWith(url))?.[0]??'/';
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title==='ホーム'?'マビモバ攻略ポータル':title+' | マビモバ攻略ポータル')}</title><meta name="description" content="${e(description)}"><meta name="theme-color" content="#102c35"><link rel="canonical" href="https://mabimoba.kitepon.dev${route}"><meta property="og:site_name" content="マビモバ攻略ポータル"><meta property="og:locale" content="ja_JP"><meta property="og:type" content="website"><meta property="og:url" content="${site}${route}"><meta property="og:title" content="${e(shareTitle(title))}"><meta property="og:description" content="${e(description)}"><meta property="og:image" content="${shareImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${shareImageAlt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(shareTitle(title))}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${shareImage}"><meta name="twitter:image:alt" content="${shareImageAlt}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="alternate" type="application/atom+xml" title="${feedTitle}" href="/feed.xml"><link rel="stylesheet" href="/style.css?v=${revision}"><script src="/app.js?v=${revision}" defer></script></head><body>
 <a class="skip-link" href="#main">本文へ移動</a><aside class="sidebar" id="navigation"><a class="brand" href="/" aria-label="マビモバ攻略ポータル ホーム"><span class="brand-mark">${icon('compass')}</span><span><strong>マビモバ</strong><small>攻略ポータル</small></span></a><button class="nav-close" type="button" aria-label="メニューを閉じる">×</button><p class="nav-heading">エリンの冒険手帳</p><nav aria-label="メインナビゲーション">${nav.map(([url,label,ico])=>`<a href="${url}" ${active===url?'aria-current="page"':''}>${icon(ico)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-bottom"><a href="/about/">情報の読み方・出典</a><span>by <a href="https://kitepon.dev/">kitepon.dev</a></span><p>非公式ファンサイト</p></div></aside>
 <div class="app-shell"><header class="topbar"><button class="menu-button" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="navigation">${icon('menu')}</button><span class="topbar-label">MABINOGI MOBILE <span>FIELD GUIDE</span></span><a class="search-shortcut" href="/search/">${icon('search')}<span>攻略・職業・韓国語で検索</span><kbd>/</kbd></a><span class="header-region">日本語で読む海外攻略</span></header><main id="main" tabindex="-1">${body}</main><footer class="footer"><div><strong>マビモバ攻略ポータル</strong><p>韓国の先行情報と、日本・韓国のコミュニティから。</p></div><div><a href="/about/">掲載方針・画像の出典</a><p>情報確認日 ${data.updatedAt} · <a href="/updates/">サイトの更新情報</a> · 日本語名は一部仮訳</p></div><p class="copyright">本サイトはNEXONおよびdevCATの公式サイトではありません。ゲーム・公式画像の権利は各権利者に帰属します。<br>© 2026 NEXON Co., Ltd. & devCAT CO., LTD. All Rights reserved. ／ 韓国公式素材 © NEXON Korea Corp. & devCAT CO., LTD.</p></footer></div></body></html>`;
}
function pageHeading(kicker,title,description) {return `<div class="page-heading"><span class="eyebrow">${kicker}</span><h1>${e(title)}</h1><p>${e(description)}</p></div>`}
function home() {
 const latest=data.changelog[0];
 return `<div class="home-hero"><div class="hero-copy"><span class="eyebrow">YOUR ADVENTURE IN ERIN</span><h1>エリンを、<br>もっと楽しむ。</h1><p>韓国の先行情報を、日本語で。<br>最初の一歩から、次のダンジョンまで。</p><a class="button light" href="/beginner/">初心者ロードマップ</a><span class="hero-note">マビノギモバイル 非公式攻略ポータル</span></div><div class="hero-art"><img src="/assets/pasture.webp" alt="青空の下、羊たちと過ごすエリンの草原。韓国公式イラスト" width="740" height="416" fetchpriority="high"><span>ILLUSTRATION : NEXON / devCAT</span></div></div>
 <div class="launch-strip">${badge('日本版 10月7日開始','blue')}<p>開始記念のプレゼント、毎日のボーナス、期限のあるイベントを日本公式の告知から整理しました。</p><a href="/guides/jp-launch-checklist/">スタートガイドを読む</a></div>
 <div class="notice-strip">${badge('韓国版の先行情報','green')}<p>攻略の仕様・解放条件は主に韓国版を参照。日本版との差分は、記事ごとの出典から確認できます。</p><a href="/about/">情報の読み方</a></div>
 <section class="update-panel">${sectionHeading('WHAT&#39;S NEW','サイトの更新情報','/updates/','これまでの更新を見る')}<p class="update-date">最新の更新 <time datetime="${latest.date}">${dotted(latest.date)}</time></p><ul class="update-items">${latest.items.slice(0,4).map(updateItem).join('')}</ul>${latest.items.length>4?`<a class="text-link" href="/updates/#u-${latest.date}">この日の更新をすべて見る（全${latest.items.length}件）</a>`:''}</section>
 <section class="quick-links" aria-label="目的から探す">${[['/beginner/','book','まずはここから','初心者ロードマップ'],['/classes/','sword','自分に合う職業を','職業図鑑'],['/database/','database','条件・報酬を比較','データベース'],['/life/','leaf','もう一つの冒険','生活・ものづくり']].map(([url,ico,small,title])=>`<a href="${url}"><span class="quick-icon">${icon(ico)}</span><span><small>${small}</small><strong>${title}</strong></span></a>`).join('')}</section>
 <div class="home-columns"><section>${sectionHeading('START YOUR JOURNEY','はじめてのエリン','/beginner/','ロードマップを見る')}<a class="beginner-feature" href="/beginner/"><div>${badge('初心者ガイド','green')}<h3>何から始める？<br>進行順でわかる、最初の冒険。</h3><p>クエスト、装備、ダンジョン。<br>今の自分に必要なことを、ひとつずつ。</p><span class="button dark">進行ガイドを読む</span></div>${asset('tir-chonaill.webp','ティルコネイルの広場と風車')}</a><div class="mini-roadmap">${data.roadmap.slice(0,3).map(s=>`<a href="/beginner/#${s.id}"><span>${s.step}</span><div><strong>${e(s.stage)}</strong><small>${e(s.title)}</small></div></a>`).join('')}</div></section>
 <section>${sectionHeading('LATEST NOTES','冒険者へのお知らせ','/news/','ニュース一覧')}<div class="news-stack">${[data.news.find(n=>n.region==='日本版'),data.news.find(n=>n.region!=='日本版')].filter(Boolean).map(n=>`<a class="news-card" href="/news/#${n.id}"><div>${badge(n.tag,n.region==='日本版'?'blue':'green')}<time>${n.date.replaceAll('-','.')}</time></div><h3>${e(n.title)}</h3><p>${e(n.summary)}</p><span>${n.region??'韓国版'} · 公式発表を参照</span></a>`).join('')}<a class="community-teaser" href="/community/">${icon('message')}<div><strong>日韓のXから、冒険のヒントを</strong><p>公式告知とプレイヤーの実戦記録を読む</p></div></a></div></section></div>
 <section>${sectionHeading('CLASS ENCYCLOPEDIA','あなたの冒険スタイルを見つけよう','/classes/','全職業を見る')}<div class="families-grid">${data.families.map(familyCard).join('')}</div><p class="section-note">韓国版で確認した6系統・21転職クラス。日本版の掲載状況も職業図鑑で確認できます。</p></section>
 <section>${sectionHeading('ADVENTURE GUIDE','次に読みたい攻略','/guides/','攻略ガイド一覧')}<div class="article-grid">${['rune-basics','dungeon-basics','gem-guide'].map(id=>articleCard(data.articles.find(a=>a.id===id))).join('')}</div></section>
 <section class="life-banner">${asset('fishing.webp','川辺で釣りを楽しむ冒険者')}<div><span class="eyebrow">LIFE IN ERIN</span><h2>戦う日も、のんびりする日も。</h2><p>採集、製作、焚き火、マイホーム。<br>エリンでの暮らしを、自分のペースで。</p><a class="button dark" href="/life/">生活ガイドを読む</a></div></section>`;
}
const revision = createHash('sha256').update(JSON.stringify(data)).update(await readFile('public/style.css')).update(await readFile('public/app.js')).update(await readFile('scripts/build.mjs')).update(await readFile('scripts/discord-updates.mjs')).update(botOrigin).digest('hex').slice(0,12);
await rm('dist',{recursive:true,force:true}); await mkdir('dist',{recursive:true}); await cp('public','dist',{recursive:true});
const pages = new Map();
pages.set('/', {title:'ホーム',body:home()});
function guideListing(life=false) {
 const rows=data.articles.filter(a=>!life||a.category==='生活');
 return pageHeading(life?'LIFE IN ERIN':'ADVENTURE LIBRARY',life?'生活・ものづくり':'攻略ガイド',life?'採集して、作って、誰かと過ごす。エリンでの暮らしに必要なことをまとめました。':'初心者、装備、ダンジョン、生活。今知りたいことから攻略を探せます。')+
 (life?`<div class="life-banner">${asset('fishing.webp','川辺の釣りを描いた韓国公式イラスト')}<div><span class="eyebrow">TAKE YOUR TIME</span><h2>暮らしも、冒険の一部。</h2><p>道具をそろえ、ひとつのレシピから始めよう。</p></div></div><br>`:`<div class="toolbar" data-filter-target="guides">${['すべて','日本版',...categories].map((c,i)=>`<button class="filter-chip" type="button" data-filter="${e(c)}" aria-pressed="${i===0}">${c}</button>`).join('')}</div>`)+
 `<p class="section-note">${rows.length}記事 · 日本版・韓国版・繁体字版を参照 · 公式仕様と編集部の提案を区別して掲載</p><div class="article-grid" id="guides">${rows.map(a=>`<div data-category="${a.category}${a.region==='日本版'?' 日本版':''}">${articleCard(a)}</div>`).join('')}</div>`;
}
function articlePage(a) {
 const community=a.sources.some(id=>sourceMap[id].kind==='community');
 const figure=assets.assets.find(x=>x.file===a.image);
 return `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/guides/">攻略ガイド</a> / ${e(a.category)}</div><div class="article-layout"><article class="article-body">${badge(a.category)} ${badge(a.region,'green')}${community?' '+badge('プレイヤー投稿を参照','amber'):''}<h1>${e(a.title)}</h1><p class="lead">${e(a.description)}</p><div class="article-meta"><span>確認 ${a.checkedAt}</span><span>${a.readingMinutes}分で読む</span>${a.region==='日本版'?'':'<span>日本語名は一部仮訳</span>'}</div><div class="info-box">${a.region==='日本版'?(a.sources.every(id=>sourceMap[id].kind==='official')?'日本版の公式告知をもとにした情報です。期間や報酬は変更される場合があります。ゲーム内の表示と、記事末尾の出典も確認してください。':'日本版の公式資料を軸に、実機で確かめた内容、攻略媒体やプレイヤーの投稿、韓国版の資料を合わせた情報です。どの資料で確かめたかは本文で区別しています。ゲーム内の表示と、記事末尾の出典も確認してください。'):e(a.region)+'の情報です。日本版では実装時期・数値・解放条件が異なる場合があります。資料の基準日は記事末尾で確認できます。'}</div>${a.image?`<figure>${asset(a.image,figure?.alt??'韓国公式の生活イラスト')}<figcaption>${e(figure?.caption??'韓国公式メディアのイラスト（記事末尾に出典）')}</figcaption></figure>`:''}${a.sections.map((s,i)=>`<section id="section-${i}"><h2>${e(s.title)}</h2>${s.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}<section class="advice-box" id="advice"><h2>進め方のヒント ${badge('編集部の提案')}</h2><ul>${a.advice.map(p=>`<li>${e(p)}</li>`).join('')}</ul></section><section id="sources"><h2>この記事の出典</h2>${sourceList(a.sources)}<p class="section-note">確認日は原文を調べた日、資料の基準日は参照元が明記したゲームの状態です。両者は異なります。</p></section>${a.related.length?`<section><h2>続けて読みたい</h2>${a.related.map(id=>{const r=data.articles.find(x=>x.id===id);return `<a class="search-result" href="${articleHref(id)}"><h3>${e(r.title)}</h3><p>${e(r.description)}</p></a>`}).join('')}</section>`:''}</article><aside class="article-aside"><div><h2>この記事の内容</h2>${a.sections.map((s,i)=>`<a href="#section-${i}">${e(s.title)}</a>`).join('')}<a href="#advice">進め方のヒント</a><a href="#sources">出典・基準日</a><a href="/guides/">攻略ガイド一覧へ</a></div></aside></div>`;
}
function beginner() {
 const total=data.roadmap.reduce((n,s)=>n+s.tasks.length,0);
 return pageHeading('BEGINNER ROADMAP','初心者ロードマップ','始めたばかりの冒険から、高難度に挑むまで。日数を急がず、解放された機能から順に進めよう。')+
 `<div class="info-box">進行順は編集部の提案です。レイド・アビスのレベル条件は韓国公式ガイドを参照しています。日本版の解放条件はゲーム内表示を確認してください。</div><div class="progress-panel"><div><strong>あなたの冒険の進み具合</strong><div class="progress-bar" role="progressbar" aria-label="ロードマップの進行" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><span style="width:0%"></span></div><small id="progress-text">0 / ${total} 完了</small><small> · このブラウザに保存</small><p id="storage-error" hidden role="alert"></p></div><button class="reset-button" type="button">チェックをすべて外す</button></div><div class="timeline">${data.roadmap.map(s=>`<article class="timeline-card" id="${s.id}"><div class="step-number">${s.step}</div><div class="timeline-content">${badge(s.stage,'green')}<h2>${e(s.title)}</h2><p>${e(s.body)}</p><div class="checklist">${s.tasks.map((task,i)=>`<label><input type="checkbox" data-task="${s.id}-${i}"><span>${e(task)}</span></label>`).join('')}</div><a href="${articleHref(s.article)}" class="text-link">この段階の攻略を読む</a><details><summary>参照した公式資料</summary>${sourceList(s.sources)}</details></div></article>`).join('')}</div>`;
}
function classes() {
 return pageHeading('CLASS ENCYCLOPEDIA','職業図鑑','6つの見習い系統から、プレイスタイルを見つけよう。韓国語名と、日本公式での掲載状況を併記しています。')+`<div class="info-box">韓国公式では21の転職クラスを確認。日本公式の紹介ページでは18クラスを確認しています。「日本公式に掲載」は現在の性能・全機能の一致を保証するものではありません。</div><div class="families-grid">${data.families.map(familyCard).join('')}</div><br><h2>転職クラスを一覧で比較</h2><div class="toolbar" data-filter-target="class-rows">${['すべて','日本公式に掲載','韓国先行情報'].map((c,i)=>`<button class="filter-chip" data-filter="${c}" type="button" aria-pressed="${i===0}">${c}</button>`).join('')}</div><div class="data-grid" id="class-rows">${data.families.flatMap(f=>f.classes.map(c=>`<a class="data-card" data-category="${c.japanListed?'日本公式に掲載':'韓国先行情報'}" href="/classes/${f.id}/#${c.id}"><div>${badge(f.title+'系統')}${badge(c.japanListed?'日本公式に掲載':'韓国先行情報',c.japanListed?'green':'amber')}</div><h2>${e(c.name)}</h2><span class="korean-name" lang="ko">${e(c.korean)}</span><p>${e(f.role)} · 系統の特徴と公式資料を確認する</p></a>`)).join('')}</div>`;
}
function familyPage(f) {
 return `<div class="breadcrumbs"><a href="/">ホーム</a> / <a href="/classes/">職業図鑑</a> / ${f.title}系統</div><article class="class-detail"><div class="class-portrait">${asset(f.image,`${f.title}の公式紹介画像`)}</div><div class="class-description"><span class="eyebrow">CLASS FIELD NOTES</span>${badge(f.role,'green')}<h1>${f.title}系統</h1><p>${e(f.description)}</p><span class="korean-name" lang="ko">${e(f.korean)} 계열</span><h2>転職クラス</h2><div class="class-list">${f.classes.map(c=>`<div id="${c.id}"><span><strong>${e(c.name)}</strong><small lang="ko">${e(c.korean)}</small></span>${badge(c.japanListed?'日本公式に掲載':'韓国先行情報',c.japanListed?'green':'amber')}</div>`).join('')}</div></div></article><div class="article-body"><h2>選ぶ時に確認したいこと</h2><p>クラスは装着した武器で切り替えられます。まずはスキルの使い方、距離の取り方、パーティでの役割を試してみよう。紹介の短い説明から最強順位や育成難度を判断せず、ゲーム内のスキルと最新調整を確認してください。</p><div class="info-box">騎士・雷術士・暗黒術士は今回の確認では韓国公式紹介に掲載され、日本公式紹介では掲載を確認できていません。実装予定日は断定していません。</div><h2>公式紹介で詳細を確認</h2>${sourceList(f.sources)}<h2>装備を整える</h2><div class="article-grid">${['rune-basics','gem-guide','equipment-conversion'].map(id=>articleCard(data.articles.find(a=>a.id===id))).join('')}</div></div>`;
}
function database() {
 return pageHeading('GAME DATABASE','データベース','入場条件、必要な資源、報酬回数をまとめて比較。装備と生活の仕組みも、攻略記事へつなげています。')+`<div class="toolbar" data-filter-target="database-rows">${['すべて','ダンジョン','装備・成長','生活'].map((c,i)=>`<button type="button" class="filter-chip" data-filter="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</div><p class="section-note">${data.database.length}項目 · 韓国版 · 時刻は韓国時間（日本と同じUTC+9）</p><div class="data-grid" id="database-rows">${data.database.map(r=>`<article class="data-card" id="${r.id}" data-category="${r.category}">${badge(r.category)} ${badge('韓国公式','green')}<h2>${e(r.name)}</h2><span class="korean-name" lang="ko">${e(r.korean)}</span><dl>${[['条件',r.entry],['資源・人数',r.resource],['報酬・効果',r.reward],['周期・注意',r.reset]].map(([t,v])=>`<div><dt>${t}</dt><dd>${e(v)}</dd></div>`).join('')}</dl><a class="text-link" href="${articleHref(r.article)}">攻略と出典を読む</a><p class="section-note">資料基準 ${r.sources.map(id=>sourceMap[id].asOf??'記載なし').join(' / ')} · 確認 ${data.updatedAt}</p></article>`).join('')}</div><br>${sectionHeading('KOREAN ↔ JAPANESE','韓国語の用語から探す','/search/','用語を検索')}<div class="glossary-grid">${data.glossary.map(g=>`<a class="glossary-card" href="${articleHref(g.article)}"><h3>${e(g.japanese)}</h3><span class="korean-name" lang="ko">${e(g.korean)}</span><p>${e(g.description)}</p></a>`).join('')}</div>`;
}
function newsPage() {
 return pageHeading('NEWS & UPDATES','日本・海外ニュース','先行する韓国版の更新と、日本版の正式情報。地域を確かめて、今のプレイに関わる変更を読もう。')+
 `<div class="toolbar" data-filter-target="news-rows">${['すべて','日本版','韓国版','台湾・香港・マカオ版'].map((c,i)=>`<button type="button" class="filter-chip" data-filter="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</div><div id="news-rows">${data.news.map(n=>`<article class="news-detail" id="${n.id}" data-category="${n.region??'韓国版'}">${badge(n.region??'韓国版',n.region==='日本版'?'blue':'green')} ${badge(n.tag)}<time datetime="${n.date}">${n.date}</time><h2>${e(n.title)}</h2><p>${e(n.summary)}</p><ul>${n.points.map(p=>`<li>${e(p)}</li>`).join('')}</ul><div class="info-box"><strong>プレイにどう関わる？</strong><p>${e(n.impact)}</p></div>${sourceList(n.sources??[n.source])}</article>`).join('')}</div>`;
}
function socialPage() {
 return pageHeading('COMMUNITY FIELD NOTES','日韓のX情報','日本語と韓国語の投稿から、公式告知や実戦記録をピックアップ。原文と投稿時刻を添えて紹介します。')+`<div class="info-box">公式告知、プレイ記録、感想、告知の紹介を区別しています。単独の投稿にある数値や対処法は、そのまま確定仕様として攻略DBに採用しません。一覧の最終更新は ${data.updatedAt} です。</div><div class="toolbar" data-filter-target="social-rows">${['すべて','日本','韓国'].map((c,i)=>`<button type="button" class="filter-chip" data-filter="${c}" aria-pressed="${i===0}">${c}</button>`).join('')}</div><div class="social-grid" id="social-rows">${data.social.map(p=>`<article class="social-card" id="post-${p.id}" data-category="${p.region}"><div class="social-meta">${badge(p.region,p.region==='日本'?'blue':'green')}${badge(p.type,p.type==='公式告知'?'green':'amber')}</div><h2>${e(p.title)}</h2><span class="social-author">@${e(p.author)} · ${new Date(p.postedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} JST</span><p>${e(p.summary)}</p><p class="social-note">${e(p.note)}</p>${link(p.url,'Xで原文を読む')}${p.corroboratedBy?`<p>${link(sourceMap[p.corroboratedBy].url,'照合した公式資料')}</p>`:''}</article>`).join('')}</div><div class="info-box">投稿本文や添付画像の全文転載は行わず、要点を要約しています。関連仕様を知りたい時は、公式資料のある攻略ガイドも確認してください。</div>`;
}
function updatesPage() {
 return pageHeading('SITE UPDATES','サイトの更新情報','記事の追加、ニュースの反映、サイトの改良を日付ごとに記録しています。新しい順に並んでいます。')+
 `<div class="info-box">定期更新は毎日16時ごろ（日本時間）。公式の新着や直す内容が無い日は更新しません。フィードリーダーでは <a href="/feed.xml">更新フィード（Atom）</a> から受け取れます。</div><div class="update-log">${data.changelog.map(c=>`<article class="update-entry" id="u-${c.date}"><time datetime="${c.date}">${dotted(c.date)}</time><div><h2>${e(c.summary)}</h2><ul class="update-items">${c.items.map(updateItem).join('')}</ul></div></article>`).join('')}</div>`;
}
function feed() {
 const stamp=date=>date+'T00:00:00+09:00';
 const rows=data.changelog.flatMap(c=>c.items.map(i=>({...i,date:c.date}))).slice(0,50);
 return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ja"><title>${feedTitle}</title><subtitle>記事の追加、ニュースの反映、サイトの改良</subtitle><link href="${site}/updates/"/><link rel="self" type="application/atom+xml" href="${site}/feed.xml"/><id>${site}/updates/</id><updated>${stamp(data.changelog[0].date)}</updated><author><name>マビモバ攻略ポータル</name></author>${rows.map(i=>`<entry><title>${e('【'+i.type+'】'+i.text)}</title><link href="${e(site+(i.url??'/updates/#u-'+i.date))}"/><id>tag:mabimoba.kitepon.dev,${i.date}:${createHash('sha256').update(i.type+i.text).digest('hex').slice(0,16)}</id><updated>${stamp(i.date)}</updated><category term="${e(i.type)}"/></entry>`).join('')}</feed>`;
}
function about() {
 return pageHeading('ABOUT THIS FIELD GUIDE','情報の読み方・出典','このサイトは、海外の先行情報を日本語で整理する非公式の攻略ポータルです。')+`<div class="article-body"><h2>地域と資料の基準日を見る</h2><p>攻略記事とDBの主な対象は韓国版です。日本版で使う場合はゲーム内の表示を照合してください。「確認日」は原文を確認した日、「資料の基準日」は公式ガイドが示したゲームの状態です。古い基準のガイドは現在の調整が反映されていない可能性があります。</p><h2>公式仕様と攻略の提案</h2><p>仕様はNEXONの公式ガイドを優先して掲載しています。記事の「進め方のヒント」とロードマップの順番は、読んだ資料をもとに編集部が組み立てた提案です。プレイヤーの実戦記録は投稿として表示し、単独の検証や感想を確定仕様と同じ扱いにしていません。記事末尾の出典欄では、「公式」「攻略媒体」「プレイヤー投稿」を分けて表示します。編集部が日本版の実機で確かめた内容は、確かめた日と範囲を本文に書いています。</p><h2>職業名と日本版の掲載状況</h2><p>日本公式で確認できる職業名は日本公式の表記を使い、韓国先行の名前と用語には仮訳を含みます。職業図鑑の「日本公式に掲載」は紹介ページに載っているという意味です。海外の性能や解放条件が日本版でも同じとは限りません。</p><h2>Xの情報</h2><p>日本語・韓国語を検索し、公式発表、攻略、プレイ記録、感想を分けて紹介しています。本文や画像の全文転載は行わず、投稿者・投稿時刻・原文リンクを掲載します。公式アカウントは日本公式サイトからのリンクも確認しました。</p><h2>画像の出典</h2><p>イラストと人物画像はマビノギモバイルの韓国公式メディア・公式クラス紹介を、日本版の記事の画像は日本公式のお知らせを参照しています。本サイトはNEXONやdevCATによる公式・公認サイトではありません。公式画像・ゲームの著作権は各権利者に帰属します。</p><p>${link('https://m.nexon.com/terms/1497','日本公式の著作物利用ガイドライン')}</p><div class="asset-list">${assets.assets.map(a=>`<div class="asset-credit">${asset(a.file,a.name)}<p>${e(a.name)} · ${a.dimensions.join(' × ')}<br>${e(a.note)}</p>${link(a.sourcePage,'公式の掲載元')}</div>`).join('')}</div><h2>参照した資料</h2>${sourceList(data.sources.map(s=>s.id))}<h2>情報の更新</h2><p>最終更新は ${data.updatedAt}。何を追加・変更したかは<a href="/updates/">サイトの更新情報</a>に日付ごとに記録しています。更新日時と各記事の出典を確認して利用してください。閲覧だけでXや公式サイトの新着を自動取得する仕組みではありません。</p></div>`;
}
const index = [
 ...data.articles.map(a=>({kind:'攻略ガイド',title:a.title,description:a.description,url:articleHref(a.id),text:[a.title,a.category,a.description,...a.sections.flatMap(s=>[s.title,...s.paragraphs]),...a.advice].join(' ')})),
 ...data.families.flatMap(f=>f.classes.map(c=>({kind:'職業図鑑',title:c.name+' / '+c.korean,description:f.title+'系統 · '+f.role+(c.japanListed?' · 日本公式に掲載':' · 韓国先行情報'),url:`/classes/${f.id}/#${c.id}`,text:f.title+' '+f.korean+' '+f.description+' '+c.name+' '+c.korean}))),
 ...data.database.map(r=>({kind:'データベース',title:r.name+' / '+r.korean,description:r.entry+' · '+r.reward,url:'/database/#'+r.id,text:Object.values(r).flat().join(' ')})),
 ...data.glossary.map(g=>({kind:'韓国語の用語',title:g.japanese+' / '+g.korean,description:g.description,url:articleHref(g.article),text:g.japanese+' '+g.korean+' '+g.description})),
 ...data.news.map(n=>({kind:'ニュース',title:n.title,description:n.summary,url:'/news/#'+n.id,text:n.title+' '+n.summary+' '+n.points.join(' ')})),
 ...data.social.map(p=>({kind:'Xの情報',title:p.title,description:p.summary,url:'/community/#post-'+p.id,text:p.title+' '+p.summary+' '+p.region+' '+p.author}))
];
pages.set('/beginner/',{title:'初心者ロードマップ',body:beginner()});
pages.set('/guides/',{title:'攻略ガイド',body:guideListing()});
pages.set('/life/',{title:'生活・ものづくり',body:guideListing(true)});
pages.set('/classes/',{title:'職業図鑑',body:classes()});
pages.set('/database/',{title:'データベース',body:database()});
pages.set('/news/',{title:'日本・海外ニュース',body:newsPage()});
pages.set('/community/',{title:'日韓のX情報',body:socialPage()});
pages.set('/updates/',{title:'サイトの更新情報',body:updatesPage(),description:'マビモバ攻略ポータルに追加した記事、反映したニュース、サイトの改良を日付ごとに記録しています。'});
pages.set('/about/',{title:'情報の読み方・出典',body:about()});
if(data.discord.enabled)pages.set('/discord/', { title: 'Discord更新通知', body: pageHeading('DISCORD UPDATES','あなたのサーバーへ、マビモバの新着を','ボットを招待すると、攻略記事の追加、日本・海外のニュース、サイトの更新情報をDiscordで受け取れます。') + `<div class="article-body"><div class="discord-stats"><span class="eyebrow">導入サーバー数</span><p data-discord-stats data-status="loading" role="status">JavaScriptを有効にすると、導入サーバー数を表示します。</p><small>ページを開いた時点で、Botが参加しているDiscordサーバーの数です。</small></div><p><a class="button dark" href="/discord/invite" rel="nofollow">Discordサーバーへ招待する</a></p><h2>通知を始める</h2><ol><li>招待ボタンから、自分が管理するDiscordサーバーを選びます。</li><li>ボットが「攻略通信（kitepon.dev）」というテキストチャンネルを作り、自動で通知先に登録します。Discordでは「.」が除かれ、「攻略通信（kitepondev）」と表示されます。説明欄にはURL付きの正式名を残します。</li><li>最新日の更新が届きます。その後は、公開された新しい項目だけを通知します。</li></ol><p>投稿先を変える時や通知を再開する時は、希望するチャンネルで <code>/マビモバ 開始</code> を実行してください。「サーバーの管理」権限が必要です。1つのサーバーにつき通知先は1つです。</p><h2>停止と設定確認</h2><p><code>/マビモバ 状態</code> で通知先と送信状況を確認できます。<code>/マビモバ 停止</code> で通知を停止し、通知先と配信履歴を削除します。停止状態は保存され、再起動しても通知を再開しません。サーバーからボットを外すと停止状態も削除されます。</p><h2>どんな情報が届く？</h2><p><a href="/updates/">サイトの更新情報</a>を日付ごとにまとめ、更新内容、対象地域、記事へのリンク、代表出典を送ります。更新担当は毎日16時ごろに確認し、新しく公開する情報がある日に通知します。</p><div class="info-box">海外版の情報は日本版への適用を確認してください。日本語名は一部仮訳を含みます。仕様の出典と確認日は各記事に掲載しています。</div><h2>必要な権限</h2><p>ボットには「チャンネルの管理」「チャンネルを見る」「メッセージを送信」「埋め込みリンク」「メッセージ履歴を読む」を許可してください。履歴の権限は、送信結果を確認するために使います。会話の内容やメンバー一覧を収集する機能はありません。</p><h2 id="privacy">プライバシー</h2><p>通知先のサーバーID・チャンネルID、登録日時、通知済み項目と最後に送ったメッセージID、送信の成功・失敗を保存します。Botトークンや、サーバー内の会話本文は登録情報へ保存しません。停止コマンドは通知先と配信履歴を削除し、サーバーIDと停止状態だけを残します。ボットの退会で全て削除します。データは運営のサーバーで管理し、第三者へ提供しません。</p><h2 id="terms">利用について</h2><p>マビモバ攻略ポータルはNEXON・devCAT等による公式サービスではありません。通知は情報提供を目的とし、配信時刻やゲーム内仕様との一致を保証するものではありません。停止や障害などの運営連絡は<a href="https://kitepon.dev/">kitepon.dev</a>へお願いします。</p></div>` });
pages.set('/search/',{title:'攻略を検索',body:pageHeading('SEARCH THE FIELD GUIDE','攻略を検索','日本語・韓国語で、攻略記事、職業、条件・報酬、X情報をまとめて探せます。')+`<form class="search-form" action="/search/" method="get" role="search"><input type="search" class="search-input" id="site-search" name="q" placeholder="例：ルーン、深部、룬、アビス" aria-label="攻略・職業・用語を検索"><button class="button dark" type="submit">検索</button></form><div class="toolbar" data-search-examples>${['ルーン','アビス','釣り','日本版','룬','장궁병'].map(t=>`<a class="filter-chip" href="/search/?q=${encodeURIComponent(t)}">${t}</a>`).join('')}</div><p id="search-count" class="section-note" aria-live="polite">検索語を入力してください。</p><div id="search-results" class="search-results"></div><noscript><div class="info-box">検索にはJavaScriptが必要です。<a href="/guides/">攻略ガイド一覧</a>や<a href="/classes/">職業図鑑</a>から探せます。</div></noscript>`});
for(const a of data.articles)pages.set(articleHref(a.id),{title:a.title,body:articlePage(a),description:a.description});
for(const f of data.families)pages.set(`/classes/${f.id}/`,{title:f.title+'系統の職業',body:familyPage(f),description:f.description});
await writeFile('dist/search-index.json',JSON.stringify(index));
await writeFile('dist/discord-updates.json', JSON.stringify({ schemaVersion: 1, revision, latestDate: data.changelog[0].date, batches: planNotifications(data, [], botOrigin) }));
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+[...pages.keys()].map(route=>`<url><loc>https://mabimoba.kitepon.dev${route}</loc><lastmod>${data.updatedAt}</lastmod></url>`).join('')+'</urlset>');
await writeFile('dist/feed.xml',feed());
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nSitemap: https://mabimoba.kitepon.dev/sitemap.xml\n');
await writeFile('dist/content-status.json',JSON.stringify({updatedAt:data.updatedAt,articles:data.articles.length,classes:data.families.reduce((n,f)=>n+f.classes.length,0),database:data.database.length,social:data.social.length,sources:data.sources.length,changelog:data.changelog.length}));

const rendered = new Map([...pages].map(([route,p])=>[route,layout(p.title,p.body,route,p.description)]));
for(const row of index) {
 const url=new URL(row.url,'https://mabimoba.kitepon.dev');
 const html=rendered.get(url.pathname);
 if(!html)throw new Error(`VIEW_MISSING: ${row.url}`);
 if(url.hash&&!html.includes(`id="${url.hash.slice(1)}"`))throw new Error(`VIEW_ANCHOR_MISSING: ${row.url}`);
}
for(const [route,html] of rendered) {
 for(const match of html.matchAll(/href="(\/[^"]*)"/g)) {
  const url=new URL(match[1].replaceAll('&amp;','&'),'https://mabimoba.kitepon.dev');
  if(url.pathname==='/style.css'||url.pathname==='/favicon.svg'||url.pathname==='/feed.xml'||url.pathname==='/discord/invite')continue;
  if(!rendered.has(url.pathname))throw new Error(`LOCAL_LINK_MISSING: ${route} → ${url.pathname}`);
  if(url.hash&&!rendered.get(url.pathname).includes(`id="${url.hash.slice(1)}"`))throw new Error(`LOCAL_ANCHOR_MISSING: ${match[1]}`);
 }
 await mkdir('dist'+route,{recursive:true});await writeFile('dist'+route+'index.html',html);
}
await writeFile('dist/404.html',layout('ページが見つかりません',pageHeading('PAGE NOT FOUND','ページが見つかりません','記事を移動したか、URLが違っている可能性があります。')+'<a class="button dark" href="/search/">攻略を検索する</a>','/404/'));
await writeFile('dist/healthz',JSON.stringify({status:'ok',revision,updatedAt:data.updatedAt}));
console.log(`${pages.size}ページを生成しました。 http://127.0.0.1:4321`);
