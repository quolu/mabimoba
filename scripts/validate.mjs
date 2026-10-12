import { readFile, access } from 'node:fs/promises';
export async function validate(data, assets) {
 if(typeof data.discord?.enabled!=='boolean')throw new Error('DISCORD_PUBLICATION_INVALID: Discord案内の公開設定が不正です');
 if(data.schemaVersion!==1)throw new Error('SCHEMA_UNSUPPORTED: 未対応の内容形式です');
 const date = /^\d{4}-\d{2}-\d{2}$/;
 if(!date.test(data.updatedAt))throw new Error('DATE_INVALID: 全体の確認日が不正です');
 const ids = new Set(data.sources.map(s=>s.id));
 if(ids.size!==data.sources.length) throw new Error('SOURCE_ID_DUPLICATE: 出典IDが重複しています');
 const articles = new Set(data.articles.map(a=>a.id));
 if(articles.size!==data.articles.length) throw new Error('ARTICLE_ID_DUPLICATE: 記事IDが重複しています');
 for(const s of data.sources) {if(!s.title||!s.checkedAt||!s.region||!s.language||!['official','community','media','x-official','x-community'].includes(s.kind)||!s.url.startsWith('https://'))throw new Error(`SOURCE_INVALID: ${s.id}`);}
 const allowed = new Set(['初心者','装備・成長','ダンジョン','生活']);
 const bases = new Set(['実機で確認','日本公式ガイド','日本公式の告知','韓国版の資料','攻略媒体の記事','プレイヤーの投稿','編集部の見方']);
 const checkSections=(owner,sections)=>sections.forEach((s,i)=>{const bad=why=>{throw new Error(`SECTION_INVALID: ${owner}/${i} ${why}`)};if(!s.title)bad('題名なし');if(![s.paragraphs,s.facts,s.flow,s.steps,s.chips,s.unknown].some(b=>b?.length)&&!s.table)bad('中身なし');if(s.basis&&!bases.has(s.basis))bad('basis');if(s.facts?.some(f=>!f.label||!f.value))bad('facts');if(s.flow?.some(f=>!f.title||!['state','step'].includes(f.kind)))bad('flow');if(s.steps?.some(f=>!f.title))bad('steps');if(s.chips?.some(c=>typeof c!=='string'||!c))bad('chips');if(s.unknown?.some(u=>typeof u!=='string'||!u))bad('unknown');if(s.table&&(!s.table.head?.length||!s.table.rows?.length||s.table.rows.some(r=>r.length!==s.table.head.length)))bad('table');if(s.link&&(!s.link.label||!s.link.href?.startsWith('/')))bad('link');});
 for(const a of data.articles) {if(!allowed.has(a.category)||!a.region||!a.checkedAt||!a.sections.length||!a.sources.length)throw new Error(`ARTICLE_INCOMPLETE: ${a.id}`);for(const id of a.sources)if(!ids.has(id))throw new Error(`SOURCE_MISSING: ${a.id}/${id}`);for(const id of a.related)if(!articles.has(id))throw new Error(`ARTICLE_LINK_MISSING: ${id}`);if(a.points&&(!Array.isArray(a.points)||!a.points.length||a.points.some(p=>typeof p!=='string'||!p)))throw new Error(`ARTICLE_POINTS_INVALID: ${a.id}`);if(a.highlight&&(!a.highlight.value||!a.highlight.label))throw new Error(`ARTICLE_HIGHLIGHT_INVALID: ${a.id}`);checkSections(a.id,a.sections);}
 for(const item of [...data.database,...data.roadmap,...data.glossary]) {if(!articles.has(item.article))throw new Error(`ARTICLE_LINK_MISSING: ${item.article}`);for(const id of item.sources??[])if(!ids.has(id))throw new Error(`SOURCE_MISSING: ${id}`);}
 for(const f of data.families) {if(!ids.has(f.source))throw new Error(`SOURCE_MISSING: ${f.source}`);await access('public/assets/'+f.image);}
 const g=data.gathering;if(!g||!date.test(g.checkedAt)||!g.lead||!g.points?.length||!g.skills?.length)throw new Error('GATHERING_INVALID: 採集図鑑の内容が不足しています');if(new Set(g.skills.map(s=>s.id)).size!==g.skills.length)throw new Error('GATHERING_SKILL_DUPLICATE');for(const s of g.skills){if(!s.id||!s.name||!s.tool||!Array.isArray(s.destinations)||(!s.destinations.length&&!s.pending))throw new Error(`GATHERING_SKILL_INVALID: ${s.id}`);for(const d of s.destinations)if(!d.name||!Number.isInteger(d.level)||!['screen','record'].includes(d.check))throw new Error(`GATHERING_DESTINATION_INVALID: ${s.id}/${d.name}`);}for(const id of g.sources)if(!ids.has(id))throw new Error(`SOURCE_MISSING: gathering/${id}`);checkSections('gathering',g.sections);
 for(const n of data.news) {for(const id of n.sources??[n.source])if(!ids.has(id))throw new Error(`SOURCE_MISSING: ${id}`);if(!date.test(n.date)||!n.points.length)throw new Error(`NEWS_INVALID: ${n.id}`);}
 for(const p of data.social) {if(!p.url.startsWith(`https://x.com/${p.author}/status/`)||!['日本','韓国'].includes(p.region)||!Number.isFinite(Date.parse(p.postedAt)))throw new Error(`SOCIAL_INVALID: ${p.id}`);if(p.corroboratedBy&&!ids.has(p.corroboratedBy))throw new Error(`SOURCE_MISSING: ${p.corroboratedBy}`);}
 const updateTypes = new Set(['新しい記事','記事の更新','ニュース','Xの情報','データの更新','サイトの改良']);
 if(!Array.isArray(data.changelog)||!data.changelog.length)throw new Error('CHANGELOG_MISSING: サイトの更新情報がありません');
 if(data.changelog[0].date!==data.updatedAt)throw new Error('CHANGELOG_STALE: updatedAt と同じ日付の更新情報がありません');
 data.changelog.forEach((c,i)=>{if(!date.test(c.date)||!c.summary||!c.items?.length||(i&&c.date>=data.changelog[i-1].date))throw new Error(`CHANGELOG_INVALID: ${c.date}`);for(const item of c.items)if(!updateTypes.has(item.type)||!item.text||(item.url&&!item.url.startsWith('/')))throw new Error(`CHANGELOG_ITEM_INVALID: ${c.date}/${item.text}`);});
 for(const a of assets.assets)await access('public/assets/'+a.file);
 for(const a of data.articles.filter(a=>a.image))await access('public/assets/'+a.image);
 console.log(`内容確認: 記事${data.articles.length}・出典${data.sources.length}・DB${data.database.length}・素材${assets.assets.length}・更新情報${data.changelog.length}日分`);
}
if(process.argv[1]?.endsWith('/validate.mjs'))await validate(JSON.parse(await readFile('content/portal.json')),JSON.parse(await readFile('content/assets.json')));
