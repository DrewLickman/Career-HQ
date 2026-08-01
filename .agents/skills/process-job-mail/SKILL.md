---
name: process-job-mail
description: Review job-related Gmail or other mailbox messages through Computer Use, reconcile employer decisions and job alerts with Career HQ, verify worthwhile postings, and organize processed mail without exceeding authorization. Use for requests to process job email, update Career HQ from an inbox, handle rejection or interview messages, review LinkedIn or Glassdoor job digests, or label and archive processed job mail.
---

# Process Job Mail

Turn mailbox evidence into accurate Career HQ state while keeping both systems private and reversible.

## Required skills

Read and follow these skills before acting:

1. `computer-use` for live Windows mailbox interaction and confirmation policy.
2. `career-hq` for profile matching, posting snapshots, ledger updates, authorization boundaries, and handoff format.

Do not use a Gmail connector when the user explicitly requests Computer Use for an already-open browser account.

## Workflow

### 1. Establish scope

- Select the exact browser window and confirm the visible signed-in email address. Treat a typo in the request as a cue to verify, not to guess.
- Restate the mailbox and requested time range or mail types internally before changing anything.
- Treat reading and evaluation as authorized. Treat submission, replies, deletion, and unsubscribe according to Computer Use confirmation rules.

### 2. Search the whole mailbox

- Start with visible inbox job mail, then search beyond the inbox for recent employer decisions and requested alert sources.
- Use separate, narrow searches for employer decisions, LinkedIn alerts, Glassdoor alerts, and named employers. Do not rely on one broad keyword query; non-job receipts often contain words such as `application` or `unfortunately`.
- Inspect each digest body. Subject lines usually expose only the featured listing and can hide several stronger jobs.
- Deduplicate repeated roles across multiple digests before evaluating them.

### 3. Reconcile decisions first

- Match rejection, interview, assessment, offer, or submission-confirmation evidence to existing Career HQ applications by employer and role.
- Preserve the exact evidence needed by Career HQ without copying sensitive mailbox content into tracked files.
- Never mark an application submitted from an acknowledgement alone. Follow Career HQ's submission-evidence rules.
- When no decision messages are found, say so explicitly; do not infer that the ledger is current merely because the inbox is quiet.

### 4. Evaluate alert listings

- Check every listed role quickly against the verified private profile, including compensation, location, role identity, and learned approval preferences.
- Verify promising roles on a current, credible page. Prefer the employer's careers page or ATS. Record aggregator-only sources as a risk.
- Require a materially complete posting before adding an application. Skip expired, duplicate, below-minimum, geographically incompatible, or centrally unqualified roles.
- Add only roles the user could credibly pursue. Record the strongest match, largest gap, risk, and one concrete next action.
- Never generate materials or apply merely because a role was discovered.

### 5. Organize processed mail

- Prefer a `Jobs` label plus archive/move so processed messages leave the main inbox but remain recoverable.
- Create the label only when absent. Batch contiguous alert messages when practical.
- Ask for action-time confirmation immediately before deleting cloud mail or unsubscribing, even when earlier instructions expressed a general preference to delete irrelevant alerts.
- Leave non-job mail untouched.

### 6. Verify and report

- Run `python scripts/career_hq.py verify --workspace .` after ledger changes.
- Run the release privacy scan after handling real applicant or mailbox-derived data. Run repository tests when tracked source changed.
- Verify processed messages are absent from the main inbox and the `Jobs` label exists.
- Report counts: messages reviewed, decisions reconciled, roles added, roles skipped, messages organized, and messages awaiting confirmation.
- Do not expose internal application IDs, sensitive answers, or unnecessary email excerpts.

## Computer Use recovery patterns

- Call `get_window_state` after every UI action and use only indexes from that fresh state.
- Activate the target window before retrying an accessibility click that lands over another application or reports stale geometry.
- When screenshots fail, continue from the accessibility tree; do not guess account identity.
- If an element is just outside the window, temporarily reduce browser zoom, perform the action, and restore the original zoom before handoff.
- In Gmail, the `Older` button can walk a contiguous alert sequence efficiently. Wait briefly for the next message title before reading.
- If `Move to > Create new` falls below the viewport, create `Jobs` from Gmail's sidebar, then reopen `Move to` and choose it.

## PowerShell safety

Use single-quoted PowerShell arguments for compensation or other values containing `$`. Otherwise PowerShell expands strings such as `$98,800` and silently corrupts the ledger value. Re-read the created application and verify compensation before continuing.

## Stop conditions

Stop and ask the user only when:

- an action-time confirmation is required;
- the account, employer/role match, or requested mailbox scope cannot be verified;
- a ledger change would require guessing material facts; or
- processing requires replying, applying, or another external action the user did not authorize.
