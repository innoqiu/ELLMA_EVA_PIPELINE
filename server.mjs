import http from 'node:http';
import {readFile,writeFile,mkdir,rename,copyFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {timingSafeEqual} from 'node:crypto';

const port=Number(process.env.PORT||3000),root=resolve('dist'),data=resolve(process.env.DATA_DIR||'data');
if(!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length<16)throw Error('Set ADMIN_PASSWORD to at least 16 characters.');
await mkdir(resolve(data,'audio'),{recursive:true});
const statePath=resolve(data,'state.json');
let revision=0,state=null;
try {const saved=JSON.parse(await readFile(statePath,'utf8'));state=saved.state;revision=saved.revision;}catch(e){if(e.code!=='ENOENT')throw Error('Saved state cannot be read. Restore state.json from backup before starting.');}
const credentials=Buffer.from(`${process.env.ADMIN_USER||'admin'}:${process.env.ADMIN_PASSWORD}`);
const configs=Object.fromEntries(['text','multimodal'].map(kind=>{const prefix=kind.toUpperCase();return [kind,{url:process.env[`${prefix}_BASE_URL`],key:process.env[`${prefix}_API_KEY`],model:process.env[`${prefix}_MODEL`]}];}));
const json=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function body(req,max=32*1024*1024){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Object.assign(Error('Request too large'),{status:413});chunks.push(chunk);}return Buffer.concat(chunks);}
let writing=false,active=0;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.m4a':'audio/mp4','.svg':'image/svg+xml','.png':'image/png','.txt':'text/plain','.pdf':'application/pdf'};
async function serve(req,res,path){const info=await stat(path);if(!info.isFile())throw Object.assign(Error('Not found'),{status:404});let start=0,end=info.size-1,code=200;const range=req.headers.range;if(range){const m=/^bytes=(\d+)-(\d*)$/.exec(range);if(!m || +m[1]>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}start=+m[1];end=m[2]?Math.min(+m[2],end):end;if(end<start){res.writeHead(416);res.end();return;}code=206;}res.writeHead(code,{'Content-Type':mime[extname(path)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, no-cache',...(code===206?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});if(req.method==='HEAD')res.end();else createReadStream(path,{start,end}).pipe(res);}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/healthz'){json(res,200,{ok:true});return;}
  const input=Buffer.from((req.headers.authorization||'').replace(/^Basic /,''),'base64');
  if(!req.headers.authorization?.startsWith('Basic ')||input.length!==credentials.length||!timingSafeEqual(input,credentials)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="ELLMA", charset="UTF-8"','Cache-Control':'no-store'});res.end('Authentication required');return;}
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  if(!['GET','HEAD'].includes(req.method) && req.headers['x-ellma-client']!=='1'){json(res,403,{error:'Invalid client request'});return;}
  if(url.pathname==='/api/bootstrap'){json(res,200,{state,revision,config:Object.fromEntries(Object.entries(configs).map(([kind,c])=>[kind,c.url&&c.key&&c.model?{provider:'openai',baseUrl:`/api/model/${kind}`,apiKey:'server-managed',model:c.model,serverManaged:true}:{provider:'mock',baseUrl:'mock://local',apiKey:'',model:'Not configured',serverManaged:true}]))});return;}
  if(url.pathname==='/api/state'&&req.method==='PUT'){
    const incoming=JSON.parse((await body(req)).toString());
    if(writing||incoming.revision!==revision){json(res,409,{error:'State changed in another browser. Reload before continuing.'});return;}
    if(!incoming.state||!Array.isArray(incoming.state.history))throw Object.assign(Error('Invalid state'),{status:400});
    writing=true;try{const next={...incoming.state};delete next.config;
      if(state!==null)await copyFile(statePath,resolve(data,'state.previous.json'));
      await writeFile(resolve(data,'state.pending.json'),JSON.stringify({revision:revision+1,state:next}));await rename(resolve(data,'state.pending.json'),statePath);state=next;revision++;json(res,200,{revision});
    }finally{writing=false;}return;
  }
  const audio=/^\/api\/audio\/([a-zA-Z0-9_-]+)$/.exec(url.pathname);
  if(audio){const path=resolve(data,'audio',audio[1]+'.bin');if(req.method==='PUT'){const bytes=await body(req,64*1024*1024);await writeFile(path,bytes);json(res,200,{ok:true});}else await serve(req,res,path);return;}
  const model=/^\/api\/model\/(text|multimodal)\/chat\/completions$/.exec(url.pathname);
  if(model&&req.method==='POST'){
    const c=configs[model[1]];if(!c.url||!c.key||!c.model){json(res,503,{error:'Configure model environment variables in Coolify.'});return;}
    if(active>=Number(process.env.MAX_MODEL_REQUESTS||12)){json(res,429,{error:'Server busy. Retry after current evaluation finishes.'});return;}
    active++;try{const payload=JSON.parse((await body(req)).toString());payload.model=c.model;payload.stream=false;
      const upstream=await fetch(c.url.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${c.key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(300000)});
      if(!upstream.ok){json(res,upstream.status,{error:`Model provider returned ${upstream.status}`});return;}const reply=await upstream.json();json(res,200,reply);
    }finally{active--;}return;
  }
  if(url.pathname.startsWith('/api/')){json(res,404,{error:'Not found'});return;}
  if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Method not allowed'});return;}
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));if(path!==root&&!path.startsWith(root+sep)){json(res,403,{error:'Forbidden'});return;}
  await serve(req,res,path===root?resolve(root,'index.html'):path);
 }catch(e){if(!res.headersSent)json(res,e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:'Request failed'});else res.destroy();}
});
server.requestTimeout=360000;server.listen(port,'0.0.0.0',()=>console.log(`ELLMA listening on ${port}`));
