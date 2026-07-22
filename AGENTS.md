# Career HQ project rules

Career HQ has two intentionally separate surfaces:

- The public web demo reads only `sample-data/`, whose contents must remain clearly fictional.
- The real Codex workflow writes only to `.job-search/`, which is private, local, and ignored by Git.

## Non-negotiable privacy boundary

Never copy, redact, transform, import, or reference real applicant data in `app/`, `dashboard/`, `sample-data/`, `public/`, tests, screenshots, build output, or release archives. Never store passwords, one-time codes, government identifiers, financial details, or medical information anywhere in Career HQ.

Before any commit or release, run:

```powershell
python scripts/privacy_scan.py . --release
npm test
```

The privacy scanner must pass against both the repository and `dist/`. `.job-search/`, generated personal materials, local environment files, and temporary browser/build artifacts must stay ignored.

## Workflow rules

- Inspect existing profile and resume sources before asking intake questions.
- Ask only unanswered questions, never more than five in one message.
- Store every material claim with its source and verification date.
- Preserve conflicts; an explicit user correction may supersede an older source but must remain traceable.
- Generate application materials only from verified claims and a complete immutable posting snapshot.
- Creating materials does not authorize submission.
- Require explicit authorization for one named application, then require confirmation evidence before recording `submitted`.
- Record an unproven attempt as `submission-unconfirmed`.

## Validation

Prefer finite verification: use `npm run build` and the test suite unless an
interactive browser check truly requires a local server. Never launch `vinext`,
Vite, Wrangler, `npx`, or Node directly as a persistent Career HQ server.

If a local server is required, every agent must:

1. Launch it through `scripts/run-bounded-dev-server.ps1` (or `npm run dev`).
2. Record the guarded launch and reuse that server for the current verification pass.
3. Keep the default 10-minute runtime and 2 GB process-tree memory ceilings unless using stricter values.
4. Stop the wrapper before final handoff unless the user explicitly asked for a bounded server to remain running.
5. Confirm the wrapper reports `treeStopped: true`, then audit that no Career HQ vinext, Vite, Wrangler, npm, or Node server process remains.

The wrapper owns the complete Windows process tree with a kill-on-close Job
Object. Do not bypass it, including during diagnostic reproduction.

Run these checks after meaningful changes:

```powershell
python scripts/career_hq.py verify --workspace .
python scripts/privacy_scan.py . --release
npm test
```

For document changes, generate the fictional resume fixture, render its DOCX and PDF to page images, and inspect every page before release.
