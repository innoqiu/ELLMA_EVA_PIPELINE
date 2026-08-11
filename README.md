# ELLMA Evaluation Pipeline

An evidence-first, modular multi-agent prototype for language-performance evaluation in 3MT and VR presentation scenarios.

## Pipeline

1. **Capture** — import a transcript, optional task reference, audio, and time-aligned VR trace.
2. **Normalize** — validate the files and create one evidence package with shared timestamps.
3. **Attention agents** — run each enabled attention area independently. Every area has editable focuses, an evidence-readiness gate, and an integration weight from 1 to 5.
4. **Weighted adjudication** — merge duplicates and conflicts, preserve traceable evidence, and prioritize supported findings. Confidence and evidence quality are applied before weight; a high weight cannot rescue an unsupported claim.
5. **Outputs and history** — produce a detailed tutor report, a concise verbal coaching script, and an auditable run record containing every individual agent output plus the integrated result.

Remote API mode is a true multi-agent pipeline: enabled attention areas are evaluated through independent model calls and a separate adjudicator call performs integration. Local Mock mode is a deterministic simulation for UI and pipeline testing; it does not make multiple LLM calls.

## Attention configuration

The built-in attention areas cover grammar and syntax, lexical resource, discourse and coherence, fluency, pronunciation and prosody, interaction, task/register fit, and VR/non-verbal presentation behavior. Users can:

- enable or disable a complete attention area;
- enable or disable individual focuses;
- add a custom focus with a title and explanation;
- assign an integration weight from 1 (low emphasis) to 5 (high emphasis).

The default weight is 3. Weight changes retention and ranking only when candidate findings have adequate evidence and confidence.

## History

Every completed run is stored in browser local storage, up to the latest 50 runs. The History page exposes:

- session and provider metadata;
- attention weights and evidence readiness;
- each attention agent's findings and raw structured output;
- integrated findings and verbal feedback;
- whether the run used the multi-agent API or Local Mock simulation.

This is prototype storage. A production deployment should use authenticated server-side storage, retention controls, and explicit participant consent.

## 3MT experiment workspace

The **3MT Experiments** page contains three editable simulated datasets designed to exercise different language and embodied-presentation feedback patterns:

1. repeated stance framing and strong recommendations;
2. high clause load and a method-heavy contribution statement;
3. repeated demonstrative framing and an overgeneralised claim.

Each dataset provides:

- editable context, task brief and transcript fields;
- downloadable dataset JSON and transcript TXT files, with a replacement upload;
- a separate downloadable VR trace containing 37 synchronized samples at five-second intervals across 180 seconds;
- headset and controller position/rotation, gaze origin/direction/target, audience coordinates and gesture events;
- a validated VR JSON replacement upload;
- a real-audio upload for conditional multimodal analysis.

The page ships with one bundled Local Mock baseline beneath each dataset using both transcript and structured VR evidence. The **Configure experiment** panel controls seven independently weighted agents:

- Grammar, Lexical, Pragmatic and Discourse agents use the transcript;
- Embodied Communication uses the structured VR JSON through the text-model route—numeric gaze and gesture traces do not require an image/video model;
- Fluency and Pronunciation use the raw audio through the separate multimodal route.

Audio agents run only when the user uploads a live audio file and the Multimodal configuration contains an API endpoint, key and model. Otherwise no audio request is sent and the result keeps an explicit reserved feedback slot. Browsers do not restore raw file bytes after reload, so a persisted audio attachment must be re-uploaded before another multimodal run.

Every enabled attention area is called independently. The final adjudicator rejects unsupported claims, merges overlap, and applies the 1–5 weights only after evidence and confidence checks. Re-running a dataset replaces and persistently displays its integrated result and its separate transcript, structured-VR and multimodal agent outputs.

The main Config page retains independent text and multimodal model endpoints. The prototype sends audio using an OpenAI-compatible `input_audio` message; providers with a different audio schema will require an adapter.

## Inputs

The minimum input is a transcript. Optional audio and VR traces can support pronunciation, prosody, gaze, gesture, body openness, audience orientation, and slide/space interaction. The app includes downloadable JSON templates and validates the normalized package before evaluation.

Session-derived test data is intentionally ignored by Git and should not be published without the participant's consent.

## Run locally

Requirements: Node.js 18 or later.

```bash
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

Build the production bundle with:

```bash
npm run build
```

## API configuration

The Config page has separate routes for text analysis and multimodal analysis. Use an OpenAI-compatible endpoint, model name, and API key, or choose Local Mock. Browser-side API keys are suitable only for this prototype; production calls should pass through a secure backend.

## Repository structure

```text
src/main.jsx                 Application, state, agents, adjudication, and pages
src/styles.css               Interface styles
scripts/prepare-session.mjs  Normalize exported session files for local testing
public/                      Input templates and static assets
public/mock-data/            3MT transcript datasets and five-second VR traces
scripts/generate-mock-vr-traces.mjs  Rebuild the three deterministic VR fixtures
test-data/                   Local session packages (Git-ignored)
```
