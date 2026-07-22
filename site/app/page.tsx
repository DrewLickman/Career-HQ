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

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [selectedId, setSelectedId] = useState<string>(applications[0].id);

  const visibleApplications = useMemo(
    () => applications.filter((application) => filter === "All" || application.status === filter),
    [filter],
  );
  const selected = applications.find((application) => application.id === selectedId) ?? visibleApplications[0] ?? applications[0];

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
          <span className="brand-mark" aria-hidden="true">CH</span>
          <span>Career HQ</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#preview">Preview</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <a className="nav-link" href={REPOSITORY_URL}>View on GitHub</a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Local by design · Windows first</p>
          <h1>Your private job search, <em>set up by Codex.</em></h1>
          <p className="hero-lede">
            Career HQ gives Codex a safe, structured system for finding jobs, preparing truthful materials,
            tracking applications, and keeping every personal detail on your computer.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={copySiteLink} type="button">
              <span>{copied ? "Website link copied" : "Copy website link"}</span>
              <span aria-hidden="true">{copied ? "✓" : "→"}</span>
            </button>
            <a className="text-link" href="#how-it-works">See the 3-minute setup</a>
          </div>
          <p className="copy-hint" aria-live="polite">
            {copied ? "Now paste the link into a Codex chat." : "Paste this page’s URL into Codex. That is the whole first step."}
          </p>
        </div>

        <div className="handoff-card" aria-label="Codex setup preview">
          <div className="window-bar"><span /><span /><span /><strong>Codex</strong></div>
          <div className="chat-line user-line">
            <span className="avatar">You</span>
            <p>Set up Career HQ from this website:<br /><strong>career-hq…</strong></p>
          </div>
          <div className="chat-line agent-line">
            <span className="avatar agent-avatar">CH</span>
            <div>
              <p>I’ll create a private Career HQ project on your computer.</p>
              <ol>
                <li>Explain what will be created</li>
                <li>Ask where you want it saved</li>
                <li>Check the required tools</li>
                <li>Build and verify your local workspace</li>
              </ol>
            </div>
          </div>
          <div className="consent-row"><span className="lock-icon" aria-hidden="true">●</span> Nothing is installed until you confirm.</div>
        </div>
      </section>

      <section className="proof-strip" aria-label="Career HQ safeguards">
        <p><strong>01</strong><span>Personal data stays local</span></p>
        <p><strong>02</strong><span>Resume claims require evidence</span></p>
        <p><strong>03</strong><span>Applications need your approval</span></p>
        <p><strong>04</strong><span>Open-source and inspectable</span></p>
      </section>

      <section className="section how-section" id="how-it-works">
        <div className="section-heading">
          <div><p className="eyebrow">One link. One local workspace.</p><h2>Codex handles the setup.</h2></div>
          <p>You do not need to clone a repository, memorize commands, or organize a folder structure yourself.</p>
        </div>
        <div className="steps-grid">
          <article className="step-card featured-step">
            <span className="step-number">01</span>
            <div className="step-icon" aria-hidden="true">↗</div>
            <h3>Share this website</h3>
            <p>Copy this page’s link and paste it into a new Codex conversation. Codex reads the setup instructions built into the site.</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <div className="step-icon" aria-hidden="true">⌁</div>
            <h3>Choose a folder</h3>
            <p>Codex explains the project, checks your Windows setup, and asks where the private local copy should live.</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <div className="step-icon" aria-hidden="true">✓</div>
            <h3>Begin onboarding</h3>
            <p>Career HQ inspects the sources you choose, asks at most five unanswered questions, and opens your local command center.</p>
          </article>
        </div>
      </section>

      <section className="section creates-section">
        <div className="creates-copy">
          <p className="eyebrow">What gets created</p>
          <h2>A complete job-search system. Not another cloud account.</h2>
          <p>Codex creates a normal project folder with the workflow, safeguards, templates, and dashboard needed to manage your search.</p>
          <ul className="check-list">
            <li><span>✓</span> Guided applicant profile built from verified sources</li>
            <li><span>✓</span> Job posting snapshots and fit assessments</li>
            <li><span>✓</span> Versioned resumes, review packets, and follow-ups</li>
            <li><span>✓</span> A private dashboard available only on your computer</li>
          </ul>
        </div>
        <div className="file-tree" aria-label="Career HQ local folder structure">
          <div className="tree-title"><span className="folder-icon">▰</span><strong>Career-HQ</strong><small>YOUR COMPUTER</small></div>
          <div className="tree-line"><span>├─</span><b>.agents/</b><em>Codex workflow</em></div>
          <div className="tree-line"><span>├─</span><b>scripts/</b><em>Privacy & verification</em></div>
          <div className="tree-line private-line"><span>├─</span><b>.job-search/</b><em>Private · Git ignored</em></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;├─</span><b>applicant-profile.json</b></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;├─</span><b>applications.json</b></div>
          <div className="tree-line nested"><span>│&nbsp;&nbsp;└─</span><b>materials/</b></div>
          <div className="tree-line"><span>└─</span><b>dashboard/</b><em>Loopback only</em></div>
          <p className="tree-note"><span className="status-dot" /> Private files are excluded from Git and public builds.</p>
        </div>
      </section>

      <section className="preview-section" id="preview">
        <div className="preview-heading">
          <div><p className="eyebrow">Interactive product preview</p><h2>See your search clearly.</h2></div>
          <span className="fiction-badge">Fictional data only</span>
        </div>
        <div className="dashboard-frame">
          <div className="dashboard-sidebar">
            <div className="mini-brand"><span className="brand-mark">CH</span><b>Career HQ</b></div>
            <div className="mini-nav"><span className="active">01 &nbsp; Overview</span><span>02 &nbsp; Pipeline</span><span>03 &nbsp; Applications</span></div>
            <div className="local-card"><span className="status-dot" /><b>Local by design</b><p>This preview is fictional. Your real dashboard reads only your local files.</p></div>
          </div>
          <div className="dashboard-main">
            <div className="dashboard-title"><div><small>YOUR WEEKLY BRIEFING</small><h3>Move the right opportunities forward.</h3></div><span>4 tracked</span></div>
            <div className="metrics-row">
              <div><small>Ready to apply</small><strong>1</strong><span>Awaiting review</span></div>
              <div><small>Active pipeline</small><strong>3</strong><span>Moving opportunities</span></div>
              <div><small>Next follow-up</small><strong>Fri</strong><span>Brightline Labs</span></div>
            </div>
            <div className="filter-row" aria-label="Filter fictional applications">
              {filters.map((item) => <button className={filter === item ? "filter-active" : ""} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
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
        <div className="privacy-intro"><p className="eyebrow">Boundaries you can inspect</p><h2>Private because of how it is built.</h2><p>Career HQ uses deterministic local checks around Codex. Privacy and approval are enforced by the project, not left as vague promises.</p></div>
        <div className="boundary-grid">
          <article><span>LOCAL</span><h3>Your data does not power this website</h3><p>The public site cannot read your resume, profile, application ledger, or generated documents.</p></article>
          <article><span>VERIFIED</span><h3>Claims need a source</h3><p>Career HQ maps tailored resume statements back to evidence you have reviewed.</p></article>
          <article><span>CONTROLLED</span><h3>Preparation is not submission</h3><p>Every application requires specific authorization and confirmation evidence before it is recorded as submitted.</p></article>
        </div>
      </section>

      <section className="faq-section">
        <div><p className="eyebrow">Before you begin</p><h2>Common questions.</h2></div>
        <div className="faq-list">
          <details><summary>What do I need installed?<span>+</span></summary><p>Version one supports Windows and uses Git, Node.js 20.9 or newer, Python 3.11 or newer, and Codex. Codex checks these before setup and asks before installing anything missing.</p></details>
          <details><summary>Does this website upload my resume?<span>+</span></summary><p>No. This site is only a public guide and fictional preview. Your real files stay in the private local project created on your computer.</p></details>
          <details><summary>Will Career HQ apply to jobs without asking?<span>+</span></summary><p>No. Creating materials never authorizes submission. Career HQ requires approval for one named application and records “submitted” only with confirmation evidence.</p></details>
          <details><summary>What if Codex cannot switch to the new folder?<span>+</span></summary><p>Codex will finish creating and checking the project, then ask you to open that folder in Codex and enter “$career-hq Set up my job search.”</p></details>
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow">Your first step takes ten seconds</p>
        <h2>Give Codex the link.<br />Keep your search under your control.</h2>
        <button className="primary-button light-button" onClick={copySiteLink} type="button"><span>{copied ? "Website link copied" : "Copy website link"}</span><span aria-hidden="true">{copied ? "✓" : "→"}</span></button>
        <p>Then paste it into a new Codex conversation.</p>
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">CH</span><span>Career HQ</span></a>
        <p>Open-source. Local-first. Built for truthful job searches.</p>
        <div><a href="/codex-setup.md">Agent setup</a><a href={REPOSITORY_URL}>GitHub</a></div>
      </footer>
    </main>
  );
}
