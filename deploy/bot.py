import json, os, subprocess
from pathlib import Path

def run(*args, env=None):
    return subprocess.run(args, cwd=TARGET['directory'], env=env, check=True, text=True, capture_output=True).stdout.strip()

root = Path(TARGET['directory'])
if run('git', 'status', '--porcelain'):
    raise RuntimeError('REMOTE_DIRTY: サーバーのソースに未commitの変更があります')
run('git', 'fetch', 'origin', TARGET['branch'])
run('git', 'merge-base', '--is-ancestor', TARGET['revision'], 'origin/' + TARGET['branch'])
run('git', 'checkout', '--detach', TARGET['revision'])
state = Path.home() / '.local/state/mabimoba/discord'
state.mkdir(parents=True, exist_ok=True, mode=0o700)
if state.stat().st_uid != 1000:
    raise RuntimeError('DISCORD_STATE_OWNER_INVALID: Botの実行ユーザーで保存できません')
# トークンは1Passwordだけにある。buildは参照の文字列のままで足り、upだけ op run が値に替えて渡す。
env = dict(os.environ, MABIMOBA_REVISION=TARGET['revision'], DISCORD_TOKEN=TARGET['discordTokenRef'])
try:
    run('docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'build', env=env)
    run('op', 'run', '--', 'docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'up', '-d', '--wait', '--wait-timeout', '120', env=env)
except subprocess.CalledProcessError as error:
    print(error.stderr[-5000:], flush=True)
    raise
print(run('docker', 'exec', 'mabimoba-discord', 'node', '-e', "fetch('http://127.0.0.1:8081/healthz').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)})"), flush=True)
print(json.dumps({'revision': TARGET['revision'], 'bot': '起動確認済み'}, ensure_ascii=False), flush=True)

# 稼働中と戻し用1世代だけ残す。消せなくても配備の結果には混ぜず、次の配備でまた消す。
current = 'mabimoba-discord:' + TARGET['revision']
images = run('docker', 'image', 'ls', 'mabimoba-discord', '--format', '{{.Repository}}:{{.Tag}}').splitlines()
for image in [image for image in images if image != current][1:]:
    subprocess.run(['docker', 'image', 'rm', image], capture_output=True)
