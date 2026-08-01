import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const sourcePath = fileURLToPath(new URL("../src/dashboard/job-summary.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const summaries = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);

test("summarizes the role section instead of the company introduction", () => {
  const posting = `
About us
Fictional Harbor builds tools for fictional teams around the world.

About the role
You will coordinate customer launches, document implementation plans, and resolve handoff blockers with support and product teams. This role owns the day-to-day launch schedule and keeps customers informed.

Qualifications
Three years of fictional experience.
`;

  const result = summaries.summarizeJobPosting(posting, "Implementation Specialist", "Fictional Harbor");
  assert.match(result, /^You will coordinate customer launches/);
  assert.match(result, /day-to-day launch schedule/);
  assert.doesNotMatch(result, /builds tools for fictional teams/);
});

test("prioritizes what-you-will-do over an earlier role overview", () => {
  const posting = `
About the role
This is a broad fictional overview of the position, its team, and its place in the organization.

What you will do
Coordinate implementation schedules, lead customer check-ins, document technical blockers, and partner with support engineers to keep launches moving. Own follow-up actions through resolution.

Qualifications
Two years of fictional experience.
`;

  const result = summaries.summarizeJobPosting(posting, "Implementation Coordinator", "Fictional Harbor");
  assert.match(result, /^Coordinate implementation schedules/);
  assert.match(result, /Own follow-up actions/);
  assert.doesNotMatch(result, /broad fictional overview/);
});

test("recognizes job-responsibilities and essential-duties headings", () => {
  const responsibilitiesPosting = `
Role summary
This fictional position supports a growing operations team across several product areas.

Job Responsibilities:
- Investigate customer issues and reproduce failures.
- Escalate clear findings to engineering and keep customers updated.
`;
  const dutiesPosting = `
## Essential Duties and Responsibilities
* Build weekly reports, reconcile data quality issues, and explain operational trends to partner teams.

## Requirements
Fictional requirements follow.
`;

  assert.match(
    summaries.summarizeJobPosting(responsibilitiesPosting, "Support Analyst", "Fictional Systems"),
    /^Investigate customer issues/,
  );
  assert.match(
    summaries.summarizeJobPosting(dutiesPosting, "Operations Analyst", "Fictional Systems"),
    /^Build weekly reports/,
  );
});

test("adds distinct responsibility bullets without repeating the sentence summary", () => {
  const posting = `
What you will do
You will coordinate customer launches and document implementation blockers for partner teams.
- Coordinate customer launches and document implementation blockers for partner teams.
- Lead weekly readiness reviews with customers and internal owners.
- Translate recurring launch issues into process improvements.
`;

  const result = summaries.summarizeJobPostingDetails(posting, "Implementation Specialist", "Fictional Harbor");
  assert.match(result.summary, /^You will coordinate customer launches/);
  assert.deepEqual(result.bullets, [
    "Lead weekly readiness reviews with customers and internal owners.",
    "Translate recurring launch issues into process improvements.",
  ]);
});

test("uses the first responsibility as the lead when a section contains only bullets", () => {
  const posting = `
Job responsibilities
- Investigate customer issues and reproduce failures before escalation.
- Keep customers updated while engineering reviews confirmed defects.
- Maintain internal troubleshooting guides for recurring problems.
`;

  const result = summaries.summarizeJobPostingDetails(posting, "Support Analyst", "Fictional Systems");
  assert.match(result.summary, /^Investigate customer issues/);
  assert.deepEqual(result.bullets, [
    "Keep customers updated while engineering reviews confirmed defects.",
    "Maintain internal troubleshooting guides for recurring problems.",
  ]);
});

test("parses optional saved bullets and removes summary duplicates", () => {
  const saved = `Support customers through technical onboarding and document implementation blockers.
- Support customers through technical onboarding and document implementation blockers.
- Coordinate unresolved issues with engineering owners.`;
  const result = summaries.normalizeJobSummaryDetails(saved);
  assert.match(result.summary, /^Support customers through technical onboarding/);
  assert.deepEqual(result.bullets, ["Coordinate unresolved issues with engineering owners."]);
});

test("prefers action language when a posting has no recognized section heading", () => {
  const posting = `Fictional context about the organization and its history.\n\nThis role supports customers, investigates technical issues, and works with engineering to resolve recurring problems.`;
  const result = summaries.summarizeJobPosting(posting, "Support Engineer", "Fictional Systems");
  assert.match(result, /^This role supports customers/);
});

test("keeps stored summaries short and readable", () => {
  const sentence = "You would guide customer onboarding and coordinate the work needed for a successful launch. ";
  const result = summaries.normalizeJobSummary(sentence.repeat(10));
  assert.ok(result.length <= 440);
  assert.ok((result.match(/\./g) ?? []).length <= 3);
});

test("states when the saved posting cannot support a day-to-day summary", () => {
  const result = summaries.summarizeJobPosting("", "Support Engineer", "Fictional Systems");
  assert.match(result, /Support Engineer at Fictional Systems/);
  assert.match(result, /does not have enough saved job-description text/);
});
