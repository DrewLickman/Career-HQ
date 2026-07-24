import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2];
assert.ok(url, "dashboard URL is required");
const response = await fetch(url, { headers: { accept: "text/html" } });
assert.equal(response.status, 200);
assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
const html = await response.text();
const visibleHtml = html
  .replace(/<script\b[\s\S]*?<\/script>/gi, "")
  .replace(/<!--.*?-->/g, "");
assert.match(html, /Career HQ \| Local job search command center/i);
assert.match(html, /Local Test Candidate/);
assert.match(html, /Local Test Systems/);
assert.match(html, /Original source/);
assert.match(html, /https:\/\/jobs\.example\.test\/local-test/);
assert.match(html, /Full saved posting for the fictional Local Test Systems role/);
assert.match(visibleHtml, /Latest resume[^<]*version 2/);
assert.match(visibleHtml, /View Local Test Systems[^<]*Automation Specialist[^<]*resume \(PDF\)/);
assert.match(visibleHtml, /Download Local Test Systems[^<]*Automation Specialist[^<]*resume \(Word\)/);
assert.match(visibleHtml, /Active applications/);
assert.match(visibleHtml, /1 closed hidden/);
assert.match(visibleHtml, />CHQ</);
assert.doesNotMatch(visibleHtml, /Closed Test Works|Archived Specialist|version 1/);
assert.doesNotMatch(html, /local-test-001-resume-v00[12]|materials\/local-test/);
assert.doesNotMatch(html, /Local by design|Local files only|Private local workspace|reads private local files/);
assert.doesNotMatch(html, /Fictional data only|Avery Rowan/);

const materialUrl = new URL("/api/material", url);
materialUrl.searchParams.set("employer", "Local Test Systems");
materialUrl.searchParams.set("role", "Automation Specialist");
materialUrl.searchParams.set("version", "2");
materialUrl.searchParams.set("kind", "pdf");
const materialResponse = await fetch(materialUrl);
assert.equal(materialResponse.status, 200);
assert.equal(materialResponse.headers.get("content-type"), "application/pdf");
assert.match(materialResponse.headers.get("cache-control") ?? "", /no-store/);
assert.match(materialResponse.headers.get("content-disposition") ?? "", /^inline;/);
assert.equal(await materialResponse.text(), "current fictional PDF bytes");

const wordUrl = new URL(materialUrl);
wordUrl.searchParams.set("kind", "docx");
const wordResponse = await fetch(wordUrl);
assert.equal(wordResponse.status, 200);
assert.equal(wordResponse.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
assert.match(wordResponse.headers.get("content-disposition") ?? "", /^attachment;/);
assert.equal(await wordResponse.text(), "current fictional Word bytes");

const missingUrl = new URL(materialUrl);
missingUrl.searchParams.set("version", "999");
assert.equal((await fetch(missingUrl)).status, 404);

const workspace = process.env.CAREER_HQ_WORKSPACE;
assert.ok(workspace, "test workspace is required");
assert.ok(existsSync(join(workspace, ".job-search", "materials", "local-test", "local-test-001-resume-v001.pdf")), "older private material must remain untouched");
rmSync(join(workspace, ".job-search"), { recursive: true, force: true });
const freshResponse = await fetch(url, { headers: { accept: "text/html" } });
const freshHtml = await freshResponse.text();
assert.match(freshHtml, /Start with Codex/);
assert.match(freshHtml, /Set up my job search/);
assert.doesNotMatch(freshHtml, /Local Test Candidate|Local Test Systems/);
console.log("Local dashboard verification passed");
