import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Application, DashboardData, Fit } from "./types";

type JsonObject = Record<string, unknown>;

const FITS = new Set<Fit>([
  "strong-match",
  "reasonable-stretch",
  "low-probability-stretch",
  "not-recommended",
]);

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function text(value: unknown, fallback = "Not recorded"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function evidenceValue(value: unknown): unknown {
  const item = object(value);
  return item.verified === true ? item.value : undefined;
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function normalizeApplication(value: unknown, index: number): Application {
  const item = object(value);
  const fit = FITS.has(item.fit as Fit)
    ? (item.fit as Fit)
    : "reasonable-stretch";

  return {
    id: text(item.id, `local-${index + 1}`),
    employer: text(item.employer),
    role: text(item.role),
    location: text(item.location),
    arrangement: text(item.arrangement),
    status: text(item.status, "research"),
    fit,
    compensation: text(item.compensation),
    nextAction: text(item.nextAction, "Review this application"),
    nextActionDate: text(item.nextActionDate, ""),
    strongestMatch: text(item.strongestMatch),
    largestGap: text(item.largestGap),
    risk: text(item.risk),
    updatedAt: text(item.updatedAt, ""),
  };
}

function applicantFrom(profileValue: unknown) {
  const profile = object(profileValue);
  const identity = object(profile.identity);
  const searchDirection = object(profile.searchDirection);
  const displayName = text(evidenceValue(identity.displayName), "Your");
  const roles = evidenceValue(searchDirection.targetRoles);
  const targetLane = Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string").join(" / ")
    : text(roles, "Complete onboarding to set target roles");

  return { displayName, targetLane };
}

export async function loadLocalDashboard(): Promise<DashboardData> {
  const workspace = process.env.CAREER_HQ_WORKSPACE
    ? resolve(/* turbopackIgnore: true */ process.env.CAREER_HQ_WORKSPACE)
    : process.cwd();
  const privateRoot = resolve(/* turbopackIgnore: true */ workspace, ".job-search");

  try {
    const [profileValue, ledgerValue] = await Promise.all([
      readJson(resolve(privateRoot, "applicant-profile.json")),
      readJson(resolve(privateRoot, "applications.json")),
    ]);

    if (profileValue === null || ledgerValue === null) {
      return {
        private: true,
        workspaceStatus: "needs-setup",
        generatedAt: "Not initialized",
        applicant: { displayName: "Your", targetLane: "Complete onboarding to set target roles" },
        applications: [],
        message: "Open this repository in Codex and run: $career-hq Set up my job search",
      };
    }

    const ledger = object(ledgerValue);
    const applications = Array.isArray(ledger.applications)
      ? ledger.applications.map(normalizeApplication)
      : [];

    return {
      private: true,
      workspaceStatus: "ready",
      generatedAt: text(ledger.updatedAt, "Local workspace"),
      applicant: applicantFrom(profileValue),
      applications,
      message: applications.length
        ? undefined
        : "Onboarding is ready. Ask Codex to find and evaluate the first job.",
    };
  } catch {
    return {
      private: true,
      workspaceStatus: "error",
      generatedAt: "Read error",
      applicant: { displayName: "Your", targetLane: "Local workspace needs attention" },
      applications: [],
      message: "Career HQ could not read the local JSON files. Ask Codex to run the workspace verification command.",
    };
  }
}
