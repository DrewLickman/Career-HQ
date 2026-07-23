"use client";

import { useMemo, useState } from "react";

const REPOSITORY_URL = "https://github.com/DrewLickman/Career-HQ";

const applications = [
  {
    id: "northstar",
    company: "Northstar Systems",
    role: "Junior Automation Specialist",
    location: "Remote",
    status: "Ready",
    fit: "Strong match",
    fitClass: "strong",
    action: "Review tailored resume",
    date: "Today",
    match: "Workflow automation and client support evidence",
    gap: "Limited enterprise-scale ownership",
  },
  {
    id: "pine",
    company: "Pine & Finch",
    role: "Implementation Coordinator",
    location: "Nashville, TN",
    status: "Research",
    fit: "Reasonable stretch",
    fitClass: "stretch",
    action: "Verify compensation range",
    date: "Tomorrow",
    match: "Project coordination and technical communication",
    gap: "Preferred SaaS implementation tenure",
  },
  {
    id: "brightline",
    company: "Brightline Labs",
    role: "AI Operations Associate",
    location: "Hybrid",
    status: "Applied",
    fit: "Strong match",
    fitClass: "strong",
    action: "Follow up on application",
    date: "Friday",
    match: "AI tooling, evaluation, and process documentation",
    gap: "No gap requiring a claim change",
  },
  {
    id: "cedar",
    company: "Cedar Works",
    role: "Technical Support Analyst",
    location: "Murfreesboro, TN",
    status: "Interview",
    fit: "Reasonable stretch",
    fitClass: "stretch",
    action: "Prepare interview examples",
    date: "Jul 29",
    match: "Troubleshooting and user-facing support",
    gap: "Role includes occasional hardware handling",
  },
] as const;

const filters = ["All", "Research", "Ready", "Applied", "Interview"] as const;

const setupSteps = [
  {
    title: "Paste this link into Codex",
    text: "Codex reads the public setup instructions on this site. The website does not ask for your resume or create an account.",
  },
  {
    title: "Approve the local setup",
    text: "You choose the Windows folder. Codex checks Git, Node.js, and Python, then asks before installing anything missing.",
  },
  {
    title: "Build your verified profile",
    text: "Career HQ reads only the sources you choose, records where each claim came from, and asks at most five unanswered questions at a time.",
  },
  {
    title: "Run your search from your PC",
    text: "Use the local dashboard to compare jobs, prepare truthful documents, track applications, and schedule follow-ups. You approve every submission.",
  },
] as const;

