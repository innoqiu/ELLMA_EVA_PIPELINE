import scriptA from '../public/study-scripts/script-a.txt?raw';
import scriptB from '../public/study-scripts/script-b.txt?raw';
import examples from '../public/study-examples/manifest.json';
import {serverConfig} from './server-storage';
export const STUDY_EXAMPLES = Object.fromEntries(examples.map(example=>[example.id,example]));

export function studyWorkflow(session,createSlot,validateTrace) {
  const workflow=session.workflow || createStudyWorkflow(session,createSlot);
  const example=STUDY_EXAMPLES[session.id];
  if(!example)return workflow;
  return {...workflow,draft:{...workflow.draft,
    audio:workflow.draft.audio || example.audio,
    ...(!workflow.draft.vrTrace?{vrTrace:example.trace,vrTraceSummary:validateTrace(example.trace).summary,vrTraceSource:'bundled-simulation',vrTraceUrl:example.traceUrl}:{}),
  }};
}
export const STUDY_SCRIPTS = [
  { id: 'a', title: 'Heat Has a Postcode', text: scriptA.split('\n').slice(2).join('\n').trim(), url: '/study-scripts/script-a.txt', topic: 'Street-level heat exposure' },
  { id: 'b', title: 'The Plastic We Cannot See', text: scriptB.split('\n').slice(2).join('\n').trim(), url: '/study-scripts/script-b.txt', topic: 'Coastal microplastic monitoring' },
];
export const STUDENTS = Array.from({length:9}, (_,i) => ({id:`student-${String(i+1).padStart(2,'0')}`, name:`Student ${String(i+1).padStart(2,'0')}`}));
async function audioDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('ellma-study-audio',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('recordings');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
export async function saveStudyAudio(id,file) {
  if(serverConfig){const response=await fetch(`/api/audio/${encodeURIComponent(id)}`,{method:'PUT',headers:{'X-ELLMA-Client':'1'},body:file});if(!response.ok)throw Error('Audio could not be saved on the server.');}
  const db=await audioDatabase();
  try {await new Promise((resolve,reject)=>{
    const tx=db.transaction('recordings','readwrite');tx.objectStore('recordings').put(file,id);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });} finally {db.close();}
}
export async function loadStudyAudio(id,metadata) {
  if(serverConfig){const response=await fetch(`/api/audio/${encodeURIComponent(id)}`);if(response.ok)return new File([await response.blob()],metadata?.name||`${id}.audio`,{type:metadata?.type||'application/octet-stream'});if(response.status!==404)throw Error('Saved recording is unavailable.');return null;}
  const db=await audioDatabase();
  try {return await new Promise((resolve,reject)=>{
    const request=db.transaction('recordings').objectStore('recordings').get(id);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });} finally {db.close();}
}
export function initialStudy() {
  return { version:1, sessions: STUDENTS.flatMap(student => STUDY_SCRIPTS.map((script,i) => ({id:`${student.id}-${script.id}`, studentId:student.id, scriptId:script.id, label:`Test ${i+1} · Script ${script.id.toUpperCase()}`, createdAt:null, workflow:null}))) };
}
export function createStudyWorkflow(session, createSlot) {
  const script = STUDY_SCRIPTS.find(s=>s.id===session.scriptId);
  const student = STUDENTS.find(s=>s.id===session.studentId);
  const base = createSlot('new-dataset');
  return {...base, selectedDatasetId:session.id, slotCache:{}, studentId:student.id, studySessionId:session.id,
    draft:{...base.draft,id:session.id,title:script.title,learner:student.name,topic:script.topic,audience:'General public',level:'B2–C1',taskBrief:'Deliver a three-minute research explanation for a general audience using the supplied simulated research script.',transcript:script.text,vrTrace:null,vrTraceSummary:null,vrTraceFile:null,audio:null}};
}
