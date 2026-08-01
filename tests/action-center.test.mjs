import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const sourcePath = fileURLToPath(new URL("../src/dashboard/action-center.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const actionCenter = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
const { deriveActionTasks, localDateKey, overviewActionTasks } = actionCenter;

function application(overrides = {}) {
  return {
    id: "internal-test-id",
    employer: "Fictional Works",
    role: "Test Specialist",
    location: "Remote",
    arrangement: "Remote",
    employmentType: "Full-time",
    status: "research",
    fit: "strong-match",
    compensation: "Fictional range",
    nextAction: "Review the fictional opportunity",
    nextActionDate: "2026-08-10",
    strongestMatch: "Fictional evidence",
    largestGap: "Fictional gap",
    risk: "Fictional risk",
    sourceUrl: "https://jobs.example.test/fictional",
    postingSnapshots: [],
    importantAnswers: [{
      question: "Sensitive fictional question",
      answer: "PRIVATE-FICTIONAL-ANSWER",
      source: "fictional-test",
      sensitive: true,
      approvalState: "",
    }],
    unresolvedQuestions: [],
    materials: [],
    approval: null,
    submissionEvidence: null,
    createdAt: "2026-08-01",
    updatedAt: "2026-08-01",
    ...overrides,
  };
}

function material(status = "passed") {
  return {
    version: "2",
    generatedAt: "2026-08-01",
    files: [{ kind: "pdf" }, { kind: "docx" }],
    visualVerificationStatus: status,
  };
}

test("derives every Action Center task kind with one task per application", () => {
  const applications = [
    application({
      id: "internal-confirmation-id",
      employer: "Confirmation Test",
      status: "submission-unconfirmed",
      unresolvedQuestions: ["A lower-priority blocker"],
      materials: [material("required")],
    }),
    application({
      id: "internal-question-id",
      employer: "Question Test",
      unresolvedQuestions: ["Fictional unanswered question"],
      nextActionDate: "2026-08-25",
    }),
    application({
      id: "internal-visual-id",
      employer: "Visual Test",
      materials: [material("required")],
      nextActionDate: "",
    }),
    application({
      id: "internal-authorized-id",
      employer: "Authorized Test",
      status: "ready",
      materials: [material()],
      approval: { authorizedAt: "2026-08-01", confirmation: "Recorded fictional authorization" },
      nextActionDate: "2026-08-25",
    }),
    application({
      id: "internal-review-id",
      employer: "Review Test",
      status: "ready",
      materials: [material()],
      nextActionDate: "2026-08-11",
    }),
    application({
      id: "internal-follow-up-id",
      employer: "Follow-up Test",
      status: "submitted",
      submissionEvidence: { kind: "fixture", description: "Fictional evidence", recordedAt: "2026-08-01" },
      nextActionDate: "2026-08-09",
    }),
    application({
      id: "internal-today-id",
      employer: "Today Test",
      nextActionDate: "2026-08-10",
    }),
    application({
      id: "internal-upcoming-id",
      employer: "Upcoming Test",
      nextActionDate: "2026-08-17",
    }),
  ];

  const tasks = deriveActionTasks(applications, "2026-08-10");
  assert.equal(tasks.length, applications.length);
  assert.equal(new Set(tasks.map((task) => task.applicationId)).size, applications.length);
  assert.deepEqual(
    new Set(tasks.map((task) => task.kind)),
    new Set([
      "submission-confirmation",
      "unresolved-questions",
      "visual-verification",
      "authorized-continuation",
      "packet-review",
      "follow-up",
      "next-action",
    ]),
  );
  assert.equal(tasks[0].kind, "submission-confirmation");
  assert.equal(tasks[1].kind, "follow-up");
  assert.equal(tasks[1].overdueDays, 1);
  assert.equal(tasks.find((task) => task.employer === "Today Test").section, "due-today");
  assert.equal(tasks.find((task) => task.employer === "Upcoming Test").section, "next-seven-days");
});

test("excludes terminal applications and ordinary work beyond seven days", () => {
  const tasks = deriveActionTasks([
    application({ id: "closed-id", employer: "Closed Test", status: "closed" }),
    application({ id: "future-id", employer: "Future Test", nextActionDate: "2026-08-18" }),
    application({
      id: "future-blocker-id",
      employer: "Future Blocker Test",
      unresolvedQuestions: ["Still blocked"],
      nextActionDate: "2026-08-18",
    }),
  ], "2026-08-10");

  assert.deepEqual(tasks.map((task) => task.employer), ["Future Blocker Test"]);
  assert.equal(tasks[0].section, "needs-attention");
});

test("sorts oldest overdue work first after confirmation issues", () => {
  const tasks = deriveActionTasks([
    application({ id: "newer-id", employer: "Newer Overdue", nextActionDate: "2026-08-09" }),
    application({ id: "older-id", employer: "Older Overdue", nextActionDate: "2026-08-02" }),
    application({ id: "confirm-id", employer: "Confirmation First", status: "submission-unconfirmed" }),
  ], "2026-08-10");

  assert.deepEqual(tasks.map((task) => task.employer), [
    "Confirmation First",
    "Older Overdue",
    "Newer Overdue",
  ]);
});

test("prompts use human context without internal ids or sensitive answers", () => {
  const task = deriveActionTasks([
    application({
      id: "private-internal-id-123",
      employer: "Human Context Test",
      role: "Support Engineer",
      unresolvedQuestions: ["Fictional blocker"],
    }),
  ], "2026-08-10")[0];

  assert.match(task.prompt, /\$career-hq/);
  assert.match(task.prompt, /Human Context Test — Support Engineer/);
  assert.doesNotMatch(task.prompt, /private-internal-id-123/);
  assert.doesNotMatch(task.prompt, /PRIVATE-FICTIONAL-ANSWER/);
});

test("validates explicit date keys and formats local calendar dates", () => {
  assert.throws(() => deriveActionTasks([], "08/10/2026"), /YYYY-MM-DD/);
  assert.equal(localDateKey(new Date(2026, 7, 10, 23, 59)), "2026-08-10");
});

test("limits the overview to the five highest-priority actions", () => {
  const tasks = Array.from({ length: 8 }, (_, index) => ({ applicationId: `task-${index + 1}` }));
  assert.deepEqual(
    overviewActionTasks(tasks).map((task) => task.applicationId),
    ["task-1", "task-2", "task-3", "task-4", "task-5"],
  );
});
