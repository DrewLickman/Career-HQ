"use client";

import { useEffect, useMemo, useState } from "react";
import type { Application, DashboardData } from "./types";
import styles from "./dashboard.module.css";

const stages = [
  ["research", "Research"], ["ready", "Ready"], ["applied", "Applied"],
  ["assessment", "Assessment"], ["interview", "Interview"],
  ["offer", "Offer"], ["terminal", "Closed"],
] as const;

const navigation = [
  ["overview", "01", "Overview"],
  ["pipeline", "02", "Pipeline"],
  ["applications", "03", "Applications"],
  ["insights", "04", "Insights"],
] as const;

const fitLabels: Record<string, string> = {
  "strong-match": "Strong match",
  "reasonable-stretch": "Reasonable stretch",
  "low-probability-stretch": "Low-probability stretch",
  "not-recommended": "Not recommended",
};

const terminalStatuses = new Set(["rejected", "withdrawn", "closed"]);

function stageGroup(status: string) {
  if (terminalStatuses.has(status)) return "terminal";
  if (status === "submitted") return "applied";
  if (status === "submission-unconfirmed") return "ready";
  return status;
}

function formatDate(value: string) {
  if (!value) return "Not scheduled";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
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
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))[0] ?? null;
}

export function CareerDashboard({ dashboard }: { dashboard: DashboardData }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const firstActiveId = dashboard.applications.find((application) => stageGroup(application.status) !== "terminal")?.id ?? "";
  const [selectedId, setSelectedId] = useState(firstActiveId);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const sections = navigation
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    let animationFrame = 0;

    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.28;
      const visible = sections
        .map((section) => ({ id: section.id, rect: section.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight)
        .map(({ id, rect }) => ({
          id,
          distance: rect.top <= marker && rect.bottom >= marker
            ? 0
            : Math.min(Math.abs(rect.top - marker), Math.abs(rect.bottom - marker)),
        }))
        .sort((a, b) => a.distance - b.distance);
      if (visible[0]) setActiveSection(visible[0].id);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dashboard.applications.filter((application) => {
      const haystack = [application.employer, application.role, application.location, application.nextAction].join(" ").toLowerCase();
      const stage = stageGroup(application.status);
      const matchesStatus = status === "active" ? stage !== "terminal" : stage === status;
      return (!needle || haystack.includes(needle)) && matchesStatus;
    });
  }, [dashboard.applications, query, status]);

  const selected = filtered.find((application) => application.id === selectedId) ?? filtered[0];
  const counts = Object.fromEntries(stages.map(([key]) => [key, dashboard.applications.filter((application) => stageGroup(application.status) === key).length]));
  const activeApplications = dashboard.applications.filter((application) => stageGroup(application.status) !== "terminal");
  const activePipeline = activeApplications.filter((application) => stageGroup(application.status) !== "research").length;
  const priorities = [...activeApplications]
    .filter((application) => application.nextActionDate)
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate)).slice(0, 3);
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
  const sent = dashboard.applications.filter((application) =>
    Boolean(application.submissionEvidence)
    || ["applied", "assessment", "interview", "offer", "submitted"].includes(application.status)
  ).length;
  const recurringGap = repeatedGap(activeApplications);

  const selectApplication = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1080px)").matches) {
      requestAnimationFrame(() => {
        document.getElementById("application-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Career HQ navigation">
        <a className={styles.brand} href="#top" aria-label="Career HQ home"><span className={styles.brandMark}>CHQ</span><span>Career HQ</span></a>
        <nav className={styles.nav}>
          {navigation.map(([id, number, label]) => (
            <a
              className={activeSection === id ? styles.navActive : undefined}
              href={`#${id}`}
              aria-current={activeSection === id ? "location" : undefined}
              onClick={() => setActiveSection(id)}
              key={id}
            >
              <span>{number}</span>{label}
            </a>
          ))}
        </nav>
      </aside>

      <main className={styles.main} id="top">
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Career workspace · {dashboard.workspaceStatus}</p><h1>Your search, in focus.</h1><p className={styles.intro}>A truthful command center for {dashboard.applicant.displayName === "Your" ? "your" : `${dashboard.applicant.displayName}'s`} search.</p></div>
          <div className={styles.headerActions}><a className={styles.primaryAction} href="#applications">Review queue</a></div>
        </header>

        {dashboard.message && <section className={styles.setupPanel} aria-live="polite"><strong>{dashboard.workspaceStatus === "needs-setup" ? "Start with Codex" : "Workspace status"}</strong><p>{dashboard.message}</p></section>}

        <section className={styles.metrics} id="overview" aria-label="Job search overview">
          <Metric label="Applications sent" value={String(sent)} note="Confirmed or active submissions" />
          <Metric label="Active pipeline" value={String(activePipeline)} note="Moving opportunities" />
          <Metric label="Ready to apply" value={String(counts.ready ?? 0)} note="Awaiting review" />
          <Metric label="Next follow-up" value={priorities[0] ? formatDate(priorities[0].nextActionDate) : "—"} note={priorities[0]?.employer ?? "No action scheduled"} accent />
        </section>

        <div className={styles.topGrid}>
          <section className={styles.panel} id="pipeline">
            <SectionHeading kicker="Momentum" title="Pipeline health" meta={`${activeApplications.length} active · ${counts.terminal ?? 0} closed`} />
            <div className={styles.pipeline}>{stages.map(([key, label]) => <button className={status === key ? styles.pipelineActive : styles.pipelineItem} key={key} onClick={() => setStatus(status === key ? "active" : key)} aria-pressed={status === key}><strong>{counts[key] ?? 0}</strong><span>{label}</span></button>)}</div>
          </section>
          <section className={`${styles.panel} ${styles.queuePanel}`} aria-labelledby="priority-heading">
            <SectionHeading kicker="Do next" title="Priority queue" headingId="priority-heading" />
            <ol className={styles.priorityList}>{priorities.length ? priorities.map((application, index) => <li key={application.id}><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => { setSelectedId(application.id); document.getElementById("applications")?.scrollIntoView({ behavior: "smooth" }); }}><strong>{application.nextAction}</strong><small>{application.employer} · {formatDate(application.nextActionDate)}</small></button></li>) : <li><span>01</span><p className={styles.empty}>No scheduled actions yet.</p></li>}</ol>
          </section>
        </div>

        <section className={styles.applicationsSection} id="applications">
          <SectionHeading kicker="Every opportunity" title="Application tracker" meta={status === "active" ? `${filtered.length} active · ${counts.terminal ?? 0} closed hidden` : `${filtered.length} shown`} />
          <div className={styles.controls}>
            <label className={styles.search}><span className="sr-only">Search applications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role, location..." /></label>
            <label><span className="sr-only">Filter by pipeline status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active applications</option>{stages.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          </div>
          <div className={styles.trackerGrid}>
            <div className={styles.applicationList} aria-label="Applications">
              {filtered.length ? filtered.map((application) => <ApplicationRow application={application} selected={selected?.id === application.id} onSelect={() => selectApplication(application.id)} key={application.id} />) : <p className={styles.empty}>{dashboard.applications.length ? "No applications match this view." : "No applications yet. Ask Codex to begin the job search."}</p>}
            </div>
            {selected && <ApplicationDetail application={selected} />}
          </div>
        </section>

        <section className={styles.insights} id="insights" aria-labelledby="insights-heading">
          <div className={styles.insightIntro}><p className={styles.kicker}>Pattern recognition</p><h2 id="insights-heading">What the search is telling you.</h2><p>Use evidence from the pipeline to focus effort—not to manufacture qualifications.</p></div>
          <Insight label="Strongest role lane" value={dashboard.applicant.targetLane} note="From verified onboarding answers" />
          <Insight label="Active fit distribution" value={fitSummary || "No active roles"} note="Closed applications excluded" />
          <Insight label="Recurring gap" value={recurringGap?.label ?? "No repeated gap yet"} note={recurringGap ? `Repeated across ${recurringGap.count} active roles` : "A gap must appear in at least two active roles"} />
          <Insight label="Action queue" value={`${priorities.length} scheduled`} note="Oldest first" />
        </section>
        <footer className={styles.footer}><p>Workspace updated {formatDate(dashboard.generatedAt)}.</p></footer>
      </main>
    </div>
  );
}

function SectionHeading({ kicker, title, meta, headingId }: { kicker: string; title: string; meta?: string; headingId?: string }) {
  return <div className={styles.sectionHeading}><div><p className={styles.kicker}>{kicker}</p><h2 id={headingId}>{title}</h2></div>{meta && <span>{meta}</span>}</div>;
}
function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article className={accent ? styles.metricAccent : styles.metric}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>; }
function ApplicationRow({ application, selected, onSelect }: { application: Application; selected: boolean; onSelect: () => void }) {
  return <button className={selected ? styles.applicationSelected : styles.application} onClick={onSelect} aria-pressed={selected} aria-controls="application-detail"><span className={styles.companyMark} aria-hidden="true">{application.employer.slice(0, 2).toUpperCase()}</span><span className={styles.applicationIdentity}><strong>{application.role}</strong><small>{application.employer} · {application.location}</small></span><span className={`${styles.fit} ${styles[application.fit]}`}>{fitLabels[application.fit]}</span><span className={styles.applicationStatus}>{application.status}</span><span className={styles.rowAction}><strong>{application.nextAction}</strong><small>{formatDate(application.nextActionDate)}</small></span></button>;
}
function ApplicationDetail({ application }: { application: Application }) {
  const latestSnapshot = application.postingSnapshots[application.postingSnapshots.length - 1];
  const sourceUrl = application.sourceUrl || latestSnapshot?.sourceUrl;
  const latestMaterial = application.materials[application.materials.length - 1];

  return (
    <article className={styles.detail} id="application-detail" aria-live="polite">
      <div className={styles.detailHeader}>
        <span className={styles.companyMark}>{application.employer.slice(0, 2).toUpperCase()}</span>
        <div>
          <p>{application.employer}</p>
          <h3>{application.role}</h3>
          <span>{application.location} · {application.arrangement}</span>
        </div>
      </div>

      <div className={styles.detailMeta}>
        <div><span>Status</span><strong>{application.status}</strong></div>
        <div><span>Fit</span><strong>{fitLabels[application.fit]}</strong></div>
        <div><span>Compensation</span><strong>{application.compensation}</strong></div>
      </div>

      <section className={styles.detailSection}>
        <h4>Job details</h4>
        <dl className={styles.factList}>
          <DetailFact label="Employment type" value={application.employmentType} />
          <DetailFact label="Work arrangement" value={application.arrangement} />
          <DetailFact label="Location" value={application.location} />
          <DetailFact label="Added" value={formatTimestamp(application.createdAt)} />
          <DetailFact label="Last updated" value={formatTimestamp(application.updatedAt)} />
        </dl>
      </section>

      <section className={styles.detailSection}>
        <h4>Fit assessment</h4>
        <dl className={styles.assessment}>
          <div><dt>Strongest match</dt><dd>{application.strongestMatch}</dd></div>
          <div><dt>Largest gap</dt><dd>{application.largestGap}</dd></div>
          <div><dt>Major risk</dt><dd>{application.risk}</dd></div>
        </dl>
      </section>

      <div className={styles.nextAction}>
        <span>Next action · {formatDate(application.nextActionDate)}</span>
        <strong>{application.nextAction}</strong>
      </div>

      <section className={styles.detailSection}>
        <h4>Original source</h4>
        {sourceUrl
          ? <a className={styles.sourceLink} href={sourceUrl} target="_blank" rel="noreferrer">Open original job posting ↗</a>
          : <p className={styles.mutedDetail}>No original source URL was recorded.</p>}
        {application.postingSnapshots.length > 0 && (
          <ul className={styles.snapshotList}>
            {application.postingSnapshots.map((snapshot, index) => (
              <li key={`${snapshot.sourceUrl}-${index}`}>
                <strong>Snapshot {index + 1}</strong>
                <span>Captured {formatTimestamp(snapshot.capturedAt)}</span>
                <span>{snapshot.credibleSourceConfirmed ? "Credible source confirmed" : "Source confirmation not recorded"}</span>
              </li>
            ))}
          </ul>
        )}
        {latestSnapshot?.content && (
          <details className={styles.postingText} open>
            <summary>Full saved posting</summary>
            <pre>{latestSnapshot.content}</pre>
          </details>
        )}
      </section>

      {application.importantAnswers.length > 0 && (
        <section className={styles.detailSection}>
          <h4>Application answers</h4>
          <dl className={styles.recordList}>
            {application.importantAnswers.map((answer, index) => (
              <div key={`${answer.question}-${index}`}>
                <dt>{answer.question}{answer.sensitive && <span> Sensitive</span>}</dt>
                <dd>{answer.answer}</dd>
                {(answer.source || answer.approvalState) && <small>{[answer.source, answer.approvalState].filter(Boolean).join(" · ")}</small>}
              </div>
            ))}
          </dl>
        </section>
      )}

      {application.unresolvedQuestions.length > 0 && (
        <section className={styles.detailSection}>
          <h4>Unresolved questions</h4>
          <ul className={styles.simpleList}>{application.unresolvedQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
        </section>
      )}

      {latestMaterial && (
        <section className={styles.detailSection}>
          <h4>Prepared materials</h4>
          <ul className={styles.materialList}>
              <li>
                <strong>Latest resume · version {latestMaterial.version}</strong>
                <span>Prepared {formatTimestamp(latestMaterial.generatedAt)}</span>
                {latestMaterial.files.map((file) => {
                  const isPdf = file.kind.toLowerCase() === "pdf";
                  const isWord = file.kind.toLowerCase() === "docx";
                  const action = isPdf ? "View" : "Download";
                  const format = isPdf ? "PDF" : isWord ? "Word" : "document";
                  return (
                    <a
                      className={styles.materialLink}
                      href={materialHref(application, latestMaterial.version, file.kind)}
                      key={file.kind}
                      target={isPdf ? "_blank" : undefined}
                      rel={isPdf ? "noreferrer" : undefined}
                    >
                      {action} {application.employer} — {application.role} resume ({format})
                    </a>
                  );
                })}
              </li>
          </ul>
        </section>
      )}

      {(application.approval || application.submissionEvidence) && (
        <section className={styles.detailSection}>
          <h4>Approval and submission</h4>
          <dl className={styles.recordList}>
            {application.approval && <div><dt>Application approval</dt><dd>Approved for this application</dd><small>{formatTimestamp(application.approval.authorizedAt)} · {application.approval.confirmation}</small></div>}
            {application.submissionEvidence && <div><dt>Submission evidence</dt><dd>{application.submissionEvidence.description}</dd><small>{application.submissionEvidence.kind} · {formatTimestamp(application.submissionEvidence.recordedAt)}</small></div>}
          </dl>
        </section>
      )}

      <p className={styles.detailBoundary}>Submission always requires explicit, application-specific authorization and confirmation evidence.</p>
    </article>
  );
}
function DetailFact({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function Insight({ label, value, note }: { label: string; value: string; note: string }) { return <article className={styles.insightCard}><span>{label}</span><strong>{value}</strong><p>{note}</p></article>; }
