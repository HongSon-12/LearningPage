import 'dotenv/config';
import { createServer as createHttpsServer, request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { isolatedDatabase } from '../tests/isolated-db';
import { prepareStandalone } from './prepare-standalone';
import type { IncomingMessage, ServerResponse } from 'node:http';
async function freePort(){const server=createTcpServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;await new Promise<void>(resolve=>server.close(()=>resolve()));return port;}
async function body(req:IncomingMessage){const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks).toString();}
function json(res:ServerResponse,value:unknown,status=200){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));}
async function main(){
 await isolatedDatabase('ssoui',async prisma=>{
  const folder=resolve('.local','sso-ui-tls');await mkdir(folder,{recursive:true,mode:0o700});
  const keyPath=join(folder,'key.pem'),certPath=join(folder,'cert.pem');
  const cert=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});if(cert.status)throw Error('LOCAL_TLS_CERT_FAILED');
  await chmod(keyPath,0o600);
  const tls={key:await readFile(keyPath),cert:await readFile(certPath)};
  const appPort=await freePort(),ssoPort=await freePort(),nodePort=await freePort();
  const app=`https://localhost:${appPort}`,sso=`https://localhost:${ssoPort}`,issuer=sso+'/application/o/edu/',clientId='fixture-edu-ui';
  const secret=randomBytes(24).toString('hex'),apiToken=randomBytes(24).toString('hex'),webhookSecret=randomBytes(24).toString('hex'),controlSecret=randomBytes(24).toString('hex');
  const env={...process.env,NODE_ENV:'production' as const,AUTH_MODE:'sso',APP_ORIGIN:app,SSO_ISSUER:issuer,SSO_CLIENT_ID:clientId,SSO_CLIENT_SECRET:secret,SSO_API_TOKEN:apiToken,SSO_WEBHOOK_SECRET:webhookSecret,SSO_TOKEN_ENCRYPTION_KEY:randomBytes(32).toString('hex'),NODE_EXTRA_CA_CERTS:certPath,LOOKUP_OTP_SECRET:randomBytes(32).toString('hex'),PRIVATE_UPLOAD_DIR:resolve('.local',process.env.DATABASE_SCHEMA!),SSO_TEST_APP_ORIGIN:app,SSO_TEST_ORIGIN:sso,SSO_TEST_CONTROL_SECRET:controlSecret,SMTP_USER:'',SMTP_PASS:'',PORT:String(nodePort),HOSTNAME:'127.0.0.1'};
  const originalEnv={...process.env};Object.assign(process.env,env);
  const {syncDirectoryUser}=await import("../src/lib/sso-directory");
  const now=()=>Math.floor(Date.now()/1000);
  const users=[{pk:1,uid:'1'.repeat(64),username:'nlhson',email:'nlhson@fixture.test',is_active:true,type:'internal',last_updated:new Date().toISOString()},{pk:2,uid:'2'.repeat(64),username:'waiting',email:'waiting@fixture.test',is_active:true,type:'internal',last_updated:new Date().toISOString()},{pk:3,uid:'3'.repeat(64),username:'ungranted',email:'ungranted@fixture.test',is_active:true,type:'internal',last_updated:new Date().toISOString()}];
  for(const user of users)await syncDirectoryUser(user);
  const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'ui-fixture',use:'sig',alg:'RS256'};
  type Login={user:typeof users[number];sid:string;nonce:string;challenge:string;active:boolean};
  const codes=new Map<string,Login>(),tokens=new Map<string,Login>(),refreshTokens=new Map<string,Login>(),events=new Map<string,unknown>();
  const metrics={codeGrants:0,refreshGrants:0,userInfoReads:0,introspections:0,directoryReads:0,endSessions:0};
  const metadata={issuer,authorization_endpoint:sso+'/application/o/authorize/',token_endpoint:sso+'/application/o/token/',userinfo_endpoint:sso+'/application/o/userinfo/',jwks_uri:issuer+'jwks/',end_session_endpoint:issuer+'end-session/',introspection_endpoint:sso+'/application/o/introspect/',response_types_supported:['code'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post'],code_challenge_methods_supported:['S256']};
  async function localPost(url:string,data:string,headers:Record<string,string>){
   return new Promise<{ok:boolean}>((resolve,reject)=>{const request=httpsRequest(url,{method:'POST',ca:tls.cert,headers},response=>{response.resume();resolve({ok:response.statusCode===200});});request.on('error',reject);request.end(data);});
  }
  async function deliverLogout(login:Login){
   login.active=false;
   const token=await new SignJWT({sub:login.user.uid,sid:login.sid,events:{'http://schemas.openid.net/event/backchannel-logout':{}}}).setProtectedHeader({alg:'RS256',kid:'ui-fixture'}).setIssuer(issuer).setAudience(clientId).setIssuedAt().setJti(randomUUID()).sign(privateKey);
   const response=await localPost(app+'/api/auth/backchannel-logout',new URLSearchParams({logout_token:token}).toString(),{'content-type':'application/x-www-form-urlencoded'});if(!response.ok)throw Error('BACKCHANNEL_FAILED');
  }
  const mock=createHttpsServer(tls,(req,res)=>{void(async()=>{
   const url=new URL(req.url!,sso);
   if(url.pathname.endsWith('/.well-known/openid-configuration'))return json(res,metadata);
   if(url.pathname.endsWith('/jwks/'))return json(res,{keys:[jwk]});
   if(url.pathname==='/application/o/authorize/'){
    const cookie=Object.fromEntries((req.headers.cookie||'').split(';').map(part=>part.trim().split('=')));
    const user=users.find(user=>user.username===(cookie['fixture-user']||'nlhson'))!;
    const sid=cookie['fixture-sid']||randomUUID(),code=randomUUID();codes.set(code,{user,sid,nonce:url.searchParams.get('nonce')!,challenge:url.searchParams.get('code_challenge')!,active:true});
    if(url.searchParams.get('redirect_uri')!==app+'/api/auth/callback/authentik')throw Error('CALLBACK_MISMATCH');
    res.writeHead(302,{location:app+'/api/auth/callback/authentik?'+new URLSearchParams({code,state:url.searchParams.get('state')!}),'set-cookie':`fixture-sid=${sid}; Secure; HttpOnly; SameSite=Lax; Path=/`});return res.end();
   }
   if(url.pathname==='/application/o/token/'){
    const form=new URLSearchParams(await body(req));
    if(form.get('grant_type')==='refresh_token'){
     metrics.refreshGrants++;
     const previous=form.get('refresh_token')||'',login=refreshTokens.get(previous);
     if(form.get('client_secret')!==secret||!login?.active||!login.user.is_active)return json(res,{error:'invalid_grant'},400);
     refreshTokens.delete(previous);const access=randomBytes(24).toString('hex'),refresh=randomBytes(24).toString('hex');tokens.set(access,login);refreshTokens.set(refresh,login);
     return json(res,{access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:300});
    }
    const login=codes.get(form.get('code')||'');
    metrics.codeGrants++;
    if(form.get('client_secret')!==secret||!login||createHash('sha256').update(form.get('code_verifier')||'').digest('base64url')!==login.challenge)return json(res,{error:'invalid_grant'},400);
    codes.delete(form.get('code')!);const access=randomBytes(24).toString('hex');tokens.set(access,login);
    const idToken=await new SignJWT({sub:login.user.uid,sid:login.sid,nonce:login.nonce,auth_time:now(),preferred_username:login.user.username}).setProtectedHeader({alg:'RS256',kid:'ui-fixture'}).setIssuer(issuer).setAudience(clientId).setIssuedAt().setExpirationTime('10m').sign(privateKey);
    const refresh=randomBytes(24).toString('hex');refreshTokens.set(refresh,login);
    return json(res,{access_token:access,id_token:idToken,refresh_token:refresh,token_type:'Bearer',expires_in:300});
   }
   if(url.pathname==='/application/o/userinfo/'){metrics.userInfoReads++;const login=tokens.get((req.headers.authorization||'').replace('Bearer ',''));return json(res,login?{sub:login.user.uid,preferred_username:login.user.username}:{},login?200:401);}
   if(url.pathname==='/application/o/introspect/'){metrics.introspections++;const form=new URLSearchParams(await body(req));if(form.get('client_secret')!==secret)return json(res,{},401);const login=tokens.get(form.get('token')||'');return json(res,login?{active:login.active&&login.user.is_active,sub:login.user.uid,client_id:clientId}:{active:false});}
   if(url.pathname===issuer.replace(sso,'')+'end-session/'){
    metrics.endSessions++;
    const cookie=Object.fromEntries((req.headers.cookie||'').split(';').map(part=>part.trim().split('=')));
    for(const login of tokens.values())if(login.sid===cookie['fixture-sid'])await deliverLogout(login);
    res.writeHead(302,{location:app+'/da-dang-xuat?'+new URLSearchParams({state:url.searchParams.get('state')!}),'set-cookie':'fixture-sid=; Max-Age=0; Secure; HttpOnly; Path=/'});return res.end();
   }
   if(url.pathname.startsWith('/fixture/')){
    if(req.headers.authorization!=='Bearer '+controlSecret)return json(res,{},401);
    const data=JSON.parse(await body(req)||'{}');
    if(url.pathname==='/fixture/metrics')return json(res,metrics);
    if(url.pathname==='/fixture/expire-checks'){await prisma.session.updateMany({data:{ssoCheckedUntil:new Date(0)}});return json(res,{ok:true});}
    if(url.pathname==='/fixture/logout'){
     for(const login of tokens.values())if(login.active){if(data.dropDelivery)login.active=false;else await deliverLogout(login);}
     if(data.expireChecks)await prisma.session.updateMany({data:{ssoCheckedUntil:new Date(0)}});
     return json(res,{ok:true});
    }
    if(url.pathname==='/fixture/disable'){
     users[0].is_active=false;users[0].last_updated=new Date(Date.parse(users[0].last_updated)+1000).toISOString();const eventId=randomUUID();events.set(eventId,{pk:eventId,action:'model_updated',user:{pk:999},context:{model:{app:'authentik_core',model_name:'user',pk:1}}});
     const result=await localPost(app+'/api/auth/webhook/authentik',JSON.stringify({eventId}),{Authorization:'Bearer '+webhookSecret,'content-type':'application/json'});if(!result.ok)throw Error('WEBHOOK_FAILED');return json(res,{ok:true});
    }
    if(url.pathname==='/fixture/reset'){users[0].is_active=true;users[0].last_updated=new Date(Date.parse(users[0].last_updated)+1000).toISOString();await syncDirectoryUser(users[0]);return json(res,{ok:true});}
    return json(res,{},404);
   }
   if(req.headers.authorization!=='Bearer '+apiToken)return json(res,{},401);
   if(url.pathname==='/api/v3/core/users/'){metrics.directoryReads++;const username=url.searchParams.get('username'),list=users.filter(user=>!username||user.username===username);return json(res,{results:list,pagination:{current:1,next:0,total_pages:1,count:list.length}});}
   const id=url.pathname.match(/^\/api\/v3\/core\/users\/(\d+)\/$/);if(id){metrics.directoryReads++;const user=users.find(user=>user.pk===Number(id[1]));return json(res,user||{},user?200:404);}
   const event=url.pathname.match(/^\/api\/v3\/events\/events\/([^/]+)\/$/);if(event)return json(res,events.get(event[1])||{},events.has(event[1])?200:404);
   json(res,{},404);
  })().catch(()=>json(res,{error:'FIXTURE_ERROR'},500));});
  await new Promise<void>(resolve=>mock.listen(ssoPort,'127.0.0.1',resolve));
  const proxy=createHttpsServer(tls,(req,res)=>{
   const upstream=httpRequest({hostname:'127.0.0.1',port:nodePort,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https','x-real-ip':'127.0.0.1'}},reply=>{res.writeHead(reply.statusCode!,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
  });
  await new Promise<void>(resolve=>proxy.listen(appPort,'127.0.0.1',resolve));
  const standalone=await prepareStandalone(process.env.NEXT_BUILD_DIR || '.next-build');
  const logfile=await import('node:fs').then(fs=>fs.openSync('.local/sso-ui-server.log','w',0o600));
  const server=spawn(process.execPath,[join(standalone,'server.js')],{env,stdio:['ignore',logfile,logfile]});
  try{
   for(let attempt=0;attempt<100;attempt++){
    const response=await new Promise<number>(resolve=>{const request=httpRequest({hostname:'127.0.0.1',port:nodePort,path:'/api/health/live'},response=>{response.resume();resolve(response.statusCode||0);});request.on('error',()=>resolve(0));request.end();});
    if(response===200)break;if(attempt===99)throw Error('SSO_UI_START_FAILED');await new Promise(resolve=>setTimeout(resolve,200));
   }
   const test=spawn(resolve('node_modules/.bin/playwright'),['test','-c','playwright.sso.config.ts',...process.argv.slice(2)],{env,stdio:'inherit'});
   const result=await new Promise<number>(resolve=>test.on('exit',code=>resolve(code??1)));if(result)process.exitCode=result;
  }finally{
   server.kill('SIGTERM');await new Promise<void>(resolve=>{const timer=setTimeout(()=>{server.kill('SIGKILL');resolve();},3000);server.once('exit',()=>{clearTimeout(timer);resolve();});});
   await Promise.all([new Promise<void>(resolve=>mock.close(()=>resolve())),new Promise<void>(resolve=>proxy.close(()=>resolve()))]);
   for(const key of Object.keys(env))if(!(key in originalEnv))delete process.env[key];Object.assign(process.env,originalEnv);
  }
 });
}
void main().catch(async(error)=>{await writeFile('.local/sso-ui-failure.log',error instanceof Error ? error.stack || error.message : 'UNKNOWN',{mode:0o600});console.error('LOCAL_SSO_UI_FAILED; inspect protected .local logs.');process.exitCode=1;});
