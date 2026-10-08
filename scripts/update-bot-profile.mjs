import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

try {
  const profile = JSON.parse(await readFile(new URL('../content/discord-profile.json', import.meta.url), 'utf8'));
  const description = profile.description;
  if (typeof description !== 'string' || !description.trim() || description.length > 400) throw new Error('DISCORD_PROFILE_INVALID: 概要は1〜400文字で指定してください');
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--validate') {
    console.log(`Discordプロフィール確認: ${description.length}文字`);
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
const desired = ${JSON.stringify(description)};
const token = readFileSync(join(homedir(), '.config/mabimoba/discord-token'), 'utf8').trim();
const request = async (method, body) => {
  const response = await fetch('https://discord.com/api/v10/applications/@me', {method, redirect:'error',
    headers:{Authorization:'Bot '+token,'Content-Type':'application/json','User-Agent':'mabimoba-profile/1.0'},
    ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error('DISCORD_PROFILE_HTTP_'+response.status);
  return response.json();
};
try {
  const before = await request('GET');
  const state = join(homedir(), '.local/state/mabimoba');
  mkdirSync(state,{recursive:true,mode:0o700});
  const backup = join(state,'profile-before-'+Date.now()+'.json');
  writeFileSync(backup,JSON.stringify({applicationId:before.id,description:before.description},null,2),{mode:0o600});
  await request('PATCH',{description:desired});
  const after = await request('GET');
  if(after.description!==desired) throw new Error('DISCORD_PROFILE_MISMATCH');
  console.log(JSON.stringify({applicationId:after.id,name:after.name,characters:after.description.length,description:after.description,verified:true,backup},null,2));
} catch(error) {console.error(error.message?.startsWith('DISCORD_')?error.message:'DISCORD_PROFILE_FAILED');process.exitCode=1;}
`;
    execFileSync('ssh', [target.sshHost, 'node --input-type=module'], { input: program, stdio: ['pipe', 'inherit', 'inherit'] });
  }
} catch (error) {
  console.error(error.message?.startsWith('DISCORD_') ? error.message : error.status ? 'DISCORD_PROFILE_REMOTE_FAILED' : 'DISCORD_PROFILE_IO_FAILED');
  process.exitCode = 1;
}
