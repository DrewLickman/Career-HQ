"use client";

import { useMemo, useState } from "react";
import type { Application, DashboardFixture } from "./types";
import styles from "./dashboard.module.css";

const stages = [
  ["research", "Research"], ["ready", "Ready"], ["applied", "Applied"],
  ["assessment", "Assessment"], ["interview", "Interview"],
  ["offer", "Offer"], ["terminal", "Closed"],
] as const;

const fitLabels: Record<string, string> = {
  "strong-match": "Strong match",
  "reasonable-stretch": "Reasonable stretch",
  "low-probability-stretch": "Low-probability stretch",
  "not-recommended": "Not recommended",
};

function stageGroup(status: string) {
  return ["rejected", "withdrawn", "closed", "not-recommended"].includes(status)
    ? "terminal" : status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(`${value}T12:00:00`));
}

export function CareerDashboard({ fixture }: { fixture: DashboardFixture }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState(fixture.applications[0]?.id ?? "");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fixture.applications.filter((application) => {
      const haystack = [application.employer, application.role, application.location, application.nextAction].join(" ").toLowerCase();
      return (!needle || haystack.includes(needle)) && (status === "all" || stageGroup(application.status) === status);
    });
  }, [fixture.applications, query, status]);

  const selected = fixture.applications.find((application) => application.id === selectedId) ?? filtered[0] ?? fixture.applications[0];
  const counts = Object.fromEntries(stages.map(([key]) => [key, fixture.applications.filter((application) => stageGroup(application.status) === key).length]));
  const active = fixture.applications.filter((application) => !["terminal", "research"].includes(stageGroup(application.status))).length;
  const priorities = [...fixture.applications]
    .filter((application) => stageGroup(application.status) !== "terminal")
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate)).slice(0, 3);
  const strongMatches = fixture.applications.filter((application) => application.fit === "strong-match").length;
  const sent = (counts.applied ?? 0) + (counts.assessment ?? 0) + (counts.interview ?? 0) + (counts.offer ?? 0);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Career HQ navigation">
        <a className={styles.brand} href="#top" aria-label="Career HQ home"><span className={styles.brandMark}>CH</span><span>Career HQ</span></a>
        <nav className={styles.nav}>
          <a className={styles.navActive} href="#overview"><span>01</span>Overview</a>
          <a href="#pipeline"><span>02</span>Pipeline</a>
          <a href="#applications"><span>03</span>Applications</a>
          <a href="#insights"><span>04</span>Insights</a>
        </nav>
        <div className={styles.privateCard}><span className={styles.lockDot} aria-hidden="true" /><strong>Local by design</strong><p>Real profiles and documents stay inside your ignored .job-search folder.</p></div>
      </aside>

      <main className={styles.main} id="top">
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>Tuesday briefing · Fictional demo</p><h1>Your search, in focus.</h1><p className={styles.intro}>A truthful command center for {fixture.applicant.displayName}&apos;s fictional search.</p></div>
          <div className={styles.headerActions}><span className={styles.fixtureBadge}>Fictional data only</span><a className={styles.primaryAction} href="#applications">Review queue</a></div>
        </header>

        <section className={styles.metrics} id="overview" aria-label="Job search overview">
          <Metric label="Applications sent" value={String(sent)} note="This search cycle" />
          <Metric label="Active pipeline" value={String(active)} note="Moving opportunities" />
          <Metric label="Ready to apply" value={String(counts.ready ?? 0)} note="Awaiting review" />
          <Metric label="Next follow-up" value={formatDate(priorities[0].nextActionDate)} note={priorities[0].employer} accent />
        </section>

        <div className={styles.topGrid}>
          <section className={styles.panel} id="pipeline">
            <SectionHeading kicker="Momentum" title="Pipeline health" meta={`${fixture.applications.length} tracked`} />
            <div className={styles.pipeline}>{stages.map(([key, label]) => <button className={status === key ? styles.pipelineActive : styles.pipelineItem} key={key} onClick={() => setStatus(status === key ? "all" : key)} aria-pressed={status === key}><strong>{counts[key] ?? 0}</strong><span>{label}</span></button>)}</div>
          </section>
          <section className={`${styles.panel} ${styles.queuePanel}`} aria-labelledby="priority-heading">
            <SectionHeading kicker="Do next" title="Priority queue" headingId="priority-heading" />
            <ol className={styles.priorityList}>{priorities.map((application, index) => <li key={application.id}><span>{String(index + 1).padStart(2, "0")}</span><button onClick={() => { setSelectedId(application.id); document.getElementById("applications")?.scrollIntoView({ behavior: "smooth" }); }}><strong>{application.nextAction}</strong><small>{application.employer} · {formatDate(application.nextActionDate)}</small></button></li>)}</ol>
          </section>
        </div>

        <section className={styles.applicationsSection} id="applications">
          <SectionHeading kicker="Every opportunity" title="Application tracker" meta={`${filtered.length} shown`} />
          <div className={styles.controls}>
            <label className={styles.search}><span className="sr-only">Search applications</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, role, location..." /></label>
            <label><span className="sr-only">Filter by pipeline status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All stages</option>{stages.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          </div>
          <div className={styles.trackerGrid}>
            <div className={styles.applicationList} aria-label="Applications">
              {filtered.length ? filtered.map((application) => <ApplicationRow application={application} selected={selected?.id === application.id} onSelect={() => setSelectedId(application.id)} key={application.id} />) : <p className={styles.empty}>No applications match this view.</p>}
            </div>
            {selected && <ApplicationDetail application={selected} />}
          </div>
        </section>

        <section className={styles.insights} id="insights" aria-labelledby="insights-heading">
          <div className={styles.insightIntro}><p className={styles.kicker}>Pattern recognition</p><h2 id="insights-heading">What the search is telling you.</h2><p>Use evidence from the pipeline to focus effort—not to manufacture qualifications.</p></div>
          <Insight label="Strongest role lane" value={fixture.applicant.targetLane} note="Best evidence density" />
          <Insight label="Match distribution" value={`${strongMatches} strong · ${fixture.applications.length - strongMatches} stretch`} note="Across active and closed roles" />
          <Insight label="Recurring gap" value="Enterprise-scale ownership" note="Confirm scope; never inflate it" />
          <Insight label="Follow-up timing" value="3 actions this week" note="Oldest first" />
        </section>
        <footer className={styles.footer}><p><strong>Career HQ</strong> separates this fictional public preview from your private local workflow.</p><p>Demo fixture updated {fixture.generatedAt}.</p></footer>
      </main>
    </div>
  );
}

