import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { request } from './api-transport.mjs';
const target=JSON.parse(await readFile(new URL('../deploy/target.json',import.meta.url)));
const run=(command,args,options={})=>execFileSync(command,args,{encoding:'utf8',stdio:['pipe','pipe','inherit'],...options});
if(run('git',['status','--porcelain']).trim())throw new Error('DEPLOY_DIRTY: 未commitの変更があります');
run('git',['fetch','origin',target.branch]);
const revision=(process.argv[2]??run('git',['rev-parse','HEAD'])).trim();
if(!/^[0-9a-f]{40}$/.test(revision))throw new Error('DEPLOY_REVISION_INVALID: 40桁のcommitを指定してください');
run('git',['merge-base','--is-ancestor',revision,`origin/${target.branch}`]);
const remote=await readFile(new URL('../deploy/remote.py',import.meta.url),'utf8');
const stamp=new Date().toISOString().replace(/[-:]|\.\d+/g,'');
// main-serverでの段。Cloudflareの鍵はここに来ない（CF_API_TOKEN があればそれで、無ければ認証仲介の項目 cloudflare-ca9fed97 で呼ぶ）。
const stage=(name,extra={})=>run('ssh',[target.sshHost,'python3 -'],{input:`import json\nTARGET=json.loads(${JSON.stringify(JSON.stringify({...target,revision,stamp,stage:name,...extra}))})\n${remote}`,stdio:['pipe','inherit','inherit']});
const cf=async(path,method='GET',payload)=>{
  const {status,body}=await request({tokenVar:'CF_API_TOKEN',authScheme:'Bearer',origin:'https://api.cloudflare.com',item:'cloudflare-ca9fed97',method,path:'/client/v4/'+path,body:payload===undefined?undefined:JSON.stringify(payload)});
  if(status>=400)throw new Error('CLOUDFLARE_HTTP_ERROR: '+status);
  const result=JSON.parse(body);
  if(!result.success)throw new Error('CLOUDFLARE_API_ERROR: '+result.errors.map(x=>x.code).join(','));
  return result.result;
};
stage('build');
const zones=await cf('zones?name='+target.zone);
if(zones.length!==1)throw new Error('CLOUDFLARE_ZONE_AMBIGUOUS: 対象zoneが一つに決まりません');
const zone=zones[0],account=zone.account.id;
const tunnels=(await cf(`accounts/${account}/cfd_tunnel?is_deleted=false`)).filter(t=>t.name===target.tunnelName);
if(tunnels.length!==1)throw new Error('CLOUDFLARE_TUNNEL_AMBIGUOUS: 対象tunnelが一つに決まりません');
const tunnel=tunnels[0];
const tunnelPath=`accounts/${account}/cfd_tunnel/${tunnel.id}/configurations`;
const config=(await cf(tunnelPath)).config;
const route=config.ingress.find(r=>r.hostname===target.domain);
if(route&&route.service!==target.originService)throw new Error('CLOUDFLARE_ROUTE_CONFLICT: 既存routeの転送先が異なります');
if(!route){
  stage('backup-tunnel',{tunnelConfig:config});
  config.ingress.splice(config.ingress.length-1,0,{hostname:target.domain,service:target.originService,originRequest:{noTLSVerify:true,matchSNItoHost:true}});
  await cf(tunnelPath,'PUT',{config});
}
const dnsPath=`zones/${zone.id}/dns_records`;
const records=await cf(`${dnsPath}?name=${target.domain}`);
const expected=tunnel.id+'.cfargotunnel.com';
if(records.length){
  if(records.length!==1||records[0].type!=='CNAME'||records[0].content!==expected||!records[0].proxied)throw new Error('DNS_RECORD_CONFLICT: 既存DNSレコードが想定と異なります');
}else await cf(dnsPath,'POST',{type:'CNAME',name:target.domain,content:expected,proxied:true,ttl:1});
stage('verify');
