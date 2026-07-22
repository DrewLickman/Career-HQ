---
name: career-hq
description: Operate Career HQ as a private local job-search system; inspect resumes, guide applicant intake, find and evaluate current jobs, generate truthful tailored resumes, create review packets, enforce application-specific submission approval, track follow-ups, and maintain the local dashboard. Use for Career HQ setup, job search, job evaluation, resume tailoring, application tracking, form answers, review, submission confirmation, dashboard updates, and status updates in this repository.
---

# Career HQ

Keep all real applicant data inside the ignored `.job-search/` directory. The local dashboard reads the profile and application ledger directly at request time; never copy private values into tracked source, `sample-data/`, tests, screenshots, static output, or build artifacts. Never store passwords, one-time codes, government identifiers, financial details, or medical information.

## Start or resume

For `$career-hq Set up my job search`:

1. Run `python scripts/career_hq.py init --workspace .`.
2. Inspect the initialization report and existing profile before asking anything.
3. Explain the five intake passes: search direction, career evidence, application defaults, sensitive answers when relevant, and tracking preferences.
4. Run `python scripts/career_hq.py questions --workspace .`.
5. Ask only the returned unanswered questions. Never ask more than five in one message.

After initialization, explain that `npm run dev` opens the private loopback-only dashboard. No hosting, export, or dashboard-data generation step is required.

Record answers with `answer`. Include a source and verification date. Use `--correction` only after the user explicitly corrects an older fact; otherwise preserve differing values as unresolved conflicts.

## Jobs

Read the full current posting from a credible source before adding it. Save the verbatim posting text to a temporary local file, then run `add-job`. Require current-listing and credible-source confirmation. Show fit, strongest match, largest gap, major risk, compensation, location/work arrangement, and one next action. Missing preferred qualifications alone do not disqualify a role.

Use only these fit labels: `strong-match`, `reasonable-stretch`, `low-probability-stretch`, and `not-recommended`.

## Materials

Run `prepare-resume` only after the profile contains verified claims and the application has an immutable complete posting snapshot. To rephrase for relevance, create a truth-reviewed tailoring JSON that maps each tailored statement to one exact verified source claim, then pass it with `--tailoring-file`. The command rejects new numbers, unverified skills, or an unreviewed tailoring file. It creates versioned DOCX and PDF files, hashes them, and writes an evidence manifest. Never invent technologies, credentials, titles, dates, degrees, responsibilities, achievements, or metrics.

Render and inspect every page of both formats before presenting them as ready. If any claim or layout is uncertain, stop and confirm or fix it.

## Review, approval, and tracking

Creating materials never authorizes submission. Run `review` and present its packet before requesting application-specific authorization. Record approval only with the exact confirmation required by `approve`.

Never click or trigger final submission without explicit authorization for that application. Record `submitted` only with confirmation evidence. Without proof, run `record-submission` without evidence so the status becomes `submission-unconfirmed`.

Default follow-up to seven calendar days after confirmed submission unless the employer supplied another timeline. Terminal statuses must have no active follow-up.

The application ledger is the dashboard source of truth. After changing profile or application state, tell the user to refresh the local dashboard if it is already open.

Read `references/data-schema.md` for field semantics and `references/privacy-and-approval.md` before handling sensitive answers or submission state.
