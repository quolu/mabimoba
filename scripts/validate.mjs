import { readFile, access } from 'node:fs/promises';
export async function validate(data, assets) {
 if(data.schemaVersion!==1)throw new Error('SCHEMA_UNSUPPORTED: 未対応の内容形式です');
 const date = /^\d{4}-\d{2}-\d{2}$/;
 if(!date.test(data.updatedAt))throw new Error('DATE_INVALID: 全体の確認日が不正です');
 const ids = new Set(data.sources.map(s=>s.id));
 if(ids.size!==data.sources.length) throw new Error('SOURCE_ID_DUPLICATE: 出典IDが重複しています');
 const articles = new Set(data.articles.map(a=>a.id));
 if(articles.size!==data.articles.length) throw new Error('ARTICLE_ID_DUPLICATE: 記事IDが重複しています');
 for(const s of data.sources) {if(!s.title||!s.checkedAt||!s.region||!s.language||!['official','community','x-official','x-community'].includes(s.kind)||!s.url.startsWith('https://'))throw new Error(`SOURCE_INVALID: ${s.id}`);}
 const allowed = new Set(['初心者','装備・成長','ダンジョン','生活']);
 for(const a of data.articles) {if(!allowed.has(a.category)||!a.region||!a.checkedAt||!a.sections.length||!a.sources.length)throw new Error(`ARTICLE_INCOMPLETE: ${a.id}`);for(const id of a.sources)if(!ids.has(id))throw new Error(`SOURCE_MISSING: ${a.id}/${id}`);for(const id of a.related)if(!articles.has(id))throw new Error(`ARTICLE_LINK_MISSING: ${id}`);}
 for(const item of [...data.database,...data.roadmap,...data.glossary]) {if(!articles.has(item.article))throw new Error(`ARTICLE_LINK_MISSING: ${item.article}`);for(const id of item.sources??[])if(!ids.has(id))throw new Error(`SOURCE_MISSING: ${id}`);}
 for(const f of data.families) {if(!ids.has(f.source))throw new Error(`SOURCE_MISSING: ${f.source}`);await access('public/assets/'+f.image);}
 for(const n of data.news) {if(!ids.has(n.source))throw new Error(`SOURCE_MISSING: ${n.source}`);if(!date.test(n.date)||!n.points.length)throw new Error(`NEWS_INVALID: ${n.id}`);}
 for(const p of data.social) {if(!p.url.startsWith(`https://x.com/${p.author}/status/`)||!['日本','韓国'].includes(p.region)||!Number.isFinite(Date.parse(p.postedAt)))throw new Error(`SOCIAL_INVALID: ${p.id}`);if(p.corroboratedBy&&!ids.has(p.corroboratedBy))throw new Error(`SOURCE_MISSING: ${p.corroboratedBy}`);}
 for(const a of assets.assets)await access('public/assets/'+a.file);
 for(const a of data.articles.filter(a=>a.image))await access('public/assets/'+a.image);
 console.log(`内容確認: 記事${data.articles.length}・出典${data.sources.length}・DB${data.database.length}・素材${assets.assets.length}`);
}
if(process.argv[1]?.endsWith('/validate.mjs'))await validate(JSON.parse(await readFile('content/portal.json')),JSON.parse(await readFile('content/assets.json')));
