import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AudioLines,
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
  FileJson,
  FileOutput,
  FileText,
  Film,
  Gauge,
  GitMerge,
  Hand,
  HelpCircle,
  KeyRound,
  ListChecks,
  LoaderCircle,
  MessageCircleMore,
  Mic2,
  Network,
  PanelLeftClose,
  Play,
  Plus,
  RefreshCw,
  Server,
  Settings2,
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
  config: DEFAULT_CONFIG,
  readiness: null,
  results: null,
  history: [],
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
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
      history: Array.isArray(stored.history) ? stored.history : [],
      config,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function App() {
  const [page, setPage] = useState('input');
  const [state, setState] = useState(loadState);
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(false);
  const [runStage, setRunStage] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (message, type = 'info') => setToast({ message, type });

  const runEvaluation = async () => {
    if (!state.inputs.transcript || !state.inputs.transcriptText.trim()) {
      notify('Upload a transcript before running an evaluation.', 'error');
      setPage('input');
      return;
    }
    if (!ATTENTION_AREAS.some((area) => isAreaRunnable(state, area))) {
      notify('Enable a module with at least one focus point before running an evaluation.', 'error');
      setPage('attention');
      return;
    }
    const readiness = calculateReadiness(state);
    setState((current) => ({ ...current, readiness }));
    setRunning(true);
    setRunStage(0);
    setPage('feedback');
    const stages = ['Preparing shared evidence', 'Running attention agents', 'Merging overlapping findings', 'Planning actionable feedback'];
    for (let index = 0; index < stages.length; index += 1) {
      setRunStage(index);
      await new Promise((resolve) => setTimeout(resolve, 430));
    }
    let results;
    let modelNote = 'Evaluated with the local deterministic prototype.';
    if (state.config.text.provider === 'openai' && state.config.text.baseUrl.startsWith('http')) {
      try {
        results = await runRemoteEvaluation(state, readiness);
        modelNote = `Evaluated with ${state.config.text.model}; multimodal evidence routed through ${state.config.multimodal.model}.`;
      } catch (error) {
        results = buildLocalResults(state, readiness);
        modelNote = `Remote model unavailable; local evaluator used (${error.message}).`;
      }
    } else {
      results = buildLocalResults(state, readiness);
    }
    const completedAt = new Date().toISOString();
    const completedResults = { ...results, modelNote, completedAt };
    const historyEntry = createHistoryEntry(state, readiness, completedResults);
    setState((current) => ({
      ...current,
      readiness,
      results: completedResults,
      history: [historyEntry, ...(current.history || [])].slice(0, HISTORY_LIMIT),
    }));
    setRunning(false);
    notify('Evaluation complete. Evidence was checked before feedback was generated.', 'success');
  };

  const nav = [
    { id: 'input', label: 'Input', icon: UploadCloud },
    { id: 'attention', label: 'Attention Areas', icon: ListChecks },
    { id: 'feedback', label: 'Feedback', icon: ClipboardCheck },
    { id: 'history', label: 'History', icon: Clock3 },
    { id: 'pipeline', label: 'Pipeline', icon: Workflow },
    { id: 'config', label: 'Config', icon: Settings2 },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage('input')} aria-label="ELLMA home">
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
                {item.id === 'feedback' && state.results && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="system-note"><ShieldCheck size={15} /><span>Evidence-first<br />local prototype</span></div>
          <button className="nav-item subdued" onClick={() => notify('Help content is included as short hints throughout the interface.') }>
            <HelpCircle size={18} /><span>Help</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Topbar state={state} setState={setState} page={page} runEvaluation={runEvaluation} running={running} />
        <div className="page-frame">
          {page === 'input' && <InputPage state={state} setState={setState} notify={notify} onNext={() => setPage('attention')} />}
          {page === 'attention' && <AttentionPage state={state} setState={setState} notify={notify} />}
          {page === 'feedback' && <FeedbackPage state={state} running={running} runStage={runStage} runEvaluation={runEvaluation} setPage={setPage} />}
          {page === 'history' && <HistoryPage history={state.history} />}
          {page === 'pipeline' && <PipelinePage />}
          {page === 'config' && <ConfigPage state={state} setState={setState} notify={notify} />}
        </div>
      </main>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function Topbar({ state, setState, page, runEvaluation, running }) {
  const titles = {
    input: ['Session input', 'Add the evidence available for this performance.'],
    attention: ['Attention areas', 'Choose what the evaluation should inspect.'],
    feedback: ['Evaluation feedback', 'Prioritized, evidence-linked coaching actions.'],
    history: ['Run history', 'Inspect each attention agent output and the integrated decision.'],
    pipeline: ['How the system works', 'From synchronized evidence to two forms of actionable feedback.'],
    config: ['Model configuration', 'Route text and multimodal evidence to separate model endpoints.'],
  };
  return (
    <header className="topbar">
      <div>
        <h1>{titles[page][0]}</h1>
        <p>{titles[page][1]}</p>
      </div>
      <div className="run-controls">
        <label className="slot-select">
          <span>Run slot</span>
          <select value={state.session.slot} onChange={(event) => setState((current) => ({ ...current, session: { ...current.session, slot: event.target.value } }))}>
            <option>Run 01</option>
            <option>Run 02</option>
            <option>Run 03</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <button className="primary-button" onClick={runEvaluation} disabled={running}>
          {running ? <LoaderCircle className="spin" size={17} /> : <Play size={16} fill="currentColor" />}
          {running ? 'Running' : 'Run'}
        </button>
      </div>
    </header>
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
                    <span className={`confidence confidence-${finding.confidence.toLowerCase()}`}>{finding.confidence}</span>
                    <ChevronDown size={17} />
                  </button>
                  {expanded === index && (
                    <div className="finding-body">
                      <div className="evidence-quote"><span>Evidence</span><q>{finding.evidence}</q></div>
                      <div className="why-action">
                        <div><span>Why it matters</span><p>{finding.why}</p></div>
                        <div className="action-box"><span>Try this</span><p>{finding.action}</p></div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
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

function HistoryPage({ history }) {
  const [selectedId, setSelectedId] = useState(history[0]?.id || null);
  useEffect(() => {
    if (!history.length) {
      setSelectedId(null);
    } else if (!history.some((run) => run.id === selectedId)) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

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

      <section className="history-detail">
        <header className="history-detail-head">
          <div><span className="eyebrow">{selected.pipelineMode === 'multi-agent-api' ? 'Multi-agent API run' : 'Local mock simulation'}</span><h2>{selected.session?.title || 'Untitled performance'}</h2><p>{new Date(selected.completedAt).toLocaleString()} · {selected.providers?.text?.model}</p></div>
          <div className="history-summary-pills"><span>{selected.agentOutputs?.length || 0} agents</span><span>{integrated.findings?.length || 0} retained</span><span>{integrated.overallConfidence || 'Unknown'} confidence</span></div>
        </header>

        <section className="history-integrated">
          <div className="history-section-title"><div><span className="eyebrow">Integrated output</span><h3>Adjudicator decision</h3></div><GitMerge size={19} /></div>
          <div className="history-integrated-findings">
            {(integrated.findings || []).map((finding, index) => (
              <article key={`${finding.area}-${finding.title}-${index}`}>
                <span>{index + 1}</span>
                <div><small>{finding.area} · weight {finding.attentionWeight || 3}/5 · {finding.confidence}</small><strong>{finding.title}</strong><p>{finding.action}</p></div>
              </article>
            ))}
          </div>
          {integrated.verbalFeedback && <div className="history-verbal"><Volume2 size={16} /><p>{integrated.verbalFeedback}</p></div>}
        </section>

        <section className="history-agents">
          <div className="history-section-title"><div><span className="eyebrow">Pre-integration evidence</span><h3>Individual agent outputs</h3></div><Bot size={19} /></div>
          <div className="agent-output-history">
            {(selected.agentOutputs || []).map((agent, index) => (
              <details key={`${agent.areaId}-${index}`} open={index === 0}>
                <summary>
                  <span className="agent-history-index">{String(index + 1).padStart(2, '0')}</span>
                  <span><strong>{agent.areaName}</strong><small>{agent.mode === 'llm-agent' ? 'Independent LLM agent' : 'Local mock simulation'} · {agent.findings?.length || 0} finding{agent.findings?.length === 1 ? '' : 's'}</small></span>
                  <em>Weight {agent.weight}/5</em>
                  <ReadinessBadge item={agent.readiness || { level: 'partial', label: 'Unknown' }} />
                  <ChevronDown size={16} />
                </summary>
                <div className="agent-history-body">
                  {agent.findings?.length ? agent.findings.map((finding, findingIndex) => (
                    <article key={`${finding.title}-${findingIndex}`}><strong>{finding.title}</strong><p><b>Evidence:</b> {finding.evidence}</p><p><b>Action:</b> {finding.action}</p><span>{finding.confidence} confidence · {finding.priority} priority</span></article>
                  )) : <p className="agent-empty-output">No supported finding was returned by this agent.</p>}
                </div>
              </details>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}

function PipelinePage() {
  const textAgents = ['Grammar', 'Lexical', 'Pragmatic', 'Discourse', 'Interaction'];
  const multimodalAgents = ['Fluency', 'Pronunciation', 'Embodied'];
  return (
    <div className="pipeline-page">
      <section className="pipeline-intro">
        <div><h2>Weighted multi-agent evaluation.</h2><p>Each attention agent works independently before an evidence-gated, weight-aware adjudicator integrates the findings.</p></div>
        <div className="pipeline-legend"><span><i className="text-route" />Text route</span><span><i className="multi-route" />Multimodal route</span><span><i className="merge-route" />Shared decision</span></div>
      </section>

      <section className="pipeline-canvas" aria-label="ELLMA evaluation pipeline flow chart">
        <div className="pipeline-stage capture-stage">
          <span className="stage-number">01</span><h3>Capture</h3>
          <div className="route-source text-source"><FileText size={19} /><div><strong>Text evidence</strong><small>Transcript · task · context</small></div></div>
          <div className="route-source multi-source"><Video size={19} /><div><strong>Multimodal evidence</strong><small>Audio · five-second VR JSON</small></div></div>
        </div>
        <span className="pipeline-arrow"><ChevronRight size={20} /></span>

        <div className="pipeline-stage normalize-stage">
          <span className="stage-number">02</span><h3>Synchronize</h3>
          <div className="normalizer-icon"><Database size={24} /></div>
          <strong>Evidence normalizer</strong><p>Align timestamps, speakers, coordinates and task context.</p>
          <span className="readiness-line"><CheckCircle2 size={14} /> Readiness + confidence</span>
        </div>
        <span className="pipeline-arrow"><ChevronRight size={20} /></span>

        <div className="pipeline-stage agent-stage">
          <span className="stage-number">03</span><h3>Attend</h3>
          <div className="agent-route text-agent-route"><span>Text model</span><div>{textAgents.map((agent) => <small key={agent}>{agent}</small>)}</div></div>
          <div className="agent-route multi-agent-route"><span>Multimodal model</span><div>{multimodalAgents.map((agent) => <small key={agent}>{agent}</small>)}</div></div>
          <span className="agent-weight-note"><Gauge size={13} /> Independent output + weight 1–5</span>
        </div>
        <span className="pipeline-arrow"><ChevronRight size={20} /></span>

        <div className="pipeline-stage decision-stage">
          <span className="stage-number">04</span><h3>Adjudicate</h3>
          <div className="normalizer-icon merge"><GitMerge size={24} /></div>
          <strong>Weighted adjudicator</strong><p>Reject unsupported claims, merge overlap, then use weights to resolve retention and ranking.</p>
          <span className="readiness-line"><ShieldCheck size={14} /> Evidence first · weight second</span>
        </div>
        <span className="pipeline-arrow"><ChevronRight size={20} /></span>

        <div className="pipeline-stage output-stage">
          <span className="stage-number">05</span><h3>Deliver</h3>
          <div className="output-row"><FileOutput size={18} /><p><strong>Tutor report</strong><small>Comprehensive and evidence-linked</small></p></div>
          <div className="output-row"><Volume2 size={18} /><p><strong>Verbal coach</strong><small>Two concise next actions</small></p></div>
          <div className="output-row"><Activity size={18} /><p><strong>Progress record</strong><small>Comparable across sessions</small></p></div>
        </div>
      </section>

      <section className="pipeline-principles">
        <div><strong>Modular</strong><span>Only enabled attention agents run.</span></div>
        <div><strong>Evidence-first</strong><span>Missing signals reduce confidence instead of creating guesses.</span></div>
        <div><strong>Weight-aware</strong><span>Higher-weight areas retain more supported findings during integration.</span></div>
        <div><strong>Auditable</strong><span>History keeps every agent output beside the integrated decision.</span></div>
      </section>
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
    return {
      ...current,
      config: {
        ...current.config,
        [kind]: provider === 'mock'
          ? { provider: 'mock', baseUrl: `mock://local-${kind}`, apiKey: '', model: localModel }
          : { ...currentConfig, provider: 'openai', baseUrl: currentConfig.baseUrl.startsWith('http') ? currentConfig.baseUrl : remoteBaseUrl, model: currentConfig.model.startsWith('ELLMA') ? remoteModel : currentConfig.model },
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
        if (!config.baseUrl.startsWith('http')) throw new Error('Enter an HTTP(S) base URL.');
        if (!config.apiKey) throw new Error('Enter an API key.');
        const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/models`, { headers: { Authorization: `Bearer ${config.apiKey}` } });
        if (!response.ok) throw new Error(`Provider returned ${response.status}.`);
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
          kind="text" icon={FileText} title="Text analysis model" description="Transcript, task and context evidence" route="A1–A4 + interaction" config={state.config.text}
          showKey={showKeys.text} onShowKey={() => setShowKeys((current) => ({ ...current, text: !current.text }))}
          onUpdate={(field, value) => update('text', field, value)} onProvider={(provider) => selectProvider('text', provider)}
          onTest={() => testConnection('text')} testing={testing.text} status={status.text}
        />
        <ModelConfigCard
          kind="multimodal" icon={Video} title="Multimodal evidence model" description="Audio and synchronized VR trace evidence" route="A5–A6 + embodied" config={state.config.multimodal}
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
        <div><span className="route-node output"><FileOutput size={17} /></span><p><strong>One adjudicated report</strong><small>Confidence-filtered feedback</small></p></div>
      </section>
      <div className="config-security"><ShieldCheck size={16} /><span>Prototype keys are stored in this browser. Production calls should pass through a secure backend.</span></div>
    </div>
  );
}

function ModelConfigCard({ kind, icon: Icon, title, description, route, config, showKey, onShowKey, onUpdate, onProvider, onTest, testing, status }) {
  return (
    <section className={`config-card model-card ${kind}`}>
      <div className="config-head"><span className="config-icon"><Icon size={20} /></span><div><h2>{title}</h2><p>{description}</p></div><span className="model-route">{route}</span></div>
      <div className="provider-options">
        <button className={config.provider === 'mock' ? 'provider-card selected' : 'provider-card'} onClick={() => onProvider('mock')}><span><Bot size={17} /></span><div><strong>Local mock</strong><small>Prototype evaluation</small></div>{config.provider === 'mock' && <CheckCircle2 size={17} />}</button>
        <button className={config.provider === 'openai' ? 'provider-card selected' : 'provider-card'} onClick={() => onProvider('openai')}><span><Sparkles size={17} /></span><div><strong>API endpoint</strong><small>OpenAI-compatible</small></div>{config.provider === 'openai' && <CheckCircle2 size={17} />}</button>
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
  const pipelineMode = agentOutputs.some((output) => output.mode === 'llm-agent') ? 'multi-agent-api' : 'local-mock-simulation';
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
    readiness,
    agentOutputs,
    integratedOutput,
  };
}

async function runRemoteEvaluation(state, readiness) {
  const enabledAreas = ATTENTION_AREAS.filter((area) => isAreaRunnable(state, area));
  const agentOutputs = await Promise.all(enabledAreas.map(async (area) => {
    const focus = getEnabledFocusItems(state, area).map(({ title, description }) => ({ title, description }));
    const multimodalArea = ['fluency', 'pronunciation', 'embodied'].includes(area.id);
    const preferredConfig = multimodalArea && state.config.multimodal.provider === 'openai' ? state.config.multimodal : state.config.text;
    const vrEvidence = area.id === 'embodied' && state.inputs.vrTraceData ? `\nValidated VR trace:\n${JSON.stringify(state.inputs.vrTraceData).slice(0, 16000)}` : '';
    const audioEvidence = ['fluency', 'pronunciation'].includes(area.id) && state.inputs.audio ? `\nAudio file available: ${state.inputs.audio.name}. Raw audio transport depends on the configured multimodal provider.` : '';
    const prompt = `You are the ${area.name} attention agent. Inspect only this language-learning area. Do not score other areas and do not infer audio, video, or interaction evidence that is absent. Return JSON with a findings array containing at most two items. Each item must have area,title,evidence (exact short quote, timestamped VR observation, or evidence limitation),why,action,confidence (High|Medium|Low),priority (high|medium|low).\nReadiness: ${JSON.stringify(readiness[area.id])}\nFocus: ${JSON.stringify(focus)}\nContext: ${JSON.stringify(state.session)}\nTask reference: ${JSON.stringify(state.inputs.taskText || null)}\nStored performance metrics: ${JSON.stringify(state.inputs.performanceMetrics || null)}\nEvidence availability: ${JSON.stringify(state.inputs.evidenceAvailability || null)}\nTranscript:\n${state.inputs.transcriptText.slice(0, 16000)}${vrEvidence}${audioEvidence}`;
    const output = await callRemoteJson(preferredConfig, [
      { role: 'system', content: 'Extract evidence for one attention area. Be conservative, specific and actionable.' },
      { role: 'user', content: prompt },
    ]);
    return {
      areaId: area.id,
      areaName: area.name,
      weight: state.attentionWeights[area.id] || 3,
      readiness: readiness[area.id],
      mode: 'llm-agent',
      findings: Array.isArray(output.findings) ? output.findings : [],
      rawOutput: output,
    };
  }));
  const weightProfile = agentOutputs.map(({ areaId, areaName, weight }) => ({ areaId, areaName, weight }));
  const prompt = `You are the adjudicator and feedback planner. Merge overlapping agent findings, reject claims unsupported by the stated readiness, and prioritize no more than four useful coaching actions. Use attention weights from 1 (lowest) to 5 (highest) only after evidence quality and confidence have been checked. When two supported findings overlap or compete for limited output space, retain more findings from the higher-weight area. Never use weight to rescue unsupported or Low-confidence claims. Return only JSON with: findings (area,title,evidence,why,action,confidence High|Medium|Low,priority high|medium|low), verbalFeedback (under 90 words and no more than two actions; omit Low-confidence items), coverage, overallConfidence, nextRun {title,instruction,success}.\nContext: ${JSON.stringify(state.session)}\nReadiness: ${JSON.stringify(readiness)}\nAttention weights: ${JSON.stringify(weightProfile)}\nAgent findings: ${JSON.stringify(agentOutputs)}`;
  const integrated = await callRemoteJson(state.config.text, [
    { role: 'system', content: 'Merge evidence rigorously. Apply attention weights only as an evidence-safe retention and ranking preference.' },
    { role: 'user', content: prompt },
  ]);
  const weightByArea = new Map(agentOutputs.map((output) => [output.areaName.toLowerCase(), output.weight]));
  const findings = (integrated.findings || []).map((finding) => ({
    ...finding,
    attentionWeight: weightByArea.get(String(finding.area || '').toLowerCase()) || 3,
  }));
  return { ...integrated, findings, agentOutputs };
}

async function callRemoteJson(config, messages) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, temperature: 0.2, response_format: { type: 'json_object' }, messages }),
  });
  if (!response.ok) throw new Error(`provider returned ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty model response');
  return JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''));
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

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
