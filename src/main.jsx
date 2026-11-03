import React, { useEffect, useMemo, useRef, useState } from 'react';
import {bootstrapServer,serverConfig,initialServerState,persistServerState,modelHeaders} from './server-storage';
import { createRoot } from 'react-dom/client';
import PLED5001_COURSE_TEXT from './data/pled5001-course-syllabus.txt?raw';
import RECOVERED_HISTORY from './data/recovered-history.json';
import FocusedFeedback from './FocusedFeedback';
import StudentWorkspace from './StudentWorkspace';
import {saveStudyAudio} from './student-study';
import {
  Activity,
  AudioLines,
  Beaker,
  Blocks,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Cpu,
  Database,
  Download,
  Clock3,
  Eye,
  EyeOff,
  FileAudio,
  FileDown,
  FileJson,
  FileOutput,
  FileText,
  Film,
  Gauge,
  GitMerge,
  Hand,
  HelpCircle,
  Headphones,
  KeyRound,
  ListChecks,
  LoaderCircle,
  MessageCircleMore,
  Mic2,
  Network,
  PanelLeftClose,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Server,
  Settings2,
  SlidersHorizontal,
  ScanEye,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  UserRound,
  Video,
  Volume2,
  WandSparkles,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'ellma-eval-studio-v1';
const BAILIAN_BASE_URL = 'https://ws-rhbwplzh9c62oiua.cn-beijing.maas.aliyuncs.com/compatible-mode/v1';
const BAILIAN_OMNI_MODEL = 'qwen3.5-omni-plus';

const DEFAULT_CONFIG = {
  text: {
    provider: 'mock',
    baseUrl: 'mock://local-text',
    apiKey: '',
    model: 'ELLMA Text Evaluator',
  },
  multimodal: {
    provider: 'mock',
    baseUrl: 'mock://local-multimodal',
    apiKey: '',
    model: 'ELLMA Multimodal Evaluator',
  },
};

const ATTENTION_AREAS = [
  {
    id: 'grammar',
    code: 'A1',
    name: 'Grammar & Syntax',
    short: 'Accuracy and control at sentence level.',
    description: 'Find patterns that affect clarity, not isolated slips.',
    icon: Blocks,
    tint: 'blue',
    focus: ['Sentence control', 'Tense & aspect', 'Agreement', 'Articles', 'Complexity with accuracy'],
    needs: ['transcript'],
    kind: 'core',
  },
  {
    id: 'lexical',
    code: 'A2',
    name: 'Lexical Resource',
    short: 'Range, precision, repetition and phrase choice.',
    description: 'Flags repeated frames and offers contextual alternatives.',
    icon: BookOpen,
    tint: 'violet',
    focus: ['Repeated wording', 'Word precision', 'Collocation', 'Academic phraseology', 'Paraphrase range'],
    needs: ['transcript'],
    kind: 'core',
  },
  {
    id: 'pragmatic',
    code: 'A3',
    name: 'Pragmatic Precision',
    short: 'Language choices fit purpose, audience and stance.',
    description: 'Checks whether claims sound suitably careful and credible.',
    icon: Target,
    tint: 'amber',
    focus: ['Hedging', 'Strength of claims', 'Register', 'Audience fit', 'Politeness & stance'],
    needs: ['transcript', 'context'],
    kind: 'core',
  },
  {
    id: 'discourse',
    code: 'A4',
    name: 'Discourse & Task',
    short: 'Ideas connect and fulfil the communication goal.',
    description: 'Looks across the whole performance for structure and focus.',
    icon: Network,
    tint: 'cyan',
    focus: ['Opening & framing', 'Idea progression', 'Signposting', 'Evidence integration', 'Closing & task fulfilment'],
    needs: ['transcript', 'task'],
    kind: 'core',
  },
  {
    id: 'fluency',
    code: 'A5',
    name: 'Fluency & Timing',
    short: 'Flow, pausing, repair and temporal control.',
    description: 'Uses audio timing where available; transcript gives limited evidence.',
    icon: Activity,
    tint: 'green',
    focus: ['Pause placement', 'Hesitation', 'Self-repair', 'Speech rate', 'Time allocation'],
    needs: ['transcript', 'audio'],
    kind: 'core',
  },
  {
    id: 'pronunciation',
    code: 'A6',
    name: 'Pronunciation & Prosody',
    short: 'Intelligibility, stress, rhythm and intonation.',
    description: 'Audio is critical; the system will not infer sound from text.',
    icon: AudioLines,
    tint: 'rose',
    focus: ['Intelligibility', 'Word stress', 'Sentence stress', 'Rhythm', 'Intonation & emphasis'],
    needs: ['audio'],
    kind: 'core',
  },
  {
    id: 'interaction',
    code: 'M1',
    name: 'Interactional Competence',
    short: 'Turn management and responsive communication.',
    description: 'Conditional module for dialogue, interview or Q&A tasks.',
    icon: MessageCircleMore,
    tint: 'indigo',
    focus: ['Response relevance', 'Turn-taking', 'Clarification', 'Repair with others', 'Topic maintenance'],
    needs: ['transcript', 'turns'],
    kind: 'conditional',
  },
  {
    id: 'embodied',
    code: 'M2',
    name: 'Embodied Communication',
    short: 'Visible delivery and use of the virtual space.',
    description: 'Conditional module for performances with a validated VR trace.',
    icon: Video,
    tint: 'orange',
    focus: ['Audience orientation', 'Gesture support', 'Body openness', 'Gaze distribution', 'Slide & space interaction'],
    needs: ['vr_trace'],
    kind: 'conditional',
  },
];

const FOCUS_DESCRIPTIONS = {
  grammar: {
    'Sentence control': 'Complete, controlled sentence structures that remain easy to follow in speech.',
    'Tense & aspect': 'Consistent choices for time, duration and completion across the talk.',
    Agreement: 'Accurate subject–verb and noun–determiner agreement.',
    Articles: 'Appropriate use of a, an, the and zero article.',
    'Complexity with accuracy': 'Use of more complex structures without losing clarity or control.',
  },
  lexical: {
    'Repeated wording': 'Words or sentence frames repeated often enough to limit expression.',
    'Word precision': 'Vocabulary that communicates the intended meaning accurately.',
    Collocation: 'Words and phrases combined in natural, conventional ways.',
    'Academic phraseology': 'Phrase choices appropriate for explaining research and evidence.',
    'Paraphrase range': 'Ability to reformulate an idea when another expression would be clearer.',
  },
  pragmatic: {
    Hedging: 'Language that appropriately limits certainty, such as may, might or suggests.',
    'Strength of claims': 'Alignment between the force of a claim and the evidence supporting it.',
    Register: 'A level of formality suitable for the setting and communicative purpose.',
    'Audience fit': 'Language choices that match the audience’s knowledge and expectations.',
    'Politeness & stance': 'How respectfully and credibly the speaker positions their viewpoint.',
  },
  discourse: {
    'Opening & framing': 'An opening that establishes the topic, problem and reason to listen.',
    'Idea progression': 'Ideas arranged in a logical sequence that listeners can retain.',
    Signposting: 'Verbal cues that mark transitions, contrast, cause and conclusion.',
    'Evidence integration': 'Evidence introduced and connected clearly to the speaker’s claim.',
    'Closing & task fulfilment': 'A conclusion that completes the assigned purpose and key message.',
  },
  fluency: {
    'Pause placement': 'Pauses that support meaning rather than interrupt important phrases.',
    Hesitation: 'Frequency and location of hesitation that affects speaking flow.',
    'Self-repair': 'How efficiently the speaker corrects or reformulates an utterance.',
    'Speech rate': 'A pace that remains intelligible and appropriate for the audience.',
    'Time allocation': 'Balanced use of available time across the stages of the task.',
  },
  pronunciation: {
    Intelligibility: 'How easily listeners can understand the spoken message.',
    'Word stress': 'Stress placed on the appropriate syllable within individual words.',
    'Sentence stress': 'Prominence used to make key information stand out in a sentence.',
    Rhythm: 'Timing and grouping that help listeners process connected speech.',
    'Intonation & emphasis': 'Pitch movement and emphasis used to communicate meaning and stance.',
  },
  interaction: {
    'Response relevance': 'Responses that address what the other speaker has said or asked.',
    'Turn-taking': 'Entering, holding and yielding the floor at appropriate moments.',
    Clarification: 'Recognising uncertainty and asking for information when needed.',
    'Repair with others': 'Resolving a communication problem collaboratively.',
    'Topic maintenance': 'Sustaining and developing the shared topic across turns.',
  },
  embodied: {
    'Audience orientation': 'Body and head orientation that maintains connection with listeners.',
    'Gesture support': 'Gestures that clarify, locate or emphasise spoken meaning.',
    'Body openness': 'Posture that remains visible and accessible to the audience.',
    'Gaze distribution': 'Visual attention distributed across relevant audience positions.',
    'Slide & space interaction': 'Coordinated use of the slide and virtual presentation space.',
  },
};

const DEFAULT_SELECTED_FOCUS = Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, [...area.focus]]));
const DEFAULT_CUSTOM_FOCUS = Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, []]));
const DEFAULT_ATTENTION_WEIGHTS = Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, 3]));
const HISTORY_LIMIT = 50;
const EVALUATION_PROMPT_VERSION = 'focus-audit-2026-09-v1';
const COURSE_ALIGNMENT_PROMPT_VERSION = 'course-alignment-2026-09-v1';
const TEXT_SAMPLING_CONFIG = { temperature: 0 };
const EXPERIMENT_TEXT_AREAS = ['grammar', 'lexical', 'pragmatic', 'discourse'];
const EXPERIMENT_STRUCTURED_AREAS = [...EXPERIMENT_TEXT_AREAS, 'embodied'];
const EXPERIMENT_AUDIO_AREAS = ['fluency', 'pronunciation'];
const EXPERIMENT_AGENT_AREAS = [...EXPERIMENT_STRUCTURED_AREAS, ...EXPERIMENT_AUDIO_AREAS];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function stableHash(value) {
  const input = typeof value === 'string' ? value : stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function slugify(value) {
  return String(value || 'unspecified').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unspecified';
}

function focusIdentifier(areaId, focus) {
  return `${areaId}.${slugify(focus?.id || focus?.title || focus)}`;
}

function confidenceLevel(finding) {
  const value = finding?.confidence?.level || finding?.confidenceDetail?.level || finding?.confidence || 'Medium';
  return ['High', 'Medium', 'Low'].includes(value) ? value : 'Medium';
}

function findingEvidenceItems(finding) {
  if (Array.isArray(finding?.evidence)) return finding.evidence.map((item) => typeof item === 'string' ? { quote: item } : item).filter((item) => item?.quote || Number.isFinite(Number(item?.sentenceIndex)));
  if (finding?.evidence) return [{ quote: String(finding.evidence) }];
  return [];
}

function findingEvidenceText(finding) {
  const quotes = findingEvidenceItems(finding).map((item) => item.quote).filter(Boolean);
  return quotes.join(' … ') || finding?.evidenceText || 'No evidence text returned.';
}

function findingImpactText(finding) {
  return finding?.taskImpact || finding?.why || finding?.diagnosis || 'No task impact was returned.';
}

function findingActionText(finding) {
  return finding?.practice?.instruction || finding?.action || 'No rehearsal action was returned.';
}

function findingSuccessText(finding) {
  return finding?.practice?.successCriterion || finding?.successCriterion || '';
}

function buildCourseSourceSignature(draft, documents, promptOverrides = {}) {
  return stableHash({
    promptVersion: COURSE_ALIGNMENT_PROMPT_VERSION,
    task: {
      title: draft?.title || '',
      topic: draft?.topic || '',
      audience: draft?.audience || '',
      level: draft?.level || '',
      taskBrief: draft?.taskBrief || '',
    },
    documents: (documents || []).filter((document) => ['course', 'rubric', 'task'].includes(document.role)).map((document) => ({
      name: document.name,
      role: document.role,
      text: document.text,
    })),
    prompts: { course_agent_1: promptOverrides.course_agent_1 || null, course_agent_2: promptOverrides.course_agent_2 || null },
  });
}

const ATTENTION_OUTPUT_CONTRACT = 'Return only JSON using this schema: {"focusAudits":[{"focusId":"exact supplied id","status":"observed_issue|observed_strength|not_salient|insufficient_evidence","summary":"..."}],"findings":[{"focusId":"exact supplied id","phenomenonCode":"stable_snake_case_code","kind":"improvement|strength","area":"...","title":"...","evidence":[{"quote":"exact source substring","sentenceIndex":0}],"occurrenceCount":1,"diagnosis":"...","taskImpact":"...","revisionOptions":["...","..."],"practice":{"instruction":"...","successCriterion":"..."},"confidence":{"level":"High|Medium|Low","reason":"..."},"impact":1,"courseGuidelineIds":["..."]}]}. impact is an integer 1–3.';
const INTEGRATION_OUTPUT_CONTRACT = 'Return only JSON {"clusterSummaries":[{"clusterId":"existing id","summary":"one concise sentence"}],"verbalFeedback":"...","nextRun":{"title":"...","instruction":"...","success":"..."}}. Do not return or alter findings.';
const COURSE_AGENT_1_CONTRACT = 'Return only JSON {"courseTitle":"...","ilos":[{"id":"ILO1","text":"...","relevance":"primary|supporting","reason":"..."}],"guidelines":[{"id":"...","title":"...","description":"...","iloId":"...","relevance":"primary|supporting","sourceQuote":"...","sourceDocument":"..."}]}.';
const COURSE_AGENT_2_CONTRACT = 'Return only JSON {"guidelines":[{"id":"existing-guideline-id","areaId":"existing-area-id","focus":"exact catalog focus","iloBoost":0|0.5|1}]}.';
const TIMESTAMP_OUTPUT_CONTRACT = 'Return only JSON {"segments":[{"start_ms":0,"end_ms":0,"text":"...","confidence":"High|Medium|Low"}],"detected_language":"..."}.';
const AUDIO_OUTPUT_CONTRACT = 'Return only JSON {"findings":[{"area":"Fluency & Timing|Pronunciation & Prosody","title":"...","evidence":"...","why":"...","action":"...","confidence":"High|Medium|Low","priority":"high|medium|low","courseGuidelineIds":["..."]}]}, maximum four findings.';

function promptOverride(state, agentId, fallback) {
  if (!Object.prototype.hasOwnProperty.call(state?.promptOverrides || {}, agentId)) return fallback;
  const override = state.promptOverrides[agentId];
  return typeof override === 'string' ? override.trim() : fallback;
}

function defaultAttentionPrompt(area, alignmentPolicy = '') {
  return `ROLE: You are one independent ${area.name} language-coaching attention agent. PROMPT_VERSION: ${EVALUATION_PROMPT_VERSION}.
SCOPE: Inspect every supplied active focus, in the supplied order, and nothing outside this area. If approved course guidelines are supplied, use only the guidelines assigned to this agent.
AUDIT FIRST: Return exactly one focusAudits entry for every active focus. Allowed status values are observed_issue, observed_strength, not_salient, and insufficient_evidence. Never skip a focus. Do not create a finding merely to fill a quota.
DETECTION PROCEDURE: (1) locate the phenomenon and all relevant occurrences; (2) count or characterize its scope; (3) cite exact evidence; (4) judge task impact; (5) only then write coaching.
EVIDENCE POLICY: Transcript findings must use exact transcript substrings and zero-based sentenceIndex values. Every claim must cite evidence or an explicit limitation. Do not infer sound from transcript or file metadata. Structured coordinates, gaze targets and gesture events are valid numeric evidence.${alignmentPolicy}
COURSE POLICY: Course relevance may affect taskImpact, but cannot rescue weak evidence or change confidence.
RICH COACHING: For each improvement provide a diagnosis, task-specific impact, at least two usable revisionOptions, one rehearsal instruction, and one observable successCriterion. A strength explains what should be preserved. Each focus may return at most one primary improvement and one strength.
CONFIDENCE: High requires direct repeated or unambiguous evidence; Medium requires direct but limited evidence; Low means the evidence is incomplete and must explain why.`;
}

const DEFAULT_EDITABLE_PROMPTS = {
  course_agent_1: 'You are Course Alignment Agent 1. Extract only course requirements supported by the supplied documents, select ILOs relevant to the current task, and produce concise observable guidelines. The learner transcript and performance are deliberately withheld. Do not grade the learner and do not invent missing course policy.',
  course_agent_2: 'You are Course Alignment Agent 2. Route each supplied course guideline to exactly one best-fit attention area and focus. Assign a bounded course relevance boost: 1 for primary, 0.5 for supporting, 0 otherwise. Never sum multiple ILO boosts and never change the underlying base weight.',
  integration: `You are the learner-facing feedback writer for Chain 1. PROMPT_VERSION: ${EVALUATION_PROMPT_VERSION}. The evidence, retention, clustering, scores, and order have already been decided deterministically. Do not add, remove, merge, rerank, reinterpret, or rewrite any finding. Use only the supplied content.`,
  timestamp_transcription: 'You are a conservative timestamped speech transcription engine. Preserve repetitions, filled pauses and self-repairs. Use milliseconds relative to the beginning of the audio and do not improve grammar or paraphrase.',
  direct_audio: 'You are a conservative direct multimodal spoken-language evaluator. Evaluate only the supplied Fluency & Timing and Pronunciation & Prosody focuses. Acoustic claims must come from audio evidence; do not convert transcript grammar into pronunciation claims.',
};

const DEFAULT_EXPERIMENT_DATASETS = [
  {
    id: '3mt-heat-01',
    label: 'Dataset 01',
    title: 'Heat Has a Postcode',
    learner: 'Learner A',
    topic: 'Urban heat inequality',
    audience: 'General public',
    level: 'B2–C1',
    taskBrief: 'Explain how street-level temperature mapping reveals unequal heat exposure, why the result matters, and what decision the research could inform.',
    transcript: 'Good afternoon. I think heat is usually described as a city-wide problem. I think this hides an important fact: heat changes from one street to the next. My research combines satellite images with temperature sensors carried by local volunteers. We mapped twelve neighbourhoods during three summer heatwaves. The results show that two streets only five hundred metres apart can differ by six degrees. I think people should understand that this is not simply uncomfortable weather. Older residents and outdoor workers face greater health risks in the hottest streets. I think city planners should use our evidence to place trees, shade and cooling centres where exposure is highest. The map makes invisible inequality visible. Heat has a postcode, and local climate adaptation should begin with the people living in the hottest one.',
    designedSignals: ['Repeated “I think” frame', 'Strong recommendation language', 'Clear result and closing'],
    downloadUrl: '/mock-data/3mt-heat-01.json',
    transcriptUrl: '/mock-data/3mt-heat-01.txt',
    vrTraceUrl: '/mock-data/3mt-heat-01-vr-trace.json',
    vrTrace: createMockVrTrace('3mt-heat-01', 'screen-heavy'),
    vrTraceSummary: validateVrTrace(createMockVrTrace('3mt-heat-01', 'screen-heavy')).summary,
    vrTraceFile: null,
    importedFile: null,
    audio: null,
  },
  {
    id: '3mt-ocean-02',
    label: 'Dataset 02',
    title: 'The Plastic We Cannot See',
    learner: 'Learner B',
    topic: 'Microplastic transport in coastal water',
    audience: 'General public',
    level: 'B2–C1',
    taskBrief: 'Introduce the research problem, explain the sampling method without excessive technical detail, state the contribution, and end with a memorable public-facing message.',
    transcript: 'Imagine standing on a clean beach while millions of plastic particles move through the water in front of you. My research follows these particles after storms. Working with three coastal communities, I collect water at river mouths, shallow bays and offshore sites, and because each sample is filtered, chemically identified and compared with rainfall, tide direction, drainage flow and the shape of the coastline, the study can show how several environmental forces combine to move pollution through a connected coastal system that cannot be understood from a single sampling point. We found that the largest pulse arrives within twenty-four hours of heavy rain. The particles then remain trapped in sheltered bays for several days. Current monitoring often samples too late and in the wrong place. Our mobile sampling design captures the short window when pollution is most concentrated. Cleaner-looking water is not necessarily cleaner water. To protect the coast, we need to measure plastic when it moves, not only where it finally settles.',
    designedSignals: ['High clause load', 'Method-heavy middle section', 'Contribution stated late'],
    downloadUrl: '/mock-data/3mt-ocean-02.json',
    transcriptUrl: '/mock-data/3mt-ocean-02.txt',
    vrTraceUrl: '/mock-data/3mt-ocean-02-vr-trace.json',
    vrTrace: createMockVrTrace('3mt-ocean-02', 'fixed-centre'),
    vrTraceSummary: validateVrTrace(createMockVrTrace('3mt-ocean-02', 'fixed-centre')).summary,
    vrTraceFile: null,
    importedFile: null,
    audio: null,
  },
  {
    id: '3mt-food-03',
    label: 'Dataset 03',
    title: 'A Second Life for Lunch',
    learner: 'Learner C',
    topic: 'Reducing university food waste',
    audience: 'General public',
    level: 'B2–C1',
    taskBrief: 'Explain the intervention and its evidence, avoid overstating what one university trial proves, and make the research contribution accessible to a non-specialist audience.',
    transcript: 'Every day our university throws away enough edible food to serve four hundred lunches. This is a waste problem, but this is also a communication problem. Students often do not know what food remains available or when dining halls will close. This is why my research tested a real-time surplus notification system. For eight weeks, dining staff posted the type and amount of food available before closing. Students received a message and could reserve a low-cost meal. This is simple, this is fast, and this is easy to scale. The trial reduced edible waste by thirty-two percent and helped staff record which meals were regularly overproduced. Universities must adopt this system because it will solve campus food waste. The important contribution is not only the app. It is the link between kitchen data and student decisions. A second life for lunch begins when the right information reaches the right person before food becomes waste.',
    designedSignals: ['Repeated “This is” frame', 'Overgeneralised final claim', 'Accessible contribution statement'],
    downloadUrl: '/mock-data/3mt-food-03.json',
    transcriptUrl: '/mock-data/3mt-food-03.txt',
    vrTraceUrl: '/mock-data/3mt-food-03-vr-trace.json',
    vrTrace: createMockVrTrace('3mt-food-03', 'balanced-active'),
    vrTraceSummary: validateVrTrace(createMockVrTrace('3mt-food-03', 'balanced-active')).summary,
    vrTraceFile: null,
    importedFile: null,
    audio: null,
  },
];

const DEFAULT_EXPERIMENT_SETUP = {
  schemaVersion: 2,
  name: '3MT text-only feedback comparison',
  modelRoute: 'configured-text',
  selectedDatasetIds: DEFAULT_EXPERIMENT_DATASETS.map((dataset) => dataset.id),
  selectedAreaIds: [...EXPERIMENT_AGENT_AREAS],
  attentionWeights: { grammar: 3, lexical: 4, pragmatic: 4, discourse: 5, embodied: 4, fluency: 3, pronunciation: 3 },
};
const DEFAULT_EXPERIMENT_COMPLETED_AT = '2026-08-11T08:00:00.000Z';
const DEFAULT_EXPERIMENT = {
  ...DEFAULT_EXPERIMENT_SETUP,
  datasets: DEFAULT_EXPERIMENT_DATASETS,
  feedbackByDataset: createBundledExperimentFeedback(DEFAULT_EXPERIMENT_DATASETS, DEFAULT_EXPERIMENT_SETUP),
  lastRunAt: DEFAULT_EXPERIMENT_COMPLETED_AT,
};

const DEFAULT_COURSE_DOCUMENT_TEXT = PLED5001_COURSE_TEXT.trim();

function workflowDraftFromDataset(dataset) {
  return {
    id: dataset?.id || 'new-dataset',
    title: dataset?.title || '',
    learner: dataset?.learner || '',
    topic: dataset?.topic || '',
    audience: dataset?.audience || 'General public',
    level: dataset?.level || 'B2–C1',
    taskBrief: dataset?.taskBrief || '',
    transcript: dataset?.transcript || '',
    vrTrace: dataset?.vrTrace || null,
    vrTraceSummary: dataset?.vrTraceSummary || null,
    vrTraceSource: dataset?.vrTrace ? 'built-in-dummy' : null,
    audio: null,
  };
}

const DEFAULT_COURSE_ALIGNMENT = {
  enabled: true,
  approvalRequired: true,
  status: 'idle',
  approved: false,
  courseTitle: '',
  ilos: [],
  guidelines: [],
  agent1RawResponse: null,
  agent2RawResponse: null,
  error: null,
  sourceSignature: null,
  promptVersion: COURSE_ALIGNMENT_PROMPT_VERSION,
  frozenAt: null,
};

const REAL_DATASET_ID = 'new-dataset';
const WORKFLOW_SLOT_OPTIONS = [
  { id: DEFAULT_EXPERIMENT_DATASETS[0].id, label: 'Test dataset 1' },
  { id: DEFAULT_EXPERIMENT_DATASETS[1].id, label: 'Test dataset 2' },
  { id: REAL_DATASET_ID, label: 'Real data' },
];
const WORKFLOW_RUNTIME_AUDIO_FILES = new Map();

function createWorkflowSlot(datasetId) {
  const dataset = DEFAULT_EXPERIMENT_DATASETS.slice(0, 2).find((item) => item.id === datasetId);
  return {
    draft: workflowDraftFromDataset(dataset),
    documents: dataset ? [{ id: `course-${datasetId}`, name: 'PLED5001 Course Syllabus.pdf', role: 'course', type: 'application/pdf', size: 0, text: DEFAULT_COURSE_DOCUMENT_TEXT, source: 'built-in-extracted-fixture', pageCount: 7 }] : [],
    baseWeights: { ...DEFAULT_EXPERIMENT_SETUP.attentionWeights },
    selectedAreaIds: [...EXPERIMENT_AGENT_AREAS],
    alignment: { ...DEFAULT_COURSE_ALIGNMENT },
    stage: 1,
    running: false,
    remoteRequest: null,
    agentStatuses: {},
    results: null,
    lastRunAt: null,
  };
}

function snapshotWorkflowSlot(workflow) {
  const { selectedDatasetId: _selectedDatasetId, slotCache: _slotCache, ...slot } = workflow;
  return { ...slot, running: false, remoteRequest: null };
}

function switchWorkflowSlot(workflow, nextDatasetId) {
  if (workflow.selectedDatasetId === nextDatasetId) return workflow;
  const slotCache = {
    ...(workflow.slotCache || {}),
    [workflow.selectedDatasetId]: snapshotWorkflowSlot(workflow),
  };
  const nextSlot = slotCache[nextDatasetId] || createWorkflowSlot(nextDatasetId);
  return {
    ...workflow,
    ...nextSlot,
    selectedDatasetId: nextDatasetId,
    selectedAreaIds: [...EXPERIMENT_AGENT_AREAS],
    running: false,
    remoteRequest: null,
    slotCache,
  };
}

const DEFAULT_WORKFLOW = {
  ...createWorkflowSlot(DEFAULT_EXPERIMENT_DATASETS[0].id),
  selectedDatasetId: DEFAULT_EXPERIMENT_DATASETS[0].id,
  slotCache: {},
};

function getFocusItems(state, area) {
  const builtIn = area.focus.map((title) => ({
    id: title,
    title,
    description: FOCUS_DESCRIPTIONS[area.id]?.[title] || area.description,
    custom: false,
  }));
  return [...builtIn, ...(state.customFocus?.[area.id] || [])];
}

function getEnabledFocusItems(state, area) {
  const selected = new Set(state.selectedFocus?.[area.id] || []);
  return getFocusItems(state, area).filter((focus) => selected.has(focus.id));
}

function isAreaRunnable(state, area) {
  return Boolean(state.enabled[area.id] && getEnabledFocusItems(state, area).length);
}

const DEFAULT_STATE = {
  focusSchemaVersion: 2,
  session: {
    slot: 'Run 01',
    title: '',
    learner: '',
    taskType: '3MT presentation',
    audience: 'General public',
    level: 'B2–C1',
    interactionMode: 'Monologue',
  },
  inputs: {
    transcript: null,
    task: null,
    audio: null,
    vrTrace: null,
    transcriptText: '',
    taskText: '',
    performanceMetrics: null,
    evidenceAvailability: null,
    vrTraceData: null,
    vrTraceSummary: null,
  },
  enabled: Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, area.kind === 'core'])),
  selectedFocus: DEFAULT_SELECTED_FOCUS,
  customFocus: DEFAULT_CUSTOM_FOCUS,
  attentionWeights: DEFAULT_ATTENTION_WEIGHTS,
  promptOverrides: {},
  config: DEFAULT_CONFIG,
  readiness: null,
  results: null,
  history: RECOVERED_HISTORY,
  experiment: DEFAULT_EXPERIMENT,
  workflow: DEFAULT_WORKFLOW,
};

