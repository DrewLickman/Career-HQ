import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import test from "node:test";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const GUARD = join(REPO, "scripts", "run-bounded-dev-server.ps1");
const POWERSHELL = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const FIXTURE_COMMAND = "node tests/dev-server-fixture.mjs idle";

function guardArgs(extra, includeWorkingDirectory = true) {
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    GUARD,
    "-HealthUrl",
    "",
    "-PollIntervalMs",
    "50",
    "-InstanceScope",
    "career-hq-dev-server-guard-tests",
  ];
  if (includeWorkingDirectory) args.push("-WorkingDirectory", REPO);
  return [...args, ...extra];
}

function runGuard(extra, includeWorkingDirectory = true) {
  return spawnSync(POWERSHELL, guardArgs(extra, includeWorkingDirectory), {
    cwd: REPO,
    encoding: "utf8",
    timeout: 15_000,
  });
}

function summaryFrom(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const match = output.match(/CAREER_HQ_DEV_SERVER_SUMMARY (\{[^\r\n]+\})/);
  assert.ok(match, `missing guard summary:\n${output}`);
  return JSON.parse(match[1]);
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function collectChild(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => { stdout += chunk; });
  child.stderr?.on("data", (chunk) => { stderr += chunk; });
  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (status, signal) => resolve({ status, signal, stdout, stderr }));
  });
  return { completed };
}

async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail("timed out waiting for guarded process state");
}

test("guard cleans the complete process tree after a successful check", { skip: process.platform !== "win32" }, () => {
  const result = runGuard([
    "-Command",
    FIXTURE_COMMAND,
    "-HoldAfterReadySeconds",
    "1",
    "-MaxRuntimeSeconds",
    "5",
    "-MemoryLimitMB",
    "256",
  ], false);
  const summary = summaryFrom(result);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(summary.terminationReason, "completed");
  assert.equal(summary.treeStopped, true);
  assert.ok(Number.isInteger(summary.rootPid));
  assert.ok(summary.childPids.length >= 1, "expected the guarded cmd process to launch a Node child");
  assert.ok(Number.isFinite(summary.peakMemoryMB));
  assert.ok(Number.isFinite(summary.memoryGrowthMB));
  assert.ok([summary.rootPid, ...summary.childPids].every((pid) => !processExists(pid)));
});

test("guard cleans the server tree when verification fails", { skip: process.platform !== "win32" }, () => {
  const result = runGuard([
    "-Command",
    FIXTURE_COMMAND,
    "-VerificationCommand",
    "node tests/dev-server-fixture.mjs exit-failure",
    "-MaxRuntimeSeconds",
    "5",
    "-MemoryLimitMB",
    "256",
  ]);
  const summary = summaryFrom(result);

  assert.notEqual(result.status, 0);
  assert.equal(summary.terminationReason, "verification-failed");
  assert.equal(summary.treeStopped, true);
  assert.ok([summary.rootPid, ...summary.childPids].every((pid) => !processExists(pid)));
});

test("guard enforces the runtime limit and cleans the tree", { skip: process.platform !== "win32" }, () => {
  const result = runGuard([
    "-Command",
    FIXTURE_COMMAND,
    "-HoldAfterReadySeconds",
    "5",
    "-MaxRuntimeSeconds",
    "1",
    "-MemoryLimitMB",
    "256",
  ]);
  const summary = summaryFrom(result);

  assert.notEqual(result.status, 0);
  assert.equal(summary.terminationReason, "runtime-limit");
  assert.equal(summary.treeStopped, true);
});

test("guard allows an unlimited runtime when no limit is requested", { skip: process.platform !== "win32" }, () => {
  const result = runGuard([
    "-Command",
    FIXTURE_COMMAND,
    "-HoldAfterReadySeconds",
    "1",
    "-MaxRuntimeSeconds",
    "0",
    "-MemoryLimitMB",
    "256",
  ]);
  const summary = summaryFrom(result);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(summary.terminationReason, "completed");
  assert.equal(summary.treeStopped, true);
});

test("guard reports a simulated memory-limit breach and cleans the tree", { skip: process.platform !== "win32" }, () => {
  const result = runGuard([
    "-Command",
    "node tests/dev-server-fixture.mjs allocate",
    "-HoldAfterReadySeconds",
    "10",
    "-MaxRuntimeSeconds",
    "10",
    "-MemoryLimitMB",
    "96",
  ]);
  const summary = summaryFrom(result);

  assert.notEqual(result.status, 0);
  assert.equal(summary.terminationReason, "memory-limit");
  assert.equal(summary.treeStopped, true);
  assert.ok(summary.peakMemoryMB >= 96);
});

test("Windows kills the guarded tree when the wrapper is interrupted", { skip: process.platform !== "win32" }, async () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "career-hq-guard-"));
  const pidFile = join(tempDirectory, "fixture.pid");
  const wrapper = spawn(
    POWERSHELL,
    guardArgs([
      "-Command",
      FIXTURE_COMMAND,
      "-HoldAfterReadySeconds",
      "30",
      "-MaxRuntimeSeconds",
      "30",
      "-MemoryLimitMB",
      "256",
    ]),
    {
      cwd: REPO,
      env: { ...process.env, CAREER_HQ_GUARD_TEST_PID_FILE: pidFile },
      stdio: "ignore",
    },
  );

  try {
    await waitFor(() => existsSync(pidFile));
    const fixturePid = Number(readFileSync(pidFile, "utf8"));
    assert.equal(processExists(fixturePid), true);

    wrapper.kill();
    await waitFor(() => !processExists(fixturePid));
    assert.equal(processExists(fixturePid), false);
  } finally {
    if (!wrapper.killed) wrapper.kill();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});

test("a new workspace instance cleanly replaces the previous instance", { skip: process.platform !== "win32" }, async () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "career-hq-single-instance-"));
  const firstPidFile = join(tempDirectory, "first.pid");
  const first = spawn(
    POWERSHELL,
    guardArgs([
      "-Command",
      FIXTURE_COMMAND,
      "-HoldAfterReadySeconds",
      "30",
      "-MaxRuntimeSeconds",
      "30",
      "-MemoryLimitMB",
      "256",
    ]),
    {
      cwd: REPO,
      env: { ...process.env, CAREER_HQ_GUARD_TEST_PID_FILE: firstPidFile },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const firstOutput = collectChild(first);

  try {
    await waitFor(() => existsSync(firstPidFile));
    const firstFixturePid = Number(readFileSync(firstPidFile, "utf8"));
    assert.equal(processExists(firstFixturePid), true);

    const second = runGuard([
      "-Command",
      FIXTURE_COMMAND,
      "-HoldAfterReadySeconds",
      "1",
      "-MaxRuntimeSeconds",
      "5",
      "-MemoryLimitMB",
      "256",
    ]);
    const firstResult = await firstOutput.completed;
    const firstSummary = summaryFrom(firstResult);
    const secondSummary = summaryFrom(second);

    assert.equal(firstResult.status, 0, firstResult.stderr);
    assert.equal(firstSummary.terminationReason, "superseded");
    assert.equal(firstSummary.treeStopped, true);
    assert.equal(processExists(firstFixturePid), false);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /Closing the previous Career HQ terminal/);
    assert.equal(secondSummary.terminationReason, "completed");
    assert.equal(secondSummary.treeStopped, true);
  } finally {
    if (first.exitCode === null && first.signalCode === null) first.kill();
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});
