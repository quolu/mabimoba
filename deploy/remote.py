import json, os, subprocess, urllib.request, urllib.error, time
from pathlib import Path
from datetime import datetime, timezone

def run(*args, cwd=None, env=None):
    return subprocess.run(args, cwd=cwd, env=env, check=True, text=True, capture_output=True).stdout.strip()

def announce(text):
    print(text, flush=True)

root = Path(TARGET['directory'])
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

state = Path.home() / '.local/state/mabimoba'
state.mkdir(parents=True, exist_ok=True)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
caddy = Path(TARGET['caddyFile'])
snippet = (root / 'deploy/Caddyfile.snippet').read_text()
current = caddy.read_text()
if TARGET['domain'] not in current:
    run('tar', '-czf', str(state / ('caddy-' + stamp + '.tar.gz')), '-C', str(caddy.parent), caddy.name)
    candidate = state / ('Caddyfile-' + stamp)
    candidate.write_text(current.rstrip() + '\n\n' + snippet)
    run('docker', 'cp', str(candidate), 'caddy:/tmp/Caddyfile.mabimoba')
    run('docker', 'exec', 'caddy', 'caddy', 'validate', '--config', '/tmp/Caddyfile.mabimoba', '--adapter', 'caddyfile')
    caddy.write_text(candidate.read_text())
    run('docker', 'exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile')
elif snippet.strip() not in current:
    raise RuntimeError('CADDY_ROUTE_CONFLICT: 同じホスト名の設定が異なります')

credential = Path(TARGET['cloudflareCredentialFile']).read_text()
token = next(line.split('=', 1)[1].strip().strip('\"\x27') for line in credential.splitlines() if line.startswith('CF_API_TOKEN='))
def cf(path, method='GET', payload=None):
    req = urllib.request.Request('https://api.cloudflare.com/client/v4/' + path, method=method,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization':'Bearer ' + token, 'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError('CLOUDFLARE_HTTP_ERROR: ' + str(error.code)) from None
    if not result['success']:
        raise RuntimeError('CLOUDFLARE_API_ERROR: ' + ','.join(str(x['code']) for x in result['errors']))
    return result['result']

zones = cf('zones?name=' + TARGET['zone'])
if len(zones) != 1:
    raise RuntimeError('CLOUDFLARE_ZONE_AMBIGUOUS: 対象zoneが一つに決まりません')
zone = zones[0]
account = zone['account']['id']
tunnels = [t for t in cf('accounts/' + account + '/cfd_tunnel?is_deleted=false') if t['name'] == TARGET['tunnelName']]
if len(tunnels) != 1:
    raise RuntimeError('CLOUDFLARE_TUNNEL_AMBIGUOUS: 対象tunnelが一つに決まりません')
tunnel = tunnels[0]
path = 'accounts/' + account + '/cfd_tunnel/' + tunnel['id'] + '/configurations'
config = cf(path)['config']
routes = [r for r in config['ingress'] if r.get('hostname') == TARGET['domain']]
if routes and routes[0]['service'] != TARGET['originService']:
    raise RuntimeError('CLOUDFLARE_ROUTE_CONFLICT: 既存routeの転送先が異なります')
if not routes:
    (state / ('tunnel-' + stamp + '.json')).write_text(json.dumps(config, indent=2))
    config['ingress'].insert(len(config['ingress'])-1, {'hostname':TARGET['domain'], 'service':TARGET['originService'], 'originRequest':{'noTLSVerify':True,'matchSNItoHost':True}})
    cf(path, 'PUT', {'config':config})
dns_path = 'zones/' + zone['id'] + '/dns_records'
records = cf(dns_path + '?name=' + TARGET['domain'])
expected = tunnel['id'] + '.cfargotunnel.com'
if records:
    if len(records)!=1 or records[0]['type']!='CNAME' or records[0]['content']!=expected or not records[0]['proxied']:
        raise RuntimeError('DNS_RECORD_CONFLICT: 既存DNSレコードが想定と異なります')
else:
    cf(dns_path, 'POST', {'type':'CNAME','name':TARGET['domain'],'content':expected,'proxied':True,'ttl':1})

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
