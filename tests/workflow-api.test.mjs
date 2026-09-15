import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/api/workflow/route.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
function request(body, origin = "http://127.0.0.1:3000", url = "http://127.0.0.1:3000/api/workflow") {
  return new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("workflow endpoint rejects external origins, hosts and arbitrary commands", async () => {
  assert.equal((await POST(request({ action: "next-actions" }, "https://external.example.test"))).status, 403);
  assert.equal((await POST(request({ action: "next-actions" }, "https://external.example.test", "https://external.example.test/api/workflow"))).status, 403);
  assert.equal((await POST(request({ action: "approve" }))).status, 400);
  assert.equal((await POST(request({ action: "analyze-job", applicationId: "../escape; echo test" }))).status, 400);
});

test("dashboard invokes the shared Python analysis with private no-store responses", async () => {
  const workspace = mkdtempSync(join(tmpdir(), "career-hq-tools-"));
  const prior = process.env.CAREER_HQ_WORKSPACE;
  try {
    const root = join(workspace, ".job-search");
    mkdirSync(join(root, "postings"), { recursive: true });
    const content = "Responsibilities\n- Coordinate customer onboarding plans.\nRequired qualifications\n- Customer support experience.";
    writeFileSync(join(root, "postings/job.txt"), content);
    writeFileSync(join(root, "applicant-profile.json"), JSON.stringify({ skills: [], experience: [], conflicts: [] }));
    writeFileSync(join(root, "applications.json"), JSON.stringify({ applications: [{ id: "fictional", employer: "Fictional Harbor", role: "Test Specialist", status: "research", postingSnapshots: [{ path: "postings/job.txt", sha256: createHash("sha256").update(content).digest("hex") }] }] }));
    process.env.CAREER_HQ_WORKSPACE = workspace;
    const response = await POST(request({ action: "analyze-job", applicationId: "fictional" }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /private, no-store/);
    const result = await response.json();
    assert.equal(result.status, "needs-ai");
    assert.equal(result.data.analysis.sections.responsibilities[0].line, 2);
    assert.equal(result.data.cacheHit, false);
    assert.equal(JSON.parse(readFileSync(join(root, "applications.json"))).applications[0].status, "research");
  } finally {
    if (prior === undefined) delete process.env.CAREER_HQ_WORKSPACE;
    else process.env.CAREER_HQ_WORKSPACE = prior;
    rmSync(workspace, { recursive: true, force: true });
  }
});
