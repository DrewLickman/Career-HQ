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
          visualVerification: { status: "required", verifiedAt: null, notes: null },
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
      id: "local-test-unconfirmed", employer: "Confirmation Test Systems", role: "Support Engineer",
      location: "Remote", arrangement: "Remote", employmentType: "Full-time",
      status: "submission-unconfirmed", fit: "reasonable-stretch", url: "https://jobs.example.test/confirmation-test",
      compensation: "Test range", nextAction: "Find fictional confirmation evidence", nextActionDate: "2026-07-23",
      strongestMatch: "Verified fictional support evidence", largestGap: "Fictional product gap", risk: "Submission state is unconfirmed", updatedAt: "2026-07-22",
      postingSnapshots: [],
      importantAnswers: [],
      unresolvedQuestions: [],
      materials: [],
      approval: { authorizedAt: "2026-07-22T11:00:00Z", confirmation: "Recorded fictional authorization" },
      submissionEvidence: null,
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
      "-InstanceScope", workspace,
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
  assert.match(page, /normalizeDashboardView/);
  assert.match(page, /normalizeApplicationFilter/);
  assert.doesNotMatch(page, /sample-data/);
  assert.match(loader, /\.job-search/);
  assert.match(loader, /applicant-profile\.json/);
  assert.match(loader, /applications\.json/);
  assert.match(gitignore, /^\/\.job-search\/$/m);
});

test("README clearly separates the public guide from the private local dashboard", () => {
  const readme = readFileSync(join(REPO, "README.md"), "utf8");
  const launcher = readFileSync(join(REPO, "START CAREER HQ.bat"), "utf8");
  const stopLauncher = readFileSync(join(REPO, "STOP CAREER HQ.bat"), "utf8");
  const stopScript = readFileSync(join(REPO, "scripts", "stop-career-hq-server.ps1"), "utf8");
  assert.match(readme, /## Two Career HQ websites/);
  assert.match(readme, /\[Public setup guide\]\(https:\/\/career-hq-guide\.magicalmongoose\.chatgpt\.site\/\)/);
  assert.match(readme, /\[Private local dashboard\]\(http:\/\/127\.0\.0\.1:3000\)/);
  assert.match(readme, /never receives applicant data/i);
  assert.match(readme, /works only on the user's computer/i);
  assert.match(readme, /START CAREER HQ\.bat/);
  assert.match(readme, /STOP CAREER HQ\.bat/);
  assert.match(launcher, /run-bounded-dev-server\.ps1/);
  assert.match(launcher, /-OpenBrowser/);
  assert.match(launcher, /--check/);
  assert.match(stopLauncher, /stop-career-hq-server\.ps1/);
  assert.match(stopScript, /run-bounded-dev-server\.ps1/);
  assert.match(stopScript, /Get-NetTCPConnection/);
  assert.match(stopScript, /Stop-Process/);
});

test("dashboard source includes accessible hybrid navigation and readable typography", () => {
  const layout = readFileSync(join(REPO, "src", "app", "layout.tsx"), "utf8");
  const component = readFileSync(join(REPO, "src", "dashboard", "CareerDashboard.tsx"), "utf8");
  const css = readFileSync(join(REPO, "src", "dashboard", "dashboard.module.css"), "utf8");
  const globals = readFileSync(join(REPO, "src", "app", "globals.css"), "utf8");
  assert.match(layout, /<html[^>]+suppressHydrationWarning/);
  assert.match(component, /aria-pressed/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-current/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /role="tab"/);
  assert.match(component, /role="tabpanel"/);
  assert.match(component, /aria-selected/);
  assert.match(component, /Overview/);
  assert.match(component, /Applications/);
  assert.match(component, /Insights/);
  assert.match(component, /window\.history\.pushState/);
  assert.match(component, /window\.history\.replaceState/);
  assert.match(component, /popstate/);
  assert.match(component, /needs-action/);
  assert.match(component, /overviewActionTasks/);
  assert.match(component, /View all \{tasks\.length\} actions/);
  assert.match(component, /Original source/);
  assert.match(component, /Full saved posting/);
  assert.match(component, /What the job actually is/);
  assert.doesNotMatch(component, /What you would do/);
  assert.match(component, /<h3>\{application\.role\}<\/h3>\s*<p>\{application\.employer\}<\/p>/);
  assert.match(component, /DetailFact label="Work setup" value=\{application\.arrangement\}/);
  assert.match(component, /DetailFact label="Employment type" value=\{application\.employmentType\}/);
  assert.match(component, /DetailFact label="Location" value=\{application\.location\}/);
  assert.match(component, /DetailFact label="Added" value=\{formatTimestamp\(application\.createdAt\)\}/);
  assert.match(component, /DetailFact label="Last updated" value=\{formatTimestamp\(application\.updatedAt\)\}/);
  assert.doesNotMatch(component, /DetailSection title="Job details"/);
  assert.match(component, /Search applications/);
  assert.match(component, /Filter by status/);
  assert.match(component, /Active applications/);
  assert.match(component, />CHQ</);
  assert.match(component, /Latest resume/);
  assert.match(component, /Continue in Codex/);
  assert.match(component, /ApplicationDetail[\s\S]*task=/);
  assert.match(component, /setInterval\(refreshWhenVisible, 15_000\)/);
  assert.match(component, /visibilitychange/);
  assert.match(component, /navigator\.clipboard\.writeText/);
  assert.match(component, /Copied\. Paste the prompt into Codex\./);
  assert.match(component, /role="status"/);
  assert.match(component, /setTimeout\(\(\) => setCopyMessage\(""\), 4_000\)/);
  assert.doesNotMatch(component, /Priority queue/);
  assert.match(css, /\.priorityList/);
  assert.match(css, /\.detailTabs/);
  assert.match(css, /\.detailOverview/);
  assert.match(css, /\.detailOverviewMain/);
  assert.match(css, /\.jobSummary/);
  assert.match(css, /\.detail \{[\s\S]*?position: static;/);
  assert.match(css, /\.detailMeta \{ display: grid; grid-template-columns: repeat\(2, 1fr\)/);
  assert.match(css, /\.copyToast/);
  assert.match(css, /\.workspacePill/);
  assert.doesNotMatch(component, /Local by design|Local files only|Private local workspace|reads private local files/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(globals, /color-scheme:\s*dark/);
  assert.match(globals, /:focus-visible/);

  const fontDeclarations = css.match(/font-size:\s*[^;]+;/g) ?? [];
  assert.ok(fontDeclarations.length > 0, "dashboard CSS should define an explicit readable type scale");
  for (const declaration of fontDeclarations) {
    const pixelSizes = [...declaration.matchAll(/([0-9.]+)px/g)].map((match) => Number(match[1]));
    assert.ok(pixelSizes.every((size) => size >= 12), `visible dashboard text must be at least 12px: ${declaration}`);
  }
});
