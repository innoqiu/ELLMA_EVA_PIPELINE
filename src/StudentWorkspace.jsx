import React, {useEffect,useState} from 'react';
import {Plus, Pencil, X} from 'lucide-react';
import {STUDENTS,STUDY_SCRIPTS,STUDY_EXAMPLES,initialStudy,studyWorkflow,loadStudyAudio} from './student-study';
import './student-study.css';
import VRPlayback from './VRPlayback';

function RecordingPreview({file,fallback}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{if(!file){setUrl('');return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
  return (url||fallback)?<audio aria-label="Student recording" controls preload="metadata" src={url||fallback} style={{width:'100%'}}/>:null;
}
export default function StudentWorkspace({state,setState,notify,createSlot,runtimeAudio,Workflow,Focused,History,onPrint,validateTrace}) {
  const [studentId,setStudentId]=useState(null);
  const [sessionId,setSessionId]=useState(null);
  const [tab,setTab]=useState('pipeline');
  const [adding,setAdding]=useState(false);
  const [newName,setNewName]=useState('');
  const [newScript,setNewScript]=useState('a');
  const [renaming,setRenaming]=useState(false);
  const [editName,setEditName]=useState('');
  const testName=(s,index)=>s.customName || (/^Test\s*\d+\s*· Script [AB]$/.test(s.label || '') ? `Test${index+1}` : s.label) || `Test${index+1}`;
  useEffect(()=>{window.scrollTo(0,0);},[studentId,sessionId,tab]);
  const [,refreshAudio]=useState(0);
  const [audioLoading,setAudioLoading]=useState(false);
  const study=state.study || initialStudy();
  const student=STUDENTS.find(s=>s.id===studentId);
  const sessions=study.sessions.filter(s=>s.studentId===studentId);
  const session=sessions.find(s=>s.id===sessionId) || sessions[0];
  useEffect(()=>{
    let active=true;
    if(session && !runtimeAudio.has(session.id)) {
      setAudioLoading(true);
      (async()=>{
        const example=STUDY_EXAMPLES[session.id],expected=session.workflow?.draft.audio;
        let file=await loadStudyAudio(session.id,expected).catch(()=>null);
        if(file && expected && file.name!==expected.name)file=null;
        if(!file && example && (!expected||expected.name===example.audio.name)) {
          const response=await fetch(example.audio.url);if(!response.ok)throw Error('Bundled recording unavailable');
          file=new File([await response.blob()],example.audio.name,{type:example.audio.type});
        }
        if(active && file && !runtimeAudio.has(session.id)){runtimeAudio.set(session.id,file);refreshAudio(n=>n+1);}
      })().catch(()=>{if(active)notify('Recording could not be loaded. Please refresh or upload it in Pipeline execution.','warning');}).finally(()=>{if(active)setAudioLoading(false);});
    } else setAudioLoading(false);
    return ()=>{active=false;};
  },[session?.id,runtimeAudio]);
  const busy=study.sessions.some(s=>s.workflow?.running || ['agent1-running','agent2-running'].includes(s.workflow?.alignment?.status));
  function updateSession(updater) {
    setState(current=>{
      const currentStudy=current.study || initialStudy();
      const target=currentStudy.sessions.find(s=>s.id===session.id);
      const workflow=studyWorkflow(target,createSlot,validateTrace);
      const next=typeof updater==='function'?updater({...current,workflow}):updater;
      return {...next,workflow:current.workflow,study:{...currentStudy,sessions:currentStudy.sessions.map(s=>s.id===target.id?{...s,createdAt:s.createdAt || new Date().toISOString(),workflow:next.workflow}:s)}};
    });
  }
  if(!student) return <div className="study-home">
    <section className="study-materials"><div>{STUDY_SCRIPTS.map(s=><a key={s.id} href={s.url} download>Download Script {s.id.toUpperCase()} · {s.title} ({s.text.split(/\s+/).length} words)</a>)}</div></section>
    <div className="student-grid">{STUDENTS.map(s=>{
      const records=study.sessions.filter(x=>x.studentId===s.id);
      const evaluated=records.filter(x=>(state.history||[]).some(r=>r.studySessionId===x.id)).length;
      return <button key={s.id} disabled={busy} onClick={()=>{setStudentId(s.id);setSessionId(records[0]?.id);setTab('pipeline');}}><span>{s.id.slice(-2)}</span><h3>{s.name}</h3><p>{records.filter(x=>x.workflow?.draft.audio||STUDY_EXAMPLES[x.id]).length}/{records.length} recordings · {evaluated}/{records.length} evaluated</p></button>;
    })}</div>
  </div>;
  const workflow=studyWorkflow(session,createSlot,validateTrace);
  const example=STUDY_EXAMPLES[session.id];
  const runs=(state.history||[]).filter(r=>r.studentId===studentId && r.studySessionId===session.id);
  return <div className="student-workspace">
    <header className="student-heading"><button className="secondary-button" disabled={busy} onClick={()=>setStudentId(null)}>All students</button><h2>{student.name}</h2></header>
    <nav className="study-timeline" aria-label="Student test timeline">{sessions.map((s,index)=>{
      const matches=(state.history||[]).filter(r=>r.studySessionId===s.id && r.studentId===studentId);
      return <button className="timeline-point" key={s.id} disabled={busy} aria-current={s.id===session.id?'step':undefined} onClick={()=>{setSessionId(s.id);setRenaming(false);setTab(matches.length?'focus':'pipeline');}}><i aria-hidden="true"/><b>{testName(s,index)}</b></button>;
    })}<button className="timeline-add" aria-label="Add test" title="Add test" disabled={busy} onClick={()=>{setNewName(`Test${sessions.length+1}`);setNewScript('a');setAdding(!adding);}}><Plus size={18}/><span>Add test</span></button></nav>
    {adding && <form className="test-editor" onSubmit={event=>{
      event.preventDefault();const name=newName.trim();if(!name)return;
      const id=`${studentId}-${newScript}-${crypto.randomUUID()}`;
      setState(current=>{const st=current.study||initialStudy();return {...current,study:{...st,sessions:[...st.sessions,{id,studentId,scriptId:newScript,label:name,customName:name,createdAt:null,workflow:null}]}}});setSessionId(id);setTab('pipeline');setAdding(false);setRenaming(false);
    }}><label>Test name<input autoFocus required maxLength={60} value={newName} onChange={e=>setNewName(e.target.value)}/></label><label>Script<select value={newScript} onChange={e=>setNewScript(e.target.value)}>{STUDY_SCRIPTS.map(s=><option key={s.id} value={s.id}>Script {s.id.toUpperCase()} · {s.title}</option>)}</select></label><button className="primary-button" disabled={busy}>Create test</button><button type="button" className="secondary-button" onClick={()=>setAdding(false)}>Cancel</button></form>}
    <div className="test-name-row">{renaming ? <form className="test-rename" onSubmit={event=>{
      event.preventDefault();const name=editName.trim();if(!name)return;
      setState(current=>{const st=current.study||initialStudy();return {...current,study:{...st,sessions:st.sessions.map(s=>s.id===session.id?{...s,customName:name,label:name}:s)}}});setRenaming(false);
    }}><input aria-label="Test name" autoFocus required maxLength={60} value={editName} onChange={e=>setEditName(e.target.value)}/><button className="secondary-button" disabled={busy}>Save</button><button type="button" aria-label="Cancel rename" onClick={()=>setRenaming(false)}><X size={16}/></button></form> : <button className="test-rename-button" disabled={busy} onClick={()=>{setEditName(testName(session,sessions.indexOf(session)));setRenaming(true);}}><Pencil size={14}/>Rename test</button>}</div>
    <div className="student-body"><nav className="student-tabs" aria-label="Evaluation views">{[['focus','Focused evaluation'],['detail','Detailed evaluation'],['pipeline','Pipeline execution'],['replay','VR replay']].map(([id,label])=><button key={id} disabled={busy && id!=='pipeline'} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
      <div className="student-view">
        {example && <section className="study-example-assets"><strong>Bundled example · Script {session.scriptId.toUpperCase()}</strong><p>{example.audio.originalName} · {(example.audio.durationMs/1000).toFixed(2)} seconds</p><RecordingPreview key={session.id} file={runtimeAudio.get(session.id)} fallback={workflow.draft.audio?.name===example.audio.name?example.audio.url:null}/><p><a href={example.audio.url} download>Download example audio</a> · <a href={example.traceUrl} download>Download simulated VR trace</a></p><small>VR motion is simulated, not measured from this speaker. Transcript is the supplied reading script, not a verified verbatim transcription.</small></section>}
        {busy && <p role="status">Evaluation is running. Keep this student and test selected until it finishes.</p>}
        {tab==='pipeline' && (audioLoading?<p role="status">Loading recording…</p>:<Workflow key={session.id} state={{...state,workflow}} setState={updateSession} notify={notify}/>)}
        {tab==='replay' && <VRPlayback key={session.id} trace={workflow.draft.vrTrace} transcript={workflow.draft.transcript} segments={workflow.results?.timestampAlignment?.official_transcript_segments} saved={session.playback} onSave={playback=>setState(current=>{const st=current.study||initialStudy();return {...current,study:{...st,sessions:st.sessions.map(s=>s.id===session.id?{...s,playback}:s)}};})}/>}
        {['focus','detail'].includes(tab) && !runs.length && <div className="empty-state"><h3>No evaluation yet</h3><p>Upload the recording and run agents in Pipeline execution.</p><button className="primary-button" onClick={()=>setTab('pipeline')}>Open pipeline</button></div>}
        {tab==='focus' && runs.length>0 && <Focused key={session.id} history={runs} onPrint={onPrint} onOpenHistory={()=>setTab('detail')}/>}
        {tab==='detail' && runs.length>0 && <History key={session.id} history={runs}/>}
      </div>
    </div>
  </div>;
}