const systemCapabilities = [
  {
    label: "Applicant profile",
    text: "Stores verified experience, skills, search preferences, and application defaults with a source and verification date.",
  },
  {
    label: "Job evaluation",
    text: "Saves the complete posting and shows fit, strongest match, largest gap, compensation, location, and risk.",
  },
  {
    label: "Application materials",
    text: "Creates versioned DOCX and PDF resumes from claims already verified in your profile—never invented credentials or metrics.",
  },
  {
    label: "Approval control",
    text: "Prepares a review packet, requires authorization for one named application, and records submitted only when confirmation evidence exists.",
  },
  {
    label: "Pipeline tracking",
    text: "Keeps statuses, next actions, follow-up dates, materials, and submission evidence together in the private local dashboard.",
  },
] as const;

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selectedId, setSelectedId] = useState<string>(applications[0].id);

  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === "All" || application.status === filter),
    [filter],
  );
  const selected =
    visibleApplications.find((application) => application.id === selectedId) ??
    visibleApplications[0] ??
    applications[0];

  async function copySiteLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Career HQ home">
          <span className="brand-mark" aria-hidden="true">CHQ</span>
          <span>Career HQ</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">Setup</a>
          <a href="#system">What it does</a>
          <a href="#preview">Preview</a>
          <a href="#privacy">Safety</a>
        </nav>
        <a className="nav-link" href={REPOSITORY_URL}>View source</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Public setup guide · Windows release</p>
          <h1>Set up a private job-search system on your Windows PC.</h1>
          <p className="hero-lede">
            This website gives Codex the installation instructions for Career HQ. Career HQ then runs locally on
            your computer to build a sourced applicant profile, evaluate jobs, create truthful application
            materials, and track every follow-up.
          </p>
          <p className="hero-clarifier">
            This page is the setup handoff—not the job-search app. It never receives your resume or application data.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={copySiteLink} type="button">
              <span>{copied ? "Setup link copied" : "Copy setup link"}</span>
              <span aria-hidden="true">{copied ? "✓" : "→"}</span>
            </button>
            <a className="text-link" href="#how-it-works">See the four setup steps</a>
          </div>
          <p className="copy-hint" aria-live="polite">
            {copied ? "Paste the link into a new Codex chat." : "First action: copy this page’s URL and paste it into Codex."}
          </p>
        </div>

        <div className="handoff-card" aria-label="Codex setup preview">
          <div className="window-bar"><span /><span /><span /><strong>Codex</strong></div>
          <div className="chat-line user-line">
            <span className="avatar">You</span>
            <p>Set up Career HQ from this website:<br /><strong>career-hq-guide…</strong></p>
          </div>
          <div className="chat-line agent-line">
            <span className="avatar agent-avatar">CHQ</span>
            <div>
              <p>Career HQ is a private project that runs on your computer. I’ll:</p>
              <ol>
                <li>Ask where to save it</li>
                <li>Check the required tools</li>
                <li>Install and verify the workspace</li>
                <li>Start your guided profile</li>
              </ol>
            </div>
          </div>
          <div className="consent-row"><span className="lock-icon" aria-hidden="true">●</span> Nothing is installed or submitted without your approval.</div>
        </div>
      </section>

      <section className="proof-strip" aria-label="What runs where">
        <p><strong>THIS PAGE</strong><span>Setup instructions and a fictional preview</span></p>
        <p><strong>YOUR PC</strong><span>Private profile, job records, and documents</span></p>
        <p><strong>CAREER HQ</strong><span>Evidence checks, materials, and tracking</span></p>
        <p><strong>YOU</strong><span>Final control over every application</span></p>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="section-heading">
          <div><p className="eyebrow">How setup works</p><h2>Four steps from this page to your private dashboard.</h2></div>
          <p>The website only tells Codex how to create and verify the system. Your working Career HQ stays on your computer.</p>
        </div>
        <ol className="steps-grid">
          {setupSteps.map((step, index) => (
            <li className="step-card" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section system-section" id="system">
        <div className="system-intro">
          <p className="eyebrow">What the installed system does</p>
          <h2>One local workspace for the full application process.</h2>
          <p>
            Career HQ is not a job board and it is not an auto-apply bot. It gives Codex a defined workflow,
            private files, validation scripts, document templates, and a local dashboard for your job search.
          </p>
        </div>
        <div className="capability-list">
          {systemCapabilities.map((capability, index) => (
            <article key={capability.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h3>{capability.label}</h3><p>{capability.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section creates-section">
        <div className="creates-copy">
          <p className="eyebrow">Where your information lives</p>
          <h2>Personal data stays inside a Git-ignored folder.</h2>
          <p>
            The public repository contains the reusable workflow and code. Your real profile, postings, generated
            documents, and application ledger are created only inside <code>.job-search/</code> on your computer.
          </p>
          <ul className="check-list">
            <li><span>✓</span> The dashboard listens only on your computer</li>
            <li><span>✓</span> Public previews use fictional data</li>
            <li><span>✓</span> Private files are excluded from Git and releases</li>
            <li><span>✓</span> No accounts, analytics, uploads, or cloud database</li>
          </ul>
        </div>
        <div className="file-tree" aria-label="Career HQ local folder structure">
          <div className="tree-title"><span className="folder-icon">■</span><strong>Career-HQ</strong><small>YOUR COMPUTER</small></div>
          <div className="tree-line"><span>├─</span><b>.agents/</b><em>Codex workflow</em></div>
          <div className="tree-line"><span>├─</span><b>scripts/</b><em>Privacy & verification</em></div>
          <div className="tree-line private-line"><span>├─</span><b>.job-search/</b><em>Private · Git ignored</em></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;├─</span><b>applicant-profile.json</b></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;├─</span><b>applications.json</b></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;└─</span><b>materials/</b></div>
          <div className="tree-line"><span>└─</span><b>dashboard/</b><em>Loopback only</em></div>
          <p className="tree-note"><span className="status-dot" /> The hosted website cannot access this folder.</p>
        </div>
      </section>

      <section className="preview-section" id="preview">
        <div className="preview-heading">
          <div>
            <p className="eyebrow">Interactive fictional example</p>
            <h2>Preview the local application dashboard.</h2>
            <p>Filter the sample pipeline and select a role to see the fit evidence, gap, and next action Career HQ keeps together.</p>
          </div>
          <span className="fiction-badge">Fictional data only</span>
        </div>
        <div className="dashboard-frame">
          <div className="dashboard-sidebar">
            <div className="mini-brand"><span className="brand-mark">CHQ</span><b>Career HQ</b></div>
            <div className="mini-nav"><span className="active">01 &nbsp; Overview</span><span>02 &nbsp; Pipeline</span><span>03 &nbsp; Applications</span></div>
            <div className="local-card"><span className="status-dot" /><b>Local dashboard</b><p>The real dashboard reads your private files only when you open it on your PC.</p></div>
          </div>
          <div className="dashboard-main">
            <div className="dashboard-title"><div><small>FICTIONAL WEEKLY BRIEFING</small><h3>Move the right opportunities forward.</h3></div><span>4 tracked</span></div>
            <div className="metrics-row">
              <div><small>Ready to apply</small><strong>1</strong><span>Awaiting review</span></div>
              <div><small>Active pipeline</small><strong>3</strong><span>Moving opportunities</span></div>
              <div><small>Next follow-up</small><strong>Fri</strong><span>Brightline Labs</span></div>
            </div>
            <div className="filter-row" aria-label="Filter fictional applications">
              {filters.map((item) => (
                <button
                  aria-pressed={filter === item}
                  className={filter === item ? "filter-active" : ""}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="application-layout">
              <div className="application-list">
                {visibleApplications.length ? visibleApplications.map((application) => (
                  <button className={selected.id === application.id ? "application-row selected-row" : "application-row"} key={application.id} onClick={() => setSelectedId(application.id)} type="button" aria-pressed={selected.id === application.id}>
                    <span className="company-mark">{application.company.slice(0, 2).toUpperCase()}</span>
                    <span className="app-identity"><b>{application.role}</b><small>{application.company} · {application.location}</small></span>
                    <span className={`fit-badge ${application.fitClass}`}>{application.fit}</span>
                    <span className="app-action"><b>{application.action}</b><small>{application.date}</small></span>
                  </button>
                )) : <p className="empty-state">No fictional applications in this stage.</p>}
              </div>
              <article className="application-detail" aria-live="polite">
                <p className="detail-kicker">Selected opportunity</p>
                <h4>{selected.role}</h4>
                <p>{selected.company} · {selected.location}</p>
                <dl><div><dt>Status</dt><dd>{selected.status}</dd></div><div><dt>Fit</dt><dd>{selected.fit}</dd></div></dl>
                <div className="assessment"><span>Strongest match</span><p>{selected.match}</p></div>
                <div className="assessment"><span>Largest gap</span><p>{selected.gap}</p></div>
                <div className="next-action"><span>Next action · {selected.date}</span><b>{selected.action}</b></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <div className="privacy-intro">
          <p className="eyebrow">Exact safety boundaries</p>
          <h2>The public guide and private system stay separate.</h2>
          <p>Career HQ enforces privacy, evidence, and approval with local files and deterministic checks—not a promise hidden in fine print.</p>
        </div>
        <div className="boundary-grid">
          <article><span>PUBLIC WEBSITE</span><h3>No resume upload or applicant account</h3><p>This site contains setup instructions and fictional preview data only. It has no forms, analytics, telemetry, or remote applicant storage.</p></article>
          <article><span>LOCAL WORKSPACE</span><h3>Private records remain on your PC</h3><p>The local dashboard reads <code>.job-search/</code> at request time and stays bound to a loopback address.</p></article>
          <article><span>APPLICATION CONTROL</span><h3>Preparation never means submission</h3><p>Career HQ requires your approval for one named application and confirmation evidence before recording it as submitted.</p></article>
        </div>
      </section>

      <section className="faq-section">
        <div><p className="eyebrow">Before setup</p><h2>Direct answers.</h2></div>
        <div className="faq-list">
          <details><summary>Is this website the Career HQ app?<span>+</span></summary><p>No. This is the public setup guide and fictional preview. The working system is installed into a private folder on your Windows PC.</p></details>
          <details><summary>What does Codex install?<span>+</span></summary><p>A local Career HQ project containing its workflow, safeguards, templates, tests, scripts, and loopback-only dashboard. Codex checks Git, Node.js 20.9 or newer, and Python 3.11 or newer first.</p></details>
          <details><summary>Does this website receive my information?<span>+</span></summary><p>No. It has no account, form, upload, analytics, telemetry, or database. Your real applicant values belong only in the local Git-ignored <code>.job-search/</code> folder.</p></details>
          <details><summary>Will Career HQ apply to jobs without asking?<span>+</span></summary><p>No. Creating application materials never authorizes submission. Career HQ requires approval for one named application and records “submitted” only with confirmation evidence.</p></details>
          <details><summary>Does it work outside Windows?<span>+</span></summary><p>The first public release is Windows-only. The setup instructions stop rather than improvising an unsupported installation on another operating system.</p></details>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow">Start with one copy and paste</p>
        <h2>Give Codex the setup link. Keep the working system on your PC.</h2>
        <button className="primary-button light-button" onClick={copySiteLink} type="button"><span>{copied ? "Setup link copied" : "Copy setup link"}</span><span aria-hidden="true">{copied ? "✓" : "→"}</span></button>
        <p>Paste the link into a new Codex conversation. Codex will explain the setup before creating anything.</p>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">CHQ</span><span>Career HQ</span></a>
        <p>Public setup guide for a private, truthful job-search system.</p>
        <div><a href="/codex-setup.md">Codex instructions</a><a href={REPOSITORY_URL}>GitHub</a></div>
      </footer>
    </main>
  );
}
