import React, { useMemo, useRef, useState } from 'react';
import { selectFocusedFeedback, evidenceText, actionText, SELECTOR_VERSION, SELECTION_STORAGE_KEY } from './focused-feedback';
import './focused-feedback.css';

export default function FocusedFeedback({ history, onOpenHistory, onPrint }) {
  const runs = useMemo(() => [...history].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)), [history]);
  const [runId, setRunId] = useState(null);
  const [overrides, setOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY)) || {}; } catch { return {}; }
  });
  const [storageError, setStorageError] = useState('');
  const printRef = useRef(null);
  const run = runs.find(r => r.id === runId) || runs[0];
  const feedback = useMemo(() => run ? selectFocusedFeedback(run, overrides[run.id]) : null, [run, overrides]);
  function choose(route, ref) {
    const previous = overrides[run.id]?.version === SELECTOR_VERSION ? overrides[run.id].selections : {};
    const next = { ...overrides, [run.id]: { version: SELECTOR_VERSION, selections: { ...previous, [route]: ref } } };
    setOverrides(next);
    try { localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(next)); setStorageError(''); }
    catch { setStorageError('Selection changed for this visit, but browser storage could not save it.'); }
  }
  if (!run) return <div className="empty-state"><h2>No saved evaluation yet</h2><p>Complete an evaluation to see three focused priorities.</p></div>;
  const dataset = run.integratedOutput?.datasetSnapshot || {};
  return <div className="focused-page">
    <div className="focused-toolbar">
      <label>Saved evaluation<select aria-label="Saved evaluation" value={run.id} onChange={e => setRunId(e.target.value)}>{runs.map(r => <option key={r.id} value={r.id}>{r.session?.title || 'Untitled presentation'} · {new Date(r.completedAt).toLocaleString()}</option>)}</select></label>
      <button className="secondary-button" onClick={() => onOpenHistory(run.id)}>View full evaluation</button>
      <button className="primary-button" onClick={() => onPrint(printRef.current, `${run.session?.title || 'Presentation'} - Focused Feedback`)}>Print / PDF</button>
    </div>
    {storageError && <p role="alert">{storageError}</p>}
    <div ref={printRef} className="focused-report" key={run.id}>
      <header className="focused-intro"><span className="eyebrow">Your next rehearsal</span><h2>{run.session?.title || 'Untitled presentation'}</h2><p>{run.session?.taskType} · {run.session?.audience} · {new Date(run.completedAt).toLocaleString()}</p><p>One priority for content. Two for delivery. Work through them at your own pace.</p></header>
      <details className="focused-source"><summary>Original task & transcript</summary>{dataset.taskBrief && <p>{dataset.taskBrief}</p>}<p>{dataset.transcript || 'The original transcript was not stored with this run.'}</p></details>
      {feedback.strength && <aside className="focused-strength"><span>Keep doing this</span><p>{feedback.strength.title}</p><details><summary>See the evidence</summary><blockquote>{evidenceText(feedback.strength)}</blockquote></details></aside>}
      {feedback.sections.map((section, index) => {
        const finding = section.selected?.finding;
        const evidence = finding ? evidenceText(finding) : '';
        const revisions = Array.isArray(finding?.revisionOptions) ? finding.revisionOptions : [];
        const practice = finding?.practice?.instruction;
        const success = finding?.practice?.successCriterion || finding?.successCriterion;
        return <section className={`focused-section focused-${section.id}`} key={section.id}>
          <header><span className="focused-number">0{index + 1}</span><div><span className="eyebrow">{index === 0 ? 'Content' : 'Delivery'}</span><h3>{section.title}</h3></div></header>
          {finding ? <>
            <h4>{finding.title}</h4>
            <div className="focused-evidence"><span>{section.source}</span><blockquote>{evidence.length > 280 ? `${evidence.slice(0, 277)}…` : evidence}</blockquote></div>
            <div className="focused-action"><strong>Try this next</strong><p>{actionText(finding)}</p></div>
            <details className="focused-practice"><summary>Example & practice</summary>
              {(finding.taskImpact || finding.why || finding.diagnosis) && <p>{finding.taskImpact || finding.why || finding.diagnosis}</p>}
              {evidence.length > 280 && <><h5>Full evidence</h5><blockquote>{evidence}</blockquote></>}
              {revisions.length > 0 && <><h5>Revision examples</h5><ul>{revisions.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
              {practice && <><h5>Practice</h5><p>{practice}</p></>}
              {success && <><h5>Success criterion</h5><p>{success}</p></>}
              {!revisions.length && !practice && !success && <p className="focused-note">No additional example or practice criterion was saved. Use the action above.</p>}
            </details>
          </> : <div className="focused-empty"><h4>No supported priority available</h4><p>{section.reason}</p></div>}
          <details className="focused-tutor" data-no-print><summary>Tutor selection</summary><p>{section.reason}</p>{section.candidates.length > 0 && <><label>Priority for {section.title}<select aria-label={`Priority for ${section.title}`} value={section.selected.ref} onChange={e => choose(section.id, e.target.value)}>{section.candidates.map(c => <option key={c.ref} value={c.ref}>{c.finding.title}</option>)}</select></label><button className="secondary-button" disabled={!section.manual} onClick={() => choose(section.id, null)}>Reset to automatic</button></>}</details>
        </section>;
      })}
    </div>
  </div>;
}
