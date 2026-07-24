import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const GUARD = join(REPO, "scripts", "run-bounded-dev-server.ps1");
const POWERSHELL = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");

test("local dashboard reads an ignored workspace at request time", { skip: process.platform !== "win32" }, () => {
  const workspace = mkdtempSync(join(tmpdir(), "career-hq-dashboard-"));
  const privateRoot = join(workspace, ".job-search");
  const port = 31_000 + (process.pid % 1_000);
  const url = `http://127.0.0.1:${port}/`;
  mkdirSync(privateRoot);
  mkdirSync(join(privateRoot, "postings"));
  mkdirSync(join(privateRoot, "materials", "local-test"), { recursive: true });
  writeFileSync(join(privateRoot, "postings", "local-test-posting.txt"), "Full saved posting for the fictional Local Test Systems role.");
  writeFileSync(join(privateRoot, "materials", "local-test", "local-test-001-resume-v001.pdf"), "older fictional resume bytes");
  writeFileSync(join(privateRoot, "materials", "local-test", "local-test-001-resume-v002.pdf"), "current fictional PDF bytes");
  writeFileSync(join(privateRoot, "materials", "local-test", "local-test-001-resume-v002.docx"), "current fictional Word bytes");
  writeFileSync(join(privateRoot, "applicant-profile.json"), JSON.stringify({
    identity: { displayName: { value: "Local Test Candidate", source: "test-fixture", verifiedAt: "2026-07-22", verified: true } },
    searchDirection: { targetRoles: { value: ["Local Systems Specialist"], source: "test-fixture", verifiedAt: "2026-07-22", verified: true } },
  }));
  writeFileSync(join(privateRoot, "applications.json"), JSON.stringify({
    updatedAt: "2026-07-22T12:00:00Z",
    applications: [{
      id: "local-test-001", employer: "Local Test Systems", role: "Automation Specialist",
      location: "Remote", arrangement: "Remote", employmentType: "Full-time",
      status: "research", fit: "strong-match", url: "https://jobs.example.test/local-test",
      compensation: "Test range", nextAction: "Review local test posting", nextActionDate: "2026-07-23",
      strongestMatch: "Verified test evidence", largestGap: "Test gap", risk: "Test risk", updatedAt: "2026-07-22",
      postingSnapshots: [{
        path: "postings/local-test-posting.txt",
        sourceUrl: "https://jobs.example.test/local-test",
        capturedAt: "2026-07-22T12:00:00Z",
        credibleSourceConfirmed: true,
      }],
      importantAnswers: [{
        question: "Can the fictional candidate work remotely?",
        answer: "Yes",
        source: "test-fixture",
        sensitive: false,
      }],
      materials: [
        {
          version: 1,
          generatedAt: "2026-07-21T12:00:00Z",
          files: [{
            kind: "pdf",
            filename: "local-test-001-resume-v001.pdf",
            path: "materials/local-test/local-test-001-resume-v001.pdf",
          }],
        },
        {
          version: 2,
          generatedAt: "2026-07-22T12:00:00Z",
          files: [
            {
              kind: "pdf",
              filename: "local-test-001-resume-v002.pdf",
              path: "materials/local-test/local-test-001-resume-v002.pdf",
            },
            {
              kind: "docx",
              filename: "local-test-001-resume-v002.docx",
              path: "materials/local-test/local-test-001-resume-v002.docx",
            },
          ],
        },
      ],
    }, {
      id: "local-test-closed", employer: "Closed Test Works", role: "Archived Specialist",
      location: "Remote", arrangement: "Remote", employmentType: "Full-time",
      status: "closed", fit: "reasonable-stretch", url: "https://jobs.example.test/closed-test",
      compensation: "Test range", nextAction: "No active action - terminal status.", nextActionDate: null,
      strongestMatch: "Historical test evidence", largestGap: "Historical test gap", risk: "Closed role", updatedAt: "2026-07-20",
      postingSnapshots: [],
      importantAnswers: [],
      materials: [],
    }],
  }));

  try {
    const result = spawnSync(POWERSHELL, [
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", GUARD,
      "-Command", `node node_modules/next/dist/bin/next start -H 127.0.0.1 -p ${port}`,
      "-HealthUrl", url,
      "-VerificationCommand", `node tests/verify-local-dashboard.mjs ${url}`,
      "-HoldAfterReadySeconds", "0",
      "-MaxRuntimeSeconds", "30",
      "-MemoryLimitMB", "1024",
    ], {
      cwd: REPO,
      encoding: "utf8",
      timeout: 45_000,
      env: { ...process.env, CAREER_HQ_WORKSPACE: workspace },
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.status, 0, output);
    assert.match(output, /"treeStopped":true/);
    assert.match(output, /Local dashboard verification passed/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("dashboard source uses private local JSON instead of sample data", () => {
  const page = readFileSync(join(REPO, "src", "app", "page.tsx"), "utf8");
  const loader = readFileSync(join(REPO, "src", "dashboard", "load-local-data.ts"), "utf8");
  const gitignore = readFileSync(join(REPO, ".gitignore"), "utf8");
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(page, /loadLocalDashboard/);
  assert.doesNotMatch(page, /sample-data/);
  assert.match(loader, /\.job-search/);
  assert.match(loader, /applicant-profile\.json/);
  assert.match(loader, /applications\.json/);
  assert.match(gitignore, /^\/\.job-search\/$/m);
});

test("README clearly separates the public guide from the private local dashboard", () => {
  const readme = readFileSync(join(REPO, "README.md"), "utf8");
  const launcher = readFileSync(join(REPO, "START CAREER HQ.bat"), "utf8");
  assert.match(readme, /## Two Career HQ websites/);
  assert.match(readme, /\[Public setup guide\]\(https:\/\/career-hq-guide\.magicalmongoose\.chatgpt\.site\/\)/);
  assert.match(readme, /\[Private local dashboard\]\(http:\/\/127\.0\.0\.1:3000\)/);
  assert.match(readme, /never receives applicant data/i);
  assert.match(readme, /works only on the user's computer/i);
  assert.match(readme, /START CAREER HQ\.bat/);
  assert.match(launcher, /run-bounded-dev-server\.ps1/);
  assert.match(launcher, /-OpenBrowser/);
  assert.match(launcher, /--check/);
});

test("dashboard source includes accessible interaction and responsive cards", () => {
  const layout = readFileSync(join(REPO, "src", "app", "layout.tsx"), "utf8");
  const component = readFileSync(join(REPO, "src", "dashboard", "CareerDashboard.tsx"), "utf8");
  const css = readFileSync(join(REPO, "src", "dashboard", "dashboard.module.css"), "utf8");
  const globals = readFileSync(join(REPO, "src", "app", "globals.css"), "utf8");
  assert.match(layout, /<html[^>]+suppressHydrationWarning/);
  assert.match(component, /aria-pressed/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-current/);
  assert.match(component, /getBoundingClientRect/);
  assert.match(component, /Original source/);
  assert.match(component, /Full saved posting/);
  assert.match(component, /Search applications/);
  assert.match(component, /Filter by pipeline status/);
  assert.match(component, /Active applications/);
  assert.match(component, /closed hidden/);
  assert.match(component, />CHQ</);
  assert.match(component, /Latest resume/);
  assert.doesNotMatch(component, /Local by design|Local files only|Private local workspace|reads private local files/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(globals, /:focus-visible/);
});
