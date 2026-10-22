import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('ボットのimageに、起動で読み込むリポジトリ内のモジュールが全部入る', async () => {
  const sources = (await read('bot/Dockerfile')).split('\n').filter(line => line.startsWith('COPY ') && !line.includes('--from'))
    .flatMap(line => line.split(/\s+/).slice(1, -1));
  const pattern = new RegExp('^(' + sources.map(source => source.replace(/[.]/g, '\\.').replace(/\*/g, '[^/]*')).join('|') + ')$');
  const seen = new Set();
  const walk = async file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const [, spec] of (await read(file)).matchAll(/(?:from\s+|import\(\s*)'(\.{1,2}\/[^']+)'/g)) await walk(normalize(join(dirname(file), spec)));
  };
  await walk('bot/server.mjs');
  // 10月17日に recipes.mjs が item-icons.mjs を読むようになり、imageに入らず起動で落ちる状態だった。
  assert.deepEqual([...seen].filter(file => !pattern.test(file)), []);
});