function SectionHeading({ kicker, title, meta, headingId }: { kicker: string; title: string; meta?: string; headingId?: string }) {
  return <div className={styles.sectionHeading}><div><p className={styles.kicker}>{kicker}</p><h2 id={headingId}>{title}</h2></div>{meta && <span>{meta}</span>}</div>;
}
function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article className={accent ? styles.metricAccent : styles.metric}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>; }
function ApplicationRow({ application, selected, onSelect }: { application: Application; selected: boolean; onSelect: () => void }) {
  return <button className={selected ? styles.applicationSelected : styles.application} onClick={onSelect} aria-pressed={selected}><span className={styles.companyMark} aria-hidden="true">{application.employer.slice(0, 2).toUpperCase()}</span><span className={styles.applicationIdentity}><strong>{application.role}</strong><small>{application.employer} · {application.location}</small></span><span className={`${styles.fit} ${styles[application.fit]}`}>{fitLabels[application.fit]}</span><span className={styles.applicationStatus}>{application.status}</span><span className={styles.rowAction}><strong>{application.nextAction}</strong><small>{formatDate(application.nextActionDate)}</small></span></button>;
}
function ApplicationDetail({ application }: { application: Application }) {
  return <article className={styles.detail} aria-live="polite"><div className={styles.detailHeader}><span className={styles.companyMark}>{application.employer.slice(0, 2).toUpperCase()}</span><div><p>{application.employer}</p><h3>{application.role}</h3><span>{application.location} · {application.arrangement}</span></div></div><div className={styles.detailMeta}><div><span>Status</span><strong>{application.status}</strong></div><div><span>Fit</span><strong>{fitLabels[application.fit]}</strong></div><div><span>Compensation</span><strong>{application.compensation}</strong></div></div><dl className={styles.assessment}><div><dt>Strongest match</dt><dd>{application.strongestMatch}</dd></div><div><dt>Largest gap</dt><dd>{application.largestGap}</dd></div><div><dt>Major risk</dt><dd>{application.risk}</dd></div></dl><div className={styles.nextAction}><span>Next action · {formatDate(application.nextActionDate)}</span><strong>{application.nextAction}</strong></div><p className={styles.detailBoundary}>Preview only. Submission always requires explicit, application-specific authorization and confirmation evidence.</p></article>;
}
function Insight({ label, value, note }: { label: string; value: string; note: string }) { return <article className={styles.insightCard}><span>{label}</span><strong>{value}</strong><p>{note}</p></article>; }
