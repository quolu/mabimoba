import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
// ボットは認証仲介の「run」の中で動く（トークンは仲介の中だけ）。ここでは、動かすコードの置き場（席の runtime/mabimoba-bot）を配備するcommitへ合わせ、
// main-serverの常駐ユニット（deploy/mabimoba-bot.service）を入れ直して、UNIXソケットの /healthz が通るまで待つ。
const target = JSON.parse(await readFile(new URL('../deploy/target.json', import.meta.url)));
const run = (command, args, options = {}) => execFileSync(command, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], ...options });
if (run('git', ['status', '--porcelain']).trim()) throw new Error('DEPLOY_DIRTY: 未commitの変更があります');
run('git', ['fetch', 'origin', target.branch]);
const revision = run('git', ['rev-parse', 'HEAD']).trim();
run('git', ['merge-base', '--is-ancestor', revision, `origin/${target.branch}`]);
const checkout = fileURLToPath(new URL('../../../runtime/mabimoba-bot', import.meta.url));
try { run('git', ['-C', checkout, 'fetch', 'origin', target.branch]); } catch { run('git', ['clone', `https://github.com/${target.repository}.git`, checkout]); }
run('git', ['-C', checkout, 'checkout', '--detach', revision]);
run('npm', ['--prefix', checkout + '/bot', 'ci', '--omit=dev', '--ignore-scripts']);
const ssh = (command, input) => run('ssh', [target.sshHost, command], { input });
ssh('mkdir -p ~/.config/systemd/user && cat > ~/.config/systemd/user/mabimoba-bot.service', await readFile(new URL('../deploy/mabimoba-bot.service', import.meta.url)));
ssh('systemctl --user daemon-reload && systemctl --user enable mabimoba-bot && systemctl --user restart mabimoba-bot');
const health = `for i in $(seq 1 60); do curl -sf --unix-socket ${target.botSocket} http://localhost/healthz && exit 0; sleep 2; done; exit 1`;
console.log(ssh(health).trim());
console.log(JSON.stringify({ revision, bot: '起動確認済み' }));
