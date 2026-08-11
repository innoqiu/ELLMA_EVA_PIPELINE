import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const outputDirectory = resolve('public/mock-data');

function createTrace(sessionId, profile) {
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
      headset: { position: head, rotation_xyzw: [0, Number(Math.sin(yaw / 2).toFixed(3)), 0, Number(Math.cos(yaw / 2).toFixed(3))] },
      controllers: {
        left: { position: [Number((-0.27 - gestureScale * Math.abs(Math.sin(index))).toFixed(3)), Number((1.16 + gestureScale * Math.abs(Math.cos(index / 2))).toFixed(3)), 0.34], rotation_xyzw: [0, -0.08, 0, 0.997], tracked: true },
        right: { position: [Number((0.28 + gestureScale * Math.abs(Math.cos(index))).toFixed(3)), Number((1.17 + gestureScale * Math.abs(Math.sin(index / 2))).toFixed(3)), 0.36], rotation_xyzw: [0, 0.08, 0, 0.997], tracked: true },
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

await mkdir(outputDirectory, { recursive: true });
for (const [sessionId, profile] of [
  ['3mt-heat-01', 'screen-heavy'],
  ['3mt-ocean-02', 'fixed-centre'],
  ['3mt-food-03', 'balanced-active'],
]) {
  const path = resolve(outputDirectory, `${sessionId}-vr-trace.json`);
  await writeFile(path, `${JSON.stringify(createTrace(sessionId, profile), null, 2)}\n`, 'utf8');
  process.stdout.write(`generated ${path}\n`);
}
