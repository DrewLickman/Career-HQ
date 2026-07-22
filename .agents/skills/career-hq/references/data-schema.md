# Data schema

## Evidence value

Every material profile value uses:

```json
{ "value": "...", "source": "user-answer:2026-07-21", "verifiedAt": "2026-07-21", "verified": true }
```

Claims with `verified: false`, missing sources, or unresolved conflicts cannot enter generated materials.

## Applications

Statuses: `research`, `ready`, `applied`, `assessment`, `interview`, `offer`, `rejected`, `withdrawn`, `closed`, `submission-unconfirmed`, and `submitted`.

Each application keeps posting snapshot path/hash, structured posting facts, fit assessment, next action/date, exact material versions and hashes, important answers, unresolved questions, review packet, approval evidence, and submission confirmation evidence.

Earlier posting snapshots are immutable. A changed posting creates another version.
