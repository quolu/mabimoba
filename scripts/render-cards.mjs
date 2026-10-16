import { readFile, writeFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { cardHtml, CARD_DIR, CARD_LEDGER, FONT_CSS_URL } from './cards.mjs';

// ページごとのカードを手元のChromium（chrome-headless-shell）で撮る。手順は docs/maintenance.md「共有用カード画像を作り直す」。
// 値が変わったカードだけを撮り直し、使われなくなったカードは消す。
const build = env => execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, ...env } });
const findChrome = async () => {
  if (process.env.MABIMOBA_CHROME) return process.env.MABIMOBA_CHROME;
  const base = join(homedir(), '.cache/ms-playwright');
  const dir = (await readdir(base).catch(() => [])).filter(name => name.startsWith('chromium_headless_shell-')).sort().at(-1);
  const path = dir && join(base, dir, 'chrome-headless-shell-linux64/chrome-headless-shell');
  if (!path || !existsSync(path)) throw new Error('CARDS_CHROME_MISSING: MABIMOBA_CHROME にchrome-headless-shellの場所を指定してください');
  return path;
};

build({ MABIMOBA_CARDS_PENDING: '1' });
const specs = JSON.parse(await readFile('dist/cards.json', 'utf8'));
const ledger = JSON.parse(await readFile(CARD_LEDGER, 'utf8').catch(() => '{}'));
const todo = specs.filter(spec => ledger[spec.name] !== spec.hash || !existsSync(`${CARD_DIR}/${spec.name}.jpg`));
await mkdir(CARD_DIR, { recursive: true });

if (todo.length) {
  const work = await mkdtemp(join(tmpdir(), 'mabimoba-cards-'));
  // 字体は先に手元へ落とす。撮る途中で Google Fonts の通信が詰まると、ページの読み込みが終わらない。
  const get = async (url, type) => {
    for (let i = 0; ; i++) {
      try {
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`CARDS_FONT_HTTP_${response.status}`);
        return type === 'text' ? response.text() : Buffer.from(await response.arrayBuffer());
      } catch (error) { if (i === 3) throw error; }
    }
  };
  let fontCss = await get(FONT_CSS_URL, 'text');
  const fontUrls = [...new Set(fontCss.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g))];
  await mkdir(join(work, 'fonts'));
  for (const [i, url] of fontUrls.entries()) {
    const file = join(work, 'fonts', `${i}.woff2`);
    await writeFile(file, await get(url));
    fontCss = fontCss.replaceAll(url, 'file://' + file);
  }
  // 1枚ずつ別のプロセスで撮る（常駐のChromiumをCDPで動かすと、読み込みの途中で止まる事があった）。
  const chrome = await findChrome(), assetBase = 'file://' + resolve('public/assets');
  try {
    for (const spec of todo) {
      const html = join(work, `${spec.name}.html`), png = join(work, `${spec.name}.png`);
      await writeFile(html, cardHtml(spec, assetBase, fontCss));
      for (let i = 0; ; i++) {
        try {
          execFileSync(chrome, ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--allow-file-access-from-files',
            '--virtual-time-budget=5000', `--user-data-dir=${join(work, 'profile')}`, `--screenshot=${png}`, 'file://' + html], { stdio: 'ignore', timeout: 60000 });
          break;
        } catch (error) { if (i === 2) throw new Error(`CARDS_RENDER_FAILED: ${spec.name}`); }
      }
      execFileSync('convert', [png, '-quality', '84', '-sampling-factor', '4:4:4', '-strip', `${CARD_DIR}/${spec.name}.jpg`]);
      ledger[spec.name] = spec.hash;
      await writeFile(CARD_LEDGER, JSON.stringify(ledger, null, 2) + '\n');
      process.stdout.write(`撮った: ${spec.name}\n`);
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

const names = new Set(specs.map(spec => spec.name));
for (const file of await readdir(CARD_DIR)) {
  if (file.endsWith('.jpg') && !names.has(file.slice(0, -4))) { await rm(`${CARD_DIR}/${file}`); process.stdout.write(`消した: ${file}\n`); }
}
await writeFile(CARD_LEDGER, JSON.stringify(Object.fromEntries([...names].sort().map(name => [name, ledger[name]])), null, 2) + '\n');
build({});
console.log(`カード: ${specs.length}枚（撮り直し${todo.length}枚）`);
