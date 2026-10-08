import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

try {
  const profile = JSON.parse(await readFile(new URL('../content/discord-profile.json', import.meta.url), 'utf8'));
  const description = profile.description;
  if (typeof description !== 'string' || !description.trim() || description.length > 400) throw new Error('DISCORD_PROFILE_INVALID: 概要は1〜400文字で指定してください');
  const images = {}, dimensions = {};
  for (const key of ['avatar', 'banner']) {
    if (profile[key] === undefined) continue;
    if (typeof profile[key] !== 'string' || !/^bot\/assets\/[\w.-]+\.png$/.test(profile[key])) throw new Error(`DISCORD_PROFILE_IMAGE_PATH_INVALID: ${key}`);
    const bytes = await readFile(new URL('../' + profile[key], import.meta.url));
    if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) throw new Error(`DISCORD_PROFILE_PNG_INVALID: ${key}`);
    images[key] = 'data:image/png;base64,' + bytes.toString('base64');
    dimensions[key] = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
  }
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--validate') {
    console.log(`Discordプロフィール確認: ${description.length}文字 ${JSON.stringify(dimensions)}`);
  } else {
    if (args.length) throw new Error('DISCORD_PROFILE_ARGUMENT_INVALID');
    const target = JSON.parse(await readFile(new URL('../deploy/target.json', import.meta.url), 'utf8'));
    const git = args => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
    if (git(['status', '--porcelain']).trim()) throw new Error('DISCORD_PROFILE_DIRTY: 先に変更をcommitしてください');
    git(['fetch', 'origin', target.branch]);
    git(['merge-base', '--is-ancestor', 'HEAD', `origin/${target.branch}`]);
    const program = `
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const desired = ${JSON.stringify({ description, images })};
const token = readFileSync(join(homedir(), '.config/mabimoba/discord-token'), 'utf8').trim();
const request = async (resource, method, body) => {
  const response = await fetch('https://discord.com/api/v10/'+resource+'/@me', {method, redirect:'error',
    headers:{Authorization:'Bot '+token,'Content-Type':'application/json','User-Agent':'mabimoba-profile/1.0'},
    ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error('DISCORD_PROFILE_HTTP_'+resource+'_'+method+'_'+response.status);
  return response.json();
};
const oldImage = async (kind,id,hash) => {
  if(!hash) return null;
  const response = await fetch('https://cdn.discordapp.com/'+kind+'/'+id+'/'+hash+'.png?size=4096', {redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error('DISCORD_PROFILE_IMAGE_BACKUP_HTTP_'+response.status);
  return 'data:image/png;base64,'+Buffer.from(await response.arrayBuffer()).toString('base64');
};
try {
  const before = await request('applications','GET');
  const beforeUser = Object.keys(desired.images).length ? await request('users','GET') : null;
  const state = join(homedir(), '.local/state/mabimoba');
  mkdirSync(state,{recursive:true,mode:0o700});
  const backup = join(state,'profile-before-'+Date.now()+'.json');
  const previous = {applicationId:before.id,application:{description:before.description}};
  if(desired.images.avatar) previous.application.icon = await oldImage('app-icons',before.id,before.icon);
  if(beforeUser) {
    previous.user = {};
    if(desired.images.avatar) previous.user.avatar = await oldImage('avatars',beforeUser.id,beforeUser.avatar);
    if(desired.images.banner) previous.user.banner = await oldImage('banners',beforeUser.id,beforeUser.banner);
  }
  writeFileSync(backup,JSON.stringify(previous),{mode:0o600});
  const updatedUser = beforeUser ? await request('users','PATCH',desired.images) : null;
  const updatedApp = await request('applications','PATCH',{description:desired.description,...(desired.images.avatar?{icon:desired.images.avatar}:{})});
  const after = await request('applications','GET');
  const afterUser = beforeUser ? await request('users','GET') : null;
  if(after.description!==desired.description || (desired.images.avatar && (!updatedApp.icon || after.icon!==updatedApp.icon))) throw new Error('DISCORD_PROFILE_MISMATCH');
  for(const key of Object.keys(desired.images)) if(!updatedUser[key] || afterUser[key]!==updatedUser[key]) throw new Error('DISCORD_PROFILE_IMAGE_MISMATCH_'+key);
  console.log(JSON.stringify({applicationId:after.id,name:after.name,characters:after.description.length,icon:after.icon,
    avatar:afterUser?.avatar,banner:afterUser?.banner,verified:true,backup},null,2));
} catch(error) {console.error(error.message?.startsWith('DISCORD_')?error.message:'DISCORD_PROFILE_FAILED');process.exitCode=1;}
`;
    execFileSync('ssh', [target.sshHost, 'node --input-type=module'], { input: program, stdio: ['pipe', 'inherit', 'inherit'] });
  }
} catch (error) {
  console.error(error.message?.startsWith('DISCORD_') ? error.message : error.status ? 'DISCORD_PROFILE_REMOTE_FAILED' : 'DISCORD_PROFILE_IO_FAILED');
  process.exitCode = 1;
}
