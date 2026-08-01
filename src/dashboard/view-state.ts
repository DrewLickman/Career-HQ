import type { Application } from "./types";

export const dashboardViews = ["overview", "applications", "insights"] as const;
export type DashboardView = (typeof dashboardViews)[number];

export const applicationFilters = [
  "active",
  "needs-action",
  "research",
  "ready",
  "attention",
  "applied",
  "assessment",
  "interview",
  "offer",
  "terminal",
] as const;
export type ApplicationFilter = (typeof applicationFilters)[number];

const terminalStatuses = new Set(["rejected", "withdrawn", "closed"]);

type QueryValue = string | string[] | undefined;

function first(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeDashboardView(value: QueryValue): DashboardView {
  const candidate = first(value);
  return dashboardViews.includes(candidate as DashboardView)
    ? (candidate as DashboardView)
    : "overview";
}

export function normalizeApplicationFilter(value: QueryValue): ApplicationFilter {
  const candidate = first(value);
  return applicationFilters.includes(candidate as ApplicationFilter)
    ? (candidate as ApplicationFilter)
    : "active";
}

export function dashboardHref(
  view: DashboardView,
  filter: ApplicationFilter = "active",
): string {
  const search = new URLSearchParams({ view });
  if (view === "applications" && filter !== "active") search.set("filter", filter);
  return `/?${search.toString()}`;
}

export function applicationStage(status: string): string {
  if (terminalStatuses.has(status)) return "terminal";
  if (status === "submitted") return "applied";
  if (status === "submission-unconfirmed") return "attention";
  return status;
}

function searchLabel(value: string): string {
  return value.replaceAll("-", " ");
}

function searchableDate(value: string | undefined): string[] {
  const date = value?.trim() ?? "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return date ? [date] : [];

  const [, year, month, day] = match;
  const numericMonth = String(Number(month));
  const numericDay = String(Number(day));
  const displayDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${year}-${month}-${day}T00:00:00Z`));

  return [date, `${numericMonth}/${numericDay}/${year}`, `${numericMonth}/${numericDay}`, displayDate];
}

function applicationSearchTerms(application: Application): string[] {
  const dates = [
    application.nextActionDate,
    application.createdAt,
    application.updatedAt,
    application.approval?.authorizedAt ?? "",
    application.submissionEvidence?.recordedAt ?? "",
    ...application.postingSnapshots.flatMap((snapshot) => [snapshot.capturedAt, snapshot.currentConfirmedAt]),
    ...application.materials.map((material) => material.generatedAt),
  ].flatMap(searchableDate);
  const savedPostingText = application.postingSnapshots.map((snapshot) => snapshot.content);
  const status = application.status;
  const stage = applicationStage(status);

  return [
    application.employer,
    application.role,
    application.location,
    application.arrangement,
    application.employmentType,
    application.compensation,
    application.nextAction,
    application.strongestMatch,
    application.largestGap,
    application.risk,
    status,
    searchLabel(status),
    stage,
    searchLabel(stage),
    application.fit,
    searchLabel(application.fit),
    application.nextActionDate ? "scheduled" : "not scheduled no scheduled date",
    ...dates,
    ...savedPostingText,
  ];
}

export function filterApplications(
  applications: Application[],
  query: string,
  filter: ApplicationFilter,
  actionApplicationIds: ReadonlySet<string>,
): Application[] {
  const needle = query.trim().toLowerCase();
  return applications.filter((application) => {
    const haystack = applicationSearchTerms(application).join(" ").toLowerCase();
    const stage = applicationStage(application.status);
    const matchesFilter = filter === "active"
      ? stage !== "terminal"
      : filter === "needs-action"
        ? actionApplicationIds.has(application.id)
        : stage === filter;
    return (!needle || haystack.includes(needle)) && matchesFilter;
  });
}

export function selectVisibleApplication(
  applications: Application[],
  selectedId: string,
): Application | undefined {
  return applications.find((application) => application.id === selectedId) ?? applications[0];
}
