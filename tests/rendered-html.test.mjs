import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Career HQ fictional dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Career HQ \| Private job search command center<\/title>/i);
  assert.match(html, /Fictional data only/);
  assert.match(html, /Pipeline health/);
  assert.match(html, /Application tracker/);
  assert.match(html, /Local by design/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("public dashboard imports only the fictional fixture", async () => {
  const [page, fixture, gitignore] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../sample-data/applications.json", import.meta.url), "utf8"),
    readFile(new URL("../.gitignore", import.meta.url), "utf8"),
  ]);
  assert.match(page, /sample-data\/applications\.json/);
  assert.doesNotMatch(page, /\.job-search/);
  assert.equal(JSON.parse(fixture).fixture, true);
  assert.match(gitignore, /^\/\.job-search\/$/m);
});

test("dashboard source includes accessible interaction and responsive cards", async () => {
  const [component, css, globals] = await Promise.all([
    readFile(new URL("../dashboard/CareerDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../dashboard/dashboard.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(component, /aria-pressed/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /Search applications/);
  assert.match(component, /Filter by pipeline status/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(globals, /:focus-visible/);
});
