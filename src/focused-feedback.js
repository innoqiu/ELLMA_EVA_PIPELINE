export const SELECTOR_VERSION = 1;
export const SELECTION_STORAGE_KEY = 'ellma-focused-selections-v1';
export const ROUTES = [
  { id: 'text', title: 'Content & Language', source: 'Transcript evidence' },
  { id: 'vr', title: 'Physical Delivery', source: 'VR trace evidence' },
  { id: 'speech', title: 'Speech Delivery', source: 'Audio evidence' },
];
export const evidenceText = f => Array.isArray(f.evidence)
  ? f.evidence.map(e => typeof e === 'string' ? e : e.quote || e.timestamp || '').filter(Boolean).join(' … ')
  : typeof f.evidence === 'string' ? f.evidence : f.evidenceText || '';
export const actionText = f => f.action || f.practice?.instruction || '';
const confidence = f => f.confidence?.level || f.confidenceDetail?.level || f.confidence;
const strengthPattern = /engaging opening effectively|strong memorable|effective pause|effective opening|clear and effective|successful|well[- ]placed/;
const issuePattern = /missing|unhedged|overloaded|overly long|too broad|unnatural|repeated|weakens|reduces?|obscures?|blurs?|narrows?|risks?|imprecise|mixed past|not signposted|no verbal|locked|sparse|repetitive|concentrated|never reaches|error|disrupt|imbalance|lack|mumbled|flat|misplac|self-repair|hesitation|monoton|limited|insufficient/;
export function findingKind(f) {
  if (f.kind) return f.kind;
  if (f.status === 'observed_strength') return 'strength';
  if (f.status === 'observed_issue') return 'improvement';
  const title = (f.title || '').toLowerCase();
  if (strengthPattern.test(title)) return 'strength';
  // Legacy neutral headings (e.g. Intelligibility) need explicit diagnostic evidence.
  if (issuePattern.test(title) || issuePattern.test((f.why || f.diagnosis || f.taskImpact || '').toLowerCase())) return 'improvement';
  return 'unknown';
}
function reference(route, f) {
  return `${route}:${f.findingId || JSON.stringify([f.areaId || f.area || '', f.title || '', evidenceText(f)])}`;
}
function preferred(route, f) {
  const label = `${f.focusId || ''} ${f.focus || ''} ${f.area || ''} ${f.title || ''}`.toLowerCase();
  return route === 'text' ? /signpost|organisation|organization|transition|idea.progression/.test(label)
    : route === 'speech' ? /intelligib/.test(label) : false;
}
function unavailable(run, route) {
  const result = run.integratedOutput || {};
  const status = route === 'vr' ? result.vrStatus : route === 'speech' ? result.audioStatus : '';
  if (/fail|error|unavailable|missing|not.configured|skipped|no.audio|no.vr/.test(status || '')) {
    return `${route === 'speech' ? 'Speech' : 'VR'} was not assessed successfully. ${route === 'speech' ? result.audioStatusMessage || '' : result.vrStatusMessage || ''}`;
  }
  return 'No supported priority available. This does not establish mastery; evidence may be missing or inconclusive.';
}
export function selectFocusedFeedback(run, saved = {}) {
  const integrated = run.integratedOutput || {};
  const agents = run.agentOutputs || [];
  const textOnly = f => !/embodied|fluency|pronunciation|prosody/i.test(`${f.areaId || ''} ${f.area || ''}`);
  const pools = {
    text: (integrated.findings || []).filter(textOnly),
    vr: agents.filter(a => a.areaId === 'embodied').flatMap(a => (a.findings || []).map(f => ({ ...f, areaId: a.areaId, area: f.area || a.areaName }))),
    speech: agents.filter(a => ['fluency', 'pronunciation'].includes(a.areaId)).flatMap(a => (a.findings || []).map(f => ({ ...f, areaId: a.areaId, area: f.area || a.areaName }))),
  };
  const overrides = saved.version === SELECTOR_VERSION ? saved.selections || {} : {};
  const sections = ROUTES.map(route => {
    const seen = new Set();
    const candidates = pools[route.id].map((finding, order) => ({ finding, order, ref: reference(route.id, finding) }))
      .filter(c => {
        const f = c.finding;
        if (seen.has(c.ref) || findingKind(f) !== 'improvement' || f.status === 'insufficient_evidence' || !['High', 'Medium'].includes(confidence(f)) || !evidenceText(f).trim() || !actionText(f).trim()) return false;
        seen.add(c.ref); return true;
      }).sort((a, b) => {
        const impact = f => Math.max(1, Math.min(3, Number(f.impact) || 2));
        return impact(b.finding) - impact(a.finding)
          || Number(preferred(route.id, b.finding)) - Number(preferred(route.id, a.finding))
          || Number(confidence(b.finding) === 'High') - Number(confidence(a.finding) === 'High')
          || (Number(b.finding.rankingScore) || 0) - (Number(a.finding.rankingScore) || 0) || a.order - b.order;
      });
    const manual = candidates.find(c => c.ref === overrides[route.id]);
    const selected = manual || candidates[0] || null;
    return { ...route, candidates, selected, manual: Boolean(manual), reason: selected
      ? `${manual ? 'Tutor selected this priority.' : 'Selected by impact, preferred focus, confidence, then saved ranking.'} ${preferred(route.id, selected.finding) ? 'Matches the preferred focus for this section.' : 'Provides an alternative supported priority.'}`
      : unavailable(run, route.id) };
  });
  const strength = [...(integrated.strengths || []), ...(integrated.findings || [])].find(f => findingKind(f) === 'strength' && evidenceText(f).trim() && ['High', 'Medium'].includes(confidence(f))) || null;
  return { version: SELECTOR_VERSION, sections, strength };
}
