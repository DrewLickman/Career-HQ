# Career HQ

Career HQ turns a cloned GitHub repository into a private, local job-search operating system for Codex. Codex provides the guided workflow and automation; deterministic local scripts enforce evidence, privacy, approval, and tracking rules; the dashboard reads the resulting local JSON files.

Nothing needs to be deployed. Each user gets a clean copy of the system and creates their own ignored `.job-search/` workspace.

## Start here

1. Clone or download this repository.
2. Open the folder in Codex.
3. Enter:

```text
$career-hq Set up my job search
```

Codex inspects available resume sources, initializes the private workspace, explains the intake passes, and asks no more than five unanswered questions at a time. After onboarding, ask Codex to find current jobs, evaluate fit, prepare truthful materials, guide reviews, and track outcomes.

## What runs where

```text
GitHub repository                     Private local workspace
├── .agents/skills/career-hq/   --->  ├── applicant-profile.json
├── scripts/                          ├── applications.json
├── app/ local dashboard              ├── postings/
├── dashboard/                        ├── materials/
├── templates/                        └── review-packets/
└── sample-data/ test fixtures              .job-search/ (Git ignored)
```

- The repository supplies Codex instructions, workflow scripts, schemas, templates, tests, and the dashboard application.
- `.job-search/` contains one user's real profile, job ledger, posting snapshots, generated documents, approvals, and submission evidence.
- The local dashboard reads `.job-search/applicant-profile.json` and `.job-search/applications.json` at request time. It does not copy them into source files or build output.
- The server binds to `127.0.0.1`, so it is available only on the user's computer by default.

## Local setup

Install Node.js 20.9 or newer and Python 3.11 or newer, then run:

```powershell
npm install
python -m pip install -r requirements.txt
npm run dev
```

Open `http://127.0.0.1:3000`. The guarded development server stops after 10 minutes and enforces a 2 GB process-tree memory ceiling. Run `npm run dev:check` for a finite startup check.

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

## Sharing safely

Run these before committing or sharing changes:

```powershell
python scripts/career_hq.py verify --workspace .
python scripts/privacy_scan.py . --release
npm test
```

Share the GitHub repository, not `.job-search/`. A fresh clone contains no applicant data. Fictional `sample-data/` files exist only as test and workflow fixtures; the dashboard does not import them.
