"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Application, DashboardData } from "./types";
import {
  deriveActionTasks,
  overviewActionTasks,
  type ActionTask,
} from "./action-center";
import {
  dashboardHref,
  applicationStage,
  filterApplications,
  normalizeApplicationFilter,
  normalizeDashboardView,
  selectVisibleApplication,
  type ApplicationFilter,
  type DashboardView,
} from "./view-state";
import styles from "./dashboard.module.css";

const stages = [
  ["research", "Research"],
  ["ready", "Ready"],
  ["attention", "Attention"],
  ["submitted", "Submitted"],
  ["assessment", "Assessment"],
  ["interview", "Interview"],
  ["offer", "Offer"],
  ["terminal", "Closed"],
] as const;

const navigation: { id: DashboardView; label: string; note: string }[] = [
  { id: "overview", label: "Overview", note: "What needs you now" },
  { id: "applications", label: "Applications", note: "Every opportunity" },
  { id: "insights", label: "Insights", note: "Patterns in your search" },
];

const utilityNavigation: { id: DashboardView; label: string; note: string }[] = [
  { id: "preferences", label: "Preferences", note: "Your job-search rules" },
];

const fitLabels: Record<string, string> = {
  "strong-match": "Strong match",
  "reasonable-stretch": "Reasonable stretch",
  "low-probability-stretch": "Low-probability stretch",
  "not-recommended": "Not recommended",
};

const statusLabels: Record<string, string> = {
  research: "Research",
  ready: "Ready for review",
  applied: "Submitted",
  submitted: "Submitted",
  "submission-unconfirmed": "Needs confirmation",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  closed: "Closed",
};

const filterLabels: Record<ApplicationFilter, string> = {
  active: "Active applications",
  "needs-action": "Needs action",
  research: "Research",
  ready: "Ready for review",
  attention: "Needs confirmation",
  submitted: "Submitted",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  terminal: "Closed",
};

type DetailTab = "summary" | "application" | "posting";

function formatDate(value: string) {
  if (!value) return "Not scheduled";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatTimestamp(value: string) {
  if (!value) return "Not recorded";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function materialHref(application: Application, version: string, kind: string) {
  const search = new URLSearchParams({
    employer: application.employer,
    role: application.role,
    version,
    kind,
  });
  return `/api/material?${search.toString()}`;
}

function taskMaterialHref(task: ActionTask, kind: string) {
  const search = new URLSearchParams({
    employer: task.employer,
    role: task.role,
    version: task.latestMaterialVersion,
    kind,
  });
  return `/api/material?${search.toString()}`;
}

function repeatedGap(applications: Application[]) {
  const gaps = new Map<string, { label: string; count: number }>();
  for (const application of applications) {
    const label = application.largestGap.trim();
    if (!label || label === "Not recorded") continue;
    const key = label.toLowerCase();
    const current = gaps.get(key);
    gaps.set(key, { label, count: (current?.count ?? 0) + 1 });
  }
  return [...gaps.values()]
    .filter((gap) => gap.count >= 2)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))[0] ?? null;
}

function taskDueLabel(task: ActionTask) {
  if (task.overdueDays > 0) {
    return `${task.overdueDays} ${task.overdueDays === 1 ? "day" : "days"} overdue`;
  }
  if (task.section === "due-today") return "Due today";
  if (task.dueDate) return `Due ${formatDate(task.dueDate)}`;
  return "Needs attention";
}

