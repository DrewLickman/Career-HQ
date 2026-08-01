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
