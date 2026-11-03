# Coolify deployment

Single private tutor workspace. All authenticated users share the same students and history. This is not a multi-tenant student portal. Run one application replica and one evaluation at a time initially.

## Coolify settings

1. Create an application from `innoqiu/ELLMA_EVA_PIPELINE`, branch `main`.
2. Choose **Dockerfile**, base directory `/`, Dockerfile `/Dockerfile`.
3. Expose container port **3000**; attach your domain and enable HTTPS through Coolify.
4. Add persistent storage at **/app/data**. Prefer a named Docker volume. For a host bind mount, grant UID/GID 1000 write access to that directory only.
5. Add runtime environment variables from `.env.example`. Set a unique `ADMIN_USER` and `ADMIN_PASSWORD` (16+ characters). Configure both TEXT_* and MULTIMODAL_* groups with actual provider URLs, model names and keys. Do not commit keys. URLs should end at the OpenAI-compatible `/v1`, not `/chat/completions`.
6. Deploy. Browser HTTP Basic authentication protects the UI, recordings and APIs. Health endpoint: `/healthz`. Do not expose port 3000 directly to the public internet; use the HTTPS proxy.

Model settings in Config are read-only in production; change them in Coolify and redeploy. Keys are attached to provider requests only on the server. Missing models are explicitly shown as unconfigured; the prototype's local mock fallback still exists, so configure models before collecting real evaluations.

## Resource planning

Start with a 512 MiB runtime memory limit and one active evaluation, then measure an audio run. MAX_MODEL_REQUESTS=12 is the maximum simultaneous provider HTTP requests, **not** 12 evaluation sessions: a single session fans out to several agents. Browser-side Three.js rendering needs no server GPU. Build memory is separate from runtime; if building alongside OpenClaw causes memory pressure, build the Docker image on another machine/CI and deploy that image.

## Persistence and backups

`/app/data/state.json` holds configurations other than provider credentials, students, traces, prompts and evaluation history. Writes are atomic and the previous version is retained as `state.previous.json`. A revision check rejects stale browser writes and shows a visible error; reload that browser before further editing. Keep one editing browser during an evaluation.

Uploaded student audio lives in `/app/data/audio`. Bundled sample audio and traces ship inside the image. They do not require the original workstation. Existing local-browser history is **not automatically migrated** to the server. Tutor overrides in Focused Feedback currently remain browser-local; evaluation outputs themselves are stored on the server.

Back up the entire data volume daily to separate storage; the previous-version file is not a substitute for daily backups. Also retain Coolify's environment-variable configuration securely. Never delete the volume during redeploy. Stop the app for a consistent manual backup. Test restore periodically.

## Local production smoke test

Run `npm ci`, `npm run build`, set ADMIN_USER / ADMIN_PASSWORD and DATA_DIR to a private local directory, then `node server.mjs`. Open port 3000. Development (`npm run dev`) retains the original browser-only storage and direct-provider configuration.

The server supports audio byte ranges, authenticated media downloads, JSON uploads, bounded request bodies, upstream timeouts and limited concurrent model requests. No evaluations run automatically on startup.
