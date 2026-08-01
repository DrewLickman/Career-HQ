# Career HQ project rules

Career HQ is a reusable, local Codex operating system:

- The GitHub repository contains skills, scripts, schemas, templates, tests, and a local dashboard application.
- Each user's real workflow writes only to `.job-search/`, which is private, local, and ignored by Git.
- The dashboard may read `.job-search/applicant-profile.json` and `.job-search/applications.json` only at local request time. It must never statically import, copy, cache, prerender, publish, or bundle private values.
- `sample-data/` contains clearly fictional test fixtures only. It is not the dashboard's runtime data source.
- `site/` contains the authorized public onboarding website. It may contain instructions and clearly fictional preview data only; it must never import from the local dashboard loader or `.job-search/`.

## Non-negotiable privacy boundary

Never copy, redact, transform, import, or reference real applicant values in tracked source, fixtures, tests, screenshots, static output, build output, or release archives. Never store passwords, one-time codes, government identifiers, financial details, or medical information anywhere in Career HQ.

Keep the dashboard server bound to a loopback address by default. Do not add hosting, cloud storage, telemetry, analytics, remote databases, or synchronization without explicit user authorization and a privacy review.

The public `site/` application is the sole approved hosted surface. It must remain separate from the private dashboard and must not add authentication, forms, uploads, persistence, analytics, telemetry, or remote applicant storage.

Before any commit or release, run:

```powershell
python scripts/privacy_scan.py . --release
npm test
```

The privacy scanner must pass against both tracked/release files and the local `.next/` build. `.job-search/`, generated personal materials, local environment files, and temporary browser/build artifacts must stay ignored.

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

Prefer finite verification with `npm run build` and the test suite. Never launch Next.js, Vite, Vinext, Wrangler, `npx`, npm, or Node directly as a persistent Career HQ server.

If a local server is required, every agent must:

1. Launch it through `scripts/run-bounded-dev-server.ps1` (or `npm run dev`).
2. Record the guarded launch and reuse that server for the current verification pass.
3. Keep the 2 GB process-tree memory ceiling. The dashboard runtime is intentionally unlimited unless a finite limit is explicitly supplied for a check.
4. Stop the wrapper before final handoff unless the user explicitly asked for a bounded server to remain running.
5. Confirm the wrapper reports `treeStopped: true`, then audit that no Career HQ Next.js, Vinext, Vite, Wrangler, npm, or Node server process remains.

The wrapper owns the complete Windows process tree with a kill-on-close Job Object. Do not bypass it, including during diagnostic reproduction.

Run these checks after meaningful changes:

```powershell
python scripts/career_hq.py verify --workspace .
python scripts/privacy_scan.py . --release
npm test
```

For document changes, generate the fictional resume fixture, render its DOCX and PDF to page images, and inspect every page before release.