function loadExperiment(storedExperiment) {
  if (!storedExperiment) return DEFAULT_EXPERIMENT;
  const savedDatasets = new Map((storedExperiment.datasets || []).map((dataset) => [dataset.id, dataset]));
  const datasets = DEFAULT_EXPERIMENT_DATASETS.map((dataset) => ({
    ...dataset,
    ...(savedDatasets.get(dataset.id) || {}),
    audio: savedDatasets.get(dataset.id)?.audio || null,
  }));
  const savedAreaIds = Array.isArray(storedExperiment.selectedAreaIds)
    ? storedExperiment.selectedAreaIds.filter((id) => EXPERIMENT_AGENT_AREAS.includes(id))
    : DEFAULT_EXPERIMENT.selectedAreaIds;
  const selectedAreaIds = storedExperiment.schemaVersion === 2
    ? savedAreaIds
    : [...new Set([...savedAreaIds, 'embodied', ...EXPERIMENT_AUDIO_AREAS])];
  return {
    ...DEFAULT_EXPERIMENT,
    ...storedExperiment,
    datasets,
    selectedDatasetIds: Array.isArray(storedExperiment.selectedDatasetIds) ? storedExperiment.selectedDatasetIds : DEFAULT_EXPERIMENT.selectedDatasetIds,
    schemaVersion: 2,
    selectedAreaIds,
    attentionWeights: { ...DEFAULT_EXPERIMENT.attentionWeights, ...storedExperiment.attentionWeights },
    feedbackByDataset: { ...DEFAULT_EXPERIMENT.feedbackByDataset, ...(storedExperiment.feedbackByDataset || {}) },
  };
}

function upgradeBuiltInCourseDocuments(documents) {
  if (!Array.isArray(documents)) return documents;
  return documents.map((document) => {
    const isLegacyFixture = String(document.id || '').startsWith('course-')
      && document.name === 'PLED5001 Course Syllabus.pdf'
      && (!document.size || document.source === 'built-in-extracted-fixture');
    return isLegacyFixture ? { ...document, text: DEFAULT_COURSE_DOCUMENT_TEXT, source: 'built-in-extracted-fixture', pageCount: 7 } : document;
  });
}

function upgradeWorkflowSlot(slot) {
  return slot ? { ...slot, documents: upgradeBuiltInCourseDocuments(slot.documents) } : slot;
}

function loadState() {
  try {
    const stored = serverConfig ? initialServerState : JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) return DEFAULT_STATE;
    const legacyConfig = stored.config || {};
    const config = legacyConfig.text
      ? {
          text: { ...DEFAULT_CONFIG.text, ...legacyConfig.text },
          multimodal: { ...DEFAULT_CONFIG.multimodal, ...legacyConfig.multimodal },
        }
      : {
          text: { ...DEFAULT_CONFIG.text, ...legacyConfig },
          multimodal: { ...DEFAULT_CONFIG.multimodal },
        };
    const legacyFocusSchema = stored.focusSchemaVersion !== 2;
    const selectedFocus = Object.fromEntries(ATTENTION_AREAS.map((area) => {
      const saved = stored.selectedFocus?.[area.id];
      if (!Array.isArray(saved)) return [area.id, [...area.focus]];
      if (legacyFocusSchema && saved.length === 0) return [area.id, [...area.focus]];
      return [area.id, saved];
    }));
    const customFocus = Object.fromEntries(ATTENTION_AREAS.map((area) => [
      area.id,
      Array.isArray(stored.customFocus?.[area.id]) ? stored.customFocus[area.id] : [],
    ]));
    return {
      ...DEFAULT_STATE,
      ...stored,
      focusSchemaVersion: 2,
      session: { ...DEFAULT_STATE.session, ...stored.session },
      inputs: { ...DEFAULT_STATE.inputs, ...stored.inputs },
      enabled: { ...DEFAULT_STATE.enabled, ...stored.enabled },
      selectedFocus,
      customFocus,
      attentionWeights: { ...DEFAULT_ATTENTION_WEIGHTS, ...stored.attentionWeights },
      promptOverrides: stored.promptOverrides && typeof stored.promptOverrides === 'object' ? stored.promptOverrides : {},
      history: Array.isArray(stored.history) && stored.history.length ? stored.history : RECOVERED_HISTORY,
      study: stored.study ? {...stored.study,sessions:(stored.study.sessions || []).map(s=>({...s,workflow:s.workflow?{...s.workflow,running:false,remoteRequest:null,alignment:{...s.workflow.alignment,status:['agent1-running','agent2-running'].includes(s.workflow.alignment?.status)?'idle':s.workflow.alignment?.status}}:null}))} : undefined,
      experiment: loadExperiment(stored.experiment),
      workflow: {
        ...DEFAULT_WORKFLOW,
        ...(stored.workflow || {}),
        draft: { ...DEFAULT_WORKFLOW.draft, ...(stored.workflow?.draft || {}) },
        baseWeights: { ...DEFAULT_WORKFLOW.baseWeights, ...(stored.workflow?.baseWeights || {}) },
        selectedAreaIds: [...EXPERIMENT_AGENT_AREAS],
        documents: upgradeBuiltInCourseDocuments(Array.isArray(stored.workflow?.documents) ? stored.workflow.documents : DEFAULT_WORKFLOW.documents),
        alignment: { ...DEFAULT_COURSE_ALIGNMENT, ...(stored.workflow?.alignment || {}) },
        running: false,
        remoteRequest: null,
        slotCache: Object.fromEntries(Object.entries(stored.workflow?.slotCache || {}).map(([slotId, slot]) => [slotId, upgradeWorkflowSlot(slot)])),
      },
      config,
    };
  } catch {
    if(serverConfig)throw Error('Saved server data could not be loaded. Restore the backup before continuing.');
    return DEFAULT_STATE;
  }
}

function App() {
  const [page, setPage] = useState('students');
  const [historyRunId, setHistoryRunId] = useState(null);
  const [state, setState] = useState(()=>{const loaded=loadState();return serverConfig?{...loaded,config:serverConfig}:loaded;});
  const [saveError,setSaveError]=useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if(serverConfig)persistServerState(state);
    else try{localStorage.setItem(STORAGE_KEY, JSON.stringify(state));}catch{setSaveError('Browser storage is full. Your latest changes have not been saved.');}
  }, [state]);
  useEffect(()=>{const handler=e=>setSaveError(e.detail);window.addEventListener('ellma-save-error',handler);return()=>window.removeEventListener('ellma-save-error',handler);},[]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message, type = 'info') => setToast({ message, type });
  const changeWorkflowSlot = (datasetId) => setState((current) => ({
    ...current,
    workflow: switchWorkflowSlot(current.workflow, datasetId),
  }));

  const nav = [
    { id: 'students', label: 'Students', icon: BookOpen },
    { id: 'input', label: 'Input', icon: UploadCloud },
    { id: 'prompts', label: 'Prompts', icon: Bot },
    { id: 'config', label: 'Config', icon: Settings2 },
    { id: 'history', label: 'History', icon: Clock3 },
    { id: 'focused', label: 'Focused Feedback', icon: ClipboardCheck },
  ];

  return (
    <div className="app-shell">
      {saveError && <div role="alert" style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,padding:16,background:'#fff1f1',color:'#991b1b'}}>{saveError}</div>}
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage('students')} aria-label="ELLMA home">
          <span className="brand-mark"><Sparkles size={18} /></span>
          <span><strong>ELLMA</strong><small>Evaluation Studio</small></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.id === 'input' && state.workflow.results && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <button className="nav-item subdued" onClick={() => notify('Help content is included as short hints throughout the interface.') }>
            <HelpCircle size={18} /><span>Help</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar state={state} page={page} onSlotChange={changeWorkflowSlot} />
        <div className="page-frame">
          {page === 'students' && <StudentWorkspace state={state} setState={setState} notify={notify} createSlot={createWorkflowSlot} runtimeAudio={WORKFLOW_RUNTIME_AUDIO_FILES} Workflow={WorkflowPage} Focused={FocusedFeedback} History={HistoryPage} onPrint={printElementAsPdf} validateTrace={validateVrTrace} />}
          {page === 'input' && <WorkflowPage state={state} setState={setState} notify={notify} />}
          {page === 'history' && <HistoryPage history={state.history} initialRunId={historyRunId} />}
          {page === 'focused' && <FocusedFeedback history={state.history} onPrint={printElementAsPdf} onOpenHistory={(id) => { setHistoryRunId(id); setPage('history'); }} />}
          {page === 'prompts' && <PromptStudioPage state={state} setState={setState} notify={notify} />}
          {page === 'config' && <ConfigPage state={state} setState={setState} notify={notify} />}
        </div>
      </main>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Topbar({ state, page, onSlotChange }) {
  const titles = {
    students: ['Student evaluations', ''],
    input: ['Evaluation workflow', 'Configure evidence, align course requirements, run agents, and inspect feedback in one place.'],
    prompts: ['Agent Prompt Studio', 'Inspect and tune the instruction layer used by every evaluation route.'],
    history: ['Run history', 'Review the latest saved pipeline, agent evidence, and decisions.'],
    focused: ['Focused Feedback', 'Three priorities for your next rehearsal: content, physical delivery, and speech.'],
    config: ['AI API configuration', 'Configure independent text and multimodal model endpoints.'],
  };
  const courseBusy = ['agent1-running', 'agent2-running'].includes(state.workflow.alignment.status);
  const slotBusy = state.workflow.running || courseBusy;
  return (
    <header className="topbar">
      <div>
        <h1>{titles[page][0]}</h1>
        {titles[page][1] && <p>{titles[page][1]}</p>}
      </div>
      <div className="topbar-actions">
        {page !== 'students' && <label className="slot-switcher"><span>Evaluation slot</span><select value={state.workflow.selectedDatasetId} disabled={slotBusy} onChange={(event) => onSlotChange(event.target.value)}>{WORKFLOW_SLOT_OPTIONS.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></label>}
      </div>
    </header>
  );
}

function clampWeight(value) {
  return Math.min(5, Math.max(1, Number(value) || 1));
}

function clampIloBoost(value) {
  const number = Number(value) || 0;
  return Math.min(1, Math.max(0, Math.round(number * 2) / 2));
}

function computeEffectiveWeights(baseWeights, guidelines) {
  const boosts = Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, 0]));
  (guidelines || []).forEach((guideline) => {
    if (boosts[guideline.areaId] === undefined) return;
    boosts[guideline.areaId] = Math.max(boosts[guideline.areaId], clampIloBoost(guideline.iloBoost));
  });
  return Object.fromEntries(ATTENTION_AREAS.map((area) => [
    area.id,
    Math.min(5, clampWeight(baseWeights[area.id] || 3) + boosts[area.id]),
  ]));
}

function inferDocumentRole(fileName) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.includes('transcript') || lower.includes('script')) return 'transcript';
  if (lower.includes('task') || lower.includes('brief')) return 'task';
  if (lower.includes('rubric') || lower.includes('criteria')) return 'rubric';
  return 'course';
}

async function extractDocumentText(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(' '));
    }
    const text = pages.join('\n\n').trim();
    if (!text) throw new Error('No selectable text was found. This PDF may be scanned and needs OCR before upload.');
    return { text, pageCount: pdf.numPages };
  }
  const text = await file.text();
  if (!text.trim()) throw new Error('The uploaded document is empty.');
  return { text };
}

function buildMockCourseAlignmentAgent1(draft, documents) {
  const courseText = documents.filter((document) => document.role === 'course' || document.role === 'rubric').map((document) => document.text).join('\n');
  const hasPled = /PLED5001|persuasive research argument|non-specialist audiences/i.test(courseText);
  const ilos = hasPled ? [
    { id: 'ILO1', text: 'Apply academic, stylistic, and rhetorical conventions of research communication.', relevance: 'supporting', reason: 'The presentation is a research communication genre.' },
    { id: 'ILO3', text: 'Communicate a persuasive research argument and contribution.', relevance: 'primary', reason: 'The 3MT task requires a clear contribution and significance.' },
    { id: 'ILO4', text: 'Express a confident research persona through engaging communication.', relevance: 'primary', reason: 'The performance requires credible spoken and embodied delivery.' },
    { id: 'ILO5', text: 'Communicate research effectively to cross-disciplinary and non-specialist audiences.', relevance: 'primary', reason: `The intended audience is ${draft.audience || 'non-specialist listeners'}.` },
  ] : [
    { id: 'ILO1', text: 'Present a clear research purpose and contribution.', relevance: 'primary', reason: 'Derived conservatively from the supplied task brief.' },
    { id: 'ILO2', text: 'Communicate research in a way appropriate to the intended audience.', relevance: 'primary', reason: 'Audience adaptation is observable in the presentation.' },
  ];
  const guidelines = hasPled ? [
    { id: 'course-guideline-1', title: 'Contribution clarity', description: 'State the research gap, contribution, and significance explicitly.', iloId: 'ILO3', relevance: 'primary', sourceQuote: 'Communicate a persuasive research argument and contribution.' },
    { id: 'course-guideline-2', title: 'Evidence-led claims', description: 'Match the strength of claims and recommendations to the evidence presented.', iloId: 'ILO3', relevance: 'primary', sourceQuote: 'Making claims and asking questions.' },
    { id: 'course-guideline-3', title: 'Audience accessibility', description: 'Explain specialist terms and foreground why the result matters to non-specialists.', iloId: 'ILO5', relevance: 'primary', sourceQuote: 'Maximizing understanding.' },
    { id: 'course-guideline-4', title: 'Rhetorical guidance', description: 'Use an intelligible opening, progression, contribution bridge, and closing.', iloId: 'ILO1', relevance: 'supporting', sourceQuote: 'Academic, stylistic, and rhetorical conventions.' },
    { id: 'course-guideline-5', title: 'Research persona', description: 'Use appropriately confident, credible, and engaging language.', iloId: 'ILO4', relevance: 'primary', sourceQuote: 'Conveying academic identity and authority.' },
    { id: 'course-guideline-6', title: 'Vocal emphasis', description: 'Use sentence stress and intonation to foreground key results and contribution.', iloId: 'ILO4', relevance: 'supporting', sourceQuote: 'Guiding and engaging with verbal language.' },
    { id: 'course-guideline-7', title: 'Embodied audience engagement', description: 'Coordinate gaze and gesture with important spoken content.', iloId: 'ILO4', relevance: 'supporting', sourceQuote: 'Guiding and engaging with body language.' },
  ] : [
    { id: 'course-guideline-1', title: 'Research purpose', description: 'Make the problem and contribution easy to identify.', iloId: 'ILO1', relevance: 'primary', sourceQuote: draft.taskBrief || 'Task brief supplied by tutor.' },
    { id: 'course-guideline-2', title: 'Audience fit', description: 'Explain the research at the knowledge level of the intended audience.', iloId: 'ILO2', relevance: 'primary', sourceQuote: `Audience: ${draft.audience || 'not specified'}` },
  ];
  const data = { courseTitle: hasPled ? 'PLED5001 Communicating Research in English' : 'Uploaded course requirements', ilos, guidelines };
  return { data, rawContent: JSON.stringify(data, null, 2) };
}

function buildMockCourseAlignmentAgent2(agent1, baseWeights) {
  const routing = {
    'Contribution clarity': ['discourse', 'Evidence integration'],
    'Evidence-led claims': ['pragmatic', 'Strength of claims'],
    'Audience accessibility': ['lexical', 'Word precision'],
    'Rhetorical guidance': ['discourse', 'Idea progression'],
    'Research persona': ['pragmatic', 'Register'],
    'Vocal emphasis': ['pronunciation', 'Sentence stress'],
    'Embodied audience engagement': ['embodied', 'Gesture support'],
    'Research purpose': ['discourse', 'Opening & framing'],
    'Audience fit': ['pragmatic', 'Audience fit'],
  };
  const guidelines = agent1.guidelines.map((guideline) => {
    const [areaId, focus] = routing[guideline.title] || ['discourse', 'Task fulfilment'];
    const iloBoost = guideline.relevance === 'primary' ? 1 : 0.5;
    return { ...guideline, areaId, focus, iloBoost, baseWeight: clampWeight(baseWeights[areaId] || 3), effectiveWeight: Math.min(5, clampWeight(baseWeights[areaId] || 3) + iloBoost) };
  });
  const data = { guidelines };
  return { data, rawContent: JSON.stringify(data, null, 2) };
}

async function runCourseAlignmentAgent1(config, draft, documents, promptOverrides = {}) {
  if (!isRemoteConfigReady(config)) return buildMockCourseAlignmentAgent1(draft, documents);
  const taskContext = {
    presentationTitle: draft.title,
    researchTopic: draft.topic,
    audience: draft.audience,
    targetLevel: draft.level,
    taskBrief: draft.taskBrief,
  };
  const sourceDocuments = documents
    .filter((document) => ['course', 'rubric', 'task'].includes(document.role))
    .map(({ name, role, text }) => ({ name, role, text: String(text || '').slice(0, 18000) }));
  return callRemoteJson(config, [
    { role: 'system', content: `${promptOverride({ promptOverrides }, 'course_agent_1', DEFAULT_EDITABLE_PROMPTS.course_agent_1)}\nOUTPUT CONTRACT (fixed): ${COURSE_AGENT_1_CONTRACT}` },
    { role: 'user', content: `TASK_CONTEXT\n${JSON.stringify(taskContext)}\nCOURSE_DOCUMENTS\n${JSON.stringify(sourceDocuments)}\nKeep guidelines short, observable, and traceable to one supplied source document.` },
  ], TEXT_SAMPLING_CONFIG);
}

async function runCourseAlignmentAgent2(config, agent1, baseWeights, promptOverrides = {}) {
  if (!isRemoteConfigReady(config)) return buildMockCourseAlignmentAgent2(agent1, baseWeights);
  const areaCatalog = ATTENTION_AREAS.map((area) => ({ id: area.id, name: area.name, focuses: area.focus }));
  return callRemoteJson(config, [
    { role: 'system', content: `${promptOverride({ promptOverrides }, 'course_agent_2', DEFAULT_EDITABLE_PROMPTS.course_agent_2)}\nOUTPUT CONTRACT (fixed): ${COURSE_AGENT_2_CONTRACT}` },
    { role: 'user', content: `BASE_WEIGHTS\n${JSON.stringify(baseWeights)}\nATTENTION_AREAS\n${JSON.stringify(areaCatalog)}\nAGENT_1_OUTPUT\n${JSON.stringify(agent1)}\nDo not rewrite Agent 1's guideline text.` },
  ], TEXT_SAMPLING_CONFIG);
}

function normalizeCourseAlignment(agent1Response, agent2Response, baseWeights) {
  const routedById = new Map((agent2Response.data.guidelines || []).map((guideline) => [guideline.id, guideline]));
  const guidelines = (agent1Response.data.guidelines || []).map((guideline, index) => {
    const routed = routedById.get(guideline.id) || agent2Response.data.guidelines?.[index] || {};
    const area = ATTENTION_AREAS.find((candidate) => candidate.id === routed.areaId) || ATTENTION_AREAS.find((candidate) => candidate.id === 'discourse');
    const focus = area.focus.includes(routed.focus) ? routed.focus : area.focus[0];
    const iloBoost = clampIloBoost(routed.iloBoost ?? (guideline.relevance === 'primary' ? 1 : 0.5));
    const baseWeight = clampWeight(baseWeights[area.id] || 3);
    return {
      ...routed,
      ...guideline,
      id: guideline.id || `course-guideline-${index + 1}`,
      areaId: area.id,
      focus,
      iloBoost,
      baseWeight,
      effectiveWeight: Math.min(5, baseWeight + iloBoost),
    };
  });
  return {
    courseTitle: agent1Response.data.courseTitle || 'Uploaded course requirements',
    ilos: Array.isArray(agent1Response.data.ilos) ? agent1Response.data.ilos : [],
    guidelines,
    agent1RawResponse: agent1Response.rawContent,
    agent2RawResponse: agent2Response.rawContent,
  };
}

function WorkflowStage({ number, title, description, state: stageState, remoteActive = false, remoteLabel, children }) {
  const icon = stageState === 'complete' ? <Check size={15} /> : stageState === 'running' ? <LoaderCircle className="spin" size={15} /> : number;
  return (
    <section className={`workflow-stage ${stageState}${remoteActive ? ' remote-running' : ''}`}>
      <div className="workflow-rail"><span>{icon}</span></div>
      <div className="workflow-stage-body">
        <header className="workflow-stage-head"><div><h2>{title}</h2><p>{description}</p>{remoteActive ? <span className="remote-call-label"><Activity size={12} />Remote API · {remoteLabel}</span> : null}</div><strong>{stageState === 'complete' ? 'Complete' : stageState === 'running' ? 'Running' : stageState === 'locked' ? 'Locked' : 'Ready'}</strong></header>
        {children}
      </div>
    </section>
  );
}

