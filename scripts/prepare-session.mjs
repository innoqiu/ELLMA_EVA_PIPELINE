import fs from 'node:fs';
import path from 'node:path';

const [sourceDirectory, outputDirectory] = process.argv.slice(2);

if (!sourceDirectory || !outputDirectory) {
  console.error('Usage: node scripts/prepare-session.mjs <source-session-directory> <output-directory>');
  process.exit(1);
}

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(sourceDirectory, name), 'utf8'));
const transcriptFile = readJson('transcript.json');
const metricsFile = readJson('presentation_metrics.json');
const systemLogFile = readJson('systemlog.json');
const metrics = metricsFile.PresentationMetrics;
const metadata = transcriptFile.Metadata;
const sessionStart = Date.parse(metadata.StartedAtUtc);

const performanceEntries = transcriptFile.TranscriptEntries
  .filter((entry) => entry.Speaker === 'user' || entry.Speaker === 'assistant')
  .slice(1, -1);

const roleSequence = [
  ['learner', 'presentation'],
  ['audience_agent', 'audience_qa'],
  ['learner', 'audience_qa'],
  ['audience_agent', 'audience_qa'],
  ['learner', 'audience_qa'],
  ['coach_agent', 'coach_qa'],
  ['learner', 'coach_qa'],
];

const turns = performanceEntries.map((entry, index) => ({
  event_offset_ms: Math.max(0, Math.round(Date.parse(entry.Timestamp) - sessionStart)),
  timestamp_utc: entry.Timestamp,
  timestamp_semantics: 'logged_after_turn_processing_not_utterance_boundary',
  role: roleSequence[index]?.[0] || entry.Speaker,
  phase: roleSequence[index]?.[1] || 'unknown',
  text: entry.Text.trim(),
}));

const captureStarts = systemLogFile.Lines.filter((line) => line.includes('Starting microphone capture.'));
const captureStops = systemLogFile.Lines.filter((line) => line.includes('Stopping microphone capture.'));
const captureSegments = captureStops.map((line, index) => {
  const duration = line.match(/RecordedSeconds=([0-9.]+)/)?.[1];
  const peak = line.match(/PeakLevel=([0-9.]+)/)?.[1];
  const frequency = line.match(/ClipFrequency=([0-9]+)/)?.[1];
  const startLine = captureStarts[index] || '';
  return {
    segment_index: index + 1,
    capture_started_local: startLine.slice(0, 23) || null,
    recorded_seconds: duration ? Number(duration) : null,
    sample_rate_hz: frequency ? Number(frequency) : 16000,
    peak_level: peak ? Number(peak) : null,
    audio_file_saved: false,
  };
});

const normalized = {
  schema_version: 'ellma-evaluation-input-1.0',
  generated_at_utc: new Date().toISOString(),
  provenance: {
    source_session_directory: sourceDirectory,
    source_files: [
      'transcript.json',
      'presentation_metrics.json',
      'systemlog.json',
      'session_snapshot.json',
      'raw_ai.json',
    ],
    excluded_from_learner_evidence: [
      'raw_ai.json: previous model prompts and responses',
      'final assistant feedback turn in transcript.json',
      'system and welcome turns',
    ],
  },
  session: {
    session_id: metadata.SessionId,
    learner_id: metadata.ParticipantCode,
    condition: metadata.Condition,
    scenario: metadata.Scenario,
    scenario_profile: metrics.ScenarioProfile,
    started_at_utc: metadata.StartedAtUtc,
    ended_at_utc: metadata.EndedAtUtc,
    complete: metadata.IsComplete,
  },
  context: {
    task_type: '3MT presentation',
    topic_or_brief: metrics.Topic,
    audience: 'General public',
    audience_source: '3MT test configuration; not explicitly stored in raw session',
    target_cefr_level: null,
    interaction_mode: 'Presentation plus Dialogue / Q&A',
  },
  presentation: {
    transcript: metrics.Transcript.trim(),
    duration_seconds: metrics.DurationSeconds,
    approximate_word_count: metrics.ApproximateWordCount,
    words_per_minute: metrics.WordsPerMinute,
    filler_word_count: metrics.FillerWordCount,
    long_pause_count: metrics.LongPauseCount,
  },
  interaction: {
    turns,
    audience_questions: metrics.AudienceQuestions,
    audience_answers: metrics.AudienceAnswers,
    coach_questions: metrics.CoachQuestions,
    coach_answers: metrics.CoachAnswers,
  },
  captured_metrics: {
    audience_facing_ratio: metrics.AudienceFacingRatio,
    gesture_activity_score: metrics.GestureActivityScore,
    stability_score: metrics.StabilityScore,
    audio_capture_segments: captureSegments,
  },
  evidence_availability: {
    transcript: true,
    speaker_turns: true,
    task_context: true,
    aggregate_fluency_metrics: true,
    raw_audio: false,
    word_timestamps: false,
    asr_confidence: false,
    pronunciation_evidence: false,
    vr_trace: false,
    gaze_trace: false,
    controller_trace: false,
    audience_coordinates: false,
  },
  model_routing_for_test: {
    text_provider: 'mock',
    multimodal_provider: 'mock',
    multimodal_note: 'No multimodal evidence is fabricated; unavailable modules must remain disabled.',
  },
};

const formatOffset = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const transcriptText = [
  '# ELLMA 3MT performance transcript',
  '# Timestamps are session event-log offsets, not verified utterance boundaries.',
  '# Historical AI feedback and system messages were excluded.',
  '',
  ...turns.flatMap((turn) => [
    `[${formatOffset(turn.event_offset_ms)}] ${turn.role.toUpperCase()} (${turn.phase}):`,
    turn.text,
    '',
  ]),
].join('\n');

const taskReference = [
  'Task type: Three Minute Thesis (3MT) presentation plus Q&A',
  `Topic/brief: ${metrics.Topic}`,
  'Audience used for this test: General public',
  'Audience provenance: Test configuration based on the 3MT scenario; not explicitly stored in the raw session.',
  'Target CEFR level: Not recorded',
  `Recorded presentation duration: ${metrics.DurationSeconds.toFixed(2)} seconds`,
  'Evidence limitation: No raw audio and no synchronized gaze/head/controller trace were saved.',
].join('\n');

const readme = `# Prepared ELLMA 3MT test package

This package was generated from session \`${metadata.SessionId}\`.

## Files

- \`ellma-evaluation-input.json\`: normalized evidence and provenance record.
- \`performance-transcript.txt\`: upload to the prototype as the transcript.
- \`3mt-task-reference.txt\`: upload as the task reference.

## Test constraints

- Text and interaction evidence are real session data.
- Presentation metrics are real stored aggregates.
- Raw audio was not saved, so Pronunciation & Prosody must remain disabled.
- VR gaze, headset and controller traces were not saved. Audience-facing and gesture scores are -1, so Embodied Communication must remain disabled.
- Both model routes may use mock providers, but missing evidence must not be simulated.
- Previous AI prompts/responses and the historical final tutor feedback were excluded from learner evidence.
`;

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'ellma-evaluation-input.json'), `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'performance-transcript.txt'), `${transcriptText}\n`, 'utf8');
fs.writeFileSync(path.join(outputDirectory, '3mt-task-reference.txt'), `${taskReference}\n`, 'utf8');
fs.writeFileSync(path.join(outputDirectory, 'README.md'), readme, 'utf8');

console.log(JSON.stringify({
  output_directory: outputDirectory,
  turns: turns.length,
  presentation_words: metrics.ApproximateWordCount,
  capture_segments: captureSegments.length,
  raw_audio: false,
  vr_trace: false,
}, null, 2));
