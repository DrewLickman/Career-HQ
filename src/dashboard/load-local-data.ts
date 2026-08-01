import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type {
  Application,
  DashboardData,
  Fit,
  ImportantAnswer,
  MaterialVersion,
  PostingSnapshot,
} from "./types";
import { localDateKey } from "./action-center";

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

function displayText(value: unknown, fallback = "Not recorded"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const items = value
      .map((item) => displayText(item, ""))
      .filter(Boolean);
    return items.length ? items.join(", ") : fallback;
  }
  return fallback;
}

function webUrl(value: unknown): string {
  const candidate = text(value, "");
  if (!candidate) return "";
  try {
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function objects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(object) : [];
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

function privateFilePath(privateRoot: string, value: unknown): string | null {
  const candidate = text(value, "")
    .replace(/^\.job-search[\\/]/i, "")
    .replace(/[\\/]+/g, "\\");
  if (!candidate) return null;
  const resolved = resolve(privateRoot, candidate);
  const withinRoot = relative(privateRoot, resolved);
  if (!withinRoot || withinRoot.startsWith("..") || isAbsolute(withinRoot)) return null;
  return resolved;
}

async function postingSnapshot(value: unknown, privateRoot: string): Promise<PostingSnapshot> {
  const item = object(value);
  const savedPath = text(item.path, "");
  const resolvedPath = privateFilePath(privateRoot, savedPath);
  let content = "";
  if (resolvedPath) {
    try {
      content = await readFile(resolvedPath, "utf8");
    } catch {
      content = "";
    }
  }
  return {
    sourceUrl: webUrl(item.sourceUrl),
    capturedAt: text(item.capturedAt, ""),
    currentConfirmedAt: text(item.currentConfirmedAt, ""),
    credibleSourceConfirmed: item.credibleSourceConfirmed === true,
    content,
  };
}

function importantAnswer(value: unknown): ImportantAnswer {
  const item = object(value);
  return {
    question: displayText(item.question, "Recorded application answer"),
    answer: displayText(item.answer),
    source: text(item.source, ""),
    sensitive: item.sensitive === true,
    approvalState: text(item.approval_state, ""),
  };
}

function materialVersion(value: unknown): MaterialVersion {
  const item = object(value);
  const visualVerification = object(item.visualVerification);
  const visualVerificationStatus = visualVerification.status === "passed"
    ? "passed"
    : visualVerification.status === "required"
      ? "required"
      : "unknown";
  return {
    version: displayText(item.version, "Recorded version"),
    generatedAt: text(item.generatedAt, ""),
    files: objects(item.files).map((file) => ({
      kind: text(file.kind, "document"),
    })),
    visualVerificationStatus,
  };
}

async function normalizeApplication(value: unknown, index: number, privateRoot: string): Promise<Application> {
  const item = object(value);
  const fit = FITS.has(item.fit as Fit)
    ? (item.fit as Fit)
    : "reasonable-stretch";
  const postingSnapshots = await Promise.all(
    objects(item.postingSnapshots).map((snapshot) => postingSnapshot(snapshot, privateRoot)),
  );
  const latestSnapshot = postingSnapshots[postingSnapshots.length - 1];
  const approvalValue = object(item.approval);
  const evidence = object(item.submissionEvidence);

  return {
    id: text(item.id, `local-${index + 1}`),
    employer: text(item.employer),
    role: text(item.role),
    location: text(item.location),
    arrangement: text(item.arrangement),
    employmentType: text(item.employmentType),
    status: text(item.status, "research"),
    fit,
    compensation: text(item.compensation),
    nextAction: text(item.nextAction, "Review this application"),
    nextActionDate: text(item.nextActionDate, ""),
    strongestMatch: text(item.strongestMatch),
    largestGap: text(item.largestGap),
    risk: text(item.risk),
    sourceUrl: webUrl(item.url) || latestSnapshot?.sourceUrl || "",
    postingSnapshots,
    importantAnswers: objects(item.importantAnswers).map(importantAnswer),
    unresolvedQuestions: Array.isArray(item.unresolvedQuestions)
      ? item.unresolvedQuestions
          .map((question) => displayText(question, ""))
          .filter(Boolean)
      : [],
    materials: objects(item.materials).map(materialVersion),
    approval: Object.keys(approvalValue).length
      ? {
          authorizedAt: text(approvalValue.authorizedAt, ""),
          confirmation: displayText(approvalValue.confirmation),
        }
      : null,
    submissionEvidence: Object.keys(evidence).length
      ? {
          kind: text(evidence.kind, "Verified confirmation"),
          description: displayText(evidence.description, "Confirmation evidence saved privately"),
          recordedAt: text(evidence.recordedAt, ""),
        }
      : null,
    createdAt: text(item.createdAt, ""),
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
        today: localDateKey(),
        generatedAt: "Not initialized",
        applicant: { displayName: "Your", targetLane: "Complete onboarding to set target roles" },
        applications: [],
        message: "Open this repository in Codex and run: $career-hq Set up my job search",
      };
    }

    const ledger = object(ledgerValue);
    const applications = Array.isArray(ledger.applications)
      ? await Promise.all(
          ledger.applications.map((application, index) =>
            normalizeApplication(application, index, privateRoot),
          ),
        )
      : [];

    return {
      private: true,
      workspaceStatus: "ready",
      today: localDateKey(),
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
      today: localDateKey(),
      generatedAt: "Read error",
      applicant: { displayName: "Your", targetLane: "Local workspace needs attention" },
      applications: [],
      message: "Career HQ could not read the local JSON files. Ask Codex to run the workspace verification command.",
    };
  }
}