function WorkflowPage({ state, setState, notify }) {
  const workflow = state.workflow;
  const alignment = workflow.alignment;
  const activeGuidelines = alignment.enabled ? alignment.guidelines : [];
  const effectiveWeights = useMemo(() => computeEffectiveWeights(workflow.baseWeights, activeGuidelines), [workflow.baseWeights, activeGuidelines]);
  const textOutputs = (workflow.results?.agentOutputs || []).filter((output) => EXPERIMENT_TEXT_AREAS.includes(output.areaId));
  const vrOutputs = (workflow.results?.agentOutputs || []).filter((output) => output.areaId === 'embodied');
  const audioOutputs = (workflow.results?.agentOutputs || []).filter((output) => EXPERIMENT_AUDIO_AREAS.includes(output.areaId));
  const courseBusy = ['agent1-running', 'agent2-running'].includes(alignment.status);
  const workflowBusy = workflow.running || courseBusy;
  const multimodalReady = isRemoteConfigReady(state.config.multimodal);
  const runtimeAudioFile = WORKFLOW_RUNTIME_AUDIO_FILES.get(workflow.selectedDatasetId) || null;
  const attachAudio = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    WORKFLOW_RUNTIME_AUDIO_FILES.set(workflow.selectedDatasetId, file);
    updateWorkflow({ draft: {...workflow.draft,audio:{name:file.name,size:file.size,type:file.type}},results:null });
    if (workflow.studySessionId) {
      try { await saveStudyAudio(workflow.selectedDatasetId,file); }
      catch { notify('Audio is available for this visit, but could not be saved in this browser. Keep the original recording.','warning'); return; }
    }
    notify(`${file.name} attached${workflow.studySessionId ? ' and saved locally' : ''}.`, 'success');
  };

  const updateWorkflow = (patchValue) => setState((current) => ({ ...current, workflow: { ...current.workflow, ...patchValue } }));
  const updateDraft = (field, value) => updateWorkflow({ draft: { ...workflow.draft, [field]: value }, results: null });
  const updateAlignment = (patchValue) => updateWorkflow({ alignment: { ...alignment, ...patchValue }, results: null });

  const uploadDocuments = async (files) => {
    const nextDocuments = [];
    for (const file of files) {
      try {
        const extracted = await extractDocumentText(file);
        const text = extracted.text;
        const role = inferDocumentRole(file.name);
        nextDocuments.push({ id: `${Date.now()}-${file.name}`, name: file.name, role, type: file.type, size: file.size, text, pageCount: extracted.pageCount || null, source: 'uploaded' });
      } catch (error) {
        notify(`${file.name} could not be read: ${error.message}`, 'error');
      }
    }
    if (!nextDocuments.length) return;
    const nextDraft = { ...workflow.draft };
    nextDocuments.forEach((document) => {
      if (document.role === 'transcript') nextDraft.transcript = document.text;
      if (document.role === 'task') nextDraft.taskBrief = document.text;
    });
    updateWorkflow({ documents: [...workflow.documents, ...nextDocuments], draft: nextDraft, alignment: { ...DEFAULT_COURSE_ALIGNMENT }, results: null });
    notify(`${nextDocuments.length} document${nextDocuments.length === 1 ? '' : 's'} extracted and added.`, 'success');
  };

  const changeDocumentRole = (documentId, role) => {
    const document = workflow.documents.find((item) => item.id === documentId);
    const nextDraft = { ...workflow.draft };
    if (role === 'transcript' && document) nextDraft.transcript = document.text;
    if (role === 'task' && document) nextDraft.taskBrief = document.text;
    updateWorkflow({ documents: workflow.documents.map((item) => item.id === documentId ? { ...item, role } : item), draft: nextDraft, alignment: { ...DEFAULT_COURSE_ALIGNMENT }, results: null });
  };

  const uploadVrTrace = async (file) => {
    if (!file) return;
    try {
      const trace = JSON.parse(await file.text());
      const validation = validateVrTrace(trace);
      if (!validation.valid) throw new Error(validation.errors[0]);
      updateWorkflow({ draft: { ...workflow.draft, vrTrace: trace, vrTraceSummary: validation.summary, vrTraceSource: 'uploaded' }, results: null });
      notify(`${validation.summary.recordCount} VR samples validated.`, 'success');
    } catch (error) {
      notify(`VR JSON could not be used: ${error.message}`, 'error');
    }
  };

  const courseSourceSignature = buildCourseSourceSignature(workflow.draft, workflow.documents, state.promptOverrides);
  const approvedAlignmentReusable = Boolean(alignment.enabled && alignment.approved && alignment.sourceSignature === courseSourceSignature);

  const runAlignment = async (forceRegenerate = false) => {
    if (workflowBusy) return;
    const courseDocuments = workflow.documents.filter((document) => document.role === 'course' || document.role === 'rubric');
    if (!alignment.enabled || !courseDocuments.length) {
      const skippedAlignment = { ...DEFAULT_COURSE_ALIGNMENT, enabled: false, approvalRequired: alignment.approvalRequired, status: 'skipped', approved: true };
      updateWorkflow({ stage: 3, alignment: skippedAlignment, remoteRequest: null });
      notify(!courseDocuments.length ? 'No course syllabus or rubric attached. Course Alignment skipped; evaluation started automatically.' : 'Course Alignment skipped. Evaluation started automatically.', 'info');
      await runEvaluation(skippedAlignment);
      return;
    }
    if (!forceRegenerate && approvedAlignmentReusable) {
      notify('Reusing the frozen tutor-approved Course Alignment profile.', 'info');
      await runEvaluation(alignment);
      return;
    }
    const remoteCourseCall = isRemoteConfigReady(state.config.text);
    updateWorkflow({ stage: 2, alignment: { ...alignment, status: 'agent1-running', approved: false, error: null }, remoteRequest: remoteCourseCall ? { stage: 2, label: 'Course Alignment Agent 1' } : null });
    try {
      const agent1Response = await runCourseAlignmentAgent1(state.config.text, workflow.draft, workflow.documents, state.promptOverrides);
      updateWorkflow({ stage: 2, alignment: { ...alignment, status: 'agent2-running', approved: false, agent1RawResponse: agent1Response.rawContent, error: null }, remoteRequest: remoteCourseCall ? { stage: 2, label: 'Course Alignment Agent 2' } : null });
      const agent2Response = await runCourseAlignmentAgent2(state.config.text, agent1Response.data, workflow.baseWeights, state.promptOverrides);
      const normalized = normalizeCourseAlignment(agent1Response, agent2Response, workflow.baseWeights);
      const autoApproved = !alignment.approvalRequired;
      const nextAlignment = {
        ...alignment,
        ...normalized,
        status: autoApproved ? 'approved' : 'awaiting-approval',
        approved: autoApproved,
        error: null,
        sourceSignature: courseSourceSignature,
        promptVersion: COURSE_ALIGNMENT_PROMPT_VERSION,
        frozenAt: autoApproved ? new Date().toISOString() : null,
      };
      updateWorkflow({
        stage: autoApproved ? 3 : 2,
        alignment: nextAlignment,
        remoteRequest: null,
      });
      if (autoApproved) {
        notify('Course requirements routed. Evaluation started automatically.', 'success');
        await runEvaluation(nextAlignment);
      } else {
        notify('Course requirements are ready for tutor review.', 'success');
      }
    } catch (error) {
      updateWorkflow({ stage: 2, alignment: { ...alignment, status: 'failed', approved: false, error: error.message }, remoteRequest: null });
      notify(`Course Alignment failed: ${error.message}`, 'error');
    }
  };

  const approveAlignment = async () => {
    if (workflowBusy) return;
    const approvedAt = new Date().toISOString();
    const approvedAlignment = { ...alignment, status: 'approved', approved: true, approvedAt, frozenAt: approvedAt, sourceSignature: courseSourceSignature, promptVersion: COURSE_ALIGNMENT_PROMPT_VERSION };
    updateWorkflow({ stage: 3, alignment: approvedAlignment, remoteRequest: null });
    notify('Course Alignment approved. Evaluation started automatically.', 'success');
    await runEvaluation(approvedAlignment);
  };

  const updateGuideline = (guidelineId, field, value) => {
    const nextGuidelines = alignment.guidelines.map((guideline) => {
      if (guideline.id !== guidelineId) return guideline;
      const next = { ...guideline, [field]: value };
      if (field === 'areaId') next.focus = ATTENTION_AREAS.find((area) => area.id === value)?.focus[0] || '';
      next.iloBoost = clampIloBoost(next.iloBoost);
      next.baseWeight = clampWeight(workflow.baseWeights[next.areaId] || next.baseWeight || 3);
      next.effectiveWeight = Math.min(5, next.baseWeight + next.iloBoost);
      return next;
    });
    updateWorkflow({ stage: 2, alignment: { ...alignment, guidelines: nextGuidelines, approved: false, status: 'awaiting-approval' }, results: null });
  };

  const updateBaseWeight = (areaId, value) => {
    const nextBaseWeights = { ...workflow.baseWeights, [areaId]: clampWeight(value) };
    const nextGuidelines = alignment.guidelines.map((guideline) => guideline.areaId === areaId ? { ...guideline, baseWeight: nextBaseWeights[areaId], effectiveWeight: Math.min(5, nextBaseWeights[areaId] + clampIloBoost(guideline.iloBoost)) } : guideline);
    updateWorkflow({ stage: alignment.guidelines.length ? 2 : workflow.stage, baseWeights: nextBaseWeights, alignment: { ...alignment, guidelines: nextGuidelines, approved: alignment.guidelines.length ? false : alignment.approved, status: alignment.guidelines.length ? 'awaiting-approval' : alignment.status }, results: null });
  };

  const setAlignmentEnabled = (enabled) => {
    const nextAlignment = { ...alignment, enabled, approved: !enabled, status: enabled ? 'idle' : 'skipped' };
    updateWorkflow({ stage: enabled ? 2 : 3, alignment: nextAlignment, results: null, remoteRequest: null });
    if (!enabled && workflow.stage >= 2) void runEvaluation(nextAlignment);
  };

  const setApprovalRequired = (approvalRequired) => {
    const canAutoApprove = !approvalRequired && alignment.guidelines.length > 0;
    const nextAlignment = { ...alignment, approvalRequired, approved: canAutoApprove, status: canAutoApprove ? 'approved' : alignment.guidelines.length ? 'awaiting-approval' : alignment.status };
    updateWorkflow({ stage: canAutoApprove ? 3 : 2, alignment: nextAlignment, results: null, remoteRequest: null });
    if (canAutoApprove) void runEvaluation(nextAlignment);
  };

  const runEvaluation = async (alignmentOverride = alignment) => {
    if(serverConfig && !isRemoteConfigReady(state.config.text)) {
      notify('Configure TEXT_BASE_URL, TEXT_API_KEY and TEXT_MODEL in Coolify before running evaluation.', 'error');
      return;
    }
    if (!workflow.draft.transcript.trim()) {
      notify('Enter or upload a transcript before evaluation.', 'error');
      return;
    }
    const alignmentCanProceed = !alignmentOverride.enabled || !alignmentOverride.approvalRequired || alignmentOverride.approved;
    if (!alignmentCanProceed) {
      notify('Tutor approval is required before evaluation agents can run.', 'warning');
      return;
    }
    const audioFile = WORKFLOW_RUNTIME_AUDIO_FILES.get(workflow.selectedDatasetId) || null;
    if (workflow.draft.audio && !audioFile) notify('The recording name was restored, but its raw bytes are unavailable. Re-upload it to call the speech model.', 'warning');
    const includeAudio = Boolean(audioFile && multimodalReady);
    const nextEffectiveWeights = computeEffectiveWeights(workflow.baseWeights, alignmentOverride.enabled ? alignmentOverride.guidelines : []);
    const selectedAreaIds = EXPERIMENT_AGENT_AREAS.filter((areaId) => areaId !== 'embodied' || workflow.draft.vrTrace).filter((areaId) => !EXPERIMENT_AUDIO_AREAS.includes(areaId) || includeAudio);
    const textRemoteReady = isRemoteConfigReady(state.config.text);
    const pipelineUsesRemote = textRemoteReady || includeAudio;
    const experiment = { selectedAreaIds, attentionWeights: nextEffectiveWeights, modelRoute: textRemoteReady ? 'configured-text' : 'local-mock' };
    const dataset = { ...workflow.draft, label: 'Current run', audio: audioFile ? { name: audioFile.name, size: audioFile.size, type: audioFile.type } : workflow.draft.audio };
    const evaluationState = createExperimentEvaluationState(state, experiment, dataset, includeAudio);
    evaluationState.courseAlignmentProfile = alignmentOverride.enabled ? { courseTitle: alignmentOverride.courseTitle, ilos: alignmentOverride.ilos, guidelines: alignmentOverride.guidelines, effectiveWeights: nextEffectiveWeights, approved: alignmentOverride.approved } : null;
    const readiness = calculateReadiness(evaluationState);
    const runningStatuses = Object.fromEntries(selectedAreaIds.map((areaId) => [areaId, 'running']));
    updateWorkflow({ running: true, stage: 3, alignment: alignmentOverride, agentStatuses: runningStatuses, results: null, remoteRequest: pipelineUsesRemote ? { stage: 3, label: 'Parallel attention agents' } : null });
    try {
      const results = await runExperimentPipeline(evaluationState, readiness, {
        forceLocalText: !textRemoteReady,
        audioFile,
        audioAttachedMetadata: Boolean(workflow.draft.audio),
        multimodalReady,
        onProgress: ({ stage, completedAreaIds = [] }) => {
          setState((current) => ({
            ...current,
            workflow: {
              ...current.workflow,
              stage,
              agentStatuses: Object.fromEntries(selectedAreaIds.map((areaId) => [areaId, completedAreaIds.includes(areaId) ? 'complete' : 'running'])),
              remoteRequest: pipelineUsesRemote ? { stage, label: stage === 4 ? 'Integration and direct routes' : 'Parallel attention agents' } : null,
            },
          }));
        },
      });
      const completedAt = new Date().toISOString();
      const completedResults = {
        ...results,
        completedAt,
        modelNote: results.pipelineNote,
        courseAlignment: alignmentOverride.enabled ? { ...alignmentOverride, effectiveWeights: nextEffectiveWeights } : { enabled: false, status: 'skipped' },
        datasetSnapshot: dataset,
      };
      const historyEntry = { ...createHistoryEntry(evaluationState, readiness, completedResults), id: `workflow-${Date.now()}`, source: 'workflow', studentId: workflow.studentId || null, studySessionId: workflow.studySessionId || null, courseAlignment: completedResults.courseAlignment };
      setState((current) => ({
        ...current,
        history: [historyEntry, ...(current.history || [])].filter((run,index) => run.studentId || index < HISTORY_LIMIT),
        workflow: { ...current.workflow, running: false, remoteRequest: null, stage: 5, lastRunAt: completedAt, results: completedResults, agentStatuses: Object.fromEntries(selectedAreaIds.map((areaId) => [areaId, 'complete'])) },
      }));
      notify('The complete course-aligned pipeline finished and was saved to History.', 'success');
    } catch (error) {
      updateWorkflow({ running: false, remoteRequest: null, stage: 3, agentStatuses: Object.fromEntries(selectedAreaIds.map((areaId) => [areaId, 'failed'])) });
      notify(`Evaluation failed: ${error.message}`, 'error');
    }
  };

  const stageState = (number) => {
    if (number === 2 && courseBusy) return 'running';
    if (workflow.running && workflow.stage === number) return 'running';
    if (number === 5 && workflow.results && !workflow.running) return 'complete';
    if (number === 2 && alignment.enabled && alignment.approvalRequired && !alignment.approved && alignment.status === 'awaiting-approval') return 'ready';
    if (number < workflow.stage || (number === 2 && (!alignment.enabled || alignment.approved))) return 'complete';
    if (number > workflow.stage) return 'locked';
    return 'ready';
  };

  return (
    <div className="workflow-page">
      <WorkflowStage number="1" title="Evidence & session setup" description={workflow.studySessionId ? 'Upload the recording and VR trace for this student and test. Select another test using the timeline above.' : 'Upload evidence and set the base importance of each attention area. Switch dataset slots from the top-right selector.'} state={stageState(1)} remoteActive={workflow.remoteRequest?.stage === 1} remoteLabel={workflow.remoteRequest?.label}>
        <div className="workflow-stack">
          <FormField label="Presentation title"><input value={workflow.draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></FormField>
          <FormField label="Learner"><input value={workflow.draft.learner} onChange={(event) => updateDraft('learner', event.target.value)} /></FormField>
          <FormField label="Research topic"><input value={workflow.draft.topic} onChange={(event) => updateDraft('topic', event.target.value)} /></FormField>
          <FormField label="Audience"><input value={workflow.draft.audience} onChange={(event) => updateDraft('audience', event.target.value)} /></FormField>
          <FormField label="Task brief"><textarea value={workflow.draft.taskBrief} onChange={(event) => updateDraft('taskBrief', event.target.value)} /></FormField>
          <FormField label="Transcript" hint={`${countWords(workflow.draft.transcript)} words`}><textarea className="workflow-transcript" value={workflow.draft.transcript} onChange={(event) => updateDraft('transcript', event.target.value)} /></FormField>
          <section className="unified-document-upload"><div><FileText size={21} /><span><strong>Documents</strong><small>Upload course syllabi, ILOs, rubrics, task briefs, or transcripts through this single interface.</small></span></div><label className="secondary-button"><UploadCloud size={15} />Upload documents<input type="file" multiple accept=".pdf,.txt,.md,.json,application/pdf,text/plain,application/json" hidden onChange={(event) => uploadDocuments([...event.target.files])} /></label></section>
          {workflow.documents.length ? <div className="document-list">{workflow.documents.map((document) => <article key={document.id}><FileText size={16} /><div><strong>{document.name}</strong><small>{document.text.length.toLocaleString()} extracted characters{document.pageCount ? ` · ${document.pageCount} pages` : ''}{document.source === 'built-in-extracted-fixture' ? ' · built-in full-text fixture' : ''}</small></div><select value={document.role} onChange={(event) => changeDocumentRole(document.id, event.target.value)}><option value="course">Course syllabus / ILO</option><option value="rubric">Rubric / guideline</option><option value="task">Task brief</option><option value="transcript">Transcript</option></select><button aria-label={`Remove ${document.name}`} onClick={() => updateWorkflow({ documents: workflow.documents.filter((item) => item.id !== document.id), alignment: { ...DEFAULT_COURSE_ALIGNMENT }, results: null })}><X size={15} /></button></article>)}</div> : null}
          <section className={`evidence-upload-row ${runtimeAudioFile ? 'evidence-ready' : ''}`}><div><Headphones size={20} /><span><strong>Audio recording</strong><small>{runtimeAudioFile ? `${runtimeAudioFile.name} · ${multimodalReady ? 'ready for speech API' : 'multimodal API not configured'}` : workflow.draft.audio ? `${workflow.draft.audio.name} · re-upload required to restore raw bytes` : 'Optional · required for direct speech and timestamp alignment'}</small></span></div><label className="secondary-button"><UploadCloud size={15} />{runtimeAudioFile ? 'Replace audio' : 'Upload audio'}<input type="file" accept="audio/*" hidden onChange={attachAudio} /></label></section>
          <section className={`evidence-upload-row ${workflow.draft.vrTraceSummary ? 'evidence-ready' : ''}`}><div><ScanEye size={20} /><span><strong>VR trace JSON</strong><small>{workflow.draft.vrTraceSummary ? `${workflow.draft.vrTraceSummary.recordCount} validated samples · ${workflow.draft.vrTrace?.simulation?.is_simulated ? 'bundled simulated motion' : workflow.draft.vrTraceSource === 'built-in-dummy' ? 'built-in dummy loaded' : 'uploaded file loaded'}` : 'Optional · five-second gaze, headset and controller samples'}</small></span></div><div className="evidence-actions">{(workflow.draft.vrTraceUrl || DEFAULT_EXPERIMENT_DATASETS.find((dataset) => dataset.id === workflow.selectedDatasetId)?.vrTraceUrl) && workflow.draft.vrTrace ? <a className="secondary-button" href={workflow.draft.vrTraceUrl || DEFAULT_EXPERIMENT_DATASETS.find((dataset) => dataset.id === workflow.selectedDatasetId)?.vrTraceUrl} download><FileDown size={15} />Download example trace</a> : null}<label className="secondary-button"><UploadCloud size={15} />Replace VR JSON<input type="file" accept=".json,application/json" hidden onChange={(event) => uploadVrTrace(event.target.files?.[0])} /></label></div></section>
          <div className="base-weight-section"><div><strong>Base attention weights</strong><span>Persistent tutor priorities. Course Alignment adds at most +1 for this run.</span></div><div className="base-weight-list">{ATTENTION_AREAS.filter((area) => EXPERIMENT_AGENT_AREAS.includes(area.id)).map((area) => <label key={area.id}><span><b>{area.code}</b>{area.name}</span><input type="range" min="1" max="5" step="1" value={workflow.baseWeights[area.id] || 3} onChange={(event) => updateBaseWeight(area.id, event.target.value)} /><strong>{workflow.baseWeights[area.id] || 3}/5</strong></label>)}</div></div>
          <button className="primary-button workflow-next" onClick={() => runAlignment(false)} disabled={workflowBusy}>{workflowBusy ? <LoaderCircle className="spin" size={16} /> : null}{workflow.running ? 'Evaluation running automatically' : courseBusy ? 'Course Alignment running' : !alignment.enabled || !workflow.documents.some(document => document.role === 'course' || document.role === 'rubric') ? 'Start automatic evaluation' : approvedAlignmentReusable ? 'Run evaluation with approved alignment' : 'Run Course Alignment'}{workflowBusy ? null : <ChevronRight size={16} />}</button>
        </div>
      </WorkflowStage>

      <WorkflowStage number="2" title="Course Alignment Layer" description="Agent 1 extracts relevant ILOs and guidelines. Agent 2 routes them and applies a bounded run-specific weight adjustment." state={stageState(2)} remoteActive={workflow.remoteRequest?.stage === 2} remoteLabel={workflow.remoteRequest?.label}>
        <div className="alignment-controls"><label><input type="checkbox" checked={alignment.enabled} disabled={workflowBusy} onChange={(event) => setAlignmentEnabled(event.target.checked)} /><span><strong>Enable Course Alignment</strong><small>Turn off to bypass both course agents.</small></span></label><label><input type="checkbox" checked={alignment.approvalRequired} disabled={!alignment.enabled || workflowBusy} onChange={(event) => setApprovalRequired(event.target.checked)} /><span><strong>Require tutor approval</strong><small>When off, completed routing proceeds automatically.</small></span></label></div>
        {alignment.error ? <div className="workflow-error"><CircleAlert size={17} />{alignment.error}</div> : null}
        {alignment.ilos.length ? <div className="ilo-summary"><strong>{alignment.courseTitle}</strong>{alignment.ilos.map((ilo) => <article key={ilo.id}><b>{ilo.id}</b><span>{ilo.text}</span><em>{ilo.relevance}</em></article>)}</div> : <p className="workflow-empty">Run this stage to extract course requirements and task-relevant ILOs.</p>}
        {(alignment.guidelines.length || (alignment.enabled && alignment.status !== 'idle')) ? <div className="guideline-editor"><div className="guideline-editor-head"><div><strong>Guidelines for tutor review</strong><span>{approvedAlignmentReusable ? 'Frozen and reusable for identical course/task inputs.' : 'Every item is editable. Effective weight = base weight + highest bounded ILO boost.'}</span></div><div className="guideline-head-actions">{alignment.approved ? <button className="secondary-button" disabled={workflowBusy} onClick={() => runAlignment(true)}><RefreshCw size={15} />Regenerate</button> : null}<button className="secondary-button" onClick={() => updateWorkflow({ stage: 2, alignment: { ...alignment, guidelines: [...alignment.guidelines, { id: `custom-guideline-${Date.now()}`, title: 'New guideline', description: 'Describe the observable course requirement.', iloId: alignment.ilos[0]?.id || 'Custom', relevance: 'supporting', sourceQuote: 'Tutor-added', areaId: 'discourse', focus: 'Idea progression', iloBoost: 0.5, baseWeight: workflow.baseWeights.discourse || 3, effectiveWeight: Math.min(5, (workflow.baseWeights.discourse || 3) + 0.5) }], approved: false, status: 'awaiting-approval' }, results: null })}><Plus size={15} />Add guideline</button></div></div>{alignment.guidelines.length ? alignment.guidelines.map((guideline, index) => { const area = ATTENTION_AREAS.find((candidate) => candidate.id === guideline.areaId); return <article className="guideline-row" key={guideline.id}><div className="guideline-number">{index + 1}</div><div className="guideline-fields"><input aria-label="Guideline title" value={guideline.title} onChange={(event) => updateGuideline(guideline.id, 'title', event.target.value)} /><textarea aria-label="Guideline description" value={guideline.description} onChange={(event) => updateGuideline(guideline.id, 'description', event.target.value)} /><div className="guideline-meta"><label><span>ILO</span><select value={guideline.iloId} onChange={(event) => updateGuideline(guideline.id, 'iloId', event.target.value)}>{alignment.ilos.length ? alignment.ilos.map((ilo) => <option key={ilo.id} value={ilo.id}>{ilo.id}</option>) : <option value="Custom">Custom</option>}</select></label><label><span>Assigned agent</span><select value={guideline.areaId} onChange={(event) => updateGuideline(guideline.id, 'areaId', event.target.value)}>{ATTENTION_AREAS.filter((candidate) => EXPERIMENT_AGENT_AREAS.includes(candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label><label><span>Focus</span><select value={guideline.focus} onChange={(event) => updateGuideline(guideline.id, 'focus', event.target.value)}>{(area?.focus || []).map((focus) => <option key={focus}>{focus}</option>)}</select></label><label><span>Base</span><input type="number" min="1" max="5" step="1" value={workflow.baseWeights[guideline.areaId] || 3} onChange={(event) => updateBaseWeight(guideline.areaId, event.target.value)} /></label><label><span>ILO boost</span><select value={guideline.iloBoost} onChange={(event) => updateGuideline(guideline.id, 'iloBoost', event.target.value)}><option value="0">+0</option><option value="0.5">+0.5</option><option value="1">+1</option></select></label><label className="effective-weight"><span>Effective</span><strong>{Math.min(5, (workflow.baseWeights[guideline.areaId] || 3) + clampIloBoost(guideline.iloBoost))}/5</strong></label></div></div><button className="guideline-delete" aria-label={`Delete ${guideline.title}`} onClick={() => updateWorkflow({ stage: 2, alignment: { ...alignment, guidelines: alignment.guidelines.filter((item) => item.id !== guideline.id), approved: false, status: 'awaiting-approval' }, results: null })}><X size={16} /></button></article>; }) : <p className="guideline-empty">No guideline was extracted. Add one manually or rerun Course Alignment with a clearer course document.</p>}</div> : null}
        {alignment.agent1RawResponse ? <div className="alignment-raw-grid"><details><summary>Agent 1 raw response <ChevronDown size={14} /></summary><pre>{alignment.agent1RawResponse}</pre></details><details><summary>Agent 2 raw response <ChevronDown size={14} /></summary><pre>{alignment.agent2RawResponse}</pre></details></div> : null}
        {alignment.enabled && alignment.guidelines.length ? <div className="alignment-approval"><span>{alignment.approved ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<b>{alignment.approved ? 'Tutor approved · evaluation continues automatically' : 'Tutor approval pending'}</b></span><button className="primary-button" onClick={approveAlignment} disabled={alignment.approved || workflowBusy}><Check size={16} />{alignment.approved ? 'Approved' : 'Approve & continue automatically'}</button></div> : null}
      </WorkflowStage>

      <WorkflowStage number="3" title="Parallel attention agents" description="Each enabled agent receives only its relevant approved course guidelines and the evidence it can validly inspect." state={stageState(3)} remoteActive={workflow.remoteRequest?.stage === 3} remoteLabel={workflow.remoteRequest?.label}>
        <div className="parallel-agent-grid">{ATTENTION_AREAS.filter((area) => workflow.selectedAreaIds.includes(area.id)).map((area) => { const AreaIcon = area.icon; const output = (workflow.results?.agentOutputs || []).find((candidate) => candidate.areaId === area.id); const status = workflow.agentStatuses[area.id] || (workflow.results ? 'complete' : 'waiting'); const routed = activeGuidelines.filter((guideline) => guideline.areaId === area.id); const remoteRunning = status === 'running' && workflow.remoteRequest?.stage === 3; return <section className={`pipeline-agent ${status}${remoteRunning ? ' remote-running' : ''}`} key={area.id}><header><AreaIcon size={18} /><div><strong>{area.name}</strong><small>Weight {effectiveWeights[area.id] || workflow.baseWeights[area.id]}/5 · {routed.length} course guideline(s)</small></div><i>{status}</i></header>{routed.length ? <ul>{routed.map((guideline) => <li key={guideline.id}>{guideline.title}</li>)}</ul> : <p>Universal attention focuses only.</p>}<details><summary>Raw response <ChevronDown size={13} /></summary><pre>{output?.providerRawResponse || (output?.rawOutput ? JSON.stringify(output.rawOutput, null, 2) : 'Available after this agent runs.')}</pre></details></section>; })}</div>
        {(workflow.running && workflow.stage === 3 || workflow.results) && <div className="auto-run-status">{workflow.running && workflow.stage === 3 ? <><LoaderCircle className="spin" size={15} /><span>Running automatically after tutor review</span></> : <><CheckCircle2 size={15} /><span>Agents completed automatically</span></>}</div>}
      </WorkflowStage>

      <WorkflowStage number="4" title="Integration and direct routes" description="Only Chain 1 text findings enter Integration. Aligned VR and direct speech feedback remain separate." state={stageState(4)} remoteActive={workflow.remoteRequest?.stage === 4} remoteLabel={workflow.remoteRequest?.label}>
        {workflow.results ? <div className="integration-stage-grid"><section className="integration-agent"><header><GitMerge size={19} /><div><strong>Deterministic text integration</strong><small>{textOutputs.length} text agents · {(workflow.results.findings || []).length} improvements · {(workflow.results.strengths || []).length} strengths · {(workflow.results.integrationCandidates || []).length} source candidates</small></div></header><div className="compact-finding-list">{(workflow.results.findings || []).slice(0, 5).map((finding, index) => <p key={`${finding.title}-${index}`}><b>{index + 1}. {finding.title}</b><span>Score {finding.rankingScore || 'legacy'} · {findingActionText(finding)}</span></p>)}</div>{(workflow.results.findings || []).length > 5 ? <details className="integration-full-findings"><summary>All {(workflow.results.findings || []).length} integrated findings <ChevronDown size={14} /></summary><div className="compact-finding-list full">{(workflow.results.findings || []).map((finding, index) => <p key={`${finding.title}-all-${index}`}><b>{index + 1}. {finding.title}</b><span>{finding.area} · {confidenceLevel(finding)} confidence</span><span>{findingActionText(finding)}</span></p>)}</div></details> : null}<IntegrationDecisionList decisions={workflow.results.decisions || []} outputs={textOutputs} candidates={workflow.results.integrationCandidates || []} /><details><summary>Integration presentation response <ChevronDown size={14} /></summary><pre>{workflow.results.integrationProviderRawResponse || 'Local mock integration did not return provider content.'}</pre></details></section><DirectRouteSection chain="2" title="Aligned VR evaluation" subtitle="Timestamped transcript + VR JSON" status={workflow.results.vrStatus} message={workflow.results.vrStatusMessage} outputs={vrOutputs} icon={ScanEye} alignment={workflow.results.timestampAlignment} /><DirectRouteSection chain="3" title="Direct speech evaluation" subtitle="Fluency, timing, pronunciation and prosody" status={workflow.results.audioStatus} message={workflow.results.audioStatusMessage} outputs={audioOutputs} icon={Headphones} /></div> : <p className="workflow-empty">Integration and direct-route results will appear here after the parallel agents finish.</p>}
      </WorkflowStage>

      <WorkflowStage number="5" title="Final feedback" description="A readable tutor report and concise learner coaching output, with the complete pipeline preserved above." state={stageState(5)} remoteActive={workflow.remoteRequest?.stage === 5} remoteLabel={workflow.remoteRequest?.label}>
        {workflow.results ? <div className="final-feedback-stage"><section><header><FileOutput size={18} /><div><strong>Tutor feedback</strong><small>All evidence-verified, course-aligned findings</small></div></header>{(workflow.results.findings || []).map((finding, index) => <article key={`${finding.title}-${index}`}><span>{index + 1}</span><div><small>{finding.area} · score {finding.rankingScore || 'legacy'} · {confidenceLevel(finding)} confidence</small><strong>{finding.title}</strong><RichFindingContent finding={finding} compact /></div></article>)}<StrengthList strengths={workflow.results.strengths || []} /></section><aside><Volume2 size={19} /><div><strong>Learner-facing verbal feedback</strong><p>{workflow.results.verbalFeedback}</p></div></aside></div> : <p className="workflow-empty">The final tutor and learner views are generated after Stage 4.</p>}
      </WorkflowStage>
    </div>
  );
}

function InputPage({ state, setState, notify, onNext }) {
  const updateSession = (field, value) => setState((current) => ({ ...current, session: { ...current.session, [field]: value } }));

  const handleFile = async (key, file) => {
    if (!file) return;
    const metadata = { name: file.name, size: file.size, type: file.type, updatedAt: Date.now() };
    if (key === 'transcript') {
      try {
        const text = await file.text();
        const importedPackage = parseEvaluationPackage(text);
        if (importedPackage) {
          setState((current) => ({
            ...current,
            session: {
              ...current.session,
              title: importedPackage.sessionTitle,
              learner: importedPackage.learner,
              taskType: importedPackage.taskType,
              audience: importedPackage.audience,
              level: importedPackage.level,
              interactionMode: importedPackage.interactionMode,
            },
            inputs: {
              ...current.inputs,
              transcript: metadata,
              transcriptText: importedPackage.transcriptText,
              taskText: importedPackage.taskText,
              performanceMetrics: importedPackage.performanceMetrics,
              evidenceAvailability: importedPackage.evidenceAvailability,
            },
            readiness: null,
            results: null,
          }));
          notify(`Session package imported: ${importedPackage.turnCount} performance turns and stored metrics.`, 'success');
        } else {
          setState((current) => ({
            ...current,
            inputs: { ...current.inputs, transcript: metadata, transcriptText: text, performanceMetrics: null, evidenceAvailability: null },
            readiness: null,
            results: null,
          }));
          notify('Transcript ready. Text-based modules can now run.', 'success');
        }
      } catch {
        notify('This transcript could not be read as text. Use TXT, SRT, VTT, or JSON.', 'error');
      }
    } else if (key === 'vrTrace') {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const validation = validateVrTrace(data);
        if (!validation.valid) {
          notify(`VR trace rejected: ${validation.errors[0]}`, 'error');
          return;
        }
        setState((current) => ({
          ...current,
          inputs: { ...current.inputs, vrTrace: metadata, vrTraceData: data, vrTraceSummary: validation.summary },
          readiness: null,
          results: null,
        }));
        notify(`VR trace validated: ${validation.summary.recordCount} synchronized records.`, 'success');
      } catch {
        notify('VR trace rejected: upload a valid JSON file using the template.', 'error');
      }
    } else if (key === 'task') {
      const taskText = await file.text().catch(() => '');
      setState((current) => ({ ...current, inputs: { ...current.inputs, task: metadata, taskText }, readiness: null, results: null }));
      notify(`${file.name} added to this run.`, 'success');
    } else {
      setState((current) => ({ ...current, inputs: { ...current.inputs, [key]: metadata }, readiness: null, results: null }));
      notify(`${file.name} added to this run.`, 'success');
    }
  };

  const removeFile = (key) => setState((current) => ({
    ...current,
    inputs: {
      ...current.inputs,
      [key]: null,
      ...(key === 'transcript' ? { transcriptText: '', performanceMetrics: null, evidenceAvailability: null } : {}),
      ...(key === 'task' ? { taskText: '' } : {}),
      ...(key === 'vrTrace' ? { vrTraceData: null, vrTraceSummary: null } : {}),
    },
    readiness: null,
    results: null,
  }));

  const loadDemo = () => {
    const transcriptText = `Good afternoon. I think research should not stay inside universities. I think people should understand how urban heat affects their daily lives. My research maps street-level heat across the city. First, I combine satellite data with temperature sensors carried by local volunteers. Then I compare these measurements with tree cover and building density. The results show that two streets only five hundred metres apart can feel six degrees different. This is important because people in hotter neighbourhoods face greater health risks. I think city planners should use this evidence to target shade, trees and cooling centres. In three minutes, the message is simple: heat is local, so climate adaptation must be local too.`;
    setState((current) => ({
      ...current,
      session: { ...current.session, title: 'Heat is local', learner: 'Demo learner' },
      inputs: {
        ...current.inputs,
        transcript: { name: '3mt-demo-transcript.txt', size: transcriptText.length, type: 'text/plain', updatedAt: Date.now() },
        transcriptText,
      },
      readiness: null,
      results: null,
    }));
    notify('Demo transcript loaded.', 'success');
  };

  return (
    <div className="input-layout">
      <section className="content-column">
        <div className="section-heading">
          <div><span className="eyebrow">Required</span><h2>Performance transcript</h2></div>
          <button className="text-button" onClick={loadDemo}><WandSparkles size={15} /> Load demo</button>
        </div>
        <FileDrop
          id="transcript-upload"
          title="Upload transcript"
          hint="TXT, SRT, VTT or JSON · timestamps and speaker labels are welcome"
          icon={FileText}
          file={state.inputs.transcript}
          required
          accept=".txt,.srt,.vtt,.json,text/plain,application/json"
          onFile={(file) => handleFile('transcript', file)}
          onRemove={() => removeFile('transcript')}
        />
        {state.inputs.transcriptText && (
          <div className="transcript-preview">
            <div className="preview-head"><span>Transcript preview</span><span>{state.inputs.performanceMetrics ? `${state.inputs.performanceMetrics.approximate_word_count} presentation words · ${state.inputs.performanceMetrics.words_per_minute.toFixed(1)} WPM` : `${countWords(state.inputs.transcriptText)} words`}</span></div>
            <p>{state.inputs.transcriptText.slice(0, 420)}{state.inputs.transcriptText.length > 420 ? '…' : ''}</p>
            {state.inputs.performanceMetrics && <div className="imported-package-note"><CheckCircle2 size={14} /><span>Normalized session package · metrics and evidence limits imported</span></div>}
          </div>
        )}

        <div className="section-heading optional-heading">
          <div><span className="eyebrow muted">Optional evidence</span><h2>Add signal only when available</h2></div>
          <span className="section-hint">Missing data lowers confidence; it does not block the run.</span>
        </div>
        <div className="upload-grid">
          <FileDrop id="task-upload" title="Task reference" hint="Brief, rubric, slides or outline" icon={ListChecks} file={state.inputs.task} accept=".txt,.pdf,.doc,.docx,.ppt,.pptx,.json" onFile={(file) => handleFile('task', file)} onRemove={() => removeFile('task')} compact />
          <FileDrop id="audio-upload" title="Audio" hint="Enables fluency and pronunciation" icon={FileAudio} file={state.inputs.audio} accept="audio/*" onFile={(file) => handleFile('audio', file)} onRemove={() => removeFile('audio')} compact />
        </div>
        <VrTraceInput file={state.inputs.vrTrace} summary={state.inputs.vrTraceSummary} onFile={(file) => handleFile('vrTrace', file)} onRemove={() => removeFile('vrTrace')} />
      </section>

      <aside className="context-panel">
        <div className="panel-title"><div><span className="eyebrow">Context</span><h2>Session profile</h2></div><Gauge size={19} /></div>
        <p className="panel-intro">These fields help agents judge what “appropriate” means for this task.</p>
        <FormField label="Session title"><input value={state.session.title} onChange={(event) => updateSession('title', event.target.value)} placeholder="e.g. Heat is local" /></FormField>
        <FormField label="Learner"><input value={state.session.learner} onChange={(event) => updateSession('learner', event.target.value)} placeholder="Name or anonymous ID" /></FormField>
        <FormField label="Task type"><select value={state.session.taskType} onChange={(event) => updateSession('taskType', event.target.value)}><option>3MT presentation</option><option>Academic presentation</option><option>Seminar discussion</option><option>Interview</option><option>Everyday conversation</option></select></FormField>
        <FormField label="Audience"><select value={state.session.audience} onChange={(event) => updateSession('audience', event.target.value)}><option>General public</option><option>Academic specialists</option><option>Mixed audience</option><option>Peers</option><option>Interviewer</option></select></FormField>
        <div className="field-row">
          <FormField label="Target level"><select value={state.session.level} onChange={(event) => updateSession('level', event.target.value)}><option>B1–B2</option><option>B2–C1</option><option>C1–C2</option><option>Not set</option></select></FormField>
          <FormField label="Mode"><select value={state.session.interactionMode} onChange={(event) => updateSession('interactionMode', event.target.value)}><option>Monologue</option><option>Dialogue / Q&A</option></select></FormField>
        </div>
        <button className="secondary-button full-width" onClick={onNext}>Choose attention areas <ChevronRight size={16} /></button>
        <div className="privacy-note"><ShieldCheck size={15} /><span>Files remain in this browser session. Transcript and structured VR evidence are sent only when a remote model is configured.</span></div>
      </aside>
    </div>
  );
}

function VrTraceInput({ file, summary, onFile, onRemove }) {
  const inputRef = useRef(null);
  const requirements = [
    { icon: ScanEye, title: 'Eye gaze', fields: 'source, origin, direction, target_id' },
    { icon: Hand, title: 'Controller coordinates', fields: 'left/right position [x, y, z]' },
    { icon: Users, title: 'Audience coordinates', fields: 'audience[].position [x, y, z]' },
  ];
  return (
    <section className="vr-trace-panel">
      <div className="vr-trace-head">
        <div><span className="eyebrow">VR multimodal input</span><h3>One synchronized record every 5 seconds</h3><p>Use metres and a shared right-handed scene coordinate system.</p></div>
        <a className="secondary-button template-download" href="/vr-trace-template.json" download><Download size={15} /> Download JSON template</a>
      </div>
      <div className="vr-trace-body">
        <div className="trace-requirements">
          {requirements.map((item) => {
            const Icon = item.icon;
            return <div key={item.title}><span><Icon size={17} /></span><p><strong>{item.title}</strong><small>{item.fields}</small></p><Check size={14} /></div>;
          })}
        </div>
        {file ? (
          <div className="trace-ready">
            <span className="trace-file-icon"><FileJson size={22} /></span>
            <div><strong>{file.name}</strong><span>Schema valid · {summary?.recordCount || 0} records · {summary?.durationSeconds || 0}s</span></div>
            <button onClick={onRemove} aria-label={`Remove ${file.name}`}><X size={17} /></button>
          </div>
        ) : (
          <button className="trace-upload" onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept=".json,application/json" onChange={(event) => onFile(event.target.files?.[0])} hidden />
            <span><UploadCloud size={19} /></span>
            <p><strong>Upload VR trace JSON</strong><small>Validated before it enters the evaluation</small></p>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}

function FileDrop({ id, title, hint, icon: Icon, file, required, accept, onFile, onRemove, compact }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    onFile(event.dataTransfer.files?.[0]);
  };
  if (file) {
    return (
      <div className={compact ? 'file-ready compact' : 'file-ready'}>
        <span className="file-icon"><Check size={19} /></span>
        <div><strong>{file.name}</strong><span>{formatBytes(file.size)} · Ready</span></div>
        <button onClick={onRemove} aria-label={`Remove ${file.name}`}><X size={17} /></button>
      </div>
    );
  }
  return (
    <div
      className={`${compact ? 'file-drop compact' : 'file-drop'} ${dragging ? 'dragging' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter') inputRef.current?.click(); }}
    >
      <input id={id} ref={inputRef} type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0])} hidden />
      <span className="drop-icon"><Icon size={compact ? 20 : 24} /></span>
      <div><strong>{title}{required && <em>Required</em>}</strong><span>{hint}</span></div>
      <span className="browse-label">Browse</span>
    </div>
  );
}

function AttentionPage({ state, setState, notify }) {
  const [showReadiness, setShowReadiness] = useState(Boolean(state.readiness));

  const toggleEnabled = (id) => setState((current) => ({ ...current, enabled: { ...current.enabled, [id]: !current.enabled[id] }, readiness: null, results: null }));
  const updateWeight = (id, weight) => setState((current) => ({
    ...current,
    attentionWeights: { ...current.attentionWeights, [id]: Number(weight) },
    results: null,
  }));
  const toggleFocus = (areaId, focusId) => setState((current) => {
    const currentFocus = current.selectedFocus[areaId] || [];
    const nextFocus = currentFocus.includes(focusId) ? currentFocus.filter((item) => item !== focusId) : [...currentFocus, focusId];
    return { ...current, selectedFocus: { ...current.selectedFocus, [areaId]: nextFocus }, readiness: null, results: null };
  });
  const addFocus = (area, title, description) => {
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const duplicate = getFocusItems(state, area).some((focus) => focus.title.toLocaleLowerCase() === normalizedTitle.toLocaleLowerCase());
    if (duplicate) {
      notify('A focus with this title already exists in the section.', 'warning');
      return false;
    }
    const id = `custom-${area.id}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    const focus = { id, title: normalizedTitle, description: normalizedDescription, custom: true };
    setState((current) => ({
      ...current,
      customFocus: { ...current.customFocus, [area.id]: [...(current.customFocus[area.id] || []), focus] },
      selectedFocus: { ...current.selectedFocus, [area.id]: [...(current.selectedFocus[area.id] || []), id] },
      readiness: null,
      results: null,
    }));
    notify(`“${normalizedTitle}” was added and enabled.`, 'success');
    return true;
  };
  const removeFocus = (areaId, focusId) => {
    setState((current) => ({
      ...current,
      customFocus: { ...current.customFocus, [areaId]: (current.customFocus[areaId] || []).filter((focus) => focus.id !== focusId) },
      selectedFocus: { ...current.selectedFocus, [areaId]: (current.selectedFocus[areaId] || []).filter((id) => id !== focusId) },
      readiness: null,
      results: null,
    }));
    notify('Custom focus removed.', 'info');
  };
  const testModules = () => {
    const readiness = calculateReadiness(state);
    setState((current) => ({ ...current, readiness }));
    setShowReadiness(true);
    const missing = Object.entries(readiness).filter(([id, item]) => {
      const area = ATTENTION_AREAS.find((candidate) => candidate.id === id);
      return area && isAreaRunnable(state, area) && item.level === 'missing';
    }).length;
    notify(missing ? `${missing} enabled module${missing > 1 ? 's are' : ' is'} missing critical data.` : 'All enabled modules can run.', missing ? 'warning' : 'success');
  };
  const enabledCount = Object.values(state.enabled).filter(Boolean).length;
  const activeFocusCount = ATTENTION_AREAS.reduce((count, area) => count + (state.enabled[area.id] ? getEnabledFocusItems(state, area).length : 0), 0);

  return (
    <div className="attention-page">
      <div className="attention-toolbar">
        <div className="attention-summary">
          <span className="summary-number">{enabledCount}</span>
          <span>modules enabled<small>{activeFocusCount} active focus points across the framework.</small></span>
        </div>
        <div className="toolbar-actions">
          {showReadiness && <ReadinessLegend />}
          <button className="secondary-button" onClick={testModules}><Zap size={16} /> Test modules</button>
        </div>
      </div>

      <div className="attention-sections">
        {ATTENTION_AREAS.map((area) => (
          <AttentionSection
            key={area.id}
            area={area}
            enabled={state.enabled[area.id]}
            selected={state.selectedFocus[area.id] || []}
            weight={state.attentionWeights[area.id] || 3}
            focusItems={getFocusItems(state, area)}
            readiness={showReadiness ? state.readiness?.[area.id] : null}
            onToggle={() => toggleEnabled(area.id)}
            onFocus={(focusId) => toggleFocus(area.id, focusId)}
            onWeight={(weight) => updateWeight(area.id, weight)}
            onAdd={(title, description) => addFocus(area, title, description)}
            onRemove={(focusId) => removeFocus(area.id, focusId)}
          />
        ))}
      </div>
    </div>
  );
}

function AttentionSection({ area, enabled, selected, weight, focusItems, readiness, onToggle, onFocus, onWeight, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const Icon = area.icon;
  const activeCount = focusItems.filter((focus) => selected.includes(focus.id)).length;
  const submitFocus = (event) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (!onAdd(title, description)) return;
    setTitle('');
    setDescription('');
    setAdding(false);
  };

  return (
    <section className={`attention-section ${enabled ? '' : 'module-disabled'}`}>
      <header className="attention-section-head">
        <div className="section-identity">
          <span className={`area-icon ${area.tint}`}><Icon size={19} /></span>
          <div>
            <div className="area-code-row"><span>{area.code}</span>{area.kind === 'conditional' && <em>Conditional</em>}</div>
            <h2>{area.name}</h2>
            <p>{area.short}</p>
          </div>
        </div>
        <div className="section-module-control">
          {readiness ? <ReadinessBadge item={readiness} /> : <span>{activeCount}/{focusItems.length} focus enabled</span>}
          <label className="weight-control">
            <span>Integration weight</span>
            <input type="range" min="1" max="5" step="1" value={weight} onChange={(event) => onWeight(event.target.value)} aria-label={`${area.name} integration weight`} />
            <strong>{weight}/5</strong>
          </label>
          <div className="module-switch-label">
            <span>{enabled ? 'Enabled' : 'Disabled'}</span>
            <button type="button" className={`switch ${enabled ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Disable' : 'Enable'} ${area.name}`}><span /></button>
          </div>
        </div>
      </header>

      <div className="attention-section-body">
        <div className="focus-section-heading">
          <div><strong>Focus points</strong><span>{area.description}</span></div>
          <button type="button" className="text-button add-focus-button" onClick={() => setAdding((value) => !value)} aria-expanded={adding}>
            {adding ? <X size={15} /> : <Plus size={15} />}{adding ? 'Cancel' : 'Add focus'}
          </button>
        </div>

        {adding && (
          <form className="focus-add-form" onSubmit={submitFocus}>
            <label>
              <span>Focus title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Explaining technical terms" maxLength={80} autoFocus />
            </label>
            <label className="focus-explanation-field">
              <span>Explanation</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe exactly what the agent should inspect and why it matters." maxLength={240} rows={2} />
            </label>
            <button className="primary-button" type="submit" disabled={!title.trim() || !description.trim()}><Plus size={15} /> Add & enable</button>
          </form>
        )}

        <div className="focus-rows">
          {focusItems.map((focus) => {
            const focusEnabled = selected.includes(focus.id);
            return (
              <div key={focus.id} className={`focus-row ${focusEnabled ? '' : 'focus-disabled'}`}>
                <div className="focus-copy">
                  <div><strong>{focus.title}</strong>{focus.custom && <span className="custom-badge">Custom</span>}</div>
                  <p>{focus.description}</p>
                </div>
                <div className="focus-row-actions">
                  {focus.custom && <button type="button" className="remove-focus" onClick={() => onRemove(focus.id)} aria-label={`Remove ${focus.title}`} title="Remove custom focus"><X size={15} /></button>}
                  <button type="button" className={`switch focus-switch ${focusEnabled ? 'on' : ''}`} onClick={() => onFocus(focus.id)} role="switch" aria-checked={focusEnabled} aria-label={`${focusEnabled ? 'Disable' : 'Enable'} ${focus.title}`}><span /></button>
                </div>
              </div>
            );
          })}
        </div>
        {!activeCount && <div className="no-focus-warning"><CircleAlert size={15} /> Enable at least one focus point for this agent to run.</div>}
      </div>
    </section>
  );
}

function FeedbackPage({ state, running, runStage, runEvaluation, setPage }) {
  const [view, setView] = useState('tutor');
  const [expanded, setExpanded] = useState(0);
  const stages = ['Preparing shared evidence', 'Running attention agents', 'Merging overlapping findings', 'Planning actionable feedback'];

  if (running) {
    return (
      <div className="run-state">
        <div className="run-orbit"><Bot size={27} /><span /><span /></div>
        <span className="eyebrow">Evaluation in progress</span>
        <h2>{stages[runStage]}</h2>
        <p>Each enabled agent sees only its attention area. An adjudicator removes overlap before feedback is written.</p>
        <div className="stage-list">
          {stages.map((stage, index) => <div key={stage} className={index < runStage ? 'done' : index === runStage ? 'active' : ''}><span>{index < runStage ? <Check size={13} /> : index + 1}</span>{stage}</div>)}
        </div>
      </div>
    );
  }

  if (!state.results) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><ClipboardCheck size={28} /></span>
        <h2>No evaluation yet</h2>
        <p>Upload a transcript, choose attention areas, then run the evaluation.</p>
        <div><button className="secondary-button" onClick={() => setPage('input')}>Review input</button><button className="primary-button" onClick={runEvaluation}><Play size={16} /> Run evaluation</button></div>
      </div>
    );
  }

  const { results } = state;
  const strengths = results.strengths || [];
  return (
    <div className="feedback-page">
      <div className="feedback-summary-card">
        <div className="summary-main">
          <span className="success-ring"><Check size={18} /></span>
          <div><span className="eyebrow">Run complete</span><h2>{state.session.title || 'Untitled performance'}</h2><p>{results.modelNote}</p></div>
        </div>
        <div className="summary-stats">
          <div><strong>{results.findings.length}</strong><span>priorities</span></div>
          <div><strong>{results.coverage}</strong><span>coverage</span></div>
          <div><strong>{results.overallConfidence}</strong><span>confidence</span></div>
        </div>
      </div>

      <div className="feedback-view-switch" role="tablist">
        <button className={view === 'tutor' ? 'active' : ''} onClick={() => setView('tutor')}><FileText size={16} /> Tutor report</button>
        <button className={view === 'verbal' ? 'active' : ''} onClick={() => setView('verbal')}><Volume2 size={16} /> Verbal coach</button>
      </div>

      {view === 'tutor' ? (
        <div className="tutor-layout">
          <section className="findings-panel">
            <div className="report-heading"><div><span className="eyebrow">Prioritized feedback</span><h2>What to work on next</h2></div><span>{results.findings.length} evidence-linked items</span></div>
            <div className="finding-list">
              {results.findings.map((finding, index) => (
                <article key={`${finding.area}-${index}`} className={expanded === index ? 'finding-card expanded' : 'finding-card'}>
                  <button className="finding-head" onClick={() => setExpanded(expanded === index ? -1 : index)}>
                    <span className={`priority priority-${finding.priority}`}>{index + 1}</span>
                    <div><span className="finding-area">{finding.area}</span><h3>{finding.title}</h3></div>
                    <span className={`confidence confidence-${confidenceLevel(finding).toLowerCase()}`}>{confidenceLevel(finding)}</span>
                    <ChevronDown size={17} />
                  </button>
                  {expanded === index && (
                    <div className="finding-body">
                      <RichFindingContent finding={finding} />
                    </div>
                  )}
                </article>
              ))}
            </div>
            <StrengthList strengths={strengths} />
          </section>
          <aside className="coverage-panel">
            <div className="panel-title"><div><span className="eyebrow">Agent coverage</span><h2>Evidence limits</h2></div><Gauge size={19} /></div>
            <div className="coverage-list">
              {ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area)).map((area) => {
                const item = state.readiness?.[area.id] || { level: 'partial', reason: 'Not tested' };
                return <div key={area.id} className="coverage-row"><ReadinessDot level={item.level} /><div><strong>{area.name}</strong><span>{item.reason}</span></div></div>;
              })}
            </div>
            <div className="confidence-callout"><ShieldCheck size={18} /><div><strong>Confidence is evidence-specific</strong><span>Low-confidence observations are withheld from learner-facing verbal feedback.</span></div></div>
          </aside>
        </div>
      ) : (
        <div className="verbal-layout">
          <section className="verbal-script">
            <div className="verbal-label"><span className="pulse-dot" /> 45-second coaching script</div>
            <blockquote>{results.verbalFeedback}</blockquote>
            <div className="verbal-actions"><button className="primary-button" onClick={() => speakText(results.verbalFeedback)}><Volume2 size={16} /> Play feedback</button><span>Short, encouraging and limited to two actions.</span></div>
          </section>
          <aside className="next-run-card"><span className="eyebrow">Next-run target</span><h2>{results.nextRun.title}</h2><p>{results.nextRun.instruction}</p><div className="target-check"><Check size={16} /><span>{results.nextRun.success}</span></div></aside>
        </div>
      )}
    </div>
  );
}

function ExperimentPage({ state, setState, notify }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [runningIds, setRunningIds] = useState([]);
  const audioFilesRef = useRef(new Map());
  const experiment = state.experiment;
  const structuredAreas = ATTENTION_AREAS.filter((area) => EXPERIMENT_STRUCTURED_AREAS.includes(area.id));
  const audioAreas = ATTENTION_AREAS.filter((area) => EXPERIMENT_AUDIO_AREAS.includes(area.id));
  const selectedCount = experiment.selectedDatasetIds.length;
  const configuredRoute = experiment.modelRoute === 'configured-text';
  const routeLabel = configuredRoute
    ? `${state.config.text.provider === 'openai' ? 'API' : 'Local Mock'} · ${state.config.text.model}`
    : 'Forced Local Mock';
  const multimodalReady = isRemoteConfigReady(state.config.multimodal);

  const updateExperiment = (patchValue) => setState((current) => ({
    ...current,
    experiment: { ...current.experiment, ...patchValue },
  }));

  const updateDataset = (datasetId, field, value) => setState((current) => ({
    ...current,
    experiment: {
      ...current.experiment,
      datasets: current.experiment.datasets.map((dataset) => (dataset.id === datasetId ? { ...dataset, [field]: value } : dataset)),
    },
  }));

  const toggleDataset = (datasetId) => {
    const selected = new Set(experiment.selectedDatasetIds);
    if (selected.has(datasetId)) selected.delete(datasetId); else selected.add(datasetId);
    updateExperiment({ selectedDatasetIds: [...selected] });
  };

  const toggleArea = (areaId) => {
    const selected = new Set(experiment.selectedAreaIds);
    if (selected.has(areaId)) selected.delete(areaId); else selected.add(areaId);
    updateExperiment({ selectedAreaIds: [...selected] });
  };

  const updateExperimentWeight = (areaId, value) => updateExperiment({
    attentionWeights: { ...experiment.attentionWeights, [areaId]: Number(value) },
  });

  const resetDataset = (datasetId) => {
    const original = DEFAULT_EXPERIMENT_DATASETS.find((dataset) => dataset.id === datasetId);
    if (!original) return;
    audioFilesRef.current.delete(datasetId);
    setState((current) => ({
      ...current,
      experiment: {
        ...current.experiment,
        datasets: current.experiment.datasets.map((dataset) => (dataset.id === datasetId ? { ...original } : dataset)),
      },
    }));
    notify(`${original.label} restored to the supplied mock data.`, 'info');
  };

  const importVrTrace = async (datasetId, file) => {
    if (!file) return;
    try {
      const trace = JSON.parse(await file.text());
      const validation = validateVrTrace(trace);
      if (!validation.valid) throw new Error(validation.errors[0]);
      setState((current) => ({
        ...current,
        experiment: {
          ...current.experiment,
          datasets: current.experiment.datasets.map((dataset) => (dataset.id === datasetId ? {
            ...dataset,
            vrTrace: trace,
            vrTraceSummary: validation.summary,
            vrTraceFile: { name: file.name, size: file.size, type: file.type || 'application/json' },
          } : dataset)),
        },
      }));
      notify(`VR trace validated: ${validation.summary.recordCount} synchronized five-second records.`, 'success');
    } catch (error) {
      notify(`VR trace import failed: ${error.message}`, 'error');
    }
  };

  const importDataset = async (datasetId, file) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.json')) {
        const imported = JSON.parse(text);
        if (!imported.transcript || typeof imported.transcript !== 'string') throw new Error('JSON must contain a transcript string.');
        const allowed = ['title', 'learner', 'topic', 'audience', 'level', 'taskBrief', 'transcript', 'designedSignals'];
        setState((current) => ({
          ...current,
          experiment: {
            ...current.experiment,
            datasets: current.experiment.datasets.map((dataset) => {
              if (dataset.id !== datasetId) return dataset;
              const fields = Object.fromEntries(allowed.filter((key) => imported[key] !== undefined).map((key) => [key, imported[key]]));
              return { ...dataset, ...fields, importedFile: { name: file.name, size: file.size, type: file.type || 'application/json' } };
            }),
          },
        }));
      } else {
        updateDataset(datasetId, 'transcript', text);
        updateDataset(datasetId, 'importedFile', { name: file.name, size: file.size, type: file.type || 'text/plain' });
      }
      notify(`${file.name} imported into the selected mock dataset.`, 'success');
    } catch (error) {
      notify(`Dataset import failed: ${error.message}`, 'error');
    }
  };

  const attachAudio = (datasetId, file) => {
    if (!file) return;
    audioFilesRef.current.set(datasetId, file);
    updateDataset(datasetId, 'audio', { name: file.name, size: file.size, type: file.type || 'audio/*', updatedAt: Date.now() });
    notify(multimodalReady
      ? `${file.name} attached. The configured multimodal model will be attempted on the next run.`
      : `${file.name} attached. Configure the multimodal endpoint before running audio agents.`, multimodalReady ? 'success' : 'info');
  };

  const removeAudio = (datasetId) => {
    audioFilesRef.current.delete(datasetId);
    updateDataset(datasetId, 'audio', null);
  };

  const runDatasets = async (datasetIds) => {
    const ids = datasetIds.filter((id) => experiment.selectedDatasetIds.includes(id));
    if (!ids.length) {
      notify('Select at least one dataset before running the experiment.', 'warning');
      return;
    }
    if (!experiment.selectedAreaIds.some((id) => EXPERIMENT_STRUCTURED_AREAS.includes(id))) {
      notify('Enable at least one transcript or structured-VR agent in Experiment configuration.', 'warning');
      setConfigOpen(true);
      return;
    }
    setRunningIds(ids);
    for (const datasetId of ids) {
      const dataset = experiment.datasets.find((item) => item.id === datasetId);
      if (!dataset?.transcript.trim()) continue;
      const audioFile = audioFilesRef.current.get(datasetId) || null;
      const useAudio = Boolean(audioFile && multimodalReady && experiment.selectedAreaIds.some((id) => EXPERIMENT_AUDIO_AREAS.includes(id)));
      const evaluationState = createExperimentEvaluationState(state, experiment, dataset, useAudio);
      const readiness = calculateReadiness(evaluationState);
      let results;
      let modelNote;
      try {
        results = await runExperimentPipeline(evaluationState, readiness, {
          forceLocalText: experiment.modelRoute === 'local-mock',
          audioFile,
          audioAttachedMetadata: Boolean(dataset.audio),
          multimodalReady,
        });
        modelNote = results.pipelineNote;
      } catch (error) {
        results = buildLocalResults(evaluationState, readiness);
        results.agentOutputs = (results.agentOutputs || []).filter((output) => EXPERIMENT_TEXT_AREAS.includes(output.areaId));
        const fallbackTextAreas = new Set(results.agentOutputs.map((output) => output.areaName));
        results.findings = (results.findings || []).filter((finding) => fallbackTextAreas.has(finding.area));
        modelNote = `Configured pipeline was unavailable; local transcript evaluator used (${error.message}).`;
        results.integrationScope = 'text-chain-only';
        results.vrStatus = audioFile ? 'failed' : 'not-uploaded';
        results.vrStatusMessage = audioFile ? `Timestamped VR route failed: ${error.message}` : 'No real recording uploaded for timestamp alignment.';
        results.audioStatus = audioFile ? 'failed' : 'not-uploaded';
        results.audioStatusMessage = audioFile ? `Multimodal attempt failed: ${error.message}` : 'No real recording uploaded for this run.';
      }
      const completedAt = new Date().toISOString();
      const feedback = {
        ...results,
        completedAt,
        modelNote,
        datasetSnapshot: { ...dataset, audio: dataset.audio ? { ...dataset.audio } : null },
        experimentConfig: {
          name: experiment.name,
          modelRoute: experiment.modelRoute,
          selectedAreaIds: [...experiment.selectedAreaIds],
          attentionWeights: { ...experiment.attentionWeights },
          structuredVrIncluded: true,
          vrStatus: results.vrStatus,
          audioStatus: results.audioStatus,
        },
      };
      const historyEntry = {
        ...createHistoryEntry(evaluationState, readiness, feedback),
        id: `3mt-experiment:${datasetId}`,
        source: '3mt-experiment',
        experimentDatasetId: datasetId,
        datasetLabel: dataset.label,
      };
      setState((current) => ({
        ...current,
        history: [
          historyEntry,
          ...(current.history || []).filter((entry) => entry.experimentDatasetId !== datasetId),
        ].slice(0, HISTORY_LIMIT),
        experiment: {
          ...current.experiment,
          feedbackByDataset: { ...current.experiment.feedbackByDataset, [datasetId]: feedback },
          lastRunAt: completedAt,
        },
      }));
      setRunningIds((current) => current.filter((id) => id !== datasetId));
    }
    setRunningIds([]);
    notify('Selected 3MT datasets now have separate transcript, VR and conditional-audio feedback records.', 'success');
  };

  return (
    <div className="experiment-page">
      <section className="experiment-hero">
        <div>
          <span className="eyebrow">Controlled mock-data study</span>
          <h2>{experiment.name}</h2>
          <p>Editable transcript + five-second VR traces · optional real audio through the configured multimodal model.</p>
        </div>
        <div className="experiment-hero-actions">
          <div className="experiment-route-chip"><FileText size={15} /><span><small>Evaluation route</small><strong>{routeLabel}</strong></span></div>
          <div className={`experiment-route-chip multimodal ${multimodalReady ? 'ready' : ''}`}><Headphones size={15} /><span><small>Audio route</small><strong>{multimodalReady ? state.config.multimodal.model : 'Not configured · skipped'}</strong></span></div>
          <button className="secondary-button" onClick={() => setConfigOpen((open) => !open)}><SlidersHorizontal size={16} /> Configure experiment</button>
          <button className="primary-button" onClick={() => runDatasets(experiment.selectedDatasetIds)} disabled={runningIds.length > 0}><Play size={16} /> {runningIds.length ? `Running ${runningIds.length}` : `Run ${selectedCount} datasets`}</button>
        </div>
      </section>

      {configOpen && (
        <section className="experiment-config-panel">
          <div className="experiment-config-head"><div><span className="eyebrow">Experiment configuration</span><h3>Multi-agent evidence routing</h3></div><button className="text-button" onClick={() => setConfigOpen(false)}><X size={15} /> Close</button></div>
          <div className="experiment-config-grid">
            <FormField label="Experiment name"><input value={experiment.name} onChange={(event) => updateExperiment({ name: event.target.value })} /></FormField>
            <FormField label="Model route" hint="Multimodal configuration remains available on the Config page.">
              <select value={experiment.modelRoute} onChange={(event) => updateExperiment({ modelRoute: event.target.value })}>
                <option value="configured-text">Use configured text model</option>
                <option value="local-mock">Force Local Mock</option>
              </select>
            </FormField>
          </div>
          <div className="experiment-agent-config">
            <div><strong>Transcript + structured VR agents</strong><span>Embodied Communication reads numeric VR JSON through the text route; no image/video model is required.</span></div>
            <div className="experiment-agent-grid">
              {structuredAreas.map((area) => {
                const enabled = experiment.selectedAreaIds.includes(area.id);
                return (
                  <article key={area.id} className={enabled ? 'enabled' : ''}>
                    <button type="button" className={`switch ${enabled ? 'on' : ''}`} onClick={() => toggleArea(area.id)} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Disable' : 'Enable'} experiment ${area.name}`}><span /></button>
                    <div><small>{area.code}</small><strong>{area.name}</strong></div>
                    <label><span>Weight</span><input type="range" min="1" max="5" value={experiment.attentionWeights[area.id]} onChange={(event) => updateExperimentWeight(area.id, event.target.value)} disabled={!enabled} /><b>{experiment.attentionWeights[area.id]}/5</b></label>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="experiment-agent-config audio-agent-config">
            <div><strong>Conditional audio agents</strong><span>These agents run only when this dataset has a live audio upload and the separate Multimodal endpoint is fully configured.</span></div>
            <div className="experiment-agent-grid audio-agent-grid">
              {audioAreas.map((area) => {
                const enabled = experiment.selectedAreaIds.includes(area.id);
                return (
                  <article key={area.id} className={enabled ? 'enabled' : ''}>
                    <button type="button" className={`switch ${enabled ? 'on' : ''}`} onClick={() => toggleArea(area.id)} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Disable' : 'Enable'} experiment ${area.name}`}><span /></button>
                    <div><small>{area.code} · Multimodal</small><strong>{area.name}</strong></div>
                    <label><span>Weight</span><input type="range" min="1" max="5" value={experiment.attentionWeights[area.id]} onChange={(event) => updateExperimentWeight(area.id, event.target.value)} disabled={!enabled} /><b>{experiment.attentionWeights[area.id]}/5</b></label>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="text-only-rule"><ShieldCheck size={17} /><div><strong>Evidence routing rule</strong><span>Transcript and VR JSON go to text agents. Raw audio is sent only to the configured multimodal endpoint; without a complete configuration, audio calls are skipped and the feedback slot explains why.</span></div></div>
        </section>
      )}

      <section className="experiment-dataset-list">
        {experiment.datasets.map((dataset, index) => {
          const selected = experiment.selectedDatasetIds.includes(dataset.id);
          const feedback = experiment.feedbackByDataset[dataset.id];
          const isRunning = runningIds.includes(dataset.id);
          return (
            <article className={`experiment-dataset ${selected ? 'selected' : ''}`} key={dataset.id}>
              <header className="dataset-head">
                <div className="dataset-identity"><span>{String(index + 1).padStart(2, '0')}</span><div><small>{dataset.label}</small><h3>{dataset.title}</h3><p>{dataset.topic}</p></div></div>
                <div className="dataset-head-actions">
                  <label className="dataset-select"><input type="checkbox" checked={selected} onChange={() => toggleDataset(dataset.id)} /><span>Include in experiment</span></label>
                  <button className="text-button" onClick={() => resetDataset(dataset.id)}><RefreshCw size={14} /> Reset data</button>
                  <button className="primary-button compact-button" onClick={() => runDatasets([dataset.id])} disabled={!selected || runningIds.length > 0}>{isRunning ? <LoaderCircle className="spin" size={15} /> : <Play size={14} />}{isRunning ? 'Running' : 'Run dataset'}</button>
                </div>
              </header>

              <div className="dataset-edit-grid">
                <div className="dataset-fields">
                  <div className="dataset-field-row">
                    <FormField label="Presentation title"><input value={dataset.title} onChange={(event) => updateDataset(dataset.id, 'title', event.target.value)} /></FormField>
                    <FormField label="Learner ID"><input value={dataset.learner} onChange={(event) => updateDataset(dataset.id, 'learner', event.target.value)} /></FormField>
                  </div>
                  <div className="dataset-field-row three">
                    <FormField label="Research topic"><input value={dataset.topic} onChange={(event) => updateDataset(dataset.id, 'topic', event.target.value)} /></FormField>
                    <FormField label="Audience"><input value={dataset.audience} onChange={(event) => updateDataset(dataset.id, 'audience', event.target.value)} /></FormField>
                    <FormField label="CEFR target"><input value={dataset.level} onChange={(event) => updateDataset(dataset.id, 'level', event.target.value)} /></FormField>
                  </div>
                  <FormField label="3MT task brief"><textarea value={dataset.taskBrief} onChange={(event) => updateDataset(dataset.id, 'taskBrief', event.target.value)} /></FormField>
                  <FormField label="Simulated transcript" hint={`${countWords(dataset.transcript)} words · editable before every run`}><textarea className="dataset-transcript" value={dataset.transcript} onChange={(event) => updateDataset(dataset.id, 'transcript', event.target.value)} /></FormField>
                </div>

                <aside className="dataset-files-panel">
                  <div><span className="eyebrow">Test files</span><h4>Download or replace inputs</h4><p>The supplied files reproduce this dataset outside the interface.</p></div>
                  <a className="secondary-button full-width" href={dataset.downloadUrl} download><FileDown size={15} /> Download dataset JSON</a>
                  <a className="secondary-button full-width" href={dataset.transcriptUrl} download><FileText size={15} /> Download transcript TXT</a>
                  <label className="secondary-button full-width upload-label"><UploadCloud size={15} /> Upload JSON or transcript<input type="file" accept=".json,.txt,text/plain,application/json" onChange={(event) => importDataset(dataset.id, event.target.files?.[0])} hidden /></label>
                  {dataset.importedFile && <div className="dataset-file-status"><CheckCircle2 size={14} /><span><strong>{dataset.importedFile.name}</strong><small>{formatBytes(dataset.importedFile.size)} imported</small></span></div>}
                  <div className="vr-file-slot">
                    <ScanEye size={19} />
                    <div><strong>Structured VR trace · 5-second samples</strong><span>Headset/controller position and rotation, gaze target, audience coordinates and gesture events.</span></div>
                    <a href={dataset.vrTraceUrl} download><FileDown size={14} /> Download VR JSON</a>
                    <label><UploadCloud size={14} /> Replace VR JSON<input type="file" accept=".json,application/json" onChange={(event) => importVrTrace(dataset.id, event.target.files?.[0])} hidden /></label>
                  </div>
                  <div className="vr-summary-strip"><span><b>{dataset.vrTraceSummary?.recordCount || 0}</b> records</span><span><b>{Math.round((dataset.vrTraceSummary?.audienceGazeRate || 0) * 100)}%</b> audience gaze</span><span><b>{dataset.vrTraceSummary?.gestureEventCount || 0}</b> gestures</span></div>
                  {dataset.vrTraceFile && <div className="dataset-file-status"><CheckCircle2 size={14} /><span><strong>{dataset.vrTraceFile.name}</strong><small>{formatBytes(dataset.vrTraceFile.size)} · validated replacement</small></span></div>}
                  <div className="future-audio-slot">
                    <Headphones size={19} />
                    <div><strong>Real recording · multimodal input</strong><span>{multimodalReady ? 'The next run will attempt Fluency and Pronunciation agents.' : 'Endpoint not configured: file can be attached, but no audio request will be sent.'}</span></div>
                    <label><UploadCloud size={14} /> {dataset.audio ? 'Replace' : 'Upload audio'}<input type="file" accept="audio/*" onChange={(event) => attachAudio(dataset.id, event.target.files?.[0])} hidden /></label>
                  </div>
                  {dataset.audio && <div className="dataset-file-status audio"><FileAudio size={14} /><span><strong>{dataset.audio.name}</strong><small>{formatBytes(dataset.audio.size)} · {audioFilesRef.current.has(dataset.id) ? (multimodalReady ? 'ready for multimodal call' : 'waiting for configuration') : 're-upload required after reload'}</small></span><button onClick={() => removeAudio(dataset.id)} aria-label={`Remove ${dataset.audio.name}`}><X size={14} /></button></div>}
                  <div className="designed-signals"><span>Designed test signals</span>{dataset.designedSignals.map((signal) => <small key={signal}>{signal}</small>)}</div>
                </aside>
              </div>

              <ExperimentFeedback dataset={dataset} feedback={feedback} />
            </article>
          );
        })}
      </section>
    </div>
  );
}

function RichFindingContent({ finding, compact = false }) {
  const evidence = findingEvidenceItems(finding);
  const revisions = Array.isArray(finding.revisionOptions) ? finding.revisionOptions : [];
  const confidenceReason = finding.confidenceDetail?.reason || finding.confidence?.reason;
  return (
    <div className={`rich-finding-content ${compact ? 'compact' : ''}`}>
      <div className="evidence-quote"><span>Evidence · {finding.occurrenceCount || evidence.length || 1} occurrence(s)</span>{evidence.length ? evidence.map((item, index) => <q key={`${item.sentenceIndex}-${index}`}>{Number.isFinite(Number(item.sentenceIndex)) ? `S${Number(item.sentenceIndex) + 1}: ` : ''}{item.quote}</q>) : <q>{findingEvidenceText(finding)}</q>}</div>
      <div className="why-action"><div><span>Diagnosis</span><p>{finding.diagnosis || findingImpactText(finding)}</p></div><div><span>Why it matters here</span><p>{findingImpactText(finding)}</p></div></div>
      {revisions.length ? <div className="revision-options"><span>Usable revisions</span><ol>{revisions.map((revision, index) => <li key={`${revision}-${index}`}>{revision}</li>)}</ol></div> : null}
      <div className="practice-grid"><div className="action-box"><span>Rehearsal</span><p>{findingActionText(finding)}</p></div><div className="success-box"><span>Success criterion</span><p>{findingSuccessText(finding) || 'Apply this change consistently in the next run.'}</p></div></div>
      {confidenceReason ? <p className="confidence-reason"><b>{confidenceLevel(finding)} confidence:</b> {confidenceReason}</p> : null}
    </div>
  );
}

function StrengthList({ strengths = [] }) {
  if (!strengths.length) return null;
  return <section className="strength-list"><div className="feedback-column-title"><CheckCircle2 size={16} /><div><strong>Strengths to preserve</strong><span>Evidence-supported features kept separate from improvement priorities.</span></div></div>{strengths.map((finding) => <article key={finding.findingId || finding.title}><div><small>{finding.area || finding.areaName} · {confidenceLevel(finding)} confidence</small><strong>{finding.title}</strong><blockquote>{findingEvidenceText(finding)}</blockquote><p>{finding.diagnosis || findingImpactText(finding)}</p></div></article>)}</section>;
}

function DirectRouteSection({ chain, title, subtitle, status, message, outputs, icon: Icon, metrics, alignment }) {
  const findings = outputs.flatMap((output) => (output.findings || []).map((finding) => ({ ...finding, areaName: output.areaName, weight: output.weight })));
  return (
    <section className={`direct-route-result ${status || 'not-run'}`}>
      <div className="direct-route-head"><span className="route-chain-label">Chain {chain}</span><Icon size={19} /><div><strong>{title}</strong><small>{subtitle}</small></div><i>{status === 'analysed' ? 'Analysed' : status || 'Not run'}</i></div>
      {metrics}
      {findings.length ? <div className="direct-route-findings">{findings.map((finding, index) => (
        <article key={`${finding.areaName}-${finding.title}-${index}`}><small>{finding.areaName} · weight {finding.weight || 3}/5 · {confidenceLevel(finding)} confidence</small><strong>{finding.title}</strong><blockquote>{findingEvidenceText(finding)}</blockquote>{findingImpactText(finding) && <p><b>Why:</b> {findingImpactText(finding)}</p>}<p><b>Action:</b> {findingActionText(finding)}</p></article>
      ))}</div> : <p className="slot-message">{message}</p>}
      {alignment && <details className="alignment-audit"><summary><span>Timestamp alignment audit</span><small>{alignment.official_transcript_segments?.length || 0} official segments · {Math.round((alignment.comparison?.matched_word_ratio || 0) * 100)}% word anchors</small><ChevronDown size={14} /></summary><div>{(alignment.official_transcript_segments || []).map((segment) => <p key={segment.id}><b>{formatMilliseconds(segment.start_ms)}–{formatMilliseconds(segment.end_ms)}</b><span>{segment.text}</span><em>{segment.timestamp_source}</em></p>)}</div></details>}
    </section>
  );
}

function formatMilliseconds(milliseconds) {
  const totalSeconds = Math.max(0, Number(milliseconds || 0)) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${(totalSeconds % 60).toFixed(1).padStart(4, '0')}`;
}

function ExperimentFeedback({ dataset, feedback }) {
  const [showAllIntegrated, setShowAllIntegrated] = useState(false);
  const printRef = useRef(null);
  useEffect(() => setShowAllIntegrated(false), [feedback?.completedAt]);
  if (!feedback) {
    return <section className="experiment-feedback empty"><ClipboardCheck size={21} /><div><strong>No feedback run saved for {dataset.label}</strong><span>Edit the data or configuration, then run this dataset. Its result will remain here for review.</span></div></section>;
  }
  const textOutputs = (feedback.agentOutputs || []).filter((agent) => EXPERIMENT_TEXT_AREAS.includes(agent.areaId));
  const vrOutputs = (feedback.agentOutputs || []).filter((agent) => agent.areaId === 'embodied');
  const audioOutputs = (feedback.agentOutputs || []).filter((agent) => EXPERIMENT_AUDIO_AREAS.includes(agent.areaId));
  const vrSummary = feedback.datasetSnapshot?.vrTraceSummary || dataset.vrTraceSummary;
  const audioStatus = feedback.audioStatus || 'not-uploaded';
  const allIntegratedFindings = feedback.findings || [];
  const strengths = feedback.strengths || [];
  const visibleIntegratedFindings = showAllIntegrated ? allIntegratedFindings : allIntegratedFindings.slice(0, 5);
  const printFeedback = () => {
    const wasShowingAll = showAllIntegrated;
    setShowAllIntegrated(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      printElementAsPdf(printRef.current, `${dataset.label} · ${dataset.title || '3MT evaluation'}`);
      if (!wasShowingAll) setShowAllIntegrated(false);
    }));
  };
  return (
    <section className="experiment-feedback" ref={printRef}>
      <header><div><span className="eyebrow">Saved dataset feedback</span><h4>{dataset.label} · three-route evaluation</h4><p>{new Date(feedback.completedAt).toLocaleString()} · {feedback.modelNote}</p></div><div className="feedback-header-actions"><div className="feedback-summary-pills"><span>{textOutputs.length} text agents</span><span>{feedback.findings?.length || 0} integrated</span><span>{feedback.overallConfidence} confidence</span></div><button className="print-feedback-button" data-no-print onClick={printFeedback}><Printer size={15} />Print / PDF</button></div></header>
      <div className="experiment-feedback-grid">
        <div className="experiment-findings">
          <div className="feedback-column-title"><GitMerge size={15} /><div><strong>Chain 1 · Integrated text feedback</strong><span>Only transcript language agents enter Integration.</span></div></div>
          {visibleIntegratedFindings.map((finding, index) => (
            <article key={`${finding.area}-${finding.title}-${index}`}>
              <span>{index + 1}</span>
              <div><small>{finding.area} · weight {finding.attentionWeight || 3}/5 · score {finding.rankingScore || 'legacy'} · {confidenceLevel(finding)}</small><strong>{finding.title}</strong><RichFindingContent finding={finding} compact /></div>
            </article>
          ))}
          {allIntegratedFindings.length > 5 && (
            <button className="show-all-feedback" onClick={() => setShowAllIntegrated((current) => !current)}>
              {showAllIntegrated ? 'Show top five' : `Show all ${allIntegratedFindings.length} integrated findings`}
            </button>
          )}
          <StrengthList strengths={strengths} />
        </div>
        <aside className="experiment-feedback-side">
          <div className="experiment-verbal"><Volume2 size={17} /><div><strong>Chain 1 · Concise coaching feedback</strong><p>{feedback.verbalFeedback}</p></div></div>
          <DirectRouteSection chain="2" title="Aligned VR evaluation" subtitle="Qwen timestamps → official transcript → VR text agent" status={feedback.vrStatus || (vrOutputs.length ? 'analysed' : 'not-run')} message={feedback.vrStatusMessage || 'Upload audio and enable Embodied Communication to run this route.'} outputs={vrOutputs} icon={ScanEye} alignment={feedback.timestampAlignment} metrics={vrSummary && <div className="feedback-metric-row"><span><b>{Math.round(vrSummary.audienceGazeRate * 100)}%</b> audience gaze</span><span><b>{vrSummary.audienceTargets}</b> audience targets</span><span><b>{vrSummary.gestureEventCount}</b> gestures</span></div>} />
          <DirectRouteSection chain="3" title="Direct multimodal speech evaluation" subtitle="Qwen audio evaluation · not sent to Integration" status={audioStatus} message={feedback.audioStatusMessage || 'Upload a recording and configure the multimodal endpoint to activate this route.'} outputs={audioOutputs} icon={Headphones} />
          <IntegrationDecisionList decisions={feedback.decisions || []} outputs={textOutputs} candidates={feedback.integrationCandidates || []} />
          <ProviderResponseList integrationResponse={feedback.integrationProviderRawResponse} outputs={feedback.agentOutputs || []} extraResponses={[
            ...(feedback.timestampTranscription?.providerRawResponse ? [{ id: 'timestamp-transcription', label: 'Qwen timestamp transcription', content: feedback.timestampTranscription.providerRawResponse }] : []),
            ...(audioOutputs[0]?.providerRawResponse ? [{ id: 'direct-speech', label: 'Qwen direct speech evaluation', content: audioOutputs[0].providerRawResponse }] : []),
          ]} />
          <AgentRawOutputList outputs={[...textOutputs, ...vrOutputs, ...audioOutputs]} />
        </aside>
      </div>
    </section>
  );
}

function AgentAuditList({ title, outputs, compact = false }) {
  return (
    <div className={`experiment-agent-audit ${compact ? 'compact' : ''}`}>
      <strong>{title}</strong>
      {outputs.map((agent) => <details key={agent.areaId}><summary><span>{agent.areaName}</span><small>Weight {agent.weight}/5 · {agent.findings?.length || 0} finding(s) · {agent.focusAudits?.length || 0} audited focus(es)</small><ChevronDown size={14} /></summary><div>{agent.findings?.length ? agent.findings.map((finding, index) => <p key={`${finding.title}-${index}`}><b>{finding.title}:</b> {findingActionText(finding)}</p>) : <p>No supported finding returned.</p>}</div></details>)}
    </div>
  );
}

function IntegrationDecisionList({ decisions, outputs, candidates: storedCandidates = [] }) {
  const reconstructedCandidates = collectIntegrationCandidates(outputs);
  const candidateItems = storedCandidates.length ? storedCandidates : reconstructedCandidates;
  const candidates = new Map(candidateItems.map((candidate) => [candidate.candidateId, candidate]));
  const displayDecisions = completeIntegrationDecisions(candidateItems, decisions);
  const decisionCounts = displayDecisions.reduce((counts, decision) => ({ ...counts, [decision.decision]: (counts[decision.decision] || 0) + 1 }), {});
  return (
    <details className="feedback-audit-layer">
      <summary className="feedback-slot-head"><GitMerge size={19} /><div><strong>Complete Integration decision ledger</strong><span>{decisionCounts.retained || 0} retained · {decisionCounts.merged || 0} merged · {decisionCounts.rejected || 0} rejected{decisionCounts.unreported ? ` · ${decisionCounts.unreported} unreported` : ''}</span></div><i>{displayDecisions.length}/{candidateItems.length}</i></summary>
      {displayDecisions.length ? <div className="decision-list">{displayDecisions.map((decision, index) => {
        const candidate = candidates.get(decision.candidateId);
        return <article key={`${decision.candidateId}-${index}`}><span className={`decision-state ${decision.decision}`}>{decision.decision}</span><div><strong>{candidate?.title || decision.candidateId}</strong><small>{candidate?.areaName || 'Candidate'} · {decision.candidateId}{decision.integratedRank ? ` · integrated rank ${decision.integratedRank}` : ''}</small><p>{decision.reason}</p>{decision.mergedIntoCandidateId && <em>Merged into {decision.mergedIntoCandidateId}</em>}{candidate ? <details className="decision-source"><summary>Original candidate evidence</summary><blockquote>{findingEvidenceText(candidate)}</blockquote><p><b>Proposed action:</b> {findingActionText(candidate)}</p></details> : null}</div></article>;
      })}</div> : <p className="slot-message">This run predates decision logging, or the integration model did not return a decision ledger.</p>}
    </details>
  );
}

function ProviderResponseList({ integrationResponse, outputs, extraResponses = [] }) {
  const candidateResponses = [
    ...(integrationResponse ? [{ id: 'integration', label: 'Integration provider', content: integrationResponse }] : []),
    ...extraResponses,
    ...outputs.filter((agent) => agent.providerRawResponse).map((agent) => ({ id: agent.areaId, label: agent.areaName, content: agent.providerRawResponse })),
  ];
  const seenContent = new Set();
  const responses = candidateResponses.filter((response) => {
    if (!response.content || seenContent.has(response.content)) return false;
    seenContent.add(response.content);
    return true;
  });
  return (
    <details className="feedback-audit-layer">
      <summary className="feedback-slot-head"><Server size={19} /><div><strong>Provider raw responses</strong><span>Feedback content only · no keys, audio bytes, or HTTP metadata</span></div><i>{responses.length}</i></summary>
      {responses.length ? <div className="provider-response-list">{responses.map((response) => <details key={response.id}><summary><span>{response.label}</span><ChevronDown size={14} /></summary><pre>{response.content}</pre></details>)}</div> : <p className="slot-message">No provider response content was stored for this earlier run.</p>}
    </details>
  );
}

function AgentRawOutputList({ outputs }) {
  return (
    <details className="feedback-audit-layer">
      <summary className="feedback-slot-head"><Bot size={19} /><div><strong>Individual agent raw outputs</strong><span>Complete parsed feedback before integration</span></div><i>{outputs.length}</i></summary>
      <div className="agent-raw-list">{outputs.map((agent) => <details key={agent.areaId}><summary><span><strong>{agent.areaName}</strong><small>{agent.evidenceRoute} · weight {agent.weight}/5 · {agent.focusAudits?.length || 0} focus audits</small></span><ChevronDown size={14} /></summary><div>{agent.focusAudits?.length ? <div className="focus-audit-list">{agent.focusAudits.map((audit) => <p key={audit.focusId}><b>{audit.title || audit.focusId}</b><span className={`audit-status ${audit.status}`}>{audit.status}</span><small>{audit.summary}</small></p>)}</div> : null}{(agent.findings || []).map((finding, index) => <article key={`${finding.title}-${index}`}><strong>{finding.title}</strong><p><b>Evidence:</b> {findingEvidenceText(finding)}</p><p><b>Why:</b> {findingImpactText(finding)}</p><p><b>Action:</b> {findingActionText(finding)}</p><span>{confidenceLevel(finding)} confidence · {finding.priority} priority</span></article>)}</div></details>)}</div>
    </details>
  );
}

function calculateConsistencyMetrics(runs) {
  if (runs.length < 2) return null;
  const sets = runs.map((run) => new Set((run.integratedOutput?.findings || []).map((finding) => finding.findingId || `${finding.area}:${finding.title}`)));
  const pairScores = [];
  for (let left = 0; left < sets.length; left += 1) {
    for (let right = left + 1; right < sets.length; right += 1) {
      const union = new Set([...sets[left], ...sets[right]]);
      const intersection = [...sets[left]].filter((id) => sets[right].has(id));
      pairScores.push(union.size ? intersection.length / union.size : 1);
    }
  }
  const referenceTop = [...sets[0]].slice(0, 5);
  const minimumTopOverlap = Math.min(...sets.slice(1).map((set) => referenceTop.filter((id) => set.has(id)).length));
  const counts = sets.map((set) => set.size);
  return {
    runCount: runs.length,
    averageJaccard: pairScores.reduce((sum, score) => sum + score, 0) / pairScores.length,
    minimumTopOverlap,
    countVariance: Math.max(...counts) - Math.min(...counts),
  };
}

function HistoryPage({ history, initialRunId }) {
  const [selectedId, setSelectedId] = useState(initialRunId || history[0]?.id || null);
  const [showAllIntegrated, setShowAllIntegrated] = useState(false);
  const printRef = useRef(null);
  useEffect(() => {
    if (!history.length) {
      setSelectedId(null);
    } else if (!history.some((run) => run.id === selectedId)) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);
  useEffect(() => setShowAllIntegrated(false), [selectedId]);

  if (!history.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon"><Clock3 size={28} /></span>
        <h2>No run history yet</h2>
        <p>Complete an evaluation to preserve each attention agent output and the integrated feedback.</p>
      </div>
    );
  }

  const selected = history.find((run) => run.id === selectedId) || history[0];
  const integrated = selected.integratedOutput || {};
  const courseAlignment = selected.courseAlignment || integrated.courseAlignment || null;
  const textOutputs = (selected.agentOutputs || []).filter((agent) => EXPERIMENT_TEXT_AREAS.includes(agent.areaId));
  const vrOutputs = (selected.agentOutputs || []).filter((agent) => agent.areaId === 'embodied');
  const audioOutputs = (selected.agentOutputs || []).filter((agent) => EXPERIMENT_AUDIO_AREAS.includes(agent.areaId));
  const allIntegratedFindings = integrated.findings || [];
  const strengths = integrated.strengths || [];
  const comparableRuns = selected.evaluationSignature ? history.filter((run) => run.evaluationSignature === selected.evaluationSignature).length : 0;
  const consistencyMetrics = calculateConsistencyMetrics(selected.evaluationSignature ? history.filter((run) => run.evaluationSignature === selected.evaluationSignature) : []);
  const visibleIntegratedFindings = showAllIntegrated ? allIntegratedFindings : allIntegratedFindings.slice(0, 5);
  const printHistoryRun = () => {
    const wasShowingAll = showAllIntegrated;
    setShowAllIntegrated(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      printElementAsPdf(printRef.current, `${selected.datasetLabel || selected.session?.title || 'ELLMA evaluation'} · feedback`);
      if (!wasShowingAll) setShowAllIntegrated(false);
    }));
  };
  return (
    <div className="history-layout">
      <aside className="history-list-panel">
        <div className="history-list-head"><span className="eyebrow">Saved locally</span><h2>{history.length} evaluation run{history.length === 1 ? '' : 's'}</h2></div>
        <div className="history-run-list">
          {history.map((run) => (
            <button key={run.id} className={run.id === selected.id ? 'history-run active' : 'history-run'} onClick={() => setSelectedId(run.id)}>
              <span className="history-run-icon"><Clock3 size={15} /></span>
              <span><strong>{run.session?.title || 'Untitled performance'}</strong><small>{new Date(run.completedAt).toLocaleString()}</small></span>
              <em>{run.integratedOutput?.findings?.length || 0}</em>
            </button>
          ))}
        </div>
      </aside>

      <section className="history-detail" ref={printRef}>
        <header className="history-detail-head">
          <div><span className="eyebrow">{selected.pipelineMode === 'multi-agent-api' ? 'Multi-agent API run' : 'Local mock simulation'}</span><h2>{selected.session?.title || 'Untitled performance'}</h2><p>{new Date(selected.completedAt).toLocaleString()} · {selected.providers?.text?.model}</p></div>
          <div className="history-head-actions"><div className="history-summary-pills"><span>{selected.agentOutputs?.length || 0} agents</span><span>{integrated.findings?.length || 0} improvements</span><span>{strengths.length} strengths</span><span>{integrated.overallConfidence || 'Unknown'} confidence</span>{selected.evaluationSignature ? <span title={selected.evaluationSignature}>{comparableRuns > 1 ? `${comparableRuns} comparable runs` : 'Unique configuration'}</span> : <span>Legacy signature</span>}</div><button className="print-feedback-button" data-no-print onClick={printHistoryRun}><Printer size={15} />Print / PDF</button></div>
        </header>

        {courseAlignment?.enabled !== false && courseAlignment?.guidelines?.length ? <section className="history-course-alignment">
          <div className="history-section-title"><div><span className="eyebrow">Approved run-specific layer</span><h3>Course alignment</h3></div><ShieldCheck size={19} /></div>
          <p className="history-course-title">{courseAlignment.courseTitle} · {courseAlignment.ilos?.length || 0} relevant ILOs · {courseAlignment.guidelines.length} routed guidelines</p>
          <div className="history-guideline-list">{courseAlignment.guidelines.map((guideline) => {
            const area = ATTENTION_AREAS.find((candidate) => candidate.id === guideline.areaId);
            const effectiveWeight = courseAlignment.effectiveWeights?.[guideline.areaId] || guideline.effectiveWeight || guideline.baseWeight || 3;
            return <article key={guideline.id}><div><b>{guideline.title}</b><span>{guideline.description}</span></div><small>{guideline.iloId} → {area?.name || guideline.areaId} / {guideline.focus}</small><em>{guideline.baseWeight || 3} + {guideline.iloBoost || 0} = {effectiveWeight}/5</em></article>;
          })}</div>
          <div className="history-alignment-raw"><details><summary>Course Agent 1 raw response <ChevronDown size={14} /></summary><pre>{courseAlignment.agent1RawResponse || 'Not stored for this run.'}</pre></details><details><summary>Course Agent 2 raw response <ChevronDown size={14} /></summary><pre>{courseAlignment.agent2RawResponse || 'Not stored for this run.'}</pre></details></div>
        </section> : null}

        <section className="history-integrated">
          <div className="history-section-title"><div><span className="eyebrow">Chain 1 · Integrated text output</span><h3>Adjudicator decision</h3></div><GitMerge size={19} /></div>
          <div className="history-integrated-findings">
            {visibleIntegratedFindings.map((finding, index) => (
              <article key={`${finding.area}-${finding.title}-${index}`}>
                <span>{index + 1}</span>
                <div><small>{finding.area} · weight {finding.attentionWeight || 3}/5 · score {finding.rankingScore || 'legacy'} · {confidenceLevel(finding)}</small><strong>{finding.title}</strong><RichFindingContent finding={finding} compact /></div>
              </article>
            ))}
          </div>
          {allIntegratedFindings.length > 5 && <button className="show-all-feedback" onClick={() => setShowAllIntegrated((current) => !current)}>{showAllIntegrated ? 'Show top five' : `Show all ${allIntegratedFindings.length} integrated findings`}</button>}
          <StrengthList strengths={strengths} />
          {integrated.verbalFeedback && <div className="history-verbal"><Volume2 size={16} /><p>{integrated.verbalFeedback}</p></div>}
          {selected.evaluationProfile ? <details className="evaluation-signature"><summary>Evaluation signature and run metrics <ChevronDown size={14} /></summary><div><p><b>Signature:</b> {selected.evaluationSignature}</p><p><b>Prompt:</b> {selected.evaluationProfile.promptVersion}</p><p><b>Transcript:</b> {selected.evaluationProfile.transcriptHash}</p><p><b>Course profile:</b> {selected.evaluationProfile.courseProfileHash}</p><p><b>Sampling:</b> temperature {selected.evaluationProfile.sampling?.textDetection?.temperature ?? 'legacy'}</p><p><b>Runtime:</b> {integrated.runMetrics?.durationMs ?? 0} ms · {integrated.runMetrics?.requestCount ?? 0} request(s) · {integrated.runMetrics?.totalTokens ?? 0} tokens · {integrated.runMetrics?.providerReportedCost == null ? 'provider cost unavailable' : `cost ${integrated.runMetrics.providerReportedCost}`}</p></div></details> : null}
          {consistencyMetrics ? <div className="consistency-metrics"><div><strong>{Math.round(consistencyMetrics.averageJaccard * 100)}%</strong><span>Average finding-set Jaccard</span></div><div><strong>{consistencyMetrics.minimumTopOverlap}/5</strong><span>Minimum Top-5 overlap</span></div><div><strong>{consistencyMetrics.countVariance}</strong><span>Finding-count variance</span></div><div><strong>{consistencyMetrics.runCount}</strong><span>Comparable runs</span></div></div> : null}
        </section>

        {(integrated.vrStatus || vrOutputs.length) && <DirectRouteSection chain="2" title="Aligned VR evaluation" subtitle="Qwen timestamps → official transcript → VR text agent" status={integrated.vrStatus || 'analysed'} message={integrated.vrStatusMessage} outputs={vrOutputs} icon={ScanEye} alignment={integrated.timestampAlignment} />}
        {(integrated.audioStatus || audioOutputs.length) && <DirectRouteSection chain="3" title="Direct multimodal speech evaluation" subtitle="Qwen audio evaluation · not sent to Integration" status={integrated.audioStatus || 'analysed'} message={integrated.audioStatusMessage} outputs={audioOutputs} icon={Headphones} />}
        <IntegrationDecisionList decisions={integrated.decisions || []} outputs={textOutputs} candidates={integrated.integrationCandidates || []} />
        <ProviderResponseList integrationResponse={integrated.integrationProviderRawResponse} outputs={selected.agentOutputs || []} extraResponses={[
          ...(integrated.timestampTranscription?.providerRawResponse ? [{ id: 'timestamp-transcription', label: 'Qwen timestamp transcription', content: integrated.timestampTranscription.providerRawResponse }] : []),
          ...(audioOutputs[0]?.providerRawResponse ? [{ id: 'direct-speech', label: 'Qwen direct speech evaluation', content: audioOutputs[0].providerRawResponse }] : []),
        ]} />
        <AgentRawOutputList outputs={selected.agentOutputs || []} />
      </section>
    </div>
  );
}

function PipelinePage() {
  return (
    <div className="pipeline-page">
      <section className="pipeline-intro">
        <div><h2>Three independent evaluation chains.</h2><p>Text findings are integrated; aligned VR and direct speech findings remain separate and auditable.</p></div>
        <div className="pipeline-legend"><span><i className="text-route" />Integrated text</span><span><i className="multi-route" />Direct route</span><span><i className="merge-route" />Local alignment</span></div>
      </section>

      <section className="three-route-map" aria-label="ELLMA three-chain evaluation pipeline flow chart">
        <article className="route-map-row text-chain"><span className="route-map-number">01</span><div className="route-map-source"><FileText size={20} /><strong>Official transcript</strong><small>Task + scenario context</small></div><ChevronRight /><div className="route-map-process"><strong>Parallel text agents</strong><small>Grammar · Lexical · Pragmatic · Discourse</small></div><ChevronRight /><div className="route-map-process merge"><GitMerge size={18} /><strong>Weighted Integration</strong><small>Only Chain 1 enters</small></div><ChevronRight /><div className="route-map-output"><strong>Integrated feedback</strong><small>Tutor + concise verbal view</small></div></article>
        <article className="route-map-row vr-chain"><span className="route-map-number">02</span><div className="route-map-source"><Headphones size={20} /><strong>Audio + VR JSON</strong><small>Five-second samples</small></div><ChevronRight /><div className="route-map-process"><strong>Qwen timestamp transcript</strong><small>Timestamp source only</small></div><ChevronRight /><div className="route-map-process merge"><Database size={18} /><strong>Local transcript alignment</strong><small>Official wording remains authoritative</small></div><ChevronRight /><div className="route-map-output"><strong>VR text agent feedback</strong><small>Displayed directly</small></div></article>
        <article className="route-map-row audio-chain"><span className="route-map-number">03</span><div className="route-map-source"><Headphones size={20} /><strong>Same audio</strong><small>Encoded once per run</small></div><ChevronRight /><div className="route-map-process wide"><strong>Qwen direct speech evaluation</strong><small>Fluency & timing · Pronunciation & prosody</small></div><ChevronRight /><div className="route-map-output"><strong>Speech feedback</strong><small>Displayed directly · no Integration</small></div></article>
      </section>

      <section className="pipeline-principles">
        <div><strong>Modular</strong><span>Only enabled attention agents run.</span></div>
        <div><strong>Evidence-first</strong><span>Missing signals reduce confidence instead of creating guesses.</span></div>
        <div><strong>Weight-aware</strong><span>Higher-weight areas retain more supported findings during integration.</span></div>
        <div><strong>Auditable</strong><span>History keeps timestamps, direct outputs, agent outputs, and text-only decisions.</span></div>
      </section>
    </div>
  );
}

function PromptStudioPage({ state, setState, notify }) {
  const attentionDefinitions = ATTENTION_AREAS.filter((area) => !EXPERIMENT_AUDIO_AREAS.includes(area.id)).map((area) => ({
    id: `attention.${area.id}`,
    group: 'Attention agents',
    title: `${area.code} · ${area.name}`,
    route: area.id === 'embodied' ? 'Chain 2 · aligned VR text agent' : area.id === 'interaction' ? 'Conditional dialogue / Q&A agent' : 'Chain 1 · transcript agent',
    defaultText: defaultAttentionPrompt(area),
    contract: ATTENTION_OUTPUT_CONTRACT,
    active: true,
  }));
  const definitions = [
    { id: 'course_agent_1', group: 'Course alignment', title: 'Course Alignment Agent 1', route: 'Extract ILOs and observable guidelines', defaultText: DEFAULT_EDITABLE_PROMPTS.course_agent_1, contract: COURSE_AGENT_1_CONTRACT, active: true },
    { id: 'course_agent_2', group: 'Course alignment', title: 'Course Alignment Agent 2', route: 'Route guidelines to attention areas', defaultText: DEFAULT_EDITABLE_PROMPTS.course_agent_2, contract: COURSE_AGENT_2_CONTRACT, active: true },
    ...attentionDefinitions,
    { id: 'integration', group: 'Integration', title: 'Chain 1 Feedback Writer', route: 'Writes verbal feedback after deterministic ranking', defaultText: DEFAULT_EDITABLE_PROMPTS.integration, contract: INTEGRATION_OUTPUT_CONTRACT, active: true },
    { id: 'timestamp_transcription', group: 'Multimodal routes', title: 'Timestamp Transcription Agent', route: 'Chain 2 · audio timestamps for local VR alignment', defaultText: DEFAULT_EDITABLE_PROMPTS.timestamp_transcription, contract: TIMESTAMP_OUTPUT_CONTRACT, active: true },
    { id: 'direct_audio', group: 'Multimodal routes', title: 'Direct Speech Evaluation Agent', route: 'Chain 3 · fluency, pronunciation and prosody', defaultText: DEFAULT_EDITABLE_PROMPTS.direct_audio, contract: AUDIO_OUTPUT_CONTRACT, active: true },
  ];
  const groups = [...new Set(definitions.map((definition) => definition.group))];
  const updatePrompt = (id, value) => setState((current) => ({ ...current, promptOverrides: { ...(current.promptOverrides || {}), [id]: value } }));
  const resetPrompt = (id) => setState((current) => {
    const next = { ...(current.promptOverrides || {}) };
    delete next[id];
    return { ...current, promptOverrides: next };
  });
  const resetAll = () => {
    setState((current) => ({ ...current, promptOverrides: {} }));
    notify('All agent prompts were restored to the current versioned defaults.', 'success');
  };
  const modifiedCount = definitions.filter((definition) => typeof state.promptOverrides?.[definition.id] === 'string').length;
  return (
    <div className="prompt-studio-page">
      <header className="prompt-studio-hero"><div><span className="eyebrow">Versioned prompt control</span><h2>Agent Prompt Studio</h2><p>Edit the instruction layer used in the next API run. Evidence payloads and JSON output contracts remain fixed so the pipeline stays parseable and auditable.</p></div><div><span>{modifiedCount} modified</span><button className="secondary-button" onClick={resetAll} disabled={!modifiedCount}><RefreshCw size={15} />Restore all defaults</button></div></header>
      {groups.map((group) => <section className="prompt-group" key={group}><div className="prompt-group-head"><h3>{group}</h3><span>{definitions.filter((definition) => definition.group === group).length} agent prompt(s)</span></div>{definitions.filter((definition) => definition.group === group).map((definition) => {
        const modified = Object.prototype.hasOwnProperty.call(state.promptOverrides || {}, definition.id);
        const value = modified ? state.promptOverrides[definition.id] : definition.defaultText;
        return <details className="prompt-editor" key={definition.id} open={definition.id === 'attention.lexical'}><summary><div><Bot size={17} /><span><strong>{definition.title}</strong><small>{definition.route}</small></span></div><div>{!definition.active ? <i>Shared route</i> : null}<em className={modified ? 'modified' : ''}>{modified ? 'Modified' : 'Default'}</em><ChevronDown size={15} /></div></summary><div className="prompt-editor-body"><label><span>Editable system instruction</span><textarea value={value} onChange={(event) => updatePrompt(definition.id, event.target.value)} spellCheck="false" /></label><div className="prompt-editor-actions"><small>Saved locally and included in the evaluation signature.</small><button className="text-button" disabled={!modified} onClick={() => resetPrompt(definition.id)}><RefreshCw size={14} />Restore this prompt</button></div><details className="prompt-contract"><summary>Fixed JSON output contract <ChevronDown size={14} /></summary><pre>{definition.contract}</pre></details><details className="prompt-preview"><summary>Compiled system prompt preview <ChevronDown size={14} /></summary><pre>{`${value}\nOUTPUT CONTRACT (fixed): ${definition.contract}`}</pre></details></div></details>;
      })}</section>)}
    </div>
  );
}

function ConfigPage({ state, setState, notify }) {
  const [showKeys, setShowKeys] = useState({ text: false, multimodal: false });
  const [testing, setTesting] = useState({ text: false, multimodal: false });
  const [status, setStatus] = useState({ text: null, multimodal: null });

  const update = (kind, field, value) => setState((current) => ({
    ...current,
    config: { ...current.config, [kind]: { ...current.config[kind], [field]: value } },
  }));

  const selectProvider = (kind, provider) => setState((current) => {
    const currentConfig = current.config[kind];
    const localModel = kind === 'text' ? 'ELLMA Text Evaluator' : 'ELLMA Multimodal Evaluator';
    const remoteModel = kind === 'text' ? 'deepseek-v4-pro' : 'gpt-audio-mini';
    const remoteBaseUrl = kind === 'text' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1';
    const selectedModel = provider === 'bailian' ? BAILIAN_OMNI_MODEL : remoteModel;
    const selectedBaseUrl = provider === 'bailian' ? BAILIAN_BASE_URL : remoteBaseUrl;
    return {
      ...current,
      config: {
        ...current.config,
        [kind]: provider === 'mock'
          ? { provider: 'mock', baseUrl: `mock://local-${kind}`, apiKey: '', model: localModel }
          : {
            ...currentConfig,
            provider,
            baseUrl: provider === 'bailian' ? selectedBaseUrl : (currentConfig.baseUrl.startsWith('http') ? currentConfig.baseUrl : selectedBaseUrl),
            model: provider === 'bailian' || currentConfig.model.startsWith('ELLMA') ? selectedModel : currentConfig.model,
          },
      },
    };
  });

  const testConnection = async (kind) => {
    const config = state.config[kind];
    setTesting((current) => ({ ...current, [kind]: true }));
    setStatus((current) => ({ ...current, [kind]: null }));
    const started = performance.now();
    try {
      if (config.provider === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 460));
      } else {
        if (!config.serverManaged && !config.baseUrl.startsWith('http')) throw new Error('Enter an HTTP(S) base URL.');
        if (!config.apiKey) throw new Error('Enter an API key.');
        if (!config.model.trim()) throw new Error('Enter a model name.');
        const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: modelHeaders(config),
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: 'Reply with exactly ELLMA_CONNECTION_OK.' }],
            max_tokens: 20,
          }),
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Provider returned ${response.status}${detail ? ` · ${detail.slice(0, 140)}` : ''}.`);
        }
        const payload = await response.json();
        if (!payload.choices?.[0]?.message) throw new Error('The model returned no completion.');
      }
      const latency = Math.round(performance.now() - started);
      setStatus((current) => ({ ...current, [kind]: { ok: true, text: `Connected · ${latency} ms` } }));
      notify(`${kind === 'text' ? 'Text' : 'Multimodal'} model connection verified.`, 'success');
    } catch (error) {
      setStatus((current) => ({ ...current, [kind]: { ok: false, text: error.message } }));
      notify('Connection test failed. Review the provider details.', 'error');
    } finally {
      setTesting((current) => ({ ...current, [kind]: false }));
    }
  };

  return (
    <div className="config-page">
      <div className="dual-config-grid">
        <ModelConfigCard
          kind="text" icon={FileText} title="Text analysis model" description="Course Alignment, transcript agents, aligned VR agent, and Integration" route="Course + text + VR" config={state.config.text}
          showKey={showKeys.text} onShowKey={() => setShowKeys((current) => ({ ...current, text: !current.text }))}
          onUpdate={(field, value) => update('text', field, value)} onProvider={(provider) => selectProvider('text', provider)}
          onTest={() => testConnection('text')} testing={testing.text} status={status.text}
        />
        <ModelConfigCard
          kind="multimodal" icon={Video} title="Multimodal evidence model" description="Timestamp transcription and direct spoken-language evaluation" route="Two audio requests" config={state.config.multimodal}
          showKey={showKeys.multimodal} onShowKey={() => setShowKeys((current) => ({ ...current, multimodal: !current.multimodal }))}
          onUpdate={(field, value) => update('multimodal', field, value)} onProvider={(provider) => selectProvider('multimodal', provider)}
          onTest={() => testConnection('multimodal')} testing={testing.multimodal} status={status.multimodal}
        />
      </div>
      <section className="config-routing">
        <div><span className="route-node text"><FileText size={17} /></span><p><strong>Text evidence</strong><small>Language form, meaning and discourse</small></p></div>
        <ChevronRight size={17} />
        <div className="routing-centre"><Cpu size={19} /><span>Enabled attention agents</span></div>
        <ChevronRight size={17} />
        <div><span className="route-node multi"><Video size={17} /></span><p><strong>Multimodal evidence</strong><small>Delivery, prosody and VR behaviour</small></p></div>
        <GitMerge size={20} className="routing-merge" />
        <div><span className="route-node output"><FileOutput size={17} /></span><p><strong>Separated auditable outputs</strong><small>Integrated text · aligned VR · direct speech</small></p></div>
      </section>
      <div className="config-security"><ShieldCheck size={16} /><span>Prototype keys are stored in this browser. Production calls should pass through a secure backend.</span></div>
    </div>
  );
}

function ModelConfigCard({ kind, icon: Icon, title, description, route, config, showKey, onShowKey, onUpdate, onProvider, onTest, testing, status }) {
  if(config.serverManaged)return <section className="config-routing"><h3>{title}</h3><p>{config.provider==='mock'?'Not configured — set the model environment variables in Coolify before evaluating.':config.model}</p><p>API credentials are managed on the server through Coolify environment variables.</p><button className="secondary-button" onClick={onTest} disabled={testing||config.provider==='mock'}>{testing?'Testing…':'Test connection'}</button>{status&&<p>{status.text}</p>}</section>;
  return (
    <section className={`config-card model-card ${kind}`}>
      <div className="config-head"><span className="config-icon"><Icon size={20} /></span><div><h2>{title}</h2><p>{description}</p></div><span className="model-route">{route}</span></div>
      <div className="provider-options">
        <button className={config.provider === 'mock' ? 'provider-card selected' : 'provider-card'} onClick={() => onProvider('mock')}><span><Bot size={17} /></span><div><strong>Local mock</strong><small>Prototype evaluation</small></div>{config.provider === 'mock' && <CheckCircle2 size={17} />}</button>
        <button className={config.provider === 'openai' ? 'provider-card selected' : 'provider-card'} onClick={() => onProvider('openai')}><span><Sparkles size={17} /></span><div><strong>API endpoint</strong><small>OpenAI-compatible</small></div>{config.provider === 'openai' && <CheckCircle2 size={17} />}</button>
        <button className={config.provider === 'bailian' ? 'provider-card selected' : 'provider-card'} onClick={() => onProvider('bailian')}><span><Volume2 size={17} /></span><div><strong>Alibaba Bailian</strong><small>Qwen3.5 Omni audio</small></div>{config.provider === 'bailian' && <CheckCircle2 size={17} />}</button>
      </div>
      <div className="config-form">
        <FormField label="Base URL"><div className="input-with-icon"><Server size={16} /><input value={config.baseUrl} onChange={(event) => onUpdate('baseUrl', event.target.value)} disabled={config.provider === 'mock'} /></div></FormField>
        <FormField label="API key"><div className="input-with-icon"><KeyRound size={16} /><input type={showKey ? 'text' : 'password'} value={config.apiKey} onChange={(event) => onUpdate('apiKey', event.target.value)} placeholder={config.provider === 'mock' ? 'Not required' : 'API key'} disabled={config.provider === 'mock'} /><button onClick={onShowKey}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></FormField>
        <FormField label="Model"><div className="input-with-icon"><Bot size={16} /><input value={config.model} onChange={(event) => onUpdate('model', event.target.value)} disabled={config.provider === 'mock'} /></div></FormField>
      </div>
      <div className="config-actions">
        <button className="primary-button" onClick={onTest} disabled={testing}>{testing ? <LoaderCircle className="spin" size={16} /> : <Zap size={16} />}{testing ? 'Testing' : 'Test connection'}</button>
        {status && <div className={status.ok ? 'connection-status ok' : 'connection-status error'}>{status.ok ? <CheckCircle2 size={16} /> : <CircleAlert size={16} />}<span>{status.text}</span></div>}
      </div>
    </section>
  );
}

function FormField({ label, hint, children }) {
  return <label className="form-field"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>;
}

function ReadinessLegend() {
  return <div className="readiness-legend"><span><i className="green" />Satisfied</span><span><i className="yellow" />Partial</span><span><i className="red" />Missing</span></div>;
}

function ReadinessDot({ level }) { return <span className={`readiness-dot ${level}`} />; }

function ReadinessBadge({ item }) {
  return <span className={`readiness-badge ${item.level}`}><ReadinessDot level={item.level} />{item.label}</span>;
}

function Toast({ message, type, onClose }) {
  const icons = { success: CheckCircle2, error: CircleAlert, warning: CircleAlert, info: Sparkles };
  const Icon = icons[type] || Sparkles;
  return <div className={`toast ${type}`} role="status"><Icon size={18} /><span>{message}</span><button onClick={onClose}><X size={15} /></button></div>;
}

function createMockVrTrace(sessionId, profile) {
  const audience = [
    { id: 'audience-left', position: [-1.3, 1.45, 3.1] },
    { id: 'audience-centre', position: [0, 1.45, 3.25] },
    { id: 'audience-right', position: [1.3, 1.45, 3.1] },
  ];
  const screen = { id: 'slide-screen', position: [2.5, 1.75, 2.35] };
  const normalize = (vector) => {
    const length = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0)) || 1;
    return vector.map((value) => Number((value / length).toFixed(3)));
  };
  const targetFor = (index) => {
    if (profile === 'screen-heavy') return index % 4 < 2 ? screen : audience[1];
    if (profile === 'fixed-centre') return index % 7 === 0 ? screen : audience[1];
    if (index % 6 === 0) return screen;
    return audience[(index - 1) % audience.length];
  };
  const gestureFor = (index) => {
    if (!index) return 'presentation_started';
    if (index === 36) return 'presentation_ended';
    if (profile === 'screen-heavy') return [11, 25].includes(index) ? 'pointed_at_slide' : null;
    if (profile === 'fixed-centre') return index % 6 === 0 ? 'open_hand_gesture' : null;
    return index % 4 === 0 ? 'open_hand_gesture' : index % 9 === 0 ? 'pointed_at_slide' : null;
  };
  const records = Array.from({ length: 37 }, (_, index) => {
    const head = [Number((Math.sin(index / 5) * 0.04).toFixed(3)), 1.66, Number((Math.cos(index / 7) * 0.035).toFixed(3))];
    const target = targetFor(index);
    const gesture = gestureFor(index);
    const gestureScale = gesture ? (profile === 'balanced-active' ? 0.32 : 0.22) : 0.06;
    const yaw = target.id === 'slide-screen' ? 0.42 : target.id === 'audience-left' ? -0.18 : target.id === 'audience-right' ? 0.18 : 0;
    return {
      timestamp_ms: index * 5000,
      gaze: {
        source: 'eye_tracking',
        origin: head,
        direction: normalize(target.position.map((value, axis) => value - head[axis])),
        target_id: target.id,
        target_type: target.id === 'slide-screen' ? 'screen' : 'audience',
        confidence: Number((0.91 + (index % 5) * 0.015).toFixed(2)),
      },
      headset: {
        position: head,
        rotation_xyzw: [0, Number(Math.sin(yaw / 2).toFixed(3)), 0, Number(Math.cos(yaw / 2).toFixed(3))],
      },
      controllers: {
        left: {
          position: [Number((-0.27 - gestureScale * Math.abs(Math.sin(index))).toFixed(3)), Number((1.16 + gestureScale * Math.abs(Math.cos(index / 2))).toFixed(3)), 0.34],
          rotation_xyzw: [0, -0.08, 0, 0.997],
          tracked: true,
        },
        right: {
          position: [Number((0.28 + gestureScale * Math.abs(Math.cos(index))).toFixed(3)), Number((1.17 + gestureScale * Math.abs(Math.sin(index / 2))).toFixed(3)), 0.36],
          rotation_xyzw: [0, 0.08, 0, 0.997],
          tracked: true,
        },
      },
      audience,
      events: gesture ? [gesture] : [],
    };
  });
  return {
    schema_version: 'ellma-vr-trace-1.0',
    sample_interval_ms: 5000,
    coordinate_system: { units: 'metres', handedness: 'right-handed', axes: { x: 'right', y: 'up', z: 'forward' }, origin: 'VR scene origin' },
    session: { session_id: sessionId, learner_id: 'mock-learner', started_at_utc: '2026-08-11T08:00:00Z' },
    scene_objects: [...audience.map((person) => ({ ...person, type: 'audience' })), { ...screen, type: 'screen' }],
    records,
  };
}

function validateVrTrace(data) {
  const errors = [];
  const isVector3 = (value) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  if (data?.schema_version !== 'ellma-vr-trace-1.0') errors.push('schema_version must be "ellma-vr-trace-1.0".');
  if (data?.sample_interval_ms !== 5000) errors.push('sample_interval_ms must be 5000.');
  if (!data?.coordinate_system?.units || !data?.coordinate_system?.axes) errors.push('coordinate_system with units and axes is required.');
  if (!Array.isArray(data?.records) || data.records.length < 2) {
    errors.push('records must contain at least two five-second samples.');
  } else {
    data.records.forEach((record, index) => {
      const label = `Record ${index + 1}`;
      if (!Number.isFinite(record.timestamp_ms)) errors.push(`${label}: timestamp_ms is required.`);
      if (!['eye_tracking', 'head_direction_proxy'].includes(record.gaze?.source) || !isVector3(record.gaze?.origin) || !isVector3(record.gaze?.direction) || !record.gaze?.target_id) errors.push(`${label}: gaze requires source, origin, direction and target_id.`);
      if (!isVector3(record.controllers?.left?.position) || !isVector3(record.controllers?.right?.position)) errors.push(`${label}: left and right controller positions are required.`);
      if (!Array.isArray(record.audience) || !record.audience.length || record.audience.some((person) => !person.id || !isVector3(person.position))) errors.push(`${label}: audience must contain IDs and [x, y, z] positions.`);
      if (index > 0 && record.timestamp_ms - data.records[index - 1].timestamp_ms !== 5000) errors.push(`${label}: timestamps must increase by exactly 5000 ms.`);
    });
  }
  if (errors.length) return { valid: false, errors, summary: null };
  const audienceRecords = data.records.filter((record) => record.gaze.target_type === 'audience' || record.audience.some((person) => person.id === record.gaze.target_id));
  const screenRecords = data.records.filter((record) => record.gaze.target_type === 'screen');
  const audienceTargets = new Set(audienceRecords.map((record) => record.gaze.target_id));
  const gestureEvents = data.records.flatMap((record) => record.events || []).filter((event) => ['open_hand_gesture', 'pointed_at_slide', 'emphasis_gesture'].includes(event));
  const slideReferenceEvents = data.records.flatMap((record) => record.events || []).filter((event) => event === 'pointed_at_slide');
  const trackedControllerSamples = data.records.filter((record) => record.controllers.left.tracked !== false && record.controllers.right.tracked !== false).length;
  let controllerTravelMetres = 0;
  const distance = (from, to) => Math.sqrt(from.reduce((sum, value, axis) => sum + ((value - to[axis]) ** 2), 0));
  for (let index = 1; index < data.records.length; index += 1) {
    controllerTravelMetres += distance(data.records[index - 1].controllers.left.position, data.records[index].controllers.left.position);
    controllerTravelMetres += distance(data.records[index - 1].controllers.right.position, data.records[index].controllers.right.position);
  }
  return {
    valid: true,
    errors: [],
    summary: {
      recordCount: data.records.length,
      durationSeconds: data.records[data.records.length - 1].timestamp_ms / 1000,
      audienceGazeRate: audienceRecords.length / data.records.length,
      screenGazeRate: screenRecords.length / data.records.length,
      audienceTargets: audienceTargets.size,
      gazeSource: data.records[0].gaze.source,
      controllerTravelMetres: Number(controllerTravelMetres.toFixed(2)),
      gestureEventCount: gestureEvents.length,
      gestureRatePerMinute: Number((gestureEvents.length / Math.max(1, data.records[data.records.length - 1].timestamp_ms / 60000)).toFixed(1)),
      slideReferenceCount: slideReferenceEvents.length,
      trackedControllerRate: trackedControllerSamples / data.records.length,
    },
  };
}

function calculateReadiness(state) {
  const hasTranscript = Boolean(state.inputs.transcript && state.inputs.transcriptText.trim());
  const hasAudio = Boolean(state.inputs.audio);
  const hasVrTrace = Boolean(state.inputs.vrTrace && state.inputs.vrTraceData && state.inputs.vrTraceSummary);
  const hasTask = Boolean(state.inputs.task || state.inputs.taskText);
  const hasAggregateFluency = Number.isFinite(state.inputs.performanceMetrics?.words_per_minute);
  const hasContext = Boolean(state.session.taskType && state.session.audience);
  const text = state.inputs.transcriptText || '';
  const hasTurns = state.session.interactionMode === 'Dialogue / Q&A' || /(^|\n)\s*(speaker\s*\d*|interviewer|student|tutor|q|a)\s*:/im.test(text);
  const result = {};
  ATTENTION_AREAS.forEach((area) => {
    let level = 'satisfied';
    let reason = 'Required evidence available';
    if (!hasTranscript && !['pronunciation', 'embodied'].includes(area.id)) {
      level = 'missing'; reason = 'Transcript required';
    } else if (area.id === 'pragmatic' && !hasContext) {
      level = 'partial'; reason = 'Audience context not set';
    } else if (area.id === 'discourse' && !hasTask) {
      level = 'partial'; reason = 'No brief or rubric';
    } else if (area.id === 'fluency' && !hasAudio) {
      level = hasTranscript ? 'partial' : 'missing';
      reason = hasTranscript ? (hasAggregateFluency ? `Aggregate timing only · ${state.inputs.performanceMetrics.words_per_minute.toFixed(1)} WPM` : 'No audio timing') : 'Transcript and audio required';
    } else if (area.id === 'pronunciation' && !hasAudio) {
      level = 'missing'; reason = 'Audio required';
    } else if (area.id === 'interaction' && !hasTurns) {
      level = 'missing'; reason = 'Speaker turns required';
    } else if (area.id === 'embodied' && !hasVrTrace) {
      level = 'missing'; reason = 'Validated VR trace required';
    } else if (area.id === 'embodied' && state.inputs.vrTraceSummary.gazeSource === 'head_direction_proxy') {
      level = 'partial'; reason = 'Head-direction gaze proxy';
    } else if (area.id === 'interaction') {
      reason = 'Speaker turns detected';
    } else if (area.id === 'embodied') {
      reason = `${state.inputs.vrTraceSummary.recordCount} synchronized VR records`;
    } else if (area.id === 'pronunciation') {
      reason = 'Audio available';
    }
    result[area.id] = { level, label: level === 'satisfied' ? 'Satisfied' : level === 'partial' ? 'Partial' : 'Missing', reason };
  });
  return result;
}

function createExperimentEvaluationState(state, experiment, dataset, includeAudio = false) {
  const enabled = Object.fromEntries(ATTENTION_AREAS.map((area) => [
    area.id,
    experiment.selectedAreaIds.includes(area.id)
      && (EXPERIMENT_STRUCTURED_AREAS.includes(area.id) || (includeAudio && EXPERIMENT_AUDIO_AREAS.includes(area.id))),
  ]));
  return {
    ...state,
    session: {
      slot: dataset.label,
      title: dataset.title,
      learner: dataset.learner,
      taskType: '3MT presentation',
      audience: dataset.audience,
      level: dataset.level,
      interactionMode: 'Monologue',
    },
    inputs: {
      transcript: { name: `${dataset.id}.txt`, size: dataset.transcript.length, type: 'text/plain', updatedAt: Date.now() },
      task: { name: `${dataset.id}-brief.txt`, size: dataset.taskBrief.length, type: 'text/plain', updatedAt: Date.now() },
      audio: includeAudio && dataset.audio ? { ...dataset.audio } : null,
      vrTrace: dataset.vrTrace ? { name: `${dataset.id}-vr-trace.json`, size: JSON.stringify(dataset.vrTrace).length, type: 'application/json', updatedAt: Date.now() } : null,
      transcriptText: dataset.transcript,
      taskText: `${dataset.taskBrief}\nResearch topic: ${dataset.topic}`,
      performanceMetrics: null,
      evidenceAvailability: { transcript: true, task_reference: true, audio: includeAudio, vr_trace: Boolean(dataset.vrTrace) },
      vrTraceData: dataset.vrTrace,
      vrTraceSummary: dataset.vrTrace ? (dataset.vrTraceSummary || validateVrTrace(dataset.vrTrace).summary) : null,
    },
    enabled,
    attentionWeights: { ...state.attentionWeights, ...experiment.attentionWeights },
    results: null,
    readiness: null,
  };
}

function createBundledExperimentFeedback(datasets, experimentSetup) {
  const seedState = {
    session: {},
    inputs: {},
    enabled: {},
    selectedFocus: DEFAULT_SELECTED_FOCUS,
    customFocus: DEFAULT_CUSTOM_FOCUS,
    attentionWeights: DEFAULT_ATTENTION_WEIGHTS,
    config: DEFAULT_CONFIG,
  };
  return Object.fromEntries(datasets.map((dataset) => {
    const evaluationState = createExperimentEvaluationState(seedState, experimentSetup, dataset);
    const readiness = calculateReadiness(evaluationState);
    const results = buildLocalResults(evaluationState, readiness);
    return [dataset.id, {
      ...results,
      completedAt: DEFAULT_EXPERIMENT_COMPLETED_AT,
      modelNote: 'Bundled Local Mock baseline using transcript and five-second structured VR data.',
      pipelineNote: 'Bundled Local Mock baseline using transcript and five-second structured VR data.',
      audioStatus: 'not-uploaded',
      audioStatusMessage: 'No real recording was uploaded for this baseline. This feedback position is reserved for the multimodal model.',
      datasetSnapshot: { ...dataset, audio: null },
      experimentConfig: {
        name: experimentSetup.name,
        modelRoute: 'local-mock',
        selectedAreaIds: [...experimentSetup.selectedAreaIds],
        attentionWeights: { ...experimentSetup.attentionWeights },
        structuredVrIncluded: true,
        audioStatus: 'not-uploaded',
      },
    }];
  }));
}

function buildLocalResults(state, readiness) {
  const text = state.inputs.transcriptText.replace(/\s+/g, ' ').trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const words = text.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  const findings = [];
  const enabled = Object.fromEntries(ATTENTION_AREAS.map((area) => [area.id, isAreaRunnable(state, area)]));
  const focusEnabled = (areaId, focusId) => (state.selectedFocus[areaId] || []).includes(focusId);
  const repetition = findRepeatedFrame(sentences);

  if (enabled.lexical && repetition) {
    const alternatives = repetition.phrase.toLowerCase() === 'i think' ? 'Use evidence-led frames such as “the results suggest…”, “this may…”, or state the claim directly when the evidence is strong.' : `Replace some instances with a precise synonym or restructure the sentence so the idea, rather than “${repetition.phrase}”, leads.`;
    findings.push({ area: 'Lexical Resource', title: `Vary the repeated frame “${repetition.phrase}”`, evidence: repetition.examples.join(' … '), why: `The frame appears ${repetition.count} times. In a short talk, repeated openings make distinct claims sound alike and reduce rhetorical range.`, action: alternatives, confidence: 'High', priority: 'high' });
  }

  if (enabled.pragmatic) {
    const strongClaim = sentences.find((sentence) => /\b(should|must|always|never)\b/i.test(sentence));
    if (strongClaim) findings.push({ area: 'Pragmatic Precision', title: 'Match claim strength to the evidence', evidence: trimQuote(strongClaim), why: 'Recommendation language can sound stronger than the evidence warrants, especially for a public 3MT audience.', action: 'Name the evidence before the recommendation: “These findings suggest that city planners could prioritise…” Keep “should” for your clearest final call to action.', confidence: hasContextConfidence(state), priority: 'high' });
  }

  if (enabled.discourse) {
    const markers = words.filter((word) => ['first', 'second', 'then', 'however', 'therefore', 'finally', 'because'].includes(word)).length;
    const evidence = sentences[Math.max(0, Math.floor(sentences.length * 0.6))] || sentences[0] || text.slice(0, 160);
    findings.push(markers < 3
      ? { area: 'Discourse & Task', title: 'Make the research contribution easier to locate', evidence: trimQuote(evidence), why: 'The audience hears the method and result, but the transition to what is new or useful can be more explicit.', action: 'Add one contribution bridge after the main result: “What this map adds is…” Then connect it directly to the real-world decision it enables.', confidence: readiness.discourse.level === 'satisfied' ? 'High' : 'Medium', priority: 'medium' }
      : { area: 'Discourse & Task', title: 'Sharpen the contribution bridge', evidence: trimQuote(evidence), why: 'The talk is easy to follow; the strongest remaining gain is making the novel contribution unmistakable.', action: 'After the key result, add: “What this research adds is…” followed by one concrete benefit for the audience.', confidence: readiness.discourse.level === 'satisfied' ? 'High' : 'Medium', priority: 'medium' });
  }

  if (enabled.grammar) {
    const longSentence = sentences.find((sentence) => countWords(sentence) > 28);
    if (longSentence) findings.push({ area: 'Grammar & Syntax', title: 'Reduce clause load in the densest sentence', evidence: trimQuote(longSentence), why: 'The sentence is grammatically possible but carries several ideas, which raises listening effort in a timed talk.', action: 'Split it after the main claim. Put the evidence in a second sentence beginning “This is because…” or “For example…”.', confidence: 'High', priority: 'medium' });
  }

  if (enabled.interaction && focusEnabled('interaction', 'Response relevance')) {
    const repeatedOpeningCount = (text.match(/\bfirst of all\b/gi) || []).length;
    if (repeatedOpeningCount >= 2) {
      findings.push({ area: 'Interactional Competence', title: 'Open Q&A answers more directly', evidence: `“First of all” appears ${repeatedOpeningCount} times across the recorded responses.`, why: 'Repeated response openings delay the answer and make different Q&A contributions sound formulaic.', action: 'Start with the answer itself, or use a content-bearing frame such as “The workshops capture this by…” Reserve “First…” for a response that genuinely introduces a sequence.', confidence: 'Medium', priority: 'high' });
    }
  }

  if (enabled.embodied && readiness.embodied.level === 'satisfied' && state.inputs.vrTraceSummary) {
    const trace = state.inputs.vrTraceSummary;
    const audiencePercent = Math.round(trace.audienceGazeRate * 100);
    if (trace.audienceGazeRate < 0.55) {
      findings.push({ area: 'Embodied Communication', title: 'Return visual attention to the audience', evidence: `${audiencePercent}% of five-second gaze samples targeted an audience position.`, why: 'Long periods oriented elsewhere can weaken the connection between the spoken explanation and its intended listeners.', action: 'After referring to the slide, return gaze to an audience anchor within the next five-second sample.', confidence: 'High', priority: 'high' });
    } else if (trace.audienceTargets < 2) {
      findings.push({ area: 'Embodied Communication', title: 'Distribute gaze across more audience positions', evidence: `${audiencePercent}% of samples targeted the audience, but only ${trace.audienceTargets} audience anchor was used.`, why: 'Audience orientation is strong overall, but a single visual anchor can make delivery appear fixed.', action: 'Alternate between centre, left and right audience anchors at major idea transitions.', confidence: 'High', priority: 'medium' });
    } else {
      findings.push({ area: 'Embodied Communication', title: 'Coordinate gesture with the key result', evidence: `Controller travel totalled ${trace.controllerTravelMetres} m across ${trace.recordCount} synchronized samples.`, why: 'The trace confirms movement, but the strongest gestures should coincide with the most important spoken claim.', action: 'Use one deliberate open-hand or pointing gesture at the timestamp of the central research result.', confidence: 'Medium', priority: 'medium' });
    }
  }

  if (enabled.fluency && readiness.fluency.level === 'partial') {
    const metrics = state.inputs.performanceMetrics;
    if (metrics && focusEnabled('fluency', 'Time allocation')) {
      const unusedSeconds = Math.max(0, 180 - metrics.duration_seconds);
      findings.push({ area: 'Fluency & Timing', title: 'Use the available 3MT time strategically', evidence: `Stored metrics report ${metrics.duration_seconds.toFixed(1)} seconds, ${metrics.approximate_word_count} words and ${metrics.words_per_minute.toFixed(1)} WPM—about ${unusedSeconds.toFixed(0)} seconds below the three-minute limit.`, why: 'The run finishes well before the limit while several research ideas remain compressed or difficult to follow.', action: 'Use part of the remaining time to state the research problem and contribution in shorter sentences. Re-record with audio before interpreting the pace as hesitation or a pronunciation issue.', confidence: 'Medium', priority: 'medium' });
    } else {
      findings.push({ area: 'Fluency & Timing', title: 'Record audio before coaching delivery', evidence: 'Transcript supplied without an audio track.', why: 'Pauses, hesitation, repair and speech rate cannot be measured reliably from written text.', action: 'Keep the text-based feedback, then add one audio run. The next evaluation can locate a specific pause or timing pattern.', confidence: 'Low', priority: 'low' });
    }
  }

  if (!findings.length) {
    findings.push({ area: 'Lexical Resource', title: 'Move one key claim from general to precise', evidence: trimQuote(sentences[0] || text), why: 'A precise opening helps listeners know what to retain from a short academic talk.', action: 'Replace one general noun or verb in the opening with the exact process, population or outcome your study examines.', confidence: 'Medium', priority: 'medium' });
  }

  const areaByName = new Map(ATTENTION_AREAS.map((area) => [area.name, area]));
  const getFindingWeight = (finding) => {
    const area = areaByName.get(finding.area);
    return area ? state.attentionWeights[area.id] || 3 : 3;
  };
  const agentOutputs = ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area)).map((area) => ({
    areaId: area.id,
    areaName: area.name,
    weight: state.attentionWeights[area.id] || 3,
    readiness: readiness[area.id],
    mode: 'local-mock-simulation',
    findings: findings.filter((finding) => finding.area === area.name),
  }));
  const priorityScore = { high: 300, medium: 200, low: 100 };
  const prioritized = findings
    .sort((a, b) => (priorityScore[b.priority] + getFindingWeight(b) * 10) - (priorityScore[a.priority] + getFindingWeight(a) * 10))
    .slice(0, 4)
    .map((finding) => ({ ...finding, attentionWeight: getFindingWeight(finding) }));
  const learnerItems = prioritized.filter((item) => item.confidence !== 'Low').slice(0, 2);
  const verbalFeedback = learnerItems.length > 1
    ? `You have a clear research message and a concrete result. For your next run, focus on two changes. First, ${sentenceCase(learnerItems[0].action)} Second, ${sentenceCase(learnerItems[1].action)} Keep the strong final takeaway; it gives the audience a clear reason to care.`
    : `Your main message is clear. For your next run, focus on one change: ${sentenceCase(learnerItems[0]?.action || prioritized[0].action)} Keep the concrete evidence and finish with your strongest takeaway.`;
  const enabledItems = ATTENTION_AREAS.filter((area) => enabled[area.id]);
  const satisfied = enabledItems.filter((area) => readiness[area.id].level === 'satisfied').length;
  const partial = enabledItems.filter((area) => readiness[area.id].level === 'partial').length;
  const coverage = `${satisfied}/${enabledItems.length}`;
  const overallConfidence = partial || enabledItems.some((area) => readiness[area.id].level === 'missing') ? 'Mixed' : 'High';
  return {
    findings: prioritized,
    verbalFeedback,
    coverage,
    overallConfidence,
    agentOutputs,
    wordCount: words.length,
    nextRun: {
      title: learnerItems[0]?.title || prioritized[0].title,
      instruction: learnerItems[0]?.action || prioritized[0].action,
      success: repetition ? `Use “${repetition.phrase}” no more than once.` : 'A listener can repeat the contribution after one hearing.',
    },
  };
}

function createHistoryEntry(state, readiness, completedResults) {
  const { agentOutputs = [], ...integratedOutput } = completedResults;
  const pipelineMode = agentOutputs.some((output) => output.mode?.includes('llm-agent')) ? 'multi-agent-api' : 'local-mock-simulation';
  const enabledFocus = Object.fromEntries(ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area)).map((area) => [area.id, getEnabledFocusItems(state, area).map((focus) => ({ id: focusIdentifier(area.id, focus), title: focus.title, description: focus.description }))]));
  const evaluationProfile = {
    promptVersion: EVALUATION_PROMPT_VERSION,
    promptOverridesHash: stableHash(state.promptOverrides || {}),
    promptOverrides: { ...(state.promptOverrides || {}) },
    transcriptHash: stableHash(state.inputs.transcriptText || ''),
    courseProfileHash: stableHash(state.courseAlignmentProfile || null),
    enabledFocus,
    effectiveWeights: Object.fromEntries(ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area)).map((area) => [area.id, state.attentionWeights[area.id] || 3])),
    models: {
      text: state.config.text.model,
      multimodal: state.config.multimodal.model,
    },
    sampling: { textDetection: TEXT_SAMPLING_CONFIG, integration: TEXT_SAMPLING_CONFIG },
  };
  const evaluationSignature = stableHash(evaluationProfile);
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `run-${Date.now()}`,
    completedAt: completedResults.completedAt,
    pipelineMode,
    session: { ...state.session },
    providers: {
      text: { provider: state.config.text.provider, model: state.config.text.model },
      multimodal: { provider: state.config.multimodal.provider, model: state.config.multimodal.model },
    },
    attentionWeights: Object.fromEntries(ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area)).map((area) => [area.id, state.attentionWeights[area.id] || 3])),
    evaluationSignature,
    evaluationProfile,
    readiness,
    agentOutputs,
    integratedOutput,
  };
}

function summarizeProviderMetrics(records, durationMs) {
  const unique = new Map();
  records.filter(Boolean).forEach((record) => {
    const requestId = record.providerRequestId || record.requestId;
    if (!requestId || unique.has(requestId)) return;
    unique.set(requestId, {
      requestId,
      latencyMs: Number(record.providerLatencyMs ?? record.latencyMs) || 0,
      usage: record.providerUsage || record.usage || null,
    });
  });
  const requests = [...unique.values()];
  const numberFromUsage = (usage, keys) => keys.map((key) => Number(usage?.[key])).find(Number.isFinite) || 0;
  const promptTokens = requests.reduce((sum, request) => sum + numberFromUsage(request.usage, ['prompt_tokens', 'input_tokens']), 0);
  const completionTokens = requests.reduce((sum, request) => sum + numberFromUsage(request.usage, ['completion_tokens', 'output_tokens']), 0);
  const totalTokens = requests.reduce((sum, request) => sum + numberFromUsage(request.usage, ['total_tokens']), 0) || promptTokens + completionTokens;
  const costs = requests.map((request) => numberFromUsage(request.usage, ['cost', 'total_cost'])).filter((value) => value > 0);
  return {
    durationMs,
    requestCount: requests.length,
    promptTokens,
    completionTokens,
    totalTokens,
    providerReportedCost: costs.length ? Number(costs.reduce((sum, value) => sum + value, 0).toFixed(6)) : null,
  };
}

function isRemoteConfigReady(config) {
  return Boolean(['openai', 'bailian'].includes(config?.provider) && (config.serverManaged || config.baseUrl?.startsWith('http')) && config.apiKey && config.model);
}

function buildAttentionAgentMessages(area, state, readiness, evidenceRoute) {
  const focus = getEnabledFocusItems(state, area).map((item) => ({ id: focusIdentifier(area.id, item), title: item.title, description: item.description }));
  const evidencePackage = {
    attention_area: { id: area.id, name: area.name, active_focus: focus },
    evidence_route: evidenceRoute,
    readiness: readiness[area.id],
    scenario: state.session,
    task_reference: state.inputs.taskText || null,
    transcript: state.inputs.transcriptText.slice(0, 16000),
    performance_metrics: state.inputs.performanceMetrics || null,
    evidence_availability: state.inputs.evidenceAvailability || null,
    structured_vr: area.id === 'embodied' ? {
      summary: state.inputs.vrTraceSummary,
      schema: state.inputs.vrTraceData?.schema_version,
      sample_interval_ms: state.inputs.vrTraceData?.sample_interval_ms,
      records: state.inputs.vrTraceData?.records,
    } : null,
    aligned_timeline: area.id === 'embodied' ? state.inputs.alignedTimeline || null : null,
    audio_metadata_only: EXPERIMENT_AUDIO_AREAS.includes(area.id) ? state.inputs.audio : null,
    course_alignment: state.courseAlignmentProfile ? {
      course_title: state.courseAlignmentProfile.courseTitle,
      approved: state.courseAlignmentProfile.approved,
      relevant_ilos: state.courseAlignmentProfile.ilos,
      assigned_guidelines: (state.courseAlignmentProfile.guidelines || []).filter((guideline) => guideline.areaId === area.id),
      effective_weight: state.courseAlignmentProfile.effectiveWeights?.[area.id] || state.attentionWeights[area.id] || 3,
    } : null,
  };
  const alignmentPolicy = area.id === 'embodied' && state.inputs.alignedTimeline
    ? '\nALIGNMENT POLICY: The official transcript text is authoritative. Use Qwen only as the timestamp source. Evaluate transcript and VR evidence together through aligned_timeline.evidence_windows. Cite the relevant millisecond window for every embodied claim, and never replace or correct the official wording with the Qwen transcript.'
    : '';
  return [
    {
      role: 'system',
      content: `${promptOverride(state, `attention.${area.id}`, defaultAttentionPrompt(area))}${alignmentPolicy}\nOUTPUT CONTRACT (fixed): ${ATTENTION_OUTPUT_CONTRACT}`,
    },
    { role: 'user', content: `EVIDENCE_PACKAGE\n${JSON.stringify(evidencePackage)}` },
  ];
}

function normalizeAgentOutput(output, area, state) {
  const activeFocuses = getEnabledFocusItems(state, area).map((focus) => ({ ...focus, focusId: focusIdentifier(area.id, focus) }));
  const validStatuses = new Set(['observed_issue', 'observed_strength', 'not_salient', 'insufficient_evidence']);
  const returnedAudits = new Map((Array.isArray(output.focusAudits) ? output.focusAudits : []).map((audit) => [audit.focusId, audit]));
  const focusAudits = activeFocuses.map((focus) => {
    const audit = returnedAudits.get(focus.focusId);
    return {
      focusId: focus.focusId,
      title: focus.title,
      status: validStatuses.has(audit?.status) ? audit.status : 'insufficient_evidence',
      summary: audit?.summary || 'The agent did not return a complete audit for this enabled focus.',
    };
  });
  const focusIds = new Set(activeFocuses.map((focus) => focus.focusId));
  const findings = (Array.isArray(output.findings) ? output.findings : []).filter((finding) => focusIds.has(finding.focusId)).map((finding) => {
    const kind = finding.kind === 'strength' ? 'strength' : 'improvement';
    const confidence = confidenceLevel(finding);
    const confidenceDetail = {
      level: confidence,
      reason: finding.confidence?.reason || finding.confidenceReason || 'Confidence reason was not supplied.',
    };
    const revisionOptions = [...new Set((Array.isArray(finding.revisionOptions) ? finding.revisionOptions : []).map(String).filter(Boolean))];
    const action = finding.practice?.instruction || finding.action || (kind === 'strength' ? 'Preserve this feature in the next rehearsal.' : 'Rehearse a clearer alternative.');
    while (kind === 'improvement' && revisionOptions.length < 2) {
      revisionOptions.push(revisionOptions.length ? `Create a second version that preserves the same meaning: ${action}` : action);
    }
    const evidence = findingEvidenceItems(finding);
    const diagnosis = finding.diagnosis || finding.why || finding.title || 'Supported language observation.';
    const taskImpact = finding.taskImpact || finding.why || diagnosis;
    const practice = {
      instruction: action,
      successCriterion: finding.practice?.successCriterion || finding.successCriterion || (kind === 'strength' ? 'The same effective feature remains present in the next run.' : 'The revised version is used consistently in the next run.'),
    };
    return {
      ...finding,
      area: area.name,
      areaId: area.id,
      focusId: finding.focusId,
      phenomenonCode: slugify(finding.phenomenonCode || finding.title),
      kind,
      evidence,
      occurrenceCount: Math.max(1, Number(finding.occurrenceCount) || evidence.length || 1),
      diagnosis,
      taskImpact,
      revisionOptions,
      practice,
      confidence,
      confidenceDetail,
      impact: Math.min(3, Math.max(1, Math.round(Number(finding.impact) || 2))),
      why: taskImpact,
      action,
      priority: finding.priority || 'medium',
      courseGuidelineIds: Array.isArray(finding.courseGuidelineIds) ? finding.courseGuidelineIds : [],
    };
  });
  return { focusAudits, findings };
}

function collectIntegrationCandidates(agentOutputs = []) {
  return agentOutputs.flatMap((agent) => (agent.findings || []).map((finding, index) => ({
    ...finding,
    candidateId: `${agent.areaId}:${index + 1}`,
    areaId: agent.areaId,
    areaName: agent.areaName,
    weight: agent.weight,
    evidenceRoute: agent.evidenceRoute,
  })));
}

function completeIntegrationDecisions(candidates, modelDecisions = []) {
  const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
  const firstDecisionByCandidate = new Map();
  modelDecisions.forEach((decision) => {
    if (decision?.candidateId && !firstDecisionByCandidate.has(decision.candidateId)) firstDecisionByCandidate.set(decision.candidateId, decision);
  });
  const completeLedger = candidates.map((candidate) => firstDecisionByCandidate.get(candidate.candidateId) || {
    candidateId: candidate.candidateId,
    decision: 'unreported',
    reason: 'The Integration provider did not return a decision for this source candidate. The original candidate is preserved for tutor review.',
    integratedRank: null,
    mergedIntoCandidateId: null,
  });
  modelDecisions.forEach((decision) => {
    if (decision?.candidateId && !candidateIds.has(decision.candidateId)) completeLedger.push(decision);
  });
  return completeLedger;
}

function buildAdjudicatorMessages(state, readiness, agentOutputs) {
  const deterministic = prepareDeterministicIntegration(state, agentOutputs);
  return [
    {
      role: 'system',
      content: `${promptOverride(state, 'integration', DEFAULT_EDITABLE_PROMPTS.integration)}\nOUTPUT CONTRACT (fixed): ${INTEGRATION_OUTPUT_CONTRACT}`,
    },
    {
      role: 'user',
      content: `Write only the presentation layer. verbalFeedback must be under 120 words and contain exactly one supported strength when available, the top two non-Low improvement actions, and one next-run transition. Keep the supplied priorities unchanged.\nCONTEXT\n${JSON.stringify(state.session)}\nREADINESS\n${JSON.stringify(readiness)}\nDETERMINISTIC_IMPROVEMENTS\n${JSON.stringify(deterministic.findings)}\nSUPPORTED_STRENGTHS\n${JSON.stringify(deterministic.strengths)}\nEVIDENCE_CLUSTERS\n${JSON.stringify(deterministic.integrationClusters)}`,
    },
  ];
}

function normalizeForEvidenceMatch(value) {
  return String(value || '').toLocaleLowerCase().replace(/[“”‘’]/g, "'").replace(/\s+/g, ' ').trim();
}

function validateTranscriptEvidence(finding, transcript, sentences) {
  const normalizedTranscript = normalizeForEvidenceMatch(transcript);
  const validated = [];
  findingEvidenceItems(finding).forEach((item) => {
    const requestedIndex = Number(item.sentenceIndex);
    const quote = String(item.quote || '').trim();
    if (quote && transcript.includes(quote)) {
      const derivedIndex = sentences.findIndex((sentence) => sentence.includes(quote));
      validated.push({ quote, sentenceIndex: derivedIndex >= 0 ? derivedIndex : (Number.isInteger(requestedIndex) ? requestedIndex : 0) });
    } else if (quote && normalizedTranscript.includes(normalizeForEvidenceMatch(quote))) {
      const derivedIndex = sentences.findIndex((sentence) => normalizeForEvidenceMatch(sentence).includes(normalizeForEvidenceMatch(quote)));
      if (derivedIndex >= 0) validated.push({ quote: sentences[derivedIndex], sentenceIndex: derivedIndex, repairedFromNormalizedMatch: true });
    } else if (Number.isInteger(requestedIndex) && sentences[requestedIndex]) {
      validated.push({ quote: sentences[requestedIndex], sentenceIndex: requestedIndex, repairedFromSentenceIndex: true });
    }
  });
  return validated.filter((item, index, items) => items.findIndex((candidate) => candidate.quote === item.quote && candidate.sentenceIndex === item.sentenceIndex) === index);
}

function prepareDeterministicIntegration(state, agentOutputs) {
  const transcript = state.inputs.transcriptText || '';
  const sentences = splitReferenceSentences(transcript);
  const areaOrder = new Map(ATTENTION_AREAS.map((area, index) => [area.id, index]));
  const confidenceScore = { High: 3, Medium: 2, Low: 1 };
  const allCandidates = [];
  const decisions = [];
  const retainedByFindingId = new Map();

  agentOutputs.forEach((agent) => {
    const area = ATTENTION_AREAS.find((item) => item.id === agent.areaId);
    const focusOrder = new Map(getEnabledFocusItems(state, area || { id: agent.areaId, focus: [] }).map((focus, index) => [focusIdentifier(agent.areaId, focus), index]));
    (agent.findings || []).forEach((finding, index) => {
      const candidateId = `${agent.areaId}:${index + 1}`;
      const evidence = validateTranscriptEvidence(finding, transcript, sentences);
      const firstSentenceIndex = evidence.length ? Math.min(...evidence.map((item) => item.sentenceIndex)) : Number.MAX_SAFE_INTEGER;
      const findingId = `${finding.focusId || `${agent.areaId}.unspecified`}:${slugify(finding.phenomenonCode || finding.title)}:${Number.isFinite(firstSentenceIndex) ? firstSentenceIndex : 'none'}`;
      const level = confidenceLevel(finding);
      const weight = Number(agent.weight) || 3;
      const impact = Math.min(3, Math.max(1, Number(finding.impact) || 2));
      const occurrenceCount = Math.max(1, Number(finding.occurrenceCount) || evidence.length || 1);
      const rankingScore = (weight * 2) + (impact * 2) + Math.min(occurrenceCount, 3) + confidenceScore[level];
      const candidate = {
        ...finding,
        candidateId,
        findingId,
        areaId: agent.areaId,
        areaName: agent.areaName,
        area: agent.areaName,
        weight,
        attentionWeight: weight,
        evidenceRoute: agent.evidenceRoute,
        evidence,
        evidenceText: evidence.map((item) => item.quote).join(' … '),
        firstSentenceIndex,
        rankingScore,
        confidence: level,
        confidenceDetail: finding.confidenceDetail || { level, reason: finding.confidence?.reason || 'Direct transcript evidence was checked locally.' },
        impact,
        occurrenceCount,
        priority: rankingScore >= 17 ? 'high' : rankingScore >= 12 ? 'medium' : 'low',
        sourceCandidateIds: [candidateId],
        courseGuidelineIds: Array.isArray(finding.courseGuidelineIds) ? finding.courseGuidelineIds : [],
        areaSort: areaOrder.get(agent.areaId) ?? 999,
        focusSort: focusOrder.get(finding.focusId) ?? 999,
      };
      allCandidates.push(candidate);
      if (!evidence.length) {
        decisions.push({ candidateId, decision: 'rejected', reason: 'Rejected locally because no exact transcript quote or valid sentenceIndex could be verified.', integratedRank: null, mergedIntoCandidateId: null });
        return;
      }
      const duplicate = retainedByFindingId.get(findingId);
      if (duplicate) {
        duplicate.sourceCandidateIds.push(candidateId);
        decisions.push({ candidateId, decision: 'merged', reason: `Exact duplicate findingId ${findingId} was deterministically deduplicated.`, integratedRank: null, mergedIntoCandidateId: duplicate.candidateId });
        return;
      }
      retainedByFindingId.set(findingId, candidate);
    });
  });

  const retained = [...retainedByFindingId.values()].sort((a, b) => b.rankingScore - a.rankingScore || a.areaSort - b.areaSort || a.focusSort - b.focusSort || a.firstSentenceIndex - b.firstSentenceIndex || a.findingId.localeCompare(b.findingId));
  const findings = retained.filter((finding) => finding.kind !== 'strength');
  const strengths = retained.filter((finding) => finding.kind === 'strength');
  retained.forEach((finding) => {
    const rank = finding.kind === 'strength' ? strengths.indexOf(finding) + 1 : findings.indexOf(finding) + 1;
    decisions.push({ candidateId: finding.candidateId, decision: 'retained', reason: `Evidence verified locally; deterministic score ${finding.rankingScore}.`, integratedRank: rank, mergedIntoCandidateId: null });
  });
  const clusterMap = new Map();
  retained.forEach((finding) => {
    const key = `sentence-${finding.firstSentenceIndex}`;
    if (!clusterMap.has(key)) clusterMap.set(key, { clusterId: key, sentenceIndex: finding.firstSentenceIndex, evidence: finding.evidence[0]?.quote || '', findingIds: [], dimensions: [] });
    const cluster = clusterMap.get(key);
    cluster.findingIds.push(finding.findingId);
    if (!cluster.dimensions.includes(finding.areaName)) cluster.dimensions.push(finding.areaName);
  });
  const audited = agentOutputs.reduce((count, agent) => count + (agent.focusAudits || []).filter((audit) => audit.status !== 'insufficient_evidence').length, 0);
  const auditTotal = agentOutputs.reduce((count, agent) => count + (agent.focusAudits || []).length, 0);
  return {
    findings,
    strengths,
    integrationCandidates: allCandidates,
    decisions,
    integrationClusters: [...clusterMap.values()].sort((a, b) => a.sentenceIndex - b.sentenceIndex),
    coverage: `${audited}/${auditTotal}`,
    overallConfidence: !findings.length ? 'Insufficient' : findings.some((finding) => finding.confidence === 'Low') ? 'Mixed' : findings.every((finding) => finding.confidence === 'High') ? 'High' : 'Medium',
  };
}

async function evaluatePromptAgent(area, state, readiness, config, evidenceRoute) {
  const providerResponse = await callRemoteJson(config, buildAttentionAgentMessages(area, state, readiness, evidenceRoute), TEXT_SAMPLING_CONFIG);
  const output = providerResponse.data;
  const normalized = normalizeAgentOutput(output, area, state);
  return {
    areaId: area.id,
    areaName: area.name,
    weight: state.attentionWeights[area.id] || 3,
    readiness: readiness[area.id],
    evidenceRoute,
    mode: 'llm-agent',
    focusAudits: normalized.focusAudits,
    findings: normalized.findings,
    rawOutput: output,
    providerRawResponse: providerResponse.rawContent,
    providerUsage: providerResponse.usage,
    providerLatencyMs: providerResponse.latencyMs,
    providerRequestId: providerResponse.requestId,
  };
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function audioFormat(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (['wav', 'mp3', 'm4a', 'ogg', 'webm'].includes(extension)) return extension;
  if (file.type === 'audio/mpeg') return 'mp3';
  return 'wav';
}

async function prepareAudioInput(config, audioFile) {
  const base64Audio = await fileToBase64(audioFile);
  return {
    data: config.provider === 'bailian'
      ? `data:${audioFile.type || `audio/${audioFormat(audioFile)}`};base64,${base64Audio}`
      : base64Audio,
    format: audioFormat(audioFile),
  };
}

async function transcribeAudioWithTimestamps(config, audioInput, state) {
  const prompt = `TASK: Produce a conservative, verbatim timestamped transcript of the supplied presentation audio.
TIMING: Use milliseconds relative to the beginning of the audio file. Segment boundaries should follow audible phrase or sentence boundaries.
FIDELITY: If a word is uncertain, preserve the best audible form and mark the segment confidence Low.`;
  const providerResponse = await callRemoteJson(config, [
    { role: 'system', content: `${promptOverride(state, 'timestamp_transcription', DEFAULT_EDITABLE_PROMPTS.timestamp_transcription)}\nOUTPUT CONTRACT (fixed): ${TIMESTAMP_OUTPUT_CONTRACT}` },
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'input_audio', input_audio: audioInput }] },
  ], TEXT_SAMPLING_CONFIG);
  return {
    segments: normalizeTimestampSegments(providerResponse.data.segments || providerResponse.data.transcript_segments),
    rawOutput: providerResponse.data,
    providerRawResponse: providerResponse.rawContent,
    providerUsage: providerResponse.usage,
    providerLatencyMs: providerResponse.latencyMs,
    providerRequestId: providerResponse.requestId,
  };
}

async function evaluateDirectAudioRoute(areas, state, readiness, config, audioInput) {
  const focusByArea = areas.map((area) => ({
    area: area.name,
    focuses: getEnabledFocusItems(state, area).map(({ title, description }) => ({ title, description })),
    assignedCourseGuidelines: (state.courseAlignmentProfile?.guidelines || [])
      .filter((guideline) => guideline.areaId === area.id)
      .map(({ id, title, description, iloId }) => ({ id, title, description, iloId })),
    effectiveWeight: state.courseAlignmentProfile?.effectiveWeights?.[area.id] || state.attentionWeights[area.id] || 3,
  }));
  const prompt = `ACTIVE_FOCUS_BY_AREA: ${JSON.stringify(focusByArea)}
SCENARIO: ${JSON.stringify(state.session)}
TRANSCRIPT_REFERENCE: ${state.inputs.transcriptText.slice(0, 12000)}
For a finding in one area, apply only that area's assignedCourseGuidelines. Cite a timestamp or short audible segment. If audio evidence is insufficient, report the limitation with Low confidence. Each finding needs one specific, rehearseable change.`;
  const providerResponse = await callRemoteJson(config, [
    { role: 'system', content: `${promptOverride(state, 'direct_audio', DEFAULT_EDITABLE_PROMPTS.direct_audio)}\nOUTPUT CONTRACT (fixed): ${AUDIO_OUTPUT_CONTRACT}` },
    { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'input_audio', input_audio: audioInput }] },
  ]);
  const findings = Array.isArray(providerResponse.data.findings) ? providerResponse.data.findings : [];
  const findingsForArea = (area) => findings.filter((finding) => {
    const label = String(finding.area || '').toLowerCase();
    return area.id === 'fluency'
      ? label.includes('fluency') || label.includes('timing')
      : label.includes('pronunciation') || label.includes('prosody');
  });
  return areas.map((area) => ({
    areaId: area.id,
    areaName: area.name,
    weight: state.attentionWeights[area.id] || 3,
    readiness: readiness[area.id],
    evidenceRoute: 'direct-multimodal-audio',
    mode: 'multimodal-llm-agent',
    findings: findingsForArea(area),
    rawOutput: { findings: findingsForArea(area) },
    providerRawResponse: providerResponse.rawContent,
    providerUsage: providerResponse.usage,
    providerLatencyMs: providerResponse.latencyMs,
    providerRequestId: providerResponse.requestId,
  }));
}

function normalizeTimestampSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.map((segment, index) => ({
    id: segment.id || `qwen-segment-${index + 1}`,
    start_ms: Math.max(0, Number(segment.start_ms ?? segment.start ?? 0)),
    end_ms: Math.max(0, Number(segment.end_ms ?? segment.end ?? segment.start_ms ?? 0)),
    text: String(segment.text || '').trim(),
    confidence: segment.confidence || 'Medium',
  })).filter((segment) => segment.text && Number.isFinite(segment.start_ms) && Number.isFinite(segment.end_ms) && segment.end_ms >= segment.start_ms);
}

function alignmentTokens(text) {
  return String(text || '').toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)?/gu) || [];
}

function splitReferenceSentences(text) {
  return String(text || '').match(/[^.!?。！？]+[.!?。！？]?/gu)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

function alignOfficialTranscript(referenceTranscript, modelSegments, vrTraceData) {
  const sentences = splitReferenceSentences(referenceTranscript);
  const timedModelWords = modelSegments.flatMap((segment) => {
    const words = alignmentTokens(segment.text);
    const duration = Math.max(1, segment.end_ms - segment.start_ms);
    return words.map((word, index) => ({
      token: word,
      start_ms: Math.round(segment.start_ms + (duration * index) / Math.max(1, words.length)),
      end_ms: Math.round(segment.start_ms + (duration * (index + 1)) / Math.max(1, words.length)),
    }));
  });
  const totalDuration = modelSegments.length ? Math.max(...modelSegments.map((segment) => segment.end_ms)) : 0;
  let modelCursor = 0;
  let referenceWordCursor = 0;
  let totalMatchedWords = 0;
  const totalReferenceWords = Math.max(1, alignmentTokens(referenceTranscript).length);
  const alignedSentences = sentences.map((text, sentenceIndex) => {
    const tokens = alignmentTokens(text);
    const matches = [];
    tokens.forEach((token) => {
      const searchEnd = Math.min(timedModelWords.length, modelCursor + 60);
      let matchedIndex = -1;
      for (let index = modelCursor; index < searchEnd; index += 1) {
        if (timedModelWords[index].token === token) { matchedIndex = index; break; }
      }
      if (matchedIndex >= 0) {
        matches.push(timedModelWords[matchedIndex]);
        modelCursor = matchedIndex + 1;
      }
    });
    totalMatchedWords += matches.length;
    const proportionalStart = totalDuration ? Math.round((referenceWordCursor / totalReferenceWords) * totalDuration) : 0;
    referenceWordCursor += tokens.length;
    const proportionalEnd = totalDuration ? Math.round((referenceWordCursor / totalReferenceWords) * totalDuration) : proportionalStart;
    return {
      id: `official-segment-${sentenceIndex + 1}`,
      start_ms: matches[0]?.start_ms ?? proportionalStart,
      end_ms: matches.at(-1)?.end_ms ?? proportionalEnd,
      text,
      source: 'official-transcript',
      timestamp_source: matches.length ? 'qwen-word-anchor' : 'duration-interpolation',
      matched_word_ratio: Number((matches.length / Math.max(1, tokens.length)).toFixed(2)),
    };
  });
  const records = vrTraceData?.records || [];
  const sampleInterval = vrTraceData?.sample_interval_ms || 5000;
  const evidenceWindows = records.map((record) => {
    const start = record.timestamp_ms;
    const end = start + sampleInterval;
    return {
      window_start_ms: start,
      window_end_ms: end,
      transcript_segments: alignedSentences.filter((segment) => segment.start_ms < end && segment.end_ms > start),
      vr: {
        gaze: record.gaze,
        headset: record.headset,
        controllers: record.controllers,
        audience: record.audience,
        events: record.events || [],
      },
    };
  });
  return {
    schema_version: 'ellma-aligned-timeline-1.0',
    timestamp_source: 'qwen-audio-estimate-aligned-to-official-transcript',
    official_transcript_preserved: true,
    comparison: {
      official_word_count: totalReferenceWords,
      qwen_word_count: timedModelWords.length,
      matched_word_count: totalMatchedWords,
      matched_word_ratio: Number((totalMatchedWords / totalReferenceWords).toFixed(2)),
    },
    official_transcript_segments: alignedSentences,
    qwen_transcript_segments: modelSegments,
    evidence_windows: evidenceWindows,
  };
}

async function adjudicateAgentOutputs(state, readiness, agentOutputs, config) {
  const deterministic = prepareDeterministicIntegration(state, agentOutputs);
  const fallbackImprovement = deterministic.findings.find((finding) => finding.confidence !== 'Low') || deterministic.findings[0];
  const fallbackStrength = deterministic.strengths[0];
  let presentation = {
    clusterSummaries: [],
    verbalFeedback: [
      fallbackStrength ? `Keep ${fallbackStrength.title.toLowerCase()}.` : null,
      ...deterministic.findings.filter((finding) => finding.confidence !== 'Low').slice(0, 2).map((finding) => findingActionText(finding)),
    ].filter(Boolean).join(' '),
    nextRun: fallbackImprovement ? { title: fallbackImprovement.title, instruction: findingActionText(fallbackImprovement), success: findingSuccessText(fallbackImprovement) } : { title: 'Preserve clear delivery', instruction: 'Repeat the presentation with the same evidence-led structure.', success: 'The main contribution remains easy to identify.' },
  };
  let providerResponse = null;
  try {
    providerResponse = await callRemoteJson(config, buildAdjudicatorMessages(state, readiness, agentOutputs), TEXT_SAMPLING_CONFIG);
    presentation = { ...presentation, ...providerResponse.data };
  } catch (error) {
    presentation.presentationFallbackReason = error.message;
  }
  return {
    ...deterministic,
    ...presentation,
    integrationProviderRawResponse: providerResponse?.rawContent || 'Integration presentation call failed; deterministic local feedback was preserved.',
    integrationProviderUsage: providerResponse?.usage || null,
    integrationProviderLatencyMs: providerResponse?.latencyMs || null,
    integrationProviderRequestId: providerResponse?.requestId || null,
    agentOutputs,
  };
}

async function runExperimentPipeline(state, readiness, { forceLocalText, audioFile, audioAttachedMetadata, multimodalReady, onProgress }) {
  const pipelineStartedAt = Date.now();
  const textReady = !forceLocalText && isRemoteConfigReady(state.config.text);
  const localBase = buildLocalResults(state, readiness);
  const textAreas = ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area) && EXPERIMENT_TEXT_AREAS.includes(area.id));
  const textOutputs = textReady
    ? await Promise.all(textAreas.map((area) => evaluatePromptAgent(area, state, readiness, state.config.text, 'transcript')))
    : localBase.agentOutputs.filter((output) => EXPERIMENT_TEXT_AREAS.includes(output.areaId)).map((output) => ({ ...output, evidenceRoute: 'transcript' }));
  onProgress?.({ stage: 4, completedAreaIds: textOutputs.map((output) => output.areaId) });
  const textAreaNames = new Set(textOutputs.map((output) => output.areaName));
  let integrated;
  if (textReady && textOutputs.length) {
    integrated = await adjudicateAgentOutputs(state, readiness, textOutputs, state.config.text);
  } else {
    const deterministic = prepareDeterministicIntegration(state, textOutputs);
    const top = deterministic.findings[0];
    integrated = {
      ...localBase,
      ...deterministic,
      agentOutputs: textOutputs,
      verbalFeedback: [deterministic.strengths[0] ? `Keep ${deterministic.strengths[0].title.toLowerCase()}.` : null, ...deterministic.findings.slice(0, 2).map((finding) => findingActionText(finding))].filter(Boolean).join(' '),
      nextRun: top ? { title: top.title, instruction: findingActionText(top), success: findingSuccessText(top) || 'Apply the change consistently in the next run.' } : localBase.nextRun,
      integrationProviderRawResponse: 'Local deterministic integration; no provider presentation response.',
    };
  }

  let timestampTranscription = null;
  let timestampAlignment = null;
  let vrOutputs = [];
  let audioOutputs = [];
  let vrStatus = 'not-uploaded';
  let vrStatusMessage = 'Upload real audio to create timestamped transcript anchors for the VR route.';
  let audioStatus = 'not-uploaded';
  let audioStatusMessage = 'No real recording uploaded for the direct multimodal speech route.';
  if (!audioFile && audioAttachedMetadata) {
    vrStatus = 'file-unavailable';
    vrStatusMessage = 'Audio metadata was restored, but the raw file must be re-uploaded before timestamp alignment.';
    audioStatus = 'file-unavailable';
    audioStatusMessage = 'Audio metadata was restored, but the raw file must be re-uploaded before direct speech evaluation.';
  } else if (audioFile && !multimodalReady) {
    vrStatus = 'not-configured';
    vrStatusMessage = 'The multimodal endpoint is incomplete, so timestamp transcription and VR alignment were skipped.';
    audioStatus = 'not-configured';
    audioStatusMessage = 'The multimodal endpoint is incomplete, so direct speech evaluation was skipped.';
  } else if (audioFile && multimodalReady) {
    const audioAreas = ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area) && EXPERIMENT_AUDIO_AREAS.includes(area.id));
    const embodiedArea = ATTENTION_AREAS.find((area) => area.id === 'embodied' && isAreaRunnable(state, area));
    const audioInput = await prepareAudioInput(state.config.multimodal, audioFile);
    const [transcriptionAttempt, directAudioAttempt] = await Promise.allSettled([
      embodiedArea ? transcribeAudioWithTimestamps(state.config.multimodal, audioInput, state) : Promise.resolve(null),
      audioAreas.length ? evaluateDirectAudioRoute(audioAreas, state, readiness, state.config.multimodal, audioInput) : Promise.resolve([]),
    ]);

    if (!embodiedArea) {
      vrStatus = 'disabled';
      vrStatusMessage = 'The Embodied Communication area is disabled.';
    } else if (transcriptionAttempt.status === 'rejected') {
      vrStatus = 'failed';
      vrStatusMessage = `Timestamp transcription failed: ${transcriptionAttempt.reason.message}`;
    } else if (!transcriptionAttempt.value?.segments?.length) {
      timestampTranscription = transcriptionAttempt.value;
      vrStatus = 'failed';
      vrStatusMessage = 'Qwen returned no usable timestamped transcript segments, so the VR text agent was not called.';
    } else {
      timestampTranscription = transcriptionAttempt.value;
      timestampAlignment = alignOfficialTranscript(state.inputs.transcriptText, timestampTranscription.segments, state.inputs.vrTraceData);
      const alignedState = { ...state, inputs: { ...state.inputs, alignedTimeline: timestampAlignment } };
      try {
        vrOutputs = textReady
          ? [await evaluatePromptAgent(embodiedArea, alignedState, readiness, state.config.text, 'qwen-timestamped-transcript+structured-vr')]
          : localBase.agentOutputs.filter((output) => output.areaId === 'embodied').map((output) => ({ ...output, evidenceRoute: 'local-vr-with-qwen-timestamp-alignment' }));
        vrStatus = 'analysed';
        vrStatusMessage = `Official transcript aligned to ${timestampAlignment.official_transcript_segments.length} timestamped segments and ${timestampAlignment.evidence_windows.length} VR windows.`;
      } catch (error) {
        vrStatus = 'failed';
        vrStatusMessage = `Timestamp alignment succeeded, but the VR text agent failed: ${error.message}`;
      }
    }

    if (!audioAreas.length) {
      audioStatus = 'disabled';
      audioStatusMessage = 'Fluency & Timing and Pronunciation & Prosody are disabled.';
    } else if (directAudioAttempt.status === 'rejected') {
      audioStatus = 'failed';
      audioStatusMessage = `Direct multimodal speech evaluation failed: ${directAudioAttempt.reason.message}`;
    } else {
      audioOutputs = directAudioAttempt.value;
      audioStatus = 'analysed';
      audioStatusMessage = `${audioOutputs.reduce((count, output) => count + output.findings.length, 0)} direct multimodal speech findings returned.`;
    }
  }

  const agentOutputs = [...textOutputs, ...vrOutputs, ...audioOutputs];
  const textRoute = textReady ? `configured text model ${state.config.text.model}` : 'Local Mock transcript agents';
  const vrRoute = vrStatus === 'analysed' ? `Qwen timestamp alignment + ${textReady ? state.config.text.model : 'local VR evaluator'}` : `VR ${vrStatus}`;
  const audioRoute = audioStatus === 'analysed' ? `direct ${state.config.multimodal.model} speech evaluation` : `audio ${audioStatus}`;
  const runMetrics = summarizeProviderMetrics([
    ...agentOutputs,
    { requestId: integrated.integrationProviderRequestId, usage: integrated.integrationProviderUsage, latencyMs: integrated.integrationProviderLatencyMs },
    timestampTranscription,
  ], Date.now() - pipelineStartedAt);
  return {
    ...integrated,
    agentOutputs,
    integrationScope: 'text-chain-only',
    timestampTranscription,
    timestampAlignment,
    vrStatus,
    vrStatusMessage,
    audioStatus,
    audioStatusMessage,
    runMetrics,
    pipelineNote: `Chain 1: ${textRoute}; Chain 2: ${vrRoute}; Chain 3: ${audioRoute}.`,
  };
}

