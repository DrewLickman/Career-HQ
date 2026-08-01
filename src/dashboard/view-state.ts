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

export function filterApplications(
  applications: Application[],
  query: string,
  filter: ApplicationFilter,
  actionApplicationIds: ReadonlySet<string>,
): Application[] {
  const needle = query.trim().toLowerCase();
  return applications.filter((application) => {
    const haystack = [
      application.employer,
      application.role,
      application.location,
      application.nextAction,
    ].join(" ").toLowerCase();
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
