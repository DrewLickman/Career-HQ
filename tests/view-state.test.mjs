import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const sourcePath = fileURLToPath(new URL("../src/dashboard/view-state.ts", import.meta.url));
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const viewState = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
const {
  applicationStage,
  dashboardHref,
  filterApplications,
  normalizeApplicationFilter,
  normalizeDashboardView,
  selectVisibleApplication,
} = viewState;

function application(id, overrides = {}) {
  return {
    id,
    employer: `${id} Employer`,
    role: `${id} Role`,
    location: "Remote",
    nextAction: `Review ${id}`,
    nextActionDate: "",
    status: "research",
    fit: "reasonable-stretch",
    postingSnapshots: [],
    materials: [],
    approval: null,
    submissionEvidence: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

test("normalizes dashboard URLs and falls back safely", () => {
  assert.equal(normalizeDashboardView("applications"), "applications");
  assert.equal(normalizeDashboardView("preferences"), "preferences");
  assert.equal(normalizeDashboardView(["insights", "overview"]), "insights");
  assert.equal(normalizeDashboardView("unknown"), "overview");
  assert.equal(normalizeApplicationFilter("needs-action"), "needs-action");
  assert.equal(normalizeApplicationFilter("submitted"), "submitted");
  assert.equal(normalizeApplicationFilter("applied"), "active");
  assert.equal(normalizeApplicationFilter("unknown"), "active");
  assert.equal(dashboardHref("overview"), "/?view=overview");
  assert.equal(dashboardHref("preferences"), "/?view=preferences");
  assert.equal(dashboardHref("applications", "needs-action"), "/?view=applications&filter=needs-action");
});

test("maps ledger statuses into readable pipeline stages", () => {
  assert.equal(applicationStage("submission-unconfirmed"), "attention");
  assert.equal(applicationStage("applied"), "submitted");
  assert.equal(applicationStage("submitted"), "submitted");
  assert.equal(applicationStage("withdrawn"), "terminal");
  assert.equal(applicationStage("interview"), "interview");
});

test("filters needs-action, searchable application tags, active, and terminal views", () => {
  const applications = [
    application("alpha", {
      fit: "reasonable-stretch",
      nextActionDate: "",
      createdAt: "2026-08-01T12:00:00Z",
      postingSnapshots: [{ content: "Research customer needs and support internal users." }],
    }),
    application("beta", { employer: "Searchable Systems", status: "submission-unconfirmed", fit: "strong-match", nextActionDate: "2026-08-05" }),
    application("submitted", { status: "submitted", fit: "strong-match", nextActionDate: "2026-08-08" }),
    application("closed", { status: "closed" }),
  ];
  const actionIds = new Set(["beta"]);

  assert.deepEqual(filterApplications(applications, "", "active", actionIds).map((item) => item.id), ["alpha", "beta"]);
  assert.deepEqual(filterApplications(applications, "", "needs-action", actionIds).map((item) => item.id), ["beta"]);
  assert.deepEqual(filterApplications(applications, "searchable", "active", actionIds).map((item) => item.id), ["beta"]);
  assert.deepEqual(filterApplications(applications, "research", "active", actionIds).map((item) => item.id), ["alpha"]);
  assert.deepEqual(filterApplications(applications, "reasonable stretch", "active", actionIds).map((item) => item.id), ["alpha"]);
  assert.deepEqual(filterApplications(applications, "not scheduled", "active", actionIds).map((item) => item.id), ["alpha"]);
  assert.deepEqual(filterApplications(applications, "customer needs", "active", actionIds).map((item) => item.id), ["alpha"]);
  assert.deepEqual(filterApplications(applications, "August 1, 2026", "active", actionIds).map((item) => item.id), ["alpha"]);
  assert.deepEqual(filterApplications(applications, "8/5", "active", actionIds).map((item) => item.id), ["beta"]);
  assert.deepEqual(filterApplications(applications, "", "submitted", actionIds).map((item) => item.id), ["submitted"]);
  assert.deepEqual(filterApplications(applications, "", "terminal", actionIds).map((item) => item.id), ["closed"]);
});

test("keeps submitted applications out of every other filter", () => {
  const submitted = application("submitted", { status: "submitted" });
  const actionIds = new Set(["submitted"]);

  for (const filter of ["active", "needs-action", "research", "ready", "attention", "assessment", "interview", "offer", "terminal"]) {
    assert.deepEqual(filterApplications([submitted], "", filter, actionIds), [], filter);
  }
  assert.deepEqual(filterApplications([submitted], "", "submitted", actionIds), [submitted]);
});

test("falls back to the first visible application when selection disappears", () => {
  const applications = [application("first"), application("second")];
  assert.equal(selectVisibleApplication(applications, "second").id, "second");
  assert.equal(selectVisibleApplication(applications, "missing").id, "first");
  assert.equal(selectVisibleApplication([], "missing"), undefined);
});