async function runRemoteEvaluation(state, readiness) {
  const enabledAreas = ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area));
  const agentOutputs = await Promise.all(enabledAreas.map((area) => {
    const isAudioArea = EXPERIMENT_AUDIO_AREAS.includes(area.id);
    const preferredConfig = isAudioArea && isRemoteConfigReady(state.config.multimodal) ? state.config.multimodal : state.config.text;
    const route = area.id === 'embodied' ? 'structured-vr-json' : isAudioArea ? 'audio-metadata-only' : 'transcript';
    return evaluatePromptAgent(area, state, readiness, preferredConfig, route);
  }));
  return adjudicateAgentOutputs(state, readiness, agentOutputs, state.config.text);
}

async function callRemoteJson(config, messages, requestOptions = {}) {
  const startedAt = Date.now();
  const requestId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `request-${startedAt}-${Math.random().toString(16).slice(2)}`;
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: modelHeaders(config),
    body: JSON.stringify({ model: config.model, temperature: requestOptions.temperature ?? 0.2, response_format: { type: 'json_object' }, messages }),
  });
  if (!response.ok) throw new Error(`provider returned ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty model response');
  return {
    data: JSON.parse(content.replace(/^```json\s*|\s*```$/g, '')),
    rawContent: content,
    usage: payload.usage || null,
    latencyMs: Date.now() - startedAt,
    requestId,
  };
}

function parseEvaluationPackage(text) {
  try {
    const data = JSON.parse(text);
    if (data.schema_version !== 'ellma-evaluation-input-1.0' || !Array.isArray(data.interaction?.turns)) return null;
    const transcriptText = data.interaction.turns.map((turn) => {
      const totalSeconds = Math.floor((turn.event_offset_ms || 0) / 1000);
      const timestamp = `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
      return `[${timestamp}] ${String(turn.role || 'speaker').toUpperCase()} (${turn.phase || 'performance'}):\n${turn.text}`;
    }).join('\n\n');
    return {
      sessionTitle: `3MT · ${data.session?.session_id || 'Imported session'}`,
      learner: data.session?.learner_id || 'anonymous',
      taskType: '3MT presentation',
      audience: data.context?.audience || 'General public',
      level: data.context?.target_cefr_level || 'Not set',
      interactionMode: data.context?.interaction_mode?.includes('Q&A') ? 'Dialogue / Q&A' : 'Monologue',
      taskText: data.context?.topic_or_brief || '',
      transcriptText,
      performanceMetrics: data.presentation || null,
      evidenceAvailability: data.evidence_availability || null,
      turnCount: data.interaction.turns.length,
    };
  } catch {
    return null;
  }
}

