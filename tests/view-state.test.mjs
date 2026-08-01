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
    status: "research",
    ...overrides,
  };
}

test("normalizes dashboard URLs and falls back safely", () => {
  assert.equal(normalizeDashboardView("applications"), "applications");
  assert.equal(normalizeDashboardView(["insights", "overview"]), "insights");
  assert.equal(normalizeDashboardView("unknown"), "overview");
  assert.equal(normalizeApplicationFilter("needs-action"), "needs-action");
  assert.equal(normalizeApplicationFilter("unknown"), "active");
  assert.equal(dashboardHref("overview"), "/?view=overview");
  assert.equal(dashboardHref("applications", "needs-action"), "/?view=applications&filter=needs-action");
});

test("maps ledger statuses into readable pipeline stages", () => {
  assert.equal(applicationStage("submission-unconfirmed"), "attention");
  assert.equal(applicationStage("submitted"), "applied");
  assert.equal(applicationStage("withdrawn"), "terminal");
  assert.equal(applicationStage("interview"), "interview");
});

test("filters needs-action, search, active, and terminal views", () => {
  const applications = [
    application("alpha"),
    application("beta", { employer: "Searchable Systems", status: "submission-unconfirmed" }),
    application("closed", { status: "closed" }),
  ];
  const actionIds = new Set(["beta"]);

  assert.deepEqual(filterApplications(applications, "", "active", actionIds).map((item) => item.id), ["alpha", "beta"]);
  assert.deepEqual(filterApplications(applications, "", "needs-action", actionIds).map((item) => item.id), ["beta"]);
  assert.deepEqual(filterApplications(applications, "searchable", "active", actionIds).map((item) => item.id), ["beta"]);
  assert.deepEqual(filterApplications(applications, "", "terminal", actionIds).map((item) => item.id), ["closed"]);
});

test("falls back to the first visible application when selection disappears", () => {
  const applications = [application("first"), application("second")];
  assert.equal(selectVisibleApplication(applications, "second").id, "second");
  assert.equal(selectVisibleApplication(applications, "missing").id, "first");
  assert.equal(selectVisibleApplication([], "missing"), undefined);
});
