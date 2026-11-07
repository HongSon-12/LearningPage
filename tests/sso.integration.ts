import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT,createLocalJWKSet} from 'jose';
import {isolatedDatabase} from './isolated-db';

async function main(){
 await isolatedDatabase('sso',async prisma=>{
  process.env.AUTH_MODE='sso';process.env.APP_ORIGIN='https://edu.115.org.vn';
  process.env.SSO_ISSUER='https://sso.115.org.vn/application/o/edu/';process.env.SSO_CLIENT_ID='fixture-edu';
  process.env.SSO_CLIENT_SECRET=randomBytes(24).toString('hex');process.env.SSO_TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('hex');
  process.env.SSO_API_TOKEN=randomBytes(24).toString('hex');process.env.SSO_WEBHOOK_SECRET=randomBytes(32).toString('hex');
  const issuer=process.env.SSO_ISSUER,clientId=process.env.SSO_CLIENT_ID;
  const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk={...await exportJWK(publicKey),kid:'fixture-key',alg:'RS256',use:'sig'};
  const verification=createLocalJWKSet({keys:[jwk]});
  const sources=new Map<number,Record<string,unknown>>(),events=new Map<string,unknown>();
  const source=(pk:number,username:string,active=true)=>({pk,uid:createHash('sha256').update(`fixture-user-${pk}`).digest('hex'),username,email:`${username}@fixture.test`,is_active:active,type:'internal',last_updated:new Date().toISOString()});
  sources.set(1,source(1,'nlhson'));sources.set(2,source(2,'trainee'));sources.set(3,{...source(3,'service'),type:'internal_service_account'});
  const oldFetch=globalThis.fetch;const tokenActive=true,currentSubject=String(sources.get(1)!.uid);let introspections=0,apiAvailable=true,nonce='fixture-nonce',badSignature=false;
  let eventReads=0;
  const metadata={issuer,authorization_endpoint:'https://sso.115.org.vn/application/o/authorize/',token_endpoint:'https://sso.115.org.vn/application/o/token/',userinfo_endpoint:'https://sso.115.org.vn/application/o/userinfo/',jwks_uri:issuer+'jwks/',end_session_endpoint:issuer+'end-session/',introspection_endpoint:'https://sso.115.org.vn/application/o/introspect/',response_types_supported:['code'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post'],code_challenge_methods_supported:['S256']};
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  globalThis.fetch=async(input,init)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   assert.equal(url.origin,'https://sso.115.org.vn','Never send credentials outside configured SSO');
   if(url.pathname.endsWith('/.well-known/openid-configuration'))return json(metadata);
   if(url.pathname.endsWith('/jwks/'))return json({keys:[jwk]});
   if(url.pathname.endsWith('/token/')){
    const form=new URLSearchParams(String(init?.body));assert.equal(form.get('client_secret'),process.env.SSO_CLIENT_SECRET);assert.equal(form.get('code_verifier')?.length,43);
    const key=badSignature?(await generateKeyPair('RS256')).privateKey:privateKey;
    const idToken=await new SignJWT({sub:currentSubject,sid:'sid-admin',auth_time:Math.floor(Date.now()/1000),nonce,preferred_username:'nlhson'}).setProtectedHeader({alg:'RS256',kid:'fixture-key'}).setIssuer(issuer).setAudience(clientId).setIssuedAt().setExpirationTime('5m').sign(key);
    return json({access_token:'fixture-access',token_type:'Bearer',expires_in:300,id_token:idToken});
   }
   if(url.pathname.endsWith('/introspect/')){introspections++;await new Promise(resolve=>setTimeout(resolve,15));if(!apiAvailable)throw Error('fixture network failure');return json({active:tokenActive,sub:currentSubject,client_id:clientId});}
   if(url.pathname.endsWith('/userinfo/'))return json({sub:currentSubject,preferred_username:'nlhson'});
   assert.equal(new Headers(init?.headers).get('authorization'),`Bearer ${process.env.SSO_API_TOKEN}`);
   if(!apiAvailable)return json({},503);
   if(url.pathname==='/api/v3/core/users/'){
    const username=url.searchParams.get('username');let list=[...sources.values()].filter(user=>!username||user.username===username);
    if(username)return json({results:list});
    const page=Number(url.searchParams.get('page')||1),count=list.length;list=list.slice((page-1)*2,page*2);
    return json({pagination:{current:page,next:page*2<count?page+1:0,total_pages:Math.ceil(count/2),count},results:list});
   }
   const userId=url.pathname.match(/^\/api\/v3\/core\/users\/(\d+)\/$/);
   if(userId)return sources.has(Number(userId[1]))?json(sources.get(Number(userId[1]))):json({},404);
   const eventId=url.pathname.match(/^\/api\/v3\/events\/events\/([^/]+)\/$/);
   if(eventId){eventReads++;return events.has(eventId[1])?json(events.get(eventId[1])):json({},404);}
   throw Error('Unexpected fixture URL');
  };
  try{
   const {syncAllSsoUsers,syncDirectoryUser,directoryUserSchema}=await import('../src/lib/sso-directory');
   const {createSsoSession,validSsoSession}=await import('../src/lib/sso-session');
   const {receiveBackchannelLogout}=await import('../src/lib/sso-logout');
   const {processSsoWebhook,validSsoWebhookAuthorization}=await import('../src/lib/sso-webhook');
   const {persistSsoAccess}=await import('../src/lib/sso-access');
   const {ssoHash,sealSsoToken,openSsoToken}=await import('../src/lib/sso-crypto');
   const {oidc,oidcConfiguration}=await import('../src/lib/sso-oidc');
   const dry=await syncAllSsoUsers();assert.equal(dry.total,3);assert.equal(await prisma.user.count(),0);
   const first=await syncAllSsoUsers(true);assert.equal(first.synced,2);assert.equal(first.skipped,1);assert.equal(first.conflicts,0);
   const admin=await prisma.user.findUniqueOrThrow({where:{ssoUserId:'1'}});let trainee=await prisma.user.findUniqueOrThrow({where:{ssoUserId:'2'}});
   assert.equal(admin.username,'nlhson');assert.equal(admin.role,'ADMIN');assert(admin.active&&admin.appAccessGranted);
   assert.equal(trainee.active,false);assert.equal(trainee.appAccessGranted,false);assert.equal(trainee.role,'ACCOUNTANT');
   await syncAllSsoUsers(true);assert.equal(await prisma.user.count(),2);
   console.log('PASS paginated initial sync/dry-run/idempotency: nlhson admin only, other humans pending, no service accounts or password copies');
   const value=sealSsoToken('secret-access-token');assert(!value.includes('secret-access-token'));assert.equal(openSsoToken(value),'secret-access-token');
   await assert.rejects(async()=>openSsoToken(value.slice(0,-4)+'AAAA'));
   const config=await oidcConfiguration(),verifier=oidc.randomPKCECodeVerifier();
   const authorization=oidc.buildAuthorizationUrl(config,{redirect_uri:process.env.APP_ORIGIN+'/api/auth/callback/authentik',scope:'openid profile email',response_type:'code',state:'fixture-state',nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256'});
   assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
   const callback=new URL(process.env.APP_ORIGIN+'/api/auth/callback/authentik?code=fixture&state=fixture-state');
   const grant=()=>oidc.authorizationCodeGrant(config,callback,{expectedState:'fixture-state',expectedNonce:'fixture-nonce',pkceCodeVerifier:verifier,idTokenExpected:true});
   assert.equal((await grant()).claims()?.sub,currentSubject);
   await assert.rejects(()=>oidc.authorizationCodeGrant(config,callback,{expectedState:'wrong-state',expectedNonce:nonce,pkceCodeVerifier:verifier}));
   nonce='wrong-nonce';await assert.rejects(grant);nonce='fixture-nonce';badSignature=true;await assert.rejects(grant);badSignature=false;
   console.log('PASS OIDC code flow: PKCE S256, state, nonce, RS256/JWKS signature and encrypted server tokens');
   const claims={sub:String(sources.get(1)!.uid),sid:'sid-admin',auth_time:Math.floor(Date.now()/1000)-10};
   await assert.rejects(()=>createSsoSession(trainee.id,{...claims,sub:String(sources.get(2)!.uid)},'access','id',300));
   const actor={id:admin.id,username:admin.username,role:admin.role};
   await persistSsoAccess(actor,{id:trainee.id,role:'CLASS_MANAGER',active:true,customRoleId:''});
   trainee=await prisma.user.findUniqueOrThrow({where:{id:trainee.id}});assert(trainee.active);
   await syncDirectoryUser(directoryUserSchema.parse(sources.get(2)));assert((await prisma.user.findUniqueOrThrow({where:{id:trainee.id}})).appAccessGranted);
   await assert.rejects(()=>createSsoSession(admin.id,{...claims,sub:'another-immutable-user'},'access','id',300));
   const session=await createSsoSession(admin.id,claims,'fixture-access','fixture-id-token',300);
   const loaded=()=>prisma.session.findUniqueOrThrow({where:{tokenHash:ssoHash(session.token)},include:{user:true}});
   const before=introspections;const snapshot=await loaded();assert((await Promise.all(Array.from({length:20},()=>validSsoSession(snapshot)))).every(Boolean));assert.equal(introspections-before,1);
   assert(await validSsoSession(await loaded()));assert.equal(introspections-before,1);
   await prisma.session.update({where:{tokenHash:ssoHash(session.token)},data:{ssoCheckedUntil:new Date(0)}});apiAvailable=false;assert.equal(await validSsoSession(await loaded()),false);apiAvailable=true;
   console.log('PASS admin grant preserved by sync; session leases coalesce 20 checks and fail closed during SSO outage');
   const signLogout=(payload:Record<string,unknown>,issuerOverride=issuer,aud=clientId)=>new SignJWT(payload).setProtectedHeader({alg:'RS256',kid:'fixture-key'}).setIssuer(issuerOverride).setAudience(aud).setIssuedAt().setJti(randomUUID()).sign(privateKey);
   const event={'http://schemas.openid.net/event/backchannel-logout':{}};
   await assert.rejects(()=>signLogout({sub:claims.sub,sid:claims.sid,events:event},'https://attacker.test/').then(token=>receiveBackchannelLogout(token,verification)));
   await assert.rejects(()=>signLogout({sub:claims.sub,sid:claims.sid,events:event},issuer,'other-client').then(token=>receiveBackchannelLogout(token,verification)));
   await assert.rejects(()=>signLogout({sub:claims.sub,sid:claims.sid,events:event,nonce:'forbidden'}).then(token=>receiveBackchannelLogout(token,verification)));
   await assert.rejects(()=>signLogout({events:{}}).then(token=>receiveBackchannelLogout(token,verification)));
   await assert.rejects(()=>signLogout({sub:claims.sub,events:{'http://schemas.openid.net/event/backchannel-logout':[]}}).then(token=>receiveBackchannelLogout(token,verification)));
   await assert.rejects(()=>signLogout({sub:claims.sub,sid:42,events:event}).then(token=>receiveBackchannelLogout(token,verification)));
   const other=await createSsoSession(admin.id,{...claims,sid:'other-browser-sid'},'access2','id2',300);
   const logout=await signLogout({sub:claims.sub,sid:claims.sid,events:event});await receiveBackchannelLogout(logout,verification);await receiveBackchannelLogout(logout,verification);
   assert.equal(await prisma.session.count({where:{ssoSid:claims.sid}}),0);assert.equal(await prisma.session.count({where:{tokenHash:ssoHash(other.token)}}),1);
   await assert.rejects(()=>createSsoSession(admin.id,claims,'late-access','late-id',300));
   const raceSid='racing-sid';await Promise.allSettled([createSsoSession(admin.id,{...claims,sid:raceSid},'race-access','race-id',300),signLogout({sub:claims.sub,sid:raceSid,events:event}).then(token=>receiveBackchannelLogout(token,verification))]);
   assert.equal(await prisma.session.count({where:{ssoSid:raceSid}}),0);
   const sidOnly='sid-only-race';await receiveBackchannelLogout(await signLogout({sid:sidOnly,events:event}),verification);await assert.rejects(()=>createSsoSession(admin.id,{...claims,sid:sidOnly},'late','late',300));
   console.log('PASS signed back-channel: issuer/audience/event/nonce validation, idempotent replay, sid scoping, tombstones and callback/logout races');
   assert(validSsoWebhookAuthorization('Bearer '+process.env.SSO_WEBHOOK_SECRET));assert(!validSsoWebhookAuthorization('Bearer wrong'));assert(!validSsoWebhookAuthorization(null));
   const traineeSession=await createSsoSession(trainee.id,{...claims,sub:String(sources.get(2)!.uid),sid:'sid-trainee'},'trainee-access','trainee-id',300);
   sources.set(2,{...source(2,'trainee',false),last_updated:new Date(Date.now()+1000).toISOString()});
   const eventId=randomUUID();events.set(eventId,{pk:eventId,action:'model_updated',user:{pk:1,username:'nlhson'},context:{model:{app:'authentik_core',model_name:'user',pk:2}}});
   const readBefore=eventReads;await processSsoWebhook(eventId);await processSsoWebhook(eventId);assert.equal(eventReads-readBefore,1);
   trainee=await prisma.user.findUniqueOrThrow({where:{id:trainee.id}});assert.equal(trainee.active,false);assert.equal(trainee.appAccessGranted,true);assert.equal(await prisma.session.count({where:{tokenHash:ssoHash(traineeSession.token)}}),0);assert((await prisma.user.findUniqueOrThrow({where:{id:admin.id}})).active);
   sources.set(2,{...source(2,'trainee',true),last_updated:new Date(Date.now()+2000).toISOString()});await syncDirectoryUser(directoryUserSchema.parse(sources.get(2)));assert((await prisma.user.findUniqueOrThrow({where:{id:trainee.id}})).active);
   const stale={...source(2,'trainee',false),last_updated:new Date(Date.now()-1000).toISOString()};await syncDirectoryUser(stale);assert((await prisma.user.findUniqueOrThrow({where:{id:trainee.id}})).active);
   await persistSsoAccess(actor,{id:trainee.id,role:'ACCOUNTANT',active:false,customRoleId:''});await syncDirectoryUser(directoryUserSchema.parse(sources.get(2)));assert.equal((await prisma.user.findUniqueOrThrow({where:{id:trainee.id}})).active,false);
   const newEvent=randomUUID();events.set(newEvent,{pk:newEvent,action:'model_updated',context:{model:{app:'authentik_core',model_name:'user',pk:2}}});apiAvailable=false;await assert.rejects(()=>processSsoWebhook(newEvent));assert.equal((await prisma.ssoWebhookEvent.findUniqueOrThrow({where:{eventId:newEvent}})).processedAt,null);apiAvailable=true;await processSsoWebhook(newEvent);
   console.log('PASS Bearer eventId webhook: read authoritative target (not actor), dedupe/retry, deactivate/revoke, stale update protection and app grant conjunction');
   const local=await prisma.user.create({data:{username:'local-collision',email:'collision@fixture.test',passwordHash:'unchanged',role:'ADMIN'}});
   await assert.rejects(()=>syncDirectoryUser({...source(9,'local-collision')}));assert.equal((await prisma.user.findUniqueOrThrow({where:{id:local.id}})).ssoUserId,null);
   const {requestPasswordReset}=await import('../src/lib/password-reset');const {persistOwnAccount}=await import('../src/lib/account-management');
   await assert.rejects(()=>requestPasswordReset('nlhson@fixture.test','fixture-ip'));
   await assert.rejects(()=>persistOwnAccount(actor,{email:'new@fixture.test',newPassword:'unsafe-change',confirmPassword:'unsafe-change'},'unused'));
   console.log('PASS no automatic local-account linking, no SSO-side roles trusted, local password mutations blocked');
  }finally{globalThis.fetch=oldFetch;process.env.AUTH_MODE='local';}
 });
}
void main().catch(error=>{console.error(error instanceof Error?error.message:'SSO_TEST_FAILED');process.exitCode=1;});
