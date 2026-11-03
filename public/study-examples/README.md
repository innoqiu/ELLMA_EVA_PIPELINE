# Bundled student examples

These assets ship with the project and its production build. No upload cache or original recording directory is required at runtime. Open Students → Student 01–06 → Test1 / Test2. Each test loads its audio bytes into the existing evaluation pipeline; evaluation remains manual. Existing user-uploaded evidence and saved results are preserved.

Test1 uses Script A (Heat Has a Postcode); Test2 uses Script B (The Plastic We Cannot See). For unnamed recordings, A/B ordering was confirmed by the project owner. The supplied script is a reference text, not a verified verbatim transcript.

| Student | Source folder | A duration (s) | B duration (s) |
|---|---|---:|---:|
| 01 | recording/1 | 180.099 | 153.416 |
| 02 | recording/2 | 303.893 | 273.941 |
| 03 | recording/2 - 副本 | 288.612 | 335.962 |
| 04 | recording/2 - 副本 (2) | 283.371 | 305.493 |
| 05 | recording/2 - 副本 (3) | 186.880 | 218.155 |
| 06 | recording/2 - 副本 (4) | 215.779 | 211.411 |

`manifest.json` records original filenames, asset URLs, duration metadata, and the synthetic traces. Audio files are byte-for-byte copies. Each `*-vr.json` uses the existing ELLMA trace schema, independent deterministic motion and five-second samples starting at zero. `duration_ms` matches the audio duration; the final sampled pose is held for the remaining fraction of five seconds. Motion is simulated, not inferred from speech and not evidence of these speakers' actual physical delivery.

To regenerate from the original recordings, run `node scripts/build-study-examples.mjs` from the project directory. This local-only builder uses Playwright and Edge for audio metadata; set `PLAYWRIGHT_MODULE` to your Playwright module URL if it is not at the original workstation's path. Regeneration is not necessary to use or move the application.

No evaluation results or API credentials are included in this directory. Keep this directory when copying the project or distributing its build.
