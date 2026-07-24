import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function objects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function versionText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function errorResponse(message: string, status: number) {
  return Response.json({ message }, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

function safeDownloadName(employer: string, role: string, extension: string) {
  const base = `${employer}-${role}-resume`
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return `${base || "career-hq-resume"}${extension}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname)) {
    return errorResponse("Career HQ materials are available only on this computer.", 403);
  }

  const employer = url.searchParams.get("employer")?.trim() ?? "";
  const role = url.searchParams.get("role")?.trim() ?? "";
  const version = url.searchParams.get("version")?.trim() ?? "";
  const kind = url.searchParams.get("kind")?.trim().toLowerCase() ?? "";
  if (!employer || !role || !version || !kind) {
    return errorResponse("A specific application material is required.", 400);
  }

  const workspace = process.env.CAREER_HQ_WORKSPACE
    ? resolve(/* turbopackIgnore: true */ process.env.CAREER_HQ_WORKSPACE)
    : process.cwd();
  const privateRoot = resolve(/* turbopackIgnore: true */ workspace, ".job-search");
  const materialsRoot = resolve(privateRoot, "materials");

  try {
    const ledger = object(JSON.parse(await readFile(resolve(privateRoot, "applications.json"), "utf8")));
    const application = objects(ledger.applications).find((item) =>
      text(item.employer) === employer && text(item.role) === role
    );
    const material = objects(application?.materials).find((item) => versionText(item.version) === version);
    const file = objects(material?.files).find((item) => text(item.kind).toLowerCase() === kind);
    const relativePath = text(file?.path);
    if (!relativePath) return errorResponse("That application material was not found.", 404);

    const absolutePath = resolve(privateRoot, relativePath);
    if (!absolutePath.startsWith(`${materialsRoot}${sep}`)) {
      return errorResponse("That file is outside the private materials directory.", 403);
    }

    const extension = extname(absolutePath).toLowerCase();
    const contentType = extension === ".pdf"
      ? "application/pdf"
      : extension === ".docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "";
    if (!contentType) return errorResponse("That file type cannot be opened here.", 415);

    const bytes = await readFile(absolutePath);
    const disposition = extension === ".pdf" ? "inline" : "attachment";
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${safeDownloadName(employer, role, extension)}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse("That application material is unavailable.", 404);
  }
}
