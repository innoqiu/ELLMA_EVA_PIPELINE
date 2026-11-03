import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
const dir=await mkdtemp(join(tmpdir(),'ellma-server-test-'));
const password='test-password-not-a-real-secret';
const headers={Authorization:'Basic '+Buffer.from('admin:'+password).toString('base64'),'X-ELLMA-Client':'1','Content-Type':'application/json'};
let received;
const provider=http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);received={body:JSON.parse(Buffer.concat(chunks)),auth:req.headers.authorization};res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'{"ok":true}'}}]}));});
await new Promise(r=>provider.listen(14315,'127.0.0.1',r));
const start=()=>spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'14314',DATA_DIR:dir,ADMIN_PASSWORD:password,TEXT_BASE_URL:'http://127.0.0.1:14315/v1',TEXT_API_KEY:'fake-secret-for-test',TEXT_MODEL:'test-model'},stdio:'ignore'});
let child=start();
async function ready(){for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:14314/healthz')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Server did not start');}
const req=(path,options={})=>fetch('http://127.0.0.1:14314'+path,{headers,...options});
try{await ready();assert.equal((await fetch('http://127.0.0.1:14314/')).status,401);
const boot=await (await req('/api/bootstrap')).json();assert.equal(boot.state,null);assert.equal(boot.config.text.apiKey,'server-managed');assert.ok(!JSON.stringify(boot).includes('fake-secret-for-test'));
assert.equal((await req('/api/state',{method:'PUT',body:JSON.stringify({revision:0,state:{history:[{id:'test'}],config:{apiKey:'must-not-persist'}}})})).status,200);
assert.equal((await req('/api/state',{method:'PUT',body:JSON.stringify({revision:0,state:{history:[]}})})).status,409);
assert.ok(!(await readFile(join(dir,'state.json'),'utf8')).includes('must-not-persist'));
assert.equal((await req('/api/audio/student-01-a',{method:'PUT',body:Buffer.from('audio-fixture')})).status,200);
assert.equal(await (await req('/api/audio/student-01-a')).text(),'audio-fixture');
const range=await req('/study-examples/student-01-a.mp3',{headers:{...headers,Range:'bytes=0-99'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
assert.equal((await req('/api/model/text/chat/completions',{method:'POST',body:JSON.stringify({model:'ignored',messages:[]})})).status,200);assert.equal(received.body.model,'test-model');assert.equal(received.auth,'Bearer fake-secret-for-test');
const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;child=start();await ready();assert.equal((await(await req('/api/bootstrap')).json()).state.history[0].id,'test');
console.log('PASS auth, key isolation, atomic persistence, revision conflicts, audio upload, ranges, provider proxy, restart recovery');
}finally{child.kill();provider.close();}
