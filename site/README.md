# Career HQ public setup site

This directory is the standalone OpenAI Sites application for Career HQ's public onboarding guide and fictional product preview.

It is intentionally separate from the repository-root Next.js application:

- The root application is the private, loopback-only dashboard and reads `.job-search/` at request time.
- This application is public, uses fictional display data only, and has no file upload, authentication, persistence, analytics, or private-data access.
- `public/codex-setup.md` is the canonical agent handoff contract. `public/llms.txt` directs agents to it.

Run `npm test` from this directory for the Cloudflare-compatible build and rendered-output checks. Run the repository-root release checks before publishing.
