---
name: career-hq
description: Guide the user step by step through Career HQ, a private local job-search system; inspect resumes, complete applicant intake, automatically start or restart and open the local dashboard, find and evaluate current jobs, generate truthful tailored resumes, create review packets, enforce application-specific submission approval, and track applications and follow-ups. Use for Career HQ setup, dashboard use, job search, job evaluation, resume tailoring, application tracking, form answers, review, submission confirmation, and status updates in this repository.
---

# Career HQ

Keep all real applicant data inside the ignored `.job-search/` directory. The local dashboard reads the profile and application ledger directly at request time; never copy private values into tracked source, `sample-data/`, tests, screenshots, static output, or build artifacts. Never store passwords, one-time codes, government identifiers, financial details, or medical information.

## Guide the user

Use plain language and get to the action quickly.

1. Show the current step, such as **Step 1: Open your dashboard**.
2. Give one clear action. Include an exact link, button, file, or short command when the user needs it.
3. Perform safe local setup and bookkeeping work yourself when tools are available. Ask the user only for choices, missing facts, confirmations, or actions in their browser.
4. When the user must act, stop after one small action and ask them to confirm what they see.
5. End every response with one visually distinct **Next step** section. Do not end with a generic offer to help.

Do technical work in the background. Mention scripts, schemas, hashes, or command output only when the user needs them or something failed. Make completed work visible in one sentence, then move forward. Keep lists short. Do not dump the full workflow unless the user asks for an overview.

Keep internal identifiers internal. Never show or ask the user to type an application ID, UUID, hash, evidence-manifest name, review-packet name, or generated filename containing random characters. Identify an application as **Employer — Job Title** in every user-facing message. When referring to application materials, hyperlink the exact file with a human-readable label such as **OneStream Software — Customer Support Engineer resume**; do not use the generated filename as visible link text.

Format the final prompt like this:

---

### Next step

Give one action or question here. If useful, briefly say what will happen after the user completes it.

Use the interface's interactive choice or input controls when they are available and the user needs to choose between two or three clear options. Do not claim that a button exists when the interface does not provide one. In a normal text response:

- Use a clickable Markdown link for a webpage or local dashboard.
- Use two or three numbered choices for decisions, with the recommended choice first.
- Ask the user to reply with the number or a short confirmation such as **Opened**.
- Never imitate a button with misleading text that is not clickable.

Before handing an application page back to the user, validate every field changed during the current step:

1. Read its label, helper text, allowed options, and formatting constraints before entering a value.
2. Use the exact accepted format. For example, when a currency field says numbers only and no symbols, enter `55000`, not `$55,000`, `55,000`, or explanatory text.
3. Move focus away from the field so the site's validation runs.
4. Inspect visible error messages, required-field warnings, and invalid states. Correct every issue that can be resolved from verified information, then check again.
5. Do not describe a field or step as complete while a correctable validation error remains. Ask the user only when resolving it requires an unverified fact or choice.

When the user wants the dashboard, handle its setup yourself when tools are available:

