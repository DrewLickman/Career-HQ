import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const execute = promisify(execFile);
const actions = new Set(["analyze-job", "build-tailoring-plan", "material-preflight", "ai-context", "prepare-materials", "review-packet", "verify-workflow", "next-actions"]);
let busy = false;

function reply(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || request.headers.get("origin") !== url.origin
    || !request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ status: "blocked", summary: "Use this action from the local Career HQ dashboard." }, 403);
  }
  const raw = await request.text();
  if (raw.length > 4096) return reply({ summary: "Request too large." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ summary: "Invalid request." }, 400); }
  if (!body || typeof body !== "object" || !actions.has(body.action)
    || (body.applicationId !== undefined && (typeof body.applicationId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.applicationId)))) {
    return reply({ status: "blocked", summary: "Choose a supported workflow action." }, 400);
  }
  if (busy) return reply({ status: "blocked", summary: "Another local action is running. Try again when it finishes." }, 409);
  const workspace = process.env.CAREER_HQ_WORKSPACE ? resolve(/* turbopackIgnore: true */ process.env.CAREER_HQ_WORKSPACE) : process.cwd();
  const script = resolve(/* turbopackIgnore: true */ process.cwd(), "scripts", "career_hq.py");
  const args = [script, body.action, "--workspace", workspace];
  if (body.applicationId) args.push("--application-id", body.applicationId);
  busy = true;
  try {
    const { stdout } = await execute("python", args, { cwd: process.cwd(), windowsHide: true, timeout: 60000, maxBuffer: 2 * 1024 * 1024, shell: false });
    return reply(JSON.parse(stdout));
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout;
    if (stdout) {
      try { return reply(JSON.parse(stdout), 422); } catch { /* Return a bounded error without local paths. */ }
    }
    return reply({ status: "blocked", summary: "The local tool could not finish. Ask Codex to inspect this workflow." }, 500);
  } finally { busy = false; }
}
