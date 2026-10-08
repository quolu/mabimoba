import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

try {
  const expectedId = process.argv[2];
  if (!/^\d+$/.test(expectedId)) throw new Error('DISCORD_APPLICATION_ID_REQUIRED');
  let token = ''; for await (const chunk of process.stdin) token += chunk;
  token = token.trim();
  if (!token || /\s/.test(token)) throw new Error('DISCORD_TOKEN_INVALID');
  const response = await fetch('https://discord.com/api/v10/oauth2/applications/@me', {
    headers: { Authorization: `Bot ${token}`, 'User-Agent': 'mabimoba-discord-setup/1.0' }, signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`DISCORD_TOKEN_HTTP_${response.status}`);
  const app = await response.json();
  if (app.id !== expectedId) throw new Error('DISCORD_APPLICATION_MISMATCH');
  const target = JSON.parse(await readFile(new URL('../deploy/target.json', import.meta.url), 'utf8'));
  const program = "import pathlib,sys,os; os.umask(0o077); p=pathlib.Path.home()/'.config/mabimoba/discord-token'; p.parent.mkdir(parents=True,exist_ok=True,mode=0o700); p.write_text(sys.stdin.read().strip()+'\\n'); p.chmod(0o600); print('Botトークンを登録しました（値は非表示）')";
  const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
  execFileSync('ssh', [target.sshHost, `python3 -c ${quote(program)}`], { input: token, stdio: ['pipe','inherit','inherit'] });
  console.log(`Discordアプリ確認済み: ${app.id}`);
} catch (error) {
  console.error(error.message?.startsWith('DISCORD_') ? error.message : error.code ? `DISCORD_SETUP_${error.code}` : 'DISCORD_SETUP_FAILED');
  process.exitCode = 1;
}
