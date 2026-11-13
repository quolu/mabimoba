import json, os, subprocess, tempfile
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
# トークンは1Passwordの保管庫「ホスト main-server」だけにある。buildは参照の文字列のままで足り、
# upだけ dotagents-op-run がホスト専用の読取専用tokenで値に替えて渡す。
# ログインシェルの開発工場tokenが残っていると dotagents-op-run がそちらを使うので外す。
env = dict(os.environ, MABIMOBA_REVISION=TARGET['revision'], DISCORD_TOKEN=TARGET['discordTokenRef'])
env.pop('OP_SERVICE_ACCOUNT_TOKEN', None)
try:
    run('docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'build', env=env)
    with tempfile.NamedTemporaryFile('w', suffix='.env') as refs:
        refs.write('DISCORD_TOKEN=' + TARGET['discordTokenRef'] + '\n')
        refs.flush()
        run(str(Path.home() / '.local/bin/dotagents-op-run'), '--env-file', refs.name, '--', 'docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'up', '-d', '--wait', '--wait-timeout', '120', env=env)
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