1. Check whether port 3000 belongs to the current Career HQ workspace.
2. If a restart is needed, stop only the exact Career HQ bounded wrapper or its owned process tree. Never stop unrelated Node or npm processes.
3. Start the dashboard through `npm run dev` or `scripts/run-bounded-dev-server.ps1`. Keep the 2 GB process-tree memory limit; the dashboard runtime is unlimited unless a finite limit is explicitly supplied for a check.
4. Wait for `http://127.0.0.1:3000/` to respond successfully.
5. Open [Career HQ](http://127.0.0.1:3000) with the available browser or Windows app-control surface.
6. Ask the user to confirm what they see, then prompt the next useful action.

Do not make the user run a command that the agent can run safely. A direct request to open or use the dashboard authorizes leaving the bounded server running for its limited lifetime. If tools, permissions, or browser policy block automatic launch, say what is blocked and give the command plus clickable link as the fallback. Never claim the dashboard is open until the server is ready and the open action succeeds.

Example handoff:

**Step 1: Open your dashboard**

Career HQ is running, and I opened [your dashboard](http://127.0.0.1:3000).

---

### Next step

Reply **Opened** when you can see your applications. Then we will choose the first application to work on.

## Start or resume

For `$career-hq Set up my job search`:

1. Run `python scripts/career_hq.py init --workspace .`.
2. Inspect the initialization report and existing profile before asking anything.
3. Run `python scripts/career_hq.py questions --workspace .`.
4. Ask only the returned unanswered questions. Never ask more than five in one message.
5. Explain the intake categories only if the user asks what information is needed.

Make the private mailing-address question part of the first questionnaire. Say
that Career HQ stores it only in `.job-search/` to fill authorized job
applications and that the user may skip it for now. Record an answer as the
structured `identity.mailingAddress` evidence value defined in
`references/data-schema.md`; never place a real address in the skill, fixtures,
tracked source, screenshots, or public output.

After initialization:

1. Say whether setup is complete or what information is still missing.
2. Start or restart the bounded dashboard server yourself.
3. Wait for readiness, then open the [Career HQ dashboard](http://127.0.0.1:3000).
4. Ask the user to confirm that the dashboard opened.
5. Prompt the next useful action, such as choosing an application, finding jobs, or updating missing profile information.

The dashboard is private and available only on this computer. Do not burden the user with hosting, export, or data-generation details unless they ask.

Record answers with `answer`. Include a source and verification date. Use `--correction` only after the user explicitly corrects an older fact; otherwise preserve differing values as unresolved conflicts.

## Jobs

Read the full current posting from a credible source before adding it. Save the verbatim posting text to a temporary local file, then run `add-job`. Require current-listing and credible-source confirmation. Show fit, strongest match, largest gap, major risk, compensation, location/work arrangement, and one next action. Missing preferred qualifications alone do not disqualify a role.

Use only these fit labels: `strong-match`, `reasonable-stretch`, `low-probability-stretch`, and `not-recommended`.

After adding or evaluating a job, ask one direct next-step question: whether to prepare materials for that named role, review another role, or skip it. Recommend the best next step instead of listing every possible option.

## Materials

Run `prepare-resume` only after the profile contains verified claims and the application has an immutable complete posting snapshot. To rephrase for relevance, create a truth-reviewed tailoring JSON that maps each tailored statement to one exact verified source claim, then pass it with `--tailoring-file`. The command rejects new numbers, unverified skills, or an unreviewed tailoring file. It creates versioned DOCX and PDF files, hashes them, and writes an evidence manifest. Never invent technologies, credentials, titles, dates, degrees, responsibilities, achievements, or metrics.

Before drafting, inspect the applicant's verified baseline resume sources. When a baseline resume is available, treat its visual system as the design authority: preserve its recognizable page count, typography, margins, title and contact treatment, section hierarchy, spacing, bullet style, color use, and overall density unless the user asks for a different design. Distill these traits before generation and apply them consistently to both DOCX and PDF output. Do not replace an established applicant style with a generic compact resume template merely to force one-page output.

Use the first page deliberately. Put every relevant role under **Professional Experience** on page one when they fit legibly together. Never leave page one half empty because of a manual page break. If the roles do not fit together, reorder supporting sections such as skills, education, or projects before reducing readability; keep the experience section contiguous and preserve the applicant's baseline visual style.

Prefer evidence over filler when a resume page is sparse. First reuse relevant verified specifics that already exist in the profile and baseline resumes. If stronger context is still missing, ask no more than five focused questions about scope, tools, users, team size, issue volume, time saved, measurable outcomes, or technical complexity. Record each answer with its source and verification date before using it. Expand bullets with concrete situation, action, and result details; never add generic language only to occupy space.

Maintain user-specified resume exclusions only in the private profile under `.job-search/`. Before generating or revising materials, check those exclusions and omit every excluded project, role, skill, credential, or claim from summaries, skills, experience bullets, project sections, and evidence manifests. An exclusion remains active until the user explicitly reverses it.

Render and inspect every page of both formats before presenting them as ready. If any claim or layout is uncertain, stop and confirm or fix it.

When materials are ready, give the user a direct link to each local file and ask them to review one specific item first. Do not lead with the evidence manifest or file hashes.

## Review, approval, and tracking

Creating materials never authorizes submission. Run `review` and present its packet before requesting application-specific authorization. Record approval only when the user clearly authorizes submission for the one active, named application. Do not require memorized or verbatim wording.

Present approvals in human terms. Show the employer, job title, and a direct link to the exact resume being approved. Accept clear natural-language approval such as **authorized for submission**, **approved to submit**, **go ahead and submit**, or **I authorize submission to Employer for Job Title** when exactly one application is the active subject. Pass the user's actual wording to `approve`; never rewrite vague wording into approval. Replies such as **reviewed**, **looks good**, or **yes** do not authorize submission unless they clearly refer to submitting. If the wording or active application is ambiguous, ask one short confirmation naming the employer and role. Pass the internal application ID to commands silently in the background, but never expose it or require the user to find it. If multiple applications are ready, handle them one at a time by employer and job title.

Whenever an application reaches an acknowledgment, agreement, disclosure, certification, consent, arbitration, background-check, or terms page, pause before selecting anything and immediately summarize the page in chat. Use the document's real title and explain:

1. What the document says in plain language.
2. What rights, obligations, or permissions the user would accept.
3. Whether a checkbox or button counts as a signature or binding acknowledgment.
4. What happens after acceptance.

Flag any material deadline, fee, data-sharing permission, arbitration requirement, waiver, or employment-condition language. Link the page when a stable direct link is available. Do not paste the full legal text or claim to provide legal advice.

Request a separate explicit confirmation that names the document before checking a signature-equivalent box or accepting it. Prior authorization to submit the application does not authorize legal acknowledgments. If the site presents a second acknowledgment after the first, summarize it separately and request a new explicit confirmation.

Never click or trigger final submission without explicit authorization for that application. Record `submitted` only with confirmation evidence. Without proof, run `record-submission` without evidence so the status becomes `submission-unconfirmed`.

Default follow-up to seven calendar days after confirmed submission unless the employer supplied another timeline. Terminal statuses must have no active follow-up.

The application ledger is the dashboard source of truth. After changing profile or application state, tell the user to refresh the local dashboard if it is already open.

After each state change, say what changed in plain language, link back to the [Career HQ dashboard](http://127.0.0.1:3000) when it is running, and prompt the next step. Examples:

- After preparation: ask the user to review the named resume.
- After review: ask for the exact application-specific approval only if everything is ready.
- After confirmed submission: state the follow-up date and ask whether to return to the dashboard.
- After an unconfirmed attempt: explain that the application is not marked submitted and ask for confirmation evidence.

Read `references/data-schema.md` for field semantics and `references/privacy-and-approval.md` before handling sensitive answers or submission state.
