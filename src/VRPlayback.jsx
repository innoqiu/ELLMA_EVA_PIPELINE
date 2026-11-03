import React,{useEffect,useMemo,useState,lazy,Suspense} from 'react';
const VRAvatar=lazy(()=>import('./VRAvatar'));
import {parseTrace,parseSegments,frameAt,clock,vector} from './vr-playback';
import './vr-playback.css';

export default function VRPlayback({trace,transcript,segments,saved,onSave}) {
  const [view,setView]=useState('3d');
  const [error,setError]=useState(''),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[smooth,setSmooth]=useState(false),[loop,setLoop]=useState(false),[range,setRange]=useState(null);
  const source=saved?.trace||trace;
  const parsed=useMemo(()=>{try{return {data:source?parseTrace(source):null};}catch(e){return {error:e.message};}},[source]);
  const data=parsed.data,records=data?.records||[],start=records[0]?.timestamp_ms||0,end=Math.max(records.at(-1)?.timestamp_ms||0,Number.isFinite(data?.duration_ms)?data.duration_ms:0);
  const from=range?.[0]??start,to=range?.[1]??end;
  const lines=saved?.segments||segments||[];
  useEffect(()=>{setTime(start);setPlaying(false);setRange(null);},[source,start]);
  useEffect(()=>{
    if(!playing)return;
    let id,last;
    const tick=now=>{if(last!==undefined)setTime(t=>{const next=t+(now-last)*speed;if(next>=to){if(loop && to>from)return from+(next-from)%(to-from);setPlaying(false);return to;}return next;});last=now;id=requestAnimationFrame(tick);};
    id=requestAnimationFrame(tick);return()=>cancelAnimationFrame(id);
  },[playing,speed,loop,from,to]);
  async function upload(event,type) {const file=event.target.files[0];event.target.value='';if(!file)return;try{if(file.size>10*1024*1024)throw new Error('Please use a JSON file smaller than 10 MB.');const value=JSON.parse(await file.text());const result=type==='trace'?parseTrace(value):parseSegments(value);onSave({...saved,[type]:result,[`${type}Name`]:file.name});setError('');}catch(e){setError(e.message);}}
  const frame=data?frameAt(records,time,smooth):null;
  const objects=frame?.sample.audience?.length?frame.sample.audience:(data?.scene_objects||[]).filter(o=>o.type==='audience');
  const bounds=useMemo(()=>{
    const points=records.flatMap(r=>[r.headset.position,r.controllers?.left?.position,r.controllers?.right?.position,...(r.audience||[]).map(a=>a.position)]).concat((data?.scene_objects||[]).map(o=>o.position)).filter(vector);
    const extent=axis=>{let min=-1,max=1;for(const p of points){min=Math.min(min,p[axis]);max=Math.max(max,p[axis]);}return [min-.4,max+.4];};return [extent(0),extent(1),extent(2)];
  },[data]);
  const plot=(top)=>{
    const h=top?2:1;
    const bodyPoints=records.flatMap(r=>[r.headset.position,r.controllers?.left?.position,r.controllers?.right?.position]).filter(vector);
    const bodyBounds=axis=>{let min=axis===0?-0.8:0,max=axis===0?.8:2;for(const p of bodyPoints){min=Math.min(min,p[axis]);max=Math.max(max,p[axis]);}return [min-.2,max+.2];};
    const [xmin,xmax]=top?bounds[0]:bodyBounds(0),[ymin,ymax]=top?bounds[h]:bodyBounds(1),scale=Math.min(360/(xmax-xmin),230/(ymax-ymin));
    const xy=p=>[220+(p[0]-(xmin+xmax)/2)*scale,150-(p[h]-(ymin+ymax)/2)*scale];
    const dot=(p,color,label,key=label)=>{if(!vector(p))return null;const [x,y]=xy(p);return <g key={key}><circle cx={x} cy={y} r={label==='Head'?10:7} fill={color}/><text x={x+10} y={y-10}>{label}</text></g>;};
    const ray=(p,d,color,dashed)=>{if(!vector(p)||!vector(d))return null;const length=Math.hypot(...d);if(!length)return null;const a=xy(p),b=xy(p.map((v,i)=>v+d[i]/length*2));return <g><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth="3" strokeDasharray={dashed?'7 5':undefined}/><circle cx={b[0]} cy={b[1]} r="4" fill={color}/></g>;};
    return <svg viewBox="0 0 440 310" role="img" aria-label={top?'Top view: head direction and audience':'Front projection: hand positions'}>
      <path d="M30 280H410 M30 280V25" fill="none" stroke="#ccd5df"/><text x="350" y="303">+X right</text><text x="35" y="25">{top?'+Z forward':'+Y up'}</text>
      {top && objects.map((o,i)=>dot(o.position,'#94a3b8',`A${i+1}`,`aud-${i}`))}
      {['left','right'].map((side,i)=><polyline key={side} points={records.slice(Math.max(0,frame.index-5),frame.index+1).filter(r=>r.controllers?.[side]?.tracked!==false&&vector(r.controllers?.[side]?.position)).map(r=>xy(r.controllers[side].position).join(',')).join(' ')} fill="none" stroke={i?'#c76b13':'#087e8b'} opacity=".3" strokeWidth="2"/>)}
      {top && ray(frame.position,frame.head,'#4f46e5')}{top && frame.gaze && ray(frame.gaze.origin,frame.gaze.direction,'#b02886',true)}
      {dot(frame.position,'#4f46e5','Head')}{dot(frame.left,'#087e8b','L')}{dot(frame.right,'#c76b13','R')}
    </svg>;
  };
  return <section className="vr-player"><header><h2>VR motion replay</h2><p>Inspect recorded poses alongside the transcript. No model request is made.</p></header>
    <div className="vr-tools"><label>Upload VR JSON<input type="file" accept=".json,application/json" onChange={e=>upload(e,'trace')}/></label><a href="/vr-trace-template.json" download>Download example trace</a><label>Upload timed transcript<input type="file" accept=".json,application/json" onChange={e=>upload(e,'segments')}/></label></div>
    <p className="vr-note">Playback uploads are saved for this test; they do not replace evaluation pipeline inputs. Coordinates: metres, X right / Y up / Z forward.</p>
    {data?.simulation?.is_simulated && <p className="vr-note"><strong>Simulated VR trace.</strong> {data.simulation.description}</p>}
    {(error||parsed.error)&&<p role="alert">{error||parsed.error}</p>}
    {!data?<p>Upload a VR trace, or use the trace already attached in Pipeline execution.</p>:<>
      <p>{saved?.traceName||'Pipeline trace'} · {records.length} samples · {clock(start)}–{clock(end)}</p>
      <div className="vr-tools" role="group" aria-label="Replay view"><button aria-pressed={view==='3d'} onClick={()=>setView('3d')}>3D avatar</button><button aria-pressed={view==='abstract'} onClick={()=>setView('abstract')}>Abstract view</button></div>
      {view==='3d'?<Suspense fallback={<p>Loading 3D viewer…</p>}><VRAvatar frame={frame} audience={objects}/></Suspense>:<div className="vr-views"><section><h3>Hands · front projection</h3>{plot(false)}</section><section><h3>Orientation · top view</h3>{plot(true)}</section></div>}
      <p className="vr-legend">Teal: left hand · Orange: right hand · Purple: head forward · Dashed pink: recorded gaze · Grey: audience</p>
      <p className="vr-note">{objects.map((o,i)=>`A${i+1}: ${o.id||'audience'}`).join(' · ')}</p>
      <div className="vr-transport"><button disabled={end===start||to<=from} onClick={()=>{if(time>=to||time<from)setTime(from);setPlaying(!playing);}}>{playing?'Pause':'Play'}</button><output aria-label="Playback time">{clock(time)}</output><label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.25,.5,1,2].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><label><input type="checkbox" checked={smooth} onChange={e=>setSmooth(e.target.checked)}/>Interpolate positions</label></div>
      <input className="vr-seek" aria-label="Replay timeline" type="range" min={start} max={end||1} step="10" value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/>
      <div className="vr-tools"><button onClick={()=>{setPlaying(false);setTime(records[Math.max(0,frame.index-1)].timestamp_ms);}}>Previous sample</button><button onClick={()=>{setPlaying(false);setTime(records[Math.min(records.length-1,frame.index+1)].timestamp_ms);}}>Next sample</button><button onClick={()=>setRange([time,Math.max(time,to)])}>Set loop start</button><button onClick={()=>setRange([Math.min(from,time),time])}>Set loop end</button><label><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/>Loop {clock(from)}–{clock(to)}</label><button onClick={()=>setRange(null)}>Reset range</button></div>
      <p className="vr-note">Sample at {clock(frame.sample.timestamp_ms)}. {smooth?'Interpolated motion is illustrative, not measured between samples.':'Recorded poses are held until the next sample.'} Five-second samples cannot establish gesture timing or continuous eye contact.</p>
      <p>{!frame.head?'Head rotation unavailable. ':''}{!frame.left?'Left controller not tracked. ':''}{!frame.right?'Right controller not tracked. ':''}{!objects.length?'Audience positions unavailable.':''}</p>
    </>}
    <section className="vr-transcript"><h3>Transcript reference</h3>{lines.length?<><p className="vr-note">Times are relative to the same session clock as the VR trace. Click a segment to seek. Imported/model timestamps are not verified ground truth.</p>{lines.map((s,i)=><button key={i} className={time>=s.start_ms&&time<s.end_ms?'active':''} onClick={()=>{setPlaying(false);setTime(Math.max(start,Math.min(end,s.start_ms)));}}><b>{clock(s.start_ms)}–{clock(s.end_ms)}</b><span>{s.text}</span>{s.timestamp_source&&<small>{s.timestamp_source}</small>}</button>)}</>:<><p className="vr-note">This transcript has no timing; no sentence alignment is inferred. For synchronized reference, upload JSON with segments: [&#123;start_ms: 0, end_ms: 5000, text: "..."&#125;].</p><p>{transcript||'No transcript supplied.'}</p></>}</section>
  </section>;
}
