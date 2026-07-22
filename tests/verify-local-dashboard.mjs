import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2];
assert.ok(url, "dashboard URL is required");
const response = await fetch(url, { headers: { accept: "text/html" } });
assert.equal(response.status, 200);
assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
const html = await response.text();
assert.match(html, /Career HQ \| Local job search command center/i);
assert.match(html, /Local Test Candidate/);
assert.match(html, /Local Test Systems/);
assert.match(html, /Local files only/);
assert.doesNotMatch(html, /Fictional data only|Avery Rowan/);

const workspace = process.env.CAREER_HQ_WORKSPACE;
assert.ok(workspace, "test workspace is required");
rmSync(join(workspace, ".job-search"), { recursive: true, force: true });
const freshResponse = await fetch(url, { headers: { accept: "text/html" } });
const freshHtml = await freshResponse.text();
assert.match(freshHtml, /Start with Codex/);
assert.match(freshHtml, /Set up my job search/);
assert.doesNotMatch(freshHtml, /Local Test Candidate|Local Test Systems/);
console.log("Local dashboard verification passed");
