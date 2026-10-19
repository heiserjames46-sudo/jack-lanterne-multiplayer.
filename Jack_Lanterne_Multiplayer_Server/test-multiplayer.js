'use strict';
const assert = require('assert').strict;
const { spawn } = require('child_process');
const WebSocket = require('ws');
const PORT = 18765;
const BASE = `ws://127.0.0.1:${PORT}`;
const server = spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore','pipe','pipe'] });
let logs = '';
server.stdout.on('data', d => logs += d.toString());
server.stderr.on('data', d => logs += d.toString());
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect() {
  const ws = new WebSocket(BASE); const queue=[]; const waiters=[];
  ws.on('message', raw=>{let m;try{m=JSON.parse(raw)}catch{return}const i=waiters.findIndex(w=>w.test(m));if(i>=0){const w=waiters.splice(i,1)[0];clearTimeout(w.timer);w.resolve(m)}else queue.push(m)});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});
  return {ws,queue,waiters,send(o){ws.send(JSON.stringify(o))},wait(test,timeout=2200){const i=queue.findIndex(test);if(i>=0)return Promise.resolve(queue.splice(i,1)[0]);return new Promise((resolve,reject)=>{const w={test,resolve,reject,timer:setTimeout(()=>{const j=waiters.indexOf(w);if(j>=0)waiters.splice(j,1);reject(new Error('timeout waiting for message'))},timeout)};waiters.push(w)})},close(){ws.close()}};
}
(async()=>{
 const all=[];
 try {
  await new Promise((resolve,reject)=>{const until=Date.now()+5000;(function check(){if(logs.includes('listening'))return resolve();if(server.exitCode!==null)return reject(new Error(logs));if(Date.now()>until)return reject(new Error('server startup timeout '+logs));setTimeout(check,50)})()});
  for (const cap of [4,6,8]) {
    const host=await connect();all.push(host);await host.wait(m=>m.type==='welcome');host.send({type:'createRoom',name:'Host'+cap,mode:'coop',maxPlayers:cap});const created=await host.wait(m=>m.type==='roomCreated');assert.equal(created.maxPlayers,cap);
    for(let i=1;i<cap;i++){const c=await connect();all.push(c);await c.wait(m=>m.type==='welcome');c.send({type:'joinRoom',code:created.code,name:'P'+cap+'_'+i});await c.wait(m=>m.type==='joinedRoom');}
    assert.equal(Object.keys(created.players||{}).length,1,'host starts as only member');
    const extra=await connect();all.push(extra);await extra.wait(m=>m.type==='welcome');extra.send({type:'joinRoom',code:created.code,name:'Extra'});const fullErr=await extra.wait(m=>m.type==='error');assert.match(fullErr.message,/limite/i);
  }
  // Server-side geometry + platform landing check in a cooperative room.
  const geoHost=await connect();all.push(geoHost);await geoHost.wait(m=>m.type==='welcome');geoHost.send({type:'createRoom',name:'GeoHost',mode:'coop',maxPlayers:4});const geoRoom=await geoHost.wait(m=>m.type==='roomCreated');
  geoHost.send({type:'worldGeometry',phase:1,worldW:1200,platforms:[{x:0,y:468,w:1200,h:90},{x:100,y:380,w:400,h:18}],traps:[]});
  geoHost.send({type:'input',dir:1,jump:true,phase:1,inBossRoom:false});
  await sleep(80);geoHost.send({type:'input',dir:1,jump:false,phase:1,inBossRoom:false});
  let landed=null;const untilLand=Date.now()+1800;while(Date.now()<untilLand){try{const m=await geoHost.wait(m=>m.type==='authoritativeState'&&m.player&&m.player.id===geoRoom.host,300);if(m.player.ground&&Math.abs(m.player.y-310)<3&&m.player.x>90){landed=m;break;}}catch{}}
  assert.ok(landed,'server should resolve landing on a synchronized platform');
  const pvp1=await connect();all.push(pvp1);await pvp1.wait(m=>m.type==='welcome');pvp1.send({type:'createRoom',name:'Solo1',mode:'pvp_solo'});const pvpRoom=await pvp1.wait(m=>m.type==='roomCreated');assert.equal(pvpRoom.maxPlayers,2);
  const pvp2=await connect();all.push(pvp2);await pvp2.wait(m=>m.type==='welcome');pvp2.send({type:'joinRoom',code:pvpRoom.code,name:'Solo2'});await pvp2.wait(m=>m.type==='joinedRoom');
  pvp1.send({type:'input',dir:1,jump:true,inBossRoom:false});const authoritative=await pvp1.wait(m=>m.type==='authoritativeState'&&m.player&&m.player.id===pvpRoom.host);assert.ok(authoritative.player.x>130,'server advances horizontal position from input');assert.ok(Number.isFinite(authoritative.player.y),'server computes vertical position');
  pvp1.send({type:'combatAction',kind:'parry',phase:1,x:130,y:398});
  const parryState=await pvp1.wait(m=>m.type==='combatState'&&Number.isFinite(m.parryUntil));
  assert.ok(parryState.parryUntil>Date.now(),'server should open a timed parry window');
  pvp1.send({type:'combatAction',kind:'defendStart',phase:1,x:130,y:398});
  const defendState=await pvp1.wait(m=>m.type==='combatState'&&m.defending===true);
  assert.equal(defendState.defending,true,'server should record defense state');
  pvp1.send({type:'combatAction',kind:'defendStop',phase:1,x:130,y:398});
  await pvp1.wait(m=>m.type==='combatState'&&m.defending===false);
  const pvp3=await connect();all.push(pvp3);await pvp3.wait(m=>m.type==='welcome');pvp3.send({type:'joinRoom',code:pvpRoom.code,name:'Solo3'});const pvpErr=await pvp3.wait(m=>m.type==='error');assert.match(pvpErr.message,/limite/i);
  console.log('PASS: salas cooperativas com 4, 6 e 8 participantes; excesso bloqueado; colisão/aterrissagem em plataforma sincronizada; janela de parry e defesa no servidor; PvP Solo com 2; excesso bloqueado; movimento de arena calculado pelo servidor.');
  console.log('NOTA: teste automatizado de protocolo local; não substitui teste visual em navegadores/dispositivos reais.');
 } catch(e){console.error('FAIL:',e.stack||e);process.exitCode=1;} finally {for(const c of all)try{c.close()}catch{};server.kill();}
})();
