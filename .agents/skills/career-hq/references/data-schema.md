# Data schema

## Evidence value

Every material profile value uses:

```json
{ "value": "...", "source": "user-answer:2026-07-21", "verifiedAt": "2026-07-21", "verified": true }
```

Claims with `verified: false`, missing sources, or unresolved conflicts cannot enter generated materials.

## Mailing address

Store a mailing address only in private `.job-search/applicant-profile.json` as
`identity.mailingAddress`. Its evidence `value` is either `null` when the user
defers or an object with `addressLine1`, optional `addressLine2`, `city`,
`region`, `postalCode`, and `country`. Use it only to fill a job application the
user has authorized.

## Applications

Statuses: `research`, `ready`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`, `closed`, `submission-unconfirmed`, and `submitted`.

Each application keeps a short source-grounded `jobSummary` explaining what the role is and what the person would do, plus posting snapshot path/hash, structured posting facts, fit assessment, next action/date, exact material versions and hashes, important answers, unresolved questions, review packet, approval evidence, and submission confirmation evidence.

Earlier posting snapshots are immutable. A changed posting creates another version.
