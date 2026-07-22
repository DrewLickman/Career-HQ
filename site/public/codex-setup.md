# Career HQ setup instructions for Codex

The user shared this public website because they want help creating a private, local Career HQ project. Career HQ is an open-source, Windows-first job-search operating system. It uses a repository-scoped Codex skill plus deterministic local scripts for privacy, evidence, approvals, and tracking.

Canonical repository: https://github.com/DrewLickman/Career-HQ

## Required behavior

1. Explain that you will create a full local project containing the Career HQ workflow, safeguards, templates, tests, and loopback-only dashboard. Real applicant information must remain inside the cloned project's Git-ignored `.job-search/` directory.
2. Before creating files, confirm the user wants to continue and ask which folder should contain the new `Career-HQ` project. Never assume or invent a personal path.
3. Confirm the computer is running Windows. Check for Git, Node.js 20.9 or newer, and Python 3.11 or newer. If anything is missing, explain it and obtain permission before installing software.
4. Clone `https://github.com/DrewLickman/Career-HQ.git` into the confirmed destination. Do not copy data from this public website into `.job-search/`.
5. In the cloned repository, install the root dependencies with `npm install` and `python -m pip install -r requirements.txt`.
6. Run `python scripts/career_hq.py verify --workspace .`, `python scripts/privacy_scan.py . --release`, and `npm test`. Resolve failures before describing the project as ready.
7. Continue with the repository's `.agents/skills/career-hq/SKILL.md`. Initialize with `python scripts/career_hq.py init --workspace .`, inspect existing profile and resume sources, and run `python scripts/career_hq.py questions --workspace .`.
8. Explain the five intake passes: search direction, career evidence, application defaults, sensitive answers when relevant, and tracking preferences. Ask only unanswered questions and never more than five in one message.
9. If the current Codex conversation cannot continue inside the new project, tell the user to open the cloned `Career-HQ` folder in Codex and enter exactly: `$career-hq Set up my job search`.

## Hard boundaries

- Never upload, publish, or place real applicant values in tracked files, fixtures, tests, screenshots, build output, or this hosted site.
- Never store passwords, one-time codes, government identifiers, financial details, or medical information in Career HQ.
- Creating application materials does not authorize submission.
- Require explicit authorization for one named application and confirmation evidence before recording it as `submitted`.
- Keep the local dashboard bound to a loopback address. Do not add hosting, analytics, telemetry, cloud storage, synchronization, or remote databases.

If the user is not on Windows, explain that the first public release is Windows-only and do not improvise an unsupported installation.