function findRepeatedFrame(sentences) {
  const candidates = ['I think', 'I believe', 'This is', 'We can', 'There is', 'It is important'];
  const found = candidates.map((phrase) => {
    const source = `\\b${phrase.replace(/ /g, '\\s+')}\\b`;
    const examples = sentences.filter((sentence) => new RegExp(source, 'i').test(sentence)).slice(0, 2).map(trimQuote);
    const count = (sentences.join(' ').match(new RegExp(source, 'gi')) || []).length;
    return { phrase, count, examples };
  }).sort((a, b) => b.count - a.count)[0];
  return found?.count >= 3 ? found : null;
}

function hasContextConfidence(state) { return state.session.audience && state.session.taskType ? 'High' : 'Medium'; }
function trimQuote(text) { return text.length > 180 ? `${text.slice(0, 177)}…` : text; }
function sentenceCase(text) { return text ? text.charAt(0).toLowerCase() + text.slice(1) : ''; }
function countWords(text) { return (text.trim().match(/\S+/g) || []).length; }
function formatBytes(bytes) { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
function speakText(text) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 0.96; utterance.pitch = 1; window.speechSynthesis.speak(utterance); }

function printElementAsPdf(element, title) {
  if (!element) return;
  const printRoot = document.createElement('div');
  printRoot.id = 'ellma-print-root';
  const clone = element.cloneNode(true);
  clone.querySelectorAll('details').forEach((details) => { details.open = true; });
  clone.querySelectorAll('[data-no-print]').forEach((node) => node.remove());
  printRoot.appendChild(clone);
  const previousTitle = document.title;
  document.title = title.replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(printRoot);
  document.body.classList.add('printing-feedback');
  try {
    window.print();
  } finally {
    document.body.classList.remove('printing-feedback');
    printRoot.remove();
    document.title = previousTitle;
  }
}

bootstrapServer().then(()=>createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)).catch(error=>{document.getElementById('root').textContent=error.message;});
