import json, os, subprocess, urllib.request, urllib.error, time
from pathlib import Path

def run(*args, cwd=None, env=None):
    return subprocess.run(args, cwd=cwd, env=env, check=True, text=True, capture_output=True).stdout.strip()

def announce(text):
    print(text, flush=True)

# deploy.mjs が段ごとにこのファイルを流す。Cloudflareの呼び出しは鍵を持たないこちらでは行わず、deploy.mjs が認証仲介越しに行う。
stage = TARGET['stage']
root = Path(TARGET['directory'])
state = Path.home() / '.local/state/mabimoba'
# NASが外れている時はこの置き場が無いので、書けずに止まる。主機へは控えを書かない。
backups = Path('/var/mnt/qnap-backups/main-server/products/mabimoba/deploy')
stamp = TARGET['stamp']

if stage == 'build':
    if not root.exists():
        announce('公開用のソースを取得しています')
        run('gh', 'repo', 'clone', TARGET['repository'], str(root))
    if run('git', 'status', '--porcelain', cwd=root):
        raise RuntimeError('REMOTE_DIRTY: サーバーのソースに未commitの変更があります')
    run('git', 'fetch', 'origin', TARGET['branch'], cwd=root)
    run('git', 'merge-base', '--is-ancestor', TARGET['revision'], 'origin/' + TARGET['branch'], cwd=root)
    run('git', 'checkout', '--detach', TARGET['revision'], cwd=root)
    env = dict(os.environ, MABIMOBA_REVISION=TARGET['revision'])
    announce('攻略ポータルのコンテナを構築しています')
    try:
        run('docker', 'compose', 'build', 'web', cwd=root, env=env)
    except subprocess.CalledProcessError as error:
        print(error.stderr[-5000:], flush=True)
        raise
    run('docker', 'compose', 'up', '-d', '--wait', '--wait-timeout', '90', cwd=root, env=env)
    announce('ポータルが起動しました。公開経路を設定しています')


    caddy = Path(TARGET['caddyFile'])
    snippet = (root / 'deploy/Caddyfile.snippet').read_text()
    current = caddy.read_text()
    if TARGET['domain'] not in current:
        run('tar', '-czf', str(backups / ('caddy-' + stamp + '.tar.gz')), '-C', str(caddy.parent), caddy.name)
        candidate = backups / ('Caddyfile-' + stamp)
        candidate.write_text(current.rstrip() + '\n\n' + snippet)
        run('docker', 'cp', str(candidate), 'caddy:/tmp/Caddyfile.mabimoba')
        run('docker', 'exec', 'caddy', 'caddy', 'validate', '--config', '/tmp/Caddyfile.mabimoba', '--adapter', 'caddyfile')
        caddy.write_text(candidate.read_text())
        run('docker', 'exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile')
    elif snippet.strip() not in current:
        raise RuntimeError('CADDY_ROUTE_CONFLICT: 同じホスト名の設定が異なります')


elif stage == 'backup-tunnel':
    (backups / ('tunnel-' + stamp + '.json')).write_text(json.dumps(TARGET['tunnelConfig'], indent=2))

elif stage == 'verify':
    state.mkdir(parents=True, exist_ok=True)
    announce('HTTPSからの到達と既存サービスを確認しています')
    checks = []
    for url in ['https://' + TARGET['domain'] + '/healthz'] + TARGET['existingSmokeUrls']:
        last = None
        for attempt in range(5):
            try:
                request = urllib.request.Request(url, headers={'User-Agent':'mabimoba-deploy/1.0'})
                with urllib.request.urlopen(request, timeout=15) as response:
                    if response.status!=200:
                        raise RuntimeError('HTTPS_STATUS: ' + str(response.status))
                    if url.endswith('/healthz'):
                        health=json.load(response)
                        if health.get('status')!='ok':
                            raise RuntimeError('HEALTH_INVALID')
                checks.append({'url':url,'status':200})
                break
            except (urllib.error.URLError, TimeoutError) as error:
                last=error
                if attempt==4:
                    raise RuntimeError('HTTPS_UNREACHABLE: ' + url) from last
                time.sleep(5)
    receipt={'revision':TARGET['revision'],'deployedAt':stamp,'checks':checks}
    (state / 'deployment.json').write_text(json.dumps(receipt, indent=2))
    announce(json.dumps(receipt, ensure_ascii=False))

    # 稼働中と戻し用1世代だけ残す。古い版へは deploy で作り直して戻せる。消せなくても公開の結果には混ぜず、次の配備でまた消す。
    current = 'mabimoba:' + TARGET['revision']
    images = run('docker', 'image', 'ls', 'mabimoba', '--format', '{{.Repository}}:{{.Tag}}').splitlines()
    for image in [image for image in images if image != current][1:]:
        subprocess.run(['docker', 'image', 'rm', image], capture_output=True)