export function CareerDashboard({
  dashboard,
  initialView,
  initialFilter,
}: {
  dashboard: DashboardData;
  initialView: DashboardView;
  initialFilter: ApplicationFilter;
}) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [activeView, setActiveView] = useState<DashboardView>(initialView);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ApplicationFilter>(initialFilter);
  const firstActiveId = dashboard.applications.find(
    (application) => applicationStage(application.status) !== "terminal",
  )?.id ?? "";
  const [selectedId, setSelectedId] = useState(firstActiveId);
  const [copyMessage, setCopyMessage] = useState("");
  const [fallbackPrompt, setFallbackPrompt] = useState("");

  const refreshDashboard = useCallback(() => {
    startRefresh(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshDashboard();
    };
    const interval = window.setInterval(refreshWhenVisible, 15_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (!copyMessage) return;
    const timeout = window.setTimeout(() => setCopyMessage(""), 4_000);
    return () => window.clearTimeout(timeout);
  }, [copyMessage]);

  useEffect(() => {
    const restoreViewFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveView(normalizeDashboardView(params.get("view") ?? undefined));
      setFilter(normalizeApplicationFilter(params.get("filter") ?? undefined));
    };
    window.addEventListener("popstate", restoreViewFromUrl);
    return () => window.removeEventListener("popstate", restoreViewFromUrl);
  }, []);

  const actionTasks = useMemo(
    () => deriveActionTasks(dashboard.applications, dashboard.today),
    [dashboard.applications, dashboard.today],
  );
  const actionApplicationIds = useMemo(
    () => new Set(actionTasks.map((task) => task.applicationId)),
    [actionTasks],
  );

  const filtered = useMemo(() => {
    return filterApplications(dashboard.applications, query, filter, actionApplicationIds);
  }, [actionApplicationIds, dashboard.applications, filter, query]);

  const selected = selectVisibleApplication(filtered, selectedId);
  const counts = Object.fromEntries(stages.map(([key]) => [
    key,
    dashboard.applications.filter((application) => applicationStage(application.status) === key).length,
  ]));
  const activeApplications = dashboard.applications.filter(
    (application) => applicationStage(application.status) !== "terminal",
  );
  const activePipeline = activeApplications.filter(
    (application) => applicationStage(application.status) !== "research",
  ).length;
  const nextDatedTask = actionTasks.find((task) => task.dueDate);
  const sent = dashboard.applications.filter((application) =>
    Boolean(application.submissionEvidence)
    || ["assessment", "interview", "offer", "submitted"].includes(application.status)
  ).length;
  const fitCounts = {
    strong: activeApplications.filter((application) => application.fit === "strong-match").length,
    reasonable: activeApplications.filter((application) => application.fit === "reasonable-stretch").length,
    low: activeApplications.filter((application) => application.fit === "low-probability-stretch").length,
    notRecommended: activeApplications.filter((application) => application.fit === "not-recommended").length,
  };
  const fitSummary = [
    `${fitCounts.strong} strong`,
    `${fitCounts.reasonable} reasonable`,
    fitCounts.low ? `${fitCounts.low} low` : "",
    fitCounts.notRecommended ? `${fitCounts.notRecommended} not recommended` : "",
  ].filter(Boolean).join(" · ");
  const recurringGap = repeatedGap(activeApplications);

  const navigate = (
    view: DashboardView,
    nextFilter: ApplicationFilter = filter,
    selectedApplicationId?: string,
  ) => {
    setActiveView(view);
    if (view === "applications") setFilter(nextFilter);
    if (selectedApplicationId) setSelectedId(selectedApplicationId);
    window.history.pushState({}, "", dashboardHref(view, nextFilter));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewLink = (
    event: React.MouseEvent<HTMLAnchorElement>,
    view: DashboardView,
    nextFilter: ApplicationFilter = "active",
  ) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(view, nextFilter);
  };

  const selectApplication = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1120px)").matches) {
      requestAnimationFrame(() => {
        document.getElementById("application-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  const copyTaskPrompt = async (task: ActionTask) => {
    setFallbackPrompt("");
    try {
      await navigator.clipboard.writeText(task.prompt);
      setCopyMessage("Copied. Paste the prompt into Codex.");
    } catch {
      setFallbackPrompt(task.prompt);
      setCopyMessage("Clipboard unavailable. Copy the prompt shown below.");
    }
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Career HQ navigation">
        <a
          className={styles.brand}
          href={dashboardHref("overview")}
          onClick={(event) => handleViewLink(event, "overview")}
          aria-label="Career HQ overview"
        >
          <span className={styles.brandMark}>CHQ</span>
          <span><strong>Career HQ</strong><small>Command center</small></span>
        </a>

        <nav className={styles.nav} aria-label="Dashboard views">
          {navigation.map((item) => (
            <a
              className={activeView === item.id ? styles.navActive : undefined}
              href={dashboardHref(item.id)}
              aria-current={activeView === item.id ? "page" : undefined}
              onClick={(event) => handleViewLink(event, item.id)}
              key={item.id}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </a>
          ))}
        </nav>

        <nav className={styles.utilityNav} aria-label="Personal settings">
          {utilityNavigation.map((item) => (
            <a
              className={activeView === item.id ? styles.navActive : undefined}
              href={dashboardHref(item.id)}
              aria-current={activeView === item.id ? "page" : undefined}
              onClick={(event) => handleViewLink(event, item.id)}
              key={item.id}
            >
              <strong>{item.label}</strong>
              <span>{item.note}</span>
            </a>
          ))}
        </nav>

        <div className={styles.sidebarStatus} data-state={dashboard.workspaceStatus}>
          <span aria-hidden="true" />
          <div>
            <strong>{dashboard.workspaceStatus === "ready" ? "Workspace ready" : "Workspace check"}</strong>
            <small>{dashboard.applications.length} opportunities tracked</small>
          </div>
        </div>
      </aside>

      <main className={styles.main}>
        <DashboardHeader
          view={activeView}
          actionCount={actionTasks.length}
          workspaceStatus={dashboard.workspaceStatus}
          generatedAt={dashboard.generatedAt}
          isRefreshing={isRefreshing}
          onRefresh={refreshDashboard}
        />

        {dashboard.message && (
          <section className={styles.setupPanel} aria-live="polite">
            <strong>{dashboard.workspaceStatus === "needs-setup" ? "Start with Codex" : "Workspace status"}</strong>
            <p>{dashboard.message}</p>
          </section>
        )}

        {activeView === "overview" && (
          <OverviewView
            dashboard={dashboard}
            tasks={actionTasks}
            counts={counts}
            sent={sent}
            activePipeline={activePipeline}
            nextDatedTask={nextDatedTask}
            fallbackPrompt={fallbackPrompt}
            onCopy={copyTaskPrompt}
            onViewApplication={(id) => navigate("applications", "needs-action", id)}
            onViewAll={() => navigate("applications", "needs-action")}
            onSelectStage={(stage) => navigate("applications", stage)}
          />
        )}

        {activeView === "applications" && (
          <ApplicationsView
            dashboard={dashboard}
            applications={filtered}
            selected={selected}
            tasks={actionTasks}
            filter={filter}
            query={query}
            closedCount={counts.terminal ?? 0}
            fallbackPrompt={fallbackPrompt}
            onCopy={copyTaskPrompt}
            onFilter={(nextFilter) => {
              setFilter(nextFilter);
              window.history.replaceState({}, "", dashboardHref("applications", nextFilter));
            }}
            onQuery={setQuery}
            onSelect={selectApplication}
          />
        )}

        {activeView === "insights" && (
          <InsightsView
            targetLane={dashboard.applicant.targetLane}
            fitSummary={fitSummary}
            recurringGap={recurringGap}
            actionCount={actionTasks.length}
            activeCount={activeApplications.length}
          />
        )}

        {activeView === "preferences" && (
          <PreferencesView preferences={dashboard.preferences} />
        )}

        {copyMessage && (
          <div className={styles.copyToast} role="status" aria-live="polite">{copyMessage}</div>
        )}
        <p className="sr-only" aria-live="polite">{isRefreshing ? "Refreshing Career HQ." : ""}</p>
        <footer className={styles.footer}>Workspace updated {formatTimestamp(dashboard.generatedAt)}.</footer>
      </main>
    </div>
  );
}

function DashboardHeader({
  view,
  actionCount,
  workspaceStatus,
  generatedAt,
  isRefreshing,
  onRefresh,
}: {
  view: DashboardView;
  actionCount: number;
  workspaceStatus: DashboardData["workspaceStatus"];
  generatedAt: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const content = {
    overview: {
      kicker: "Today at a glance",
      title: "Your next move, clearly.",
      intro: `${actionCount} ${actionCount === 1 ? "action needs" : "actions need"} your attention across the current search.`,
    },
    applications: {
      kicker: "Application workspace",
      title: "Every opportunity, organized.",
      intro: "Search, filter, and review one application without losing your place.",
    },
    insights: {
      kicker: "Search signals",
      title: "Patterns worth noticing.",
      intro: "Use what the pipeline shows to focus effort without manufacturing qualifications.",
    },
    preferences: {
      kicker: "Job-search preferences",
      title: "What Career HQ should look for.",
      intro: "These verified preferences guide which opportunities Career HQ prioritizes and avoids.",
    },
  }[view];

  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>{content.kicker}</p>
        <h1>{content.title}</h1>
        <p className={styles.intro}>{content.intro}</p>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.workspacePill} data-state={workspaceStatus}>
          <span aria-hidden="true" />{workspaceStatus}
        </span>
        <button className={styles.refreshButton} type="button" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing…" : "Refresh data"}
        </button>
        <span className={styles.refreshMeta}>Updated {formatTimestamp(generatedAt)}</span>
      </div>
    </header>
  );
}

