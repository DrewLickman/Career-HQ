import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the public Career HQ setup guide", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Career HQ \| Your private job search, set up by Codex<\/title>/i);
  assert.match(html, /Your private job search/);
  assert.match(html, /set up by Codex/);
  assert.match(html, /Copy website link/);
  assert.match(html, /Codex handles the setup/);
  assert.match(html, /Fictional data only/);
  assert.match(html, /Personal data stays local/);
  assert.match(html, /Creating materials never authorizes submission/);
  assert.match(html, /https:\/\/github\.com\/DrewLickman\/Career-HQ/);
  assert.doesNotMatch(html, /codex-preview/);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("publishes a complete paste-only Codex handoff contract", async () => {
  const [setup, llms, hosting] = await Promise.all([
    readFile(new URL("../public/codex-setup.md", import.meta.url), "utf8"),
    readFile(new URL("../public/llms.txt", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(setup, /confirm the user wants to continue/i);
  assert.match(setup, /ask which folder/i);
  assert.match(setup, /Git, Node\.js 20\.9 or newer, and Python 3\.11 or newer/);
  assert.match(setup, /git-ignored `\.job-search\/` directory/i);
  assert.match(setup, /never more than five/i);
  assert.match(setup, /\$career-hq Set up my job search/);
  assert.match(setup, /Creating application materials does not authorize submission/i);
  assert.match(llms, /\/codex-setup\.md/);
  assert.match(llms, /public setup guide/i);
  const hostingConfig = JSON.parse(hosting);
  assert.match(hostingConfig.project_id, /^appgprj_[a-z0-9]+$/);
  assert.equal(hostingConfig.d1, null);
  assert.equal(hostingConfig.r2, null);
});

test("keeps the hosted surface static and free of private-data features", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Fictional data only/);
  assert.doesNotMatch(page, /readFile|node:fs|loadLocalDashboard|sample-data/);
  assert.doesNotMatch(page, /<form|type=["']file|fetch\(|localStorage|sessionStorage/);
  assert.match(layout, /Career HQ \| Your private job search/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|drizzle/);
});
