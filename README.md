# ELLMA Evaluation Pipeline

## Server deployment

Coolify / Docker deployment on the existing `main` branch is documented in [DEPLOYMENT.md](DEPLOYMENT.md). Production includes password-protected access, server-side model credentials and persistent evaluation state and student audio. The current UI also includes Students, Focused Feedback and JSON-driven 3D / abstract VR replay. Use a persistent volume at `/app/data`.

An evidence-first multi-agent prototype for course-aligned language coaching in 3MT and VR presentation scenarios.

## Current interface

The application has four pages:

- **Input** — the complete executable workflow, from evidence setup to final feedback.
- **Prompts** — editable, versioned system instructions for every course, attention, integration, timestamp, and direct-speech agent. JSON output contracts remain fixed.
- **Config** — independent OpenAI-compatible text and multimodal API settings.
- **History** — persistent, auditable records of completed runs.

The Input page replaces the earlier separate Input, Attention, Experiment, Feedback, and Pipeline pages. It is a five-stage vertical flow. The active stage and active agents are highlighted while running. A breathing outline means that stage is waiting for a remote provider response.

Use the **Evaluation slot** selector in the top-right corner to switch between Test dataset 1, Test dataset 2, and Real data. Each slot keeps an independent draft and result state. Both test slots include a downloadable, replaceable five-second dummy VR trace by default.

## Five-stage executable workflow

### 1. Evidence and session setup

Choose either of the two prefilled 3MT datasets or a blank dataset. The stage contains session context, a single document uploader, optional audio and VR JSON uploaders, and editable 1–5 base weights. The document uploader accepts PDF, TXT, Markdown, and JSON. Each extracted document can be labelled as syllabus/ILO, rubric, task brief, or transcript. Selectable PDF text is extracted locally from every page in the browser; image-only/scanned PDFs require OCR first. The two test slots use a full-text fixture extracted from the seven-page PLED5001 syllabus.

### 2. Course Alignment Layer

The optional layer has two model calls:

1. **Course Alignment Agent 1** extracts document-supported course requirements, selects ILOs relevant to the current task, and produces concise, observable guidelines.
2. **Course Alignment Agent 2** routes each guideline to exactly one best-fit existing attention agent and focus. It assigns a bounded run-specific boost: `+1` for primary relevance, `+0.5` for supporting relevance, or `+0`.

The effective weight is:

```text
effective agent weight = min(5, base weight + highest assigned ILO boost)
```

Boosts do not accumulate when several guidelines point to the same agent. Before evaluation, the tutor can edit, add, delete, and reroute guidelines; change base weights and boosts; inspect both course agents' raw responses; and approve the result. An approved Course Alignment profile is frozen and reused while its course documents, task context, and course-agent prompts remain unchanged; regeneration is an explicit action.

When **Require tutor approval** is enabled, Stage 3 is locked until approval. Approving the guidelines automatically starts all downstream agents; there is no separate Run Agents action. When approval is disabled, completed routing is auto-approved and immediately continues. When Course Alignment itself is disabled, both course agents are skipped and evaluation starts from universal base weights. Run controls and slot switching are disabled while a pipeline is active.

### 3. Parallel attention agents

The agents run independently. Each prompt contains only that agent's language focuses, valid evidence, specifically routed course guidelines, and effective weight. Every enabled focus receives an explicit audit status before findings are written. Supported improvements include exact evidence, occurrence count, diagnosis, task impact, two revision options, a rehearsal action, and a success criterion. Individual raw responses are folded into the corresponding agent section.

### 4. Integration and direct routes

The system preserves three chains:

1. **Text chain** — Grammar, Lexical, Pragmatic, and Discourse agents inspect the official transcript. Local integration verifies transcript evidence, creates stable finding IDs, deduplicates only exact matches, clusters different dimensions that cite the same sentence, and applies a fixed ranking formula. All supported findings are preserved; weight affects ordering rather than retention. The Integration model writes the readable verbal layer but cannot add, remove, merge, or rerank findings. The complete candidate ledger and deterministic decision reasons are preserved; only the default summary view is limited to five improvements.
2. **Aligned VR chain** — Qwen returns timestamp anchors; local alignment keeps the official transcript authoritative and joins it to five-second VR samples. The Embodied agent evaluates the aligned transcript/VR timeline.
3. **Direct speech chain** — a second Qwen request evaluates Fluency & Timing and Pronunciation & Prosody from audio.

Only Chain 1 enters Integration. VR and speech findings remain separate. Integration decisions and raw responses are folded into the relevant stage.

### 5. Final feedback

The final stage separates improvement priorities from evidence-supported strengths. Tutor feedback includes revisions, rehearsal steps, and success criteria; learner-facing verbal feedback remains concise. Earlier stages remain visible, so the Input page also serves as the live pipeline explanation and audit view.

## API routes

- **Text model** — Course Alignment Agents 1–2, transcript agents, aligned VR text agent, and text-only Integration.
- **Multimodal model** — timestamped audio transcription and direct spoken-language evaluation.

The prototype supports deterministic Local Mock mode and OpenAI-compatible endpoints. Alibaba Bailian can use `qwen3.5-omni-plus`. A live audio file is sent only when the multimodal endpoint, key, and model are configured. The raw browser `File` is retained per slot while the application remains open, including navigation between Input and Config; after a full browser reload, the recording must be selected again because only safe metadata is persisted.

Browser-side API keys are suitable only for local prototyping. Production Unity or web deployments should call a secured server endpoint and keep provider keys server-side.

## Evidence and VR schema

The minimum evidence is an official transcript. Optional inputs include course/task/rubric documents, audio, and structured VR traces. The VR template uses synchronized five-second samples containing gaze, headset/controller coordinates, audience coordinates, and events.

The official transcript remains authoritative. Qwen timestamps are alignment anchors, not a replacement transcript.

## Persistence and auditability

Application state and the latest 50 completed runs are stored in browser local storage. Each History record contains:

- session, provider route, and evidence readiness;
- selected ILOs and approved guidelines;
- guideline routing and base/boost/effective weights;
- both Course Alignment raw responses;
- every evaluation agent's parsed and provider responses;
- all integrated findings and Integration decisions;
- aligned VR and direct speech results;
- concise learner-facing feedback.
- evaluation signature, transcript/course/prompt hashes, enabled focuses, sampling parameters, runtime, token usage, and provider-reported cost when available.

History records can be printed through the browser's native print dialog. Production use requires authenticated server storage, retention controls, and participant consent.

## Run locally

Requirements: Node.js 18 or later.

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4314/` in this workspace. Build with:

```bash
npm run build
```

## Repository structure

```text
src/main.jsx                   State, Course Alignment agents, evaluation chains, and pages
src/styles.css                 Workflow and report interface styles
public/vr-trace-template.json  Five-second VR input template
public/mock-data/              Prefilled 3MT transcripts and VR traces
scripts/prepare-session.mjs    Normalize exported Unity session files
scripts/generate-mock-vr-traces.mjs  Rebuild deterministic VR fixtures
```