function OverviewView({
  dashboard,
  tasks,
  counts,
  sent,
  activePipeline,
  nextDatedTask,
  fallbackPrompt,
  onCopy,
  onViewApplication,
  onViewAll,
  onSelectStage,
}: {
  dashboard: DashboardData;
  tasks: ActionTask[];
  counts: Record<string, number>;
  sent: number;
  activePipeline: number;
  nextDatedTask?: ActionTask;
  fallbackPrompt: string;
  onCopy: (task: ActionTask) => Promise<void>;
  onViewApplication: (id: string) => void;
  onViewAll: () => void;
  onSelectStage: (stage: ApplicationFilter) => void;
}) {
  const visibleTasks = overviewActionTasks(tasks);

  return (
    <div className={styles.viewStack}>
      <section className={styles.priorityPanel} aria-labelledby="priority-heading">
        <SectionHeading
          kicker="Next actions"
          title="Focus here first"
          meta={tasks.length ? `${tasks.length} total` : "Caught up"}
          headingId="priority-heading"
        />

        {visibleTasks.length ? (
          <ol className={styles.priorityList}>
            {visibleTasks.map((task, index) => (
              <li className={styles.priorityItem} data-section={task.section} key={task.applicationId}>
                <span className={styles.priorityNumber}>{String(index + 1).padStart(2, "0")}</span>
                <button className={styles.priorityIdentity} type="button" onClick={() => onViewApplication(task.applicationId)}>
                  <span className={styles.urgency}>{taskDueLabel(task)}</span>
                  <strong>{task.title}</strong>
                  <span>{task.employer} · {task.role}</span>
                  <small>{task.description}</small>
                </button>
                <div className={styles.priorityActions}>
                  <button className={styles.primaryButton} type="button" onClick={() => void onCopy(task)}>Continue in Codex</button>
                  <button className={styles.secondaryButton} type="button" onClick={() => onViewApplication(task.applicationId)}>View details</button>
                  {task.latestMaterialKinds.includes("pdf") && (
                    <a className={styles.textLink} href={taskMaterialHref(task, "pdf")} target="_blank" rel="noreferrer">Latest resume</a>
                  )}
                </div>
                {fallbackPrompt === task.prompt && <PromptFallback prompt={task.prompt} />}
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.caughtUp}>
            <strong>You are caught up.</strong>
            <p>New blockers and scheduled work will appear here automatically.</p>
          </div>
        )}

        {tasks.length > 0 && (
          <button className={styles.viewAllButton} type="button" onClick={onViewAll}>
            View all {tasks.length} actions
          </button>
        )}
      </section>

      <section className={styles.metrics} aria-label="Job search overview">
        <Metric label="Applications sent" value={String(sent)} note="Confirmed or active submissions" />
        <Metric label="Active pipeline" value={String(activePipeline)} note="Moving opportunities" />
        <Metric label="Ready for review" value={String(counts.ready ?? 0)} note="Awaiting packet review" />
        <Metric
          label="Next scheduled"
          value={nextDatedTask ? formatDate(nextDatedTask.dueDate) : "—"}
          note={nextDatedTask?.employer ?? "No action scheduled"}
          accent
        />
      </section>

      <section className={styles.pipelinePanel} aria-labelledby="pipeline-heading">
        <SectionHeading
          kicker="Pipeline"
          title="Where opportunities stand"
          meta={`${dashboard.applications.length} tracked`}
          headingId="pipeline-heading"
        />
        <div className={styles.pipeline}>
          {stages.map(([key, label]) => (
            <button type="button" key={key} onClick={() => onSelectStage(key)}>
              <strong>{counts[key] ?? 0}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ApplicationsView({
  dashboard,
  applications,
  selected,
  tasks,
  filter,
  query,
  closedCount,
  fallbackPrompt,
  onCopy,
  onFilter,
  onQuery,
  onSelect,
}: {
  dashboard: DashboardData;
  applications: Application[];
  selected?: Application;
  tasks: ActionTask[];
  filter: ApplicationFilter;
  query: string;
  closedCount: number;
  fallbackPrompt: string;
  onCopy: (task: ActionTask) => Promise<void>;
  onFilter: (filter: ApplicationFilter) => void;
  onQuery: (query: string) => void;
  onSelect: (id: string) => void;
}) {
  const selectedTask = selected
    ? tasks.find((task) => task.applicationId === selected.id)
    : undefined;

  return (
    <section className={styles.applicationWorkspace} aria-labelledby="applications-heading">
      <div className={styles.workspaceHeading}>
        <div>
          <p className={styles.eyebrow}>Application tracker</p>
          <h2 id="applications-heading">Find the opportunity you need.</h2>
        </div>
        <span>{applications.length} shown · {closedCount} closed</span>
      </div>

      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span>Search applications</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Company, role, status, fit, date, or next action"
          />
        </label>
        <label className={styles.filterField}>
          <span>Filter by status</span>
          <select value={filter} onChange={(event) => onFilter(event.target.value as ApplicationFilter)}>
            <option value="active">Active applications</option>
            <option value="needs-action">Needs action</option>
            {stages.map(([key]) => <option value={key} key={key}>{filterLabels[key]}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.trackerGrid}>
        <div className={styles.applicationListPanel}>
          <div className={styles.applicationListHeader} aria-hidden="true">
            <span>Opportunity</span><span>Stage and fit</span><span>Next action</span>
          </div>
          <div className={styles.applicationList} aria-label="Applications">
            {applications.length ? applications.map((application) => (
              <ApplicationRow
                application={application}
                selected={selected?.id === application.id}
                hasAction={tasks.some((task) => task.applicationId === application.id)}
                onSelect={() => onSelect(application.id)}
                key={application.id}
              />
            )) : (
              <div className={styles.emptyState}>
                <strong>{dashboard.applications.length ? "No matches in this view." : "No applications yet."}</strong>
                <p>{dashboard.applications.length ? "Try a different search or filter." : "Ask Codex to begin the job search."}</p>
              </div>
            )}
          </div>
        </div>

        {selected ? (
          <ApplicationDetail
            application={selected}
            task={selectedTask}
            fallbackPrompt={fallbackPrompt}
            onCopy={onCopy}
            key={selected.id}
          />
        ) : (
          <aside className={styles.noSelection} aria-live="polite">
            <strong>No application selected</strong>
            <p>Choose an application from the list to review its details.</p>
          </aside>
        )}
      </div>
    </section>
  );
}

function InsightsView({
  targetLane,
  fitSummary,
  recurringGap,
  actionCount,
  activeCount,
}: {
  targetLane: string;
  fitSummary: string;
  recurringGap: { label: string; count: number } | null;
  actionCount: number;
  activeCount: number;
}) {
  return (
    <section className={styles.insightsView} aria-labelledby="insights-heading">
      <div className={styles.workspaceHeading}>
        <div>
          <p className={styles.eyebrow}>Search insights</p>
          <h2 id="insights-heading">A quieter view of the bigger picture.</h2>
        </div>
        <span>{activeCount} active opportunities</span>
      </div>
      <div className={styles.insightGrid}>
        <Insight label="Strongest role lane" value={targetLane} note="From verified onboarding answers" />
        <Insight label="Active fit distribution" value={fitSummary || "No active roles"} note="Closed applications excluded" />
        <Insight
          label="Recurring gap"
          value={recurringGap?.label ?? "No repeated gap yet"}
          note={recurringGap ? `Repeated across ${recurringGap.count} active roles` : "A gap must appear in at least two active roles"}
        />
        <Insight label="Action load" value={`${actionCount} active`} note="Critical and oldest work first" accent />
      </div>
    </section>
  );
}

function PreferencesView({ preferences }: { preferences: DashboardData["preferences"] }) {
  return (
    <section className={styles.preferencesView} aria-labelledby="preferences-heading">
      <div className={styles.workspaceHeading}>
        <div>
          <p className={styles.eyebrow}>Known preferences</p>
          <h2 id="preferences-heading">Your current search boundaries.</h2>
        </div>
        <span>{preferences.length} verified {preferences.length === 1 ? "preference" : "preferences"}</span>
      </div>

      {preferences.length ? (
        <dl className={styles.preferenceGrid}>
          {preferences.map((preference) => (
            <div className={styles.preferenceCard} key={preference.id}>
              <dt>{preference.label}</dt>
              <dd>{preference.value}</dd>
              <small>{preference.verifiedAt ? `Verified ${formatTimestamp(preference.verifiedAt)}` : "Verified preference"}</small>
            </div>
          ))}
        </dl>
      ) : (
        <div className={styles.emptyDetail}>
          <strong>No verified job preferences yet.</strong>
          <p>Complete onboarding with Codex and your search boundaries will appear here.</p>
        </div>
      )}

      <p className={styles.preferenceBoundary}>Only verified job-search preferences from your private local profile are shown here.</p>
    </section>
  );
}

function SectionHeading({
  kicker,
  title,
  meta,
  headingId,
}: {
  kicker: string;
  title: string;
  meta?: string;
  headingId?: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div><p className={styles.eyebrow}>{kicker}</p><h2 id={headingId}>{title}</h2></div>
      {meta && <span>{meta}</span>}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={accent ? styles.metricAccent : styles.metric}>
      <p>{label}</p><strong>{value}</strong><span>{note}</span>
    </article>
  );
}

function ApplicationRow({
  application,
  selected,
  hasAction,
  onSelect,
}: {
  application: Application;
  selected: boolean;
  hasAction: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={selected ? styles.applicationSelected : styles.application}
      onClick={onSelect}
      aria-pressed={selected}
      aria-controls="application-detail"
    >
      <span className={styles.applicationIdentity}>
        <span className={styles.companyMark} aria-hidden="true">{application.employer.slice(0, 2).toUpperCase()}</span>
        <span><strong>{application.role}</strong><small>{application.employer} · {application.location}</small></span>
      </span>
      <span className={styles.applicationState}>
        <span className={`${styles.fit} ${styles[application.fit]}`}>{fitLabels[application.fit]}</span>
        <span className={styles.applicationStatus}>{hasAction && <i aria-label="Action required" />}{statusLabels[application.status] ?? application.status}</span>
      </span>
      <span className={styles.rowAction}><strong>{application.nextAction}</strong><small>{formatDate(application.nextActionDate)}</small></span>
    </button>
  );
}

function ApplicationDetail({
  application,
  task,
  fallbackPrompt,
  onCopy,
}: {
  application: Application;
  task?: ActionTask;
  fallbackPrompt: string;
  onCopy: (task: ActionTask) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("summary");
  const latestSnapshot = application.postingSnapshots[application.postingSnapshots.length - 1];
  const sourceUrl = application.sourceUrl || latestSnapshot?.sourceUrl;
  const latestMaterial = application.materials[application.materials.length - 1];
  const hasApplicationRecords = Boolean(
    latestMaterial
    || application.importantAnswers.length
    || application.unresolvedQuestions.length
    || application.approval
    || application.submissionEvidence,
  );
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "application", label: "Application" },
    { id: "posting", label: "Posting" },
  ];

  return (
    <article className={styles.detail} id="application-detail" aria-live="polite">
      <div className={styles.detailOverview}>
        <div className={styles.detailOverviewMain}>
          <div className={styles.detailHeader}>
            <span className={styles.companyMark} aria-hidden="true">{application.employer.slice(0, 2).toUpperCase()}</span>
            <div>
              <h3>{application.role}</h3>
              <p>{application.employer}</p>
              <span>{application.location} · {application.arrangement}</span>
            </div>
          </div>

          <div className={styles.detailTabs} role="tablist" aria-label="Application details">
            {tabs.map((tab) => (
              <button
                type="button"
                role="tab"
                id={`detail-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`detail-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={activeTab === tab.id ? styles.detailTabActive : styles.detailTab}
                onClick={() => setActiveTab(tab.id)}
                key={tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={styles.detailMeta}>
            <DetailFact label="Status" value={statusLabels[application.status] ?? application.status} />
            <DetailFact label="Fit" value={fitLabels[application.fit]} />
            <DetailFact label="Compensation" value={application.compensation} />
            <DetailFact label="Work setup" value={application.arrangement} />
            <DetailFact label="Employment type" value={application.employmentType} />
            <DetailFact label="Location" value={application.location} />
            <DetailFact label="Added" value={formatTimestamp(application.createdAt)} />
            <DetailFact label="Last updated" value={formatTimestamp(application.updatedAt)} />
          </div>
        </div>

        <section className={styles.jobSummary} aria-labelledby="job-summary-heading">
          <h4 id="job-summary-heading">What the job actually is</h4>
          <p>{application.jobSummary}</p>
          {application.jobSummaryBullets.length > 0 && (
            <ul>
              {application.jobSummaryBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}
        </section>
      </div>

      {activeTab === "summary" && (
        <section className={styles.detailPanel} role="tabpanel" id="detail-panel-summary" aria-labelledby="detail-tab-summary">
          <div className={styles.nextAction}>
            <span>Next action · {formatDate(application.nextActionDate)}</span>
            <strong>{application.nextAction}</strong>
            {task && <button className={styles.primaryButton} type="button" onClick={() => void onCopy(task)}>Continue in Codex</button>}
            {task && fallbackPrompt === task.prompt && <PromptFallback prompt={task.prompt} />}
          </div>

          <DetailSection title="Fit assessment">
            <dl className={styles.assessment}>
              <DetailFact label="Strongest match" value={application.strongestMatch} />
              <DetailFact label="Largest gap" value={application.largestGap} />
              <DetailFact label="Major risk" value={application.risk} />
            </dl>
          </DetailSection>

        </section>
      )}

      {activeTab === "application" && (
        <section className={styles.detailPanel} role="tabpanel" id="detail-panel-application" aria-labelledby="detail-tab-application">
          {!hasApplicationRecords && (
            <div className={styles.emptyDetail}><strong>No application records yet.</strong><p>Prepared materials, answers, and approval history will appear here.</p></div>
          )}

          {application.unresolvedQuestions.length > 0 && (
            <DetailSection title="Unresolved questions">
              <ul className={styles.simpleList}>{application.unresolvedQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
            </DetailSection>
          )}

          {latestMaterial && (
            <DetailSection title="Prepared materials">
              <div className={styles.materialCard}>
                <strong>Latest resume · version {latestMaterial.version}</strong>
                <span>Prepared {formatTimestamp(latestMaterial.generatedAt)}</span>
                <span>Visual verification · {latestMaterial.visualVerificationStatus === "passed" ? "Passed" : "Required"}</span>
                <div className={styles.materialLinks}>
                  {latestMaterial.files.map((file) => {
                    const isPdf = file.kind.toLowerCase() === "pdf";
                    const isWord = file.kind.toLowerCase() === "docx";
                    return (
                      <a
                        href={materialHref(application, latestMaterial.version, file.kind)}
                        key={file.kind}
                        target={isPdf ? "_blank" : undefined}
                        rel={isPdf ? "noreferrer" : undefined}
                      >
                        {isPdf ? "View" : "Download"} {application.employer} — {application.role} resume ({isPdf ? "PDF" : isWord ? "Word" : "document"})
                      </a>
                    );
                  })}
                </div>
              </div>
            </DetailSection>
          )}

          {application.importantAnswers.length > 0 && (
            <DetailSection title="Application answers">
              <dl className={styles.recordList}>
                {application.importantAnswers.map((answer, index) => (
                  <div key={`${answer.question}-${index}`}>
                    <dt>{answer.question}{answer.sensitive && <span>Sensitive</span>}</dt>
                    <dd>{answer.answer}</dd>
                    {(answer.source || answer.approvalState) && <small>{[answer.source, answer.approvalState].filter(Boolean).join(" · ")}</small>}
                  </div>
                ))}
              </dl>
            </DetailSection>
          )}

          {(application.approval || application.submissionEvidence) && (
            <DetailSection title="Approval and submission">
              <dl className={styles.recordList}>
                {application.approval && (
                  <div><dt>Application approval</dt><dd>Approved for this application</dd><small>{formatTimestamp(application.approval.authorizedAt)} · {application.approval.confirmation}</small></div>
                )}
                {application.submissionEvidence && (
                  <div><dt>Submission evidence</dt><dd>{application.submissionEvidence.description}</dd><small>{application.submissionEvidence.kind} · {formatTimestamp(application.submissionEvidence.recordedAt)}</small></div>
                )}
              </dl>
            </DetailSection>
          )}
        </section>
      )}

      {activeTab === "posting" && (
        <section className={styles.detailPanel} role="tabpanel" id="detail-panel-posting" aria-labelledby="detail-tab-posting">
          <DetailSection title="Original source">
            {sourceUrl
              ? <a className={styles.sourceLink} href={sourceUrl} target="_blank" rel="noreferrer">Open original job posting ↗</a>
              : <p className={styles.mutedDetail}>No original source URL was recorded.</p>}
          </DetailSection>

          {application.postingSnapshots.length > 0 && (
            <DetailSection title="Saved snapshots">
              <ul className={styles.snapshotList}>
                {application.postingSnapshots.map((snapshot, index) => (
                  <li key={`${snapshot.sourceUrl}-${index}`}>
                    <strong>Snapshot {index + 1}</strong>
                    <span>Captured {formatTimestamp(snapshot.capturedAt)}</span>
                    <span>{snapshot.credibleSourceConfirmed ? "Credible source confirmed" : "Source confirmation not recorded"}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {latestSnapshot?.content ? (
            <DetailSection title="Full saved posting">
              <details className={styles.postingText}>
                <summary>Read the complete posting</summary>
                <pre>{latestSnapshot.content}</pre>
              </details>
            </DetailSection>
          ) : (
            <p className={styles.mutedDetail}>No saved posting text is available.</p>
          )}
        </section>
      )}

      <p className={styles.detailBoundary}>Submission always requires explicit, application-specific authorization and confirmation evidence.</p>
    </article>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.detailSection}><h4>{title}</h4>{children}</section>;
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function PromptFallback({ prompt }: { prompt: string }) {
  return (
    <label className={styles.promptFallback}>
      <span>Copy this prompt into Codex</span>
      <textarea readOnly value={prompt} onFocus={(event) => event.currentTarget.select()} />
    </label>
  );
}

function Insight({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={accent ? styles.insightCardAccent : styles.insightCard}>
      <span>{label}</span><strong>{value}</strong><p>{note}</p>
    </article>
  );
}
