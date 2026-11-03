export const vector = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
export function parseTrace(data) {
  if (!Array.isArray(data?.records) || !data.records.length) throw new Error('Expected a non-empty records array (ELLMA VR trace).');
  const c=data.coordinate_system;
  if (c?.units && !['metres','meters'].includes(c.units)) throw new Error('Coordinates must use metres.');
  if (c?.axes && (c.axes.x!=='right'||c.axes.y!=='up'||c.axes.z!=='forward')) throw new Error('Expected axes: x right, y up, z forward. Convert coordinates before upload.');
  const records=[...data.records].sort((a,b)=>a.timestamp_ms-b.timestamp_ms);
  records.forEach((r,i)=>{
    if (!Number.isFinite(r.timestamp_ms)||r.timestamp_ms<0 || (i && r.timestamp_ms===records[i-1].timestamp_ms)) throw new Error('Each record needs a unique, non-negative timestamp_ms.');
    if (!vector(r.headset?.position)) throw new Error(`Missing headset.position at ${r.timestamp_ms} ms.`);
    for (const side of ['left','right']) if (r.controllers?.[side]?.tracked!==false && r.controllers?.[side]?.position && !vector(r.controllers[side].position)) throw new Error(`Invalid ${side} controller position.`);
    if (r.audience && (!Array.isArray(r.audience)||r.audience.some(a=>!vector(a.position)))) throw new Error('Invalid audience positions.');
  });
  if (data.scene_objects && (!Array.isArray(data.scene_objects)||data.scene_objects.some(a=>!vector(a.position)))) throw new Error('Invalid scene object positions.');
  return {...data,records};
}
export function forward(q) {
  if (!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite)) return null;
  const n=Math.hypot(...q);if(!n)return null;
  const [x,y,z,w]=q.map(v=>v/n);
  return [2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)];
}
export function frameAt(records,time,smooth=false) {
  let i=0;while(i<records.length-1 && records[i+1].timestamp_ms<=time)i++;
  const a=records[i],b=records[Math.min(i+1,records.length-1)];
  const f=smooth && b!==a?Math.max(0,Math.min(1,(time-a.timestamp_ms)/(b.timestamp_ms-a.timestamp_ms))):0;
  const mix=(x,y)=>vector(x)?(f && vector(y)?x.map((v,j)=>v+(y[j]-v)*f):x):null;
  const hand=(r,side)=>r.controllers?.[side]?.tracked===false?null:r.controllers?.[side]?.position;
  return {index:i,sample:a,position:mix(a.headset.position,b.headset.position),head:mix(forward(a.headset.rotation_xyzw),forward(b.headset.rotation_xyzw)),left:mix(hand(a,'left'),hand(b,'left')),right:mix(hand(a,'right'),hand(b,'right')),gaze:vector(a.gaze?.direction)?a.gaze:null};
}
export function parseSegments(data) {
  const segments=data?.segments || data?.official_transcript_segments;
  if (!Array.isArray(segments)||!segments.length||segments.some(s=>!Number.isFinite(s.start_ms)||!Number.isFinite(s.end_ms)||s.start_ms<0||s.end_ms<s.start_ms||typeof s.text!=='string')) throw new Error('Expected segments: [{start_ms, end_ms, text}]. Times are milliseconds.');
  return [...segments].sort((a,b)=>a.start_ms-b.start_ms);
}
export function clock(ms) {return `${Math.floor(ms/60000).toString().padStart(2,'0')}:${(ms/1000%60).toFixed(1).padStart(4,'0')}`;}
