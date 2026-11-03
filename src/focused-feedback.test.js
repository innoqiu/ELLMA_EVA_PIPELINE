import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectFocusedFeedback, SELECTOR_VERSION } from './focused-feedback.js';
const history = JSON.parse(fs.readFileSync(new URL('./data/recovered-history.json', import.meta.url)));
const issue = (extra = {}) => ({ title: 'Missing signposts', kind: 'improvement', confidence: 'High', evidence: 'The results show', action: 'Add a transition.', impact: 2, ...extra });
test('all recovered runs are stable and unchanged; legacy strengths are separated', () => {
  const before = JSON.stringify(history);
  for (const run of history) {
    assert.deepEqual(selectFocusedFeedback(run), selectFocusedFeedback(run));
    const selected = selectFocusedFeedback(run).sections.filter(s => s.selected);
    assert.equal(new Set(selected.map(s => s.selected.ref)).size, selected.length);
  }
  assert.equal(JSON.stringify(history), before);
  assert.match(selectFocusedFeedback(history[0]).strength.title, /Engaging opening/);
});
test('impact outranks preference; preference breaks ties; low and ambiguous excluded', () => {
  const run = { integratedOutput: { findings: [issue(), issue({ title: 'Grammar error', impact: 3 }), issue({ title: 'Missing evidence', confidence: 'Low' }), issue({ title: 'Opening', kind: 'unknown' })] } };
  assert.equal(selectFocusedFeedback(run).sections[0].selected.finding.title, 'Grammar error');
  run.integratedOutput.findings[1].impact = 2;
  assert.equal(selectFocusedFeedback(run).sections[0].selected.finding.title, 'Missing signposts');
  assert.equal(selectFocusedFeedback(run).sections[0].candidates.length, 2);
});
test('speech preference, overrides, stale references and versions', () => {
  const run = { agentOutputs: [{ areaId: 'pronunciation', findings: [issue({ title: 'Sentence stress' }), issue({ title: 'Intelligibility' })] }] };
  const section = selectFocusedFeedback(run).sections[2];
  assert.equal(section.selected.finding.title, 'Intelligibility');
  const override = { version: SELECTOR_VERSION, selections: { speech: section.candidates[1].ref } };
  assert.equal(selectFocusedFeedback(run, JSON.parse(JSON.stringify(override))).sections[2].selected.finding.title, 'Sentence stress');
  assert.equal(selectFocusedFeedback(run, { ...override, version: -1 }).sections[2].manual, false);
  assert.equal(selectFocusedFeedback(run, { version: SELECTOR_VERSION, selections: { speech: 'deleted' } }).sections[2].manual, false);
});
test('missing, failed, insufficient and low evidence never fabricate priorities', () => {
  const result = selectFocusedFeedback({ integratedOutput: { audioStatus: 'file-unavailable', audioStatusMessage: 'Re-upload audio.', findings: [issue({ confidence: 'Low' }), issue({ status: 'insufficient_evidence' }), issue({ evidence: '' })] } });
  assert.ok(result.sections.every(s => s.selected === null));
  assert.match(result.sections[2].reason, /Re-upload audio/);
  assert.equal(selectFocusedFeedback({}).sections.length, 3);
});
