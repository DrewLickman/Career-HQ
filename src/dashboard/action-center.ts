import type { Application } from "./types";

export type ActionKind =
  | "submission-confirmation"
  | "unresolved-questions"
  | "visual-verification"
  | "authorized-continuation"
  | "packet-review"
  | "follow-up"
  | "next-action";

export type ActionSection = "needs-attention" | "due-today" | "next-seven-days";

export type ActionTask = {
  applicationId: string;
  employer: string;
  role: string;
  kind: ActionKind;
  section: ActionSection;
  title: string;
  description: string;
  dueDate: string;
  overdueDays: number;
  prompt: string;
  hasLatestMaterial: boolean;
  latestMaterialVersion: string;
  latestMaterialKinds: string[];
};

const TERMINAL_STATUSES = new Set(["rejected", "withdrawn", "closed"]);
const BLOCKER_KINDS = new Set<ActionKind>([
  "submission-confirmation",
  "unresolved-questions",
  "visual-verification",
  "authorized-continuation",
  "packet-review",
]);

function dateFromKey(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return timestamp;
}

function dayDifference(from: string, to: string): number | null {
  const fromDate = dateFromKey(from);
  const toDate = dateFromKey(to);
  if (fromDate === null || toDate === null) return null;
  return Math.round((toDate - fromDate) / 86_400_000);
}

export function localDateKey(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function taskKind(application: Application): ActionKind {
  const latestMaterial = application.materials[application.materials.length - 1];
  if (application.status === "submission-unconfirmed") return "submission-confirmation";
  if (application.unresolvedQuestions.length > 0) return "unresolved-questions";
  if (latestMaterial && latestMaterial.visualVerificationStatus !== "passed") return "visual-verification";
  if (application.approval && !application.submissionEvidence) return "authorized-continuation";
  if (
    application.status === "ready"
    && latestMaterial?.visualVerificationStatus === "passed"
    && !application.approval
  ) {
    return "packet-review";
  }
  if (application.status === "submitted") return "follow-up";
  return "next-action";
}

function taskCopy(application: Application, kind: ActionKind): Pick<ActionTask, "title" | "description" | "prompt"> {
  const displayName = `${application.employer} — ${application.role}`;
  switch (kind) {
    case "submission-confirmation":
      return {
        title: "Verify whether submission completed",
        description: "This application is not marked submitted because confirmation evidence is missing.",
        prompt: `Use $career-hq to verify whether my submission to ${displayName} completed. Do not mark it submitted without confirmation evidence.`,
      };
    case "unresolved-questions":
      return {
        title: "Resolve application questions",
        description: `${application.unresolvedQuestions.length} unanswered ${application.unresolvedQuestions.length === 1 ? "question is" : "questions are"} blocking progress.`,
        prompt: `Use $career-hq to resolve the unanswered application questions for ${displayName} using only verified profile information. Do not submit the application.`,
      };
    case "visual-verification":
      return {
        title: "Visually verify the latest resume",
        description: "The latest Word and PDF resume files must be rendered and inspected before review.",
        prompt: `Use $career-hq to render and visually verify the latest resume for ${displayName}, then update Career HQ. Do not submit the application.`,
      };
    case "authorized-continuation":
      return {
        title: "Continue the authorized application",
        description: "Application-specific authorization is recorded, but submission evidence has not been captured.",
        prompt: `Use $career-hq to continue the already authorized application to ${displayName}. Pause for any legal acknowledgment and capture confirmation evidence after submission.`,
      };
    case "packet-review":
      return {
        title: "Review the application packet",
        description: "The latest resume passed visual verification and is ready for application review.",
        prompt: `Use $career-hq to review the application packet for ${displayName}. Do not submit the application.`,
      };
    case "follow-up":
      return {
        title: "Follow up on the confirmed application",
        description: application.nextAction,
        prompt: `Use $career-hq to help me complete the recorded follow-up for ${displayName}. Do not submit another application.`,
      };
    default:
      return {
        title: application.nextAction,
        description: "Continue the recorded next step for this opportunity.",
        prompt: `Use $career-hq to help me complete the recorded next action for ${displayName}. Do not submit the application.`,
      };
  }
}

function actionTask(application: Application, today: string): ActionTask | null {
  if (TERMINAL_STATUSES.has(application.status)) return null;
  const kind = taskKind(application);
  const blocker = BLOCKER_KINDS.has(kind);
  const difference = application.nextActionDate
    ? dayDifference(today, application.nextActionDate)
    : null;

  let section: ActionSection;
  if (blocker || difference === null || difference < 0) {
    section = "needs-attention";
  } else if (difference === 0) {
    section = "due-today";
  } else if (difference <= 7) {
    section = "next-seven-days";
  } else {
    return null;
  }

  const copy = taskCopy(application, kind);
  return {
    applicationId: application.id,
    employer: application.employer,
    role: application.role,
    kind,
    section,
    ...copy,
    dueDate: difference === null ? "" : application.nextActionDate,
    overdueDays: difference !== null && difference < 0 ? Math.abs(difference) : 0,
    hasLatestMaterial: application.materials.length > 0,
    latestMaterialVersion: application.materials[application.materials.length - 1]?.version ?? "",
    latestMaterialKinds: application.materials[application.materials.length - 1]?.files.map((file) => file.kind.toLowerCase()) ?? [],
  };
}

function taskRank(task: ActionTask): [number, number, string, string] {
  if (task.kind === "submission-confirmation") return [0, 0, task.employer, task.role];
  if (task.overdueDays > 0) return [1, -task.overdueDays, task.employer, task.role];
  if (task.section === "needs-attention") return [2, 0, task.employer, task.role];
  if (task.section === "due-today") return [3, 0, task.employer, task.role];
  return [4, dateFromKey(task.dueDate) ?? Number.MAX_SAFE_INTEGER, task.employer, task.role];
}

export function deriveActionTasks(applications: Application[], today: string): ActionTask[] {
  if (dateFromKey(today) === null) throw new Error("today must use YYYY-MM-DD");
  return applications
    .map((application) => actionTask(application, today))
    .filter((task): task is ActionTask => Boolean(task))
    .sort((left, right) => {
      const leftRank = taskRank(left);
      const rightRank = taskRank(right);
      for (let index = 0; index < leftRank.length; index += 1) {
        const comparison = typeof leftRank[index] === "number"
          ? Number(leftRank[index]) - Number(rightRank[index])
          : String(leftRank[index]).localeCompare(String(rightRank[index]));
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
}

export function overviewActionTasks(tasks: ActionTask[]): ActionTask[] {
  return tasks.slice(0, 5);
}
