# Career HQ

Career HQ turns a cloned GitHub repository into a private, local job-search operating system for Codex. Codex provides the guided workflow and automation; deterministic local scripts enforce evidence, privacy, approval, and tracking rules; the dashboard reads the resulting local JSON files.

**New users:** open the [Career HQ setup website](https://career-hq-guide.magicalmongoose.chatgpt.site), copy its URL, and paste that URL into Codex. Codex will explain the project, ask where to create it, check the Windows prerequisites, and set up a clean local copy.

The public website contains instructions and a fictional product preview only. Each user's real workflow runs in an independent local project and writes only to its ignored `.job-search/` workspace.

## Two Career HQ websites

| Website | Purpose | Access |
| --- | --- | --- |
| [Public setup guide](https://career-hq-guide.magicalmongoose.chatgpt.site/) | Explains Career HQ, provides Codex setup instructions, and shows fictional preview data. | Publicly accessible; never receives applicant data. |
| [Private local dashboard](http://127.0.0.1:3000) | Displays the user's real applications, resumes, follow-ups, and private job-search records. | Works only on the user's computer while Career HQ is running. |

The public guide helps a new user install Career HQ. It is not the working dashboard. The local dashboard is the private application and opens only after the local Career HQ server starts.

## Start here

1. Open the public [Career HQ setup guide](https://career-hq-guide.magicalmongoose.chatgpt.site/). Do not expect to see your applications there.
2. Copy the website link and paste it into a new Codex conversation.
3. Confirm where Codex should create the local project.
4. After setup, double-click **START CAREER HQ.bat** to open the private local dashboard.

For a manual installation, clone or download this repository, open the folder in Codex, and enter:

```text
$career-hq Set up my job search
```

Codex inspects available resume sources, initializes the private workspace, explains the intake passes, and asks no more than five unanswered questions at a time. After onboarding, ask Codex to find current jobs, evaluate fit, prepare truthful materials, guide reviews, and track outcomes.

For a targeted resume review after you have a specific job posting, enter:

```text
$resume-builder-enhancer Compare my resume with this job posting and strengthen it using only truthful, verified information.
```

The skill works with an existing Career HQ application or a private local DOCX/PDF resume plus a complete posting. It keeps an improvement goal active, shows a ranked weakness scorecard, automatically applies safe evidence-backed edits, and asks focused questions before using any new claim.

## What runs where

```text
GitHub repository                     Private local workspace
├── START CAREER HQ.bat         --->  ├── applicant-profile.json
├── src/ local dashboard              ├── applications.json
├── .agents/skills/ Codex workflows   ├── postings/
├── site/ public setup guide          ├── materials/
├── scripts/ workflow tools           └── review-packets/
├── templates/
└── sample-data/ fictional tests            .job-search/ (Git ignored)
```

- The repository supplies Codex instructions, workflow scripts, schemas, templates, tests, and the dashboard application.
- `site/` supplies the public setup guide, machine-readable Codex instructions, and fictional interactive preview deployed through OpenAI Sites.
- `.job-search/` contains one user's real profile, job ledger, posting snapshots, generated documents, approvals, and submission evidence.
- The local dashboard reads `.job-search/applicant-profile.json` and `.job-search/applications.json` at request time. It does not copy them into source files or build output.
- The server binds to `127.0.0.1`, so it is available only on the user's computer by default.

## Local setup

Install Node.js 20.9 or newer and Python 3.11 or newer, then run:

```powershell
npm install
python -m pip install -r requirements.txt
```

Then double-click **START CAREER HQ.bat** at the top level of the project folder. It closes any older Career HQ terminal, starts one guarded local server, and opens the private dashboard automatically at [http://127.0.0.1:3000](http://127.0.0.1:3000). Double-click **STOP CAREER HQ.bat** when you want to close the server early.

This address is separate from the public setup guide and works only on the computer running Career HQ. The guarded development server stays running until you close it and enforces a 2 GB process-tree memory ceiling. Developers can still use `npm run dev`; use `npm run dev:check` for a finite startup check.

The dashboard shows a setup instruction until Codex initializes `.job-search/`. After that, refresh the page whenever Codex updates the local ledger; no export or sync command is required.

## Core workflow commands

```powershell
python scripts/career_hq.py init --workspace .
python scripts/career_hq.py questions --workspace .
python scripts/career_hq.py add-job --help
python scripts/career_hq.py prepare-resume --help
python scripts/career_hq.py review --help
python scripts/career_hq.py approve --help
python scripts/career_hq.py record-submission --help
python scripts/career_hq.py verify --workspace .
```

Codex normally runs these commands as it guides the user. `prepare-resume` accepts only verified claims. Creating materials never authorizes submission. `approve` requires authorization for one named application, and `record-submission` records `submitted` only with confirmation evidence.

## Resume Builder & Enhancer

Use `$resume-builder-enhancer` when you have both a specific role and a resume source. It compares the complete posting with verified Career HQ evidence or a private direct DOCX/PDF source, then ranks findings as `fixed`, `needs-info`, `suggested`, or `cannot-claim`.

- It may automatically improve wording, ordering, repetition, job-language alignment, and layout only when the exact source evidence supports the change.
- It asks no more than five focused questions before using a missing metric, tool, responsibility, or outcome.
- It preserves baseline resume style, omits user exclusions, labels unsupported qualifications instead of inventing them, and visually verifies generated DOCX/PDF output.
- It never treats resume generation as permission to submit an application.

Keep direct resume files outside tracked source or inside `.job-search/`. The skill stores posting snapshots and source metadata only in the private workspace.

## Sharing safely

Run these before committing or sharing changes:

```powershell
python scripts/career_hq.py verify --workspace .
python scripts/privacy_scan.py . --release
npm test
```

Share the GitHub repository, not `.job-search/`. A fresh clone contains no applicant data. Fictional `sample-data/` files exist only as test and workflow fixtures; the dashboard does not import them.
