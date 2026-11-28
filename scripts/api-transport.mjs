import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 呼び出しの入口。環境変数でトークンを渡された時は、その鍵で直接呼ぶ（製品は認証仲介を必須にしない）。
// 渡されていない時は、BellTeamの認証仲介（auth http）に頼む。鍵は仲介の中にあり、このプロセスには来ない。
// 仲介は呼び出し元を作業フォルダで見分ける。BellTeamの席では、クローン（repos/mabimoba）の2つ上が席のフォルダ。
const AUTH = process.env.AUTH_BIN || '/srv/bellteam/shared/tools/auth-mediation/bin/auth';
const AUTH_CWD = process.env.AUTH_CWD || fileURLToPath(new URL('../../..', import.meta.url));

/** request({tokenVar, authScheme, origin, item, method, path, body}) → {status, body}。pathは origin 以降の全文（仲介の項目の接頭辞で始まること）。 */
export async function request({ tokenVar, authScheme, origin, item, method, path, body }) {
  const token = process.env[tokenVar];
  if (token) {
    const response = await fetch(origin + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: authScheme + ' ' + token, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), 'User-Agent': 'mabimoba-deploy/1.0' },
      ...(body === undefined ? {} : { body }),
    });
    return { status: response.status, body: await response.text() };
  }
  const args = ['http', item, method, path, ...(body === undefined ? [] : ['-H', 'Content-Type: application/json', '--data-file', '-'])];
  const result = spawnSync(AUTH, args, { cwd: AUTH_CWD, input: body, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw new Error(`${tokenVar}_MISSING: 環境変数 ${tokenVar} を渡すか、認証仲介（${AUTH}）を使える席で流してください`);
  const status = result.status === 22 ? Number(/HTTP (\d+)/.exec(result.stderr)?.[1]) : 200;
  if (result.status !== 0 && result.status !== 22) throw new Error(`AUTH_HTTP_FAILED: ${item}: ${result.stderr.trim().slice(0, 200)}`);
  return { status, body: result.stdout };
}
