import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const command = process.argv[2];

if (command === "create") {
  const workspace = mkdtempSync(join(tmpdir(), "career-hq-browser-fixture-"));
  const privateRoot = join(workspace, ".job-search");
  mkdirSync(privateRoot);
  cpSync(join(repo, "sample-data", "applicant-profile.json"), join(privateRoot, "applicant-profile.json"));
  cpSync(join(repo, "sample-data", "applications.json"), join(privateRoot, "applications.json"));
  console.log(workspace);
} else if (command === "remove") {
  const workspace = resolve(process.argv[3] ?? "");
  const tempRoot = resolve(tmpdir());
  if (!workspace.startsWith(`${tempRoot}\\career-hq-browser-fixture-`)) {
    throw new Error("Refusing to remove a path outside the Career HQ browser-fixture directory.");
  }
  rmSync(workspace, { recursive: true, force: true });
} else {
  throw new Error("Use: node tests/browser-fixture.mjs create|remove <workspace>");
}
