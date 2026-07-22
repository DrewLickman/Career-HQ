# Career HQ

Career HQ is a private, local-first Codex workspace for truthful job applications. It combines guided onboarding, immutable job-posting snapshots, fit analysis, versioned DOCX/PDF resumes, approval gates, follow-up tracking, and a polished dashboard.

The hosted dashboard is a fictional product preview. It cannot run local Codex skills or access your private files.

## Start here

Open this cloned folder in Codex and run:

```text
$career-hq Set up my job search
```

Career HQ will inspect available resume sources, initialize `.job-search/`, explain the intake passes, and ask no more than five unanswered questions at once.

## Local setup

1. Install Node.js 22.13 or newer and Python 3.11 or newer.
2. Run `npm install`.
3. Run `python -m pip install -r requirements.txt` for resume generation.
4. Run `npm run dev` to open the fictional dashboard demo. The guarded server
   stops after 10 minutes and at 2 GB of process-tree private memory.

For a finite startup/health check, run `npm run dev:check`. Prefer `npm run
build` and `npm test` when an interactive server is unnecessary. All development
server launches use a Windows Job Object that terminates the full process tree
on completion, failure, timeout, or wrapper interruption.

Private data is written only to `.job-search/`:

```text
.job-search/
  applicant-profile.json
  applications.json
  postings/
  materials/
  review-packets/
  generated-dashboard-data/
```

The whole folder is ignored by Git and excluded from the public build. Do not move its contents into `sample-data/`.

## Core commands

```powershell
python scripts/career_hq.py init --workspace .
python scripts/career_hq.py questions --workspace .
python scripts/career_hq.py add-job --help
python scripts/career_hq.py prepare-resume --help
python scripts/career_hq.py review --help
python scripts/career_hq.py approve --help
python scripts/career_hq.py record-submission --help
python scripts/career_hq.py dashboard-data --workspace .
```

`prepare-resume` never uses unverified claims. `approve` requires application-specific wording. `record-submission` records `submitted` only when confirmation evidence is supplied; otherwise it records `submission-unconfirmed`.

## Refresh the tracker

Run `python scripts/career_hq.py dashboard-data --workspace .`. This creates a private local dashboard payload under `.job-search/generated-dashboard-data/`; it never replaces the fictional public fixture automatically.

## Privacy and release checks

```powershell
python scripts/privacy_scan.py . --release
npm test
```

The scanner rejects private runtime folders in release inputs or outputs, non-fixture personal contact patterns, local absolute user paths, and tracked resume artifacts outside approved template/fixture locations.

## Sharing

Share the repository or publish it as a GitHub template only after the privacy and test commands pass. A fresh clone starts with no applicant data. Real application submission remains a user-controlled action and always requires explicit authorization for the specific application.
