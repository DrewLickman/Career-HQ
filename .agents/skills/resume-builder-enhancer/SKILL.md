---
name: resume-builder-enhancer
description: Build, tailor, enhance, critique, strengthen, and ATS-check truthful resumes against a specific job posting. Use when Codex needs to compare a Career HQ application or local DOCX/PDF resume with a job posting, identify weak areas, safely improve verified content, ask for missing job-relevant facts, and generate a visually verified tailored resume without inventing claims.
---

# Resume Builder & Enhancer

Use Career HQ's private verified-evidence workflow. Keep real applicant data and all generated working files in `.job-search/`; never place them in tracked source, fixtures, screenshots, static output, or logs.

## Start and resume the goal

1. Call `get_goal` before work.
2. If there is no active goal, create one with the named employer and role, the source resume, and the required result: a truthful, visually verified tailored resume.
3. Resume a matching active goal. Do not replace an unrelated active goal; explain the conflict and wait for the user to resolve it.
4. Keep the goal active while facts are missing or revisions remain. Do not mark it blocked merely because user input is needed; ask the focused questions and resume after the answer. Mark it complete only after every quality gate in [quality-rubric.md](references/quality-rubric.md) passes.

Do not create a goal when the user only asks a general resume question without a specific posting and resume source.

## Gather the source of truth

Use one of these paths:

- **Career HQ application:** Read the complete immutable posting snapshot, verified profile, baseline resume sources, exclusions, unresolved conflicts, and latest material for the named employer and role.
- **Direct files:** Accept a local DOCX/PDF resume plus a posting URL, file, or complete pasted text. Confirm a URL is current and credible. Save the complete posting snapshot and source-file hash/metadata only under `.job-search/`. Do not process a real resume that is tracked by Git or not protected by `.job-search/`; ask the user to move it to a private location first.

When no baseline resume exists but the Career HQ profile has enough verified claims, build from that profile. When the only source is a direct resume, treat extracted facts as candidates until the user confirms them and they are recorded with a source and verification date.

Read `../career-hq/references/data-schema.md` and `../career-hq/references/privacy-and-approval.md` before storing evidence or generating materials.

## Audit and improve

Read [quality-rubric.md](references/quality-rubric.md), then inspect the whole posting and resume before recommending changes. Show a concise ranked scorecard with severity (`high`, `medium`, `low`), evidence, and one of these outcomes:

- `fixed` — applied automatically because the change is fully supported by verified evidence.
- `needs-info` — ask one focused question before using the fact.
- `suggested` — show an exact proposed change that needs the user's content or design decision.
- `cannot-claim` — state that the posting asks for something the evidence does not support.

Automatically fix only grammar, tense, punctuation, clarity, repetition, ordering, conservative job-language alignment, and layout issues that preserve the baseline visual system. Map every tailored summary or bullet to exact verified source evidence. Use a truth-reviewed tailoring JSON with `python scripts/career_hq.py prepare-resume --tailoring-file`; do not bypass its verification checks.

Ask at most five ranked, job-relevant questions at a time. Ask for concrete scope, tools, users, team size, issue volume, approved metrics, or outcomes. Record each confirmed answer with its source and verification date before using it. Preserve conflicts instead of choosing a date, title, number, or responsibility on the user's behalf.

Never invent or inflate skills, metrics, technologies, duties, titles, dates, credentials, proficiency, or outcomes. Never use protected traits, government identifiers, medical or financial data, hidden keyword stuffing, or inferred citizenship, work authorization, sponsorship, clearance, or export-control status. Treat this as truthful, privacy-safe resume work, not legal advice.

## Generate and verify

1. Run `prepare-resume` only after verified claims and an immutable posting snapshot are available.
2. Preserve the baseline resume's recognizable page flow, hierarchy, typography, spacing, bullet treatment, density, and contact treatment unless the user authorizes a redesign.
3. Render and inspect every page of the generated DOCX and PDF. Confirm the exact role title appears in the header, no content is clipped or sparse by accident, and the rendered formats reflect the same approved claims.
4. Re-audit the generated version. Repeat only while a meaningful safe improvement remains; do not create duplicate versions for cosmetic churn.
5. Mark the goal complete only when the full rubric passes. Give the user direct links to the latest DOCX and PDF and ask them to review one concrete item.

Do not ask for authorization to make safe resume revisions or generate a new version. Creating or enhancing a resume never authorizes application submission; follow Career HQ's separate review and application-specific approval workflow before any submission action.
