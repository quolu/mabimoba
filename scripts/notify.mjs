import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { planNotifications } from './discord-updates.mjs';

const args = process.argv.slice(2);
const target = JSON.parse(await readFile(new URL('../deploy/target.json', import.meta.url), 'utf8'));
try {
  if (args.length === 1 && args[0] === '--validate') {
    const data = JSON.parse(await readFile(new URL('../content/portal.json', import.meta.url), 'utf8'));
    console.log(`Discord通知文確認: ${planNotifications(data, [], `https://${target.domain}`).length}通に収まります`);
  } else {
    const valid = args.length === 0 || (args.length === 1 && args[0] === '--dry-run') ||
      (args.length === 3 && args[0] === '--confirm-message' && args.slice(1).every(id => /^\d+$/.test(id))) ||
      (args.length === 2 && args[0] === '--retry-unsent' && /^\d+$/.test(args[1]));
    if (!valid) throw new Error('DISCORD_ARGUMENT_INVALID');
    execFileSync('ssh', [target.sshHost, 'docker', 'exec', 'mabimoba-discord', 'node', '/app/bot/control.mjs', ...args], { stdio: 'inherit' });
  }
} catch (error) {
  console.error(error.status ? `DISCORD_REMOTE_FAILED: 通知処理が終了コード${error.status}で失敗しました` : error.code ? `DISCORD_IO_${error.code}` : error.message);
  process.exitCode = 1;
}
