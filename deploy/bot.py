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
secret = Path.home() / '.config/mabimoba/discord-token'
if not secret.is_file() or secret.stat().st_size == 0:
    raise RuntimeError('DISCORD_TOKEN_MISSING: Botトークンの登録が必要です')
# nodeユーザーへ読取だけを許可し、トークンを環境変数とログに出さない。
if secret.stat().st_uid != 1000:
    raise RuntimeError('DISCORD_TOKEN_OWNER_INVALID: Botの実行ユーザーへ読み取りを許可してください')
secret.chmod(0o600)
state = Path.home() / '.local/state/mabimoba/discord'
state.mkdir(parents=True, exist_ok=True, mode=0o700)
if state.stat().st_uid != 1000:
    raise RuntimeError('DISCORD_STATE_OWNER_INVALID: Botの実行ユーザーで保存できません')
env = dict(os.environ, MABIMOBA_REVISION=TARGET['revision'])
try:
    run('docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'build', env=env)
    run('docker', 'compose', '-f', 'compose-bot.yaml', '-p', 'mabimoba-discord', 'up', '-d', '--wait', '--wait-timeout', '120', env=env)
except subprocess.CalledProcessError as error:
    print(error.stderr[-5000:], flush=True)
    raise
print(run('docker', 'exec', 'mabimoba-discord', 'node', '-e', "fetch('http://127.0.0.1:8081/healthz').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)})"), flush=True)
print(json.dumps({'revision': TARGET['revision'], 'bot': '起動確認済み'}, ensure_ascii=False), flush=True)
