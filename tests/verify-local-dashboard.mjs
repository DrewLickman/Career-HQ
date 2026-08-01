import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const url = process.argv[2];
assert.ok(url, "dashboard URL is required");

function visible(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<!--.*?-->/g, "");
}

async function page(path) {
  const response = await fetch(new URL(path, url), { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  return { html, visibleHtml: visible(html) };
}

const overview = await page("/?view=overview");
assert.match(overview.html, /Career HQ \| Local job search command center/i);
assert.match(overview.visibleHtml, /Your next move, clearly/);
assert.match(overview.visibleHtml, /Focus here first/);
assert.match(overview.visibleHtml, /View all 2 actions/);
assert.match(overview.visibleHtml, /Where opportunities stand/);
assert.match(overview.visibleHtml, /Verify whether submission completed/);
assert.match(overview.visibleHtml, /Visually verify the latest resume/);
assert.match(overview.visibleHtml, /Confirmation Test Systems[^<]*Support Engineer/);
assert.ok((overview.visibleHtml.match(/Continue in Codex/g) ?? []).length >= 2, "Overview should expose the prioritized Codex actions");
assert.doesNotMatch(overview.visibleHtml, /Application tracker|Full saved posting|Application answers/);

const applications = await page("/?view=applications");
assert.match(applications.visibleHtml, /Every opportunity, organized/);
assert.match(applications.visibleHtml, /Application tracker/);
assert.match(applications.visibleHtml, /Active applications/);
assert.match(applications.visibleHtml, /Local Test Systems/);
assert.match(applications.visibleHtml, /Automation Specialist/);
assert.match(applications.visibleHtml, /Confirmation Test Systems/);
assert.match(applications.visibleHtml, /Summary/);
assert.match(applications.visibleHtml, /Application/);
assert.match(applications.visibleHtml, /Posting/);
assert.match(applications.visibleHtml, /What the job actually is/);
assert.doesNotMatch(applications.visibleHtml, /What you would do/);
assert.match(applications.visibleHtml, /Work setup/);
assert.match(applications.visibleHtml, /Full saved posting for the fictional Local Test Systems role/);
assert.match(applications.visibleHtml, /Next action[\s\S]*Continue in Codex/);
assert.doesNotMatch(applications.visibleHtml, /Closed Test Works|Archived Specialist|version 1/);

const needsAction = await page("/?view=applications&filter=needs-action");
assert.match(needsAction.visibleHtml, /Needs action/);
assert.match(needsAction.visibleHtml, /Local Test Systems/);
assert.match(needsAction.visibleHtml, /Confirmation Test Systems/);
assert.doesNotMatch(needsAction.visibleHtml, /Closed Test Works/);

const insights = await page("/?view=insights");
assert.match(insights.visibleHtml, /Patterns worth noticing/);
assert.match(insights.visibleHtml, /A quieter view of the bigger picture/);
assert.match(insights.visibleHtml, /Strongest role lane/);
assert.match(insights.visibleHtml, /Action load/);

const invalidView = await page("/?view=not-a-dashboard-view");
assert.match(invalidView.visibleHtml, /Your next move, clearly/);
assert.doesNotMatch(invalidView.visibleHtml, /Application tracker/);

for (const rendered of [overview, applications, needsAction, insights, invalidView]) {
  assert.match(rendered.visibleHtml, />CHQ</);
  assert.doesNotMatch(rendered.html, /local-test-001-resume-v00[12]|materials\/local-test/);
  assert.doesNotMatch(rendered.html, /Local by design|Local files only|Private local workspace|reads private local files/);
  assert.doesNotMatch(rendered.html, /Fictional data only|Avery Rowan/);
}

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
const fresh = await page("/?view=overview");
assert.match(fresh.html, /Start with Codex/);
assert.match(fresh.html, /Set up my job search/);
assert.doesNotMatch(fresh.html, /Local Test Candidate|Local Test Systems/);
console.log("Local dashboard verification passed");
