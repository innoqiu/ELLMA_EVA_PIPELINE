// Local-only fixture builder. Requires the supplied recordings and Playwright/Edge.
import {readdir,readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'file:///C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root=resolve('../recording'),out=resolve('public/study-examples');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const page=await browser.newPage();await page.setContent('<input type="file">');
const folders=['1','2','2 - 副本','2 - 副本 (2)','2 - 副本 (3)','2 - 副本 (4)'];
const manifest=[];
try {
for(let s=0;s<folders.length;s++) {
  const folder=folders[s];let names=(await readdir(resolve(root,folder))).filter(n=>/\.(mp3|m4a)$/i.test(n)).sort();
  if(s===2)names=['城市局地高温分布研究.m4a','关于微塑料的相关研究.m4a'];
  if(names.length!==2)throw Error(`Expected two recordings in ${folder}`);
  for(let j=0;j<2;j++) {
    const name=names[j],src=resolve(root,folder,name),id=`student-${String(s+1).padStart(2,'0')}-${j?'b':'a'}`,type=extname(name)==='.mp3'?'audio/mpeg':'audio/mp4';
    await page.locator('input').setInputFiles(src);
    const duration=await page.evaluate(()=>new Promise((ok,fail)=>{const a=new Audio(),url=URL.createObjectURL(document.querySelector('input').files[0]);a.preload='metadata';a.onloadedmetadata=()=>{URL.revokeObjectURL(url);ok(a.duration);};a.onerror=()=>{URL.revokeObjectURL(url);fail(Error('Cannot decode audio'));};a.src=url;}));
    if(!Number.isFinite(duration)||duration<=0)throw Error(`Invalid duration: ${name}`);
    const durationMs=Math.round(duration*1000),seed=s*2+j+1;
    const audience=[{id:'audience-left',position:[-1.3,1.45,3.1]},{id:'audience-centre',position:[0,1.45,3.25]},{id:'audience-right',position:[1.3,1.45,3.1]}];
    const screen={id:'slide-screen',position:[2.5,1.75,2.35]};
    const round=v=>Number(v.toFixed(4));
    const records=Array.from({length:Math.floor(durationMs/5000)+1},(_,i)=>{
      const head=[round(.05*Math.sin(i/4+seed)),1.64+seed*.004,round(.03*Math.cos(i/6+seed))];
      const target=(i+seed)%(5+s)===0?screen:audience[s%3===0?1:(Math.floor(i/(2+j))+seed)%3];
      const delta=target.position.map((v,k)=>v-head[k]),norm=Math.hypot(...delta),dir=delta.map(v=>round(v/norm)),yaw=Math.atan2(delta[0],delta[2]);
      const active=(i+seed)%(3+s%3)===0,amplitude=active?.15+seed*.013:.035;
      return {timestamp_ms:i*5000,gaze:{source:'head_direction_proxy',origin:head,direction:dir,target_id:target.id,target_type:target===screen?'screen':'audience',confidence:1},headset:{position:head,rotation_xyzw:[0,round(Math.sin(yaw/2)),0,round(Math.cos(yaw/2))]},controllers:Object.fromEntries(['left','right'].map((side,k)=>[side,{position:[round((k?1:-1)*(.26+amplitude*Math.abs(Math.sin(i*.7+seed+k)))),round(1.12+amplitude*(1+Math.sin(i*.5+seed+k))),round(.3+amplitude*.5*Math.cos(i*.4+k))],rotation_xyzw:[0,0,0,1],tracked:true}])),audience,events:i===0?['presentation_started']:active?['open_hand_gesture']:[]};
    });
    const trace={schema_version:'ellma-vr-trace-1.0',sample_interval_ms:5000,duration_ms:durationMs,simulation:{is_simulated:true,seed,description:'Synthetic demonstration only. Motion is not inferred from the recording. Time zero matches audio start; final sampled pose is held until audio end.'},coordinate_system:{units:'metres',handedness:'right-handed',axes:{x:'right',y:'up',z:'forward'},origin:'VR scene origin'},session:{session_id:id,learner_id:`student-${String(s+1).padStart(2,'0')}`,audio_duration_ms:durationMs},scene_objects:[...audience.map(a=>({...a,type:'audience'})),{...screen,type:'screen'}],records};
    const audioName=`${id}${extname(name)}`,traceName=`${id}-vr.json`;
    await copyFile(src,resolve(out,audioName));await writeFile(resolve(out,traceName),JSON.stringify(trace,null,2)+'\n');
    manifest.push({id,studentId:`student-${String(s+1).padStart(2,'0')}`,scriptId:j?'b':'a',source:`${folder}/${name}`,audio:{name:audioName,originalName:name,size:(await readFile(src)).length,type,durationMs,url:`/study-examples/${audioName}`},traceUrl:`/study-examples/${traceName}`,trace});
    console.log(`${id}: ${name} | ${duration.toFixed(3)}s | ${records.length} samples`);
  }
}
await writeFile(resolve(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}finally{await browser.close();}
